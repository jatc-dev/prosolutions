# Verifica estado local de ProCV Platform (backend, frontend y PostgreSQL)
# Uso desde la raiz del proyecto:
#   .\health-check.ps1

$ErrorActionPreference = "SilentlyContinue"

function Test-PortOpen {
  param(
    [string]$HostName,
    [int]$Port
  )

  $targets = @($HostName, "127.0.0.1", "localhost") | Select-Object -Unique

  foreach ($target in $targets) {
    $check = Test-NetConnection -ComputerName $target -Port $Port -WarningAction SilentlyContinue
    if ([bool]$check.TcpTestSucceeded) {
      return $true
    }

    try {
      $client = New-Object System.Net.Sockets.TcpClient
      $async = $client.BeginConnect($target, $Port, $null, $null)
      $connected = $async.AsyncWaitHandle.WaitOne(1000)
      if ($connected -and $client.Connected) {
        $client.EndConnect($async)
        $client.Close()
        return $true
      }
      $client.Close()
    } catch {
      # Try next target
    }
  }

  return $false
}

function Test-HttpJson {
  param(
    [string]$Url
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 5
    return @{
      Ok = $true
      StatusCode = $response.StatusCode
      Body = $response.Content
    }
  } catch {
    return @{
      Ok = $false
      StatusCode = $null
      Body = $_.Exception.Message
    }
  }
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host " ProCV Local Health Check" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# 1) PostgreSQL local
$dbPortOpen = Test-PortOpen -HostName "localhost" -Port 5432
if ($dbPortOpen) {
  Write-Host "[OK] PostgreSQL local en localhost:5432" -ForegroundColor Green
} else {
  Write-Host "[FAIL] PostgreSQL no responde en localhost:5432" -ForegroundColor Red
}

# 2) Backend
$backendPortOpen = Test-PortOpen -HostName "localhost" -Port 4000

$healthResult = Test-HttpJson -Url "http://localhost:4000/health"
if ($healthResult.Ok) {
  Write-Host "[OK] GET /health => $($healthResult.StatusCode)" -ForegroundColor Green
  Write-Host "      $($healthResult.Body)"
} else {
  Write-Host "[FAIL] GET /health" -ForegroundColor Red
  Write-Host "      $($healthResult.Body)"
}

if ($backendPortOpen -or $healthResult.Ok) {
  Write-Host "[OK] Backend disponible" -ForegroundColor Green
} else {
  Write-Host "[FAIL] Backend no disponible" -ForegroundColor Red
}

$landingResult = Test-HttpJson -Url "http://localhost:4000/api/public/landing-features"
if ($landingResult.Ok) {
  Write-Host "[OK] GET /api/public/landing-features => $($landingResult.StatusCode)" -ForegroundColor Green
} else {
  Write-Host "[WARN] GET /api/public/landing-features" -ForegroundColor Yellow
  Write-Host "      $($landingResult.Body)"
}

# 3) Frontend
$frontendPortOpen = Test-PortOpen -HostName "localhost" -Port 5173

$frontendResult = Test-HttpJson -Url "http://localhost:5173"
if ($frontendResult.Ok) {
  Write-Host "[OK] GET / (frontend) => $($frontendResult.StatusCode)" -ForegroundColor Green
} else {
  Write-Host "[FAIL] GET / (frontend)" -ForegroundColor Red
  Write-Host "      $($frontendResult.Body)"
}

if ($frontendPortOpen -or $frontendResult.Ok) {
  Write-Host "[OK] Frontend disponible" -ForegroundColor Green
} else {
  Write-Host "[FAIL] Frontend no disponible" -ForegroundColor Red
}

Write-Host "===============================================" -ForegroundColor Cyan
if ($dbPortOpen -and ($backendPortOpen -or $healthResult.Ok) -and ($frontendPortOpen -or $frontendResult.Ok) -and $healthResult.Ok) {
  Write-Host " Estado general: SALUDABLE" -ForegroundColor Green
  exit 0
}

Write-Host " Estado general: CON PROBLEMAS" -ForegroundColor Yellow
exit 1
