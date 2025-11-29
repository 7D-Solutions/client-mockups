@echo off
echo Opening Claude in Ubuntu tab...

REM Windows Terminal command breakdown:
REM -w 0: Use current window (ID 0 means most recent)
REM nt: New tab
REM -p "Ubuntu": Use Ubuntu profile
REM --title: Set tab title
REM --suppressApplicationTitle: Don't let app change the title
wt -w 0 nt -p "Ubuntu" --title "Claude - Fire-Proof ERP Sandbox" --suppressApplicationTitle bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo '🚀 Starting Claude in SANDBOX with --dangerously-skip-permissions...' && claude --dangerously-skip-permissions 'read claude/CLAUDE.md and supporting documents then wait for instructions' && exec bash"

exit