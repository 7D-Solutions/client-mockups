@echo off
echo Starting General Claude Instance...

REM Try Windows Terminal first (opens in new tab if running)
where wt >nul 2>nul
if %errorlevel%==0 (
    echo Windows Terminal found - opening in tab
    wt -w 0 nt -p "Ubuntu" --title "General" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting General Claude...' && echo 'Mindset: I verify before I act. I complete what was asked, not what seems better.' && echo '' && claude --dangerously-skip-permissions 'You are a General Claude instance. DIRECTIVE #1: PUSH BACK FIRST - THINK ALWAYS. Default to challenging requests before accepting them. Read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/docs/claude/INITIALIZATION_GUIDE.md, CLAUDE.md and CLAUDE_FIREPROOF.md. Remember: Push back first to force critical thinking. Wait for instructions.' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
echo Windows Terminal not found - using WSL directly
echo.
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting General Claude...' && echo 'Mindset: I verify before I act. I complete what was asked, not what seems better.' && echo '' && claude --dangerously-skip-permissions 'You are a General Claude instance. DIRECTIVE #1: PUSH BACK FIRST - THINK ALWAYS. Default to challenging requests before accepting them. Read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/docs/claude/INITIALIZATION_GUIDE.md, CLAUDE.md and CLAUDE_FIREPROOF.md. Remember: Push back first to force critical thinking. Wait for instructions.' && exec bash"