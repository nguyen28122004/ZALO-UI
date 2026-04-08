# ZALO-UI / hara-zalous

`hara-zalous` la bo patch giao dien Zalo Desktop theo mo hinh pack (`theme`, `theme-pack`, `extension`).

## Muc tieu

- Patch `app.asar` bang runtime Zalous.
- Quan ly theme/extension tap trung.
- Luong patch on dinh: restore clean base -> inject runtime -> repack -> sync unpacked.

## Cau truc repo

- `tools/zalous-cli.js`: CLI chinh.
- `tools/zalous.exe`: ban dong goi (build tu `pkg`).
- `zalous/runtime/zalous-runtime.js`: runtime inject vao renderer.
- `zalous/market/catalog.local.json`: catalog local.
- `zalous/market/packs/*`: cac pack.
- `docs/zalous/*`: tai lieu ky thuat.

## Du lieu tren may

- `%APPDATA%\Zalous\config.json`
- `%APPDATA%\Zalous\themes\*.css`
- `%APPDATA%\Zalous\theme-packs\<pack-id>\*`
- `%APPDATA%\Zalous\extensions\*.js`
- `%APPDATA%\Zalous\backups\app.asar.*.bak`
- `%APPDATA%\Zalous\backups\app.asar.clean.<Zalo-Version>.bak`
- `...\Zalo-<version>\resources\app.asar`
- `...\Zalo-<version>\resources\app.asar.unpacked`

## Quick Start (Node)

```powershell
npm install
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js detect
node .\tools\zalous-cli.js apply
```

## Quick Start (EXE)

```powershell
.\tools\zalous.exe init
.\tools\zalous.exe detect
.\tools\zalous.exe apply
```

## Patch an toan

1. Dong toan bo process Zalo.
2. Dam bao `resources\app.asar.unpacked` day du.
3. Chay `apply`.
4. Mo lai Zalo de kiem tra.

## Build va Release

- Xem chi tiet trong [Build Guide](./docs/zalous/BUILD.md).

## Tai lieu

- [Architecture](./docs/zalous/ARCHITECTURE.md)
- [Flow](./docs/zalous/FLOW.md)
- [CLI](./docs/zalous/CLI.md)
- [Build](./docs/zalous/BUILD.md)
- [UI Guide](./docs/ZALO_UI_MOD_GUIDE.md)
