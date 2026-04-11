---
name: zalous-pack-direct-cli
description: Manage Zalous theme, theme-pack, and extension packs through direct workspace CLI commands (`add`, `patch`, `reload`) with CDP-first checks. Default to runtime-only patch flow and use `apply` only when the user explicitly requests an asar patch.
---

# Zalous Pack Direct CLI

## Core Goal
Triển khai thay đổi pack qua `%APPDATA%\Zalous` theo mặc định. Chỉ dùng asar `apply` khi user yêu cầu rõ.
Default assumption: runtime thường ở `source=local+embedded`.

## Workflow Decision
1. Chạy CDP baseline trước:
   - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'`
2. Dùng `add` cho asset mới.
3. Dùng `patch` cho asset đã có.
4. Dùng `reload` để bump `config.hotReload.token`.
5. Verify selector/style qua CDP.
6. Nếu chưa phản ánh trên UI (phổ biến với `local+embedded`) thì inject hotfix CDP từ file local.
7. Chỉ chạy `apply` khi user yêu cầu patch asar.

Rule:
- Flow runtime (`add`/`patch`/`reload`) cho theme/theme-pack/extension không cần kill Zalo.
- `local+embedded` => patch CLI chỉ đảm bảo persist; muốn thấy ngay phải CDP hotfix.

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

- Inject hotfix from file (mandatory fallback for `local+embedded`):
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-runtime-direct-patch\scripts\cdp-eval-file.ps1 -TargetMatch 'Zalo' -FilePath <path.js>`

## Hot Reload Watcher

- `reload` chỉ gửi signal token.
- Runtime watcher control:
  - `WR`: watcher bật.
  - `WX`: watcher tắt.
- Nếu watcher tắt/không available, dùng `RL` để reload tay.

## Runtime Source Caveat (Updated)

Nếu runtime báo `source=local+embedded`:
- `add/patch/reload` vẫn ghi file và config thành công.
- Runtime có thể không nạp ngay extension/theme/theme-pack từ external files.

Xử lý bắt buộc:
1. Verify state qua CDP.
2. Verify selector/cụm CSS expected qua CDP.
3. Nếu chưa đạt, inject CSS/JS hotfix qua CDP từ source file vừa patch.
4. Verify lại CDP đến `pass=true`.
5. Báo rõ hotfix là session-level; source đã persist qua CLI.

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

## Apply lỗi thiếu unpacked native (mới)

Khi `node .\tools\zalous-cli.js apply` báo thiếu file trong `app.asar.unpacked`:
- CLI đã tự thử auto-repair trước khi fail: lấy file thiếu từ
  - `%APPDATA%\Zalous\backups\app.asar.unpacked*`
  - thư mục broken cạnh target (`app.asar.unpacked.broken.*`)
  - các version khác trong `%LOCALAPPDATA%\Programs\Zalo\Zalo-*\resources\app.asar.unpacked`
- Nếu vẫn fail, chạy fallback thủ công:

```powershell
$dst = "C:\Users\Lien\AppData\Local\Programs\Zalo\Zalo-26.3.20\resources\app.asar.unpacked"
$src = "C:\Users\Lien\AppData\Local\Programs\Zalo\Zalo-26.3.10\resources\app.asar.unpacked"
Move-Item -LiteralPath $dst -Destination "$dst.broken.$((Get-Date).ToString('yyyyMMddHHmmss'))"
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
node .\tools\zalous-cli.js apply
```

## Validation
1. Baseline CDP check trước khi sửa.
2. Patch direct runtime assets.
3. Reload runtime signal.
4. Verify selector/style qua CDP.
5. Nếu fail và source=`local+embedded`, inject hotfix CDP từ file.
6. Verify lại CDP đến khi `pass=true`.
7. Nếu user yêu cầu asar patch, mới chạy safe `apply` và verify lại.



