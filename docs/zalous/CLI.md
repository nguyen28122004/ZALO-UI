# CLI Reference

## Cú pháp

```powershell
node .\tools\zalous-cli.js <command> [flags]
```

## Commands

### `init`

- Khởi tạo `%APPDATA%\Zalous`.
- Đồng bộ built-in assets từ repo vào:
  - `%APPDATA%\Zalous\themes`
  - `%APPDATA%\Zalous\theme-packs`
  - `%APPDATA%\Zalous\extensions`
- Chuẩn hóa config.

### `detect [--asar <path>]`

- Resolve `app.asar` và lưu vào `config.appAsarPath`.

### `status`

- In JSON trạng thái runtime:
  - `activeTheme`, `patchEnabled`, `enabledExtensions`
  - `themeCount`, `themePackCount`, `extensionCount`

### `apply [--asar <path>] [--no-backup] [--lite-payload] [--keep-controls]`

- Resolve target `app.asar` (latest nếu không truyền `--asar`).
- Restore clean backup theo version trước khi patch.
- Sync assets/config.
- Inject runtime + payload vào `pc-dist/index.html`.
- Repack và sync lại `app.asar.unpacked`.
- Tạo backup timestamp trừ khi có `--no-backup`.
- Mặc định là full payload; thêm `--lite-payload` để chỉ embed config.

Ghi chú:
- `apply` yêu cầu `resources\app.asar.unpacked` đọc được đầy đủ. Thiếu file unpacked sẽ fail `ENOENT` khi extract.

### `restore [--asar <path>]`

- Restore backup theo thứ tự ưu tiên:
  - `app.asar.<timestamp>.bak`
  - `app.asar.pre_restore.<timestamp>.bak`

Ghi chú:
- Command này không restore từ clean backup mặc định.

### `list-themes`

- Liệt kê theme khả dụng:
  - file `.css`
  - key `pack:<theme-pack-id>`

### `set-theme --theme <file.css|pack:pack-id>`

- Đặt `activeTheme`.

### `list-extensions`

- Liệt kê extension cùng trạng thái `[on]/[off]`.

### `enable-extension --name <file.js>`

- Bật extension.

### `disable-extension --name <file.js>`

- Tắt extension.

### `import-theme --file <path.css> [--name custom.css]`

- Import theme ngoài vào `%APPDATA%\Zalous\themes`.

### `import-extension --file <path.js> [--name custom.js]`

- Import extension ngoài vào `%APPDATA%\Zalous\extensions`.

### `market-list [--catalog <path.json>]`

- Liệt kê pack trong catalog.

### `market-install --id <packId> [--catalog <path.json>]`

- Cài pack theo manifest:
  - `theme` -> copy vào `themes`
  - `theme-pack` -> copy vào `theme-packs/<id>`
  - `extension` -> copy vào `extensions` và tự bật extension

### `doctor`

- In thông tin chẩn đoán nhanh:
  - `repoRoot`, `zalousRoot`
  - `runtimeExists`, `catalogExists`
  - `asarDetected`, `asarPath`

## Ví dụ

```powershell
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js apply
node .\tools\zalous-cli.js apply --lite-payload
node .\tools\zalous-cli.js status
node .\tools\zalous-cli.js set-theme --theme pack:themepack.pastel-dawn
node .\tools\zalous-cli.js enable-extension --name blur-elements.js
node .\tools\zalous-cli.js market-install --id themepack.pastel-dawn
```
