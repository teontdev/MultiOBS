@echo off
rem Chay MultiOBS o che do dev (hot reload).
cd /d "%~dp0"
if not exist node_modules (
  echo Dang cai thu vien npm...
  call npm install || goto :fail
)
call npm run tauri dev || goto :fail
exit /b 0

:fail
echo.
echo Loi khi chay MultiOBS. Xem thong bao phia tren.
pause
exit /b 1
