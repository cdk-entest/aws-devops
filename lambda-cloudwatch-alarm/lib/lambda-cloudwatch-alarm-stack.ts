import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_lambda } from 'aws-cdk-lib';
import * as path from 'path'

export class LambdaCloudwatchAlarmStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // lambda function 
    const fn = new aws_lambda.Function(
      this,
      "LambdaCloudWatchAlarmDemo",
      {
        runtime: aws_lambda.Runtime.PYTHON_3_8,
        handler: "index.handler",
        timeout: Duration.seconds(90),
        code: aws_lambda.Code.fromAsset(
          path.join(__dirname, "lambda")
        )
      }
    )

    // cloudwatch alarm 

    // alarm action 

    // output 
    new CfnOutput(this, "FunctionArn", {
      value: fn.functionArn
    })

  }
}
