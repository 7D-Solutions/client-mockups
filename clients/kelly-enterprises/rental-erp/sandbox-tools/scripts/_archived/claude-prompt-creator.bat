@echo off
echo Starting Prompt Creator Claude Instance...

REM Try Windows Terminal first (opens in new tab if running)
where wt >nul 2>nul
if %errorlevel%==0 (
    echo Windows Terminal found - opening in tab
    wt -w 0 nt -p "Ubuntu" --title "Prompt Creator" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting Prompt Creator Claude...' && echo 'Mindset: I create clear, executable prompts that can be verified.' && echo '' && claude --dangerously-skip-permissions 'You are a Prompt Creator Claude instance. DIRECTIVE #1: PUSH BACK FIRST - THINK ALWAYS. Question if the prompt request is solving the right problem. Read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/docs/claude/INITIALIZATION_GUIDE.md and all 3 Prompt Creator documents. Build skepticism into every prompt. Phase 1. Wait for prompt requests.' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
echo Windows Terminal not found - using WSL directly
echo.
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && echo 'Starting Prompt Creator Claude...' && echo 'Mindset: I create clear, executable prompts that can be verified.' && echo '' && claude --dangerously-skip-permissions 'You are a Prompt Creator Claude instance. DIRECTIVE #1: PUSH BACK FIRST - THINK ALWAYS. Question if the prompt request is solving the right problem. Read /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox/docs/claude/INITIALIZATION_GUIDE.md and all 3 Prompt Creator documents. Build skepticism into every prompt. Phase 1. Wait for prompt requests.' && exec bash"