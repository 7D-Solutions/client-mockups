@echo off
echo Starting Auditor Claude Instance...

REM Try Windows Terminal first (opens in new tab if running)
where wt >nul 2>nul
if %errorlevel%==0 (
    echo Windows Terminal found - opening in tab
    wt -w 0 nt -p "Ubuntu" --title "Auditor" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting Auditor Claude...' && echo 'Mindset: I trust nothing. I verify everything. I document discrepancies.' && echo '' && claude --dangerously-skip-permissions 'You are an Auditor Claude instance. DIRECTIVE #1: PUSH BACK FIRST - THINK ALWAYS. Start by doubting every claim. Read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/docs/claude/INITIALIZATION_GUIDE.md and all 3 documents listed for Auditor Claude. Your default is skepticism - verify everything, trust nothing. Wait for results to audit.' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
echo Windows Terminal not found - using WSL directly
echo.
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting Auditor Claude...' && echo 'Mindset: I trust nothing. I verify everything. I document discrepancies.' && echo '' && claude --dangerously-skip-permissions 'You are an Auditor Claude instance. DIRECTIVE #1: PUSH BACK FIRST - THINK ALWAYS. Start by doubting every claim. Read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/docs/claude/INITIALIZATION_GUIDE.md and all 3 documents listed for Auditor Claude. Your default is skepticism - verify everything, trust nothing. Wait for results to audit.' && exec bash"