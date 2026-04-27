$ErrorActionPreference = "Stop"

$Port = 3000
$Url = "http://localhost:$Port"

Write-Host ""
Write-Host "========================================"
Write-Host " Pamoon - stop localhost"
Write-Host "========================================"
Write-Host ""

$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if (-not $connections) {
  Write-Host "[INFO] No server is running at $Url" -ForegroundColor Yellow
  exit 0
}

$idsToStop = $connections | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($idToStop in $idsToStop) {
  try {
    $targetProcess = Get-Process -Id $idToStop -ErrorAction Stop
    Write-Host "[STOP] $($targetProcess.ProcessName) PID $idToStop"
    Stop-Process -Id $idToStop -Force
  } catch {
    Write-Host "[SKIP] Could not stop PID $idToStop" -ForegroundColor Yellow
  }
}

Write-Host "[OK] Localhost server stopped." -ForegroundColor Green

