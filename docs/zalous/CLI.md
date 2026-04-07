# Zalous CLI Reference

## 1) Cú pháp chung

```powershell
node .\tools\zalous-cli.js <command> [flags]
```

## 2) Danh sách lệnh

### `init`
- Tạo `%APPDATA%\Zalous`
- Tạo `config.json` nếu chưa có
- Đồng bộ built-in theme + extension vào data store

### `detect [--asar <path>]`
- Tìm `app.asar` của Zalo
- Lưu vào `config.appAsarPath`

### `status`
- In trạng thái hiện tại:
  - đường dẫn workspace
  - `appAsarPath`
  - `activeTheme`
  - `patchEnabled`
  - `enabledExtensions`
  - số lượng theme/extension

### `apply [--asar <path>] [--no-backup]`
- Đồng bộ built-in theme/extension từ repo vào `%APPDATA%\Zalous`
- Build payload + inject runtime vào `app.asar`
- Backup asar cũ (trừ khi dùng `--no-backup`)

### `restore [--asar <path>]`
- Restore backup `app.asar` mới nhất

### `list-themes`
- Liệt kê `%APPDATA%\Zalous\themes\*.css` (trừ `zalo-common.css`)

### `set-theme --theme <file.css>`
- Đặt theme active trong config

### `import-theme --file <path.css> [--name custom.css]`
- Import file theme ngoài vào `%APPDATA%\Zalous\themes`

### `list-extensions`
- Liệt kê `%APPDATA%\Zalous\extensions\*.js`
- Hiển thị trạng thái `[on]/[off]`

### `enable-extension --name <file.js>`
- Bật extension trong `enabledExtensions`

### `disable-extension --name <file.js>`
- Tắt extension khỏi `enabledExtensions`

### `import-extension --file <path.js> [--name custom.js]`
- Import extension ngoài vào `%APPDATA%\Zalous\extensions`

### `market-list [--catalog <path.json>]`
- Liệt kê pack trong catalog

### `market-install --id <packId> [--catalog <path.json>]`
- Cài pack từ market local vào data store

### `doctor`
- In thông tin chẩn đoán nhanh:
  - Node version
  - đường dẫn repo/runtime/catalog
  - trạng thái detect `app.asar`

## 3) Ví dụ nhanh

```powershell
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js detect
node .\tools\zalous-cli.js apply
node .\tools\zalous-cli.js set-theme --theme zalo-purple.css
node .\tools\zalous-cli.js enable-extension --name lock-pin-dots.js
```

## 4) Build bản `.exe`

```powershell
npm run build:exe
```

Output:
- `dist/zalous.exe`
