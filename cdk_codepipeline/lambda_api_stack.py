# ==============================================================================
# A stack for lambda api
# 24 JAN 2022 Hai Tran
# 1. Lambda can be created from
#   option 1. from code
#   option 2. from existing ecr image
#   option 3. from build ecr image from asset
# 2. Deploy lambda with alias
# 3. Get api endpoint and post to output
# 4. Add a role to enable lambda access S3
#    - Option 1. use an existing policy
#       role = aws_iam.Role(managed_policies=aws_iam.ManagedPolicy.from_managed_policy_arn)
#    - Option 2. create a new policy by aws_iam.PolicyStatement
#       role = aws_iam.Role(managed_policies=aws_iam.ManagedPolicy(statements=[aws_iam.PolicyStatement()]))
#    - Option 3. bucket.grant_read_write(lambda)
# 5. Check performance when access S3 via VPC endpoint
# ==============================================================================
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
