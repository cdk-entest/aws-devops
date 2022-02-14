import {
  aws_cloudformation,
  aws_codebuild,
  aws_codecommit,
  aws_codepipeline,
  aws_codepipeline_actions,
  aws_iam,
  aws_kms,
  aws_s3,
  CfnCapabilities,
  CfnOutput,
  RemovalPolicy,
  Stack,
  StackProps
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ApplicationStack } from './application-stack';

export interface CdkTsCicdPipelineStackProps extends StackProps {
  readonly devApplicationStack: ApplicationStack
  readonly prodApplicationStack: ApplicationStack
  readonly prodAccountId: string
}

export class CdkTsCicdPipelineStack extends Stack {

  constructor(scope: Construct, id: string, props: CdkTsCicdPipelineStackProps) {

    super(scope, id, props);

    // connect to the repository 
    const repository = aws_codecommit.Repository.fromRepositoryName(
      this,
      "CodeCommitRepo",
      `repo-${this.account}`
    )

    // product deployment role 
    const prodDeploymentRole = aws_iam.Role.fromRoleArn(
      this,
      "ProdDeploymentRole",
      `arn:aws:iam::product_account_id:role/CloudFormationDeploymentRole`, {
      mutable: false
    }
    )

    // cross account role 
    const prodCrossAccountRole = aws_iam.Role.fromRoleArn(
      this,
      "ProdCrossAccountRole",
      `arn:aws:iam::product_account_id:role/CdkCodePipelineCrossAcccountRole`, {
      mutable: false
    }
    )

    // product account root principal 
    const prodAccountRootPrincipal = new aws_iam.AccountPrincipal(
      props.prodAccountId
    )

    // kms key 
    const key = new aws_kms.Key(
      this,
      "ArtifactKey",
      {
        alias: "key/artifcat-key"
      }
    )
    key.grantDecrypt(prodAccountRootPrincipal)
    key.grantDecrypt(prodCrossAccountRole)

    // code pipeline artifact
    const artifactBucket = new aws_s3.Bucket(
      this,
      "ArtifactBucket", {
      bucketName: `cdk-ts-artifact-bucket-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: aws_s3.BucketEncryption.KMS,
      encryptionKey: key
    });
    artifactBucket.grantPut(prodAccountRootPrincipal);
    artifactBucket.grantRead(prodCrossAccountRole);

    // code build project 
    const cdkBuild = new aws_codebuild.PipelineProject(this, 'CdkBuild', {
      buildSpec: aws_codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'npm install'
            ],
          },
          build: {
            commands: [
              'npm run build',
              'npm run cdk synth -- -o dist'
            ],
          },
        },
        artifacts: {
          'base-directory': 'dist',
          files: [
            '*ApplicationStack.template.json',
          ],
        },
      }),
      environment: {
        buildImage: aws_codebuild.LinuxBuildImage.STANDARD_5_0,
      },
      encryptionKey: key
    });

    // build lambda 
    const lambdaBuild = new aws_codebuild.PipelineProject(this, 'LambdaBuild', {
      buildSpec: aws_codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: [
              'cd app',
              'npm install',
            ],
          },
          build: {
            commands: 'npm run build',
          },
        },
        artifacts: {
          'base-directory': 'app',
          files: [
            'index.js',
            'node_modules/**/*',
          ],
        },
      }),
      environment: {
        buildImage: aws_codebuild.LinuxBuildImage.STANDARD_5_0,
      },
      encryptionKey: key
    });

    // source output 
    const sourceOutput = new aws_codepipeline.Artifact();
    // build output 
    const cdkBuildOutput = new aws_codepipeline.Artifact("CdkBuildOutput");
    // lambda build output 
    const lambdaBuildOutput = new aws_codepipeline.Artifact("LambdaBuildOutput");

    // pipeline 
    const pipeline = new aws_codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'CrossAccountPipeline',
      artifactBucket: artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new aws_codepipeline_actions.CodeCommitSourceAction({
              actionName: 'CodeCommit_Source',
              repository: repository,
              output: sourceOutput,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new aws_codepipeline_actions.CodeBuildAction({
              actionName: 'Application_Build',
              project: lambdaBuild,
              input: sourceOutput,
              outputs: [lambdaBuildOutput],
            }),
            new aws_codepipeline_actions.CodeBuildAction({
              actionName: 'CDK_Synth',
              project: cdkBuild,
              input: sourceOutput,
              outputs: [cdkBuildOutput],
            }),
          ],
        },
        {
          stageName: 'Deploy_Dev',
          actions: [
            new aws_codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy',
              templatePath: cdkBuildOutput.atPath('DevApplicationStack.template.json'),
              stackName: 'DevApplicationDeploymentStack',
              adminPermissions: true,
              parameterOverrides: {
                ...props.devApplicationStack.lambdaCode.assign(lambdaBuildOutput.s3Location),
              },
              extraInputs: [lambdaBuildOutput]
            })
          ],
        },
        {
          stageName: 'Deploy_Prod',
          actions: [
            new aws_codepipeline_actions.CloudFormationCreateUpdateStackAction({
              actionName: 'Deploy',
              templatePath: cdkBuildOutput.atPath('ProdApplicationStack.template.json'),
              stackName: 'ProdApplicationDeploymentStack',
              adminPermissions: true,
              parameterOverrides: {
                ...props.prodApplicationStack.lambdaCode.assign(lambdaBuildOutput.s3Location),
              },
              deploymentRole: prodDeploymentRole,
              cfnCapabilities: [CfnCapabilities.ANONYMOUS_IAM],
              role: prodCrossAccountRole,
              extraInputs: [lambdaBuildOutput],
            }),
          ],
        },
      ],
    });

    // pipeline policies
    pipeline.addToRolePolicy(
      new aws_iam.PolicyStatement({
        actions: ['sts:AssumeRole'],
        resources: ["arn:aws:iam::product_account_id:role/*"]
      }));

    // pipeline output 
    new CfnOutput(
      this,
      "ArtifactBucketEncryptionKeyArn", {
      value: key.keyArn,
      exportName: "ArtifactBucketEncryptionKey"
    });

  }
}

