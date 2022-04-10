# Remote a Private EC2 via System Manager

**09 APR 2022**

## Summary

System manager enable remote access to EC2 instances without using SSH and opening port 22.

- Remote access a prviate EC2 by system mananger
- The private EC2 can access S3 via VPC endpoint
- Deply by a CDK stack

## Architecture

![aws_devops-Expriment drawio](https://user-images.githubusercontent.com/20411077/162595535-59610cf8-233c-423f-9a13-bb3f1cffacc3.png)

## CDK Stack

Create a VPC with a S3 VPC endpoint

```
    const vpc = new aws_ec2.Vpc(
      this,
      'VpcWithS3Endpoint',
      {
        gatewayEndpoints: {
          S3: {
            service: aws_ec2.GatewayVpcEndpointAwsService.S3
          }
        }
      }
    )
```

Add system manager VPC interface endpoint

```
    vpc.addInterfaceEndpoint(
      'VpcIterfaceEndpointSSM',
      {
        service: aws_ec2.InterfaceVpcEndpointAwsService.SSM
      }
    )
```

Create an IAM role for the EC2

```
    const role = new aws_iam.Role(
      this,
      'RoleForEc2ToAccessS3',
      {
        roleName: 'RoleForEc2ToAccessS3',
        assumedBy: new aws_iam.ServicePrincipal('ec2.amazonaws.com'),
      }
    )
```

Role for EC2 to communicate with SSM

```
    role.addManagedPolicy(
      aws_iam.ManagedPolicy.fromManagedPolicyArn(
        this,
        'PolicySSMMangerAccessS3',
        'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'
      )
    )
```

Policy for EC2 to access S3

```
    role.attachInlinePolicy(
      new aws_iam.Policy(
        this,
        'PolicyForEc2AccessS3',
        {
          policyName: 'PolicyForEc2AccessS3',
          statements: [
            new aws_iam.PolicyStatement(
              {
                actions: ['s3:*'],
                resources: ['*']
              }
            ),
          ]
        }
      )
    )

```

Launch an EC2 in a private subnet

```
    const ec2 = new aws_ec2.Instance(
      this,
      'Ec2ConnectVpcEndpointS3',
      {
        role: role,
        keyName: 'hai_ec2_t4g_large',
        vpc: vpc,
        instanceName: 'Ec2ConnectVpcEndpointS3',
        instanceType: aws_ec2.InstanceType.of(aws_ec2.InstanceClass.T2, aws_ec2.InstanceSize.SMALL),
        machineImage: aws_ec2.MachineImage.latestAmazonLinux(),
        securityGroup: sg,
        vpcSubnets: {
          subnetType: aws_ec2.SubnetType.PRIVATE
        }
      }
    )
```
