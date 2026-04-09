---
name: zalous-pack-direct-cli
description: Manage Zalous theme, theme-pack, and extension packs through direct workspace CLI commands (`add`, `patch`, `reload`) with CDP-first checks. Default to runtime-only patch flow and use `apply` only when the user explicitly requests an asar patch.
---

# Zalous Pack Direct CLI

## Core Goal
Triển khai thay đổi pack qua `%APPDATA%\Zalous` theo mặc định. Chỉ dùng asar `apply` khi user yêu cầu rõ.

## Workflow Decision
1. Chạy CDP baseline trước:
   - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'`
2. Dùng `add` cho asset mới.
3. Dùng `patch` cho asset đã có.
4. Dùng `reload` để bump `config.hotReload.token`.
5. Verify CDP sau mỗi thay đổi.
6. Chỉ chạy `apply` khi user yêu cầu patch asar.

Rule:
- Flow runtime (`add`/`patch`/`reload`) cho theme/theme-pack/extension không cần kill Zalo.

## Command Playbook
Dùng từ repo root (`node .\tools\zalous-cli.js ...`).

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

- `reload` chỉ gửi signal token.
- Runtime watcher control:
  - `WR`: watcher bật.
  - `WX`: watcher tắt.
- Nếu watcher tắt/không available, dùng `RL` để reload tay.

## Runtime Source Caveat

Nếu runtime báo `source=local+embedded` và `hasRequire=false`:
- `add/patch` vẫn ghi file thành công.
- UI có thể chưa đổi ngay.

Xử lý bắt buộc:
1. Verify state qua CDP.
2. Inject CSS/JS hotfix qua CDP vào tab đang chạy.
3. Vẫn lưu source đã sửa trong repo và workspace `%APPDATA%\Zalous`.
4. Không kill Zalo, không patch asar nếu user chưa yêu cầu.

## Asar Apply Flow (chỉ khi user yêu cầu)

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
1. Baseline CDP check trước khi sửa.
2. Patch direct runtime assets.
3. Verify lại CDP đến khi `pass=true`.
4. Nếu user yêu cầu asar patch, mới chạy safe `apply` và verify lại.
