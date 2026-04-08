# ZALO-UI / hara-zalous

`hara-zalous` là bộ patch giao diện cho Zalo Desktop theo mô hình pack (`theme`, `theme-pack`, `extension`).

## Trạng thái hiện tại

- Patch renderer bằng cách inject runtime vào `pc-dist/index.html` trong `app.asar`.
- Runtime ưu tiên đọc config/assets external từ `%APPDATA%\Zalous`.
- `apply` luôn restore từ clean base theo version trước khi inject.
- Mặc định payload là `full`; dùng `--lite-payload` nếu cần patch lite.
- Luồng patch cần `resources\app.asar.unpacked` đầy đủ để extract/repack ổn định.

## Cấu trúc repo

- `tools/zalous-cli.js`: CLI chính.
- `zalous/runtime/zalous-runtime.js`: runtime inject vào renderer.
- `zalous/market/catalog.local.json`: catalog local.
- `zalous/market/packs/*`: pack theme/theme-pack/extension.
- `docs/zalous/*`: tài liệu kiến trúc và flow.

## Dữ liệu trên máy

- `%APPDATA%\Zalous\config.json`
- `%APPDATA%\Zalous\themes\*.css`
- `%APPDATA%\Zalous\theme-packs\<pack-id>\*`
- `%APPDATA%\Zalous\extensions\*.js`
- `%APPDATA%\Zalous\backups\app.asar.*.bak`
- `%APPDATA%\Zalous\backups\app.asar.clean.<Zalo-Version>.bak`
- `...\Zalo-<version>\resources\app.asar`
- `...\Zalo-<version>\resources\app.asar.unpacked`

## Quick Start

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
node .\tools\zalous-cli.js apply --lite-payload
node .\tools\zalous-cli.js restore
node .\tools\zalous-cli.js list-themes
node .\tools\zalous-cli.js set-theme --theme pastel-mint.css
node .\tools\zalous-cli.js set-theme --theme pack:themepack.pastel-dawn
node .\tools\zalous-cli.js list-extensions
node .\tools\zalous-cli.js enable-extension --name blur-elements.js
node .\tools\zalous-cli.js market-list
node .\tools\zalous-cli.js market-install --id themepack.pastel-dawn
```

## Ghi chú vận hành quan trọng

- `apply` patch từ clean backup theo version.
- `restore` ưu tiên backup patch theo timestamp, sau đó mới đến pre-restore.
- Nếu `apply` lỗi `ENOENT ... app.asar.unpacked\...`, cần khôi phục `app.asar.unpacked` đầy đủ trước khi chạy lại.

## Tài liệu

- [Kiến trúc](./docs/zalous/ARCHITECTURE.md)
- [Luồng hoạt động](./docs/zalous/FLOW.md)
- [CLI Reference](./docs/zalous/CLI.md)
- [Hướng dẫn UI](./docs/ZALO_UI_MOD_GUIDE.md)
