@echo off

REM Frontend Styling Cleanup Instance - Removes hardcoded values and inline styles

REM Try Windows Terminal first (opens in new tab if running)
where wt >nul 2>nul
if %errorlevel%==0 (
    wt -w 0 nt -p "Ubuntu" --title "Frontend-Cleanup" bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && claude --dangerously-skip-permissions 'FRONTEND STYLING CLEANUP: First read CLAUDE.md to understand the project context and constraints. Navigate to frontend directory with cd frontend. Count styling violations by running these grep commands. First: hardcoded font sizes in CSS files. Second: hardcoded colors in CSS files. Third: inline styles in TSX/JSX files. Report the counts for each. Then pick ONE file with violations and fix it by replacing hardcoded values with CSS variables from FRONTEND_STYLING_STANDARDS.md. Show what you changed. Wait for further instructions.' && exec bash"
    exit
)

REM Fallback to direct WSL if Windows Terminal not available
wsl -d Ubuntu -e bash -c "cd /mnt/c/Users/7d.vision/Projects/Fire-Proof-ERP-Sandbox && claude --dangerously-skip-permissions 'FRONTEND STYLING CLEANUP: First read CLAUDE.md to understand the project context and constraints. Navigate to frontend directory with cd frontend. Count styling violations by running these grep commands. First: hardcoded font sizes in CSS files. Second: hardcoded colors in CSS files. Third: inline styles in TSX/JSX files. Report the counts for each. Then pick ONE file with violations and fix it by replacing hardcoded values with CSS variables from FRONTEND_STYLING_STANDARDS.md. Show what you changed. Wait for further instructions.' && exec bash"