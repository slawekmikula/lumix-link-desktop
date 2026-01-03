@echo off
REM Electron launcher for the new Lumix Link Desktop (React + Vite + Electron)
setlocal enabledelayedexpansion
set SCRIPT_DIR=%~dp0
cd /d %SCRIPT_DIR%

if not exist node_modules (
  echo Installing dependencies...
  npm install
)

echo Starting Lumix Link Desktop (dev mode)...
npm run dev

