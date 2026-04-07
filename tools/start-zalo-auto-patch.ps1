param(
  [int]$Port = 9222,
  [string]$ZaloExe = "$env:LOCALAPPDATA\Programs\Zalo\Zalo.exe",
  [string]$CssPath = '.\themes\zalo-green.css',
  [int]$Retry = 45,
  [int]$DelayMs = 1200,
  [switch]$KillExisting
)

$ErrorActionPreference = 'Stop'

function Get-ZaloCandidates {
  param([string]$Preferred)

  $candidates = New-Object System.Collections.Generic.List[string]

  if ($Preferred -and (Test-Path -LiteralPath $Preferred)) {
    $null = $candidates.Add((Resolve-Path -LiteralPath $Preferred).Path)
  }

  $installRoot = "$env:LOCALAPPDATA\Programs\Zalo"
  $rootExe = Join-Path $installRoot 'Zalo.exe'
  if (Test-Path -LiteralPath $rootExe) {
    $null = $candidates.Add((Resolve-Path -LiteralPath $rootExe).Path)
  }

  if (Test-Path -LiteralPath $installRoot) {
    $versioned = Get-ChildItem -LiteralPath $installRoot -Directory -Filter 'Zalo-*' |
      Sort-Object LastWriteTime -Descending

    foreach ($dir in $versioned) {
      $exe = Join-Path $dir.FullName 'Zalo.exe'
      if (Test-Path -LiteralPath $exe) {
        $null = $candidates.Add((Resolve-Path -LiteralPath $exe).Path)
      }
    }
  }

  # Distinct keep order
  $seen = @{}
  $distinct = foreach ($p in $candidates) {
    if (-not $seen.ContainsKey($p)) {
      $seen[$p] = $true
      $p
    }
  }

  return @($distinct)
}

function Wait-DebugEndpoint {
  param([int]$DebugPort, [int]$Loop, [int]$SleepMs)

  for ($i = 1; $i -le $Loop; $i++) {
    try {
      $null = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json/version" -Method Get -TimeoutSec 2
      return $true
    }
    catch {
      Start-Sleep -Milliseconds $SleepMs
    }
  }

  return $false
}

if ($KillExisting) {
  Get-Process -Name Zalo,ZaloCall,ZaloCap -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Milliseconds 800
}

if (-not (Test-Path -LiteralPath $CssPath)) {
  throw "Khong tim thay file CSS: $CssPath"
}

$targets = Get-ZaloCandidates -Preferred $ZaloExe
if ($targets.Count -eq 0) {
  throw 'Khong tim thay Zalo.exe de khoi dong.'
}

$launched = $false
$selectedExe = $null

foreach ($exe in $targets) {
  Write-Host "Thu mo Zalo: $exe"

  try {
    Start-Process -FilePath $exe -ArgumentList "--remote-debugging-port=$Port" | Out-Null
  }
  catch {
    Write-Host "Khong mo duoc: $exe"
    continue
  }

  if (Wait-DebugEndpoint -DebugPort $Port -Loop $Retry -SleepMs $DelayMs) {
    $launched = $true
    $selectedExe = $exe
    break
  }

  Write-Host 'CDP chua san sang, thu binary khac...'
  Get-Process -Name Zalo,ZaloCall,ZaloCap -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Milliseconds 800
}

if (-not $launched) {
  throw "Khong the mo Zalo voi remote debugging tren port $Port. Hay mo Zalo thu cong va dam bao argument --remote-debugging-port=$Port duoc ap dung."
}

Write-Host "Da bat CDP bang: $selectedExe"
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port $Port -CssPath $CssPath | Out-Host
Write-Host 'Auto patch done.'
