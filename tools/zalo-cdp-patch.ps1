param(
  [ValidateSet('apply','clear')]
  [string]$Action = 'apply',
  [int]$Port = 9222,
  [string]$CssPath = '.\themes\zalo-green.css',
  [string]$TargetMatch = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-Target {
  param([int]$DebugPort, [string]$Match)

  $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$DebugPort/json/list" -Method Get
  if (-not $targets) {
    throw "Khong co target nao tren port $DebugPort"
  }

  $candidates = @($targets | Where-Object {
    $_.type -eq 'page' -and $_.webSocketDebuggerUrl
  })

  if ($Match) {
    $filtered = @($candidates | Where-Object {
      ($_.title -like "*$Match*") -or ($_.url -like "*$Match*")
    })
    if ($filtered.Count -gt 0) { return $filtered[0] }
  }

  if ($candidates.Count -eq 0) {
    throw "Khong tim thay target page hop le tren port $DebugPort"
  }

  return $candidates[0]
}

function Send-CdpCommand {
  param(
    [System.Net.WebSockets.ClientWebSocket]$Socket,
    [int]$Id,
    [string]$Method,
    [hashtable]$Params
  )

  $payload = @{ id = $Id; method = $Method }
  if ($Params) { $payload['params'] = $Params }

  $json = $payload | ConvertTo-Json -Depth 20 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $segment = [System.ArraySegment[byte]]::new($bytes)
  $null = $Socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
}

function Receive-CdpMessage {
  param([System.Net.WebSockets.ClientWebSocket]$Socket)

  $buffer = New-Object byte[] 65536
  $ms = New-Object System.IO.MemoryStream

  while ($true) {
    $segment = [System.ArraySegment[byte]]::new($buffer)
    $result = $Socket.ReceiveAsync($segment, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()

    if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
      throw 'CDP websocket dong bat ngo'
    }

    if ($result.Count -gt 0) {
      $ms.Write($buffer, 0, $result.Count)
    }

    if ($result.EndOfMessage) {
      $text = [System.Text.Encoding]::UTF8.GetString($ms.ToArray())
      $ms.Dispose()
      return $text
    }
  }
}

function Invoke-Cdp {
  param([int]$DebugPort, [string]$Mode, [string]$ThemeCssPath, [string]$Match)

  $target = Get-Target -DebugPort $DebugPort -Match $Match
  Write-Host "Target: $($target.title) [$($target.url)]"

  $ws = [System.Net.WebSockets.ClientWebSocket]::new()
  try {
    $uri = [Uri]$target.webSocketDebuggerUrl
    $null = $ws.ConnectAsync($uri, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()

    $nextId = 1
    Send-CdpCommand -Socket $ws -Id $nextId -Method 'Runtime.enable' -Params @{}
    $nextId++

    Send-CdpCommand -Socket $ws -Id $nextId -Method 'Page.enable' -Params @{}
    $nextId++

    $script = ''
    if ($Mode -eq 'apply') {
      if (-not (Test-Path -LiteralPath $ThemeCssPath)) {
        throw "Khong tim thay file CSS: $ThemeCssPath"
      }

      [string]$css = Get-Content -LiteralPath $ThemeCssPath -Raw
      $cssBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($css))

      $script = @"
(() => {
  const STYLE_ID = 'zalo-runtime-patch';
  const CTRL_ID = 'zalo-theme-controls';
  const LOCK_STYLE_ID = 'zalo-lock-pin-style';
  const cssText = atob('$cssBase64');

  function applyTheme() {
    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = window.__zaloThemeCss || cssText;
    return tag.textContent.length;
  }

  function clearTheme() {
    const tag = document.getElementById(STYLE_ID);
    if (tag) tag.remove();
  }

  function ensureLockPinStyle() {
    let style = document.getElementById(LOCK_STYLE_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = LOCK_STYLE_ID;
      document.head.appendChild(style);
    }

    style.textContent = [
      '.zalo-lock-pin-host {',
      '  display: flex;',
      '  justify-content: center;',
      '  align-items: center;',
      '  width: 220px;',
      '  max-width: 82vw;',
      '  height: 40px;',
      '  margin: 0 auto;',
      '  border: 1px solid var(--border, #b8cfc1);',
      '  border-radius: 12px;',
      '  background: #fff;',
      '  cursor: text;',
      '  box-sizing: border-box;',
      '}',
      '.zalo-lock-pin-dots {',
      '  display: grid;',
      '  grid-template-columns: repeat(4, 1fr);',
      '  gap: 14px;',
      '  align-items: center;',
      '}',
      '.zalo-lock-pin-dot {',
      '  width: 10px;',
      '  height: 10px;',
      '  border-radius: 999px;',
      '  background: #c9ddd1;',
      '  transform: scale(1);',
      '  transition: transform .15s ease, background-color .15s ease;',
      '}',
      '.zalo-lock-pin-dot.is-filled {',
      '  background: #2f7a49;',
      '  transform: scale(1.14);',
      '}',
      '.dark .app-lock__main__input.zalo-lock-hidden-input,',
      '.app-lock__main__input.zalo-lock-hidden-input {',
      '  position: absolute !important;',
            '  opacity: 0 !important;',
      '  pointer-events: none !important;',
                        '  z-index: 1 !important;',
      '  color: transparent !important;',
      '  caret-color: transparent !important;',
      '  font-size: 28px !important;',
      '  letter-spacing: 16px !important;',
      '  background: transparent !important;',
      '  box-shadow: none !important;',
      '}'
    ].join('\\n');
  }

  function isElementVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) < 0.05) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false;
    if (!el.getClientRects || el.getClientRects().length === 0) return false;
    return true;
  }

  function enhanceLockInput(input) {
    if (!input) return false;

    const parent = input.parentElement;
    if (!parent) return false;

    const hint = ((input.id || '') + ' ' + (input.className || '') + ' ' + (input.placeholder || '')).toLowerCase();
    const isLockLike = input.type === 'password' || hint.includes('passcode') || hint.includes('mã khóa') || hint.includes('ma khoa') || hint.includes('lock');
    if (!isLockLike) return false;

    // Remove stale hosts from older patches in this container.
    parent.querySelectorAll('.zalo-lock-pin-host').forEach((h) => {
      if (h !== input.__zaloPinHost && !h.contains(input)) h.remove();
    });

    let host = input.__zaloPinHost || parent.querySelector('.zalo-lock-pin-host[data-zalo-pin-host="1"]');
    if (!host) {
      host = document.createElement('div');
      host.className = 'zalo-lock-pin-host';
      host.setAttribute('data-zalo-pin-host', '1');

      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'zalo-lock-pin-dots';
      for (let i = 0; i < 4; i++) {
        const d = document.createElement('span');
        d.className = 'zalo-lock-pin-dot';
        dotsWrap.appendChild(d);
      }

      host.appendChild(dotsWrap);
      parent.insertBefore(host, input);
      input.__zaloPinHost = host;
    }

    host.style.cssText = [
      'display:flex',
      'justify-content:center',
      'align-items:center',
      'width:220px',
      'max-width:82vw',
      'height:40px',
      'margin:0 auto',
      'border:1px solid #b8cfc1',
      'border-radius:12px',
      'background:#ffffff',
      'box-sizing:border-box',
      'cursor:text',
      'position:relative',
      'z-index:2'
    ].join(';');

    const dotsWrap = host.querySelector('.zalo-lock-pin-dots');
    if (dotsWrap) {
      dotsWrap.style.cssText = [
        'display:grid',
        'grid-template-columns:repeat(4,10px)',
        'column-gap:14px',
        'align-items:center',
        'justify-items:center',
        'height:10px'
      ].join(';');
    }

    const dots = [...host.querySelectorAll('.zalo-lock-pin-dot')];
    if (dots.length !== 4) return false;
    dots.forEach((dot) => {
      dot.style.cssText = [
        'display:block',
        'width:10px',
        'height:10px',
        'border-radius:999px',
        'background:#c9ddd1',
        'transform:scale(1)',
        'transition:transform .15s ease, background-color .15s ease'
      ].join(';');
    });

    input.dataset.zaloPinEnhanced = '1';
    input.setAttribute('maxlength', '4');
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'one-time-code');

    input.classList.add('zalo-lock-hidden-input');
    input.style.setProperty('position', 'absolute', 'important');
    input.style.setProperty('left', '-9999px', 'important');
    input.style.setProperty('top', 'auto', 'important');
    input.style.setProperty('opacity', '0', 'important');
    input.style.setProperty('pointer-events', 'none', 'important');

    const sync = () => {
      const val = String(input.value || '').replace(/\D/g, '').slice(0, 4);
      if (input.value !== val) input.value = val;
      for (let i = 0; i < 4; i++) {
        const filled = i < val.length;
        dots[i].classList.toggle('is-filled', filled);
        dots[i].style.background = filled ? '#2f7a49' : '#c9ddd1';
        dots[i].style.transform = filled ? 'scale(1.14)' : 'scale(1)';
      }
    };

    if (!host.dataset.boundInputId) {
      host.addEventListener('click', () => input.focus());
      host.addEventListener('mousedown', (e) => e.preventDefault());
      input.addEventListener('input', sync);
      input.addEventListener('change', sync);
      input.addEventListener('keyup', sync);
      input.addEventListener('focus', () => host.style.boxShadow = '0 0 0 3px rgba(87,182,120,.16)');
      input.addEventListener('blur', () => host.style.boxShadow = 'none');
      host.dataset.boundInputId = '1';
    }

    sync();
    return true;
  }

  function ensureLockPinUI() {
    ensureLockPinStyle();

    // Recover hidden PIN inputs from old rounds when host vanished.
    document.querySelectorAll('input.zalo-lock-hidden-input').forEach((el) => {
      const p = el.parentElement;
      const hasHost = !!(p && p.querySelector('.zalo-lock-pin-host'));
      if (!hasHost) {
        el.classList.remove('zalo-lock-hidden-input');
        el.style.removeProperty('position');
        el.style.removeProperty('left');
        el.style.removeProperty('top');
        el.style.removeProperty('opacity');
        el.style.removeProperty('pointer-events');
      }
    });

    const selectors = [
      '.app-lock__main__input',
      'input#passcode',
      'input[type="password"]',
      'input[placeholder*="mã khóa" i]',
      'input[placeholder*="ma khoa" i]',
      'input[placeholder*="pin" i]',
      'input[name*="pass" i]'
    ];

    const set = new Set();
    selectors.forEach((s) => {
      document.querySelectorAll(s).forEach((el) => set.add(el));
    });

    let count = 0;
    [...set].forEach((input) => {
      if (enhanceLockInput(input)) count += 1;
    });
    return count;
  }

  function ensureLockObserver() {
    if (window.__zaloPinObserver) return;
    const obs = new MutationObserver(() => {
      ensureLockPinUI();
    });
    obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
    window.__zaloPinObserver = obs;
  }

  function ensureLockRetryLoop() {
    if (window.__zaloPinRetryTimer) return;
    window.__zaloPinRetryTimer = setInterval(() => {
      ensureLockPinUI();
    }, 700);

    window.addEventListener('focus', () => ensureLockPinUI(), true);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) ensureLockPinUI();
    });
  }

  function ensureControls() {
    const target = document.querySelector('.nav__tabs__bottom');
    if (!target) return false;

    let wrap = document.getElementById(CTRL_ID);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = CTRL_ID;
      wrap.style.cssText = [
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'justify-content:center',
        'gap:8px',
        'width:100%',
        'padding:8px 0',
        'box-sizing:border-box',
        'position:relative',
        'z-index:2147483647',
        '-webkit-app-region:no-drag'
      ].join(';');

      const mkBtn = (title, text) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.title = title;
        b.textContent = text;
        b.style.cssText = [
          'height:28px',
          'width:28px',
          'padding:0',
          'display:inline-flex',
          'align-items:center',
          'justify-content:center',
          'border-radius:999px',
          'border:1px solid rgba(255,255,255,0.95)',
          'background:transparent',
          'color:#ffffff',
          'font-size:11px',
          'font-weight:700',
          'line-height:1',
          'cursor:pointer',
          'outline:none',
          'box-shadow:none',
          '-webkit-app-region:no-drag'
        ].join(';');
        b.onmouseenter = () => { b.style.background = 'rgba(255,255,255,0.10)'; };
        b.onmouseleave = () => { b.style.background = 'transparent'; };
        return b;
      };

      const toggleBtn = mkBtn('Toggle Pastel Theme', 'ON');
      const pinBtn = mkBtn('Apply PIN Dot UI', 'PIN');

      const refresh = () => {
        const active = !!document.getElementById(STYLE_ID);
        toggleBtn.textContent = active ? 'ON' : 'OFF';
        toggleBtn.style.opacity = active ? '1' : '0.8';
      };

      toggleBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (document.getElementById(STYLE_ID)) {
          clearTheme();
        } else {
          applyTheme();
          ensureLockPinUI();
        }
        refresh();
      };

      pinBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        ensureLockPinStyle();
        ensureLockPinUI();
      };

      wrap.appendChild(toggleBtn);
      wrap.appendChild(pinBtn);
      target.appendChild(wrap);
      refresh();
    }

    return true;
  }

  window.__zaloThemeCss = cssText;
  window.__zaloThemeApply = applyTheme;
  window.__zaloThemeClear = clearTheme;

  const cssLength = applyTheme();
  const controls = ensureControls();
  const pinUIs = ensureLockPinUI();
  ensureLockObserver();
  ensureLockRetryLoop();

  const hosts = [...document.querySelectorAll(".zalo-lock-pin-host")];`r`n  const hostMeta = hosts.slice(0, 6).map((el) => ({`r`n    cls: el.className,`r`n    disp: getComputedStyle(el).display,`r`n    vis: getComputedStyle(el).visibility,`r`n    op: getComputedStyle(el).opacity,`r`n    w: Math.round(el.getBoundingClientRect().width),`r`n    h: Math.round(el.getBoundingClientRect().height),`r`n    html: (el.outerHTML || "").slice(0, 160)`r`n  }));`r`n`r`n  const inputs = [...document.querySelectorAll("input")];
  const inputCount = inputs.length;
  const inputMeta = inputs.slice(0, 5).map((el) => ({
    cls: el.className,
    id: el.id,
    type: el.type,
    ph: el.placeholder,
    im: el.getAttribute("inputmode"),
    ac: el.getAttribute("autocomplete"),
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height)
  }));
  return { ok: true, mode: 'apply', cssLength, controls, pinUIs, hostMeta, inputCount, inputMeta };
})()
"@
    }
    else {
      $script = @"
(() => {
  const tag = document.getElementById('zalo-runtime-patch');
  if (tag) tag.remove();
  return { ok: true, mode: 'clear' };
})()
"@
    }

    Send-CdpCommand -Socket $ws -Id $nextId -Method 'Runtime.evaluate' -Params @{
      expression = $script
      awaitPromise = $false
      returnByValue = $true
    }
    $evalId = $nextId

    $deadline = (Get-Date).AddSeconds(5)
    while ((Get-Date) -lt $deadline) {
      $msgText = Receive-CdpMessage -Socket $ws
      $msg = $msgText | ConvertFrom-Json
      $idProp = $msg.PSObject.Properties['id']
      if ($idProp -and $idProp.Value -eq $evalId) {
        $errProp = $msg.PSObject.Properties['error']
        if ($errProp -and $errProp.Value) {
          throw "CDP loi: $($errProp.Value | ConvertTo-Json -Compress)"
        }

        $resultNode = $msg.PSObject.Properties['result']
        if ($resultNode -and $resultNode.Value) {
          $inner = $resultNode.Value.PSObject.Properties['result']
          if ($inner -and $inner.Value) {
            $valProp = $inner.Value.PSObject.Properties['value']
            if ($valProp) {
              Write-Host "Patch result: $($valProp.Value | ConvertTo-Json -Compress)"
            }
            else {
              Write-Host "Patch raw result: $($inner.Value | ConvertTo-Json -Compress)"
            }
          }
          else {
            Write-Host "Patch raw result: $($resultNode.Value | ConvertTo-Json -Compress)"
          }
        }
        else {
          Write-Host "Patch raw message: $($msg | ConvertTo-Json -Compress)"
        }
        return
      }
    }

    throw 'Khong nhan duoc response Runtime.evaluate trong 5s'
  }
  finally {
    if ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
      try {
        $null = $ws.CloseOutputAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, 'done', [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
      }
      catch {
      }
    }
    $ws.Dispose()
  }
}

Invoke-Cdp -DebugPort $Port -Mode $Action -ThemeCssPath $CssPath -Match $TargetMatch
















