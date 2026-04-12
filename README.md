# ZALO-UI / hara-zalous

Toolkit patch UI cho Zalo Desktop theo mo hinh `theme`, `theme-pack`, `extension`.

## Repo layout

- `tools/zalous-cli.js`: CLI entry.
- `tools/zalous-cli/core.js`: CLI core.
- `zalous/runtime/`: runtime inject vao Zalo.
- `zalous/market/packs/`: built-in theme packs va extensions.
- `docs/zalous/`: tai lieu van hanh.

## Quick start

```powershell
npm install
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js detect
node .\tools\zalous-cli.js status
```

## Daily direct flow

Khong can repack `app.asar` neu chi dang sua theme, theme-pack, hoac extension.

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

## Asar apply flow

Chi dung khi can patch thang vao Zalo Desktop.

```powershell
node .\tools\zalous-cli.js apply
```

## Email extension

Pack `email-prototype` them mot pinned item vao conversation list va mo workspace mail read-only:

- Folder list + unread count
- Search/filter
- Pagination `First/Prev/Next/Last`
- Read-only message detail
- Local star/tag state
- Theme palette dong bo voi giao dien Zalo

Build bundle:

```powershell
npm run build:email-prototype
```

## Build exe

```powershell
npm run build:email-prototype
npm run build:exe
Copy-Item .\dist\zalous.exe .\tools\zalous.exe -Force
```

`pkg.assets` da include runtime + market packs, nen file exe se gom toan bo packs trong repo.

## Main docs

- `docs/zalous/ARCHITECTURE.md`
- `docs/zalous/CLI.md`
- `docs/zalous/FLOW.md`
- `docs/zalous/BUILD.md`
- `docs/zalous/EMAIL_EXTENSION.md`
