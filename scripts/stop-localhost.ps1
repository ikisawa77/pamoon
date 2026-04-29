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
} else {
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
}

$mysqlProcesses = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "mysqld.exe" -and $_.CommandLine -like "*C:\xampp*"
}

foreach ($mysqlProcess in $mysqlProcesses) {
  try {
    Write-Host "[STOP] XAMPP MySQL PID $($mysqlProcess.ProcessId)"
    Stop-Process -Id $mysqlProcess.ProcessId -Force
  } catch {
    Write-Host "[SKIP] Could not stop XAMPP MySQL PID $($mysqlProcess.ProcessId)" -ForegroundColor Yellow
  }
}

if ($mysqlProcesses) {
  Write-Host "[OK] XAMPP MySQL stopped." -ForegroundColor Green
}
