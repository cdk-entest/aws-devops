# Deploy Lambda Based APIs by CDK 
**29 JAN 2022 Hai Tran**
## 1. Deploy a lambda function by files 
install dependencies 
```
python -m pip install --target path-to-lambda numpy 
```
aws_lambda.Function 
```
handler_file = aws_lambda.Function(
            self,
            id="lambda-handler-wo-dependencies",
            code=aws_lambda.Code.from_asset(path.join(dirname, "lambda")),
            handler="handler.handler_file",
            runtime=aws_lambda.Runtime.PYTHON_3_8,
            memory_size=512,
            timeout=Duration.seconds(90)
        )
```
## 2. Deploy a lambda function by ecr image 
project structure 
```
- aws_devops
    - lambda
        - Dockerfile
        - .dockerignore
        - handler.py
        - requirements.txt
     -aws_devops_stack.py
```
```
handler_ecr = aws_lambda.Function(
            self,
            id="lambda-ecr-build-local",
            code=aws_lambda.EcrImageCode.from_asset_image(
                directory=path.join(dirname, "lambda")
            ),
            handler=aws_lambda.Handler.FROM_IMAGE,
            runtime=aws_lambda.Runtime.FROM_IMAGE,
            memory_size=512,
            timeout=Duration.seconds(90)
        )
```
## 3. Integrate an API Gateway with multiple lambdas
create an api gateway 
```
api_gw = aws_apigateway.RestApi(
            self,
            id="ApiGatewayLambdaDeployOptions",
            rest_api_name="api-lambda-deploy-options"
        )
```
create api resource 
```
api_file_resource = api_gw.root.add_resource(
            path_part="file"
        )
```
create lambda integration
```
 api_file_intetgration = aws_apigateway.LambdaIntegration(
            handler=handler_file
        )
```
add method to the resource 
```
 api_file_resource.add_method(
            http_method="GET",
            integration=api_file_intetgration
        )
```