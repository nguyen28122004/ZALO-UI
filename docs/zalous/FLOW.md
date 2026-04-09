# Flow

## A) Init

```powershell
node .\tools\zalous-cli.js init
```

- Tạo `%APPDATA%\Zalous` + các folder cần thiết.
- Sync built-in packs vào runtime workspace.
- Normalize config theo assets hiện có.

## B) Detect

```powershell
node .\tools\zalous-cli.js detect [--asar <path>]
```

- Resolve `app.asar` target.
- Ghi vào `config.appAsarPath`.

## C) CDP Baseline (bắt buộc trước khi sửa)

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

Mục tiêu:
- Biết runtime source hiện tại.
- Biết active theme/theme-pack.
- Biết có watcher và Node bridge hay không.

## D) Daily Direct Flow (không repack asar)

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

Flow:
1. CLI copy file/dir vào `%APPDATA%\Zalous\themes|theme-packs|extensions`.
2. CLI cập nhật `config.json`.
3. CLI bump `config.hotReload.token`.
4. Runtime watcher (nếu bật) sẽ theo dõi token và reload.
5. Nếu watcher tắt/không có, dùng `RL` để reload tay.

Quy tắc:
- Sửa theme/theme-pack/extension theo direct flow thì không kill Zalo.
- `apply` (patch asar) chỉ chạy khi user yêu cầu rõ ràng.

## E) Runtime Source Caveat

Nếu CDP cho thấy:
- `source=local+embedded`
- `hasRequire=false`

Thì runtime có thể không đọc external pack từ `%APPDATA%\Zalous` ngay trên tab đang mở.

Cách xử lý:
1. Vẫn patch source trong repo + `%APPDATA%` bình thường.
2. Inject CSS/JS hotfix trực tiếp qua CDP để UI đổi ngay.
3. Verify lại bằng CDP.

## F) Apply (asar patch, chỉ khi được yêu cầu)

```powershell
$zaloShortcut = 'C:\Users\Lien\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk'
$zaloProc = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' }
if ($zaloProc) { $zaloProc | Stop-Process -Force }
Start-Sleep -Seconds 2

$stillRunning = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' }
if ($stillRunning) { throw 'Zalo is still running; abort apply.' }

node .\tools\zalous-cli.js apply [--asar <path>] [--no-backup] [--lite-payload|--full-payload] [--keep-controls]
Start-Process -FilePath $zaloShortcut
```

Apply internals:
1. Resolve `app.asar`.
2. Restore clean base.
3. Build payload và inject runtime.
4. Repack `app.asar`.
5. Sync lại `app.asar.unpacked`.

## G) CDP Verify (bắt buộc sau khi patch)

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1
```

Chỉ coi là xong khi report `pass=true`.

## H) Restore

```powershell
node .\tools\zalous-cli.js restore [--asar <path>]
```

- Ưu tiên backup patch timestamp gần nhất.

## I) Lỗi thường gặp

### `ENOENT ... app.asar.unpacked\...`

Nguyên nhân: thiếu native files trong `.unpacked`.

Cách xử lý:
1. Đóng Zalo.
2. Khôi phục đầy đủ `resources\app.asar.unpacked`.
3. Chạy lại `apply`.
