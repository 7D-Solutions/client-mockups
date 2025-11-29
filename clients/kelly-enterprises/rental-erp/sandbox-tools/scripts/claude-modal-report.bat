@echo off

REM Modal Migration Report - Shows current modal migration status and violations

REM Try Windows Terminal first (opens in new tab if running)
where wt >nul 2>nul
if %errorlevel%==0 (
    wt -w 0 nt -p "Ubuntu" --title "Modal-Report" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && claude --dangerously-skip-permissions 'MODAL MIGRATION REPORT: First read CLAUDE.md to understand the project context and constraints. Navigate to the frontend directory and run: cd frontend && npm run modal:migration-report. Then provide a simple summary showing: 1) Total modals found, 2) How many are fully migrated, partially migrated, and need migration, 3) List the files that need attention (focus on files in src/components first), 4) Total violations count. Keep it simple and direct. No need to search for files manually - just run the command and summarize the output.' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && claude --dangerously-skip-permissions 'MODAL MIGRATION REPORT: First read CLAUDE.md to understand the project context and constraints. Navigate to the frontend directory and run: cd frontend && npm run modal:migration-report. Then provide a simple summary showing: 1) Total modals found, 2) How many are fully migrated, partially migrated, and need migration, 3) List the files that need attention (focus on files in src/components first), 4) Total violations count. Keep it simple and direct. No need to search for files manually - just run the command and summarize the output.' && exec bash"