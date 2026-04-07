# Luồng hoạt động Zalous

## A. Init

`node .\tools\zalous-cli.js init`

Kết quả:
1. Tạo `%APPDATA%\Zalous` nếu chưa có.
2. Tạo `config.json` mặc định.
3. Đồng bộ theme/extension built-in từ `zalous/market/packs` vào `%APPDATA%\Zalous`.
4. Chuẩn hóa config theo assets hiện có.

## B. Apply

`node .\tools\zalous-cli.js apply`

Luồng:
1. Resolve asar mục tiêu (latest Zalo nếu không truyền `--asar`).
2. Đảm bảo có clean backup cho version đó.
3. Restore clean backup vào `app.asar`.
4. Sync built-in assets vào `%APPDATA%\Zalous`.
5. Sync config (activeTheme/enabledExtensions hợp lệ).
6. Build payload + inject runtime vào `pc-dist/index.html`.
7. Repack và backup timestamp.
8. Ghi đè `resources\app.asar`.

## C. Runtime boot

Khi mở Zalo:
1. Runtime đọc payload embedded.
2. Runtime thử nạp external config/assets.
3. Runtime fallback localStorage nếu external config không đọc được.
4. Normalize config, lưu lại nếu có thay đổi.
5. Áp theme (nếu `patchEnabled=true`).
6. Chạy enabled extensions.
7. Gắn `zalous-controls`.

## D. Market install

`market-install --id <packId>`:
1. Đọc catalog local.
2. Resolve pack + manifest.
3. Copy entry vào `themes` hoặc `extensions` ở `%APPDATA%\Zalous`.
4. Nếu là extension, tự add vào `enabledExtensions`.

## E. Restore

`node .\tools\zalous-cli.js restore`

- Khôi phục backup timestamp gần nhất vào `app.asar`.
