import json


def handler(event, context):
    return json.dumps({
        "message": "lambda cloudwatch alarm"
    })
