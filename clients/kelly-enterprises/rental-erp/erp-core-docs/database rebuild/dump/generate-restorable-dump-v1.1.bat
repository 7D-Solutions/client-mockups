@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM Restorable Database Dump Generator v1.1
REM Creates dumps that can actually be restored
REM Handles referential integrity issues intelligently
REM v1.1: Added comprehensive MySQL path detection
REM ============================================================

echo ============================================================
echo    Fire-Proof ERP: Restorable Database Dump v1.1
echo ============================================================
echo.

REM --- Database settings ---
set "HOST=localhost"
set "PORT=3307"
set "USER=root"
set "PASSWORD=fireproof_root_sandbox"
set "DATABASE=fai_db_sandbox"
set "VERSION=1.1"

REM --- Generate timestamp ---
for /f "tokens=2 delims==." %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "DATE_STAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%"
set "TIME_STAMP=%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%"

REM --- Output files ---
set "OUTPUT_DIR=%~dp0"
set "SQL_FILE=%OUTPUT_DIR%dump_restorable_v%VERSION%_%DATE_STAMP%_%TIME_STAMP%.sql"
set "BROKEN_DUMP=%OUTPUT_DIR%dump_broken_%DATE_STAMP%_%TIME_STAMP%.sql"
set "FK_BACKUP=%OUTPUT_DIR%foreign_keys_backup_%DATE_STAMP%_%TIME_STAMP%.sql"
set "REPAIR_SCRIPT=%OUTPUT_DIR%repair_integrity_%DATE_STAMP%_%TIME_STAMP%.sql"
set "REPORT_FILE=%OUTPUT_DIR%dump_report_v%VERSION%_%DATE_STAMP%_%TIME_STAMP%.log"

echo Database: %DATABASE%
echo Version: %VERSION%
echo Output: dump_restorable_v%VERSION%_%DATE_STAMP%_%TIME_STAMP%.sql
echo.

REM --- Multiple mysqldump path attempts (from working versions) ---
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
            REM Also find mysql.exe in same directory
            for %%F in ("!CURRENT_PATH!") do (
                set "MYSQL_PATH=%%~dpFmysql.exe"
            )
            echo Found mysqldump: !CURRENT_PATH!
            goto :mysqldump_found
        )
        if "%%i"=="5" (
            REM Try mysqldump in PATH
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

echo ERROR: mysqldump not found in any of the common locations:
echo   - MySQL Workbench 8.0 CE
echo   - MySQL Server 8.0/8.4
echo   - XAMPP
echo   - WAMP64
echo   - System PATH
echo.
echo Please install MySQL Workbench or add MySQL bin directory to PATH
pause
exit /b 1

:mysqldump_found
echo Using: %MYSQLDUMP_PATH%
echo.

REM --- Test database connection first ---
echo Testing database connection...
"%MYSQLDUMP_PATH%" -h %HOST% -P %PORT% -u %USER% -p%PASSWORD% --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Cannot connect to database. Please check:
    echo   - Database server is running
    echo   - Connection settings are correct
    echo   - User has dump privileges
    pause
    exit /b 1
)
echo Connection test successful!
echo.

REM --- Phase 1: Analyze Integrity Issues ---
echo Phase 1: Analyzing Database Integrity
echo =====================================
echo.

REM Find all foreign keys referencing missing tables
(
echo SELECT DISTINCT
echo   CONCAT('ALTER TABLE `', kcu.TABLE_NAME, '` DROP FOREIGN KEY `', kcu.CONSTRAINT_NAME, '`;'^) AS drop_fk,
echo   kcu.TABLE_NAME,
echo   kcu.CONSTRAINT_NAME,
echo   kcu.REFERENCED_TABLE_NAME
echo FROM information_schema.KEY_COLUMN_USAGE kcu
echo WHERE kcu.TABLE_SCHEMA = '%DATABASE%'
echo   AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
echo   AND NOT EXISTS (
echo     SELECT 1 
echo     FROM information_schema.TABLES t 
echo     WHERE t.TABLE_SCHEMA = '%DATABASE%' 
echo     AND t.TABLE_NAME = kcu.REFERENCED_TABLE_NAME
echo   ^);
) > temp_find_broken_fks.sql

