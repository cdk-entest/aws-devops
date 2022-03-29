# ECS Cluster to Process Heavy Computing Task

## Summary
- To evaluate how ECS fargate scale for a heavy computing task 
- ECS Fargate here scaled based on the no. of message inside the SQS queue 
- The computing task requires about 10GB RAM and 30 seconds 
- The task poll messages from the SQS, read data from S3, then process
- Concurrent requests are sent to API Gateway

## Architect 
![aws_devops-ecs drawio](https://user-images.githubusercontent.com/20411077/160522061-b2bcee8d-1048-4d27-9240-586efa631044.png)

## ECS Stack 
- Construct ECS Cluster and Fargate Task Definition 

```
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

```

- Create Service 
```
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
```

- **ECS Scaling**


```
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
```

## CI/CD Pipeline 
```
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
```
