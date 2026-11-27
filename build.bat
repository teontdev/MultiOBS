@echo off
rem Build ban production va bo cai Windows (NSIS).
cd /d "%~dp0"
if not exist node_modules (
  echo Dang cai thu vien npm...
  call npm install || goto :fail
)
call npm run tauri build || goto :fail
echo.
echo Bo cai da tao:
dir /b /s "src-tauri\target\release\bundle\nsis\MultiOBS_*_x64-setup.exe" || goto :fail
pause
exit /b 0

:fail
echo.
echo Build that bai. Xem thong bao phia tren.
pause
exit /b 1
