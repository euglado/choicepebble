@echo off
cd /d "%~dp0"
call npm run build
if errorlevel 1 goto failed
call npm start
if errorlevel 1 goto failed
exit /b 0
:failed
echo Baslatilamadi. README sorun giderme bolumune bakin. / See README troubleshooting.
pause
exit /b 1
