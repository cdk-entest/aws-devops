// aws sqs send-message --message-body "Hello Hai" --queue-url https://sqs.ap-southeast-1.amazonaws.com/610770234379/sqsQueueApiGatewayDemo

import { 
  aws_apigateway,
  aws_iam, aws_lambda, 
  aws_sns, 
  aws_sqs, 
  CfnOutput, 
  Duration, 
  Stack, 
  StackProps } from 'aws-cdk-lib';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ApiGatewaySqsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // lambda to consume the message from queue
    const fn = new aws_lambda.Function(
      this,
      "lambdaConsumeSqsMessageDemo",
      {
        runtime: aws_lambda.Runtime.PYTHON_3_8,
        code: aws_lambda.Code.fromAsset(
          path.join(__dirname, "lambda")
        ),
        handler: "index.handler"
      }
    )

    // create sqs 
    const queue = new aws_sqs.Queue(
      this,
      "sqsApiGatewayDemo",
      {
        queueName: 'sqsQueueApiGatewayDemo'
      }
    )

    // role to allow api gateway write message to sqs queue 
    const role = new aws_iam.Role(
      this, 
      "apiGatewayWriteToSqsRole",
      {
        assumedBy: new aws_iam.ServicePrincipal("apigateway.amazonaws.com")
      }
    )

    role.attachInlinePolicy(
      new aws_iam.Policy(
        this, 
        "writeToSqsPolicy", {
          statements: [
            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              actions: ['sqs:SendMessage'],
              resources: [queue.queueArn]
            })
          ]
        }
      )
    )

    // create an api gateway 
    const api_gw = new aws_apigateway.RestApi(
      this, 
      "apiGatewaySqsDemo", {
        restApiName: "api-gateway-sqs-demo"
      }
    )

    // api gateway aws integration
    const integration = new aws_apigateway.AwsIntegration({
      service: 'sqs',
      path: 'sqsQueueApiGatewayDemo',
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: role,
        requestParameters: {
          "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`
        },
        requestTemplates: {
          "application/json": `Action=SendMessage&MessageBody=$util.urlEncode("$method.request.querystring.message")`
        },
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{'done': true}`
            }
          }
        ]
      }
    })

    // api gateway resource 
    const resource = api_gw.root.addResource("queue")

    // add method integration with sqs 
    resource.addMethod(
      'GET', 
      integration,
      {
        methodResponses: [{ statusCode: "200"}]
      }
    )

    // lambda process message from queue 
    fn.addEventSource(
      new SqsEventSource(
        queue, {
          batchSize: 1,
          maxBatchingWindow: Duration.minutes(1),
          reportBatchItemFailures: true
        }
      )
    )

    // sns topic 
    const topic = aws_sns.Topic.fromTopicArn(
      this,
      'lambdaSendMessageToSnsDemo',
      'arn:aws:sns:ap-southeast-1:610770234379:CodePipelineNotification'
    )

    // grant publish to lambda 
    topic.grantPublish(
      fn
    )
    
    // cfnoutput
    new CfnOutput(
      this,
      "queueName", {
        value: queue.queueArn
      }
    )
  }
}
