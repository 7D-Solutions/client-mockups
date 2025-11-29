@echo off
echo Checking for centralization violations...

set VIOLATIONS=0

echo.
echo Checking for raw HTML elements in modules...
findstr /S /R /C:"<button" frontend\src\modules\*.tsx | findstr /V "//" > nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Found raw button elements
    findstr /S /R /C:"<button" frontend\src\modules\*.tsx | findstr /V "//"
    set VIOLATIONS=1
)

findstr /S /R /C:"<input" frontend\src\modules\*.tsx | findstr /V "//" > nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Found raw input elements
    findstr /S /R /C:"<input" frontend\src\modules\*.tsx | findstr /V "//"
    set VIOLATIONS=1
)

findstr /S /R /C:"<textarea" frontend\src\modules\*.tsx | findstr /V "//" > nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Found raw textarea elements
    set VIOLATIONS=1
)

echo.
echo Checking for direct fetch calls...
findstr /S /R /C:"fetch(" frontend\src\modules\*.ts frontend\src\modules\*.tsx | findstr /V "refetch" | findstr /V "//" > nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Found direct fetch calls
    findstr /S /R /C:"fetch(" frontend\src\modules\*.ts frontend\src\modules\*.tsx | findstr /V "refetch" | findstr /V "//"
    set VIOLATIONS=1
)

echo.
echo Checking for window dialogs...
findstr /S /R /C:"window\.confirm\|window\.alert\|window\.prompt" frontend\src\modules\*.tsx > nul 2>&1
if %errorlevel% equ 0 (
    echo ❌ Found window dialog calls
    set VIOLATIONS=1
)

echo.
if %VIOLATIONS% equ 1 (
    echo ❌ Centralization violations found!
    exit /b 1
) else (
    echo ✅ No centralization violations found
    exit /b 0
)