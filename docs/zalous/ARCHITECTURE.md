# Architecture

## Layers

1. CLI
- Entry: `tools/zalous-cli.js`
- Bridge: `tools/zalous-cli/core.js`
- Command layer: `tools/zalous-cli/lib/commands.js`

2. CLI support modules
- `lib/constants.js`: repo/appdata/install paths
- `lib/config-store.js`: `config.json`, managed assets, workspace layout
- `lib/asset-store.js`: built-in sync, theme-pack map, hot-reload token helpers
- `lib/asar-service.js`: detect/apply/restore `app.asar`, unpacked repair
- `lib/market-service.js`: import/add/patch/reload/install assets
- `lib/cli-utils.js`: argv parsing + help text

3. Runtime
- Loader: `zalous/runtime/zalous-runtime.js`
- Modules: `zalous/runtime/modules/*.js`
- Runtime inject vao `pc-dist/index.html` trong `app.asar`

4. Market
- Catalog: `zalous/market/catalog.local.json`
- Packs: `zalous/market/packs/*`

## Config priority

1. `%APPDATA%\Zalous\config.json`
2. `localStorage` key `zalous.config.v1`
3. Embedded payload trong runtime

Neu runtime doc duoc filesystem, external config va assets se de len embedded payload.

## Theme/runtime sync

- Runtime sync palette chung qua bo bien `--zalous-theme-*`
- `#main-tab` duoc force theo `--layer-background-leftmenu`
- `.block-date` duoc sync theo `--zalous-theme-surface`
- Theme-pack co the mount CSS + JS + HTML rieng

## Email prototype pack

Pack: `zalous/market/packs/email-prototype`

Source modules:

- `src/00-core.js`
- `src/10-style.js`
- `src/15-theme-palette.js`
- `src/20-imap.js`
- `src/30-data-render.js`
- `src/31-panel-folder.js`
- `src/32-panel-list.js`
- `src/33-panel-detail.js`
- `src/40-ui.js`
- `src/90-init.js`

Build script:

- `tools/build-email-prototype.js`

Output:

- `zalous/market/packs/email-prototype/email-prototype.js`

## Patch strategy

1. Restore clean backup theo version.
2. Extract `app.asar`.
3. Inject runtime + payload.
4. Repack.
5. Sync lai `app.asar.unpacked`.

## Verified startup note

Shortcut `Zalo.lnk` da verify mo on dinh qua Windows shell (`explorer.exe`).
Tren may nay, viec goi `.lnk` qua Node/Python/cmd khong tao duoc instance giong nhu Explorer, nen flow CDP chuan hoa theo shell launch.
