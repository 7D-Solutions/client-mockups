@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM Database Restorable Dump - Template
REM Copy this file to your project's database/dump/ folder
REM Update the variables below to match your database
REM ============================================================

echo ============================================================
echo    Database Dump Tool
echo ============================================================
echo.

REM ============================================================
REM CONFIGURATION - UPDATE THESE VALUES FOR YOUR PROJECT
REM ============================================================
set "HOST=localhost"
set "PORT=3307"
set "USER=root"
set "PASSWORD=your_password_here"
set "DATABASE=your_database_here"
set "TABLE_PREFIX=your_module_"
set "MODULE_NAME=Your Module"
set "VERSION=1.0"

REM --- Generate timestamp ---
for /f "tokens=2 delims==." %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "DATE_STAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%"
set "TIME_STAMP=%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%"

REM --- Output files ---
set "OUTPUT_DIR=%~dp0"
set "SQL_FILE=%OUTPUT_DIR%%TABLE_PREFIX:~0,-1%_dump_%DATE_STAMP%_%TIME_STAMP%.sql"
set "REPORT_FILE=%OUTPUT_DIR%%TABLE_PREFIX:~0,-1%_dump_report_%DATE_STAMP%_%TIME_STAMP%.log"

echo Database: %DATABASE%
echo Filter: %TABLE_PREFIX%* tables only
echo Output: %TABLE_PREFIX:~0,-1%_dump_%DATE_STAMP%_%TIME_STAMP%.sql
echo.

REM --- Find mysqldump ---
set "MYSQLDUMP_PATH="
set "MYSQL_PATH="
set "PATHS[0]=C:\Program Files\MySQL\MySQL Workbench 8.0 CE\mysqldump.exe"
set "PATHS[1]=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
set "PATHS[2]=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe"
set "PATHS[3]=C:\xampp\mysql\bin\mysqldump.exe"
set "PATHS[4]=C:\wamp64\bin\mysql\mysql8.0.31\bin\mysqldump.exe"
set "PATHS[5]=mysqldump.exe"

echo Searching for MySQL tools...

for /L %%i in (0,1,5) do (
    if defined PATHS[%%i] (
        call set "CURRENT_PATH=%%PATHS[%%i]%%"
        if exist "!CURRENT_PATH!" (
            set "MYSQLDUMP_PATH=!CURRENT_PATH!"
            for %%F in ("!CURRENT_PATH!") do (
                set "MYSQL_PATH=%%~dpFmysql.exe"
            )
            echo Found mysqldump: !CURRENT_PATH!
            goto :mysqldump_found
        )
        if "%%i"=="5" (
            where mysqldump >nul 2>&1
            if !errorlevel! equ 0 (
                set "MYSQLDUMP_PATH=mysqldump"
                set "MYSQL_PATH=mysql"
                echo Found mysqldump in system PATH
                goto :mysqldump_found
            )
        )
    )
)

echo ERROR: mysqldump not found
echo Please install MySQL Workbench or add MySQL bin directory to PATH
pause
exit /b 1

:mysqldump_found
echo Using: %MYSQLDUMP_PATH%
echo.

REM --- Test database connection ---
echo Testing database connection...
"%MYSQLDUMP_PATH%" -h %HOST% -P %PORT% -u %USER% -p%PASSWORD% --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Cannot connect to database
    pause
    exit /b 1
)
echo Connection successful!
echo.

REM --- Get list of tables matching prefix ---
echo Finding %TABLE_PREFIX%* tables...
(
echo SELECT table_name
echo FROM information_schema.tables
echo WHERE table_schema = '%DATABASE%'
echo   AND table_type = 'BASE TABLE'
echo   AND table_name LIKE '%TABLE_PREFIX%%%'
echo ORDER BY table_name;
) > temp_find_tables.sql

"%MYSQL_PATH%" -h %HOST% -P %PORT% -u %USER% -p%PASSWORD% -N -B < temp_find_tables.sql > temp_tables.txt 2>nul
del temp_find_tables.sql

