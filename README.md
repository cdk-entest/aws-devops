# Setup VSCode SSH with Cloud9 using CDK

### Summary

There are some benefit when using Cloud9, here is the [aws blog vscode cloud9](https://aws.amazon.com/blogs/architecture/field-notes-use-aws-cloud9-to-power-your-visual-studio-code-ide/)

- Auto hibernate after 30 minutes idle
- Auto turn on when open vscode
- No open port

### CDK stack to create a cloud9 environment

There are multiple way to launch a cloud9 such as AWS console, CLI, CloudFormation, I go with a CDK stack as below.

```
import { aws_cloud9, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class Cloud9CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // cloud9 environment
    const cloud9 = new aws_cloud9.CfnEnvironmentEC2(
      this,
      'CdkCloud9Example',
      {
        automaticStopTimeMinutes: 30,
        instanceType: 't2.large',
        name: 'CdkCloud9Example',
        connectionType: 'CONNECT_SSM',
        ownerArn: `arn:aws:iam::${this.account}:user/YOUR_IAM_USER_NAME`
      }
    )

    // access the ec2 and attach volume

  }
}

```

### Configure ssh for the local machine

Generate ssh private and public key

```
ssh-keygen -b 4096 -C 'VS Code Remote SSH user' -t rsa
```

Copy the public key from the local machine

```
cat ~/.ssh/id_rsa.pub
```

Paste the key to authorized_keys in ec2 instance

```
echo 'key pub' >> authorized_keys
```

Configure ssh config for the local machine

```
Host cloud9
    IdentityFile ~/.ssh/id_rsa_cloud9
    User ec2-user
    HostName i-0bf311ce929d7f91c
    ProxyCommand sh -c "~/.ssh/ssm-proxy.sh %h %p"
```

Download the [ssm-proxy script from here](https://github.com/aws-samples/cloud9-to-power-vscode-blog/blob/main/scripts/ssm-proxy.sh).It will check it the Cloud9-EC2 is running or not.

- If the EC2 running, it starts a ssm session and ssh tunnel via the session.

- If the EC2 is stopped, it will start the instance first, then start the ssm session and tunnel ssh.

```
 chmod +x ~/.ssh/ssm-proxy.sh
```