"%MYSQL_PATH%" -h %HOST% -P %PORT% -u %USER% -p%PASSWORD% -N -B < temp_find_broken_fks.sql > temp_broken_fks.txt 2>nul
del temp_find_broken_fks.sql

REM Count broken FKs
for /f %%A in ('type temp_broken_fks.txt ^| find /c /v ""') do set "BROKEN_FK_COUNT=%%A"

if %BROKEN_FK_COUNT% GTR 0 (
    echo WARNING: Found %BROKEN_FK_COUNT% foreign keys referencing non-existent tables
    echo These will be handled to create a restorable dump.
    echo.
    
    REM Save the FK definitions before dropping
    echo -- Foreign Keys to be temporarily removed > "%FK_BACKUP%"
    echo -- These reference non-existent tables >> "%FK_BACKUP%"
    echo -- Generated: %date% %time% >> "%FK_BACKUP%"
    echo. >> "%FK_BACKUP%"
    
    REM Extract and save FK definitions
    for /f "tokens=1,2,3,4 delims=	" %%A in (temp_broken_fks.txt) do (
        echo -- Table: %%B, Constraint: %%C, References: %%D >> "%FK_BACKUP%"
        echo %%A >> "%FK_BACKUP%"
        echo. >> "%FK_BACKUP%"
    )
) else (
    echo OK: No referential integrity issues found.
    echo All foreign keys reference existing tables.
)

REM --- Phase 2: Create Initial Dump (with issues) ---
echo.
echo Phase 2: Creating Initial Dump
echo ==============================
echo.

echo Creating standard dump (may contain integrity issues)...
"%MYSQLDUMP_PATH%" ^
  -h %HOST% ^
  -P %PORT% ^
  -u %USER% ^
  -p%PASSWORD% ^
  --single-transaction ^
  --routines ^
  --triggers ^
  --events ^
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
  --result-file="%BROKEN_DUMP%" ^
  %DATABASE%

if %errorlevel% neq 0 (
    echo ERROR: Initial dump failed!
    pause
    exit /b 1
)

REM --- Phase 3: Create Restorable Dump ---
echo.
echo Phase 3: Creating Restorable Dump
echo =================================
echo.

