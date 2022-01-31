import aws_cdk as core
import aws_cdk.assertions as assertions

from aws_devops.aws_devops_stack import AwsDevopsStack

# example tests. To run these tests, uncomment this file along with the example
# resource in aws_devops/aws_devops_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = AwsDevopsStack(app, "aws-devops")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
