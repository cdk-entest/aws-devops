import { aws_lambda } from "aws-cdk-lib";
import { aws_apigateway } from "aws-cdk-lib";
import { App, Stack, StackProps } from "aws-cdk-lib";
import * as path from "path"

export interface ApplicationStackProps extends StackProps {
    readonly stageName: string
}

export class ApplicationStack extends Stack {

    // lambad code from 
    public readonly lambdaCode: aws_lambda.CfnParametersCode;

    // constructor
    constructor(app: App, id: string, props: ApplicationStackProps) {
        super(app, id, props);

        // lambda code 
        this.lambdaCode = aws_lambda.Code.fromCfnParameters();

        // create a lambda function 
        const lambda_function = new aws_lambda.Function(
            this,
            `CdkTsLambdaApplicationFunction-${props.stageName}`,
            {
                runtime: aws_lambda.Runtime.NODEJS_12_X,
                handler: "index.handler",
                code: this.lambdaCode,
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