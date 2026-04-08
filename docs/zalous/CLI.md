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

### `add --type <theme|theme-pack|extension> ...`
- Them asset truc tiep vao `%APPDATA%\Zalous` khong can repack `app.asar`.
- Theme:
  - `add --type theme --file <path.css> [--name custom.css] [--activate] [--reload]`
- Extension:
  - `add --type extension --file <path.js> [--name custom.js] [--no-enable] [--reload]`
- Theme-pack:
  - `add --type theme-pack --dir <pack-dir> [--id pack-id] [--activate] [--reload]`

### `patch --type <theme|theme-pack|extension> ...`
- Patch asset da co trong `%APPDATA%\Zalous`, khong can repack `app.asar`.
- Theme:
  - `patch --type theme --name <file.css> --file <path.css> [--activate] [--reload]`
- Extension:
  - `patch --type extension --name <file.js> --file <path.js> [--reload]`
- Theme-pack:
  - `patch --type theme-pack --id <pack-id> --dir <pack-dir> [--activate] [--reload]`
  - hoac patch tung file:
    - `patch --type theme-pack --id <pack-id> --css <path.css> [--js <path.js>] [--html <path.html>] [--reload]`

### `reload [--type <all|theme|theme-pack|extension>] [--name <asset>] [--enable|--disable]`
- Gui hot-reload signal qua `config.hotReload.token`.
- Runtime Zalous dang chay se tu reload trang va nap lai asset moi tu `%APPDATA%\Zalous`.
- Co the ket hop:
  - `reload --type theme --name my-theme.css`
  - `reload --type theme-pack --name themepack-abc`
  - `reload --type extension --name ext.js --enable`

### `market-list [--catalog <path.json>]`
- Liet ke packs trong catalog.

### `market-install --id <packId> [--catalog <path.json>]`
- Cai pack theo `manifest.type`.

### `doctor`
- In thong tin chan doan nhanh.

## EXE mode

Co the thay `node .\tools\zalous-cli.js` bang `.\tools\zalous.exe`.
