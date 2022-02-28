import { 
  aws_codebuild,
  aws_codecommit, 
  aws_codepipeline, 
  aws_codepipeline_actions, 
  aws_ecr, 
  aws_iam, 
  aws_lambda, 
  aws_s3, 
  aws_ssm, 
  Duration, 
  Stack, 
  StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CodebuildPushEcrStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // role and polices for codebuild to push ecr image
    const role = new aws_iam.Role(
      this,
      'IamRoleForCodeBuildPushEcr',
      {
        assumedBy: new aws_iam.ServicePrincipal('codebuild.amazonaws.com')
      }
    )

    role.attachInlinePolicy(
      new aws_iam.Policy(
        this, 
        "PushEcrPolicy", {
          statements: [
            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              actions: ['ecr:*'],
              resources: ['*']
            }),
            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              actions: ['ssm:*'],
              resources: ['*']
            })
          ]
        }
      )
    )

    // codecommit 
    const repository = aws_codecommit.Repository.fromRepositoryName(
      this, 
      'CodeCommitRepository',
      `codebuild-push-ecr-${this.account}`
    )

    // codepipeline artifact 
    const artifactBucket = aws_s3.Bucket.fromBucketName(
      this, 
      'ArtifactBucket',
      'fhr-codepipeline-artifact'
    )

    // artifact folders for source, codebuild 
    const sourceOutput = new aws_codepipeline.Artifact('SourceOutput')
    const codeBuildOutput = new aws_codepipeline.Artifact("CodeBuildOutput")
    const cdkBuildOutput = new aws_codepipeline.Artifact('CdkBuildOutput')

    
    // codebuild project 
    const codeBuild = new aws_codebuild.PipelineProject(
      this, 
      'CodeBuildProject',
      {
        role: role,
        environmentVariables: {
          AWS_ACCOUNT_ID: {value: '610770234379'}
        },
        environment: {
          buildImage: aws_codebuild.LinuxBuildImage.STANDARD_5_0,
          computeType: aws_codebuild.ComputeType.MEDIUM,
          privileged: true
        },
        buildSpec: aws_codebuild.BuildSpec.fromObject({
          version: '0.2', 
          phases: {
            install: {
              commands: [
                'echo Logging in to Amazon ECR...'
              ]
            },
            // login in ecr 
            pre_build: {
              commands: [
                'aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.ap-southeast-1.amazonaws.com'
              ]
            },
            // build ecr image 
            build: {
              commands: [
                'docker build -t  fhr-ecr-image:${CODEBUILD_RESOLVED_SOURCE_VERSION} ./lib/lambda/',
                'docker tag fhr-ecr-image:${CODEBUILD_RESOLVED_SOURCE_VERSION} ${AWS_ACCOUNT_ID}.dkr.ecr.ap-southeast-1.amazonaws.com/fhr-ecr-image:${CODEBUILD_RESOLVED_SOURCE_VERSION}'
              ]
            },
            // push ecr image 
            post_build: {
              commands: [
                'export imageTag=${CODEBUILD_RESOLVED_SOURCE_VERSION}',
                'docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-southeast-1.amazonaws.com/fhr-ecr-image:${CODEBUILD_RESOLVED_SOURCE_VERSION}',
                'echo ${CODEBUILD_RESOLVED_SOURCE_VERSION}',
                'aws ssm put-parameter --name FhrEcrImageTagDemo --type String --value ${CODEBUILD_RESOLVED_SOURCE_VERSION} --overwrite'
              ]
            }
          }, 
          env: {
            'exported-variables': [
              'imageTag'
            ]
          }
        })
      }
    )

    //
    const buildAction = new aws_codepipeline_actions.CodeBuildAction({
      actionName: 'BuildEcrImage',
      project: codeBuild, 
      input: sourceOutput, 
      outputs: [codeBuildOutput]
    })


    // CodeBuild project for cdk build 
    const cdkBuild = new aws_codebuild.PipelineProject(
      this, 
      'CdkBuikd',
      {
        environment: {
          buildImage: aws_codebuild.LinuxBuildImage.STANDARD_5_0
        },
        buildSpec: aws_codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              commands: [
                'npm install'
              ]
            },
            pre_build: {
              commands: [
                'npm run build',
                'npm run cdk synth -- -o dist'
              ]
            }
          },
          artifacts: {
            'base-directory': 'dist',
            files: [
              '*template.json'
            ]
          }
        })
      }
    )

    // codepipeline 
    new aws_codepipeline.Pipeline(
      this, 
      'CodePiplineProject', 
      {
        artifactBucket: artifactBucket,
        stages: [
          {
            stageName: 'Source',
            actions: [
              new aws_codepipeline_actions.CodeCommitSourceAction({
                actionName: 'ConnectRepository',
                repository: repository, 
                output: sourceOutput
              })
            ]
          }, 
          {
            stageName: 'Build', 
            actions: [
              buildAction,
              new aws_codepipeline_actions.CodeBuildAction({
                actionName: 'BuildStack',
                project: cdkBuild,
                input: sourceOutput,
                outputs: [cdkBuildOutput]
              })
            ]
          },

          {
            stageName: 'Deploy',
            actions: [
              new aws_codepipeline_actions.CloudFormationCreateUpdateStackAction({
                actionName: 'DeployLambdaEcrDemo',
                templatePath: cdkBuildOutput.atPath('ApplicationStack.template.json'),
                stackName: 'ApplicationStackEcrTagDemo',
                parameterOverrides: {
                },
                adminPermissions: true
              })
            ]
          }
        ]
      }
    )

  }
}


export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // lambda fron ecr image uri
    const fn = new aws_lambda.Function(
      this,
      'LambdaFromEcrDemo',
      {
        runtime: aws_lambda.Runtime.FROM_IMAGE,
        handler: aws_lambda.Handler.FROM_IMAGE,
        timeout: Duration.seconds(90),
        environment: {
          'FHR_ENV': 'DEPLOY'
        },
        code: aws_lambda.Code.fromEcrImage(
          aws_ecr.Repository.fromRepositoryName(
            this,
            'EcrImageRepositoryDemo',
            'fhr-ecr-image',
          ),
          {
            tag: aws_ssm.StringParameter.valueForStringParameter(
              this, 
              'FhrEcrImageTagDemo'
            )
          }
        )
      }
    )
  }
}

export class RepositoryStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // create a repository 
    new aws_codecommit.Repository(
      this, 
      "CodeBuildPushEcrRepository", 
      {
        repositoryName: `codebuild-push-ecr-${this.account}`
      }
    )

  }
}
