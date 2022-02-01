# CDK CodePipeline for Lambda API 

## Setup 
```
cdk init --language python 
```
project structure 
```

```
connect GitHub with AWS [referece](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections-create-github.html). This needs two step 1) install AWS connector app into GitHub and 2) create a connection arn in AWS console. Then this is the aws_cdk.pipelines.CodePipeline
```
pipeline = pipelines.CodePipeline(
            self,
            'Pipeline',
            pipeline_name='CdkCodepipelineStack',
            synth=pipelines.ShellStep(
                'Synth',
                input=pipelines.CodePipelineSource.connection(
                    repo_string="entest-hai/aws-devops",
                    branch="cdk-codepipeline",
                    connection_arn=""
                ),
                commands=["pip install -r requirements.txt",
                          "npm install -g aws-cdk",
                          "cdk synth"]
            )
        )
``` 
