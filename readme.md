# S3 Event Trigger Lambda Function 

## Summary
- Build a simple data pipeline analysis for each data uploaded to S3 bucket 
- The Lambda function analyse data and save outputs/images to S3 bucket 
- Send notification via email for each processed data 
- Monitor performance of the Lambda by adding a CloudWatch dashboard 

## Architecture 

![aws_devops-CdkPipelineFhr drawio (1)](https://user-images.githubusercontent.com/20411077/160513645-299a9660-dc64-4663-bd65-bfff886cca55.png)

## Application stack 
To configure S3 event trigger a Lambda function
```
export class S3EventLambdaStack extends Stack {

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // lambda role 
    const role = new aws_iam.Role(
      this,
      'LambdaRoleAccessS3',
      {
        assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com')
      }
    )

    // lambda role inline policies 
    role.attachInlinePolicy(
      new aws_iam.Policy(
        this,
        'LambdaAccessS3Policy',
        {
          statements: [
            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              actions: ['sns:*'],
              resources: [`arn:aws:sns:ap-southeast-1:${this.account}:${fhrSnsTopicName}`]
            }),

            new aws_iam.PolicyStatement({
              effect: aws_iam.Effect.ALLOW,
              actions: ['s3:*', 's3-object-lambda:*'],
              resources: [`arn:aws:s3:::${fhrLogS3BucketName}/*`]
            })
          ]
        }
      )
    )

    // lambda 
    const fn = new aws_lambda.Function(
      this,
      'FhrLambdaS3Event',
      {
        role: role,
        code: aws_lambda.Code.fromEcrImage(
          aws_ecr.Repository.fromRepositoryName(
            this,
            'FhrEcrS3EventRepository',
            `${fhrEcrRepoNameForS3Event}`
          ),
          {
            tag: aws_ssm.StringParameter.valueForStringParameter(
              this,
              'FhrEcrImageForS3Event'
            )
          }
        ),
        environment: {
          'FHR_ENV': 'DEVELOP'
        },
        runtime: aws_lambda.Runtime.FROM_IMAGE,
        handler: aws_lambda.Handler.FROM_IMAGE,
        timeout: Duration.seconds(180),
        memorySize: 10240
      }
    )

    // s3 bucket trigger lambda 
    const bucket = aws_s3.Bucket.fromBucketName(
      this,
      'FemomEcgBucket',
      `${fhrLogS3BucketName}`
    )
    bucket.addEventNotification(
      aws_s3.EventType.OBJECT_CREATED,
      new aws_s3_notifications.LambdaDestination(fn),
      { prefix: 'ecg/' }
    )

    // cfn output 
    new CfnOutput(
      this,
      'LambdaArn',
      {
        value: fn.functionArn
      }
    )
  }
}
```

**Notice: There is another way to configure S3 trigger a Lambda**
```
fn.addEventSource(
      new S3EventSource(
        bucket, 
        {
          events: [
            aws_s3.EventType.OBJECT_CREATED, aws_s3.EventType.OBJECT_REMOVED
          ],
          filters: [{ prefix: 'subdir/'}]
        }
      )
    )
```

