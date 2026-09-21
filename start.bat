@echo off
chcp 65001 > nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [오류] Node.js 가 설치되어 있지 않습니다.
  echo          https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행해 주세요.
  echo.
  pause
  exit /b 1
)
node server.js
pause
