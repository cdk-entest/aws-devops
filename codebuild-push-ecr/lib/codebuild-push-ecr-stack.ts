import { 
  aws_codebuild,
  aws_codecommit, 
  aws_codepipeline, 
  aws_codepipeline_actions, 
  aws_iam, 
  aws_s3, 
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
    const codeBuildOutput = new aws_codepipeline.Artifact("CodeBuildOUtput")

    
    // codebuild project 
    const codeBuild = new aws_codebuild.PipelineProject(
      this, 
      'CodeBuildProject',
      {
        role: role,
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
                'aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com'
              ]
            },
            // build ecr image 
            build: {
              commands: [
                'docker build -t  fhr-ecr-image:latest ./lib/lambda/',
                'docker tag fhr-ecr-image:latest $AWS_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/fhr-ecr-image:latest'
              ]
            },
            // push ecr image 
            post_build: {
              commands: [
                'docker push $AWS_ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/fhr-ecr-image:latest'
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

    // codepipeline 
    new aws_codepipeline.Pipeline(
      this, 
      'CodePiplineProject', {
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
