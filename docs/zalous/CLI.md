# CLI Reference

## Cú pháp

```powershell
node .\tools\zalous-cli.js <command> [flags]
```

## Commands

### `patch-now [--asar <path>] [--no-backup] [--lite-payload|--full-payload] [--keep-controls]`
- Lệnh mặc định nếu không truyền command.
- Tự động detect latest `app.asar` và patch runtime.

### `init`
- Tạo layout `%APPDATA%\Zalous`.
- Sync built-in assets vào `themes`, `theme-packs`, `extensions`.
- Chuẩn hóa config.

### `detect [--asar <path>]`
- Resolve `app.asar` và lưu vào `config.appAsarPath`.

### `status`
- In JSON trạng thái runtime workspace.

### `apply [--asar <path>] [--no-backup] [--lite-payload|--full-payload] [--keep-controls]`
- Restore clean base theo version.
- Inject runtime vào `pc-dist/index.html`.
- Repack và sync lại `app.asar.unpacked`.

### `restore [--asar <path>]`
- Restore backup patch gần nhất (`app.asar.<timestamp>.bak`) trước.

### `list-themes`
- Liệt kê theme files và `pack:<id>`.

### `set-theme --theme <file.css|pack:pack-id>`
- Đặt `activeTheme`.

### `list-extensions`
- Liệt kê extension và trạng thái `[on]/[off]`.

### `enable-extension --name <file.js>`
- Bật extension.

### `disable-extension --name <file.js>`
- Tắt extension.

### `import-theme --file <path.css> [--name custom.css]`
- Import theme ngoài vào `%APPDATA%\Zalous\themes`.

### `import-extension --file <path.js> [--name custom.js]`
- Import extension ngoài vào `%APPDATA%\Zalous\extensions`.

### `add --type <theme|theme-pack|extension> ...`
- Thêm asset mới trực tiếp vào `%APPDATA%\Zalous` (không repack asar).

### `patch --type <theme|theme-pack|extension> ...`
- Patch asset đã tồn tại trong `%APPDATA%\Zalous` (không repack asar).

### `reload [--type <all|theme|theme-pack|extension>] [--name <asset>] [--enable|--disable]`
- Bump `config.hotReload.token` để runtime biết có thay đổi.

### `market-list [--catalog <path.json>]`
- Liệt kê packs trong catalog.

### `market-install --id <packId> [--catalog <path.json>]`
- Cài đặt pack từ catalog.

### `doctor`
- In thông tin chẩn đoán nhanh.

## Daily Runtime Patch Flow (khuyến nghị)

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

- `add`/`patch`/`reload` cho theme/theme-pack/extension: không cần kill Zalo.
- Chỉ patch `asar` khi user yêu cầu rõ ràng (`apply`).

## Safe Apply Flow (chỉ khi patch asar)

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

## Hot Reload Watcher

- `reload` chỉ gửi signal token.
- Runtime có watcher:
  - `WR`: watcher bật.
  - `WX`: watcher tắt.
- Nếu watcher tắt/không khả dụng, dùng `RL` để reload tay.

## Mandatory CDP Verify

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

Nếu CDP cho thấy `source=local+embedded` và `hasRequire=false`, runtime có thể không đọc external pack ngay. Khi đó cần inject hotfix qua CDP cho tab đang chạy.

## EXE mode

Có thể thay `node .\tools\zalous-cli.js` bằng `.\tools\zalous.exe`.
