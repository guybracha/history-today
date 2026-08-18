<#
.SYNOPSIS
  Registers the bot as a daily Windows Scheduled Task.
  Unlike "--schedule", this needs no open terminal and survives reboots.

  NOTE: kept ASCII-only on purpose - Windows PowerShell 5.1 reads .ps1 files
  without a BOM as ANSI, which mangles non-Latin characters.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\install-windows-task.ps1 -Time 08:00
#>
param(
  [string]$Time = "08:00",
  [string]$TaskName = "HistoryTodayBot"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source

$action = New-ScheduledTaskAction -Execute $node -Argument "src\index.js --now" -WorkingDirectory $root
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "Daily 'on this day' history fact from Wikipedia" -Force | Out-Null

Write-Host "Registered daily task '$TaskName' at $Time" -ForegroundColor Green
Write-Host "Run now:   Start-ScheduledTask -TaskName $TaskName"
Write-Host "Status:    Get-ScheduledTaskInfo -TaskName $TaskName"
Write-Host "Remove:    Unregister-ScheduledTask -TaskName $TaskName -Confirm:0"
