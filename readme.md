# Asssume Role Accross Account 
**Hai Tran 03 MAR 2022**

## Create a policy in **Production account** to grant access S3 
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::biorithm-testing-data/*"
    }
  ]
}
```
Create iam policy from cli 
```
aws iam create-policy \
--policy-name cross-account-access-s3-bucket-policy \
--policy-document file://CrossAccountAcessS3BucketPolicy.json \
--profile hai
```
Take note the **policyArn**
```
arn:aws:iam::PROD_ACCOUNT_ID:policy/cross-account-access-s3-bucket-policy
```

## Create an IAM role in **Production account**
```
aws iam create-role --role-name cross-account-access-s3-role \
--assume-role-policy-document file://AssumeRolePolicy.json \
--profile hai
```
attach policy to the role 
```
aws iam attach-role-policy  --role-name cross-account-access-s3-role \
--policy-arn arn:aws:iam::PROD_ACCOUNT_ID:policy/cross-account-access-s3-bucket-policy \
--profile hai

```
Take not the role arn 
```
arn:aws:iam::PROD_ACCOUNT_ID:role/cross-account-access-s3-role
```

## Test assume role from aws cli 
```
aws sts assume-role --role-arn  "arn:aws:iam::PROD_ACCOUNT_ID:role/cross-account-access-s3-role" --role-session-name AWSCLI-Session
```
Take note credentials 
```
export AWS_ACCESS_KEY_ID="AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="AWS_SECRET_ACCESS_KEY"
export AWS_SESSION_TOKEN="AWS_SESSION_TOKEN"
```
Test
```
aws s3 cp file.csv s3://biorithm-testing-data/log/
```