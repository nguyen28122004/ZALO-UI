# hara-zalous (zalous)

`hara-zalous` là bộ patch giao diện cho Zalo Desktop theo hướng tương tự Spicetify:
- Patch một lần vào `app.asar` để cắm runtime bootstrap.
- Theme/extension được quản lý riêng trong `%APPDATA%\Zalous`.
- Khi mở Zalo, runtime nạp cấu hình + theme + extension để áp dụng.
- Có local market để cài pack, sẵn sàng mở rộng online market.

## 1) Cấu trúc dự án

- `tools/zalous-cli.js`: CLI chính (`init`, `apply`, `market-install`, ...)
- `zalous/runtime/zalous-runtime.js`: runtime bootstrap inject vào `pc-dist/index.html`
- `zalous/market/catalog.local.json`: catalog local
- `zalous/market/packs/*`: pack mẫu theme/extension
- `themes/*`: bộ theme nguồn của repo
- `docs/zalous/*`: tài liệu chi tiết

Dữ liệu runtime trên máy:
- `%APPDATA%\Zalous\config.json`
- `%APPDATA%\Zalous\themes\*.css`
- `%APPDATA%\Zalous\extensions\*.js`
- `%APPDATA%\Zalous\backups\app.asar.*.bak`

## 2) Điểm mới quan trọng

Từ cấu trúc hiện tại, lệnh `apply` sẽ:
1. Tự đồng bộ built-in theme từ `themes/*.css` vào `%APPDATA%\Zalous\themes`
2. Tự đồng bộ built-in extension từ `zalous/market/packs/*` (manifest `type: extension`) vào `%APPDATA%\Zalous\extensions`
3. Sau đó mới build payload và patch `app.asar`

Điều này đảm bảo runtime luôn dùng bản theme/extension mới nhất theo repo khi patch.

## 3) Quick Start

### 3.1 Cài dependency

```powershell
npm install
```

### 3.2 Khởi tạo workspace

```powershell
node .\tools\zalous-cli.js init
```

### 3.3 Tự động tìm `app.asar`

```powershell
node .\tools\zalous-cli.js detect
```

### 3.4 Patch vào Zalo

```powershell
node .\tools\zalous-cli.js apply
```

Mở lại Zalo để runtime hoạt động ổn định.

## 4) Lệnh thường dùng

```powershell
# Trạng thái
node .\tools\zalous-cli.js status

# Theme
node .\tools\zalous-cli.js list-themes
node .\tools\zalous-cli.js set-theme --theme zalo-green.css
node .\tools\zalous-cli.js import-theme --file C:\path\custom.css --name custom.css

# Extension
node .\tools\zalous-cli.js list-extensions
node .\tools\zalous-cli.js enable-extension --name lock-pin-dots.js
node .\tools\zalous-cli.js disable-extension --name lock-pin-dots.js
node .\tools\zalous-cli.js import-extension --file C:\path\ext.js --name ext.js

# Market local
node .\tools\zalous-cli.js market-list
node .\tools\zalous-cli.js market-install --id theme.zalo-green
node .\tools\zalous-cli.js market-install --id extension.lock-pin-dots

# Restore backup gần nhất
node .\tools\zalous-cli.js restore
```

## 5) Build CLI `.exe`

```powershell
npm run build:exe
```

Output:
- `dist/zalous.exe`

## 6) Tài liệu chi tiết

- [Kiến trúc](./docs/zalous/ARCHITECTURE.md)
- [Luồng hoạt động](./docs/zalous/FLOW.md)
- [CLI Reference](./docs/zalous/CLI.md)
- [Hướng dẫn chỉnh UI](./docs/ZALO_UI_MOD_GUIDE.md)
