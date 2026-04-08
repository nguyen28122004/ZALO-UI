# Luồng hoạt động Zalous

## A) Init

Lệnh:

```powershell
node .\tools\zalous-cli.js init
```

Flow:
1. Tạo `%APPDATA%\Zalous` và các thư mục con.
2. Tạo `config.json` mặc định nếu chưa có.
3. Sync built-in packs từ repo vào runtime workspace.
4. Normalize config theo assets hiện có.

## B) Detect

Lệnh:

```powershell
node .\tools\zalous-cli.js detect [--asar <path>]
```

Flow:
1. Resolve `app.asar` mục tiêu.
2. Ghi path vào `config.json` (`appAsarPath`).

## C) Apply (flow chính)

Lệnh:

```powershell
node .\tools\zalous-cli.js apply [--asar <path>] [--no-backup] [--lite-payload] [--keep-controls]
```

Flow:
1. Resolve `app.asar` (latest nếu không truyền `--asar`).
2. `ensureCleanBaseForPatch`:
   - đảm bảo có clean backup theo version.
   - restore clean backup vào `app.asar`.
3. Sync built-in assets + sync config.
4. Build payload và inject runtime vào `pc-dist/index.html`.
   - mặc định `full payload` (embed đầy đủ assets).
   - nếu truyền `--lite-payload` thì chỉ embed config.
5. Repack bằng `@electron/asar`.
6. Backup timestamp hiện tại (trừ khi `--no-backup`).
7. Ghi đè `resources\app.asar`.
8. Sync `repacked.asar.unpacked` về `resources\app.asar.unpacked`.

## D) Runtime boot

Khi mở Zalo:
1. Runtime đọc embedded payload.
2. Runtime đọc external config/assets từ `%APPDATA%\Zalous`.
3. Normalize config và lưu lại khi cần.
4. Apply `activeTheme`:
   - `theme`: inject CSS
   - `theme-pack`: inject CSS + mount HTML + run JS
5. Chạy các extension bật trong `enabledExtensions`.
6. Render controls và market UI.

## E) Market install

Lệnh:

```powershell
node .\tools\zalous-cli.js market-install --id <packId>
```

Flow:
1. Đọc catalog.
2. Resolve pack + manifest.
3. Cài theo `manifest.type`:
   - `theme`: copy vào `themes`
   - `theme-pack`: copy vào `theme-packs/<id>`
   - `extension`: copy vào `extensions` và bật extension

## F) Restore

Lệnh:

```powershell
node .\tools\zalous-cli.js restore [--asar <path>]
```

Flow hiện tại:
1. Đọc `%APPDATA%\Zalous\backups`.
2. Lấy backup theo thứ tự ưu tiên:
   - `app.asar.<timestamp>.bak`
   - `app.asar.pre_restore.<timestamp>.bak`
3. Copy vào `app.asar` mục tiêu.

Lưu ý:
- `restore` không dùng `app.asar.clean.<version>.bak` mặc định.

## G) Lỗi thường gặp

### `ENOENT ... app.asar.unpacked\...`

Nguyên nhân:
- `resources\app.asar.unpacked` thiếu file native unpacked mà header trong `app.asar` đang tham chiếu.

Xử lý:
1. đóng toàn bộ process Zalo.
2. khôi phục `app.asar.unpacked` đầy đủ.
3. chạy lại `apply`.
