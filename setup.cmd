@echo off
cd /d "%~dp0"
node -e "if (process.versions.node.split('.')[0] !== '24') process.exit(1)"
if errorlevel 1 goto failed
call npm ci --ignore-scripts
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
call npm run setup
if errorlevel 1 goto failed
echo Davet baglantisini acin. Bot sunucuya katilinca devam edin. / Open invite; continue after bot joins.
pause
call npm run register
if errorlevel 1 goto failed
echo Hazir. start.cmd ile baslatin. / Ready. Use start.cmd.
pause
exit /b 0
:failed
echo Kurulum basarisiz. Node.js 24 LTS ve README adimlarini kontrol edin. / Setup failed; see README.
pause
exit /b 1
