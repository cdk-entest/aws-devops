# Setup AWS CLI with System Manager (SSM) Plugin to Access EC2 without SSH

**Hai Tran 08 APR 2022**

### Launch an EC2 instance

### Check SSM agent installed

By default, an SSH agent is installed in the EC2. Verify

```
sudo snap list amazon-ssm-agent

```

```
sudo systemctl status snap.amazon-ssm-agent.amazon-ssm-agent.service
```

### Assign a role to the EC2

A role which grant **role** should be attached to the EC2 so the SSM agent and SSM can communicate.

### VPC endpoint or 443 port open

Need to setup a VPC endpoint or open 443 port

### Install SSM plugin for AWS CLI

[Reference here ](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)

Download

```
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip" -o "sessionmanager-bundle.zip"
```

Unzip

```
unzip sessionmanager-bundle.zip
```

Install

```
sudo ./sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin
```

Verify

```
session-manager-plugin
```

### Start a session

```
aws ssm start-session --target i-09a833fbb8ff8a345
```

```
/bin/bash
```
