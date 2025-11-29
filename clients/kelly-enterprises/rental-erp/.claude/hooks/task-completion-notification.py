#!/usr/bin/env python3
"""
Task Completion Notification Hook for Claude Code
Plays a sound notification when tasks are completed

This hook triggers after tool execution to provide audio feedback
"""

import sys
import subprocess
import json
import os

def play_notification_sound():
    """Play a notification sound on Ubuntu"""
    try:
        # Try Ubuntu notification sound first
        result = subprocess.run([
            'paplay', '/usr/share/sounds/ubuntu/notifications/Mallet.ogg'
        ], capture_output=True, timeout=3)
        
        if result.returncode == 0:
            return True
            
        # Fallback to system sound
        result = subprocess.run([
            'paplay', '/usr/share/sounds/alsa/Front_Left.wav'
        ], capture_output=True, timeout=3)
        
        if result.returncode == 0:
            return True
            
        # Fallback to simple beep
        subprocess.run(['echo', '-e', '\\a'], timeout=1)
        return True
        
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        # Silent fallback - don't break Claude Code if sound fails
        return False

def main():
    """Main hook function"""
    try:
        # Get hook event info from environment
        event_type = os.environ.get('CLAUDE_HOOK_EVENT', '')
        tool_name = os.environ.get('CLAUDE_HOOK_TOOL_NAME', '')
        
        # Only play notification for tool completion events
        if event_type == 'after_tool_use':
            # Play notification sound
            play_notification_sound()
            
            # Optional: Log the completion
            # print(f"🔔 Task completed: {tool_name}", file=sys.stderr)
        
        # Always allow the operation to continue
        sys.exit(0)
        
    except Exception as e:
        # Don't block Claude Code operations if notification fails
        print(f"Notification hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()