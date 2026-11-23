@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Can cai Node.js 20 tro len: https://nodejs.org/
  pause
  exit /b 1
)
echo Dang khoi dong Ban Bi online v4.1...
node server.js --open
pause
