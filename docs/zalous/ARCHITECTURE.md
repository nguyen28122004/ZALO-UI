# Kiến trúc Zalous

## 1) Thành phần chính

### CLI: `tools/zalous-cli.js`

- Quản lý workspace `%APPDATA%\Zalous`.
- Tự tìm `app.asar` Zalo mới nhất.
- Áp dụng chiến lược patch từ clean base theo version.
- Sync built-in pack từ repo vào máy.
- Backup/restore.

### Runtime: `zalous/runtime/zalous-runtime.js`

- Chạy trong renderer sau khi inject.
- Nạp payload embedded + nạp external assets/config.
- Áp `theme` hoặc `theme-pack`.
- Chạy extension và quản lý extension config.
- Render `zalous-controls` + Market Manager.

### Market: `zalous/market/*`

- `catalog.local.json`: danh mục pack local.
- `packs/*`: mỗi pack có `manifest.json` và asset tương ứng.
- Các kiểu pack hiện hỗ trợ:
  - `theme`
  - `theme-pack`
  - `extension`

## 2) Nguồn dữ liệu runtime

Ưu tiên config khi boot:
1. `%APPDATA%\Zalous\config.json`
2. `localStorage` (`zalous.config.v1`)
3. Embedded payload trong `app.asar`

Ưu tiên assets:
- External assets ghi đè embedded assets khi đọc được.

## 3) Mô hình asset trên máy

- `themes/*.css`: theme CSS thuần.
- `theme-packs/<pack-id>/manifest.json + assets`: pack giao diện nâng cao.
- `extensions/*.js`: extension runtime.

## 4) Chiến lược patch sạch

Mỗi version Zalo có clean backup riêng:
- `%APPDATA%\Zalous\backups\app.asar.clean.<version>.bak`

Khi `apply`:
1. Restore clean backup vào `resources\app.asar`.
2. Sync assets/config mới nhất.
3. Inject block `ZALOUS:BEGIN/END` vào `pc-dist/index.html`.
4. Repack và ghi đè.
5. Tạo backup timestamp.

## 5) Cơ chế theme và theme-pack

### `theme`
- Áp CSS vào style runtime.

### `theme-pack`
- Áp CSS tương tự theme.
- Mount HTML vào host `#zalous-theme-pack-html`.
- Chạy JS pack; nếu JS trả về hàm cleanup thì runtime gọi cleanup khi đổi theme hoặc clear.

## 6) Cơ chế extension config

Runtime truyền object `zalous` vào mỗi extension:
- `getConfig(fallback)`
- `setConfig(nextValue)`
- `registerConfig(definition)`

Config được lưu trong `config.json` tại `extensionConfigs`.
Market Manager hiển thị nút `Config` cho extension đã đăng ký schema và hiện hỗ trợ field `select`, `checkbox`.
