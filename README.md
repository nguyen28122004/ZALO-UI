# ZALO-UI / hara-zalous

`hara-zalous` la bo patch UI cho Zalo Desktop theo mo hinh pack (`theme`, `theme-pack`, `extension`).

## Muc tieu

- Patch runtime vao `app.asar` theo clean-base strategy.
- Update UI hang ngay qua `%APPDATA%\Zalous` ma khong can repack asar.
- Verify UI bang CDP truoc/sau moi thay doi.

## Cau truc repo

- `tools/zalous-cli.js`: CLI chinh.
- `tools/zalous.exe`: ban dong goi tu `pkg`.
- `zalous/runtime/zalous-runtime.js`: runtime inject vao renderer.
- `zalous/market/catalog.local.json`: catalog local.
- `zalous/market/packs/*`: pack templates.
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

## Daily Flow (khong repack asar)

Sau khi da `apply` runtime it nhat 1 lan:

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

- Flow `add`/`patch`/`reload` khong can kill Zalo.
- Auto reload phu thuoc watcher (`WR`/`WX` trong controls).

## Runtime Controls

- `RL`: reload trang thu cong.
- `WR`: hot reload watcher dang bat.
- `WX`: hot reload watcher dang tat.

## CDP First Rule

Truoc va sau moi thay doi theme/theme-pack/extension, phai verify CDP:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

Neu runtime dang `source=local+embedded` va `hasRequire=false`, UI co the chua doc external pack ngay. Khi do patch qua CLI van ghi file, nhung can inject hotfix qua CDP de thay doi UI hien tai.

## Build va Release

Xem chi tiet trong [Build Guide](./docs/zalous/BUILD.md).

## Skills

- `.codex/skills/zalous-pack-cdp-check/SKILL.md`
- `.codex/skills/zalous-pack-direct-cli/SKILL.md`

## Tai lieu

- [Architecture](./docs/zalous/ARCHITECTURE.md)
- [Flow](./docs/zalous/FLOW.md)
- [CLI](./docs/zalous/CLI.md)
- [Build](./docs/zalous/BUILD.md)
- [UI Guide](./docs/ZALO_UI_MOD_GUIDE.md)
