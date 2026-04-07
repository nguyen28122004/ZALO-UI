param(
  [string]$AsarPath = '',
  [ValidateSet('green','pink','blue','purple','orange')]
  [string]$Theme = 'green',
  [string]$RepoRoot = '.',
  [string]$BackupDir = '.\backup'
)

$ErrorActionPreference = 'Stop'

function Resolve-AppAsarPath {
  param([string]$Preferred)

  if ($Preferred -and (Test-Path -LiteralPath $Preferred)) {
    return (Resolve-Path -LiteralPath $Preferred).Path
  }

  $versioned = Get-ChildItem -LiteralPath "$env:LOCALAPPDATA\Programs\Zalo" -Directory -Filter 'Zalo-*' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending

  foreach ($dir in $versioned) {
    $candidate = Join-Path $dir.FullName 'resources\app.asar'
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw 'Khong tim thay app.asar'
}

function Escape-InlineScript {
  param([string]$Text)
  return ($Text -replace '</script>', '<\/script>')
}

$repo = (Resolve-Path -LiteralPath $RepoRoot).Path
$asar = Resolve-AppAsarPath -Preferred $AsarPath

$themeDefs = @(
  @{ key = 'green';  label = 'Green';  path = 'themes\zalo-green.css' },
  @{ key = 'pink';   label = 'Pink';   path = 'themes\zalo-pink.css' },
  @{ key = 'blue';   label = 'Blue';   path = 'themes\zalo-blue.css' },
  @{ key = 'purple'; label = 'Purple'; path = 'themes\zalo-purple.css' },
  @{ key = 'orange'; label = 'Orange'; path = 'themes\zalo-orange.css' }
)

$commonCssPath = Join-Path $repo 'themes\zalo-common.css'
if (-not (Test-Path -LiteralPath $commonCssPath)) { throw "Khong tim thay: $commonCssPath" }

$commonCss = Get-Content -LiteralPath $commonCssPath -Raw
$commonCssB64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($commonCss))

$themeCssB64 = @{}
$themeLabels = @{}
foreach ($t in $themeDefs) {
  $full = Join-Path $repo $t.path
  if (-not (Test-Path -LiteralPath $full)) { continue }
  $css = Get-Content -LiteralPath $full -Raw
  $themeCssB64[$t.key] = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($css))
  $themeLabels[$t.key] = $t.label
}

if ($themeCssB64.Keys.Count -eq 0) {
  throw 'Khong load duoc CSS theme nao.'
}

$selectedTheme = $Theme
if (-not $themeCssB64.ContainsKey($selectedTheme)) { $selectedTheme = 'green' }
if (-not $themeCssB64.ContainsKey($selectedTheme)) { $selectedTheme = @($themeCssB64.Keys)[0] }

$themeCssB64Json = $themeCssB64 | ConvertTo-Json -Compress
$themeLabelsJson = $themeLabels | ConvertTo-Json -Compress
$themeOrder = @($themeDefs | Where-Object { $themeCssB64.ContainsKey($_.key) } | ForEach-Object { $_.key })
if ($themeOrder.Count -eq 0) { $themeOrder = @($themeCssB64.Keys) }
$themeOrderJson = $themeOrder | ConvertTo-Json -Compress

$snippetModPath = Join-Path $repo 'snippets\zalo-runtime-mod.js'
$snippetProbePath = Join-Path $repo 'snippets\zalo-selector-probe.js'
$snippetMod = ''
$snippetProbe = ''
if (Test-Path -LiteralPath $snippetModPath) { $snippetMod = Get-Content -LiteralPath $snippetModPath -Raw }
if (Test-Path -LiteralPath $snippetProbePath) { $snippetProbe = Get-Content -LiteralPath $snippetProbePath -Raw }

