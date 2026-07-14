param(
  [Parameter(Mandatory=$false)]
  [string]$RepoPath = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$logDir = Join-Path $RepoPath 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$logFile = Join-Path $logDir "collector_$stamp.log"

function Write-Log([string]$Message) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  $line | Tee-Object -FilePath $logFile -Append
}

try {
  Write-Log "LottoMaster Server V2 local collector started"
  Set-Location $RepoPath

  if (-not (Test-Path (Join-Path $RepoPath '.git'))) {
    throw "Git 저장소가 아닙니다: $RepoPath"
  }

  Write-Log 'Pull latest main branch'
  git pull --ff-only origin main 2>&1 | Tee-Object -FilePath $logFile -Append

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js가 설치되어 있지 않습니다. Node.js 22 LTS를 설치하세요.'
  }

  if (-not (Test-Path (Join-Path $RepoPath 'node_modules'))) {
    Write-Log 'Install dependencies'
    $env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1'
    npm ci --no-audit --no-fund 2>&1 | Tee-Object -FilePath $logFile -Append
  }

  Write-Log 'Collect latest draw using local network'
  npm run collect 2>&1 | Tee-Object -FilePath $logFile -Append

  $changes = git status --porcelain -- data
  if ([string]::IsNullOrWhiteSpace($changes)) {
    Write-Log 'No new data. Finished.'
    exit 0
  }

  Write-Log 'Validate generated data'
  npm run validate 2>&1 | Tee-Object -FilePath $logFile -Append

  git config user.name 'lottomaster-local-data-bot'
  git config user.email 'lottomaster-local@users.noreply.github.com'
  git add data
  git commit -m "data: local collector update $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>&1 | Tee-Object -FilePath $logFile -Append
  git push origin main 2>&1 | Tee-Object -FilePath $logFile -Append
  Write-Log 'Data pushed. GitHub Data Sync workflow will update Supabase.'
}
catch {
  Write-Log "FAILED: $($_.Exception.Message)"
  exit 1
}
