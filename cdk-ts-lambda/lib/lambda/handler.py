import json


def handler(event, context):
    """
    """
    # return
    return {
        'statusCode': 200,
        'headers': {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        'body': json.dumps({
            "message": "this is lambda from cdk typescript"
        },
            indent=4,
            sort_keys=True,
            default=str)
    }