$runtimeScript = @"
(() => {
  const STYLE_ID = 'zalo-runtime-theme';
  const COMMON_STYLE_ID = 'zalo-runtime-common';
  const CTRL_ID = 'zalo-theme-controls';
  const LOCK_STYLE_ID = 'zalo-lock-pin-style';
  const COMMON_CSS = atob('$commonCssB64');
  const THEMES_B64 = $themeCssB64Json;
  const THEMES_META = $themeLabelsJson;
  const THEME_ORDER = $themeOrderJson;
  const DEFAULT_THEME_KEY = '$selectedTheme';
  const THEMES_CSS = Object.fromEntries(Object.entries(THEMES_B64).map(([k, v]) => [k, atob(v)]));

  function applyTheme(themeKey) {
    const key = (themeKey && THEMES_CSS[themeKey]) ? themeKey : (window.__zaloThemeKey || DEFAULT_THEME_KEY || THEME_ORDER[0]);
    window.__zaloThemeKey = key;

    let commonTag = document.getElementById(COMMON_STYLE_ID);
    if (!commonTag) {
      commonTag = document.createElement('style');
      commonTag.id = COMMON_STYLE_ID;
      document.head.appendChild(commonTag);
    }
    commonTag.textContent = COMMON_CSS;

    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    const css = THEMES_CSS[key] || THEMES_CSS[THEME_ORDER[0]] || '';
    tag.textContent = css;
    return commonTag.textContent.length + tag.textContent.length;
  }

  function clearTheme() {
    const commonTag = document.getElementById(COMMON_STYLE_ID);
    if (commonTag) commonTag.remove();
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
      '  background: #14532d;',
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
    ].join('\n');
  }

  function enhanceLockInput(input) {
    if (!input) return false;
    const parent = input.parentElement;
    if (!parent) return false;

    const hint = ((input.id || '') + ' ' + (input.className || '') + ' ' + (input.placeholder || '') + ' ' + (input.name || '')).toLowerCase();
    const isLockLike = input.type === 'password' || hint.includes('passcode') || hint.includes('mã khóa') || hint.includes('ma khoa') || hint.includes('lock') || hint.includes('pin');
    if (!isLockLike) return false;

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

    const dots = [...host.querySelectorAll('.zalo-lock-pin-dot')];
    if (dots.length !== 4) return false;

    input.dataset.zaloPinEnhanced = '1';
    input.setAttribute('maxlength', '4');
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'one-time-code');
    if (!parent.dataset.zaloPinPosPatched) {
      const pStyle = window.getComputedStyle(parent);
      if (pStyle.position === 'static') {
        parent.style.position = 'relative';
      }
      parent.dataset.zaloPinPosPatched = '1';
    }

    input.classList.add('zalo-lock-hidden-input');
    input.style.setProperty('position', 'absolute', 'important');
    input.style.setProperty('left', '50%', 'important');
    input.style.setProperty('top', '50%', 'important');
    input.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
    input.style.setProperty('width', '220px', 'important');
    input.style.setProperty('max-width', '82vw', 'important');
    input.style.setProperty('height', '40px', 'important');
    input.style.setProperty('margin', '0', 'important');
    input.style.setProperty('opacity', '0', 'important');
    input.style.setProperty('pointer-events', 'auto', 'important');
    input.style.setProperty('z-index', '3', 'important');

    const readPin = () => {
      const domVal = String(input.value || '').replace(/\D/g, '').slice(0, 4);
      const shadow = String(input.dataset.zaloPinShadow || '').replace(/\D/g, '').slice(0, 4);
      return domVal.length >= shadow.length ? domVal : shadow;
    };

    const writeShadow = (nextVal) => {
      input.dataset.zaloPinShadow = String(nextVal || '').replace(/\D/g, '').slice(0, 4);
    };

    const sync = () => {
      const val = readPin();
      for (let i = 0; i < 4; i++) {
        const filled = i < val.length;
        dots[i].classList.toggle('is-filled', filled);
        dots[i].style.background = filled ? '#14532d' : '#c9ddd1';
        dots[i].style.transform = filled ? 'scale(1.14)' : 'scale(1)';
      }
    };

    if (!host.dataset.boundInputId) {
      host.addEventListener('click', () => {
        input.focus();
        setTimeout(() => input.focus(), 0);
      });
      host.addEventListener('mousedown', (e) => e.preventDefault());
      input.addEventListener('input', sync);
      input.addEventListener('beforeinput', () => setTimeout(sync, 0));
      input.addEventListener('change', sync);
      input.addEventListener('keyup', sync);
      input.addEventListener('keydown', () => setTimeout(sync, 0));
      input.addEventListener('paste', () => setTimeout(sync, 0));
      input.addEventListener('compositionend', () => setTimeout(sync, 0));
      input.addEventListener('keydown', (e) => {
        const key = String(e.key || '');
        const prev = readPin();
        if (/^\d$/.test(key)) {
          writeShadow((prev + key).slice(0, 4));
          setTimeout(sync, 0);
          return;
        }
        if (key === 'Backspace' || key === 'Delete') {
          writeShadow(prev.slice(0, -1));
          setTimeout(sync, 0);
        }
      }, true);
      input.addEventListener('paste', (e) => {
        const txt = String((e.clipboardData && e.clipboardData.getData('text')) || '').replace(/\D/g, '').slice(0, 4);
        if (txt) {
          writeShadow(txt);
          setTimeout(sync, 0);
        }
      }, true);
      input.addEventListener('focus', () => host.style.boxShadow = '0 0 0 3px rgba(87,182,120,.16)');
      input.addEventListener('blur', () => {
        host.style.boxShadow = 'none';
        setTimeout(sync, 0);
      });
      host.dataset.boundInputId = '1';
    }

    if (!input.__zaloPinSyncTimer) {
      input.__zaloPinSyncTimer = setInterval(sync, 120);
    }

    sync();
    return true;
  }

  function ensureLockPinUI() {
    ensureLockPinStyle();

    document.querySelectorAll('input.zalo-lock-hidden-input').forEach((el) => {
      const p = el.parentElement;
      const hasHost = !!(p && p.querySelector('.zalo-lock-pin-host'));
      if (!hasHost) {
        el.classList.remove('zalo-lock-hidden-input');
        el.style.removeProperty('position');
        el.style.removeProperty('left');
        el.style.removeProperty('top');
        el.style.removeProperty('transform');
        el.style.removeProperty('width');
        el.style.removeProperty('max-width');
        el.style.removeProperty('height');
        el.style.removeProperty('margin');
        el.style.removeProperty('opacity');
        el.style.removeProperty('pointer-events');
        el.style.removeProperty('z-index');
      }
    });

    const selectors = [
      '.app-lock__main__input',
      'input#passcode',
      'input[type="password"]',
      'input[placeholder*="mã khóa" i]',
      'input[placeholder*="ma khoa" i]',
      'input[placeholder*="pin" i]',
      'input[name*="pass" i]',
      'input[name*="pin" i]'
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

  function triggerThemeFade() {
    const el = document.getElementById('app') || document.body || document.documentElement;
    if (!el) return;
    const prevTransition = el.style.transition || '';
    const prevWillChange = el.style.willChange || '';
    el.style.willChange = 'opacity';
    el.style.transition = 'opacity 400ms ease';
    el.style.opacity = '0.88';
    requestAnimationFrame(() => requestAnimationFrame(() => { el.style.opacity = '1'; }));
    setTimeout(() => {
      el.style.willChange = prevWillChange;
      el.style.transition = prevTransition;
    }, 430);
  }

  function ensureControls() {
    const target = document.querySelector('.nav__tabs__bottom');
    if (!target) return false;

    let wrap = document.getElementById(CTRL_ID);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = CTRL_ID;
      target.appendChild(wrap);
    }

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

    const TOGGLE_ID = 'zalo-theme-toggle-btn';
    const THEME_ID = 'zalo-theme-picker-btn';
    let toggleBtn = document.getElementById(TOGGLE_ID);
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = TOGGLE_ID;
      wrap.appendChild(toggleBtn);
    }
    let themeBtn = document.getElementById(THEME_ID);
    if (!themeBtn) {
      themeBtn = document.createElement('button');
      themeBtn.id = THEME_ID;
      wrap.appendChild(themeBtn);
    }
    [...wrap.querySelectorAll('button')].forEach((btn) => {
      if (btn !== toggleBtn && btn !== themeBtn) btn.remove();
    });

    const baseBtnCss = [
      'height:28px',
      'width:28px',
      'padding:0',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'border-radius:999px',
      'font-size:11px',
      'font-weight:700',
      'line-height:1',
      'cursor:pointer',
      'outline:none',
      'box-shadow:none',
      '-webkit-app-region:no-drag'
    ].join(';');
    toggleBtn.type = 'button';
    toggleBtn.title = 'Bat/tat patch giao dien';
    toggleBtn.style.cssText = baseBtnCss;
    themeBtn.type = 'button';
    themeBtn.title = 'Chuyen theme giao dien';
    themeBtn.style.cssText = baseBtnCss;

    const refresh = () => {
      const active = !!document.getElementById(STYLE_ID);
      const key = window.__zaloThemeKey || DEFAULT_THEME_KEY || THEME_ORDER[0];
      const short = (key || 'th').slice(0, 2).toUpperCase();
      toggleBtn.textContent = active ? 'ON' : 'OFF';
      toggleBtn.style.opacity = '1';
      toggleBtn.style.border = '1px solid ' + (active ? '#3a8457' : '#b8cfc1');
      toggleBtn.style.background = active ? '#4fa871' : '#e4efe8';
      toggleBtn.style.color = active ? '#ffffff' : '#244638';
      themeBtn.textContent = short;
      themeBtn.title = 'Theme: ' + (THEMES_META[key] || key);
      themeBtn.style.border = '1px solid #b8cfc1';
      themeBtn.style.background = '#f5f9f7';
      themeBtn.style.color = '#244638';
    };

    toggleBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      triggerThemeFade();
      const active = !!document.getElementById(STYLE_ID);
      if (active) {
        clearTheme();
      } else {
        clearTheme();
        applyTheme(window.__zaloThemeKey || DEFAULT_THEME_KEY);
        setTimeout(() => {
          applyTheme(window.__zaloThemeKey || DEFAULT_THEME_KEY);
          ensureLockPinUI();
        }, 30);
      }
      refresh();
    };

    themeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const current = window.__zaloThemeKey || DEFAULT_THEME_KEY || THEME_ORDER[0];
      const idx = Math.max(0, THEME_ORDER.indexOf(current));
      const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
      window.__zaloThemeKey = next;
      if (document.getElementById(STYLE_ID)) {
        triggerThemeFade();
        applyTheme(next);
      }
      refresh();
    };

    refresh();
    return true;
  }

  function boot() {
    window.__zaloThemes = THEMES_CSS;
    window.__zaloThemeMeta = THEMES_META;
    window.__zaloThemeOrder = THEME_ORDER;
    window.__zaloThemeKey = (THEMES_CSS[DEFAULT_THEME_KEY] ? DEFAULT_THEME_KEY : (THEME_ORDER[0] || 'green'));
    window.__zaloThemeApply = applyTheme;
    window.__zaloThemeClear = clearTheme;
    applyTheme(window.__zaloThemeKey || DEFAULT_THEME_KEY);

    ensureControls();
    ensureLockPinUI();
    ensureLockObserver();
    ensureLockRetryLoop();
    if (!window.__zaloThemeCtrlRetry) {
      window.__zaloThemeCtrlRetry = setInterval(() => {
        const ok = ensureControls();
        ensureLockPinUI();
        if (ok) {
          clearInterval(window.__zaloThemeCtrlRetry);
          window.__zaloThemeCtrlRetry = null;
        }
      }, 700);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
"@

$snippetBundle = @"
/* snippets/zalo-runtime-mod.js */
$snippetMod

/* snippets/zalo-selector-probe.js */
$snippetProbe
"@

$runtimeScript = Escape-InlineScript -Text $runtimeScript
$snippetBundle = Escape-InlineScript -Text $snippetBundle

$extractDir = Join-Path $repo '.tmp-asar-extract'
$rebuiltAsar = Join-Path $repo '.tmp-app.asar'
$targetHtml = Join-Path $extractDir 'pc-dist\index.html'

if (Test-Path -LiteralPath $extractDir) { Remove-Item -LiteralPath $extractDir -Recurse -Force }
if (Test-Path -LiteralPath $rebuiltAsar) { Remove-Item -LiteralPath $rebuiltAsar -Force }

$null = New-Item -ItemType Directory -Path $extractDir -Force

Write-Host "Extract: $asar"
npx asar extract "$asar" "$extractDir" | Out-Null

if (-not (Test-Path -LiteralPath $targetHtml)) {
  throw "Khong tim thay file can patch: $targetHtml"
}

$startMarker = '<!-- ZALO-UI-MOD:BEGIN -->'
$endMarker = '<!-- ZALO-UI-MOD:END -->'
$injectBlock = @"
$startMarker
<script id="zalo-ui-mod-snippets">
$snippetBundle
</script>
<script id="zalo-ui-mod-runtime">
$runtimeScript
</script>
$endMarker
"@

$html = Get-Content -LiteralPath $targetHtml -Raw
$markerPattern = '(?s)<!-- ZALO-UI-MOD:BEGIN -->.*?<!-- ZALO-UI-MOD:END -->'
if ([regex]::IsMatch($html, $markerPattern)) {
  $html = [regex]::Replace($html, $markerPattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $injectBlock }, 1)
}
elseif ($html -match '</head>') {
  $html = $html -replace '</head>', ($injectBlock + '</head>')
}
else {
  throw 'Khong tim thay </head> trong pc-dist/index.html de chen patch.'
}

Set-Content -LiteralPath $targetHtml -Value $html -Encoding UTF8 -NoNewline

Write-Host "Pack: $rebuiltAsar"
npx asar pack "$extractDir" "$rebuiltAsar" | Out-Null
if (-not (Test-Path -LiteralPath $rebuiltAsar)) { throw 'Pack asar that bai.' }

$backupRoot = Join-Path $repo $BackupDir
$null = New-Item -ItemType Directory -Path $backupRoot -Force
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $backupRoot ("app.asar.directpatch.$stamp.bak")

Copy-Item -LiteralPath $asar -Destination $backupPath -Force
Copy-Item -LiteralPath $rebuiltAsar -Destination $asar -Force

Remove-Item -LiteralPath $extractDir -Recurse -Force
Remove-Item -LiteralPath $rebuiltAsar -Force

Write-Host "Patched asar: $asar"
Write-Host "Backup saved: $backupPath"
Write-Host "Theme default: $selectedTheme"
