import { 
  aws_codebuild,
  aws_codecommit, 
  aws_codepipeline, 
  aws_codepipeline_actions, 
  aws_ecr, 
  aws_iam, 
  aws_lambda, 
  aws_s3, 
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
          AWS_ACCOUNT_ID: {value: '610770234379'},
          IMAGE_TAG: {value: 'latest'}
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
                'docker build -t  fhr-ecr-image:${CODEBUILD_BUILD_NUMBER} ./lib/lambda/',
                'docker tag fhr-ecr-image:${CODEBUILD_BUILD_NUMBER} ${AWS_ACCOUNT_ID}.dkr.ecr.ap-southeast-1.amazonaws.com/fhr-ecr-image:${CODEBUILD_BUILD_NUMBER}'
              ]
            },
            // push ecr image 
            post_build: {
              commands: [
                'docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-southeast-1.amazonaws.com/fhr-ecr-image:${CODEBUILD_BUILD_NUMBER}'
              ]
            }
          }, 
          artifacts: {
            files: [

            ]
          }
        })
      }
    )

    // CodeBuild project for cdk build 
    const cdkBuild = new aws_codebuild.PipelineProject(
      this, 
      'CdkBuikd',
      {
        environment: {
          buildImage: aws_codebuild.LinuxBuildImage.STANDARD_5_0
        },
        environmentVariables: {
          IMAGE_TAG: {value: 'latest'}
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
                'echo ${IMAGE_TAG}',
                'npm run build',
                'npm run cdk synth -- -c IMAGE_TAG=${IMAGE_TAG} -o dist'
              ]
            }
          },
          artifacts: {
            'base-directory': 'dist',
            files: [
              '*.template.json'
            ]
          }
        })
      }
    )


    // codepipeline 
    new aws_codepipeline.Pipeline(
      this, 
      'CodePiplineProject', {
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
              new aws_codepipeline_actions.CodeBuildAction({
                actionName: 'BuildEcrImage',
                project: codeBuild, 
                input: sourceOutput, 
                outputs: [codeBuildOutput]
              }),

              new aws_codepipeline_actions.CodeBuildAction({
                actionName: 'BuildStack',
                project: cdkBuild,
                input: sourceOutput,
                outputs: [cdkBuildOutput]
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

    // get image tag from CDK context 
    const IMAGE_TAG = this.node.tryGetContext('IMAGE_TAG')

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
            tag: IMAGE_TAG
          }
        )
      }
    )

    // api gateway 

    // role and policies api gateway write to sqs queue 

    // role and policies lambda access s3 

    // sqs queue 

    // aws integration 

    // api gateway resource 

    // api gateway method 

    // lambda envent from sqs 

    // cfn output 

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
