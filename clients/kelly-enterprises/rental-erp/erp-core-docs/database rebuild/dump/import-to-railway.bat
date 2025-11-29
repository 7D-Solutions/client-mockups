@echo off
setlocal enabledelayedexpansion

REM Log all output to file
set "LOGFILE=%~dp0import-log-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt"
set "LOGFILE=%LOGFILE: =0%"
echo Logging to: %LOGFILE%
echo. > "%LOGFILE%"

REM ============================================================
REM Railway MySQL Import Script
REM Imports local dump to Railway MySQL production database
REM ============================================================

echo ============================================================
echo    Fire-Proof ERP: Railway MySQL Import
echo ============================================================
echo.

REM --- Railway MySQL Connection Settings ---
set "RAILWAY_HOST=switchback.proxy.rlwy.net"
set "RAILWAY_PORT=43662"
set "RAILWAY_USER=root"
set "RAILWAY_PASSWORD=NekYZstfJYFngSFHfCcfQUZnZjYqcAUU"
set "RAILWAY_DATABASE=fai_db_sandbox"

REM --- Find the most recent restorable dump file ---
set "DUMP_DIR=%~dp0"
set "DUMP_FILE="

echo Searching for restorable dump files...
for /f "delims=" %%F in ('dir /b /o-d "%DUMP_DIR%dump_restorable_*.sql" 2^>nul') do (
    if not defined DUMP_FILE set "DUMP_FILE=%%F"
)

if not defined DUMP_FILE (
    echo ERROR: No restorable dump file found!
    echo Looking for files matching: dump_restorable_*.sql
    echo In directory: %DUMP_DIR%
    echo.
    echo Please run the dump generator first.
    pause
    exit /b 1
)

set "FULL_DUMP_PATH=%DUMP_DIR%%DUMP_FILE%"
echo Found dump file: %DUMP_FILE%
echo.

REM --- Find MySQL client (same logic as dump script) ---
set "MYSQL_PATH="
set "PATHS[0]=C:\Program Files\MySQL\MySQL Workbench 8.0 CE\mysql.exe"
set "PATHS[1]=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
set "PATHS[2]=C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
set "PATHS[3]=C:\xampp\mysql\bin\mysql.exe"
set "PATHS[4]=C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"
set "PATHS[5]=mysql.exe"

echo Searching for MySQL client...

for /L %%i in (0,1,5) do (
    if defined PATHS[%%i] (
        call set "CURRENT_PATH=%%PATHS[%%i]%%"
        if exist "!CURRENT_PATH!" (
            set "MYSQL_PATH=!CURRENT_PATH!"
            echo Found MySQL client: !CURRENT_PATH!
            goto :mysql_found
        )
        if "%%i"=="5" (
            REM Try mysql in PATH
            where mysql >nul 2>&1
            if !errorlevel! equ 0 (
                set "MYSQL_PATH=mysql"
                echo Found MySQL client in system PATH
                goto :mysql_found
            )
        )
    )
)

echo ERROR: MySQL client not found in any of the common locations:
echo   - MySQL Workbench 8.0 CE
echo   - MySQL Server 8.0/8.4
echo   - XAMPP
echo   - WAMP64
echo   - System PATH
echo.
echo Please install MySQL client or add MySQL bin directory to PATH
pause
exit /b 1

:mysql_found
echo.

REM --- Test Railway connection ---
echo Testing connection to Railway MySQL...
"%MYSQL_PATH%" -h %RAILWAY_HOST% -P %RAILWAY_PORT% -u %RAILWAY_USER% -p%RAILWAY_PASSWORD% -e "SELECT 'Connection successful' as status;" 2>nul
if errorlevel 1 (
    echo ERROR: Cannot connect to Railway MySQL!
    echo.
    echo Please check:
    echo   - Railway MySQL service is running
    echo   - Network connection is available
    echo   - Connection details are correct:
    echo     Host: %RAILWAY_HOST%
    echo     Port: %RAILWAY_PORT%
    echo     User: %RAILWAY_USER%
    echo     Database: %RAILWAY_DATABASE%
    echo.
    pause
    exit /b 1
)
echo ✅ Railway connection successful!
echo.

REM --- Confirm import ---
echo IMPORTANT: This will import your local database to Railway MySQL
echo.
echo Source: %DUMP_FILE%
echo Target: %RAILWAY_HOST%:%RAILWAY_PORT%/%RAILWAY_DATABASE%
echo.
echo ⚠️  WARNING: This will OVERWRITE any existing data in Railway MySQL!
echo.
set /p "CONFIRM=Are you sure you want to proceed? (type YES to continue): "
if /i not "%CONFIRM%"=="YES" (
    echo Import cancelled.
    pause
    exit /b 0
)

echo.
echo ============================================================
echo    IMPORTING TO RAILWAY MYSQL
echo ============================================================
echo.

REM --- Perform the import ---
echo Importing %DUMP_FILE% to Railway MySQL...
echo This may take a few minutes depending on database size...
echo.

"%MYSQL_PATH%" -h %RAILWAY_HOST% -P %RAILWAY_PORT% -u %RAILWAY_USER% -p%RAILWAY_PASSWORD% %RAILWAY_DATABASE% < "%FULL_DUMP_PATH%" 2>> "%LOGFILE%"

if %errorlevel% neq 0 (
    echo.
    echo ❌ IMPORT FAILED!
    echo.
    echo Common issues:
    echo   - Network connection lost
    echo   - Railway service temporarily unavailable
    echo   - SQL syntax errors in dump file
    echo   - Insufficient permissions
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ IMPORT COMPLETED SUCCESSFULLY!
echo.

REM --- Verify the import ---
echo Verifying import by checking table count...
for /f %%A in ('"%MYSQL_PATH%" -h %RAILWAY_HOST% -P %RAILWAY_PORT% -u %RAILWAY_USER% -p%RAILWAY_PASSWORD% %RAILWAY_DATABASE% -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='%RAILWAY_DATABASE%';" 2^>nul') do set "TABLE_COUNT=%%A"

if defined TABLE_COUNT (
    if %TABLE_COUNT% GTR 0 (
        echo ✅ Verification successful: %TABLE_COUNT% tables found in Railway database
    ) else (
        echo ⚠️  Warning: No tables found - import may have failed
    )
) else (
    echo ⚠️  Could not verify import - please check Railway database manually
)

echo.
echo ============================================================
echo              RAILWAY IMPORT COMPLETE
echo ============================================================
echo.
echo Next steps:
echo 1. Backend environment variables are already configured in Railway:
echo    DB_HOST=%RAILWAY_HOST%
echo    DB_PORT=%RAILWAY_PORT%
echo    DB_USER=%RAILWAY_USER%
echo    DB_PASS=%RAILWAY_PASSWORD%
echo    DB_NAME=%RAILWAY_DATABASE%
echo.
echo 2. Redeploy your backend service in Railway
echo.
echo 3. Test your application!
echo.
echo Import log saved to: %LOGFILE%
echo Press any key to exit...
pause >nul

exit /b 0