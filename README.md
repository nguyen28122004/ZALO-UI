# ZALO-UI / hara-zalous

`hara-zalous` là bộ patch UI cho Zalo Desktop theo mô hình pack (`theme`, `theme-pack`, `extension`).

## Mục tiêu

- Patch runtime vào `app.asar` theo chiến lược clean-base.
- Cập nhật UI hằng ngày qua `%APPDATA%\Zalous` mà không cần repack asar.
- Verify UI bằng CDP trước/sau mỗi thay đổi.

## Cấu trúc repo

- `tools/zalous-cli.js`: CLI chính.
- `tools/zalous.exe`: bản đóng gói từ `pkg`.
- `zalous/runtime/zalous-runtime.js`: runtime inject vào renderer.
- `zalous/market/catalog.local.json`: catalog local.
- `zalous/market/packs/*`: pack templates.
- `docs/zalous/*`: tài liệu kỹ thuật.

## Dữ liệu trên máy

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

## Daily Flow (không repack asar)

Sau khi đã `apply` runtime ít nhất 1 lần:

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

- Flow `add`/`patch`/`reload` không cần kill Zalo.
- Auto reload phụ thuộc watcher (`WR`/`WX` trong controls).

## Runtime Controls

- `RL`: reload trang thủ công.
- `WR`: hot reload watcher đang bật.
- `WX`: hot reload watcher đang tắt.

## CDP First Rule

Trước và sau mỗi thay đổi theme/theme-pack/extension, phải verify CDP:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

Nếu runtime đang `source=local+embedded` và `hasRequire=false`, UI có thể chưa đọc external pack ngay. Khi đó patch qua CLI vẫn ghi file, nhưng cần inject hotfix qua CDP để thay đổi UI hiện tại.

## Build và Release

Xem chi tiết trong [Build Guide](./docs/zalous/BUILD.md).

## Skills

- `.codex/skills/zalous-pack-cdp-check/SKILL.md`
- `.codex/skills/zalous-pack-direct-cli/SKILL.md`

## Tài liệu

- [Architecture](./docs/zalous/ARCHITECTURE.md)
- [Flow](./docs/zalous/FLOW.md)
- [CLI](./docs/zalous/CLI.md)
- [Build](./docs/zalous/BUILD.md)
- [UI Guide](./docs/ZALO_UI_MOD_GUIDE.md)
