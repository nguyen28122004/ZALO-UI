# ZALO-UI / hara-zalous

`hara-zalous` là bộ patch giao diện cho Zalo Desktop, quản lý theme/extension theo mô hình pack.

## Mục tiêu hiện tại

- Patch `app.asar` bằng runtime `zalous`.
- Quản lý asset tập trung qua `zalous/market/packs`.
- Hỗ trợ 3 loại pack:
  - `theme` (CSS thuần)
  - `theme-pack` (CSS + JS + HTML)
  - `extension` (JS)
- Mỗi lần patch luôn khôi phục từ clean base rồi mới inject.
- Runtime ưu tiên config external trong `%APPDATA%\Zalous\config.json`.

## Cấu trúc repo

- `tools/zalous-cli.js`: CLI chính
- `zalous/runtime/zalous-runtime.js`: runtime inject vào renderer
- `zalous/market/catalog.local.json`: catalog local
- `zalous/market/packs/*`: pack theme/theme-pack/extension
- `docs/zalous/*`: tài liệu kỹ thuật

## Cấu trúc dữ liệu runtime trên máy

- `%APPDATA%\Zalous\config.json`
- `%APPDATA%\Zalous\themes\*.css`
- `%APPDATA%\Zalous\theme-packs\<pack-id>\*`
- `%APPDATA%\Zalous\extensions\*.js`
- `%APPDATA%\Zalous\backups\app.asar.*.bak`
- `%APPDATA%\Zalous\backups\app.asar.clean.<Zalo-Version>.bak`

## Nguyên tắc patch

1. `apply` tự tìm bản Zalo mới nhất nếu không truyền `--asar`.
2. Trước khi patch luôn restore từ `clean backup` theo version.
3. Inject payload/runtime vào `pc-dist/index.html`.
4. Repack và backup theo timestamp trước khi ghi đè.

## Quick start

```powershell
npm install
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js detect
node .\tools\zalous-cli.js apply
```

## Lệnh thường dùng

```powershell
node .\tools\zalous-cli.js status
node .\tools\zalous-cli.js apply
node .\tools\zalous-cli.js restore
node .\tools\zalous-cli.js list-themes
node .\tools\zalous-cli.js set-theme --theme pastel-mint.css
node .\tools\zalous-cli.js set-theme --theme pack:themepack.pastel-dawn
node .\tools\zalous-cli.js list-extensions
node .\tools\zalous-cli.js enable-extension --name blur-elements.js
node .\tools\zalous-cli.js market-list
node .\tools\zalous-cli.js market-install --id themepack.pastel-dawn
```

## Tài liệu

- [Kiến trúc](./docs/zalous/ARCHITECTURE.md)
- [Luồng hoạt động](./docs/zalous/FLOW.md)
- [CLI Reference](./docs/zalous/CLI.md)
- [Hướng dẫn UI](./docs/ZALO_UI_MOD_GUIDE.md)
