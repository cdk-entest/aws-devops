"""
CDK deploy lambda 
29 JAN 2022 Hai Tran 
Option 1. handler without dependencies
Option 2. handler with dependencies
Option 3. existing ecr image
Option 3. build ecg image from local asset
Integration multiple lambdas function with an api gateway. 
- create an api gateway api_gw = aws_apigateway.RestApi()
- create api resource by resource = api_gw.root.add_resource()
- create lambda integration api_integration = aws_apigateway.LambdaIntegration()
- add method to resource by resource.add_method(http_method, api_integration) 
"""


from os import path
from wsgiref import handlers
from aws_cdk import (
    Stack,
    Duration,
    aws_lambda,
    aws_apigateway,
    CfnOutput,
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
