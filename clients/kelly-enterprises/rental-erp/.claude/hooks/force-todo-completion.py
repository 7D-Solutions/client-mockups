#!/usr/bin/env python3
"""
Force Todo Completion Hook - Blocks tools if todos are incomplete

This hook prevents Claude from using tools if there are incomplete todos,
forcing actual verification and completion of each step.
"""

import sys
import json
import os
import re

# Session file to track todo state
TODO_STATE_FILE = "/tmp/claude_todo_state.json"

def extract_todos_from_stdin():
    """Extract todo list from the system reminder if present"""
    # Read all stdin to check for system reminders
    stdin_content = sys.stdin.read()
    data = json.loads(stdin_content)
    
    # Look for todo list in system reminders (this is a heuristic)
    # In reality, we'd need a better way to access todo state
    return data, []

def check_incomplete_todos():
    """Check if there are incomplete todos"""
    # This is where we'd check actual todo state
    # For now, return a mock check
    try:
        if os.path.exists(TODO_STATE_FILE):
            with open(TODO_STATE_FILE, 'r') as f:
                state = json.load(f)
                incomplete = [t for t in state.get('todos', []) if t['status'] != 'completed']
                return len(incomplete), incomplete
    except:
        pass
    return 0, []

def main():
    try:
        # Read hook input
        stdin_input = sys.stdin.read()
        data = json.loads(stdin_input)
        tool_name = data.get("tool_name", "")
        tool_input = data.get("tool_input", {})
        
        # Allow TodoWrite (needed to update todos!)
        if tool_name == "TodoWrite":
            # Track the todos being written
            todos = tool_input.get("todos", [])
            try:
                os.makedirs(os.path.dirname(TODO_STATE_FILE), exist_ok=True)
                with open(TODO_STATE_FILE, 'w') as f:
                    json.dump({"todos": todos}, f)
            except:
                pass
            sys.exit(0)
        
        # Allow Read/LS/Glob for information gathering
        if tool_name in ["Read", "LS", "Glob", "Grep"]:
            sys.exit(0)
        
        # Check for incomplete todos before allowing other tools
        incomplete_count, incomplete_todos = check_incomplete_todos()
        
        if incomplete_count > 0:
            # Special case: Allow verification commands even with incomplete todos
            if tool_name == "Bash":
                command = tool_input.get("command", "")
                verification_commands = [
                    "docker ps", "curl", "npm test", "pytest", 
                    "echo", "pwd", "ls", "cat"
                ]
                if any(cmd in command for cmd in verification_commands):
                    sys.exit(0)  # Allow verification/info commands
            
            # Block other operations
            todo_list = "\n".join([f"- {t['content']} (status: {t['status']})" 
                                  for t in incomplete_todos[:5]])  # Show first 5
            
            error_msg = f"""BLOCKED: Complete your todos before proceeding!

You have {incomplete_count} incomplete todo(s):
{todo_list}

REQUIRED:
1. Complete each todo with actual verification
2. Mark as completed ONLY after running real commands
3. Show evidence of completion in your response

This hook enforces the todo completion protocol from CLAUDE.md:
"✅ Completed: [task name]
Evidence: [actual command] → [real output]"

Complete your current todos before using other tools."""
            
            print(error_msg, file=sys.stderr)
            sys.exit(2)  # Block the tool
        
        # Allow if no incomplete todos
        sys.exit(0)
        
    except Exception as e:
        # Log error but allow operation to prevent breaking everything
        print(f"Todo completion hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()