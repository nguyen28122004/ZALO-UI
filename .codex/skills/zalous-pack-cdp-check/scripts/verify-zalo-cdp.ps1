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

& node @args
exit $LASTEXITCODE
