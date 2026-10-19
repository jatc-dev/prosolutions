# Levanta backend y frontend de ProCV en ventanas separadas (Windows PowerShell)
# Ejecútalo desde la raíz del proyecto:
#   .\start-all.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Rutas actualizadas según la estructura del monorepo (apps/procv)
$backendDir = Join-Path $root "apps\procv\backend"
$frontendDir = Join-Path $root "apps\procv\frontend"

$backendEnvPath = Join-Path $backendDir ".env"
$frontendEnvPath = Join-Path $frontendDir ".env.local"

function Test-PostgresPort {
	$dbCheck = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
	return [bool]$dbCheck.TcpTestSucceeded
}

function Start-PostgresWindowsService {
	$postgresServices = Get-Service | Where-Object {
		$_.Name -match '^postgres' -or $_.DisplayName -match 'PostgreSQL'
	}

	if (-not $postgresServices) {
		return $false
	}

	foreach ($svc in $postgresServices) {
		try {
			if ($svc.Status -ne 'Running') {
				Write-Host "[INFO] Iniciando servicio PostgreSQL: $($svc.Name)" -ForegroundColor Yellow
				Start-Service -Name $svc.Name -ErrorAction Stop
			}
		} catch {
			Write-Host "[WARN] No se pudo iniciar el servicio $($svc.Name): $($_.Exception.Message)" -ForegroundColor Yellow
		}
	}

	Start-Sleep -Seconds 3
	return (Test-PostgresPort)
}

function Start-PostgresDockerCompose {
	if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
		return $false
	}

	try {
		Write-Host "[INFO] Intentando iniciar PostgreSQL con Docker Compose..." -ForegroundColor Yellow
		# El docker-compose.yml está en apps/procv según tu árbol de archivos
		docker compose -f (Join-Path $root 'apps\procv\docker-compose.yml') up -d db | Out-Null
		Start-Sleep -Seconds 4
		return (Test-PostgresPort)
	} catch {
		Write-Host "[WARN] Docker no pudo iniciar el servicio db: $($_.Exception.Message)" -ForegroundColor Yellow
		return $false
	}
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
	Write-Host "[ERROR] npm no esta disponible en PATH. Instala Node.js o abre una terminal con npm habilitado." -ForegroundColor Red
	exit 1
}

if (-not (Test-Path $backendEnvPath)) {
	Write-Host "[ERROR] Falta el archivo .env en: $backendEnvPath" -ForegroundColor Red
	exit 1
}

if (-not (Test-Path $frontendEnvPath)) {
	Write-Host "[ERROR] Falta el archivo .env.local en: $frontendEnvPath" -ForegroundColor Red
	exit 1
}

$databaseUrlLine = (Get-Content $backendEnvPath | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1)
$usesLocalPostgres = $false

if ($databaseUrlLine -and $databaseUrlLine -match 'localhost:5432|127\.0\.0\.1:5432') {
	$usesLocalPostgres = $true
}

if ($usesLocalPostgres) {
	if (-not (Test-PostgresPort)) {
		Write-Host "[WARN] PostgreSQL local no responde en localhost:5432. Intentando iniciarlo automaticamente..." -ForegroundColor Yellow

		$startedByService = Start-PostgresWindowsService
		if (-not $startedByService) {
			$startedByDocker = Start-PostgresDockerCompose
			if (-not $startedByDocker) {
				Write-Host "[ERROR] No se pudo iniciar PostgreSQL automaticamente." -ForegroundColor Red
				Write-Host "        Opciones:" -ForegroundColor Red
				Write-Host "        1) Inicia el servicio PostgreSQL en Windows" -ForegroundColor Red
				Write-Host "        2) Instala Docker Desktop y ejecuta: docker compose up -d db" -ForegroundColor Red
				exit 1
			}
		}

		Write-Host "[OK] PostgreSQL disponible en localhost:5432" -ForegroundColor Green
	}
}

Write-Host "[OK] Iniciando backend y frontend de ProCV en ventanas separadas..." -ForegroundColor Green
Start-Process -WorkingDirectory $backendDir -FilePath "powershell" -ArgumentList "-NoExit","-Command","npm run dev"
Start-Process -WorkingDirectory $frontendDir -FilePath "powershell" -ArgumentList "-NoExit","-Command","npm run dev"