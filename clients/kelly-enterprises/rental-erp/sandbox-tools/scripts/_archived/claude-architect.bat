@echo off
echo Starting Architect Claude Instance...

REM Try Windows Terminal first (opens in new tab if running)
where wt >nul 2>nul
if %errorlevel%==0 (
    echo Windows Terminal found - opening in tab
    wt -w 0 nt -p "Ubuntu" --title "Architect" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting Architect Claude...' && echo 'Mindset: I think strategically about long-term system design and quality.' && echo '' && claude --dangerously-skip-permissions 'You are an Architect Claude instance. DIRECTIVE #1: PUSH BACK FIRST - THINK ALWAYS. Challenge every architectural decision by default. Read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/docs/claude/INITIALIZATION_GUIDE.md and all 5 documents listed for Architect Claude. Remember: Start with skepticism about any proposed architecture. Wait for design tasks.' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
echo Windows Terminal not found - using WSL directly
echo.
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting Architect Claude...' && echo 'Mindset: I think strategically about long-term system design and quality.' && echo '' && claude --dangerously-skip-permissions 'You are an Architect Claude instance. DIRECTIVE #1: PUSH BACK FIRST - THINK ALWAYS. Challenge every architectural decision by default. Read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/docs/claude/INITIALIZATION_GUIDE.md and all 5 documents listed for Architect Claude. Remember: Start with skepticism about any proposed architecture. Wait for design tasks.' && exec bash"