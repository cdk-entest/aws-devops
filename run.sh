aws cloudformation create-stack \
 --stack-name ec2-stack-demo \
 --template-body file://ec2.yaml \
 --parameters ParameterKey=KeyName,ParameterValue=mac_os_jenkins_builder \
 --capabilities CAPABILITY_NAMED_IAM \
 --profile hai


aws cloudformation update-stack \
 --stack-name cfn-codepipeline-demo \
 --template-body file://ec2.yaml \
 --capabilities CAPABILITY_NAMED_IAM


aws cloudformation delete-stack \
  --stack-name ec2-stack-demo \
  --profile hai