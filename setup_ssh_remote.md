# Setup SSH Remote

**Hai Tran 08 APR 2022**

## Enable SSH with password

```
nano /etc/ssh/sshd_config
```

enable password ssh

```
PasswordAuthentication yes
```

setup password for an user

```
sudo passwd root
```

reset ssh service

```
sudo service ssh restart
```

## Install ssh-remote extension for vscode

```
Goto vscode extension and search for Remote - SSH
```

## Configure a new SSH connect

```
Configure timeout
```

## Install Python extension for remote

```
Goto vscode extension and search for Python
```
