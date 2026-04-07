# Zalous Flow

## A. Provisioning Flow

1. User chay `init`.
2. CLI tao `%APPDATA%\Zalous` + file `config.json`.
3. CLI copy built-in theme vao `%APPDATA%\Zalous\themes`.

## B. Patch Flow (`apply`)

1. Resolve `app.asar`:
- uu tien `-AsarPath`
- roi `config.appAsarPath`
- roi auto detect `%LOCALAPPDATA%\Programs\Zalo\Zalo-*\resources\app.asar`

2. Load runtime assets:
- runtime template `zalous/runtime/zalous-runtime.js`
- config + themes + extensions tu `%APPDATA%\Zalous`

3. Build embedded payload JSON.

4. Extract `app.asar` -> temp dir.

5. Edit `pc-dist/index.html`:
- replace marker block neu da co
- hoac inject truoc `</head>`

6. Pack lai asar.

7. Backup asar cu vao `%APPDATA%\Zalous\backups`.

8. Replace asar moi.

## C. Runtime Boot Flow (inside Zalo)

1. Zalo load `index.html`.
2. `window.__ZALOUS_EMBEDDED__` available.
3. Runtime start:
- Parse embedded payload
- Try load external config/themes/extensions from `%APPDATA%\Zalous` (neu co `require`)
- Merge external over embedded
- Apply active theme
- Execute enabled extensions
- Render mini controls ON/OFF + theme cycle

## D. Market Flow (local)

1. `market-list`: doc `catalog.local.json`.
2. `market-install -PackId X`:
- resolve pack path
- doc `manifest.json`
- copy entry file vao `%APPDATA%\Zalous\themes` hoac `extensions`
- update config (enable extension hoac set default theme neu can)

## E. Rollback Flow

1. `restore` lay backup moi nhat.
2. Copy de ghi de `app.asar`.

