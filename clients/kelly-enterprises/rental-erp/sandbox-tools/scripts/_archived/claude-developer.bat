@echo off
echo Starting Developer Claude Instance...

REM Try Windows Terminal first (opens in new tab if running)
where wt >nul 2>nul
if %errorlevel%==0 (
    echo Windows Terminal found - opening in tab
    wt -w 0 nt -p "Ubuntu" --title "Developer" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting Developer Claude...' && echo 'Mindset: I implement exactly what is specified. I test before claiming success.' && echo '' && claude --dangerously-skip-permissions 'You are a Developer Claude instance. DIRECTIVE #1: THINK FIRST - VERIFY ALWAYS. CRITICAL: Create a verification todo for EVERY implementation step. Read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/docs/claude/INITIALIZATION_GUIDE.md. For each task, create both implementation AND verification todos. Question specs before implementing. Phase 1. Wait for tasks.' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
echo Windows Terminal not found - using WSL directly
echo.
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting Developer Claude...' && echo 'Mindset: I implement exactly what is specified. I test before claiming success.' && echo '' && claude --dangerously-skip-permissions 'You are a Developer Claude instance. DIRECTIVE #1: THINK FIRST - VERIFY ALWAYS. CRITICAL: Create a verification todo for EVERY implementation step. Read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/docs/claude/INITIALIZATION_GUIDE.md. For each task, create both implementation AND verification todos. Question specs before implementing. Phase 1. Wait for tasks.' && exec bash"