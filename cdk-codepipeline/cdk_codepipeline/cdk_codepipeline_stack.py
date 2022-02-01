# ==============================================================================
# Create CDK pipeline from aws_cdk.pipelines.CdkPipeline.
# Note: this is different from aws_cdk.aws_codepipeline.Pipeline
# 23 JAN 2022 Hai Tran
# Moved to aws_cdk.pipelines.CodePipeline
# 1. aws_cdk.pipelines.CodePipeline consits of synth and source
#    synth means synthesis CloudFormation or cdk.out from python constructs
#    and run commands such as cdk synth
# ==============================================================================
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
            pipeline_name='CdkCodepipelineStack',
            synth=pipelines.ShellStep(
                'Synth',
                input=pipelines.CodePipelineSource.connection(
                    repo_string="entest-hai/aws-devops",
                    branch="cdk-codepipeline",
                    connection_arn="arn:aws:codestar-connections:ap-southeast-1:610770234379:connection/ae577773-a348-472d-96cd-0f3ceb656c09"
                ),
                commands=["pip install -r requirements.txt",
                          "npm install -g aws-cdk",
                          "cdk synth"]
            )
        )
        # pre-product stage: add application stage which is a Lambda API
        pre_pro_stage = LambdaApiStage(
            self,
            "pre-prod"
        )
        pipeline.add_stage(
            pre_pro_stage
        )
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
