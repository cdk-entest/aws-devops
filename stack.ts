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
        ownerArn: `arn:aws:iam::${this.account}:user/hai`
      }
    )

    // access the ec2 and attach volume 


  }
}
