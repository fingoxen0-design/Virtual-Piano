@echo off
cd /d "%~dp0"
echo ==============================================
echo     Grand Virtual Piano - Ishga tushirish
echo ==============================================
echo Brauzerda ochilmoqda: http://localhost:8080/play
start http://localhost:8080/play
npm run dev
pause
