# Cross Account CI/CD Pipeline
Sometimes we need to run the Pipeline in an account, but deploy product into another account for 
- Further sepratation between development and production envionment
- Protect production environment
- For customer in another account

This note follows the reference workshop here 
- **[aws-blog-ci-cd-pipeline-cross-account](https://aws.amazon.com/blogs/devops/building-a-ci-cd-pipeline-for-cross-account-deployment-of-an-aws-lambda-api-with-the-serverless-framework/)**
- **[workshop-ci-cid-pipeline-cross-account](https://catalog.us-east-1.prod.workshops.aws/v2/workshops/00bc829e-fd7c-4204-9da1-faea3cf8bd88/)**

Todo
- Python CDK version
- CloudFormation version 
- Roles and policies created with CloudFormation 
## Architecture 

![cross_account_ci_cd_pipeline drawio (1)](https://user-images.githubusercontent.com/20411077/153972206-e9ed989b-78d4-43b8-8a07-48d282375f8d.png)


## Setup CDK project 
create an empty directory 
```
mkdir cdk-test-cicd-pipeline
```
init cdk project 
```
cdk init --language=typescript
```

## Create a CodeCommit by a repository stack 

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

## Create a lambda stack for testing purpose 
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

## Build and check CDK generated stacks 
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

## Policy CodePipelineCrossAccountRole]
This allow the ProductionAccount when deploying CloudFormation can access the S3 ArtifactBucket where code for the Lambda function is stored. 
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "cloudformation:*",
                "iam:PassRole"
            ],
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "s3:Get*",
                "s3:Put*",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::artifact-bucket-{DEV_ACCOUNT_ID}",
                "arn:aws:s3:::artifact-bucket-{DEV_ACCOUNT_ID}/*"
            ],
            "Effect": "Allow"
        },
        {
            "Action": [ 
                "kms:DescribeKey", 
                "kms:GenerateDataKey*", 
                "kms:Encrypt", 
                "kms:ReEncrypt*", 
                "kms:Decrypt" 
            ], 
            "Resource": "{KEY_ARN}",
            "Effect": "Allow"
        }
    ]
}
```
## Policy CloudFormationDeploymentRole 
This allow the CloudFormation in the ProductionAccount can create resources when deploying stacks developed from the develop account. 

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": "iam:PassRole",
            "Resource": "arn:aws:iam::{PROD_ACCOUNT_ID}:role/*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "iam:GetRole",
                "iam:CreateRole",
                "iam:AttachRolePolicy"
            ],
            "Resource": "arn:aws:iam::{PROD_ACCOUNT_ID}:role/*",
            "Effect": "Allow"
        },
        {
            "Action": "lambda:*",
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": "apigateway:*",
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": "codedeploy:*",
            "Resource": "*",
            "Effect": "Allow"
        },
        {
            "Action": [
                "s3:GetObject*",
                "s3:GetBucket*",
                "s3:List*"
            ],
            "Resource": [
                "arn:aws:s3:::artifact-bucket-{DEV_ACCOUNT_ID}",
                "arn:aws:s3:::artifact-bucket-{DEV_ACCOUNT_ID}/*"
            ],
            "Effect": "Allow"
        },
        {
            "Action": [
                "kms:Decrypt",
                "kms:DescribeKey"
            ],
            "Resource": "{KEY_ARN}",
            "Effect": "Allow"
        },
        {
            "Action": [
                "cloudformation:CreateStack",
                "cloudformation:DescribeStack*",
                "cloudformation:GetStackPolicy",
                "cloudformation:GetTemplate*",
                "cloudformation:SetStackPolicy",
                "cloudformation:UpdateStack",
                "cloudformation:ValidateTemplate"
            ],
            "Resource": "arn:aws:cloudformation:us-east-2:{PROD_ACCOUNT_ID}:stack/ProdApplicationDeploymentStack/*",
            "Effect": "Allow"
        }
    ]
}
```

## Connect to AWS CodeCommit by HTTPS
Goto AWS IAM console and download credential to access AWS CodeCommit 
```
git config --global credential.helper '!aws codecommit credential-helper $@'
git config --global credential.UseHttpPath true
```