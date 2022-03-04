import {
  aws_codebuild,
  aws_codecommit,
  aws_codepipeline,
  aws_codepipeline_actions,
  aws_ecr,
  aws_ecs,
  aws_iam,
  CfnOutput,
  Stack,
  StackProps
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class EcsFlaskApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ecs cluster 
    const cluster = new aws_ecs.Cluster(
      this,
      'FargateClusterForFhrFlaskApi',
      {
        enableFargateCapacityProviders: true
      }
    )

    // ecs task definition 
    const taskDefinition = new aws_ecs.FargateTaskDefinition(
      this,
      'FhrFlaskTaskDefinition',
      {
        memoryLimitMiB: 128,
        cpu: 1
      }
    )

    taskDefinition.addContainer(
      'FhrFlaskEcrImage',
      {
        image: aws_ecs.ContainerImage.fromEcrRepository(
          aws_ecr.Repository.fromRepositoryName(
            this,
            'FhrFlaskEcrRepository',
            'fhr-flask-api',
          ),
          'latest'
        )
      }
    )

    // service 
    new aws_ecs.FargateService(
      this,
      'FargateServiceFhrFlask',
      {
        cluster,
        taskDefinition,
        capacityProviderStrategies: [
          {
            capacityProvider: 'FARGATE_SPOT',
            weight: 2
          }
        ]
      }
    )
  }
}

// codebuild 
export class FhrFlaskCodePipeline extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // source 
    const repository = aws_codecommit.Repository.fromRepositoryName(
      this,
      'FhrFlaskCodeCommit',
      'fhr-flask-api'
    )

    // role for codebuild to push ecr image to ecr 
    const codebuildRole = new aws_iam.Role(
      this,
      'CodeBuildPushEcr',
      {
        assumedBy: new aws_iam.ServicePrincipal('codebuild.amazonaws.com')
      }
    )

    codebuildRole.attachInlinePolicy(
      new aws_iam.Policy(
        this,
        'CodeBuildInlinePolicy',
        {
          statements: [
            new aws_iam.PolicyStatement(
              {
                effect: aws_iam.Effect.ALLOW,
                actions: ['ecr:*'],
                resources: ['*']
              }
            ),
            new aws_iam.PolicyStatement(
              {
                effect: aws_iam.Effect.ALLOW,
                actions: ['ssm:*'],
                resources: ['*']
              }
            )
          ]
        }
      )
    )

    // codebuild project
    const codebuild = new aws_codebuild.PipelineProject(
      this,
      'CodeBuildFhrFlaskEcrImage',
      {
        role: codebuildRole,
        buildSpec: aws_codebuild.BuildSpec.fromObject({
          version: '0.2',
          phases: {
            install: {
              commands: [

              ]
            },
            pre_build: {
              comands: [
                'aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 610770234379.dkr.ecr.ap-southeast-1.amazonaws.com'
              ]
            },
            build: {
              commands: [
                'docker build -t  fhr-flask-api-image:${CODEBUILD_RESOLVED_SOURCE_VERSION} -f ./lib/lambda/DockerfileFhrS3Event ./lib/lambda/',
                'docker tag fhr-flask-api-image:${CODEBUILD_RESOLVED_SOURCE_VERSION} 610770234379.dkr.ecr.ap-southeast-1.amazonaws.com/fhr-flask-api-image:${CODEBUILD_RESOLVED_SOURCE_VERSION}'
              ]
            },
            // push ecr image 
            post_build: {
              commands: [
                'aws ssm put-parameter --name FhrEcrImageForFhrFlaskApi --type String --value ${CODEBUILD_RESOLVED_SOURCE_VERSION} --overwrite',
                'docker push 610770234379.dkr.ecr.ap-southeast-1.amazonaws.com/fhr-flask-api-image:${CODEBUILD_RESOLVED_SOURCE_VERSION}'
              ]
            }
          }
        })
      }
    )

    // artifact 
    const sourceOutput = new aws_codepipeline.Artifact('SourceOutput')
    // build output 
    const buildOutput = new aws_codepipeline.Artifact('BuildOutput')


    // code pipeline
    const codepipeline = new aws_codepipeline.Pipeline(
      this,
      'FhrFlaskCodePipeline',
      {
        stages: [
          {
            stageName: 'Source',
            actions: [
              new aws_codepipeline_actions.CodeCommitSourceAction({
                actionName: 'Source',
                repository: repository,
                branch: 'master',
                output: sourceOutput
              })
            ]
          },

          {
            stageName: 'CodeBuild',
            actions: [
              new aws_codepipeline_actions.CodeBuildAction({
                actionName: 'BuildFhrFlaskEcrImage',
                project: codebuild,
                input: sourceOutput,
                outputs: [buildOutput]
              })
            ]
          }
        ]
      }
    )
  }
}

// ecr repository 
export class FhrFlaskApiEcr extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 
    const repository = new aws_ecr.Repository(
      this,
      'FhrFlaskEcrRepository',
      {
        repositoryName: 'fhr-flask-api'
      }
    )

    // cfn output 
    new CfnOutput(
      this,
      'id',
      {
        value: repository.repositoryArn
      }
    )
  }
}

// code commit repository 
export class FhrFlaskApiCodeCommit extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new aws_codecommit.Repository(
      this,
      'FhrFlaskApiCodeCommmit',
      {
        repositoryName: 'fhr-flask-api'
      }
    )
  }
}