#!/usr/bin/env python3
"""
Docker Awareness Required Hook

This hook prevents server-related operations without first checking Docker state.
It tracks what Docker information has been read in the current session and
blocks server operations until proper Docker awareness is established.

PROBLEM: Claude often says "server is not running" without checking Docker status first.
SOLUTION: Force Docker state verification before server-related operations.
"""

import sys
import json
import os
import time
import hashlib

# Session state file to track Docker reads
SESSION_STATE_FILE = "/tmp/claude_docker_awareness_session.json"
SESSION_TIMEOUT = 3600  # 1 hour session timeout

def load_session_state():
    """Load current session state from file"""
    try:
        if os.path.exists(SESSION_STATE_FILE):
            with open(SESSION_STATE_FILE, 'r') as f:
                state = json.load(f)
                # Check if session is still valid (not expired)
                if time.time() - state.get('last_update', 0) < SESSION_TIMEOUT:
                    return state
        return {"docker_files_read": [], "docker_commands_run": [], "last_update": 0}
    except:
        return {"docker_files_read": [], "docker_commands_run": [], "last_update": 0}

def save_session_state(state):
    """Save session state to file"""
    try:
        state['last_update'] = time.time()
        with open(SESSION_STATE_FILE, 'w') as f:
            json.dump(state, f)
    except:
        pass  # Fail silently to not block operations

def is_docker_file(file_path):
    """Check if a file is Docker-related"""
    if not file_path:
        return False
    
    file_path = file_path.lower()
    docker_indicators = [
        'docker-compose', 'dockerfile', '.env', 'docker.md', 
        'deployment.md', 'setup.md', 'installation.md'
    ]
    
    return any(indicator in file_path for indicator in docker_indicators)

def is_docker_command(command):
    """Check if a command is Docker-related"""
    if not command:
        return False
    
    command = command.lower().strip()
    docker_commands = [
        'docker ps', 'docker-compose ps', 'docker status', 'docker logs',
        'docker inspect', 'docker stats', 'docker exec', 'docker images',
        'docker network', 'docker volume', 'systemctl status docker'
    ]
    
    return any(cmd in command for cmd in docker_commands)

def is_server_operation(tool_name, tool_input):
    """Check if operation is server-related and needs Docker awareness"""
    
    # Bash commands that might affect or assume server state
    if tool_name == "Bash":
        command = tool_input.get("command", "").lower().strip()
        
        server_operations = [
            # Service operations
            'systemctl start', 'systemctl stop', 'systemctl restart', 'systemctl reload',
            'service start', 'service stop', 'service restart',
            
            # Process operations
            'kill ', 'killall', 'pkill',
            
            # Network operations
            'netstat', 'ss -', 'lsof -i', 'iptables', 'ufw',
            
            # Server software operations
            'nginx', 'apache2', 'httpd', 'mysql', 'postgresql', 'redis',
            'node server', 'npm start', 'npm run start', 'yarn start',
            'python app.py', 'python server.py', 'python main.py',
            
            # Port operations
            'curl localhost', 'curl 127.0.0.1', 'wget localhost',
            'nc -', 'telnet localhost', 'ping localhost',
            
            # Database operations
            'mysql -u', 'psql -', 'mongo ', 'redis-cli',
            
            # Log viewing (might indicate server troubleshooting)
            'tail -f', 'journalctl', 'less /var/log', 'cat /var/log',
            
            # Installation that might affect servers
            'apt install', 'yum install', 'brew install', 'npm install -g',
            'pip install', 'docker pull', 'docker run'
        ]
        
        return any(op in command for op in server_operations)
    
    # File operations on server-related files
    elif tool_name in ["Edit", "MultiEdit", "Write"]:
        file_path = ""
        if tool_name == "Write":
            file_path = tool_input.get("file_path", "")
        elif tool_name in ["Edit", "MultiEdit"]:
            file_path = tool_input.get("file_path", "")
        
        if file_path:
            file_path = file_path.lower()
            server_files = [
                'server.js', 'app.js', 'main.py', 'server.py',
                'package.json', 'requirements.txt', 'pom.xml',
                '/etc/nginx', '/etc/apache2', '/etc/mysql',
                'config', '.conf', '.ini', '.yaml', '.yml'
            ]
            
            return any(sf in file_path for sf in server_files)
    
    return False

