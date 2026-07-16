param(
  [Parameter(Mandatory = $false)]
  [string]$RepoPath = '',
  [Parameter(Mandatory = $false)]
  [string]$TaskName = 'LottoMaster Server V2 Collector',
  [Parameter(Mandatory = $false)]
  [string]$StartTime = '21:20'
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
  if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    throw '$PSScriptRoot를 확인할 수 없습니다. -RepoPath로 저장소 경로를 지정하세요.'
  }
  $RepoPath = Split-Path -Parent $PSScriptRoot
}

$RepoPath = [System.IO.Path]::GetFullPath($RepoPath)
$runner = Join-Path $RepoPath 'windows-agent\run_update.ps1'

if (-not (Test-Path $runner)) {
  throw "실행 파일이 없습니다: $runner"
}

$actionArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -RepoPath `"$RepoPath`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $actionArgs
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At $StartTime
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 20)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description 'Collect the latest Lotto 6/45 result locally and push verified data to GitHub.' `
  -Force | Out-Null

Write-Host "완료: $TaskName"
Write-Host "저장소: $RepoPath"
Write-Host "매주 토요일 $StartTime 실행"
Write-Host "PC가 꺼져 있으면 다음 가능한 시점에 실행됩니다."
