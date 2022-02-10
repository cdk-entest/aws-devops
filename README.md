# CDK CodePipeline for Lambda API 

## Architecture
#### Configuration
Just a basic API by using AWS API Gateway and a lambda function. Some note
- API Gateway timeout 29 seconds
- lambda function needs an IAM policy to access S3 bucket 
- S3 bucket can be attached policies to protect and enable cross-account access <br/>
#### To do
- Add token API Gateway 
- Monitor, log the API requests by CloudWatch, X-Ray? [reference](https://docs.aws.amazon.com/apigateway/latest/developerguide/security-monitoring.html)
- Protect API Gateway (AWF, Shield) [reference](https://aws.amazon.com/blogs/compute/amazon-api-gateway-adds-support-for-aws-waf/)
![lambda_api (1)](https://user-images.githubusercontent.com/20411077/153315852-3a2bb76e-eb96-4dc1-b1e3-1a6befc7ee5b.png)
<br/>

## CI/CD CodePipeline

![codepipeline_sample drawio](https://user-images.githubusercontent.com/20411077/153315728-81a090a1-ddee-4626-81ec-d14620c09f08.png)


## Option 1. Create the Pipeline by AWS CDK
#### CDK project <br/>
```
cdk init --language python 
```
#### project structure
It is noted that the CodeBuild container will clone the repository, then app.py should see things when running cdk synth and cdk deploy. 
```
cdk_codepipeline
    lambda
        signal-processing-ip
        handler.py
        Dockerfile
    cdk_codepipelin_stack.py
    lambda_api_stack.py
    lambda_api_stage.py
app.py
requirements.txt 
cdk.json
```
#### GitHub AWS connection 
To connect GitHub with AWS follow this [reference](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-create-github.html). This needs two step 1) install AWS connector app into GitHub and 2) create a connection arn in AWS console. Then this is the aws_cdk.pipelines.CodePipeline
```
class CdkCodepipelineStack(Stack):
    """
    Create a aws_cdk.pipelines.CodePipeline stack to
    continuously deploy a Lambda based API, and the
    Lambda is loaded from an ecr image. In addition, the
    ecr image is built from local asset code and push to
    a ecr repository.
    """

    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)
        # source is S3, GitHub, BitBucket, AWS CodeCommit
        pipeline = pipelines.CodePipeline(
            self,
            'Pipeline',
            pipeline_name='CdkCodepipelineDemo',
            synth=pipelines.ShellStep(
                'Synth',
                input=pipelines.CodePipelineSource.connection(
                    repo_string="entest-hai/aws-devops",
                    branch="cdk-codepipeline",
                    connection_arn="arn:aws:codestar-connections"
                ),
                commands=["pip install -r requirements.txt",
                          "npm install -g aws-cdk",
                          "cdk synth"]
            )
        )
``` 

#### Lambda API stack 
```
from os import path
from constructs import Construct
from aws_cdk import (
    Stack,
    CfnOutput,
    Duration,
    aws_apigateway,
    aws_lambda
)

class LambdaApiStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        # The code that defines your stack goes here
        this_dir = path.dirname(__file__)

        # option 1. lambda handler without dependencies
        handler_file = aws_lambda.Function(
            self,
            id="lambda-handler-wo-dependencies",
            code=aws_lambda.Code.from_asset(path.join(dirname, "lambda")),
            handler="handler.handler_file",
            runtime=aws_lambda.Runtime.PYTHON_3_8,
            memory_size=512,
            timeout=Duration.seconds(90)
        )
        # option 2
        # python -m pip install --target /lambda/ numpy
        handler_ecr = aws_lambda.Function(
            self,
            id="lambda-ecr-build-local",
            code=aws_lambda.EcrImageCode.from_asset_image(
                directory=path.join(dirname, "lambda")
            ),
            handler=aws_lambda.Handler.FROM_IMAGE,
            runtime=aws_lambda.Runtime.FROM_IMAGE,
            memory_size=512,
            timeout=Duration.seconds(90)
        )

        # create an api gateway
        api_gw = aws_apigateway.RestApi(
            self,
            id="ApiGatewayLambdaDeployOptions",
            rest_api_name="api-lambda-deploy-options"
        )
        # integrate lambda-file with api gateway
        # create api resource for lambbda-file
        api_file_resource = api_gw.root.add_resource(
            path_part="file"
        )
        # lambad integration with api file
        api_file_intetgration = aws_apigateway.LambdaIntegration(
            handler=handler_file
        )
        # add method to the api file resource
        api_file_resource.add_method(
            http_method="GET",
            integration=api_file_intetgration
        )
        # integrate lambda-ecr with api gateway
        # create api resource for lambda-ecr
        api_ecr_resource = api_gw.root.add_resource(
            path_part="ecr"
        )
        # lambda integration with api ecr
        api_ecr_integration = aws_apigateway.LambdaIntegration(
            handler=handler_ecr
        )
        # add method to the api ecr resource
        api_ecr_resource.add_method(
            http_method="GET",
            integration=api_ecr_integration
        )
        # get api url
        self.output_url = CfnOutput(self, id="Url", value=api_gw.url)

```
#### Lambda API stage 
```
from constructs import Construct
from aws_cdk import (
  Stage
)

from .lambda_api_stack import LambdaApiStack

class LambdaApiStage(Stage):
  def __init__(self, scope: Construct, id: str, **kwargs):
    super().__init__(scope, id, **kwargs)

    service = LambdaApiStack(self, 'LambdaApiStack')

    self.url_output = service.
```
#### CDK CodePipeline stack 
```
from aws_cdk import (
    aws_codecommit,
    pipelines,
    Stack
)
from constructs import Construct
from .lamda_api_stage import LambdaApiStage

class CdkCodepipelineStack(Stack):
    """
    Create a aws_cdk.pipelines.CodePipeline stack to
    continuously deploy a Lambda based API, and the
    Lambda is loaded from an ecr image. In addition, the
    ecr image is built from local asset code and push to
    a ecr repository.
    """

    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)
        # create a cdk pipeline
        # synth is to synthesis cdk.out which is CloudFormation template for infrastructure
        # and run commands pip, cdk synth
        # source is S3, GitHub, BitBucket, AWS CodeCommit
        pipeline = pipelines.CodePipeline(
            self,
            'Pipeline',
            pipeline_name='CdkCodepipelineDemo',
            synth=pipelines.ShellStep(
                'Synth',
                input=pipelines.CodePipelineSource.connection(
                    repo_string="entest-hai/aws-devops",
                    branch="cdk-codepipeline",
                    connection_arn="arn:aws:codestar-connections"
                ),
                commands=["pip install -r requirements.txt",
                          "npm install -g aws-cdk",
                          "cdk synth"]
            )
        )
        # pre-product stage: add application stage which is a Lambda API
        # pre_pro_stage = LambdaApiStage(
        #     self,
        #     "pre-prod"
        # )
        # pipeline.add_stage(
        #     pre_pro_stage
        # )
        # product stage with manual approval required
        # aws_cdk.pipelines.CodePipeline does not support SNS topic email here yet
        # need back to conventional aws_cdk.aws_codepipeline
        pipeline.add_stage(
            LambdaApiStage(
                self,
                "prod"
            ),
            pre=[
                pipelines.ManualApprovalStep(
                    id="PromotedToProduct",
                    comment="Please review and approve it to product level"
                )
            ]
        )
```

## Option 2. Create CI/CD Pipeline with CloudFormation
#### CI/CD pipeline 
It is x10 complicated to setup for a simple production, esp, roles and policies attached to CodeBuild, CodePipeline
```
AWSTemplateFormatVersion: 2010-09-09
Description: "CI CD pipeline"
Resources:
  CfnRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: "2012-10-17"
        Statement:
          - Effect: "Allow"
            Principal:
              Service: "cloudformation.amazonaws.com"
            Action:
              - "sts:AssumeRole"
      ManagedPolicyArns:
        - "arn:aws:iam::aws:policy/AdministratorAccess"

  Repository:
    Type: AWS::CodeCommit::Repository
    Properties:
      RepositoryName: core

  TemplateBucket:
    Type: AWS::S3::Bucket

  BuildRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Sid: AllowAssumeRole
            Effect: Allow
            Principal:
              Service: "codebuild.amazonaws.com"
            Action: "sts:AssumeRole"
      Policies:
        - PolicyDocument:
            Version: 2012-10-17
            Statement:
              - Sid: CodeBuild
                Effect: Allow
                Action:
                  - "logs:CreateLogGroup"
                  - "logs:CreateLogStream"
                  - "logs:PutLogEvents"
                  - "codecommit:GitPull"
                  - "s3:GetObject"
                  - "s3:GetObjectVersion"
                  - "s3:PutObject"
                  - "ecr:BatchCheckLayerAvailability"
                  - "ecr:GetDownloadUrlForLayer"
                  - "ecr:BatchGetImage"
                  - "ecr:GetAuthorizationToken"
                  - "s3:GetBucketAcl"
                  - "s3:GetBucketLocation"
                  - "cloudformation:*"
                  - "iam:PassRole"
                  - "ec2:Describe*"
                Resource: "*"
          PolicyName: BuildPolicy

  Build:
    Type: AWS::CodeBuild::Project
    Properties:
      Artifacts:
        Type: CODEPIPELINE
      ServiceRole: !GetAtt BuildRole.Arn
      Name: Core
      Source:
        Type: CODEPIPELINE
      Environment:
        Type: LINUX_CONTAINER
        Image: aws/codebuild/amazonlinux2-x86_64-standard:2.0
        ComputeType: BUILD_GENERAL1_SMALL
        EnvironmentVariables:
          - Name: CFN_ROLE
            Type: PLAINTEXT
            Value: !GetAtt CfnRole.Arn

  PipelineRole:
    Type: "AWS::IAM::Role"
    Properties:
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Effect: Allow
            Principal:
              Service: "codepipeline.amazonaws.com"
            Action: "sts:AssumeRole"
      Policies:
        - PolicyName: CodePipeline
          PolicyDocument:
            Version: 2012-10-17
            Statement:
              - Effect: Allow
                Action:
                  - "codecommit:CancelUploadArchive"
                  - "codecommit:GetBranch"
                  - "codecommit:GetCommit"
                  - "codecommit:GetUploadArchiveStatus"
                  - "codecommit:UploadArchive"
                  - "codebuild:BatchGetBuilds"
                  - "codebuild:StartBuild"
                  - "cloudwatch:*"
                  - "cloudformation:*"
                  - "s3:*"
                  - "iam:PassRole"
                Resource: "*"
  Pipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      RoleArn: !GetAtt PipelineRole.Arn
      ArtifactStore:
        Location: !Ref TemplateBucket
        Type: S3
      Name: CfnCodePipelineDemo
      Stages:
        - Name: clone
          Actions:
            - ActionTypeId:
                Category: Source
                Owner: AWS
                Provider: CodeCommit
                Version: "1"
              Name: clone
              OutputArtifacts:
                - Name: CloneOutput
              Configuration:
                BranchName: main
                RepositoryName: !GetAtt Repository.Name
              RunOrder: 1
        - Name: Build
          Actions:
            - Name: Build
              InputArtifacts:
                - Name: CloneOutput
              ActionTypeId:
                Category: Build
                Owner: AWS
                Provider: CodeBuild
                Version: "1"
              OutputArtifacts:
                - Name: BuildOutput
              Configuration:
                ProjectName: !Ref Build
              RunOrder: 1
        - Name: Deploy
          Actions:
            - Name: Deploy
              InputArtifacts:
                - Name: BuildOutput
              ActionTypeId:
                Category: Deploy
                Owner: AWS
                Version: "1"
                Provider: CloudFormation
              OutputArtifacts:
                - Name: DeployOutput
              Configuration:
                ActionMode: CREATE_UPDATE
                RoleArn: !GetAtt CfnRole.Arn
                Capabilities: CAPABILITY_NAMED_IAM
                StackName: Core
                TemplatePath: BuildOutput::core.yaml
```

#### Simple API lambda CloudFormation template 
In here, need to add much more compliated roles/policies for Lambd, S3, API Gateway, and add CloudWatch to monitor
```
AWSTemplateFormatVersion: "2010-09-09"
Description: "Lambda function with cfn-response."
Resources:
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: CfnLambdaRoleDemo
      AssumeRolePolicyDocument:
        Version: 2012-10-17
        Statement:
          - Action:
              - sts:AssumeRole
            Effect: Allow
            Principal:
              Service:
                - lambda.amazonaws.com
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AWSLambdaExecute

  LambdaFunctionDemo:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: CfnCodePipelineLambdaDemo
      Handler: "index.handler"
      Code:
        ZipFile: |
          import json
          def handler(event, context):
            return {
              "statusCode": 200,
              "body": json.dumps({"message": "Hello lambda cloudformation"})
            }
      Runtime: python3.8
      MemorySize: 512
      Timeout: 90
      Role:
        Fn::GetAtt:
          - LambdaRole
          - Arn
Outputs:
  LambdaRoleArn:
    Description: Role for lambda execution
    Value:
      Fn::GetAtt:
        - LambdaRole
        - Arn
  LambdaFunctionName:
    Value:
      Ref: LambdaFunctionDemo
```
