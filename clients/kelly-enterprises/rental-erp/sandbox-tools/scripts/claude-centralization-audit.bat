@echo off

REM Centralization Audit - Quick check for violations without making changes

REM Try Windows Terminal first (opens in new tab if running)
where wt >nul 2>nul
if %errorlevel%==0 (
    wt -w 0 nt -p "Ubuntu" --title "Centralization-Audit" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && claude --dangerously-skip-permissions 'CENTRALIZATION AUDIT: First read CLAUDE.md to understand the centralized UI requirements. Then perform a comprehensive audit of frontend/src/modules: 1) Count raw HTML elements (<button>, <input>, <textarea>, <select>) that should use infrastructure components. 2) Count direct fetch() calls that should use apiClient. 3) Count window.confirm/alert/prompt that should use Modal. 4) Check if modules properly import from infrastructure/components. Report findings with file names and line numbers. Summarize compliance percentage. DO NOT make any changes - audit only.' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && claude --dangerously-skip-permissions 'CENTRALIZATION AUDIT: First read CLAUDE.md to understand the centralized UI requirements. Then perform a comprehensive audit of frontend/src/modules: 1) Count raw HTML elements (<button>, <input>, <textarea>, <select>) that should use infrastructure components. 2) Count direct fetch() calls that should use apiClient. 3) Count window.confirm/alert/prompt that should use Modal. 4) Check if modules properly import from infrastructure/components. Report findings with file names and line numbers. Summarize compliance percentage. DO NOT make any changes - audit only.' && exec bash"