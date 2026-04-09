---
name: zalous-pack-direct-cli
description: Manage Zalous theme, theme-pack, and extension packs through direct workspace CLI commands (`add`, `patch`, `reload`) with CDP-first checks. Default to runtime-only patch flow and use `apply` only when the user explicitly requests an asar patch.
---

# Zalous Pack Direct CLI

## Core Goal
Deliver pack changes through `%APPDATA%\Zalous` assets by default. Use asar `apply` only when user explicitly requests it.

## Workflow Decision
1. Run CDP baseline check first:
   - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'`
2. Use `add` for new asset.
3. Use `patch` for existing asset.
4. Use `reload` to bump `config.hotReload.token`.
5. Verify via CDP after each change.
6. Run `apply` only when user explicitly asks to patch asar.

Rule:
- Theme/theme-pack/extension runtime flow (`add`/`patch`/`reload`) does not require killing Zalo.

## Command Playbook
Use from repo root (`node .\tools\zalous-cli.js ...`).

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

## Hot Reload Watcher

- `reload` chi gui signal token.
- Runtime watcher control:
  - `WR`: watcher bat.
  - `WX`: watcher tat.
- Neu watcher tat/khong available, dung `RL` de reload tay.

## Runtime Source Caveat

Neu runtime bao `source=local+embedded` va `hasRequire=false`:
- `add/patch` van ghi file thanh cong.
- UI co the chua doi ngay.

Xu ly bat buoc:
1. Verify state qua CDP.
2. Inject CSS/JS hotfix qua CDP vao tab dang chay.
3. Van luu source da sua trong repo va workspace `%APPDATA%\Zalous`.
4. Khong kill Zalo, khong patch asar neu user chua yeu cau.

## Asar Apply Flow (chi khi user yeu cau)

```powershell
$zaloShortcut = 'C:\Users\Lien\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk'
$zaloProc = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' }
if ($zaloProc) { $zaloProc | Stop-Process -Force }
Start-Sleep -Seconds 2

$stillRunning = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' }
if ($stillRunning) { throw 'Zalo is still running; abort apply.' }

node .\tools\zalous-cli.js apply
Start-Process -FilePath $zaloShortcut
```

## Validation
1. Baseline CDP check truoc khi sua.
2. Patch direct runtime assets.
3. Verify lai CDP den khi `pass=true`.
4. Neu user yeu cau asar patch, moi chay safe `apply` va verify lai.
