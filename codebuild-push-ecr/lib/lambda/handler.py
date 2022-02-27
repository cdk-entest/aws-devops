import imp


import json


def handler(event, context):
    return json.dumps({
        'statusCode': 200,
        'message': 'codebuild push ecr image'
    })
