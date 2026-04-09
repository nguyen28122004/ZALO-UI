# Architecture

## Core Parts

### CLI (`tools/zalous-cli.js`)

- Quan ly workspace `%APPDATA%\Zalous`.
- Resolve `app.asar` theo `--asar` hoac latest Zalo.
- Sync built-in assets vao workspace.
- Patch `app.asar` theo clean-base strategy.
- Backup/restore.
- Ho tro direct mode:
  - `add`/`patch` cho `theme`, `theme-pack`, `extension` tren external workspace.
  - `reload` bang hot-reload signal (`config.hotReload.token`).

### Runtime (`zalous/runtime/zalous-runtime.js`)

- Chay trong renderer sau khi inject.
- Doc embedded payload + merge external config/assets neu truy cap duoc.
- Apply `theme`/`theme-pack`.
- Chay extension + config extension.
- Co controls:
  - `RL`: reload tay.
  - `WR`/`WX`: bat tat hot reload watcher.

### Market (`zalous/market/*`)

- `catalog.local.json`: danh sach pack local.
- `packs/*`: moi pack co `manifest.json` + assets.

## Runtime Load Priority

Config boot order:
1. `%APPDATA%\Zalous\config.json` (neu runtime doc duoc external)
2. `localStorage` (`zalous.config.v1`)
3. Embedded payload trong `app.asar`

Assets priority:
- External assets uu tien hon embedded assets neu runtime co the doc external.

## Hot Reload Watcher

Signal do CLI ghi vao `config.hotReload`:
- `token`
- `type`
- `name`
- `source`
- `at`

Runtime behavior:
- Watcher bat (`WR`): theo doi token va reload khi token doi.
- Watcher tat (`WX`): khong auto reload, can bam `RL`.

## Runtime Source Caveat

Case:
- `source=local+embedded`
- `hasRequire=false`

Tac dong:
- Runtime co the khong doc external filesystem pack ngay.
- `add/patch/reload` van ghi file thanh cong, nhung UI tren tab hien tai co the chua doi.

Fallback:
1. Verify bang CDP.
2. Inject CSS/JS hotfix qua CDP vao tab dang chay.
3. Van luu source fix trong repo va external workspace.

## Patch Strategy

### Clean Backup theo version

- Clean backup: `%APPDATA%\Zalous\backups\app.asar.clean.<version>.bak`.
- Moi lan `apply`, CLI restore clean base truoc khi inject.

### Payload mode

- Mac dinh full payload.
- Co the dung `--lite-payload` neu can.

### Unpacked dependency

- `@electron/asar` can native files trong `resources\app.asar.unpacked`.
- Neu thieu unpacked files thi `apply` se fail.
- Sau repack, CLI sync lai `.unpacked` ve app target.

## Operational Rule

- Theme/theme-pack/extension: mac dinh direct runtime patch (`add`/`patch`/`reload`), khong kill Zalo.
- Patch `asar` chi khi user yeu cau.
- CDP verify la gate bat buoc truoc/sau moi thay doi UI.

## Restore Strategy

`restore` uu tien:
1. `app.asar.<timestamp>.bak`
2. `app.asar.pre_restore.<timestamp>.bak`
