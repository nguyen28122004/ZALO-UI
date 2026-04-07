# Kiến trúc Zalous

## 1) Tổng quan thành phần

1. `tools/zalous-cli.js` (control plane)
- Quản lý `%APPDATA%\Zalous` (config, themes, extensions, backups)
- Tìm `app.asar` của Zalo
- Patch `pc-dist/index.html` trong `app.asar`
- Backup và restore
- Cài pack từ local market
- Đồng bộ built-in theme/extension trước khi patch

2. `zalous/runtime/zalous-runtime.js` (runtime trong renderer)
- Chạy khi Zalo load `index.html`
- Đọc payload embedded: `window.__ZALOUS_EMBEDDED__`
- Thử nạp dữ liệu external từ `%APPDATA%\Zalous` khi có quyền `require`
- Áp theme đang active, chạy extension đã bật
- Render control UI (ON/OFF, chuyển theme, market)

3. Data store `%APPDATA%\Zalous`
- `config.json`: trạng thái runtime (`activeTheme`, `enabledExtensions`, `patchEnabled`, `appAsarPath`...)
- `themes/*.css`: theme runtime sử dụng
- `extensions/*.js`: extension runtime sử dụng
- `backups/*.bak`: backup để rollback

4. Market layer
- `zalous/market/catalog.local.json`: danh sách pack local
- `zalous/market/packs/*`: pack theme/extension mẫu
- `market-install`: copy entry của pack vào `%APPDATA%\Zalous`

## 2) Chiến lược inject

Patch engine chỉ sửa `pc-dist/index.html` bên trong `app.asar`:
- Chèn hoặc thay thế block marker:
  - `<!-- ZALOUS:BEGIN -->`
  - script payload (`window.__ZALOUS_EMBEDDED__ = ...`)
  - script runtime (`zalous-runtime.js`)
  - `<!-- ZALOUS:END -->`

Thiết kế này idempotent: patch nhiều lần vẫn thay đúng block cũ.

## 3) Mô hình cấu hình

Nguồn dữ liệu runtime có hai lớp:
1. Embedded payload (được chèn lúc patch)
2. External payload từ `%APPDATA%\Zalous` (ưu tiên khi runtime có quyền đọc file)

Mục tiêu:
- Zalo vẫn chạy được nếu external không đọc được
- Khi external đọc được, có thể cập nhật theme/extension mà không cần thay mã runtime

## 4) Đồng bộ assets khi patch

Trong cấu trúc hiện tại:
- `init` và `apply` đều đồng bộ built-in assets từ repo vào `%APPDATA%\Zalous`
- Theme: copy từ `themes/*.css`
- Extension built-in: quét `zalous/market/packs/*/manifest.json`, lấy pack `type: extension` rồi copy file `entry`

Nhờ đó tránh tình trạng code repo mới nhưng `%APPDATA%` vẫn giữ theme/extension cũ.

## 5) Bảo mật hiện tại

- Mô hình local trust
- Extension chạy bằng `new Function(...)` trong renderer context
- Chưa có chữ ký số cho local pack

## 6) Định hướng online market

- Catalog HTTPS có chữ ký
- Tải pack kèm checksum/signature
- Quản lý version/dependency rõ ràng
- Chính sách chặn extension không đáng tin cậy
- Rollback theo từng pack
