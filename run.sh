aws cloudformation create-stack \
 --stack-name cfn-lambda-demo \
 --template-body file://lambda_template.yaml \
 --capabilities CAPABILITY_NAMED_IAM


aws cloudformation update-stack \
 --stack-name cfn-lambda-demo \
 --template-body file://lambda_template.yaml \
 --capabilities CAPABILITY_NAMED_IAM