# Welcome to your CDK TypeScript project!
**12 FEB 2022 Hai Tran**
## Init a CDK project 
create a empty directory 
```
mkdir cdk-test-lambda
```
run this command to create a CDK project in typescript 
```
cdk init app --language typescript
```

## Project structure and local lambda handler 
```
- lib
    - cdk-ts-lambda-stack.ts
    - lambda
        - handler.py
```

## First S3 stack 
lib/cdk-ts-lambda-stack.ts
```
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_lambda } from 'aws-cdk-lib';
const path = require("path")

export class CdkTsLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // create a lambda function 
    const fn = new aws_lambda.Function(
      this,
      "CdkTsLambdaFunctionDemo",
      {
        runtime: aws_lambda.Runtime.PYTHON_3_8,
        handler: "handler.handler",
        code: aws_lambda.Code.fromAsset(
          path.join(__dirname, "lambda")
        )
      }
    )
  }
}

```

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
