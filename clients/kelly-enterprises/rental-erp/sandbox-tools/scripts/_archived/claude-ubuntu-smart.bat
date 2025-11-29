@echo off
echo Detecting terminal environment...

REM Try Windows Terminal first (opens in new tab if running)
where wt >nul 2>nul
if %errorlevel%==0 (
    echo Windows Terminal found - opening in tab
    wt -w 0 nt -p "Ubuntu" --title "Claude - Fire-Proof ERP Sandbox" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting Claude in SANDBOX environment...' && claude --dangerously-skip-permissions 'read /docs/claude/CLAUDE.md and supporting documents then wait for instructions' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
echo Windows Terminal not found - using WSL directly
echo.
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting Claude in SANDBOX environment...' && claude --dangerously-skip-permissions 'read docs/claude/CLAUDE.md and supporting documents then wait for instructions' && exec bash"