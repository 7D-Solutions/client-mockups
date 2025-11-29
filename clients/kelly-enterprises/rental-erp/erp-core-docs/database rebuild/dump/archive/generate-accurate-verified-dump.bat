@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM Accurate Database Dump Generator with Verification
REM Ensures complete capture including all tables and constraints
REM ============================================================

echo ============================================================
echo    Fire-Proof ERP: Verified Complete Database Dump
echo ============================================================
echo.

REM --- Database settings ---
set "HOST=localhost"
set "PORT=3307"
set "USER=root"
set "PASSWORD=fireproof_root_sandbox"
set "DATABASE=fai_db_sandbox"

REM --- Generate timestamp ---
for /f "tokens=2 delims==." %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set "DATE_STAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%"
set "TIME_STAMP=%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%"

REM --- Output files ---
set "OUTPUT_DIR=%~dp0"
set "SQL_FILE=%OUTPUT_DIR%dump_verified_%DATE_STAMP%_%TIME_STAMP%.sql"
set "VERIFY_LOG=%OUTPUT_DIR%dump_verify_%DATE_STAMP%_%TIME_STAMP%.log"

echo Database: %DATABASE%
echo Output: dump_verified_%DATE_STAMP%_%TIME_STAMP%.sql
echo.

REM --- Find mysqldump ---
set "MYSQLDUMP="
set "MYSQL="

REM Check common locations
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" (
    set "MYSQLDUMP=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
    set "MYSQL=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
) else if exist "C:\Program Files\MySQL\MySQL Workbench 8.0 CE\mysqldump.exe" (
    set "MYSQLDUMP=C:\Program Files\MySQL\MySQL Workbench 8.0 CE\mysqldump.exe"
    set "MYSQL=C:\Program Files\MySQL\MySQL Workbench 8.0 CE\mysql.exe"
) else (
    REM Try system PATH
    where mysqldump >nul 2>&1
    if !errorlevel! equ 0 (
        set "MYSQLDUMP=mysqldump"
        set "MYSQL=mysql"
    ) else (
        echo ERROR: mysqldump not found. Please install MySQL client tools.
        pause
        exit /b 1
    )
)

echo Using: %MYSQLDUMP%
echo.

REM --- Pre-dump verification ---
echo Phase 1: Pre-dump verification
echo ==============================
echo.

REM Check table count
echo Checking table count...
"%MYSQL%" -h %HOST% -P %PORT% -u %USER% -p%PASSWORD% -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='%DATABASE%'" 2>nul > temp_count.txt
set /p EXPECTED_TABLES=<temp_count.txt
del temp_count.txt
echo Expected tables: %EXPECTED_TABLES%

REM Check for gauge_calibrations table
echo.
echo Checking for critical tables...
"%MYSQL%" -h %HOST% -P %PORT% -u %USER% -p%PASSWORD% -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='%DATABASE%' AND table_name='gauge_calibrations'" 2>nul > temp_count.txt
set /p HAS_CALIBRATIONS=<temp_count.txt
del temp_count.txt

if "%HAS_CALIBRATIONS%"=="0" (
    echo WARNING: gauge_calibrations table does NOT exist
    echo This table is referenced by foreign keys but is missing!
    echo The dump will complete but may have referential integrity issues.
) else (
    echo OK: gauge_calibrations table exists
)

REM --- Create comprehensive dump ---
echo.
echo Phase 2: Creating database dump
echo ===============================
echo.

"%MYSQLDUMP%" ^
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
  --result-file="%SQL_FILE%" ^
  %DATABASE%

if %errorlevel% neq 0 (
    echo ERROR: Dump failed!
    pause
    exit /b 1
)

REM --- Post-dump verification ---
echo.
echo Phase 3: Verifying dump integrity
echo =================================
echo.

REM Check file exists and size
if not exist "%SQL_FILE%" (
    echo ERROR: Dump file was not created!
    pause
    exit /b 1
)

for %%F in ("%SQL_FILE%") do set "FILESIZE=%%~zF"
set /a "FILESIZE_MB=%FILESIZE% / 1048576"
if %FILESIZE_MB% equ 0 set "FILESIZE_MB=<1"

echo Dump file size: %FILESIZE_MB% MB (%FILESIZE% bytes)

REM Count tables in dump
findstr /c:"CREATE TABLE" "%SQL_FILE%" | find /c /v "" > temp_count.txt
set /p DUMPED_TABLES=<temp_count.txt
del temp_count.txt

echo Tables in dump: %DUMPED_TABLES%
echo Expected tables: %EXPECTED_TABLES%

if not "%DUMPED_TABLES%"=="%EXPECTED_TABLES%" (
    echo WARNING: Table count mismatch!
    echo Expected %EXPECTED_TABLES% tables but found %DUMPED_TABLES% in dump
)

REM Check for specific problem tables
echo.
echo Checking for known problematic tables...

findstr /c:"CREATE TABLE `gauge_calibrations`" "%SQL_FILE%" >nul
if %errorlevel% equ 0 (
    echo OK: gauge_calibrations table found in dump
) else (
    echo WARNING: gauge_calibrations table NOT in dump (expected if missing from DB)
)

REM Check foreign key constraints
findstr /c:"REFERENCES `gauge_calibrations`" "%SQL_FILE%" >nul
if %errorlevel% equ 0 (
    echo WARNING: Found references to gauge_calibrations
    echo This may cause restore issues if the table doesn't exist!
)

REM --- Generate verification report ---
echo.
echo Phase 4: Generating verification report
echo ======================================
echo.

(
    echo Dump Verification Report
    echo ========================
    echo Date: %date% %time%
    echo Database: %DATABASE%
    echo Dump file: %SQL_FILE%
    echo File size: %FILESIZE_MB% MB
    echo.
    echo Table Summary:
    echo - Expected tables: %EXPECTED_TABLES%
    echo - Dumped tables: %DUMPED_TABLES%
    echo.
    echo Known Issues:
    if "%HAS_CALIBRATIONS%"=="0" (
        echo - gauge_calibrations table is MISSING from database
        echo - Foreign key references exist to this missing table
    )
    echo.
    echo Tables Found in Dump:
    findstr /c:"CREATE TABLE" "%SQL_FILE%" | findstr /o "CREATE TABLE"
) > "%VERIFY_LOG%"

REM --- Summary ---
echo.
echo ============================================================
echo                    DUMP COMPLETED
echo ============================================================
echo.
echo Output file: %SQL_FILE%
echo Verification log: %VERIFY_LOG%
echo.
echo File size: %FILESIZE_MB% MB
echo Tables dumped: %DUMPED_TABLES% of %EXPECTED_TABLES% expected
echo.

if "%HAS_CALIBRATIONS%"=="0" (
    echo !!! IMPORTANT WARNING !!!
    echo The gauge_calibrations table is missing from the database.
    echo This table is referenced by foreign keys in:
    echo - gauge_calibration_failures
    echo - gauge_calibration_schedule
    echo.
    echo The dump is complete but may fail to restore due to these
    echo missing references. Consider creating the missing table first.
    echo.
)

echo Press any key to open the verification log...
pause >nul
notepad "%VERIFY_LOG%"

exit /b 0