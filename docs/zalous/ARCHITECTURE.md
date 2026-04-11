# Architecture

## Core Layers

1. CLI
- Entry: `tools/zalous-cli.js`
- Core: `tools/zalous-cli/core.js`
- Nhiệm vụ: init workspace, detect/apply/restore asar, manage market packs, hot-reload signal.

2. Runtime
- Loader: `zalous/runtime/zalous-runtime.js`
- Runtime modules: `zalous/runtime/modules/*.js`
- Inject vào `pc-dist/index.html` trong `app.asar`.

3. Market
- Catalog: `zalous/market/catalog.local.json`
- Packs: `zalous/market/packs/*`

## Runtime Boot

Config priority:
1. External `%APPDATA%\Zalous\config.json` (nếu runtime đọc được filesystem)
2. `localStorage` (`zalous.config.v1`)
3. Embedded payload

Asset merge priority:
- External assets ghi đè embedded assets.

## Email Extension (Modular)

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

Build:
- `tools/build-email-prototype.js`
- output: `email-prototype.js`

## Hot Reload

CLI ghi `config.hotReload`:
- `token`, `type`, `name`, `source`, `at`

Runtime watcher phát hiện token đổi sẽ reload trang.

## Patch Strategy

1. Restore clean base backup theo version
2. Extract asar
3. Inject runtime/payload
4. Repack + sync `.unpacked`
5. Backup timestamped file trước khi overwrite
