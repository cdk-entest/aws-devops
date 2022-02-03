aws cloudformation create-stack \
 --stack-name cfn-codepipeline-demo \
 --template-body file://cicd.yaml \
 --capabilities CAPABILITY_NAMED_IAM


aws cloudformation update-stack \
 --stack-name cfn-codepipeline-demo \
 --template-body file://cicd.yaml \
 --capabilities CAPABILITY_NAMED_IAM


aws cloudformation delete-stack \
  --stack-name cfn-lcodepipeline-demo