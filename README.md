# Setup VSCode SSH with Cloud9 and SSM 
**Hai Tran 25 APR 2022**
- [Reference](https://aws.amazon.com/blogs/architecture/field-notes-use-aws-cloud9-to-power-your-visual-studio-code-ide/)
- Auto hibernate after 30 minutes idle 
- Auto turn on when open vscode 
- No open port 

# Install remote ssh extension for vscode 


# CloudFormation to launch a cloud9 environment with SSM connect 
```
AWSTemplateFormatVersion: "2010-09-09"

Description: >
  Creates an AWS Cloud9 EC2 environment within the default VPC with
  a no-ingress EC2 instance. This is to be used in conjunction with 
  Visual Studio Code and the Remote SSH extension. This relies on 
  AWS Systems Manager in order to run properly.

Resources:
  DefaultVPCCloud9Instance:
    Type: AWS::Cloud9::EnvironmentEC2
    Properties:
      InstanceType: t3.large
      ConnectionType: CONNECT_SSM
      Description: Cloud9 instance for use with VS Code Remote SSH
      Name: VS Code Remote SSH Demo

Outputs:
  Cloud9Instance:
    Description: The EC2 instance powering this AWS CLoud9 environment
    Value: !Join
      - ""
      - - "https://"
        - !Ref AWS::Region
        - ".console.aws.amazon.com/ec2/v2/home?region="
        - !Ref AWS::Region
        - "#Instances:search="
        - !Ref DefaultVPCCloud9Instance
        - ";sort=tag:Name"

```

# Optionally can laucnh a cloud9 environment from aws cli 

# Configure ssh for the local machine 
- Generate ssh private and public key 
```
ssh-keygen -b 4096 -C 'VS Code Remote SSH user' -t rsa
```
select a name such as id_rsa_cloud9 

- Copy the public key from the local machine 
```
cat ~/.ssh/id_rsa.pub 
```
- Paste the key to authorized_keys in ec2 instance 
```
echo 'key pub' >> authorized_keys
```
- Download the ssm-proxy.sh and setup AWS_PROFILE, AWS_REGION 
```
#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

# Configuration
# Change these values to reflect your environment
AWS_PROFILE='cloud9'
AWS_REGION='us-east-1'
MAX_ITERATION=5
SLEEP_DURATION=5

# Arguments passed from SSH client
HOST=$1
PORT=$2

STATUS=`aws ssm describe-instance-information --filters Key=InstanceIds,Values=${HOST} --output text --query 'InstanceInformationList[0].PingStatus' --profile ${AWS_PROFILE} --region ${AWS_REGION}`

# If the instance is online, start the session
if [ $STATUS == 'Online' ]; then
    aws ssm start-session --target $HOST --document-name AWS-StartSSHSession --parameters portNumber=${PORT} --profile ${AWS_PROFILE} --region ${AWS_REGION}
else
    # Instance is offline - start the instance
    aws ec2 start-instances --instance-ids $HOST --profile ${AWS_PROFILE} --region ${AWS_REGION}
    sleep ${SLEEP_DURATION}
    COUNT=0
    while [ ${COUNT} -le ${MAX_ITERATION} ]; do
        STATUS=`aws ssm describe-instance-information --filters Key=InstanceIds,Values=${HOST} --output text --query 'InstanceInformationList[0].PingStatus' --profile ${AWS_PROFILE} --region ${AWS_REGION}`
        if [ ${STATUS} == 'Online' ]; then
            break
        fi
        # Max attempts reached, exit
        if [ ${COUNT} -eq ${MAX_ITERATION} ]; then
            exit 1
        else
            let COUNT=COUNT+1
            sleep ${SLEEP_DURATION}
        fi
    done
    # Instance is online now - start the session
    aws ssm start-session --target $HOST --document-name AWS-StartSSHSession --parameters portNumber=${PORT} --profile ${AWS_PROFILE} --region ${AWS_REGION}
fi
```
- Configure ssh config for the local machine 
```
Host cloud9
    IdentityFile ~/.ssh/id_rsa_cloud9
    User ec2-user
    HostName i-0bf311ce929d7f91c 
    ProxyCommand sh -c "~/.ssh/ssm-proxy.sh %h %p"
```
and 
```
 chmod +x ~/.ssh/ssm-proxy.sh
```

# Configure the cloud9 ec2 instance 
```
# Save a copy of the script first
$ sudo mv ~/.c9/stop-if-inactive.sh ~/.c9/stop-if-inactive.sh-SAVE
$ curl https://raw.githubusercontent.com/aws-samples/cloud9-to-power-vscode-blog/main/scripts/stop-if-inactive.sh -o ~/.c9/stop-if-inactive.sh
$ sudo chown root:root ~/.c9/stop-if-inactive.sh
$ sudo chmod 755 ~/.c9/stop-if-inactive.sh
```
