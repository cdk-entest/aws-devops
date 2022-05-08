import {
  aws_iam,
  aws_lambda,
  CustomResource,
  custom_resources,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as path from "path";
import * as fs from "fs";

export interface CustomResourceStackProps {
  message: string; 
}

export class CustomResourceStack extends Construct {

  public readonly response: string = 'Hello custom resource'; 

  constructor(scope: Construct, id: string, props: CustomResourceStackProps) {
    super(scope, id);

    // create a role for lambda 
    const role = new aws_iam.Role(
      this,
      'RoleForLambdaCustomStack',
      {
        roleName: 'RoleForLambdaCustomStack',
        assumedBy: new aws_iam.ServicePrincipal('lambda.amazonaws.com'),
      }
    )

    // attach inline policy to it 
    role.attachInlinePolicy(
      new aws_iam.Policy(
        this, 
        'InlinePolicyForLambdaCustomResource',
        {
          policyName: 'InlinePolicyForLambdaCustomResource',
          statements: [
            new aws_iam.PolicyStatement(
              {
                actions: ['s3:*'],
                effect: aws_iam.Effect.ALLOW,
                resources: ['*']
              }
            )
          ]
        }
      )
    )

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
  }
}
