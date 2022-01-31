"""
Lambda handler
"""


import json
import numpy as np
from datetime import datetime


def handler_file(event, context):
    """
    """
    # generate data
    sig = np.random.randint(0, 1000, (4096, 60))
    # start time
    start = datetime.now()
    # perform fft
    y = np.fft.fft(sig, axis=0)
    # power spectrum sum
    p = np.sum(np.abs(y))
    # end time
    end = datetime.now()
    # delta time
    delta_time = end.timestamp() - start.timestamp()
    # return
    return {
        'statusCode': 200,
        'headers': {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        'body': json.dumps({
            "api": "file",
            "duration": "{0}".format(delta_time * 1000),
            "sum spectrum": "{0}".format(p)
        },
            indent=4,
            sort_keys=True,
            default=str)
    }


def handler(event, context):
    """
    """
    # generate data
    sig = np.random.randint(0, 1000, (4096, 60))
    # start time
    start = datetime.now()
    # perform fft
    y = np.fft.fft(sig, axis=0)
    # power spectrum sum
    p = np.sum(np.abs(y))
    # end time
    end = datetime.now()
    # delta time
    delta_time = end.timestamp() - start.timestamp()
    # return
    return {
        'statusCode': 200,
        'headers': {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        'body': json.dumps({
            "api": "ecr",
            "duration": "{0}".format(delta_time * 1000),
            "sum spectrum": "{0}".format(p)
        },
            indent=4,
            sort_keys=True,
            default=str)
    }


if __name__ == "__main__":
    res = handler(event=None, context=None)
    print(res)
