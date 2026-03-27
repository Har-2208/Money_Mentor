param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$candidateRoot = Split-Path -Parent $scriptDir
if ((Test-Path (Join-Path $candidateRoot "backend")) -and (Test-Path (Join-Path $candidateRoot "frontend"))) {
    $root = $candidateRoot
}
else {
    $root = $scriptDir
}

$backendDir = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"
$venvDir = Join-Path $root ".venv"
$venvActivate = Join-Path $venvDir "Scripts\Activate.ps1"
$backendRequirementsFile = Join-Path $backendDir "requirements.txt"

if (Test-Path $backendRequirementsFile) {
    $requirementsFile = $backendRequirementsFile
}
elseif (Test-Path $localRequirementsFile) {
    $requirementsFile = $localRequirementsFile
}
else {
    throw "No requirements.txt found in backend/ or project setup/."
}
$backendEnvFile = Join-Path $backendDir ".env"
$backendEnvExample = Join-Path $backendDir ".env.example"
$backendHealthUrl = "http://127.0.0.1:8000/"
$backendApiUrl = "http://127.0.0.1:8000/"
$frontendUrl = "http://127.0.0.1:5173/"

function Assert-CommandExists {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found in PATH."
    }
}

function Wait-UrlReady {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 60,
        [int]$RetryIntervalSeconds = 2
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        }
        catch {
            # Server may not be ready yet.
        }
        Start-Sleep -Seconds $RetryIntervalSeconds
    }

    return $false
}

Assert-CommandExists -Name "npm"
Assert-CommandExists -Name "py"

if (-not (Test-Path $venvDir)) {
    Write-Host "Creating Python virtual environment at .venv..."
    py -m venv $venvDir
}

if (-not (Test-Path $backendEnvFile) -and (Test-Path $backendEnvExample)) {
    Copy-Item $backendEnvExample $backendEnvFile
    Write-Host "Created backend/.env from backend/.env.example. Update API keys before using all features."
}

if (-not $SkipInstall) {
    Write-Host "Installing backend dependencies..."
    & $venvActivate
    python -m pip install --upgrade pip
    pip install -r $requirementsFile

    Write-Host "Installing frontend dependencies..."
    Push-Location $frontendDir
    npm install
    Pop-Location
}

$backendCommand = "Set-Location '$root'; & '$venvActivate'; python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000"
$frontendCommand = "Set-Location '$frontendDir'; npm run dev"

Write-Host "Starting backend in a new PowerShell window..."
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $backendCommand)

Write-Host "Starting frontend in a new PowerShell window..."
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $frontendCommand)

Write-Host "Waiting for backend to become reachable..."
$backendReady = Wait-UrlReady -Url $backendHealthUrl -TimeoutSeconds 60 -RetryIntervalSeconds 2

Write-Host "Waiting for frontend to become reachable..."
$frontendReady = Wait-UrlReady -Url $frontendUrl -TimeoutSeconds 90 -RetryIntervalSeconds 2

if ($backendReady) {
    Write-Host "Backend is up."
}
else {
    Write-Host "Backend did not become reachable in time."
}

if ($frontendReady) {
    Start-Process $frontendUrl
}
else {
    Write-Host "Frontend did not become reachable in time."
}

Write-Host "Done."
Write-Host "Backend API: $backendApiUrl"
Write-Host "Frontend: $frontendUrl"