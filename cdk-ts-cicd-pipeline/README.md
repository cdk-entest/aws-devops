# Welcome to your CDK TypeScript project!

## Create a lambda and a repository stack 
create an empty directory 
```
mkdir cdk-test-cicd-pipeline
```
init cdk project 
```
cdk init --language=typescript
```
create lib/repository-stack.ts
```
import { aws_codecommit } from "aws-cdk-lib";
import { App, Stack, StackProps } from "aws-cdk-lib";

export class RepositoryStack extends Stack {
    constructor(app: App, id: string, props?: StackProps) {

        super(app, id, props);

        new aws_codecommit.Repository(this, 'CodeCommitRepo', {
            repositoryName: `repo-${this.account}`
        });

    }
}
```
create lib/lambda-stack.ts 
```
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_lambda } from 'aws-cdk-lib';
const path = require("path")

export class LambdaStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        new aws_lambda.Function(
            this,
            "CdkTsLambdaFunctionTest",
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
update bin/cdk-test-cicd-pipeline.ts
```
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkTsCicdPipelineStack } from '../lib/cdk-ts-cicd-pipeline-stack';
import { RepositoryStack } from '../lib/repository-stack';
import { LambdaStack } from '../lib/lambda-stack';

const app = new cdk.App();
new CdkTsCicdPipelineStack(app, 'CdkTsCicdPipelineStack', {

});

new LambdaStack(app, "CdkTsLambdaStack", {

})

new RepositoryStack(app, 'CdkTsRepositoryStack', {

})
```
build and check stacks 
```
npm install 
npm run build
cdk ls
```
should see multiple stack 
```
CdkTsCicdPipelineStack
CdkTsLambdaStack
CdkTsRepositoryStack
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
