# Smoke test for deployed backend (Render or any public URL)
# Usage:
#   .\render-health-check.ps1 -BackendUrl https://your-backend.onrender.com
#   .\render-health-check.ps1 -BackendUrl https://your-backend.onrender.com -FrontendOrigin https://your-frontend.onrender.com

param(
  [Parameter(Mandatory = $true)]
  [string]$BackendUrl,

  [Parameter(Mandatory = $false)]
  [string]$FrontendOrigin
)

$ErrorActionPreference = "Stop"

function Normalize-BaseUrl {
  param([string]$Url)
  return $Url.Trim().TrimEnd('/')
}

function Invoke-EndpointCheck {
  param(
    [string]$Url,
    [hashtable]$Headers
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -Headers $Headers -TimeoutSec 15
    return @{
      Ok = $true
      StatusCode = [int]$response.StatusCode
      Headers = $response.Headers
      Body = $response.Content
      Error = $null
    }
  } catch {
    $statusCode = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    return @{
      Ok = $false
      StatusCode = $statusCode
      Headers = @{}
      Body = $null
      Error = $_.Exception.Message
    }
  }
}

$baseUrl = Normalize-BaseUrl -Url $BackendUrl
$headers = @{}
if ($FrontendOrigin) {
  $headers["Origin"] = $FrontendOrigin
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host " Render Backend Smoke Test" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Backend URL: $baseUrl" -ForegroundColor Gray
if ($FrontendOrigin) {
  Write-Host "Origin test: $FrontendOrigin" -ForegroundColor Gray
}

$health = Invoke-EndpointCheck -Url "$baseUrl/health" -Headers $headers
if ($health.Ok) {
  Write-Host "[OK] GET /health => $($health.StatusCode)" -ForegroundColor Green
} else {
  Write-Host "[FAIL] GET /health => $($health.StatusCode)" -ForegroundColor Red
  Write-Host "      $($health.Error)"
}

$landing = Invoke-EndpointCheck -Url "$baseUrl/api/public/landing-features" -Headers $headers
if ($landing.Ok) {
  Write-Host "[OK] GET /api/public/landing-features => $($landing.StatusCode)" -ForegroundColor Green
} else {
  Write-Host "[FAIL] GET /api/public/landing-features => $($landing.StatusCode)" -ForegroundColor Red
  Write-Host "      $($landing.Error)"
}

if ($FrontendOrigin) {
  $corsHeader = $health.Headers["Access-Control-Allow-Origin"]
  if ($corsHeader) {
    Write-Host "[OK] CORS header returned: $corsHeader" -ForegroundColor Green
  } else {
    Write-Host "[WARN] No Access-Control-Allow-Origin header detected on /health" -ForegroundColor Yellow
  }
}

Write-Host "===============================================" -ForegroundColor Cyan
if ($health.Ok -and $landing.Ok) {
  Write-Host " Deploy smoke test: PASS" -ForegroundColor Green
  exit 0
}

Write-Host " Deploy smoke test: FAIL" -ForegroundColor Red
exit 1
