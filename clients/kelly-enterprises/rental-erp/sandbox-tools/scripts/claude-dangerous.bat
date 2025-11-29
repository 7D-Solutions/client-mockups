@echo off
REM Launch Claude in current window with new Ubuntu tab

REM Try Windows Terminal first (opens in current window)
where wt >nul 2>nul
if %errorlevel%==0 (
    wt -w 0 nt -p "Ubuntu" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && claude --dangerously-skip-permissions 'Please read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/CLAUDE.md for project context.' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && claude --dangerously-skip-permissions 'Please read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/CLAUDE.md for project context.' && exec bash"