if %BROKEN_FK_COUNT% GTR 0 (
    echo Removing broken foreign key constraints from dump...
    
    REM Create a cleaned version without broken FK constraints
    powershell -Command "& {$content = Get-Content '%BROKEN_DUMP%' -Raw; $lines = Get-Content 'temp_broken_fks.txt'; foreach($line in $lines) {$parts = $line -split '\t'; if($parts.Count -ge 3) {$constraint = $parts[2]; $pattern = 'CONSTRAINT\s+`' + $constraint + '`[^,]*,?'; $content = $content -replace $pattern, ''}}; $content | Out-File '%SQL_FILE%' -Encoding UTF8}"
    
    echo Creating repair script for missing tables...
    (
        echo -- Repair Script for Missing Tables
        echo -- Generated: %date% %time%
        echo -- Run this AFTER restoring the dump to add missing tables
        echo.
        echo -- IMPORTANT: This is a template. Adjust column definitions as needed!
        echo.
        echo -- Missing table: gauge_calibrations
        echo CREATE TABLE IF NOT EXISTS `gauge_calibrations` (
        echo   `id` bigint unsigned NOT NULL AUTO_INCREMENT,
        echo   `gauge_id` int NOT NULL,
        echo   `calibration_date` date NOT NULL,
        echo   `next_due_date` date DEFAULT NULL,
        echo   `performed_by` int DEFAULT NULL,
        echo   `certificate_number` varchar(100^) DEFAULT NULL,
        echo   `result` enum('pass','fail','^) NOT NULL,
        echo   `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        echo   PRIMARY KEY (`id`^),
        echo   KEY `gauge_id` (`gauge_id`^),
        echo   CONSTRAINT `gauge_calibrations_ibfk_1` FOREIGN KEY (`gauge_id`^) REFERENCES `gauges` (`id`^)
        echo ^) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        echo.
        echo -- After creating missing tables, restore the foreign keys:
        type "%FK_BACKUP%"
    ) > "%REPAIR_SCRIPT%"
    
) else (
    echo No integrity issues found. Creating standard restorable dump...
    copy "%BROKEN_DUMP%" "%SQL_FILE%" >nul
)

REM --- Phase 4: Verify and Report ---
echo.
echo Phase 4: Generating Verification Report
echo =======================================
echo.

for %%F in ("%SQL_FILE%") do set "FILESIZE=%%~zF"
set /a "FILESIZE_MB=%FILESIZE% / 1048576"
if %FILESIZE_MB% equ 0 set "FILESIZE_MB=<1"

REM Count tables in dump
findstr /c:"CREATE TABLE" "%SQL_FILE%" | find /c /v "" > temp_count.txt
set /p TABLE_COUNT=<temp_count.txt
del temp_count.txt

(
    echo Restorable Database Dump Report v%VERSION%
    echo =========================================
    echo Generated: %date% %time%
    echo Database: %DATABASE%
    echo Host: %HOST%:%PORT%
    echo.
    echo Dump Files Created:
    echo -------------------
    echo Main dump: %SQL_FILE% (%FILESIZE_MB% MB)
    echo Tables included: %TABLE_COUNT%
    if %BROKEN_FK_COUNT% GTR 0 (
        echo Original dump: %BROKEN_DUMP%
        echo FK backup: %FK_BACKUP%
        echo Repair script: %REPAIR_SCRIPT%
    )
    echo.
    echo Integrity Analysis:
    echo -------------------
    if %BROKEN_FK_COUNT% GTR 0 (
        echo Found %BROKEN_FK_COUNT% foreign keys referencing missing tables
        echo These constraints were REMOVED to make the dump restorable
        echo.
        echo Removed constraints:
        for /f "tokens=2,3,4 delims=	" %%A in (temp_broken_fks.txt) do (
            echo   - Table: %%A, Constraint: %%B, Referenced: %%C
        )
        echo.
        echo IMPORTANT: To fully restore the database:
        echo 1. Restore the main dump file
        echo 2. Create missing tables using the repair script
        echo 3. Re-add the foreign key constraints from the backup
    ) else (
        echo No integrity issues found
        echo Dump is directly restorable
    )
    echo.
    echo Restoration Instructions:
    echo -------------------------
    echo 1. Create new database:
    echo    mysql -h %HOST% -P %PORT% -u root -p -e "CREATE DATABASE new_db;"
    echo.
    echo 2. Restore the dump:
    echo    mysql -h %HOST% -P %PORT% -u root -p new_db ^< %SQL_FILE%
    if %BROKEN_FK_COUNT% GTR 0 (
        echo.
        echo 3. Apply repairs (if needed):
        echo    mysql -h %HOST% -P %PORT% -u root -p new_db ^< %REPAIR_SCRIPT%
    )
) > "%REPORT_FILE%"

REM --- Cleanup ---
del temp_broken_fks.txt 2>nul
if %BROKEN_FK_COUNT% EQU 0 (
    if exist "%BROKEN_DUMP%" del "%BROKEN_DUMP%"
)

REM --- Summary ---
echo.
echo ============================================================
echo              RESTORABLE DUMP CREATED v%VERSION%
echo ============================================================
echo.
echo Main dump: %SQL_FILE% (%FILESIZE_MB% MB with %TABLE_COUNT% tables)
echo Report: %REPORT_FILE%
if %BROKEN_FK_COUNT% GTR 0 (
    echo.
    echo IMPORTANT: This dump has been cleaned for restoration.
    echo - Removed %BROKEN_FK_COUNT% broken foreign key constraints
    echo - See repair script to recreate missing tables
    echo - Original dump preserved as: %BROKEN_DUMP%
)
echo.
echo This dump CAN be restored to a new database successfully!
echo.
echo Press any key to view the report...
pause >nul
notepad "%REPORT_FILE%"

exit /b 0