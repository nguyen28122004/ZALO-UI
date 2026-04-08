# Architecture

## Core parts

### CLI (`tools/zalous-cli.js`)

- Quan ly workspace `%APPDATA%\Zalous`.
- Resolve `app.asar` theo `--asar` hoac latest Zalo.
- Sync built-in assets vao workspace.
- Patch `app.asar` theo clean-base strategy.
- Backup/restore.

### Runtime (`zalous/runtime/zalous-runtime.js`)

- Chay trong renderer sau khi inject.
- Doc embedded payload + merge voi external config/assets.
- Apply `theme`/`theme-pack`.
- Chay extension + quan ly extension config.

### Market (`zalous/market/*`)

- `catalog.local.json`: danh sach pack local.
- `packs/*`: moi pack co `manifest.json` + assets.

## Data priority

Config boot order:
1. `%APPDATA%\Zalous\config.json`
2. `localStorage` (`zalous.config.v1`)
3. Embedded payload trong `app.asar`

Assets priority:
- External assets uu tien hon embedded assets neu doc duoc.

## Patch strategy

### Clean backup theo version

- Clean backup luu tai: `%APPDATA%\Zalous\backups\app.asar.clean.<version>.bak`.
- Khi `apply`, CLI restore clean backup vao `resources\app.asar` truoc khi inject.

### Payload mode

- Mac dinh la `full payload`.
- Dung `--lite-payload` neu can chi embed config.

### Unpacked dependency

- `@electron/asar extractAll` can file trong `resources\app.asar.unpacked`.
- Neu thieu file unpacked thi `apply` se fail `ENOENT`.
- Sau repack, CLI sync lai `.unpacked` ve app target.

## Restore strategy

`restore` uu tien:
1. `app.asar.<timestamp>.bak`
2. `app.asar.pre_restore.<timestamp>.bak`

Khong restore tu `clean` backup theo mac dinh.
