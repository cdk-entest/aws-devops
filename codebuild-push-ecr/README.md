# CI/CD Pipeline for Lambda with ECR and SSM for updating tag

**Hai Tran 28 FEB 2022**

This note shows using SSM parameter in CI/CD for passing ECR image tag from CodeBuild to deployment stacks. So the latest ECR image is used in the latest deployed stack such as a lambda function. The default ecr tag is latest and this might cause CloudFormation think that there is not update after pushing an image to ecr. So, it is better to push image with a tag by build number, **CODEBUILD_RESOLVED_SOURCE_VERSION**, or Git SHA, etc. There are other solutions such as exported variables in CodeBuild, then overrideParameter in deployment stacks. Here SSM is an easy way.

- CodeBuild to build a Docker image, tag, and push to an ecr repository
- The tag written to SSM (system parameter store)
- CodeBuild CDK synth application stack
- CodeDeploy deploy the application stack, and the latest ecr tag is read from the SSM

### Architecture

### CodeBuild role to push ecr and put-paraemter to ssm

```
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

```

### CodeBuild project

```
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
                'docker build -t  ecr-image-name:${CODEBUILD_RESOLVED_SOURCE_VERSION} ./lib/lambda/',
                'docker tag ecr-image-name:${CODEBUILD_RESOLVED_SOURCE_VERSION} ${AWS_ACCOUNT_ID}.dkr.ecr.ap-southeast-1.amazonaws.com/ecr-image-name:${CODEBUILD_RESOLVED_SOURCE_VERSION}'
              ]
            },
            // push ecr image
            post_build: {
              commands: [
                'export imageTag=${CODEBUILD_RESOLVED_SOURCE_VERSION}',
                'docker push ${AWS_ACCOUNT_ID}.dkr.ecr.ap-southeast-1.amazonaws.com/ecr-image-name:${CODEBUILD_RESOLVED_SOURCE_VERSION}',
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

```

### SSM parameters for CI/CD

create a ssm

```
aws ssm put-parameter --name 'parameterName' --description 'keep track ecr image tag' --value 'b05517a66933f6fde060efe2ecd78784767f6ce1' --type 'String'
```

get a ssm

```
aws ssm get-parameter --name 'parameterName'
```

update a ssm

```
aws ssm put-parameter --name 'parameterName' --type 'String' --value 'b05517a66933f6fde060efe2ecd78784767f6ce1' --overwrite
```

```
aws ssm put-parameter --name parameterName --type String --value '0a95b18303e05f2de9315bbb385da173398b9661' --overwrite
```
