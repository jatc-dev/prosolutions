[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js no está disponible en PATH. Instala Node.js y vuelve a intentarlo."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw "npm no está disponible en PATH. Revisa la instalación de Node.js."
}
if (-not (Test-Path (Join-Path $repoRoot "node_modules"))) {
  throw "No encuentro node_modules en la raíz. El script no instala dependencias; instala las dependencias del proyecto y vuelve a intentarlo."
}

function Get-ListeningProcessId([int]$port) {
  $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($connection) {
    return [int]$connection.OwningProcess
  }
  return $null
}

function Start-DevWindow([string]$name, [string]$npmScript, [int[]]$ports) {
  $busy = @()
  foreach ($port in $ports) {
    $processId = Get-ListeningProcessId $port
    if ($null -ne $processId) {
      $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
      $processName = if ($process) { $process.ProcessName } else { "proceso desconocido" }
      $busy += "${port} ($processName, PID $processId)"
    }
  }

  if ($busy.Count -gt 0) {
    Write-Warning "$name no se inició porque estos puertos ya están ocupados: $($busy -join ', '). Revisa las ventanas existentes antes de volver a intentarlo."
    return
  }

  $command = "title ProSolutions $name && npm.cmd run $npmScript"
  Start-Process -FilePath $env:ComSpec `
    -ArgumentList @("/k", $command) `
    -WorkingDirectory $repoRoot | Out-Null

  Write-Host "$name iniciado en una ventana independiente." -ForegroundColor Green
}

Start-DevWindow -name "Core" -npmScript "dev:core" -ports @(5174)
Start-DevWindow -name "ProCV" -npmScript "dev:procv" -ports @(5173, 4000)

Write-Host ""
Write-Host "Core:             http://localhost:5174"
Write-Host "ProCV:            http://localhost:5173"
Write-Host "API local de CV:  http://localhost:4000"
Write-Host "Identidad:        ProIdentity QA, mediante los proxies locales"
Write-Host ""
Write-Host "Los logs aparecen en las ventanas de cada servicio. Detén cada grupo con Ctrl+C en su ventana."
