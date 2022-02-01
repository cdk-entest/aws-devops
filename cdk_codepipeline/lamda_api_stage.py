# ==============================================================================
# wrap stack into stage then add_stage to the CodePipeline
# ==============================================================================
from constructs import Construct
from aws_cdk import (
  Stage
)

from .lambda_api_stack import LambdaApiStack

class LambdaApiStage(Stage):
  def __init__(self, scope: Construct, id: str, **kwargs):
    super().__init__(scope, id, **kwargs)

    service = LambdaApiStack(self, 'LambdaApiStack')

    self.url_output = service.url_output