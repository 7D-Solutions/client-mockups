#!/usr/bin/env python3
"""
Enforce Verification Pattern Hook

Forces Claude to follow the verification pattern from CLAUDE.md:
1. Run actual command
2. Show real output  
3. Only then mark as complete

Blocks "marking complete" without evidence.
"""

import sys
import json
import os
import time

# Track recent command executions
COMMAND_HISTORY_FILE = "/tmp/claude_command_history.json"
HISTORY_TIMEOUT = 300  # 5 minutes

def load_command_history():
    """Load recent command execution history"""
    try:
        if os.path.exists(COMMAND_HISTORY_FILE):
            with open(COMMAND_HISTORY_FILE, 'r') as f:
                history = json.load(f)
                # Filter out old entries
                current_time = time.time()
                history['commands'] = [
                    cmd for cmd in history.get('commands', [])
                    if current_time - cmd['timestamp'] < HISTORY_TIMEOUT
                ]
                return history
    except:
        pass
    return {"commands": [], "last_verification": 0}

def save_command_history(history):
    """Save command history"""
    try:
        os.makedirs(os.path.dirname(COMMAND_HISTORY_FILE), exist_ok=True)
        with open(COMMAND_HISTORY_FILE, 'w') as f:
            json.dump(history, f)
    except:
        pass

def is_verification_command(command):
    """Check if command is a verification command"""
    verification_patterns = [
        'docker ps', 'docker-compose ps',
        'curl', 'wget', 
        'npm test', 'pytest', 'jest',
        'npm run', 'yarn test',
        'systemctl status', 'service status',
        'ps aux', 'netstat', 'lsof',
        'mysql -', 'psql -',
        'redis-cli ping',
        'health', 'status', 'verify'
    ]
    
    cmd_lower = command.lower()
    return any(pattern in cmd_lower for pattern in verification_patterns)

def main():
    try:
        # Read hook input  
        data = json.load(sys.stdin)
        tool_name = data.get("tool_name", "")
        tool_input = data.get("tool_input", {})
        
        history = load_command_history()
        
        # Track command executions
        if tool_name == "Bash":
            command = tool_input.get("command", "")
            if command:
                # Record this command execution
                history['commands'].append({
                    'command': command,
                    'timestamp': time.time(),
                    'is_verification': is_verification_command(command)
                })
                
                # Track if this was a verification
                if is_verification_command(command):
                    history['last_verification'] = time.time()
                
                save_command_history(history)
            sys.exit(0)  # Always allow Bash commands
        
        # Check TodoWrite for completion without verification
        if tool_name == "TodoWrite":
            todos = tool_input.get("todos", [])
            
            # Check if marking something as completed
            completing_todos = [
                t for t in todos 
                if t.get('status') == 'completed' and 'verify' in t.get('content', '').lower()
            ]
            
            if completing_todos:
                # Check if recent verification was done
                time_since_verification = time.time() - history.get('last_verification', 0)
                recent_commands = history.get('commands', [])[-5:]  # Last 5 commands
                
                if time_since_verification > 60:  # No verification in last minute
                    error_msg = f"""BLOCKED: Cannot mark verification todos as complete without evidence!

PROBLEM: You're marking verification task(s) as complete without running verification commands.

RECENT COMMANDS: {len(recent_commands)} commands in last 5 minutes
LAST VERIFICATION: {int(time_since_verification)}s ago

REQUIRED PATTERN (from CLAUDE.md):
1. Run the actual verification command (docker ps, curl, etc.)
2. Show the real output
3. THEN mark as completed with evidence:
   "✅ Completed: [task name]
   Evidence: [actual command] → [real output]"

RUN THE VERIFICATION FIRST, then update todos."""
                    
                    print(error_msg, file=sys.stderr)
                    sys.exit(2)  # Block the TodoWrite
        
        # Check if trying to use tools without initial verification
        if tool_name not in ["Read", "LS", "Glob", "Grep", "TodoWrite", "Bash"]:
            # Check if ANY verification has been done in this session
            if not history.get('commands'):
                error_msg = """BLOCKED: No commands executed yet!

You must verify system state before using tools:
1. docker ps | grep mysql
2. curl -f http://localhost:8000/api/health  
3. curl -f http://localhost:3000

This enforces verification-first behavior."""
                
                print(error_msg, file=sys.stderr)
                sys.exit(2)
        
        # Allow operation
        sys.exit(0)
        
    except Exception as e:
        print(f"Verification pattern hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()