@echo off
echo Compiling Dual Monitor Screenshot Tool...

REM Compile the new dual monitor script
"C:\Program Files\AutoHotkey\Compiler\Ahk2Exe.exe" /in "print-screen-dual-monitor.ahk" /out "print-screen-dual-monitor.exe"

if exist "print-screen-dual-monitor.exe" (
    echo.
    echo ✅ Successfully compiled: print-screen-dual-monitor.exe
    echo.
    echo You can now run print-screen-dual-monitor.exe
    echo.
    echo Hotkeys:
    echo   Ctrl+Shift+S - Capture active monitor
    echo   Ctrl+Shift+A - Capture all monitors
    echo   Ctrl+Shift+D - Show monitor info
) else (
    echo.
    echo ❌ Compilation failed
    echo.
    echo Try these alternatives:
    echo 1. Right-click print-screen-dual-monitor.ahk and select "Compile Script"
    echo 2. Run print-screen-dual-monitor.ahk directly with AutoHotkey v2
)

pause
