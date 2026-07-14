param(
  [Parameter(Mandatory=$false)]
  [string]$RepoPath = (Split-Path -Parent $PSScriptRoot),
  [Parameter(Mandatory=$false)]
  [string]$TaskName = 'LottoMaster Server V2 Collector',
  [Parameter(Mandatory=$false)]
  [string]$StartTime = '21:20'
)

$ErrorActionPreference = 'Stop'
$runner = Join-Path $RepoPath 'windows-agent\run_update.ps1'
if (-not (Test-Path $runner)) { throw "실행 파일이 없습니다: $runner" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -RepoPath `"$RepoPath`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At $StartTime
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description 'Collect latest Lotto 6/45 result from local network and push verified data to GitHub.' -Force | Out-Null
Write-Host "완료: $TaskName"
Write-Host "매주 토요일 $StartTime 실행"
Write-Host "PC가 꺼져 있으면 다음 부팅 후 가능한 시점에 실행됩니다."
