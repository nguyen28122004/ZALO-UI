# CLI Reference

## Cú pháp

```powershell
node .\tools\zalous-cli.js <command> [flags]
```

## Commands

### `init`

- Khởi tạo workspace `%APPDATA%\Zalous`
- Đồng bộ built-in:
  - `theme` vào `%APPDATA%\Zalous\themes`
  - `theme-pack` vào `%APPDATA%\Zalous\theme-packs`
  - `extension` vào `%APPDATA%\Zalous\extensions`
- Chuẩn hóa config

### `detect [--asar <path>]`

- Detect `app.asar` và lưu vào config

### `status`

- In trạng thái hiện tại:
  - `activeTheme`, `patchEnabled`, `enabledExtensions`
  - `themeCount`, `themePackCount`, `extensionCount`

### `apply [--asar <path>] [--no-backup]`

- Tự chọn bản Zalo mới nhất nếu không truyền `--asar`
- Restore clean base trước patch
- Sync assets/config
- Inject runtime + payload rồi repack
- Backup timestamp trước khi ghi đè

### `restore [--asar <path>]`

- Restore backup timestamp mới nhất

### `list-themes`

- Liệt kê tất cả theme khả dụng:
  - file `.css`
  - key theme-pack dạng `pack:<id>`

### `set-theme --theme <file.css|pack:pack-id>`

- Đặt theme active (hỗ trợ cả `theme` và `theme-pack`)

### `list-extensions`

- Liệt kê extension + trạng thái on/off

### `enable-extension --name <file.js>`

- Bật extension

### `disable-extension --name <file.js>`

- Tắt extension

### `import-theme --file <path.css> [--name custom.css]`

- Import theme CSS ngoài vào `%APPDATA%\Zalous\themes`

### `import-extension --file <path.js> [--name custom.js]`

- Import extension JS ngoài vào `%APPDATA%\Zalous\extensions`

### `market-list [--catalog <path.json>]`

- Liệt kê pack trong catalog

### `market-install --id <packId> [--catalog <path.json>]`

- Cài pack theo manifest:
  - `theme` -> copy vào `themes`
  - `theme-pack` -> copy vào `theme-packs/<id>`
  - `extension` -> copy vào `extensions` và tự bật extension

### `doctor`

- Chẩn đoán nhanh path/runtime/asar

## Ví dụ

```powershell
node .\tools\zalous-cli.js apply
node .\tools\zalous-cli.js list-themes
node .\tools\zalous-cli.js set-theme --theme pastel-lilac.css
node .\tools\zalous-cli.js set-theme --theme pack:themepack.pastel-dawn
node .\tools\zalous-cli.js enable-extension --name blur-elements.js
node .\tools\zalous-cli.js market-install --id themepack.pastel-dawn
```
