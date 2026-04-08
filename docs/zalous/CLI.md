# CLI Reference

## Syntax

```powershell
node .\tools\zalous-cli.js <command> [flags]
```

## Safety First: `apply`

Khi patch `app.asar`, bat buoc dung safe flow:

```powershell
$zaloShortcut = 'C:\Users\ACER\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk'
$zaloProc = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' -or $_.Path -like 'C:\Users\ACER\AppData\Local\Programs\Zalo*' }
if ($zaloProc) { $zaloProc | Stop-Process -Force }
Start-Sleep -Seconds 2

$stillRunning = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' -or $_.Path -like 'C:\Users\ACER\AppData\Local\Programs\Zalo*' }
if ($stillRunning) { throw 'Zalo is still running; abort apply.' }

node .\tools\zalous-cli.js apply
Start-Process -FilePath $zaloShortcut
```

Neu `apply` bao thieu file trong `app.asar.unpacked`, khoi phuc lai `resources\app.asar.unpacked` day du roi chay lai.

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
- Mac dinh full payload; `--lite-payload` de dung lite payload.

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
- Token duoc tao moi moi lan goi reload/add/patch co `--reload`.
- Runtime se auto reload neu dang o mode co external watcher.
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

## Mandatory CDP Verify

Sau moi thay doi theme/theme-pack/extension, bat buoc verify bang CDP:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

Vi du assert:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -ExpectedActiveTheme 'pack:themepack.console-minimal' -ExpectedThemePackAttr 'console-minimal'
```

Neu report `hasWatcher=false`, auto reload tu token co the khong kich hoat trong runtime hien tai. Khi do, dung reload tay tren UI:
- Nut `RL` trong controls.
- Nut `Reload Trang` trong market modal.

## EXE mode

Co the thay `node .\tools\zalous-cli.js` bang `.\tools\zalous.exe`.
