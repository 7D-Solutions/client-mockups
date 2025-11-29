#!/usr/bin/env python3
import sys
import json

try:
    data = json.load(sys.stdin)
    with open('/tmp/claude_hook_test.log', 'a') as f:
        f.write(f"Hook executed: {data.get('tool_name', 'unknown')}\n")
    sys.exit(0)
except:
    sys.exit(0)