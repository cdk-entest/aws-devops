# CI/CD Pipeline for Lambda with ECR and SSM for updating tag

**Hai Tran 28 FEB 2022**

### SSM paraemters for CI/CD

create a ssm

```
aws ssm put-parameter --name 'FhrEcrImageTagDemo' --description 'keep track ecr image tag' --value 'b05517a66933f6fde060efe2ecd78784767f6ce1' --type 'String'
```

get a ssm

```
aws ssm get-parameter --name 'FhrEcrImageTagDemo'
```

update a ssm

```
aws ssm put-parameter --name 'FhrEcrImageTagDemo' --type 'String' --value 'b05517a66933f6fde060efe2ecd78784767f6ce1' --overwrite
```

```
aws ssm put-parameter --name FhrEcrImageTagDemo --type String --value '0a95b18303e05f2de9315bbb385da173398b9661' --overwrite
```
