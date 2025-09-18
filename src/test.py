import base64
import json
from typing import Tuple

def base64url_decode(input_str: str) -> bytes:
    # Add padding if needed, then base64-url decode
    rem = len(input_str) % 4
    if rem:
        input_str += "=" * (4 - rem)
    return base64.urlsafe_b64decode(input_str.encode('utf-8'))

def inspect_jwt(token: str) -> Tuple[dict, dict]:
    """
    Returns (header, payload) as dicts without verifying the signature.
    """
    try:
        header_b64, payload_b64, _ = token.split('.')
    except ValueError:
        raise ValueError("Token must have 3 parts separated by '.'")

    header = json.loads(base64url_decode(header_b64).decode('utf-8'))
    payload = json.loads(base64url_decode(payload_b64).decode('utf-8'))
    return header, payload

if __name__ == "__main__":
    # Replace this with your JWT token
    token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ik1EREZpLXFwTUozd0M3cmk5cGI1dVZnMnZYSERyZVl5MjN1TEFjRm04SlkifQ.eyJpZCI6ImU4MDFhNzNkLTJiMzQtNGYwOS05MWQwLTJkMGY4OWI0MjdmMiIsInN1YiI6ImU4MDFhNzNkLTJiMzQtNGYwOS05MWQwLTJkMGY4OWI0MjdmMiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzIwMC9jZHAtZGVmcmEtaWQtc3R1YiIsImNvcnJlbGF0aW9uSWQiOiI3NDQ3Zjk3ZS1hMjUyLTQyZTgtOGE1MC03NTVkMTcxNjA0MjQiLCJzZXNzaW9uSWQiOiIxZGExMmYxNi0zZmIxLTQ3MDMtOTdhYS03ZTM2Y2Y2MDgyMDAiLCJjb250YWN0SWQiOiIzMzRlYWY0NC01Njc5LTQyNDEtOGZkMS0xNDMyNGRiNTU4OGUiLCJzZXJ2aWNlSWQiOiJlODRhMzk4Yi04MTA0LTQ3YTItODZhZS1kZTExNjhlNDEzMmYiLCJmaXJzdE5hbWUiOiJEZW5uaXMiLCJsYXN0TmFtZSI6IkFtcG9uc2FoIiwiZW1haWwiOiJkZW5uaXMuZWZmYUBEZWZyYS5vbm1pY3Jvc29mdC5jb20iLCJ1bmlxdWVSZWZlcmVuY2UiOiIxOWQ3YjM4Mi1kZjBjLTRkNmUtYThlMC0zYzhhNDE5ZGUzMDIiLCJsb2EiOiIxIiwiYWFsIjoiMSIsImVucm9sbWVudENvdW50IjoiMiIsImVucm9sbWVudFJlcXVlc3RDb3VudCI6IjEiLCJjdXJyZW50UmVsYXRpb25zaGlwSWQiOiI0NDQiLCJyZWxhdGlvbnNoaXBzIjpbIjQ0NDoxMjM0OkdsYW1zaGlyZSBDb3VudHkgQ291bmNpbDowOmVtcGxveWVlOjAiLCI4ODg4OjEyMzQ6VGVzdCBPcmdhbml6YXRpb246MDplbXBsb3llZTowIl0sInJvbGVzIjpbIjIzOTUwYTJkLWMzN2QtNDNkYS05ZmNiLTBhNGNlOWFhMTFlZTpjZW86MyJdLCJpYXQiOjE3NTgxMTg1NDF9.tVnZHPqKU7XWF92bjL6p9nkO0COiYdlX57HQwy0Lci7RL-I8GPTLbE4jmVKgFXlUQZsq1JqBT2iyDr8Qyrif5x8Je8sk0RURmZAMw_R_icAEvHOAB7dofxl241M92g78WcjhFPRhXwN5_Gm_39aOOPatNOde7dw9SQ-elKdGtQBfjQc4FOWnNUoGoCYWeQykqfjYdoQPRIzwdaG_1wlyEmVGUAIheA8XiUShkAEa6gl4PyKROGS02ROKVSDDHUlDqoKSSo_BDFfnnZyWebquJUNG8j-S_ZWlN-10kXMuKKN3cyw6ysO17YYL08GmNoGBigoqOBlTHVI2_xS4EsOcIw"
    header, payload = inspect_jwt(token)
    print("Header:", header)
    print("Payload:", payload)
