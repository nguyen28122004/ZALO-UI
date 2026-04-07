# Zalous Architecture

## Components

1. `tools/zalous-cli.js` (CLI control plane)
- Detect Zalo install + `app.asar`.
- Manage `%APPDATA%\Zalous` config/assets.
- Inject runtime bootstrap vao `pc-dist/index.html`.
- Backup/restore `app.asar`.
- Install pack tu local market catalog.

2. `zalous-runtime.js` (injected runtime)
- Khoi tao khi Zalo renderer load.
- Doc embedded payload (`window.__ZALOUS_EMBEDDED__`).
- Co gang doc external config/themes/extensions tu `%APPDATA%\Zalous` neu `require` kha dung.
- Apply theme, execute extensions, mount control UI.

3. Data store `%APPDATA%\Zalous`
- `config.json`: active theme, enabled extensions, appAsar path.
- `themes/*.css`: giao dien.
- `extensions/*.js`: code runtime plugin.
- `backups/*.bak`: rollback asar.

4. Market layer
- `zalous/market/catalog.local.json` la source catalog local.
- `zalous/market/packs/*` la pack template.
- `market-install` copy pack assets vao data store runtime.

## Injection Strategy

Patch engine thay doi duy nhat `pc-dist/index.html` trong `app.asar`:
- Insert marker block:
  - `<!-- ZALOUS:BEGIN -->`
  - payload script
  - runtime script
  - `<!-- ZALOUS:END -->`
- Neu marker da ton tai: replace idempotent.

## Security Model (current)

- Local-only trust model.
- Extensions chay qua `new Function(...)` trong renderer context.
- Khong co signature check cho local pack.

## Security Model (target online market)

- Signed catalog + checksum pack.
- Optional publisher keys.
- Disable unsigned extension by policy.
