@echo off

REM Modal Quality Check - Deep analysis of modal migration quality beyond surface-level checks

REM Try Windows Terminal first (opens in new tab if running)
where wt >nul 2>nul
if %errorlevel%==0 (
    wt -w 0 nt -p "Ubuntu" --title "Modal-Quality-Check" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && claude --dangerously-skip-permissions 'MODAL QUALITY CHECK: First read CLAUDE.md to understand the project context and constraints. Then read and execute the quality check guide at sandbox-tools/scripts/modal-quality-check-guide.md. Follow all steps in the guide to verify the quality of fully migrated modals beyond just CSS removal. Show results directly in terminal - do not create any files or documentation.' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && claude --dangerously-skip-permissions 'MODAL QUALITY CHECK: First read CLAUDE.md to understand the project context and constraints. Then read and execute the quality check guide at sandbox-tools/scripts/modal-quality-check-guide.md. Follow all steps in the guide to verify the quality of fully migrated modals beyond just CSS removal. Show results directly in terminal - do not create any files or documentation.' && exec bash"