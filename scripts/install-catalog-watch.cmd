@echo off
rem Registers a daily Windows scheduled task that runs the Riftbound catalog watch.
rem Remove later with: schtasks /Delete /TN "HyperColossus Riftbound catalog watch" /F
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -Command "$a = New-ScheduledTaskAction -Execute (Get-Command node).Source -Argument scripts\riftbound-catalog-watch.mjs -WorkingDirectory (Get-Location).Path; $t = New-ScheduledTaskTrigger -Daily -At 9:07am; $s = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15); Register-ScheduledTask -TaskName HyperColossus Riftbound catalog watch -Action $a -Trigger $t -Settings $s -Force | Out-Null; Start-ScheduledTask -TaskName HyperColossus Riftbound catalog watch" || goto fail
echo Installed. It runs daily at 9:07 AM (or at next login if missed) and ran once just now.
echo Results: outputs\catalog-watch\watch.log
pause
exit /b 0
:fail
echo Install failed.
pause
exit /b 1
