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

# s3 bucket for static web deletion retain 
aws cloudformation create-stack \
 --stack-name ec2-stack-demo \
 --template-body file://s3_static_web_deleteion_retain.yaml \
 --capabilities CAPABILITY_NAMED_IAM \

aws cloudformation update-stack \
 --stack-name ec2-stack-demo \
 --template-body file://s3_static_web_deleteion_retain.yaml \
 --capabilities CAPABILITY_NAMED_IAM \