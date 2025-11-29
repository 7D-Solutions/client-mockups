#!/usr/bin/env python3
import sys
import json
import re
import os

# Read input
data = json.load(sys.stdin)

tool_name = data.get("tool_name", "")
tool_input = data.get("tool_input", {})

# Check for Docker file edits
docker_files = ['Dockerfile', 'docker-compose.yml', 'docker-compose.override.yml', 'docker-compose.dev.yml']

if tool_name == "Edit" or tool_name == "Write":
    file_path = tool_input.get("file_path", "")
    if file_path:
        # Get just the filename
        filename = os.path.basename(file_path)
        # Check if it's a Docker-related file
        if filename in docker_files or filename.startswith('Dockerfile') or 'docker-compose' in filename:
            print(f"BLOCKED: Cannot modify Docker configuration file '{filename}'", file=sys.stderr)
            print("Docker files should not be edited - they use volume mounts for development", file=sys.stderr)
            sys.exit(2)

# Check MultiEdit operations on Docker files
elif tool_name == "MultiEdit":
    file_path = tool_input.get("file_path", "")
    if file_path:
        filename = os.path.basename(file_path)
        if filename in docker_files or filename.startswith('Dockerfile') or 'docker-compose' in filename:
            print(f"BLOCKED: Cannot modify Docker configuration file '{filename}'", file=sys.stderr)
            print("Docker files should not be edited - they use volume mounts for development", file=sys.stderr)
            sys.exit(2)

# Check Bash commands
elif tool_name == "Bash":
    cmd = tool_input.get("command", "").strip()
    
    # Check if it's a docker command
    if re.search(r'\bdocker\b', cmd):
        # Allow docker-compose restart
        if re.search(r'docker-compose\s+restart', cmd):
            sys.exit(0)
        
        # Allow read-only operations
        allowed_patterns = [
            r'docker\s+ps',
            r'docker\s+logs',
            r'docker-compose\s+ps',
            r'docker-compose\s+logs',
            r'docker\s+exec.*(?:cat|ls|grep|echo|pwd)',  # read-only exec commands
        ]
        
        for pattern in allowed_patterns:
            if re.search(pattern, cmd):
                sys.exit(0)
        
        # Block everything else docker-related
        blocked_patterns = [
            r'docker.*build',
            r'docker-compose.*up',
            r'docker-compose.*down',
            r'docker.*rm',
            r'docker.*stop(?!\s*\|\s*grep)',  # allow stop in pipelines for listing
            r'docker.*start',
            r'docker.*kill',
            r'docker.*create',
            r'docker.*run',
        ]
        
        for pattern in blocked_patterns:
            if re.search(pattern, cmd, re.IGNORECASE):
                print(f"BLOCKED: Docker command not allowed: '{cmd}'", file=sys.stderr)
                print("Only 'docker-compose restart' and read operations are permitted", file=sys.stderr)
                sys.exit(2)

# Also check for Bash operations that might edit Docker files
if tool_name == "Bash":
    cmd = tool_input.get("command", "").strip()
    # Check for commands that edit docker files
    docker_file_patterns = [
        r'(nano|vim|vi|emacs|sed|awk).*docker-compose',
        r'(nano|vim|vi|emacs|sed|awk).*Dockerfile',
        r'echo.*>.*docker-compose',
        r'echo.*>.*Dockerfile',
        r'cat.*>.*docker-compose',
        r'cat.*>.*Dockerfile',
    ]
    
    for pattern in docker_file_patterns:
        if re.search(pattern, cmd, re.IGNORECASE):
            print(f"BLOCKED: Cannot edit Docker files via command line: '{cmd}'", file=sys.stderr)
            print("Docker files should not be edited - they use volume mounts for development", file=sys.stderr)
            sys.exit(2)

# Allow everything else
sys.exit(0)