# CLI Reference

## Cú pháp

```powershell
node .\tools\zalous-cli.js <command> [flags]
```

## Commands

### `init`
- Khởi tạo workspace `%APPDATA%\Zalous`
- Đồng bộ built-in theme/extension
- Chuẩn hóa config

### `detect [--asar <path>]`
- Detect `app.asar` của Zalo và lưu vào config

### `status`
- In trạng thái config/theme/ext hiện tại

### `apply [--asar <path>] [--no-backup]`
- Auto chọn Zalo mới nhất nếu không truyền `--asar`
- Restore clean base trước patch
- Sync assets/config
- Patch và backup timestamp

### `restore [--asar <path>]`
- Restore backup timestamp mới nhất

### `list-themes`
- Liệt kê `%APPDATA%\Zalous\themes`

### `set-theme --theme <name.css>`
- Đặt theme active

### `import-theme --file <path.css> [--name custom.css]`
- Import theme ngoài

### `list-extensions`
- Liệt kê extension + trạng thái on/off

### `enable-extension --name <file.js>`
- Bật extension

### `disable-extension --name <file.js>`
- Tắt extension

### `import-extension --file <path.js> [--name custom.js]`
- Import extension ngoài

### `market-list [--catalog <path.json>]`
- Liệt kê pack local

### `market-install --id <packId> [--catalog <path.json>]`
- Cài pack vào `%APPDATA%\Zalous`

### `doctor`
- Chẩn đoán nhanh path/runtime/asar

## Ví dụ

```powershell
node .\tools\zalous-cli.js apply
node .\tools\zalous-cli.js set-theme --theme pastel-lilac.css
node .\tools\zalous-cli.js enable-extension --name lock-pin-dots.js
```
