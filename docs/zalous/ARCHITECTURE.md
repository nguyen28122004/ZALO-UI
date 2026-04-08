# Architecture

## Core parts

### CLI (`tools/zalous-cli.js`)

- Quan ly workspace `%APPDATA%\Zalous`.
- Resolve `app.asar` theo `--asar` hoac latest Zalo.
- Sync built-in assets vao workspace.
- Patch `app.asar` theo clean-base strategy.
- Backup/restore.
- Ho tro direct mode:
  - `add`/`patch` cho `theme`, `theme-pack`, `extension` tren external workspace.
  - `reload` bang hot-reload signal (`config.hotReload.token`), khong can repack asar.
  - Token hot-reload tao moi moi lan goi.

### Runtime (`zalous/runtime/zalous-runtime.js`)

- Chay trong renderer sau khi inject.
- Doc embedded payload + merge voi external config/assets khi co the.
- Apply `theme`/`theme-pack`.
- Chay extension + quan ly extension config.
- Co reload tay:
  - Nut `RL` trong controls.
  - Nut `Reload Trang` trong market.
  - API `window.zalous.reloadPage(...)`.

### Hot-reload watcher

- Runtime external mode theo doi `config.json` bang `fs.watch` (event-driven).
- Khi `hotReload.token` doi, runtime goi `window.location.reload()`.
- Khong dung poll `setInterval` lien tuc nua.

### Market (`zalous/market/*`)

- `catalog.local.json`: danh sach pack local.
- `packs/*`: moi pack co `manifest.json` + assets.

## Data priority

Config boot order:
1. `%APPDATA%\Zalous\config.json` (neu runtime doc duoc external)
2. `localStorage` (`zalous.config.v1`)
3. Embedded payload trong `app.asar`

Assets priority:
- External assets uu tien hon embedded assets neu doc duoc.

## Hot reload signal

Duoc ghi boi CLI vao `%APPDATA%\Zalous\config.json`:
- `hotReload.token`
- `hotReload.type`
- `hotReload.name`
- `hotReload.source`
- `hotReload.at`

Luu y:
- `reload` chi ghi signal.
- Auto reload chi xay ra khi runtime co external watcher.
- Neu runtime khong co watcher (`hasWatcher=false`), can reload tay tren UI.

## Patch strategy

### Clean backup theo version

- Clean backup luu tai: `%APPDATA%\Zalous\backups\app.asar.clean.<version>.bak`.
- Khi `apply`, CLI restore clean backup vao `resources\app.asar` truoc khi inject.

### Payload mode

- Mac dinh la `full payload`.
- Dung `--lite-payload` neu can chi embed config.

### Unpacked dependency

- `@electron/asar` can du native files trong `resources\app.asar.unpacked`.
- Neu thieu file unpacked thi `apply` se fail (`ENOENT`/missing native libs).
- Sau repack, CLI sync lai `.unpacked` ve app target.

## Operational rule

Sau moi thay doi theme/theme-pack/extension, bat buoc verify UI bang CDP:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1
```

Khong hardcode websocket URL; luon lay target tu `http://127.0.0.1:9222/json/list`.

## Restore strategy

`restore` uu tien:
1. `app.asar.<timestamp>.bak`
2. `app.asar.pre_restore.<timestamp>.bak`

Khong restore tu clean backup theo mac dinh.
