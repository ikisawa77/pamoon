$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $PSScriptRoot
$Port = 3000
$Url = "http://localhost:$Port"
$LogFile = Join-Path $AppDir ".localhost.log"

Set-Location $AppDir

Write-Host ""
Write-Host "========================================"
Write-Host " Pamoon - start localhost"
Write-Host "========================================"
Write-Host ""

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npm) {
  $npm = Get-Command npm -ErrorAction SilentlyContinue
}

if (-not $npm) {
  Write-Host "[ERROR] npm was not found. Please install Node.js first." -ForegroundColor Red
  exit 1
}

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "[READY] Server is already running at $Url" -ForegroundColor Green
  Start-Process $Url
  exit 0
}

if (-not (Test-Path (Join-Path $AppDir "node_modules"))) {
  Write-Host "[INSTALL] node_modules not found. Running npm install..."
  & $npm.Source install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed." -ForegroundColor Red
    exit 1
  }
}

Write-Host "[START] Starting Next.js frontend and backend at $Url"
Write-Host "[LOG] $LogFile"

$command = 'cd /d "{0}" && npm run dev -- -p {1} > "{2}" 2>&1' -f $AppDir, $Port, $LogFile
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $command -WindowStyle Hidden

Write-Host "[WAIT] Waiting for the server..."
$ready = $false
for ($i = 0; $i -lt 40; $i++) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      $ready = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 1
  }
}

if (-not $ready) {
  Write-Host "[WARN] Server did not respond. Check log file: $LogFile" -ForegroundColor Yellow
  exit 1
}

Write-Host "[OK] Server is ready: $Url" -ForegroundColor Green
Start-Process $Url
Write-Host ""
Write-Host "Run stop-localhost.bat to stop the server."

