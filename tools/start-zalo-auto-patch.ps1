param(
  [int]$Port = 9222,
  [string]$ZaloExe = 'C:\Users\Lien\AppData\Local\Programs\Zalo\Zalo.exe',
  [string]$CssPath = '.\themes\zalo-green.css',
  [int]$Retry = 30,
  [int]$DelayMs = 1200,
  [switch]$KillExisting
)

$ErrorActionPreference = 'Stop'

if ($KillExisting) {
  Get-Process -Name Zalo,ZaloCall,ZaloCap -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Milliseconds 800
}

Start-Process -FilePath $ZaloExe -ArgumentList "--remote-debugging-port=$Port"

$ok = $false
for ($i = 1; $i -le $Retry; $i++) {
  try {
    $null = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -Method Get -TimeoutSec 2
    powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port $Port -CssPath $CssPath | Out-Host
    $ok = $true
    break
  }
  catch {
    Start-Sleep -Milliseconds $DelayMs
  }
}

if (-not $ok) {
  throw "Khong the auto patch sau $Retry lan thu"
}

Write-Host 'Auto patch done.'
