import json
import boto3
import datetime


def handler(event, context):

    # s3 client
    client = boto3.client('s3')

    # datetime
    time = datetime.datetime.now()

    # message
    message = f'{event}'

    # write result to bucket
    client.put_object(
        Body=bytes(message, 'utf-8'),
        Bucket='haitran-lambda-s3-event-bucket-demo',
        Key=f'result/{time}.json'
    )

    return json.dumps({
        "message": "lambda s3 event"
    })
