# Registers a daily scheduled task for the current user that runs the Riftbound catalog watch.
$ErrorActionPreference = 'Stop'
$name = 'HyperColossus Riftbound catalog watch'
$project = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source
$action = New-ScheduledTaskAction -Execute $node -Argument 'scripts\riftbound-catalog-watch.mjs' -WorkingDirectory $project
$trigger = New-ScheduledTaskTrigger -Daily -At '9:07AM'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15)
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive
Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName $name
Write-Host "Installed '$name'. Runs daily at 9:07 AM (or at next login if missed); started once now."
Write-Host "Results: $project\outputs\catalog-watch\watch.log"
