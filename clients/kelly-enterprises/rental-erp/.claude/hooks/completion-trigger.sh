#!/bin/bash
# Simple script to trigger task completion sound
# Usage: bash /path/to/completion-trigger.sh

echo "🔔 Triggering task completion notification..."
python3 "$(dirname "$0")/task-done.py"