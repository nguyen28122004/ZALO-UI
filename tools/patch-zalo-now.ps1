param(
  [int]$Port = 9222,
  [ValidateSet('green','pink','blue','purple','orange')]
  [string]$Theme = 'green',
  [string]$CssPath = '',
  [string]$TargetMatch = 'Zalo',
  [switch]$ClearFirst
)

$ErrorActionPreference = 'Stop'

if (-not $CssPath) {
  $CssPath = ".\\themes\\zalo-$Theme.css"
}

if (-not (Test-Path -LiteralPath $CssPath)) {
  throw "Khong tim thay file CSS: $CssPath"
}

try {
  $null = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/version" -Method Get -TimeoutSec 2
}
catch {
  throw "CDP chua san sang tren http://127.0.0.1:$Port"
}

if ($ClearFirst) {
  powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action clear -Port $Port -TargetMatch $TargetMatch | Out-Host
  Start-Sleep -Milliseconds 120
}

powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port $Port -CssPath $CssPath -TargetMatch $TargetMatch | Out-Host
Write-Host "Patch done. Theme: $Theme"
