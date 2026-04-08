# Flow

## A) Init

```powershell
node .\tools\zalous-cli.js init
```

- Tao `%APPDATA%\Zalous` + cac folder can thiet.
- Tao `config.json` mac dinh neu chua co.
- Sync built-in packs vao runtime workspace.
- Normalize config theo assets hien co.

## B) Detect

```powershell
node .\tools\zalous-cli.js detect [--asar <path>]
```

- Resolve `app.asar` target.
- Ghi vao `config.appAsarPath`.

## C) Apply (main flow)

```powershell
node .\tools\zalous-cli.js apply [--asar <path>] [--no-backup] [--lite-payload] [--keep-controls]
```

1. Resolve `app.asar` (latest neu khong truyen `--asar`).
2. `ensureCleanBaseForPatch`:
   - Dam bao co clean backup theo version.
   - Restore clean backup vao `app.asar`.
3. Sync built-in assets + sync config.
4. Build payload + inject runtime vao `pc-dist/index.html`.
5. Repack bang `@electron/asar`.
6. Backup timestamp (neu khong co `--no-backup`).
7. Ghi de `resources\app.asar`.
8. Sync `repacked.asar.unpacked` -> `resources\app.asar.unpacked`.

## D) Runtime boot

Khi mo Zalo:
1. Runtime doc embedded payload.
2. Runtime doc external config/assets.
3. Normalize config neu can.
4. Apply theme hien tai.
5. Chay enabled extensions.
6. Render controls + market UI.

## E) Direct asset flow (khong qua asar)

Sau khi da `apply` runtime toi thieu 1 lan, co the update asset truc tiep:

```powershell
node .\tools\zalous-cli.js add --type theme-pack --dir .\zalous\market\packs\themepack-hello-kitty --reload
node .\tools\zalous-cli.js patch --type theme --name zalo-green.css --file .\zalous\market\packs\zalo-green\zalo-green.css --reload
node .\tools\zalous-cli.js reload --type extension --name lock-pin-dots.js --enable
```

Flow:
1. CLI copy file/dir vao `%APPDATA%\Zalous\themes|theme-packs|extensions`.
2. CLI cap nhat `config.json` (active theme, enabled extensions neu can).
3. CLI bump `config.hotReload.token`.
4. Runtime watcher phat hien token moi.
5. Runtime `window.location.reload()` de nap lai external assets moi.

## F) Restore

```powershell
node .\tools\zalous-cli.js restore [--asar <path>]
```

- Chon backup theo uu tien (patch timestamp truoc, pre_restore sau).
- Copy vao `app.asar` target.

## G) Loi thuong gap

### `ENOENT ... app.asar.unpacked\...`

Nguyen nhan: thieu file native trong `.unpacked`.

Cach xu ly:
1. Dong Zalo.
2. Khoi phuc day du `resources\app.asar.unpacked`.
3. Chay lai `apply`.
