aws cloudformation create-stack \
 --stack-name cdk-admin-role \
 --template-body file://cdk_admin_role.yaml \
 --capabilities CAPABILITY_NAMED_IAM