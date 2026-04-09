param(
  [int]$Port = 9222,
  [string]$TargetMatch = 'Zalo',
  [string]$ExpectedActiveTheme = '',
  [string]$ExpectedThemePackAttr = '',
  [string]$Selector = '',
  [string]$MustIncludeCss = '',
  [string]$MustExcludeCss = '',
  [switch]$SkipRequireZalous,
  [int]$TimeoutMs = 7000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'verify-zalo-cdp.mjs'
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "Khong tim thay script: $scriptPath"
}

$args = @(
  $scriptPath,
  '--port', "$Port",
  '--target-match', "$TargetMatch",
  '--timeout-ms', "$TimeoutMs"
)

if ($ExpectedActiveTheme) { $args += @('--expected-active-theme', "$ExpectedActiveTheme") }
if ($ExpectedThemePackAttr) { $args += @('--expected-theme-pack-attr', "$ExpectedThemePackAttr") }
if ($Selector) { $args += @('--selector', "$Selector") }
if ($MustIncludeCss) { $args += @('--must-include-css', "$MustIncludeCss") }
if ($MustExcludeCss) { $args += @('--must-exclude-css', "$MustExcludeCss") }
if ($SkipRequireZalous.IsPresent) { $args += '--skip-require-zalous' }

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

