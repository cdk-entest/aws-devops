import { aws_lambda } from "aws-cdk-lib";
import { aws_apigateway } from "aws-cdk-lib";
import { App, Stack, StackProps } from "aws-cdk-lib";
import * as path from "path"

export interface ApplicationStackProps extends StackProps {
    readonly stageName: string
}

export class ApplicationStack extends Stack {

    // constructor
    constructor(app: App, id: string, props: ApplicationStackProps) {
        super(app, id, props);

        // create a lambda function 
        const lambda_function = new aws_lambda.Function(
            this,
            `CdkTsLambdaApplicationFunction-${props.stageName}`,
            {
                runtime: aws_lambda.Runtime.PYTHON_3_8,
                handler: "handler.handler",
                code: aws_lambda.Code.fromAsset(
                    path.join(__dirname, "lambda")
                ),
                environment: {
                    STAGE_NAME: props.stageName
                }
            }
        );
        // create an api gateway 
        new aws_apigateway.LambdaRestApi(
            this,
            `CdkTsApiGatewayRestApi-${props.stageName}`,
            {
                handler: lambda_function,
                endpointExportName: `CdkTsLambdaRestApiEndpoint-${props.stageName}`,
                deployOptions: {
                    stageName: props.stageName
                }
            }
        );

        // lambda version alias function 

        // codedeploy

    }
}