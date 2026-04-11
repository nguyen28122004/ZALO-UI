param(
  [int]$Port = 9222,
  [string]$TargetMatch = 'Zalo',
  [string]$ScreenshotPath = '',
  [int]$WaitMs = 2200,
  [string]$BridgeUrl = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Target {
  param([int]$DebugPort, [string]$Match)
  $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json/list" -Method Get
  $pages = @($targets | Where-Object { $_.type -eq 'page' -and $_.webSocketDebuggerUrl })
  if ($Match) {
    $hit = @($pages | Where-Object { $_.title -like "*$Match*" -or $_.url -like "*$Match*" })
    if ($hit.Count -gt 0) { return $hit[0] }
  }
  if ($pages.Count -eq 0) { throw "No page target on port $DebugPort" }
  return $pages[0]
}

function Send-CdpCommand {
  param(
    [System.Net.WebSockets.ClientWebSocket]$Socket,
    [int]$Id,
    [string]$Method,
    [hashtable]$Params
  )
  $payload = @{ id = $Id; method = $Method }
  if ($Params) { $payload.params = $Params }
  $json = $payload | ConvertTo-Json -Depth 20 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $segment = [System.ArraySegment[byte]]::new($bytes)
  $null = $Socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
}

function Receive-CdpMessage {
  param([System.Net.WebSockets.ClientWebSocket]$Socket)
  $buffer = New-Object byte[] 524288
  $ms = New-Object System.IO.MemoryStream
  while ($true) {
    $segment = [System.ArraySegment[byte]]::new($buffer)
    $result = $Socket.ReceiveAsync($segment, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
    if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
      throw 'CDP websocket closed unexpectedly'
    }
    if ($result.Count -gt 0) { $ms.Write($buffer, 0, $result.Count) }
    if ($result.EndOfMessage) {
      $text = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
      $ms.Dispose()
      return $text
    }
  }
}

$target = Get-Target -DebugPort $Port -Match $TargetMatch
$ws = [System.Net.WebSockets.ClientWebSocket]::new()

try {
  $ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
  $nextId = 1
  Send-CdpCommand -Socket $ws -Id $nextId -Method 'Runtime.enable' -Params @{}
  $nextId++
  Send-CdpCommand -Socket $ws -Id $nextId -Method 'Page.enable' -Params @{}
  $nextId++
  $bridgeJs = "'" + ($BridgeUrl -replace '\\', '\\\\' -replace "'", "\\'") + "'"

  $expr = @"
(async () => {
  let extReload = null;
  try {
    if (window.zalous && typeof window.zalous.reloadExtensions === 'function') {
      extReload = window.zalous.reloadExtensions();
    }
  } catch (e) {
    extReload = { error: String(e && e.message ? e.message : e) };
  }
  const bridgeUrl = $bridgeJs;
  if (bridgeUrl) {
    try {
      const key = 'zalous.config.v1';
      const raw = localStorage.getItem(key);
      const cfg = raw ? JSON.parse(raw) : {};
      if (!cfg.extensionConfigs || typeof cfg.extensionConfigs !== 'object') cfg.extensionConfigs = {};
      if (!cfg.extensionConfigs['email-prototype.js'] || typeof cfg.extensionConfigs['email-prototype.js'] !== 'object') cfg.extensionConfigs['email-prototype.js'] = {};
      cfg.extensionConfigs['email-prototype.js'].bridgeUrl = bridgeUrl;
      localStorage.setItem(key, JSON.stringify(cfg));
    } catch (_) {}
  }
  const item = document.getElementById('zalous-email-prototype-item');
  const hasItem = !!item;
  if (item) item.click();
  await new Promise((r) => setTimeout(r, 450));
  const reconnect = document.querySelector('[data-act="reconnect"]');
  if (reconnect) reconnect.click();
  await new Promise((r) => setTimeout(r, $WaitMs));
  const chip = document.querySelector('.mail-chip')?.textContent?.trim() || '';
  const rows = [...document.querySelectorAll('.mail-row .mail-subject')].map((n) => (n.textContent || '').trim()).filter(Boolean);
  const folderCount = document.querySelectorAll('.mail-folder').length;
  const mutedTexts = [...document.querySelectorAll('.mail-muted')].map((n) => (n.textContent || '').trim()).filter(Boolean);
  const notice = mutedTexts[0] || '';
  let bridgeUrlLocal = '';
  let enabledExts = [];
  try {
    const rawCfg = localStorage.getItem('zalous.config.v1');
    const parsed = rawCfg ? JSON.parse(rawCfg) : {};
    bridgeUrlLocal = (((parsed || {}).extensionConfigs || {})['email-prototype.js'] || {}).bridgeUrl || '';
    enabledExts = Array.isArray((parsed || {}).enabledExtensions) ? parsed.enabledExtensions.slice() : [];
  } catch (_) {}
  const c = document.querySelector('#conversationList .ReactVirtualized__Grid__innerScrollContainer') || document.querySelector('.ReactVirtualized__Grid__innerScrollContainer');
  const msgItems = [...document.querySelectorAll('.msg-item')].slice(0, 8).map((n) => ({ top: n.style.top || '', height: n.style.height || '' }));
  return {
    hasZalousApi: !!window.zalous,
    hasRuntimeTag: !!document.getElementById('zalous-runtime'),
    hasPayloadTag: !!document.getElementById('zalous-payload'),
    hasItem,
    hasEmailMain: !!document.querySelector('.zalous-email-prototype-main'),
    extReload,
    chip,
    folderCount,
    rowCount: rows.length,
    firstSubjects: rows.slice(0, 5),
    hasDemoChip: /demo mailbox/i.test(chip),
    notice,
    mutedTexts,
    enabledExts,
    bridgeUrlLocal,
    containerHeight: c ? (c.style.height || '') : '',
    msgItems
  };
})()
"@

  $evalId = $nextId
  Send-CdpCommand -Socket $ws -Id $evalId -Method 'Runtime.evaluate' -Params @{
    expression = $expr
    awaitPromise = $true
    returnByValue = $true
  }
  $nextId++

  $deadline = (Get-Date).AddSeconds(15)
  $state = $null
  while ((Get-Date) -lt $deadline) {
    $msg = Receive-CdpMessage -Socket $ws | ConvertFrom-Json
    $msgIdProp = $msg.PSObject.Properties['id']
    if ($msgIdProp -and $msgIdProp.Value -eq $evalId) {
      $state = $msg.result.result.value
      break
    }
  }
  if (-not $state) { throw 'No Runtime.evaluate response' }

  if ($ScreenshotPath) {
    $shotId = $nextId
    Send-CdpCommand -Socket $ws -Id $shotId -Method 'Page.captureScreenshot' -Params @{ format = 'png'; fromSurface = $true }
    $deadline2 = (Get-Date).AddSeconds(15)
    $shot = $null
    while ((Get-Date) -lt $deadline2) {
      $msg = Receive-CdpMessage -Socket $ws | ConvertFrom-Json
      $msgIdProp = $msg.PSObject.Properties['id']
      if ($msgIdProp -and $msgIdProp.Value -eq $shotId) {
        $shot = $msg.result.data
        break
      }
    }
    if (-not $shot) { throw 'No Page.captureScreenshot response' }
    $fullShotPath = [System.IO.Path]::GetFullPath($ScreenshotPath)
    $dir = Split-Path -Parent $fullShotPath
    if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    [System.IO.File]::WriteAllBytes($fullShotPath, [Convert]::FromBase64String($shot))
  }

  $state | ConvertTo-Json -Depth 10
}
finally {
  try { $ws.Dispose() } catch {}
}
