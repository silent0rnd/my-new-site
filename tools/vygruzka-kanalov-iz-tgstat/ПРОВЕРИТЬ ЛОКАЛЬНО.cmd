@echo off
chcp 65001 > nul
cd /d "%~dp0\..\.."
node scripts\serve-tgstat-local.js
if errorlevel 1 pause
