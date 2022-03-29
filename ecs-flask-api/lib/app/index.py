# ==============================================================================
#  Environment: Develop, Test
#  Filename:  lambda_handler.py
#  Original Author: TRAN MINH HAI
#  Date created: 18 JAN 2022
# update things
# ==============================================================================
from datetime import datetime
import boto3
import pickle
import json
import numpy as np
import pandas as pd
import algorithms as signal
import os
os.environ['FHR_ENV'] = 'DEPLOY'


def read_ecg_from_s3(file, usecols=(1, 2, 3, 4), maxlength=60 * 30000):
    """
    Read data from S3 either .csv or .dat
    15 AUG 2021: maxlength 30 minute for demo via api gateway
    Fs should be 500 sample per second
    """
    #
    format = file.split(".")[-1]
    # Read csv data from S3
    if format == "csv":
        df = pd.read_csv(file, usecols=usecols, skiprows=[0])
        df.fillna(1e-16, inplace=True)
        ecg = df.values
        #
        print(np.shape(ecg))
        # check length
        if (np.shape(ecg)[0] > maxlength):
            ecg = ecg[:maxlength, :]
        return ecg
    # Read .dat from S3
    if format == "dat":
        names = file.split("/")
        bucket = names[2]
        key = names[3] + "/" + names[4]
        client = boto3.client("s3")
        data = client.get_object(Bucket=bucket, Key=key)['Body'].read()
        ecg = pickle.loads(data)
        #
        if (np.shape(ecg)[0] > maxlength):
            ecg = ecg[:maxlength, :]
        return ecg

    # Not support format
    print("Not supported format")
    return None


def validateS3FileName(filename):
    return True


def handler(event, context):
    """
    """
    filename = 's3://signal-fhr-data/ecg/001A_raw.csv'
    # sns client
    sns = boto3.client('sns')
    # get records from queue
    records = event.get('Records', [])
    # first record
    record = records[0]
    # parse the api request
    filename = record.get('body')
    # publish message to topic
    sns.publish(
        TopicArn='arn:aws:sns:ap-southeast-1:610770234379:CodePipelineNotification',
        Message=f'lambda process message from queue {event}')
    # s3 bucket fo logging
    bucketName = "signal-fhr-data"
    # log folder in s3
    keyName = "log/"
    # ====================== FHR ==================================
    # get record name
    recordName = filename.split("/")[-1]
    # create log dir name
    logDir = f'log/log-{datetime.now().strftime("%d%m%Y")}-{recordName.split(".")[0]}'
    # read ecg data
    try:
        ecg = read_ecg_from_s3(filename, usecols=(1, 2, 3, 4))
    except:
        return {
            'statusCode': 200,
            'headers': {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,GET"
            },
            'body': json.dumps({
                'message': f'not able to read data from s3 {filename}'
            })
        }
    # create logger
    debugger = signal.FHRLogger(
        logLocation='s3',
        s3BucketLog=bucketName,
        sigLen=len(ecg),
        recordName=recordName,
        logDir=logDir,
        selectedChannel=0,
        step=5,
        duration=6,
        ctgImageDPI=200,
        closePlots=True)
    # fhr processing
    fhrComputer = signal.FHR(fhrProcessor=signal.BatchFHR(
        mPiCA=True,
        numEigen=10,
        mQRSSVDMode='dynamic',
        numMaternalChannel=4,
        numFetalChannel=8,
        numPICAChannel=4,
        DEBUG=True,
        logDir=logDir,
        logLevel=4,
        CTGImageDPI=200,
        debugger=debugger))
    # ==============================================================
    # validate file name
    try:
        # fhr processing
        fhrComputer.computeFHR(ecg, recordName=recordName)
        # clean NaN before response
        fhrComputer.fSmoothedHR[np.isnan(fhrComputer.fSmoothedHR)] = 0.0
        fhrComputer.mSmoothedHR[np.isnan(fhrComputer.mSmoothedHR)] = 0.0
        # return s3Url to ctg image
        result = {
            's3Url': "s3://" + bucketName + "/" + keyName,
            'ctgJsonUrl': recordName + ".json",
            'mHR': list(fhrComputer.mSmoothedHR),
            'fHR': list(fhrComputer.fSmoothedHR),
        }
    except Exception as ex:
        result = "ERROR not able to compute ctg trace"
    # return response 200 to queue
    return {
        'statusCode': 200,
        'headers': {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        'body': json.dumps({
            'message': f'lambda processed messaged {recordName}'
        })
    }
