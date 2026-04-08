# UI Mod Guide

## 1) Selector rules

Uu tien selector theo thu tu:
1. `id`
2. `data-*`, `aria-*`
3. `role`
4. `class*="..."` khi khong con lua chon tot hon

## 2) Pack types

### `theme`
- CSS only.

Manifest toi thieu:

```json
{
  "id": "theme.xxx",
  "type": "theme",
  "entry": "xxx.css"
}
```

### `theme-pack`
- Ho tro CSS + JS + HTML.

Manifest mau:

```json
{
  "id": "themepack.xxx",
  "type": "theme-pack",
  "assets": {
    "css": "theme.css",
    "js": "theme.js",
    "html": "theme.html"
  }
}
```

Runtime behavior:
- CSS inject vao style host.
- HTML mount vao `#zalous-theme-pack-html`.
- JS co the return `cleanup()`.

## 3) Workflow update theme/theme-pack

```powershell
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js apply
```

## 4) Workflow update extension

- Edit `zalous/market/packs/<ext-id>/<entry>.js`.
- Neu can config, dung API:
  - `zalous.registerConfig(...)`
  - `zalous.getConfig(...)`
  - `zalous.setConfig(...)`
- Chay lai `apply`.

## 5) Patch safety

1. Dong toan bo process Zalo.
2. Dam bao `resources\app.asar.unpacked` day du.
3. Chay `apply`.
4. Mo lai Zalo va verify.

## 6) Debug nhanh

- DevTools endpoint: `http://localhost:9222/`
- Config runtime: `%APPDATA%\Zalous\config.json`
- Runtime assets:
  - `%APPDATA%\Zalous\themes`
  - `%APPDATA%\Zalous\theme-packs`
  - `%APPDATA%\Zalous\extensions`

## 7) Luu y van hanh

- `apply` mac dinh full payload (`--lite-payload` neu can).
- `apply` luon patch tu clean base.
- `restore` uu tien backup patch timestamp.
- Tranh dung script patch cu ngoai `tools/zalous-cli.js`.
