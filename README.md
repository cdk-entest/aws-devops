# Create a custom resource in CDK

For example, create a S3 bucket with some objects in there already, or create an x509 certificate for IoT things, or a Cloud9 with a ebs volume, etc.

## Create custom construct

- Provider handles on_create, on_delete, on_update events sent from CloudFormation to the resource provider
- Lambda function is where on_create, on_delete, on_update are implemented.

```tsx
// lambda
const fn = new aws_lambda.SingletonFunction(this, "Singleton", {
  role: role,
  uuid: "f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc",
  code: new aws_lambda.InlineCode(
    fs.readFileSync(path.join(__dirname, "custom-resource-handler.py"), {
      encoding: "utf-8",
    })
  ),
  handler: "index.main",
  timeout: Duration.seconds(300),
  runtime: aws_lambda.Runtime.PYTHON_3_7,
});

// provider
const provider = new custom_resources.Provider(this, "Provider", {
  onEventHandler: fn,
});

// custom resource
const resource = new CustomResource(this, "Resource", {
  serviceToken: provider.serviceToken,
  properties: props,
});
```

in this example, I want the lambda/custom resource is able to put an object to a S3 during creating cloudformation stack

```tsx
// create a role for lambda
const role = new aws_iam.Role(this, "RoleForLambdaCustomStack", {
  roleName: "RoleForLambdaCustomStack",
  assumedBy: new aws_iam.ServicePrincipal("lambda.amazonaws.com"),
});

// attach inline policy to it
role.attachInlinePolicy(
  new aws_iam.Policy(this, "InlinePolicyForLambdaCustomResource", {
    policyName: "InlinePolicyForLambdaCustomResource",
    statements: [
      new aws_iam.PolicyStatement({
        actions: ["s3:*"],
        effect: aws_iam.Effect.ALLOW,
        resources: ["*"],
      }),
    ],
  })
);
```

## Create the custom stack from the custom construct

```tsx
#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CustomResourceStack } from "../lib/custom-resource-stack";
import { CfnOutput } from "aws-cdk-lib";

const app = new cdk.App();

class MyStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const resource = new CustomResourceStack(this, "CustomResourceDemoStack", {
      message: "Create a custom resource",
    });

    // publish the custom resource output
    new CfnOutput(this, "ResponseMessage", {
      description: "the message that came back from the Custom Resource",
      value: resource.response,
    });
  }
}

new MyStack(app, "CustomResrouceStackDemo");
```

## Deploy and check

```shell
cdk deploy
```

check that the object has been uploaded to the s3 bucket

```
aws s3 ls s3://BUCKET_NAME/
```
