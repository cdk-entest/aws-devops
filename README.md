# CloudFormation Custom Resource
**20 FEB 2022 Hai Tran**

## Architecture 
- Syntax to create a custom resouce **Type: Custom::CustomeResourceName**
- Provider which create resource: Lambda or SNS 
- CloudFormation sends an event to the Lambda
- Lambda parse properties from the event and execute the logic
- Lambda response to CloudFormation <br/>

![aws-devops](https://user-images.githubusercontent.com/20411077/154826824-b94b2e60-9f5f-4589-a4db-420b7879f1be.png)

## Example 
```
CustomResourceS3FromLambda:
  Type: Custom::S3FromLambda
  Properties:
    ServiceToken: !GetAtt  CfnLambdaCreateS3Bucket.Arn
    ProjectName: "DeviceFarmProjectName"
```
The requried field is **ServiceToken** which can be Lambda or SNS
```
CfnLambdaCreateS3Bucket:
    Type: AWS::Lambda::Function
    Properties:
      Description: "Creates, updates, deletes Device  Farm projects"
      Handler: "index.handler"
      Runtime: "python3.6"
      Role: !GetAtt ["LambdaRole", "Arn"]
      Code:
        ZipFile: |
          import json
          import boto3
          import cfnresponse 
          
          def handler(event, context):
            bucket_name = 'cfn-custom-lambda-create-s3-bucket'
            client = boto3.client("s3", region_name='ap-southeast-1')
            try:
              if event['RequestType'] == 'Delete':
                pass
              if event['RequestType'] == 'Create':
                try:
                  client.create_bucket(Bucket=bucket_name, CreateBucketConfiguration={...})
                except:
                  pass
              if event['RequestType'] == 'Update':
                pass
              cfnresponse.send(event, context, cfnresponse.SUCCESS, {'Arn': bucket_name})
            except:
              cfnresponse.send(event, context, cfnresponse.FAILED, None, None)
          
```
## cfnresponse
cfnrseponse is supported and can be imported provide that 
- ZipFile to deploy the lambda 
- Runtime Python3.6 <br/>
Sometime, we need to implement the cfnresponse as the following 
```
import json
import boto3
import urllib3
http = urllib3.PoolManager()
SUCCESS = "SUCCESS"
FAILED = "FAILED"

def send(event, context, responseStatus, responseData, physicalResourceId=None, noEcho=False):
  responseUrl = event['ResponseURL']
  print(responseUrl)
  responseBody = {}
  responseBody['Status'] = responseStatus
  responseBody['Reason'] = 'See the details in CloudWatch Log Stream: ' + context.log_stream_name
  responseBody['PhysicalResourceId'] = physicalResourceId or context.log_stream_name
  responseBody['StackId'] = event['StackId']
  responseBody['RequestId'] = event['RequestId']
  responseBody['LogicalResourceId'] = event['LogicalResourceId']
  responseBody['NoEcho'] = noEcho
  responseBody['Data'] = responseData

  json_responseBody = json.dumps(responseBody)

  print("Response body:\n" + json_responseBody)

  headers = {
      'content-type' : '',
      'content-length' : str(len(json_responseBody))
  }

  try:

      response = http.request('PUT',responseUrl,body=json_responseBody.encode('utf-8'),headers=headers)
      print("Status code: " + response.reason)
  except Exception as e:
      print("send(..) failed executing requests.put(..): " + str(e))
```
