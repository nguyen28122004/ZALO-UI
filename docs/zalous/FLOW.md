# Luồng hoạt động Zalous

## A) Provisioning (`init`)

1. Tạo workspace `%APPDATA%\Zalous`
2. Tạo `config.json` mặc định nếu chưa có
3. Đồng bộ built-in theme vào `%APPDATA%\Zalous\themes`
4. Đồng bộ built-in extension vào `%APPDATA%\Zalous\extensions`

## B) Patch Flow (`apply`)

1. Resolve `app.asar`
- Ưu tiên `--asar <path>`
- Sau đó `config.appAsarPath`
- Cuối cùng auto detect `%LOCALAPPDATA%\Programs\Zalo\Zalo-*\resources\app.asar`

2. Đồng bộ assets trước patch
- Copy `themes/*.css` từ repo vào `%APPDATA%\Zalous\themes`
- Quét `zalous/market/packs/*`, với pack `type: extension` thì copy `entry` vào `%APPDATA%\Zalous\extensions`

3. Nạp runtime data
- Đọc `config.json`
- Đọc theme từ `%APPDATA%\Zalous\themes` (trừ `zalo-common.css`)
- Đọc extension từ `%APPDATA%\Zalous\extensions`
- Lọc `enabledExtensions` để bỏ extension không còn tồn tại

4. Build payload embedded
- `meta`
- `config`
- `themes`
- `extensions`

5. Patch `app.asar`
- Extract `app.asar` ra thư mục tạm
- Sửa `pc-dist/index.html`:
  - Nếu có marker `ZALOUS:BEGIN/END` thì replace
  - Nếu chưa có thì inject trước `</head>`
- Repack thành `app.asar` mới

6. Backup và ghi đè
- Backup asar cũ vào `%APPDATA%\Zalous\backups\app.asar.<timestamp>.bak`
- Ghi đè `app.asar` mới
- Cập nhật `config.appAsarPath`

## C) Runtime Boot Flow (khi mở Zalo)

1. Zalo load `index.html` đã inject
2. Runtime đọc `window.__ZALOUS_EMBEDDED__`
3. Runtime thử nạp external data từ `%APPDATA%\Zalous` (nếu có quyền)
4. Merge cấu hình và assets theo ưu tiên external
5. Áp theme active
6. Chạy danh sách extension đã bật
7. Dựng control UI trong app

## D) Market Flow (local)

1. `market-list`
- Đọc catalog local và liệt kê pack

2. `market-install --id <packId>`
- Resolve pack path
- Đọc `manifest.json`
- Copy `entry` vào `themes` hoặc `extensions` trong `%APPDATA%\Zalous`
- Nếu là extension thì tự add vào `enabledExtensions` (nếu chưa có)

## E) Rollback Flow (`restore`)

1. Tìm backup mới nhất trong `%APPDATA%\Zalous\backups`
2. Copy backup đè lại `app.asar`
3. Mở lại Zalo để xác nhận rollback
