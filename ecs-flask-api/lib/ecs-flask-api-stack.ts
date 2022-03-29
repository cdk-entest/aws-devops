// add comment
import {
  aws_codebuild,
  aws_codecommit,
  aws_codepipeline,
  aws_codepipeline_actions,
  aws_ecr,
  aws_ecs,
  aws_iam,
  aws_s3,
  aws_sns,
  aws_sqs,
  aws_ssm,
  CfnOutput,
  Duration,
  Stack,
  StackProps,
  aws_autoscaling
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class EcsFlaskApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // sns topic from existing one 
    const topic = aws_sns.Topic.fromTopicArn(
      this,
      'FhrEcsSnSTopic',
      'arn:aws:sns:ap-southeast-1:610770234379:CodePipelineNotification'
    )

    // sqs queue 
    const queue = new aws_sqs.Queue(
      this,
      'FhrEcsQueue',
      {
        queueName: 'SqsQueueForEcsFhr',
        visibilityTimeout: Duration.seconds(200)
      }
    )

    // role for ecs task 
    const roleForEcsTask = new aws_iam.Role(
      this,
      'RoleForFhrEcsTask',
      {
        assumedBy: new aws_iam.ServicePrincipal('ecs-tasks.amazonaws.com')
      }
    )

    // role polcies 
    roleForEcsTask.attachInlinePolicy(
      new aws_iam.Policy(
        this,
        'PoliciesForFhrEcsRole',
        {
          policyName: 'PoliciesForFhrEcsRole',
          statements: [
            new aws_iam.PolicyStatement(
              {
                effect: aws_iam.Effect.ALLOW,
                actions: ['s3:*'],
                resources: ['arn:aws:s3:::femom-fhr-data/*']
              }
            ),
            new aws_iam.PolicyStatement(
              {
                effect: aws_iam.Effect.ALLOW,
                actions: ['sqs:*'],
                resources: [queue.queueArn]
              }
            ),
            new aws_iam.PolicyStatement(
              {
                effect: aws_iam.Effect.ALLOW,
                actions: ['sns:*'],
                resources: [topic.topicArn]
              }
            )
          ]
        }
      )
    )

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
        family: 'latest',
        taskRole: roleForEcsTask,
        memoryLimitMiB: 10240,
        cpu: 4096,
        runtimePlatform: {
          operatingSystemFamily: aws_ecs.OperatingSystemFamily.LINUX,
          cpuArchitecture: aws_ecs.CpuArchitecture.X86_64
        }
      }
    )

    const container = taskDefinition.addContainer(
      'FhrFlaskEcrImage',
      {
        memoryLimitMiB: 10240,
        memoryReservationMiB: 10240,
        stopTimeout: Duration.seconds(120),
        startTimeout: Duration.seconds(120),
        environment: {
          'FHR_ENV': 'DEPLOY'
        },
        image: aws_ecs.ContainerImage.fromEcrRepository(
          aws_ecr.Repository.fromRepositoryName(
            this,
            'FhrFlaskEcrRepository',
            'fhr-flask-api-image',
          ),
          aws_ssm.StringParameter.valueForStringParameter(
            this,
            'FhrEcrImageForFhrFlaskApi'
          )
        )
      }
    )



    container.addPortMappings({
      containerPort: 5000,
      protocol: aws_ecs.Protocol.TCP
    })

    // service 
    const service = new aws_ecs.FargateService(
      this,
      'FargateServiceFhrFlask',
      {
        cluster,
        taskDefinition,
        desiredCount: 2,
        capacityProviderStrategies: [
          {
            capacityProvider: 'FARGATE',
            weight: 1
          },
          {
            capacityProvider: 'FARGATE_SPOT',
            weight: 0
          }
        ]
      }
    )

    // scale number of task by length of queue
    const scaling = service.autoScaleTaskCount(
      {
        maxCapacity: 20,
        minCapacity: 1
      }
    )

    scaling.scaleOnMetric(
      'ScaleOnQueueLength',
      {
        metric: queue.metricApproximateNumberOfMessagesVisible(),
        scalingSteps: [
          { upper: 1, change: -1 },
          { lower: 2, change: +1 },
          { lower: 4, change: +2 },
          { lower: 8, change: +4 },
          { lower: 20, change: +10 },
        ],
        cooldown: Duration.seconds(10),
        adjustmentType: aws_autoscaling.AdjustmentType.CHANGE_IN_CAPACITY
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

              ]
            },
            pre_build: {
              commands: [
                'aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 610770234379.dkr.ecr.ap-southeast-1.amazonaws.com'
              ]
            },
            build: {
              commands: [
                'docker build -t  fhr-flask-api-image:${CODEBUILD_RESOLVED_SOURCE_VERSION} -f ./ecs-flask-api/lib/app/Dockerfile ./ecs-flask-api/lib/app/',
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

    // ckdbuild
    const cdkbuild = new aws_codebuild.PipelineProject(
      this,
      'CdkBuild',
      {
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
                'cd ecs-flask-api',
                'npm install'
              ]
            },
            build: {
              commands: [
                'npm run build',
                'npm run cdk synth -- -o dist'
              ]
            }
          },
          artifacts: {
            'base-directory': 'ecs-flask-api/dist',
            files: [
              '*.template.json'
            ]
          }
        })
      }
    )


    // codepipeline artifact bucket 
    const artifactBucket = aws_s3.Bucket.fromBucketName(
      this,
      'ArtifactBucket',
      'fhr-codepipeline-artifact'
    )

    // artifact 
    const sourceOutput = new aws_codepipeline.Artifact('SourceOutput')
    // build output 
    const buildOutput = new aws_codepipeline.Artifact('BuildOutput')
    // cdk build output
    const cdkBuildOutput = new aws_codepipeline.Artifact('CdkBuildOutput')

    // code pipeline
    const codepipeline = new aws_codepipeline.Pipeline(
      this,
      'FhrFlaskCodePipeline',
      {
        pipelineName: 'FhrFlaskCodePipeline',
        artifactBucket: artifactBucket,
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
          // ecr build 
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
          },
          // cdk build 
          {
            stageName: 'CdkBuild',
            actions: [
              new aws_codepipeline_actions.CodeBuildAction({
                actionName: 'CdkBuild',
                project: cdkbuild,
                input: sourceOutput,
                outputs: [cdkBuildOutput]
              })
            ]
          },

          // deploy 
          {
            stageName: 'Deploy',
            actions: [
              new aws_codepipeline_actions.CloudFormationCreateUpdateStackAction({
                actionName: 'Deploy',
                templatePath: cdkBuildOutput.atPath('EcsFlaskApiStack.template.json'),
                stackName: 'EcsFlaskApiApplicationStack',
                adminPermissions: true,

              })
            ]
          }
        ]
      }
    )
  }
}

// ecr cluster 


// ecr repository 
export class FhrFlaskApiEcr extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // 
    const repository = new aws_ecr.Repository(
      this,
      'FhrFlaskEcrRepository',
      {
        repositoryName: 'fhr-flask-api-image'
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