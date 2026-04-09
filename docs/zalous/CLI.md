# CLI Reference

## Syntax

```powershell
node .\tools\zalous-cli.js <command> [flags]
```

## Commands

### `patch-now [--asar <path>] [--no-backup] [--lite-payload|--full-payload] [--keep-controls]`
- Lenh mac dinh neu khong truyen command.
- Tu dong detect latest `app.asar` va patch runtime.

### `init`
- Tao layout `%APPDATA%\Zalous`.
- Sync built-in assets vao `themes`, `theme-packs`, `extensions`.
- Normalize config.

### `detect [--asar <path>]`
- Resolve `app.asar` va luu vao `config.appAsarPath`.

### `status`
- In JSON trang thai runtime workspace.

### `apply [--asar <path>] [--no-backup] [--lite-payload|--full-payload] [--keep-controls]`
- Restore clean base theo version.
- Inject runtime vao `pc-dist/index.html`.
- Repack va sync lai `app.asar.unpacked`.

### `restore [--asar <path>]`
- Restore backup patch gan nhat (`app.asar.<timestamp>.bak`) truoc.

### `list-themes`
- Liet ke theme files va `pack:<id>`.

### `set-theme --theme <file.css|pack:pack-id>`
- Dat `activeTheme`.

### `list-extensions`
- Liet ke extension va trang thai `[on]/[off]`.

### `enable-extension --name <file.js>`
- Bat extension.

### `disable-extension --name <file.js>`
- Tat extension.

### `import-theme --file <path.css> [--name custom.css]`
- Import theme ngoai vao `%APPDATA%\Zalous\themes`.

### `import-extension --file <path.js> [--name custom.js]`
- Import extension ngoai vao `%APPDATA%\Zalous\extensions`.

### `add --type <theme|theme-pack|extension> ...`
- Them asset moi truc tiep vao `%APPDATA%\Zalous` (khong repack asar).

### `patch --type <theme|theme-pack|extension> ...`
- Patch asset da ton tai trong `%APPDATA%\Zalous` (khong repack asar).

### `reload [--type <all|theme|theme-pack|extension>] [--name <asset>] [--enable|--disable]`
- Bump `config.hotReload.token` de runtime biet co thay doi.

### `market-list [--catalog <path.json>]`
- Liet ke packs trong catalog.

### `market-install --id <packId> [--catalog <path.json>]`
- Cai dat pack tu catalog.

### `doctor`
- In thong tin chan doan nhanh.

## Daily Runtime Patch Flow (khuyen dung)

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

- `add`/`patch`/`reload` cho theme/theme-pack/extension: khong can kill Zalo.
- Ch? patch `asar` khi user yeu cau ro rang (`apply`).

## Safe Apply Flow (chi khi patch asar)

```powershell
$zaloShortcut = 'C:\Users\Lien\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk'
$zaloProc = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' }
if ($zaloProc) { $zaloProc | Stop-Process -Force }
Start-Sleep -Seconds 2

$stillRunning = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' }
if ($stillRunning) { throw 'Zalo is still running; abort apply.' }

node .\tools\zalous-cli.js apply
Start-Process -FilePath $zaloShortcut
```

## Hot Reload Watcher

- `reload` chi gui signal token.
- Runtime co watcher:
  - `WR`: watcher bat.
  - `WX`: watcher tat.
- Neu watcher tat/khong kha dung, dung `RL` de reload tay.

## Mandatory CDP Verify

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

Neu CDP cho thay `source=local+embedded` va `hasRequire=false`, runtime co the khong doc external pack ngay. Khi do can inject hotfix qua CDP cho tab dang chay.

## EXE mode

Co the thay `node .\tools\zalous-cli.js` bang `.\tools\zalous.exe`.
