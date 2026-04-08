# Kiến trúc Zalous

## 1) Thành phần

### CLI (`tools/zalous-cli.js`)

- Quản lý workspace `%APPDATA%\Zalous`.
- Resolve `app.asar` mục tiêu theo `--asar` hoặc bản Zalo mới nhất.
- Đồng bộ built-in assets vào `%APPDATA%\Zalous`.
- Patch `app.asar` theo chiến lược clean-base.
- Backup/restore.

### Runtime (`zalous/runtime/zalous-runtime.js`)

- Chạy trong renderer sau khi inject.
- Đọc payload embedded và merge với config/assets external.
- Apply `theme` hoặc `theme-pack`.
- Chạy extension và quản lý extension config.
- Render controls + Market Manager.

### Market (`zalous/market/*`)

- `catalog.local.json`: catalog local.
- `packs/*`: mỗi pack gồm `manifest.json` và assets.
- Loại pack: `theme`, `theme-pack`, `extension`.

## 2) Mô hình dữ liệu runtime

Ưu tiên config khi boot:
1. `%APPDATA%\Zalous\config.json`
2. `localStorage` (`zalous.config.v1`)
3. Embedded payload trong `app.asar`

Ưu tiên assets:
- External assets trong `%APPDATA%\Zalous` ghi đè embedded assets nếu đọc được.

## 3) Mô hình patch

### Clean base theo version

- Mỗi version Zalo có clean backup riêng:
  - `%APPDATA%\Zalous\backups\app.asar.clean.<version>.bak`
- Khi `apply`, CLI luôn copy clean backup đè lên `resources\app.asar` trước khi inject.

### Payload mode

- Mặc định `full payload` (embed đầy đủ `themes`, `themePacks`, `extensions`).
- Dùng `--lite-payload` để chỉ embed config.

### Unpacked dependency

- `extractAll` của `@electron/asar` cần đọc được các file đã đánh dấu `unpacked` qua đường dẫn `resources\app.asar.unpacked\...`.
- Nếu `app.asar.unpacked` thiếu file native, `apply` sẽ fail `ENOENT`.
- Sau repack, CLI sync lại `repackedAsar.unpacked` về `resources\app.asar.unpacked`.

## 4) Inject model

`apply` chỉnh trực tiếp `pc-dist/index.html`:
- Tìm block `<!-- ZALOUS:BEGIN --> ... <!-- ZALOUS:END -->` để replace.
- Nếu chưa có block thì chèn trước `</head>` hoặc `</body>`.
- Inject:
  - payload script (`window.__ZALOUS_EMBEDDED__`)
  - runtime script (`zalous-runtime.js`)

## 5) Theme, theme-pack, extension

### `theme`

- CSS thuần.
- Runtime inject vào style host.

### `theme-pack`

- Hỗ trợ CSS + JS + HTML.
- HTML mount vào `#zalous-theme-pack-html`.
- JS có thể trả cleanup function.

### `extension`

- Chạy như plugin runtime.
- API config:
  - `getConfig(fallback)`
  - `setConfig(nextValue)`
  - `registerConfig(schema)`
- Schema UI hiện hỗ trợ `select`, `checkbox`.

## 6) Restore strategy

- `restore` hiện ưu tiên `app.asar.<timestamp>.bak`.
- Nếu không có thì mới dùng `app.asar.pre_restore.<timestamp>.bak`.
- Không dùng `app.asar.clean.<version>.bak` cho restore mặc định.
