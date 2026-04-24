# ZALO-UI / hara-zalous

Toolkit patch UI cho Zalo Desktop theo mo hinh `theme`, `theme-pack`, `extension`.

## Current structure

- `tools/zalous-cli.js`: CLI entry duy nhat.
- `tools/zalous-cli/core.js`: bridge nho de goi command layer.
- `tools/zalous-cli/lib/constants.js`: path constants.
- `tools/zalous-cli/lib/config-store.js`: config/layout store.
- `tools/zalous-cli/lib/asset-store.js`: sync assets + runtime state helpers.
- `tools/zalous-cli/lib/asar-service.js`: detect/apply/restore `app.asar`.
- `tools/zalous-cli/lib/market-service.js`: import/add/patch/reload market assets.
- `tools/zalous-cli/lib/commands.js`: command router.
- `zalous/runtime/`: runtime inject vao Zalo.
- `zalous/market/packs/`: built-in theme packs va extensions.

## Quick start

```powershell
npm install
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js detect
node .\tools\zalous-cli.js status
```

## Verified flows

Direct patch workspace:

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal-v2 --dir .\zalous\market\packs\themepack-console-minimal-v2 --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal-v2
```

Patch `app.asar`:

```powershell
node .\tools\zalous-cli.js apply
```

Launch verified for CDP:

```powershell
explorer.exe "C:\Users\ACER\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk"
```

Trong moi truong nay, `explorer.exe` la cach da verify de shortcut mo dung Zalo va expose CDP port `9222`.

## Email extension

Pack `email-prototype` them pinned mail workspace vao conversation list:

- Folder list + unread count
- Search/filter
- Pagination `First/Prev/Next/Last`
- Read-only message detail
- Local star/tag state
- Theme-aware mail UI
- Wrapper visual moi `.mail-pin-shell` cho pinned item

Build bundle:

```powershell
npm run build:themes
npm run build:email-prototype
```

## Build exe

```powershell
npm run build:themes
npm run build:email-prototype
npm run build:exe
Copy-Item .\dist\zalous.exe .\tools\zalous.exe -Force
```

`pkg.assets` da include runtime + market packs, nen `zalous.exe` mang day du packs trong repo.

## Docs

- `docs/zalous/ARCHITECTURE.md`
- `docs/zalous/BUILD.md`
- `docs/zalous/CLI.md`
- `docs/zalous/EMAIL_EXTENSION.md`
- `docs/zalous/FLOW.md`
- `docs/zalous/USAGE.md`
- `docs/zalous/CDP_FLOW.md`
