# ZALO-UI / hara-zalous

`hara-zalous` là bộ patch giao diện cho Zalo Desktop.

Mục tiêu hiện tại:
- Patch `app.asar` bằng runtime `zalous`.
- Quản lý theme/extension tập trung qua `zalous/market/packs`.
- Mỗi lần patch luôn khôi phục từ clean base rồi mới inject lại.
- Runtime chạy theo config trong `%APPDATA%\Zalous\config.json` (có fallback `localStorage`).

## Cấu trúc repo

- `tools/zalous-cli.js`: CLI chính
- `zalous/runtime/zalous-runtime.js`: runtime inject vào renderer
- `zalous/market/catalog.local.json`: catalog local
- `zalous/market/packs/*`: pack theme/extension
- `docs/zalous/*`: tài liệu chi tiết

## Cấu trúc dữ liệu runtime trên máy

- `%APPDATA%\Zalous\config.json`
- `%APPDATA%\Zalous\themes\*.css`
- `%APPDATA%\Zalous\extensions\*.js`
- `%APPDATA%\Zalous\backups\app.asar.*.bak`
- `%APPDATA%\Zalous\backups\app.asar.clean.<Zalo-Version>.bak`

## Nguyên tắc patch mới

1. `apply` tự tìm bản Zalo mới nhất (nếu không truyền `--asar`).
2. Trước khi patch, luôn restore từ `clean backup` theo version.
3. Sau đó mới inject payload/runtime và repack.
4. Luôn backup bản trước khi ghi đè.

## Quick start

```powershell
npm install
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js detect
node .\tools\zalous-cli.js apply
```

## Lệnh chính

```powershell
node .\tools\zalous-cli.js status
node .\tools\zalous-cli.js apply
node .\tools\zalous-cli.js restore
node .\tools\zalous-cli.js list-themes
node .\tools\zalous-cli.js set-theme --theme pastel-mint.css
node .\tools\zalous-cli.js list-extensions
node .\tools\zalous-cli.js enable-extension --name lock-pin-dots.js
node .\tools\zalous-cli.js market-list
node .\tools\zalous-cli.js market-install --id theme.pastel-mint
```

## Tài liệu

- [Kiến trúc](./docs/zalous/ARCHITECTURE.md)
- [Luồng hoạt động](./docs/zalous/FLOW.md)
- [CLI Reference](./docs/zalous/CLI.md)
- [Hướng dẫn UI](./docs/ZALO_UI_MOD_GUIDE.md)
