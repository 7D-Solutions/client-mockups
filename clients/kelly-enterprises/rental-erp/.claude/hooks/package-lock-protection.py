#!/usr/bin/env python3
"""
Package Lock Protection Hook

Prevents direct editing of package lock files which can cause dependency corruption.
These files should only be modified through npm/yarn commands.
"""

import sys
import json

def main():
    try:
        # Read hook input
        data = json.load(sys.stdin)
        tool_name = data.get("tool_name", "")
        tool_input = data.get("tool_input", {})
        
        # Check file modification tools
        if tool_name in ["Edit", "MultiEdit", "Write"]:
            file_path = tool_input.get("file_path", "")
            
            # Check for lock files
            lock_files = [
                "package-lock.json",
                "yarn.lock", 
                "pnpm-lock.yaml",
                "composer.lock"
            ]
            
            file_path_lower = file_path.lower()
            for lock_file in lock_files:
                if lock_file in file_path_lower:
                    error_msg = f"""BLOCKED: Cannot edit lock file '{lock_file}' directly!

PROBLEM: Direct editing of lock files can corrupt dependency resolution.

SOLUTION: Use proper package manager commands instead:
- npm install <package>
- npm update
- yarn add <package>
- yarn upgrade

Lock files should only be modified by package managers."""
                    
                    print(error_msg, file=sys.stderr)
                    sys.exit(2)
        
        # Allow all other operations
        sys.exit(0)
        
    except Exception as e:
        # Always allow on hook errors to prevent blocking everything
        print(f"Package lock protection hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()