REM Convert to space-separated list
set "MODULE_TABLES="
for /f %%T in (temp_tables.txt) do (
    if not defined MODULE_TABLES (
        set "MODULE_TABLES=%%T"
    ) else (
        set "MODULE_TABLES=!MODULE_TABLES! %%T"
    )
)

REM Count tables
for /f %%A in ('type temp_tables.txt ^| find /c /v ""') do set "TABLE_COUNT=%%A"

if %TABLE_COUNT% EQU 0 (
    echo WARNING: No %TABLE_PREFIX%* tables found in database!
    echo Tables may not have been created yet.
    echo Run the migration script first.
    del temp_tables.txt
    pause
    exit /b 1
)

echo Found %TABLE_COUNT% tables
echo.

REM --- Create dump ---
echo Creating dump of %MODULE_NAME% tables...
"%MYSQLDUMP_PATH%" ^
  -h %HOST% ^
  -P %PORT% ^
  -u %USER% ^
  -p%PASSWORD% ^
  --single-transaction ^
  --routines=FALSE ^
  --triggers ^
  --add-drop-table ^
  --complete-insert ^
  --extended-insert ^
  --order-by-primary ^
  --hex-blob ^
  --set-charset ^
  --comments ^
  --dump-date ^
  --lock-tables=false ^
  --column-statistics=0 ^
  --result-file="%SQL_FILE%" ^
  %DATABASE% %MODULE_TABLES%

if %errorlevel% neq 0 (
    echo ERROR: Dump failed!
    del temp_tables.txt
    pause
    exit /b 1
)

REM --- Generate report ---
for %%F in ("%SQL_FILE%") do set "FILESIZE=%%~zF"
set /a "FILESIZE_MB=%FILESIZE% / 1048576"
if %FILESIZE_MB% equ 0 set "FILESIZE_MB=<1"

(
    echo %MODULE_NAME% Database Dump Report
    echo ==========================================
    echo Generated: %date% %time%
    echo Database: %DATABASE%
    echo Filter: %TABLE_PREFIX%* tables only
    echo.
    echo Dump File:
    echo ----------
    echo File: %TABLE_PREFIX:~0,-1%_dump_%DATE_STAMP%_%TIME_STAMP%.sql
    echo Size: %FILESIZE_MB% MB
    echo Tables: %TABLE_COUNT%
    echo.
    echo Tables Included:
    echo ----------------
    type temp_tables.txt
    echo.
    echo Restoration Instructions:
    echo -------------------------
    echo 1. Create new database (if needed):
    echo    mysql -h %HOST% -P %PORT% -u root -p -e "CREATE DATABASE new_db;"
    echo.
    echo 2. Restore the tables:
    echo    mysql -h %HOST% -P %PORT% -u root -p new_db ^< %TABLE_PREFIX:~0,-1%_dump_%DATE_STAMP%_%TIME_STAMP%.sql
    echo.
    echo NOTE: This dump contains ONLY %TABLE_PREFIX%* tables.
    echo      User authentication tables are separate.
) > "%REPORT_FILE%"

REM --- Cleanup ---
del temp_tables.txt

REM --- Summary ---
echo.
echo ============================================================
echo              DATABASE DUMP CREATED
echo ============================================================
echo.
echo Dump file: %TABLE_PREFIX:~0,-1%_dump_%DATE_STAMP%_%TIME_STAMP%.sql (%FILESIZE_MB% MB)
echo Tables: %TABLE_COUNT%
echo Report: %TABLE_PREFIX:~0,-1%_dump_report_%DATE_STAMP%_%TIME_STAMP%.log
echo.
echo This dump contains ONLY %TABLE_PREFIX%* tables and can be restored
echo to any database with the same schema structure.
echo.
echo Press any key to view the report...
pause >nul
notepad "%REPORT_FILE%"

exit /b 0
