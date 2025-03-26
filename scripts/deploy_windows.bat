@echo off
REM Licener - Windows Deployment Script

echo ===== Licener Deployment Script for Windows =====
echo This script will help you deploy the Licener application.

REM Create scripts directory if it doesn't exist
mkdir scripts 2>nul

REM Check for required dependencies
echo Checking dependencies...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Node.js is not installed. Please install Node.js (v14+) and try again.
  exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo npm is not installed. Please install npm and try again.
  exit /b 1
)

REM Check for MongoDB
where mongod >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo MongoDB is not installed. You may need to install MongoDB or configure a remote connection.
  set /p continue_without_mongo="Continue anyway? (y/n): "
  if /i "%continue_without_mongo%" NEQ "y" (
    exit /b 1
  )
)

REM Check Node.js version
for /f "delims=v tokens=2" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "delims=. tokens=1" %%i in ("%NODE_VERSION%") do set NODE_MAJOR_VERSION=%%i

if %NODE_MAJOR_VERSION% LSS 14 (
  echo Node.js v14+ is required. Current version: %NODE_VERSION%
  echo Please upgrade Node.js and try again.
  exit /b 1
)

echo Node.js version: %NODE_VERSION% - OK

REM Install dependencies
echo Installing dependencies...
call npm install --production

REM Check if .env file exists, create from example if it doesn't
if not exist .env (
  if exist .env.example (
    echo Creating .env file from .env.example...
    copy .env.example .env

    REM Generate random strings for secrets
    set "SESSION_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%"
    set "JWT_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%"
    
    REM Windows doesn't have sed, so we'll use a simpler approach
    echo Updating secrets in .env file...
    echo Please manually update SESSION_SECRET and JWT_SECRET in the .env file with strong random values.
    
    echo Environment file created. Please edit .env file to configure your settings.
  ) else (
    echo No .env or .env.example file found. Please create .env file manually.
    exit /b 1
  )
)

REM Create required directories
echo Creating data directories...
mkdir data\uploads 2>nul
mkdir data\exports 2>nul

REM Create a Windows service using nssm (Non-Sucking Service Manager)
echo Do you want to create a Windows service for Licener? (y/n)
set /p create_service=""

if /i "%create_service%"=="y" (
  where nssm >nul 2>nul
  if %ERRORLEVEL% NEQ 0 (
    echo NSSM (Non-Sucking Service Manager) is not installed.
    echo Download it from http://nssm.cc/ and install it or add it to your PATH.
    echo Then run this script again.
    
    set /p download_nssm="Download NSSM now? (y/n): "
    if /i "%download_nssm%"=="y" (
      echo Please download NSSM manually from http://nssm.cc/
      echo After installing, run this script again.
    )
  ) else (
    echo Creating Windows service using NSSM...
    set WORKING_DIR=%CD%
    for /f "delims=" %%i in ('where node') do set NODE_PATH=%%i
    
    echo Service name: Licener
    echo Path to executable: %NODE_PATH%
    echo Arguments: %WORKING_DIR%\app.js
    echo Working directory: %WORKING_DIR%
    
    nssm install Licener "%NODE_PATH%" "%WORKING_DIR%\app.js"
    nssm set Licener AppDirectory "%WORKING_DIR%"
    nssm set Licener DisplayName "Licener - License Management System"
    nssm set Licener Description "A web application for managing software licenses"
    nssm set Licener AppEnvironmentExtra "NODE_ENV=production"
    nssm set Licener Start SERVICE_AUTO_START
    
    echo Service created. You can start it using: nssm start Licener
    echo Or from Windows Services management console.
  )
)

REM Create a startup script for running with PM2 (if available)
echo Do you want to use PM2 process manager? (y/n)
set /p use_pm2=""

if /i "%use_pm2%"=="y" (
  where pm2 >nul 2>nul
  if %ERRORLEVEL% NEQ 0 (
    echo PM2 is not installed. Installing PM2 globally...
    call npm install -g pm2
  )
  
  echo Creating PM2 startup script...
  (
    echo @echo off
    echo pm2 start app.js --name "licener" --env production
    echo pm2 save
  ) > start_pm2.bat
  
  echo PM2 startup script created: start_pm2.bat
  echo Run 'start_pm2.bat' to start the application with PM2
  
  echo Do you want PM2 to start on system boot? (y/n)
  set /p pm2_startup=""
  
  if /i "%pm2_startup%"=="y" (
    echo Setting up PM2 startup script...
    pm2 startup
  )
) else (
  REM Create a simple startup script
  echo Creating a simple startup script...
  (
    echo @echo off
    echo set NODE_ENV=production
    echo node app.js
  ) > start.bat
  
  echo Startup script created: start.bat
  echo Run 'start.bat' to start the application
)

REM Option to run as a scheduled task
echo Do you want to create a Windows scheduled task to run Licener at startup? (y/n)
set /p create_task=""

if /i "%create_task%"=="y" (
  echo Creating scheduled task...
  set WORKING_DIR=%CD%
  
  REM Determine which script to use
  if /i "%use_pm2%"=="y" (
    set SCRIPT_PATH=%WORKING_DIR%\start_pm2.bat
  ) else (
    set SCRIPT_PATH=%WORKING_DIR%\start.bat
  )
  
  schtasks /create /tn "Licener" /tr "%SCRIPT_PATH%" /sc onstart /ru System
  
  if %ERRORLEVEL% EQU 0 (
    echo Scheduled task created successfully.
    echo You can modify it in Task Scheduler.
  ) else (
    echo Failed to create scheduled task. Please create it manually.
  )
)

echo.
echo ===== Deployment Complete =====
echo To start Licener, you can:
if /i "%create_service%"=="y" (
  echo 1. Start the Windows service (recommended for production)
  echo   - From services.msc or run: nssm start Licener
)
if /i "%use_pm2%"=="y" (
  echo 2. Run 'start_pm2.bat' to start with PM2 (recommended for production)
)
if /i "%create_task%"=="y" (
  echo 3. The application will start automatically on system boot via scheduled task
)
echo 4. Run 'start.bat' to start directly with Node.js
echo 5. Run 'npm start' to start using the npm script
echo.
echo Access the application at: http://localhost:3000
echo Remember to secure your server with a proper firewall and HTTPS if exposing to the internet!