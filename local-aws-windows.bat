@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

set "APP_NAME=local-aws"
set "REINSTALL=0"

if /i "%~1"=="--reinstall" set "REINSTALL=1"
if /i "%~1"=="-h" goto :help
if /i "%~1"=="--help" goto :help

set "INSTALL_DIR=%LocalAppData%\Programs\%APP_NAME%"
set "EXE=%INSTALL_DIR%\%APP_NAME%.exe"

if exist "%EXE%" if "%REINSTALL%"=="0" (
  echo Launching %APP_NAME%...
  start "" "%EXE%"
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo Error: Node.js is required to build the app. Install from https://nodejs.org/
  exit /b 1
)

echo Building %APP_NAME% for Windows...
if not exist "node_modules\" call npm install
call npm run dist:win
if errorlevel 1 exit /b 1

set "SETUP="
for %%F in (release\%APP_NAME%*Setup*.exe) do set "SETUP=%%F"

if defined SETUP (
  echo.
  echo Running installer: %SETUP%
  echo Follow the wizard to add %APP_NAME% to your Start Menu.
  echo.
  start /wait "" "%SETUP%"
  exit /b 0
)

echo Error: Installer not found in release\
exit /b 1

:help
echo Usage: local-aws-windows.bat [--reinstall]
echo   Builds and installs local-aws via the Windows installer.
exit /b 0
