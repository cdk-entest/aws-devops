import { aws_cloudwatch, aws_cloudwatch_actions, aws_sns, CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
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
    const alarm = new aws_cloudwatch.Alarm(
      this,
      "LambdaInvocationAlarmDemo",
      {
        metric: fn.metricInvocations(
          {
            statistic: 'sum',
            period: Duration.minutes(5)
          }
        ),
        threshold: 5,
        evaluationPeriods: 1
      }
    )

    // alarm action 
    alarm.addAlarmAction(
      new aws_cloudwatch_actions.SnsAction(aws_sns.Topic.fromTopicArn(
        this,
        "CodePipelineNotification",
        "arn:aws:sns:ap-southeast-1::CodePipelineNotification"
      ))
    )

    // output 
    new CfnOutput(this, "FunctionArn", {
      value: fn.functionArn
    })

  }
}
