#!/usr/bin/env python3
"""
Task Completion Notification - Plays when Claude is done with work
Can be called manually or triggered when tasks are complete
"""

import subprocess
import time
import sys

def play_task_completion_sound():
    """Play a distinctive task completion sound"""
    try:
        # Play a sequence of beeps to indicate task completion
        sounds = [
            (800, 200),   # First beep
            (1000, 200),  # Second beep  
            (1200, 300),  # Final beep (longer)
        ]
        
        for freq, duration in sounds:
            subprocess.run([
                'powershell.exe', '-c', 
                f'[console]::beep({freq},{duration})'
            ], capture_output=True, timeout=3)
            time.sleep(0.1)  # Brief pause between beeps
        
        return True
        
    except Exception as e:
        # Fallback: Single system beep
        try:
            subprocess.run([
                'powershell.exe', '-c', 
                '[System.Media.SystemSounds]::Beep.Play()'
            ], capture_output=True, timeout=3)
            return True
        except:
            return False

def main():
    """Main function"""
    print("🎉 Claude task completion!", file=sys.stderr)
    success = play_task_completion_sound()
    
    if success:
        print("✅ Task completion sound played successfully", file=sys.stderr)
    else:
        print("❌ Failed to play completion sound", file=sys.stderr)

if __name__ == "__main__":
    main()