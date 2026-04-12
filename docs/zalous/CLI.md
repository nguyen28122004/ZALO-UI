# CLI Reference

## Syntax

```powershell
node .\tools\zalous-cli.js <command> [flags]
```

## Main commands

### `patch-now`

Mac dinh neu khong truyen command.

- Detect `app.asar`
- Patch runtime
- Support `--no-backup`, `--lite-payload`, `--full-payload`, `--keep-controls`

### `init`

- Tao `%APPDATA%\Zalous`
- Sync built-in assets vao workspace
- Normalize config

### `detect`

- Resolve `app.asar`
- Luu vao `config.appAsarPath`

### `status`

- In JSON trang thai workspace/runtime

### `apply`

- Restore clean base
- Inject runtime vao `pc-dist/index.html`
- Repack `app.asar`
- Sync lai `app.asar.unpacked`

### `restore`

- Restore backup patch gan nhat

### `list-themes`

- Liet ke theme files va `pack:<id>`

### `set-theme --theme <name>`

- Dat `activeTheme`

### `list-extensions`

- Liet ke extension va trang thai `[on]/[off]`

### `enable-extension --name <file.js>`

- Bat extension

### `disable-extension --name <file.js>`

- Tat extension

### `import-theme --file <path.css> [--name custom.css]`

- Import theme vao `%APPDATA%\Zalous\themes`

### `import-extension --file <path.js> [--name custom.js]`

- Import extension vao `%APPDATA%\Zalous\extensions`

### `add --type <theme|theme-pack|extension>`

- Them asset moi vao workspace external

### `patch --type <theme|theme-pack|extension>`

- Patch asset da ton tai trong workspace external

### `reload`

- Bump `config.hotReload.token`
- Co the kem `--type`, `--name`, `--enable`, `--disable`

### `market-list`

- Liet ke packs trong catalog

### `market-install --id <packId>`

- Cai pack tu catalog

### `doctor`

- In thong tin chan doan nhanh

## Exe mode

Co the thay:

```powershell
node .\tools\zalous-cli.js
```

bang:

```powershell
.\tools\zalous.exe
```
