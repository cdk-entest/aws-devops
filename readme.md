# AWS SQS and Lambda Event Source 

## Architecrture 
![aws-devops](https://user-images.githubusercontent.com/20411077/155686633-bfcccfc4-2166-42b7-bc19-5036cf869968.png)

API gateway integerates with SQS queue via **aws_apigateway.AwsIntegration** class and API Gateway need a role or granted to write messages to the queue. **Note** After the message successuflly processed by the lambda, need to return **statusCode: 200** to the SQS queue, so the queue will delete the processed message. Fail/exception messages will be put in a dead letter queue (DLQ)

## Role to enable API Gateway writting messages to the SQS queue 
```
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
```

## API Gateway 
```
const api_gw = new aws_apigateway.RestApi(
      this, 
      "apiGatewaySqsDemo", {
        restApiName: "api-gateway-sqs-demo"
      }
    )
```
API Gateway integration with SQS queue
```
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

```
API Gateway resource or path 
```
const resource = api_gw.root.addResource("queue")
```
API Gateway add method
```
resource.addMethod(
    'GET', 
    integration,
    {
      methodResponses: [{ statusCode: "200"}]
    }
)
```

## Lambda function to process messages from the queue
create a Lambda function 
```
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
```
lambda resource event to trigger lambda by the queue 
```
fn.addEventSource(
  new SqsEventSource(
    queue, {
      batchSize: 1,
      maxBatchingWindow: Duration.minutes(1),
      reportBatchItemFailures: true
    }
  )
)
```
grant lambda to publish messages to a SNS topic
```
// existing topic 
const topic = aws_sns.Topic.fromTopicArn(
      this,
      'lambdaSendMessageToSnsDemo',
      'arn:aws:sns:ap-southeast-1:account_id:CodePipelineNotification'
    )

// grant publish to lambda 
  topic.grantPublish(
    fn
  )
```



