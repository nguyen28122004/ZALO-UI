param(
  [int]$Port = 9222,
  [string]$TargetMatch = 'Zalo',
  [Parameter(Mandatory = $true)][string]$FilePath,
  [int]$TimeoutMs = 7000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'cdp-eval-file.mjs'
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "Khong tim thay script: $scriptPath"
}

$args = @(
  $scriptPath,
  '--port', "$Port",
  '--target-match', "$TargetMatch",
  '--file', "$FilePath",
  '--timeout-ms', "$TimeoutMs"
)

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
  $nodeExe = $nodeCmd.Source
} else {
  $fallbackNodeExe = @(
    "$env:LOCALAPPDATA\Programs\nodejs-portable\node-v20.20.2-win-x64\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    'C:\Program Files\nodejs\node.exe',
    'C:\Program Files (x86)\nodejs\node.exe'
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

  if (-not $fallbackNodeExe) {
    throw 'Khong tim thay node.exe. Hay cai Node.js hoac them node vao PATH.'
  }
  $nodeExe = $fallbackNodeExe
}

& $nodeExe --experimental-websocket @args
exit $LASTEXITCODE
