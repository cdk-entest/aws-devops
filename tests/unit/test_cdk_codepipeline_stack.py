import aws_cdk as core
import aws_cdk.assertions as assertions

from cdk_codepipeline.cdk_codepipeline_stack import CdkCodepipelineStack

# example tests. To run these tests, uncomment this file along with the example
# resource in cdk_codepipeline/cdk_codepipeline_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = CdkCodepipelineStack(app, "cdk-codepipeline")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
