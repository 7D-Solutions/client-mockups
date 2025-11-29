#!/usr/bin/env python3
import sys
import json
import os
import shlex

# Read input
data = json.load(sys.stdin)

tool_name = data.get("tool_name", "")
tool_input = data.get("tool_input", {})

# Block Bash commands that delete files or folders
if tool_name == "Bash":
    cmd = tool_input.get("command", "").strip()
    
    # Parse command into tokens
    try:
        tokens = shlex.split(cmd)
    except ValueError:
        # If shlex fails, fall back to simple split
        tokens = cmd.split()
    
    # Define deletion commands and command prefixes
    deletion_commands = {'rm', 'rmdir', 'rd', 'del', 'erase', 'unlink', 'shred', 'truncate', 'remove-item'}
    command_prefixes = {'sudo', 'su', 'doas', 'runas', 'exec', 'command', 'builtin'}
    
    # Check each token
    i = 0
    while i < len(tokens):
        token = tokens[i]
        
        # Skip flags (start with -)
        if token.startswith('-') and len(token) > 1:
            i += 1
            continue
        
        # Skip environment variable assignments at the start
        if '=' in token and all(tokens[j].count('=') > 0 for j in range(0, i+1) if not tokens[j].startswith('-')):
            i += 1
            continue
        
        # Determine if this is a command position
        is_command_position = False
        
        # First non-env-var token is command position
        if i == 0:
            is_command_position = True
        
        # Token after command separator is command position
        elif i > 0 and tokens[i-1] in ['&&', '||', ';', '|', '&']:
            is_command_position = True
        
        # Token after sudo/su/etc is command position
        elif i > 0 and tokens[i-1].lower() in command_prefixes:
            is_command_position = True
        
        # Check if it's a deletion command
        if is_command_position and token.lower() in deletion_commands:
            print(f"BLOCKED: Deletion command '{token}' not allowed", file=sys.stderr)
            sys.exit(2)
        
        i += 1
    
    # Also check for find with -delete flag
    if 'find' in [t.lower() for t in tokens] and '-delete' in tokens:
        print("BLOCKED: find command with -delete flag not allowed", file=sys.stderr)
        sys.exit(2)
    
    # Block output redirection that overwrites existing files
    if '>' in cmd and '>>' not in cmd:
        # Simple check for > not part of >>
        parts = cmd.split('>')
        if len(parts) > 1:
            # Get the part after > 
            after_redirect = parts[1].strip()
            if after_redirect:
                # Extract target file (first token after >)
                target_tokens = after_redirect.split()
                if target_tokens:
                    target_file = target_tokens[0].strip('"\'')
                    # Check if file exists
                    if os.path.exists(target_file):
                        print(f"BLOCKED: Output redirection (>) would overwrite existing file '{target_file}'. Use >> to append instead.", file=sys.stderr)
                        sys.exit(2)

# Block Edit operations that clear content
elif tool_name == "Edit":
    old_string = tool_input.get("old_string", "")
    new_string = tool_input.get("new_string", "")
    
    if old_string and old_string.strip() and not new_string.strip():
        print("BLOCKED: Cannot delete file contents with Edit", file=sys.stderr)
        sys.exit(2)

# Block MultiEdit operations that clear content
elif tool_name == "MultiEdit":
    edits = tool_input.get("edits", [])
    for i, edit in enumerate(edits):
        old_string = edit.get("old_string", "")
        new_string = edit.get("new_string", "")
        
        if old_string and old_string.strip() and not new_string.strip():
            print(f"BLOCKED: Edit #{i+1} would delete content", file=sys.stderr)
            sys.exit(2)

# Block Write tool with empty content to existing files
elif tool_name == "Write":
    content = tool_input.get("content", "")
    file_path = tool_input.get("file_path", "")
    
    if os.path.exists(file_path) and not content.strip():
        print(f"BLOCKED: Cannot write empty content to existing file '{file_path}'", file=sys.stderr)
        sys.exit(2)

# Allow everything else
sys.exit(0)