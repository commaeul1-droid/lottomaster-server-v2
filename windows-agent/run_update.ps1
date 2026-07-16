param(
  [Parameter(Mandatory = $false)]
  [string]$RepoPath = ''
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
  if ([string]::IsNullOrWhiteSpace($PSScriptRoot)) {
    throw '$PSScriptRoot를 확인할 수 없습니다. -RepoPath로 저장소 경로를 지정하세요.'
  }
  $RepoPath = Split-Path -Parent $PSScriptRoot
}

$RepoPath = [System.IO.Path]::GetFullPath($RepoPath)
$logDir = Join-Path $RepoPath 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$logFile = Join-Path $logDir "collector_$stamp.log"

function Write-Log([string]$Message) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  $line | Tee-Object -FilePath $logFile -Append
}

function Invoke-CheckedCommand {
  param([string]$Name, [scriptblock]$Command)
  Write-Log $Name
  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    & $Command 2>&1 | ForEach-Object {
      $_.ToString() | Tee-Object -FilePath $logFile -Append
    }
    $code = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $old
  }
  if ($code -ne 0) {
    throw "$Name 실패 (exit code: $code)"
  }
}

try {
  Write-Log 'LottoMaster Server V2 local collector started'
  Write-Log "Repository: $RepoPath"

  if (-not (Test-Path (Join-Path $RepoPath '.git'))) {
    throw "Git 저장소가 아닙니다: $RepoPath"
  }

  Set-Location $RepoPath

  Invoke-CheckedCommand 'Pull latest main branch' {
    git pull --ff-only origin main
  }

  Invoke-CheckedCommand 'Validate current data' {
    npm run validate
  }

  Invoke-CheckedCommand 'Collect latest draw using local network' {
    npm run collect
  }

  $old = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $changes = git status --porcelain -- data 2>&1
    $statusCode = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $old
  }

  if ($statusCode -ne 0) {
    throw "Git status 실패 (exit code: $statusCode)"
  }

  if ([string]::IsNullOrWhiteSpace(($changes | Out-String))) {
    Write-Log 'No new data. Finished.'
    exit 0
  }

  Invoke-CheckedCommand 'Validate generated data' {
    npm run validate
  }

  git config user.name 'lottomaster-local-data-bot'
  git config user.email 'lottomaster-local@users.noreply.github.com'
  git add data

  Invoke-CheckedCommand 'Commit updated data' {
    git commit -m "data: local collector update $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  }

  Invoke-CheckedCommand 'Push updated data' {
    git push origin main
  }

  Write-Log 'Data pushed. GitHub sync workflow will update Supabase.'
}
catch {
  Write-Log "FAILED: $($_.Exception.Message)"
  exit 1
}
