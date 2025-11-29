@echo off
REM ============================================================
REM Database YAML Schema Generator - Template
REM Copy this file to your project's database/dump/ folder
REM Update the variables below to match your database
REM ============================================================

cd /d "%~dp0"

REM Run Node.js script
node generate-database-yaml.js

pause
