# CLI Reference

## Syntax

```powershell
node .\tools\zalous-cli.js <command> [flags]
```

## Commands

### `init`
- Tao workspace `%APPDATA%\Zalous`.
- Sync built-in assets vao `themes`, `theme-packs`, `extensions`.
- Chuan hoa config.

### `detect [--asar <path>]`
- Resolve `app.asar` va luu vao `config.appAsarPath`.

### `status`
- In JSON trang thai runtime.

### `apply [--asar <path>] [--no-backup] [--lite-payload] [--keep-controls]`
- Restore clean base theo version.
- Inject runtime + payload vao `pc-dist/index.html`.
- Repack + sync `app.asar.unpacked`.
- Mac dinh full payload; `--lite-payload` de dung lite.

### `restore [--asar <path>]`
- Restore backup theo thu tu uu tien:
  - `app.asar.<timestamp>.bak`
  - `app.asar.pre_restore.<timestamp>.bak`

### `list-themes`
- Liet ke theme + `pack:<id>`.

### `set-theme --theme <file.css|pack:pack-id>`
- Dat `activeTheme`.

### `list-extensions`
- Liet ke extension voi trang thai `[on]/[off]`.

### `enable-extension --name <file.js>`
- Bat extension.

### `disable-extension --name <file.js>`
- Tat extension.

### `import-theme --file <path.css> [--name custom.css]`
- Import theme ngoai vao workspace.

### `import-extension --file <path.js> [--name custom.js]`
- Import extension ngoai vao workspace.

### `market-list [--catalog <path.json>]`
- Liet ke packs trong catalog.

### `market-install --id <packId> [--catalog <path.json>]`
- Cai pack theo `manifest.type`.

### `doctor`
- In thong tin chan doan nhanh.

## EXE mode

Co the thay `node .\tools\zalous-cli.js` bang `.\tools\zalous.exe`.
