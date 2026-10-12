@echo off
rem Registers a daily Windows scheduled task that runs the Riftbound catalog watch.
rem Remove later with: schtasks /Delete /TN "HyperColossus Riftbound catalog watch" /F
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-catalog-watch.ps1" || goto fail
pause
exit /b 0
:fail
echo Install failed.
pause
exit /b 1
