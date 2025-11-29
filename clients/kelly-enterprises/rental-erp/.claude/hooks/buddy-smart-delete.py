#!/usr/bin/env python3
"""
BUDDY Smart Delete Hook - Protects against disasters while letting BUDDIES clean

BLOCKS:
- rm -rf on critical directories
- Deletion of entire folders without specific paths
- Panic deletions (like "rm -rf .")

ALLOWS:
- Specific file deletions
- Cleanup of known junk (review-for-delete, extra docker files)
- Output redirection to /dev/null
- Normal development operations
"""
import sys
import json
import os
import shlex

# Read input
data = json.load(sys.stdin)
tool_name = data.get("tool_name", "")
tool_input = data.get("tool_input", {})

# Define protected directories (NEVER delete these)
PROTECTED_DIRS = {
    '.git', '.claude', 'node_modules', 
    'Fireproof Gauge System/backend/routes',
    'Fireproof Gauge System/backend/services',
    'Fireproof Gauge System/backend/config',
    'Fireproof Gauge System/frontend/src',
    'docs/claude'  # Protect BUDDY training materials!
}

# Define cleanup-allowed patterns
CLEANUP_ALLOWED = {
    'review-for-delete',
    'review-for-deletion',
    'docker-compose-*.yml',  # But not docker-compose.yml itself
    'docker-compose.*.yml',
    '*.tmp', '*.temp', '*.bak', '*.backup',
    'test-output', 'coverage',
    '*.log'
}

def is_protected_path(path):
    """Check if a path is protected from deletion"""
    abs_path = os.path.abspath(path)
    for protected in PROTECTED_DIRS:
        protected_abs = os.path.abspath(protected)
        if abs_path == protected_abs or abs_path.startswith(protected_abs + os.sep):
            return True
    return False

def is_cleanup_allowed(path):
    """Check if a path is in the allowed cleanup list"""
    # Check exact matches and patterns
    path_lower = path.lower()
    for allowed in CLEANUP_ALLOWED:
        if '*' in allowed:
            # Simple glob matching
            pattern = allowed.replace('*', '')
            if pattern in path_lower:
                return True
        elif allowed in path_lower:
            return True
    return False

# Only check Bash commands
if tool_name == "Bash":
    cmd = tool_input.get("command", "").strip()
    
    # Parse command
    try:
        tokens = shlex.split(cmd)
    except ValueError:
        tokens = cmd.split()
    
    # Check for dangerous rm commands
    if 'rm' in tokens or 'rmdir' in tokens:
        # Look for -rf or -fr flags
        has_rf = ('-rf' in tokens or '-fr' in tokens or 
                  ('-r' in tokens and '-f' in tokens))
        
        # Find what's being deleted
        delete_targets = []
        i = 0
        while i < len(tokens):
            if tokens[i] in ['rm', 'rmdir']:
                # Collect all non-flag arguments after rm
                j = i + 1
                while j < len(tokens):
                    if not tokens[j].startswith('-'):
                        delete_targets.append(tokens[j])
                    j += 1
                break
            i += 1
        
        # Check each target
        for target in delete_targets:
            # Block dangerous patterns
            if target in ['.', '/', '~', '*']:
                print(f"BLOCKED: Extremely dangerous deletion pattern '{target}'", file=sys.stderr)
                sys.exit(2)
            
            # Block rm -rf on protected directories
            if has_rf and is_protected_path(target):
                print(f"BLOCKED: Cannot rm -rf protected directory '{target}'", file=sys.stderr)
                sys.exit(2)
            
            # Block any deletion of protected paths
            if is_protected_path(target) and not is_cleanup_allowed(target):
                print(f"BLOCKED: Cannot delete protected path '{target}'", file=sys.stderr)
                sys.exit(2)
        
        # If no specific targets, block it (like bare "rm -rf")
        if has_rf and not delete_targets:
            print("BLOCKED: rm -rf without specific target is too dangerous", file=sys.stderr)
            sys.exit(2)
    
    # Allow output redirection to /dev/null (it's not a real file!)
    if '>' in cmd and '/dev/null' in cmd:
        # This is fine, let it through
        pass
    elif '>' in cmd and '>>' not in cmd:
        # Check for other output redirections
        parts = cmd.split('>')
        if len(parts) > 1:
            after_redirect = parts[1].strip()
            if after_redirect:
                target_tokens = after_redirect.split()
                if target_tokens:
                    target_file = target_tokens[0].strip('"\'')
                    # Only block if overwriting important files
                    if os.path.exists(target_file) and is_protected_path(target_file):
                        print(f"BLOCKED: Cannot overwrite protected file '{target_file}'", file=sys.stderr)
                        sys.exit(2)

# For Edit/MultiEdit/Write - only block if trying to clear critical files
elif tool_name in ["Edit", "MultiEdit", "Write"]:
    file_path = tool_input.get("file_path", "")
    
    if tool_name == "Write":
        content = tool_input.get("content", "")
        if os.path.exists(file_path) and not content.strip() and is_protected_path(file_path):
            print(f"BLOCKED: Cannot clear protected file '{file_path}'", file=sys.stderr)
            sys.exit(2)
    
    elif tool_name == "Edit":
        old_string = tool_input.get("old_string", "")
        new_string = tool_input.get("new_string", "")
        if old_string and old_string.strip() and not new_string.strip() and is_protected_path(file_path):
            print(f"BLOCKED: Cannot clear content in protected file '{file_path}'", file=sys.stderr)
            sys.exit(2)
    
    elif tool_name == "MultiEdit":
        edits = tool_input.get("edits", [])
        for edit in edits:
            old_string = edit.get("old_string", "")
            new_string = edit.get("new_string", "")
            if old_string and old_string.strip() and not new_string.strip() and is_protected_path(file_path):
                print(f"BLOCKED: Cannot clear content in protected file '{file_path}'", file=sys.stderr)
                sys.exit(2)

# Allow everything else
sys.exit(0)