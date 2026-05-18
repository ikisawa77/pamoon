$ErrorActionPreference = "Stop"

$AppDir = Split-Path -Parent $PSScriptRoot
$Port = 3000
$DbPort = 3306
$Url = "http://localhost:$Port"
$LogFile = Join-Path $AppDir ".localhost.log"
$MySqlStartBat = "C:\xampp\mysql_start.bat"
$MySqlCli = "C:\xampp\mysql\bin\mysql.exe"

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

function Test-DbPort {
  $connection = Test-NetConnection 127.0.0.1 -Port $DbPort -WarningAction SilentlyContinue
  return $connection.TcpTestSucceeded
}

if (-not (Test-DbPort)) {
  if (Test-Path $MySqlStartBat) {
    Write-Host "[DB] MySQL is not running. Starting XAMPP MySQL..."
    Start-Process -FilePath $MySqlStartBat -WorkingDirectory (Split-Path -Parent $MySqlStartBat) -WindowStyle Hidden
    for ($i = 0; $i -lt 30; $i++) {
      if (Test-DbPort) { break }
      Start-Sleep -Seconds 1
    }
  }
}

if (-not (Test-DbPort)) {
  Write-Host "[ERROR] MySQL/MariaDB did not start on 127.0.0.1:$DbPort." -ForegroundColor Red
  Write-Host "        Open XAMPP Control Panel and start MySQL, then run this file again."
  exit 1
}

if (Test-Path $MySqlCli) {
  Write-Host "[DB] Ensuring database pamoon exists..."
  & $MySqlCli --host=127.0.0.1 --port=$DbPort --user=root --execute="CREATE DATABASE IF NOT EXISTS pamoon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Could not connect to MySQL as root without password." -ForegroundColor Red
    Write-Host "        Check DATABASE_URL in .env and XAMPP MySQL credentials."
    exit 1
  }
}

$existing = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($existing) {
  $serverHealthy = $false
  try {
    $homeResponse = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    $cssMatch = [regex]::Match($homeResponse.Content, 'href="([^"]*layout\.css[^"]*)"')
    if ($homeResponse.StatusCode -ge 200 -and $homeResponse.StatusCode -lt 500 -and $cssMatch.Success) {
      $cssPath = $cssMatch.Groups[1].Value -replace "&amp;", "&"
      $cssResponse = Invoke-WebRequest -Uri ("$Url$cssPath") -UseBasicParsing -TimeoutSec 5
      $serverHealthy = $cssResponse.StatusCode -eq 200
    }
  } catch {
    $serverHealthy = $false
  }

  if ($serverHealthy) {
    Write-Host "[READY] Server is already running at $Url" -ForegroundColor Green
    Start-Process $Url
    exit 0
  }

  Write-Host "[FIX] Existing Next.js server is stale or missing CSS. Restarting it..."
  $existing |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object {
      Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
  Start-Sleep -Seconds 2
}

$NextCacheDir = Join-Path $AppDir ".next"
if (Test-Path $NextCacheDir) {
  Write-Host "[CLEAN] Removing stale Next.js cache..."
  Remove-Item -LiteralPath $NextCacheDir -Recurse -Force
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
