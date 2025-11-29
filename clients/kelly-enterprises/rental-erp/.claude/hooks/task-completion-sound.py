#!/usr/bin/env python3
"""
Task Completion Sound Hook for Claude Code (WSL/Ubuntu)
Plays a system sound when tasks are completed using PowerShell
Enhanced version with better debugging and multiple sound methods
"""

import sys
import subprocess
import json
import os
import time

def log_debug(message):
    """Log debug messages to a file for troubleshooting"""
    try:
        with open("/tmp/claude-hook-debug.log", "a") as f:
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"[{timestamp}] {message}\n")
            f.flush()
    except:
        pass

def play_completion_sound():
    """Play a completion sound using multiple methods (WSL optimized)"""
    sound_played = False
    
    # Method 1: PowerShell System.Media.SystemSounds
    try:
        log_debug("Attempting PowerShell SystemSounds beep...")
        result = subprocess.run([
            'powershell.exe', '-c', 
            '[System.Media.SystemSounds]::Beep.Play()'
        ], capture_output=True, timeout=3)
        
        if result.returncode == 0:
            log_debug("SystemSounds beep succeeded")
            sound_played = True
        else:
            log_debug(f"SystemSounds beep failed: {result.stderr.decode()}")
    except Exception as e:
        log_debug(f"SystemSounds beep exception: {e}")
    
    # Method 2: PowerShell console beep with custom frequency
    if not sound_played:
        try:
            log_debug("Attempting PowerShell console beep...")
            result = subprocess.run([
                'powershell.exe', '-c', 
                '[console]::beep(1000,300)'
            ], capture_output=True, timeout=3)
            
            if result.returncode == 0:
                log_debug("Console beep succeeded")
                sound_played = True
            else:
                log_debug(f"Console beep failed: {result.stderr.decode()}")
        except Exception as e:
            log_debug(f"Console beep exception: {e}")
    
    # Method 3: Windows MessageBeep
    if not sound_played:
        try:
            log_debug("Attempting Windows MessageBeep...")
            result = subprocess.run([
                'powershell.exe', '-c', 
                'rundll32 user32.dll,MessageBeep 0'
            ], capture_output=True, timeout=3)
            
            if result.returncode == 0:
                log_debug("MessageBeep succeeded")
                sound_played = True
            else:
                log_debug(f"MessageBeep failed: {result.stderr.decode()}")
        except Exception as e:
            log_debug(f"MessageBeep exception: {e}")
    
    # Method 4: Terminal bell fallback
    if not sound_played:
        try:
            log_debug("Attempting terminal bell fallback...")
            subprocess.run(['printf', '\\a'], timeout=1)
            sound_played = True
            log_debug("Terminal bell completed")
        except Exception as e:
            log_debug(f"Terminal bell exception: {e}")
    
    return sound_played

def main():
    """Main hook function - runs after tool completion"""
    try:
        log_debug("Hook triggered - starting execution")
        
        # Read JSON input from Claude Code
        if sys.stdin.isatty():
            log_debug("No stdin data available")
            # Test mode - no JSON input
            data = {"tool_name": "TEST", "tool_input": {}}
        else:
            data = json.load(sys.stdin)
        
        tool_name = data.get("tool_name", "Unknown")
        tool_input = data.get("tool_input", {})
        
        log_debug(f"Processing tool: {tool_name}")
        
        # Play sound for all completed tools
        # You can customize this to only play for specific tools:
        # if tool_name in ["Bash", "Write", "Edit", "TodoWrite"]:
        success = play_completion_sound()
        
        # Print completion message to stderr
        print(f"🔔 {tool_name} completed! (Sound: {'✅' if success else '❌'})", file=sys.stderr)
        log_debug(f"Hook completed for {tool_name}, sound success: {success}")
        
        # Always allow the operation to continue
        sys.exit(0)
        
    except Exception as e:
        log_debug(f"Hook exception: {e}")
        # Don't block Claude Code operations if notification fails
        sys.exit(0)

if __name__ == "__main__":
    main()