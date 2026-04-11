# ZALO-UI / hara-zalous

Toolkit patch UI cho Zalo Desktop theo mô hình `theme`, `theme-pack`, `extension`.

## Quick Start

```powershell
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js detect
node .\tools\zalous-cli.js apply
```

## Kiến trúc mới

- CLI entry: `tools/zalous-cli.js`
- CLI core module: `tools/zalous-cli/core.js`
- Runtime loader: `zalous/runtime/zalous-runtime.js`
- Runtime modules: `zalous/runtime/modules/*.js`
- Market packs: `zalous/market/packs/*`
- Email extension source modules: `zalous/market/packs/email-prototype/src/*.js`

## Build extension email

```powershell
node .\tools\build-email-prototype.js
```

Script trên sẽ build `zalous/market/packs/email-prototype/email-prototype.js` từ các module trong `src/`.

## Daily Flow (không repack)

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

## Email Extension

`email-prototype` hiện hỗ trợ:

- Folder tree + đếm mail/unseen
- Pagination `First/Prev/Next/Last`
- Search/filter
- Read-only detail
- Star/Unstar local (không ghi lên IMAP server)
- Config IMAP/SMTP ngay trong market config

Local config nằm tại `%APPDATA%\Zalous\config.json`:

- `extensionConfigs["email-prototype.js"]`

## Docs

- `docs/zalous/ARCHITECTURE.md`
- `docs/zalous/CLI.md`
- `docs/zalous/FLOW.md`
- `docs/zalous/BUILD.md`
- `docs/zalous/EMAIL_EXTENSION.md`
