"""
Lambda handler
"""


import json
import numpy as np


def handler(event, context):
    """
    """
    # generate data
    sig = np.random.randint(0, 1000, (4096, 60))
    # fft
    y = np.fft.fft(sig, axis=0)
    # power spectrum sum
    p = np.sum(np.abs(y))
    # return
    return {
        'statusCode': 200,
        'headers': {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        'body': json.dumps({"sum spectrum": "{0}".format(p)},
                           indent=4,
                           sort_keys=True,
                           default=str)
    }



if __name__=="__main__":
    res = handler(event=None, context=None)
    print(res)