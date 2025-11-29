@echo off
REM === Simple wrapper to run the Node.js YAML generator ===
REM === Ensures the YAML file is created in this directory ===

echo Generating database YAML structure...
echo.

REM === Change to the directory where this batch file is located ===
cd /d "%~dp0"

REM === Run the Node.js script ===
node generate-database-yaml.js

echo.
pause