@echo off
REM Licener - Windows Deployment Script

echo ===== Licener Deployment Script for Windows =====
echo This script will help you deploy the Licener application.

REM Create scripts directory if it doesn't exist
mkdir scripts 2>nul

REM Function to install MongoDB
:install_mongodb
echo MongoDB is not installed. Would you like to install it? (y/n)
set /p install_mongo=""

if /i "%install_mongo%" NEQ "y" (
  echo MongoDB installation skipped. You need to configure a MongoDB connection manually.
  goto :check_docker_mongodb
)

echo Installing MongoDB...
echo Please download MongoDB Community Edition from: https://www.mongodb.com/try/download/community
echo And follow the installation instructions.
echo.
echo After installation, press any key to continue...
pause > nul

where mongod >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo MongoDB does not appear to be in your PATH.
  echo Please make sure MongoDB is installed and added to your PATH.
  goto :check_docker_mongodb
)

echo MongoDB installed successfully!
goto :mongodb_done

:check_docker_mongodb
echo Would you like to use Docker for MongoDB instead? (y/n)
set /p use_docker=""

if /i "%use_docker%" NEQ "y" (
  echo Docker MongoDB setup skipped. You need to configure a MongoDB connection manually.
  goto :mongodb_done
)

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Docker is not installed. 
  echo Please download and install Docker Desktop from: https://www.docker.com/products/docker-desktop/
  echo.
  echo After installation, press any key to continue...
  pause > nul
  
  where docker >nul 2>nul
  if %ERRORLEVEL% NEQ 0 (
    echo Docker still not found in PATH. Please install Docker and try again.
    goto :mongodb_done
  )
)

REM Run MongoDB with Docker
echo Starting MongoDB with Docker...

REM Create a docker network for MongoDB
docker network create mongodb-network 2>nul

REM Run MongoDB container
docker run -d --name mongodb ^
  --network mongodb-network ^
  -p 27017:27017 ^
  -v mongodb-data:/data/db ^
  --restart unless-stopped ^
  mongo:6

if %ERRORLEVEL% NEQ 0 (
  echo Failed to start MongoDB Docker container.
  echo Check if Docker is running and try again.
) else (
  echo MongoDB running in Docker container!
  
  REM Update .env file with Docker MongoDB URI if it exists
  if exist .env (
    powershell -Command "(Get-Content .env) -replace 'MONGO_URI=.*', 'MONGO_URI=mongodb://localhost:27017/licener' | Set-Content .env"
  )
)

:mongodb_done

REM Check for required dependencies
echo Checking dependencies...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo Node.js is not installed. Would you like to install it? (y/n)
  set /p install_node=""
  
  if /i "%install_node%" NEQ "y" (
    echo Node.js installation is required. Exiting.
    exit /b 1
  )
  
  echo Please download and install Node.js from: https://nodejs.org/
  echo Make sure to install the LTS version (v14 or higher)
  echo.
  echo After installation, press any key to continue...
  pause > nul
  
  where node >nul 2>nul
  if %ERRORLEVEL% NEQ 0 (
    echo Node.js still not found in PATH. Please install Node.js and try again.
    exit /b 1
  )
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo npm is not installed. It should be installed with Node.js.
  echo Please install npm and try again.
  exit /b 1
)

REM Check Node.js version
for /f "delims=v tokens=2" %%i in ('node -v') do set NODE_VERSION=%%i
for /f "delims=. tokens=1" %%i in ("%NODE_VERSION%") do set NODE_MAJOR_VERSION=%%i

if %NODE_MAJOR_VERSION% LSS 14 (
  echo Node.js v14+ is required. Current version: %NODE_VERSION%
  echo Would you like to upgrade Node.js? (y/n)
  set /p upgrade_node=""
  
  if /i "%upgrade_node%" NEQ "y" (
    echo Node.js upgrade is required. Exiting.
    exit /b 1
  )
  
  echo Please download and install a newer version of Node.js (v14+) from: https://nodejs.org/
  echo.
  echo After installation, press any key to continue...
  pause > nul
  
  for /f "delims=v tokens=2" %%i in ('node -v') do set NODE_VERSION=%%i
  for /f "delims=. tokens=1" %%i in ("%NODE_VERSION%") do set NODE_MAJOR_VERSION=%%i
  
  if %NODE_MAJOR_VERSION% LSS 14 (
    echo Node.js version is still below v14. Please upgrade Node.js and try again.
    exit /b 1
  )
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
    setlocal EnableDelayedExpansion
    set "chars=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    set "SESSION_SECRET="
    set "JWT_SECRET="
    
    for /L %%i in (1,1,32) do (
      set /a rand=!random! %% 62
      for /f "delims=" %%j in ("!rand!") do set "SESSION_SECRET=!SESSION_SECRET!!chars:~%%j,1!"
    )
    
    for /L %%i in (1,1,32) do (
      set /a rand=!random! %% 62
      for /f "delims=" %%j in ("!rand!") do set "JWT_SECRET=!JWT_SECRET!!chars:~%%j,1!"
    )
    
    REM Update .env file with PowerShell (more reliable than batch file string replacement)
    powershell -Command "(Get-Content .env) -replace 'change_this_to_a_long_random_string', '%SESSION_SECRET%' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'change_this_to_a_different_long_random_string', '%JWT_SECRET%' | Set-Content .env"
    powershell -Command "(Get-Content .env) -replace 'NODE_ENV=development', 'NODE_ENV=production' | Set-Content .env"
    
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
    echo Would you like to download NSSM now? (y/n)
    set /p download_nssm=""
    
    if /i "%download_nssm%"=="y" (
      echo Please download NSSM from: http://nssm.cc/release/nssm-2.24.zip
      echo Extract the zip file and copy the appropriate nssm.exe to a directory in your PATH.
      echo.
      echo After installation, press any key to continue...
      pause > nul
      
      where nssm >nul 2>nul
      if %ERRORLEVEL% NEQ 0 (
        echo NSSM still not found in PATH. Skipping service creation.
        goto :skip_nssm
      )
    ) else (
      echo Skipping NSSM installation.
      goto :skip_nssm
    )
  )
  
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
  
  echo Service created. Starting service...
  nssm start Licener
  
  if %ERRORLEVEL% EQU 0 (
    echo Service started successfully.
  ) else (
    echo Failed to start service. You can start it manually using: nssm start Licener
  )
)

:skip_nssm

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
  
  echo Do you want PM2 to start on system boot? (y/n)
  set /p pm2_startup=""
  
  if /i "%pm2_startup%"=="y" (
    echo Setting up PM2 startup script...
    pm2 startup
    
    echo Do you want to start the application with PM2 now? (y/n)
    set /p start_pm2_now=""
    
    if /i "%start_pm2_now%"=="y" (
      call start_pm2.bat
      echo Application started with PM2!
    )
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
  
  echo Do you want to start the application now? (y/n)
  set /p start_now=""
  
  if /i "%start_now%"=="y" (
    start "Licener" cmd /c start.bat
    echo Application started!
  )
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