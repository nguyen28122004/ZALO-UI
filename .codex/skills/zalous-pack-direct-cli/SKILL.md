---
name: zalous-pack-direct-cli
description: Manage Zalous theme, theme-pack, and extension packs through direct workspace CLI commands (`add`, `patch`, `reload`) with CDP-first checks. Default to runtime-only patch flow and use `apply` only when the user explicitly requests an asar patch.
---

# Zalous Pack Direct CLI

## Core Goal
Use this skill to deliver pack changes through `%APPDATA%\\Zalous` assets with runtime-only patch flow as default; use `apply` only when user explicitly requests asar patch.

## Workflow Decision
1. Run CDP baseline check first to understand current UI state before editing:
   - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'`
2. Run `add` when a new theme, theme-pack, or extension must be copied into workspace assets.
3. Run `patch` when an existing workspace asset must be replaced in place.
4. Run `reload` to update `config.hotReload.token` and request runtime refresh.
   - Auto reload only works when runtime has external watcher (`window.__zalousHotReloadWatcher` truthy).
   - If watcher is unavailable, use manual reload button (`RL`) or market reload button.
   - Runtime flow (`add`/`patch`/`reload`) does not require killing Zalo.
5. For every theme/theme-pack/pack-related change, run CDP UI verification:
   - `.\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1`
   - Auto-discover target from `http://127.0.0.1:9222/json/list` (no hardcoded ws URL).
6. Run `apply` only when the user explicitly asks to patch `asar`.
   - Mandatory safe flow: kill Zalo -> wait -> verify stopped -> `apply` -> open Zalo shortcut.
   - If PowerShell cannot open `.lnk`, fallback to JS launcher:
     - `node .\.codex\skills\zalous-pack-direct-cli\scripts\start-zalo.mjs`

## Command Playbook
Use these commands from repo root (`node .\\tools\\zalous-cli.js ...`):

- Safe `apply` (required for asar patch/runtime changes):
  ```powershell
  $zaloShortcut = 'C:\Users\ACER\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk'
  $zaloLauncherJs = '.\.codex\skills\zalous-pack-direct-cli\scripts\start-zalo.mjs'
  $zaloProc = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' -or $_.Path -like 'C:\Users\ACER\AppData\Local\Programs\Zalo*' }
  if ($zaloProc) { $zaloProc | Stop-Process -Force }
  Start-Sleep -Seconds 2

  $stillRunning = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' -or $_.Path -like 'C:\Users\ACER\AppData\Local\Programs\Zalo*' }
  if ($stillRunning) { throw 'Zalo is still running; abort apply.' }

  node .\tools\zalous-cli.js apply
  $opened = $false
  try {
    Start-Process -FilePath $zaloShortcut
    $opened = $true
  } catch {
    $opened = $false
  }
  Start-Sleep -Milliseconds 900
  $runningAfterOpen = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' -or $_.Path -like 'C:\Users\ACER\AppData\Local\Programs\Zalo*' }
  if (-not $runningAfterOpen) {
    node $zaloLauncherJs
  }
  ```

- CDP verify after any theme/pack change:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
  ```

- CDP assert example:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -ExpectedActiveTheme 'pack:themepack.console-minimal' -ExpectedThemePackAttr 'console-minimal'
  ```

- Add theme:
  - `add --type theme --file <path.css> [--name custom.css] [--activate] [--reload]`
- Add extension:
  - `add --type extension --file <path.js> [--name custom.js] [--no-enable] [--reload]`
- Add theme-pack:
  - `add --type theme-pack --dir <pack-dir> [--id pack-id] [--activate] [--reload]`
- Patch theme:
  - `patch --type theme --name <file.css> --file <path.css> [--activate] [--reload]`
- Patch extension:
  - `patch --type extension --name <file.js> --file <path.js> [--reload]`
- Patch theme-pack by directory:
  - `patch --type theme-pack --id <pack-id> --dir <pack-dir> [--activate] [--reload]`
- Patch theme-pack by partial assets:
  - `patch --type theme-pack --id <pack-id> --css <path.css> [--js <path.js>] [--html <path.html>] [--reload]`
- Reload runtime state:
  - `reload --type <all|theme|theme-pack|extension> [--name <asset>] [--enable|--disable]`

- Runtime direct patch note:
  - For `add`/`patch`/`reload` on theme/theme-pack/extension, keep Zalo running and validate via CDP.
  - Do not stop processes unless doing explicit `apply` asar patch flow.

## Pack-Specific Rules
- Keep `theme-pack` manifests valid (`type: theme-pack`) before add/patch.
- Treat active theme-pack key as `pack:<id>`.
- Keep extension names as `.js` files and theme names as `.css` files.
- Prefer `--reload` after add/patch during interactive UI work, then always verify by CDP.

## Validation
1. Run baseline CDP check before editing.
2. Run `status` after major changes.
3. Run `list-themes` and `list-extensions` to confirm assets are present.
4. Verify `hotReload.token` changes after `reload`.
5. Run CDP verify script and ensure `pass=true`.
6. If runtime behavior is old, do manual reload (RL button/market reload), then re-check.
7. Only if user asks for asar patch: run safe `apply` and re-check.

## References
- Use `references/direct-cli-cheatsheet.md` for compact examples.
- Use `docs/zalous/CLI.md` for full command syntax.
- Use `docs/zalous/FLOW.md` for asar flow vs direct flow boundaries.
## Runtime Source Caveat
- Neu CDP/runtime bao source: local+embedded va hasRequire=false, runtime se khong doc external assets tu %APPDATA%\Zalous.
- Khi do, dd/patch CLI van ghi file thanh cong nhung giao dien co the chua doi ngay tren tab dang mo.
- Cach xu ly bat buoc:
  1. Xac nhan state bang CDP (window.zalous.source, hasRequire).
  2. Neu dang local+embedded + hasRequire=false, inject CSS/JS hotfix truc tiep qua CDP vao tab Zalo dang chay de thay doi UI ngay.
  3. Van phai luu source da sua trong repo va patch workspace runtime (%APPDATA%\Zalous) de dong bo.
  4. Khong kill Zalo, khong patch sar neu user chua yeu cau.
