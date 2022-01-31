"""
CDK deploy lambda
Option 1. handler without dependencies
Option 2. handler with dependencies
Option 3. existing ecr image
Option 3. build ecg image from local asset
"""


from os import path
from aws_cdk import (
    Stack,
    Duration,
    aws_lambda,
    aws_apigateway,
    CfnOutput
)
from constructs import Construct

class AwsDevopsStack(Stack):
    """
    Lambda stack to create a lambda api endpoint with different options for
    deploy a lambda function.
    """

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        #
        dirname = path.dirname(__file__)
        # option 1. lambda handler without dependencies
        handler = aws_lambda.Function(
            self,
            id="lambda-handler-wo-dependencies",
            code=aws_lambda.Code.from_asset(path.join(dirname, "lambda")),
            handler="handler.handler",
            runtime=aws_lambda.Runtime.PYTHON_3_8,
            memory_size=512,
            architecture=aws_lambda.Architecture.ARM_64,
            timeout=Duration.seconds(90)
        )
        # option 2
        # python -m pip install --target /lambda/ numpy

        # api gateway
        api_gw = aws_apigateway.LambdaRestApi(
            self,
            id="api-lambda-handler-wo-dependencies",
            handler=handler
        )
        # get api url
        self.output_url = CfnOutput(self, id="Url", value=api_gw.url)
