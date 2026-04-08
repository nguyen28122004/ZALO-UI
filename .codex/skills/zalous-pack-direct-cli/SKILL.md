---
name: zalous-pack-direct-cli
description: Manage Zalous theme, theme-pack, and extension packs through direct workspace CLI commands (`add`, `patch`, `reload`) and safe `apply` when runtime payload changes. Use when editing packs in this repo, syncing assets to `%APPDATA%\\Zalous`, verifying UI changes via CDP (`localhost:9222`), and handling runtime reload behavior reliably.
---

# Zalous Pack Direct CLI

## Core Goal
Use this skill to deliver pack changes through `%APPDATA%\\Zalous` assets and only use `apply` when runtime payload changed.

## Workflow Decision
1. Run `apply` only when runtime payload changed or this machine has not been patched yet.
   - Mandatory safe flow: kill Zalo -> wait -> verify stopped -> `apply` -> open Zalo shortcut.
2. Run `add` when a new theme, theme-pack, or extension must be copied into workspace assets.
3. Run `patch` when an existing workspace asset must be replaced in place.
4. Run `reload` to update `config.hotReload.token` and request runtime refresh.
   - Auto reload only works when runtime has external watcher (`window.__zalousHotReloadWatcher` truthy).
   - If watcher is unavailable, use manual reload button (`RL`) or market reload button.
5. For every theme/theme-pack/pack-related change, run CDP UI verification:
   - `.\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1`
   - Auto-discover target from `http://127.0.0.1:9222/json/list` (no hardcoded ws URL).

## Command Playbook
Use these commands from repo root (`node .\\tools\\zalous-cli.js ...`):

- Safe `apply` (required for asar patch/runtime changes):
  ```powershell
  $zaloShortcut = 'C:\Users\ACER\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk'
  $zaloProc = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' -or $_.Path -like 'C:\Users\ACER\AppData\Local\Programs\Zalo*' }
  if ($zaloProc) { $zaloProc | Stop-Process -Force }
  Start-Sleep -Seconds 2

  $stillRunning = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' -or $_.Path -like 'C:\Users\ACER\AppData\Local\Programs\Zalo*' }
  if ($stillRunning) { throw 'Zalo is still running; abort apply.' }

  node .\tools\zalous-cli.js apply
  Start-Process -FilePath $zaloShortcut
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

## Pack-Specific Rules
- Keep `theme-pack` manifests valid (`type: theme-pack`) before add/patch.
- Treat active theme-pack key as `pack:<id>`.
- Keep extension names as `.js` files and theme names as `.css` files.
- Prefer `--reload` after add/patch during interactive UI work, then always verify by CDP.

## Validation
1. Run `status` after major changes.
2. Run `list-themes` and `list-extensions` to confirm assets are present.
3. Verify `hotReload.token` changes after `reload`.
4. Run CDP verify script and ensure `pass=true`.
5. If runtime behavior is old, do manual reload (RL button/market reload), then re-check.
6. If still old, run safe `apply` and re-check.

## References
- Use `references/direct-cli-cheatsheet.md` for compact examples.
- Use `docs/zalous/CLI.md` for full command syntax.
- Use `docs/zalous/FLOW.md` for asar flow vs direct flow boundaries.
