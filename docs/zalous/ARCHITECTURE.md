# Kiến trúc Zalous

## 1) Thành phần chính

1. CLI: `tools/zalous-cli.js`
- Quản lý config/runtime assets trong `%APPDATA%\Zalous`.
- Phát hiện `app.asar` Zalo mới nhất.
- Áp dụng chiến lược patch từ clean base.
- Backup/restore.
- Quản lý market local.

2. Runtime: `zalous/runtime/zalous-runtime.js`
- Chạy trong renderer sau khi inject.
- Nạp payload embedded + nạp external config/assets (nếu có quyền).
- Fallback config qua `localStorage` để giữ trạng thái.
- Áp theme, chạy extension, hiển thị `zalous-controls`.

3. Market: `zalous/market/*`
- `catalog.local.json`: metadata pack.
- `packs/*`: mỗi pack có `manifest.json` + `entry`.
- Theme/extension built-in đều ở đây.

## 2) Nguồn dữ liệu runtime

Thứ tự ưu tiên config khi boot:
1. `%APPDATA%\Zalous\config.json` (external)
2. `localStorage` (`zalous.config.v1`)
3. Embedded payload trong `app.asar`

Thứ tự ưu tiên assets:
- Theme/extension external ghi đè embedded khi đọc được.

## 3) Chiến lược patch sạch

Mỗi phiên bản Zalo có 1 clean backup riêng:
- `%APPDATA%\Zalous\backups\app.asar.clean.<version>.bak`

Khi `apply`:
1. Restore clean backup đó vào `resources\app.asar`.
2. Inject marker block `ZALOUS:BEGIN/END` vào `pc-dist/index.html`.
3. Repack và ghi đè.
4. Tạo backup timestamp.

## 4) Bảo trì an toàn

- Không patch chồng trực tiếp trên asar đã bị patch bẩn.
- Mọi lần patch đều xuất phát từ clean base.
- Config được normalize tự động theo asset hiện có (theme/ext hợp lệ).