def has_docker_awareness(state):
    """Check if sufficient Docker awareness has been established"""
    
    # Must have read at least one Docker file OR run a Docker status command
    docker_files_read = len(state.get('docker_files_read', []))
    docker_commands_run = len(state.get('docker_commands_run', []))
    
    # Minimum requirements for Docker awareness
    min_requirements_met = (
        docker_files_read >= 1 or  # Read at least one Docker file
        docker_commands_run >= 1   # Run at least one Docker command
    )
    
    # Enhanced requirements for critical operations
    enhanced_requirements_met = (
        docker_files_read >= 2 and  # Read multiple Docker files
        docker_commands_run >= 1    # AND run status check
    )
    
    return min_requirements_met, enhanced_requirements_met

def get_docker_awareness_status(state):
    """Get current Docker awareness status for error messages"""
    docker_files = state.get('docker_files_read', [])
    docker_commands = state.get('docker_commands_run', [])
    
    status = []
    if docker_files:
        status.append(f"Docker files read: {', '.join(docker_files[-3:])}")  # Show last 3
    if docker_commands:
        status.append(f"Docker commands run: {', '.join(docker_commands[-3:])}")  # Show last 3
    
    return status if status else ["No Docker awareness established"]

def get_suggested_docker_commands():
    """Get suggested Docker commands to establish awareness"""
    return [
        "docker ps -a",
        "docker-compose ps", 
        "docker logs <container-name>",
        "docker inspect <container-name>",
        "systemctl status docker"
    ]

def get_suggested_docker_files():
    """Get suggested Docker files to read for awareness"""
    return [
        "docker-compose.yml",
        "Dockerfile", 
        ".env files",
        "README.md (deployment sections)",
        "Docker-related documentation"
    ]

def main():
    try:
        # Read hook input
        data = json.load(sys.stdin)
        tool_name = data.get("tool_name", "")
        tool_input = data.get("tool_input", {})
        
        # Load current session state
        state = load_session_state()
        
        # Track Docker file reads
        if tool_name == "Read":
            file_path = tool_input.get("file_path", "")
            if is_docker_file(file_path):
                if file_path not in state.get('docker_files_read', []):
                    state.setdefault('docker_files_read', []).append(file_path)
                    save_session_state(state)
                # Always allow Docker file reads
                sys.exit(0)
        
        # Track Docker command execution
        elif tool_name == "Bash":
            command = tool_input.get("command", "")
            if is_docker_command(command):
                if command not in state.get('docker_commands_run', []):
                    state.setdefault('docker_commands_run', []).append(command)
                    save_session_state(state)
                # Always allow Docker commands
                sys.exit(0)
        
        # Check if operation requires Docker awareness
        if is_server_operation(tool_name, tool_input):
            min_met, enhanced_met = has_docker_awareness(state)
            
            if not min_met:
                # Block operation - no Docker awareness
                status = get_docker_awareness_status(state)
                suggested_commands = get_suggested_docker_commands()
                suggested_files = get_suggested_docker_files()
                
                error_msg = f"""BLOCKED: Server operation requires Docker awareness first!

PROBLEM: You're attempting a server-related operation without checking Docker state.
This leads to incorrect assumptions like "server is not running" without verification.

CURRENT DOCKER AWARENESS: {'; '.join(status)}

REQUIRED BEFORE SERVER OPERATIONS:
1. Read Docker files: {', '.join(suggested_files[:3])}
2. Check Docker status: {', '.join(suggested_commands[:3])}

SUGGESTED NEXT STEPS:
1. Run: {suggested_commands[0]}
2. Read: docker-compose.yml or Dockerfile
3. Then retry your server operation

This hook prevents server assumptions without Docker verification."""
                
                print(error_msg, file=sys.stderr)
                sys.exit(2)
            
            elif not enhanced_met:
                # Allow but warn for basic awareness
                status = get_docker_awareness_status(state)
                warning_msg = f"""WARNING: Limited Docker awareness detected.
Current: {'; '.join(status)}
Consider running additional Docker status checks for complete awareness."""
                
                print(warning_msg, file=sys.stderr)
                # Allow operation to proceed
                sys.exit(0)
        
        # Allow all non-server operations
        sys.exit(0)
        
    except Exception as e:
        # Always allow on hook errors to prevent blocking everything
        print(f"Docker awareness hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()