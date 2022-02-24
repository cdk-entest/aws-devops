import { aws_lambda, aws_s3, CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class LambdaS3EventStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // lambda function 
    const fn = new aws_lambda.Function(
      this, 
      "lambdaS3eventDemo",
      {
        runtime: aws_lambda.Runtime.PYTHON_3_8,
        handler: "index.handler",
        timeout: Duration.seconds(30),
        code: aws_lambda.Code.fromAsset(
          path.join(__dirname, "lambda")
        )
      }
    )
    
    // s3 bucket 
    const bucket = new aws_s3.Bucket(
      this, 
      "lambdaS3EventBucketDemo", {
        bucketName: "haitran-lambda-s3-event-bucket-demo"
      }
    )

    // grant lambda access the bucket 
    bucket.grantReadWrite(
      fn
    )

    // lambda event source
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

    // cfn output
    new CfnOutput(
      this, 
      "lambdaFunctionArn", {
        value: fn.functionArn
      }
    )
  }
}
