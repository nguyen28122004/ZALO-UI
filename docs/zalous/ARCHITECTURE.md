# Architecture

## Layers

1. CLI
- Entry: `tools/zalous-cli.js`
- Core: `tools/zalous-cli/core.js`
- Nhiem vu: init workspace, detect/apply/restore asar, sync assets, reload signal.

2. Runtime
- Loader: `zalous/runtime/zalous-runtime.js`
- Modules: `zalous/runtime/modules/*.js`
- Runtime inject vao `pc-dist/index.html` trong `app.asar`.

3. Market
- Catalog: `zalous/market/catalog.local.json`
- Packs: `zalous/market/packs/*`

## Config priority

1. `%APPDATA%\Zalous\config.json`
2. `localStorage` key `zalous.config.v1`
3. Embedded payload trong runtime

Neu runtime doc duoc filesystem, external config va assets se de len embedded payload.

## Theme flow

- Runtime sync palette chung qua bo bien `--zalous-theme-*`.
- `#main-tab` duoc force theo `--layer-background-leftmenu`.
- `.block-date` duoc sync theo `--zalous-theme-surface`.
- Theme-pack co the them CSS/JS/HTML rieng.

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

## Hot reload

CLI ghi `config.hotReload` voi:

- `token`
- `type`
- `name`
- `source`
- `at`

Runtime watcher thay token doi se reload tab.

## Patch strategy

1. Restore clean backup phu hop version.
2. Extract `app.asar`.
3. Inject runtime + payload.
4. Repack.
5. Sync lai `app.asar.unpacked`.
