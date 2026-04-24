param(
  [int]$Port = 9222,
  [string]$TargetMatch = 'Zalo',
  [string]$OutDir = 'artifacts/theme-cycle-round11',
  [int]$WaitMs = 1400
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
  $json = $payload | ConvertTo-Json -Depth 40 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $segment = [System.ArraySegment[byte]]::new($bytes)
  $null = $Socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
}

function Receive-CdpMessage {
  param([System.Net.WebSockets.ClientWebSocket]$Socket)
  $buffer = New-Object byte[] 1048576
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

if (-not (Test-Path -LiteralPath $OutDir)) { New-Item -ItemType Directory -Path $OutDir | Out-Null }
$target = Get-Target -DebugPort $Port -Match $TargetMatch
$ws = [System.Net.WebSockets.ClientWebSocket]::new()

try {
  $ws.ConnectAsync([Uri]$target.webSocketDebuggerUrl, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
  $nextId = 1
  Send-CdpCommand -Socket $ws -Id $nextId -Method 'Runtime.enable' -Params @{}
  $nextId++
  Send-CdpCommand -Socket $ws -Id $nextId -Method 'Page.enable' -Params @{}
  $nextId++

  $listExpr = @"
(() => {
  if (!window.zalous || typeof window.zalous.getState !== 'function') return { error: 'no-zalous-api' };
  const st = window.zalous.getState();
  const themes = Array.isArray(st.themes) ? st.themes : [];
  const packs = Array.isArray(st.themePacks) ? st.themePacks : [];
  return { keys: [...themes, ...packs].filter((k) => !String(k).includes('hello-kitty')) };
})()
"@
  $keys = @()
  $listDeadline = (Get-Date).AddSeconds(35)
  while ((Get-Date) -lt $listDeadline) {
    $listId = $nextId
    Send-CdpCommand -Socket $ws -Id $listId -Method 'Runtime.evaluate' -Params @{
      expression = $listExpr
      returnByValue = $true
      awaitPromise = $true
    }
    $nextId++

    $listResp = $null
    $deadline = (Get-Date).AddSeconds(5)
    while ((Get-Date) -lt $deadline) {
      $msg = Receive-CdpMessage -Socket $ws | ConvertFrom-Json
      $idProp = $msg.PSObject.Properties['id']
      if ($idProp -and $idProp.Value -eq $listId) {
        $listResp = $msg
        break
      }
    }
    if ($listResp -and $listResp.result -and $listResp.result.result -and $listResp.result.result.value) {
      $val = $listResp.result.result.value
      if ($val.keys) {
        $keys = @($val.keys)
        if ($keys.Count -gt 0) { break }
      }
    }
    Start-Sleep -Milliseconds 800
  }
  if (-not $keys -or $keys.Count -eq 0) { throw 'No themes found in runtime state (zalous api not ready)' }

  $results = @()
  $idx = 0
  foreach ($k in $keys) {
    $idx++
    $safe = ($k -replace '[^a-zA-Z0-9._-]', '-').ToLower()
    $png = Join-Path $OutDir ("{0:D2}-{1}.png" -f $idx, $safe)
    $themeLiteral = "'" + ($k -replace '\\', '\\\\' -replace "'", "\\'") + "'"
    $expr = @"
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (!window.zalous || typeof window.zalous.setTheme !== 'function') return { error: 'no-setTheme-api' };
  const themeKey = $themeLiteral;
  window.zalous.enablePatch(true);
  window.zalous.setTheme(themeKey);
  await sleep($WaitMs);

  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const scrollFirst = (selectors, amount = 180) => {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (!node) continue;
      const before = node.scrollTop || 0;
      try { node.scrollTop = before + amount; } catch (_) {}
      try { node.dispatchEvent(new Event('scroll', { bubbles: true })); } catch (_) {}
      return { selector, before, after: node.scrollTop || 0 };
    }
    return null;
  };
  const chatTargets = ['nguyen bui','bui nguyen'];
  const chatItems = Array.from(document.querySelectorAll('.msg-item,[class*="conversation"],[class*="chat-item"]'));
  const chat = chatItems.find((el) => chatTargets.some((t) => norm(el.textContent || '').includes(t)));
  if (chat) { chat.click(); await sleep(450); }
  const conversationScroll = scrollFirst(['#conversationListId', '[class*="conversation-list"]', '[class*="chat-list"]'], 160);

  let marketOpened = false;
  let marketScroll = null;
  if (window.zalous && typeof window.zalous.openMarket === 'function') {
    window.zalous.openMarket();
    await sleep(300);
    const modal = document.querySelector('#zalous-market-modal');
    marketOpened = !!(modal && getComputedStyle(modal).display !== 'none');
    marketScroll = scrollFirst(['#zalous-market-modal .zalous-market-grid', '#zalous-market-modal .zalous-market-list'], 180);
    const closeBtn = document.querySelector('#zalous-market-close');
    if (closeBtn) { closeBtn.click(); await sleep(220); }
  }

  let emailOpened = false;
  let emailRowClicked = false;
  let emailScroll = null;
  const emailItem = document.querySelector('#zalous-email-prototype-item');
  if (emailItem) {
    emailItem.click();
    await sleep(420);
    emailOpened = !!document.querySelector('.zalous-email-prototype-main');
    const row = document.querySelector('.zalous-email-prototype-main .mail-row');
    if (row) {
      row.click();
      await sleep(280);
      emailRowClicked = true;
    }
    emailScroll = scrollFirst(['.zalous-email-prototype-main .mail-body', '.zalous-email-prototype-main .mail-list'], 180);
  }

  const marketBtn = document.querySelector('#zalous-market-btn');
  if (marketBtn) {
    const rect = marketBtn.getBoundingClientRect();
    marketBtn.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    marketBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    marketBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    marketBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await sleep(200);
    const closeBtn2 = document.querySelector('#zalous-market-close');
    if (closeBtn2) closeBtn2.click();
    await sleep(120);
    if (!marketOpened) {
      const modal2 = document.querySelector('#zalous-market-modal');
      marketOpened = !!(modal2 && getComputedStyle(modal2).display !== 'none');
    }
  }

  const emailMain = document.querySelector('.zalous-email-prototype-main');
  const marketCard = document.querySelector('#zalous-market-card');
  const emailRow = document.querySelector('.zalous-email-prototype-main .mail-row');
  let blurPresetResults = [];
  if (window.zalous && typeof window.zalous.setExtensionConfig === 'function' && typeof window.zalous.getExtensionConfig === 'function') {
    const previousBlurConfig = window.zalous.getExtensionConfig('blur-elements');
    const presets = ['preview', 'name-preview', 'message-body', 'privacy', 'off'];
    const targetSelectors = {
      preview: '.z-conv-message__preview-message,.conv-item-body__main,.conv-message.truncate',
      'name-preview': '.conv-item-title__name,.z-conv-message__preview-message,.conv-item-body__main,.conv-message.truncate',
      'message-body': '.message-content-wrapper',
      privacy: '.conv-item-title__name,.z-conv-message__preview-message,.conv-item-body__main,.conv-message.truncate,.message-content-wrapper',
      off: ''
    };
    for (const preset of presets) {
      window.zalous.setExtensionConfig('blur-elements', { preset, blurRadius: 6, revealOnHover: true });
      await sleep(180);
      const style = document.querySelector('#zalous-blur-elements-style');
      const styleText = style ? (style.textContent || '') : '';
      const sample = targetSelectors[preset] ? document.querySelector(targetSelectors[preset]) : null;
      let revealFilterBefore = '';
      let revealFilterAfter = '';
      if (sample) {
        revealFilterBefore = getComputedStyle(sample).filter || '';
        sample.setAttribute('data-zalous-blur-reveal', '1');
        await sleep(240);
        revealFilterAfter = getComputedStyle(sample).filter || '';
        sample.removeAttribute('data-zalous-blur-reveal');
      }
      blurPresetResults.push({
        preset,
        attr: document.documentElement.getAttribute('data-zalous-blur-preset') || '',
        styleLength: styleText.length,
        previewCount: document.querySelectorAll('.z-conv-message__preview-message,.conv-item-body__main,.conv-message.truncate').length,
        nameCount: document.querySelectorAll('.conv-item-title__name').length,
        bodyCount: document.querySelectorAll('.message-content-wrapper').length,
        hoverRulePresent: styleText.includes(':hover') || styleText.includes(':focus-within'),
        revealFilterBefore,
        revealFilterAfter,
        revealWorks: preset === 'off' ? true : (!sample || revealFilterAfter === 'none' || revealFilterAfter === ''),
        protectsZalousUi: styleText.includes('#zalous-controls') && styleText.includes('#zalous-market-modal') && styleText.includes('.zalous-email-prototype-main')
      });
    }
    const legacyMap = { off: 'off', content: 'preview', name: 'name-preview', all: 'privacy' };
    const restorePreset = (previousBlurConfig && previousBlurConfig.preset) || legacyMap[(previousBlurConfig && previousBlurConfig.mode) || ''] || 'preview';
    window.zalous.setExtensionConfig('blur-elements', Object.assign({}, previousBlurConfig || {}, { preset: restorePreset }));
    await sleep(180);
  }

  return {
    themeKey,
    activeTheme: (window.zalous.getState().config || {}).activeTheme || '',
    themePackAttr: document.documentElement.getAttribute('data-zalous-theme-pack') || '',
    chatPicked: chat ? (chat.textContent || '').trim().slice(0, 80) : '',
    conversationScroll,
    marketOpened,
    marketScroll,
    emailOpened,
    emailRowClicked,
    emailScroll,
    blurPresetResults,
    mainBg: getComputedStyle(document.body).backgroundColor,
    mainColor: getComputedStyle(document.body).color,
    navBg: (() => {
      const n = document.querySelector('#main-tab,[id*="main-tab"],[class*="main-tab"],.nav__tabs,.nav__tabs__top');
      return n ? getComputedStyle(n).backgroundColor : '';
    })(),
    marketBg: marketCard ? getComputedStyle(marketCard).backgroundColor : '',
    marketBorder: marketCard ? getComputedStyle(marketCard).borderColor : '',
    emailBg: emailMain ? getComputedStyle(emailMain).backgroundColor : '',
    emailRowBg: emailRow ? getComputedStyle(emailRow).backgroundColor : ''
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

    $state = $null
    $deadline2 = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline2) {
      $msg = Receive-CdpMessage -Socket $ws | ConvertFrom-Json
      $idProp = $msg.PSObject.Properties['id']
      if ($idProp -and $idProp.Value -eq $evalId) {
        $state = $msg.result.result.value
        break
      }
    }
    if (-not $state) { throw "No eval response for theme $k" }

    $shotId = $nextId
    Send-CdpCommand -Socket $ws -Id $shotId -Method 'Page.captureScreenshot' -Params @{
      format = 'png'
      fromSurface = $true
    }
    $nextId++
    $shot = $null
    $deadline3 = (Get-Date).AddSeconds(20)
    while ((Get-Date) -lt $deadline3) {
      $msg = Receive-CdpMessage -Socket $ws | ConvertFrom-Json
      $idProp = $msg.PSObject.Properties['id']
      if ($idProp -and $idProp.Value -eq $shotId) {
        $shot = $msg.result.data
        break
      }
    }
    if (-not $shot) { throw "No screenshot response for theme $k" }
    [System.IO.File]::WriteAllBytes([System.IO.Path]::GetFullPath($png), [Convert]::FromBase64String($shot))

    $results += [pscustomobject]@{
      theme = $k
      screenshot = [System.IO.Path]::GetFullPath($png)
      activeTheme = $state.activeTheme
      themePackAttr = $state.themePackAttr
      chatPicked = $state.chatPicked
      conversationScroll = $state.conversationScroll
      marketOpened = $state.marketOpened
      marketScroll = $state.marketScroll
      emailOpened = $state.emailOpened
      emailRowClicked = $state.emailRowClicked
      emailScroll = $state.emailScroll
      blurPresetResults = $state.blurPresetResults
      mainBg = $state.mainBg
      navBg = $state.navBg
      mainColor = $state.mainColor
      marketBg = $state.marketBg
      marketBorder = $state.marketBorder
      emailBg = $state.emailBg
      emailRowBg = $state.emailRowBg
    }
  }

  $results | ConvertTo-Json -Depth 7
}
finally {
  try { $ws.Dispose() } catch {}
}
