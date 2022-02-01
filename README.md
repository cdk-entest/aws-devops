# CDK CodePipeline for Lambda API 

## Setup
- CDK project <br/>
```
cdk init --language python 
```
project structure, it is noted that the CodeBuild container will clone the repository, then app.py should see things when running cdk synth and cdk deploy. 
```
cdk_codepipeline
    lambda
        handler.py
        Dockerfile
    cdk_codepipelin_stack.py
    lambda_api_stack.py
    lambda_api_stage.py
app.py
requirements.txt 
cdk.json
```
- GitHub AWS connection <br/>
To connect GitHub with AWS follow this [reference](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-create-github.html). This needs two step 1) install AWS connector app into GitHub and 2) create a connection arn in AWS console. Then this is the aws_cdk.pipelines.CodePipeline
```
pipeline = pipelines.CodePipeline(
            self,
            'Pipeline',
            pipeline_name='CdkCodepipelineStack',
            synth=pipelines.ShellStep(
                'Synth',
                input=pipelines.CodePipelineSource.connection(
                    repo_string="entest-hai/aws-devops",
                    branch="cdk-codepipeline",
                    connection_arn=""
                ),
                commands=["pip install -r requirements.txt",
                          "npm install -g aws-cdk",
                          "cdk synth"]
            )
        )
``` 

## Stacks 
Lambda API stack 
```
class LambdaApiStack(Stack):

    def __init__(self, scope: Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        # The code that defines your stack goes here
        this_dir = path.dirname(__file__)

        # lambda from code
        handler = aws_lambda.Function(
            self, 'Handler',
            runtime=aws_lambda.Runtime.PYTHON_3_8,
            handler='handler.handler',
            code=aws_lambda.Code.from_asset(path.join(this_dir, 'lambda')),
            timeout=Duration.seconds(90)
        )

        # create an api gateway integration
        gw = aws_apigateway.LambdaRestApi(self, 'Gateway',
            description='Endpoint for a simple Lambda-powered web service',
            handler=handler)

        # get api endpoint url
        self.url_output = CfnOutput(self, 'Url',
            value=gw.url)

```
Lambda API stage 
```
class LambdaApiStage(Stage):
  def __init__(self, scope: Construct, id: str, **kwargs):
    super().__init__(scope, id, **kwargs)

    service = LambdaApiStack(self, 'LambdaApiStack')

    self.url_output = service.url_output
```
CDK CodePipeline stack 
```
pipeline = pipelines.CodePipeline(
            self,
            'Pipeline',
            pipeline_name='CdkCodepipelineDemo',
            synth=pipelines.ShellStep(
                'Synth',
                input=pipelines.CodePipelineSource.connection(
                    repo_string="entest-hai/aws-devops",
                    branch="cdk-codepipeline",
                    connection_arn=""
                ),
                commands=["pip install -r requirements.txt",
                          "npm install -g aws-cdk",
                          "cdk synth"]
            )
        )
```