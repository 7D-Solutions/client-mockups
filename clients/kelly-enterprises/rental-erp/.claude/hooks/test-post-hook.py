#!/usr/bin/env python3
"""
Simple test hook to verify PostToolUse is working
"""
import sys
import json
import time

# Write to a test file to prove the hook ran
try:
    with open("/tmp/post-hook-test.log", "a") as f:
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        f.write(f"[{timestamp}] PostToolUse hook triggered!\n")
        f.flush()
except:
    pass

# Read JSON input and write tool name
try:
    if not sys.stdin.isatty():
        data = json.load(sys.stdin)
        tool_name = data.get("tool_name", "Unknown")
        with open("/tmp/post-hook-test.log", "a") as f:
            f.write(f"  Tool: {tool_name}\n")
            f.flush()
except:
    pass

sys.exit(0)