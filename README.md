# hara-zalous (zalous)

`hara-zalous` (goi tat `zalous`) la bo patch engine cho Zalo Desktop theo huong giong Spicetify:
- Patch mot lan vao `app.asar` de cam runtime bootstrap.
- Theme/extension duoc quan ly rieng o `%APPDATA%\Zalous`.
- Khi mo Zalo, runtime tu nap config + theme + extension de apply.
- Co local market de cai pack, san sang mo rong online market sau nay.

## 1) Cau truc tong quan

- `tools/zalous-cli.js`: CLI chinh (`init`, `apply`, `market-install`, ...)
- `zalous/runtime/zalous-runtime.js`: runtime bootstrap inject vao `index.html` trong `app.asar`
- `zalous/market/catalog.local.json`: catalog local
- `zalous/market/packs/*`: cac pack mau (theme/extension)

Du lieu runtime tren may:
- `%APPDATA%\Zalous\config.json`
- `%APPDATA%\Zalous\themes\*.css`
- `%APPDATA%\Zalous\extensions\*.js`
- `%APPDATA%\Zalous\backups\app.asar.*.bak`

## 2) Quick Start

### 2.0 Cai dependency

```powershell
npm install
```

### 2.1 Khoi tao

```powershell
node .\tools\zalous-cli.js init
```

### 2.2 Tu dong tim app.asar

```powershell
node .\tools\zalous-cli.js detect
```

### 2.3 Cai pack local market (vi du)

```powershell
node .\tools\zalous-cli.js market-list
node .\tools\zalous-cli.js market-install --id theme.green-soft
node .\tools\zalous-cli.js market-install --id extension.lock-pin-dots
```

### 2.4 Patch vao Zalo

```powershell
node .\tools\zalous-cli.js apply
```

Mo lai Zalo de runtime bootstrap hoat dong.

## 3) Cac lenh quan trong

```powershell
# Trang thai
node .\tools\zalous-cli.js status

# Theme
node .\tools\zalous-cli.js list-themes
node .\tools\zalous-cli.js set-theme --theme zalo-green.css
node .\tools\zalous-cli.js import-theme --file C:\path\custom.css --name custom.css

# Extension
node .\tools\zalous-cli.js list-extensions
node .\tools\zalous-cli.js enable-extension --name lock-pin-dots.js
node .\tools\zalous-cli.js disable-extension --name lock-pin-dots.js
node .\tools\zalous-cli.js import-extension --file C:\path\ext.js --name ext.js

# Restore backup gan nhat
node .\tools\zalous-cli.js restore
```

## 4) Build `.exe` CLI

```powershell
npm run build:exe
```

Output:
- `dist/zalous.exe`

## 5) Runtime behavior

Khi Zalo mo:
1. `zalous-runtime.js` doc payload duoc inject trong `index.html`.
2. Thu nap external config/files tu `%APPDATA%\Zalous` (neu renderer co quyen Node `require`).
3. Merge `embedded + external`.
4. Apply theme dang active.
5. Run danh sach extensions duoc enable.
6. Render control nho trong nav (ON/OFF + doi theme).

## 6) Local Market va mo rong Online Market

Hien tai:
- `catalog.local.json` quan ly pack local.
- `market-install` copy file tu `zalous/market/packs/*` vao `%APPDATA%\Zalous`.

Roadmap online market:
1. Them schema catalog URL (HTTPS, signed).
2. Download pack zip/js/css + verify checksum/signature.
3. Store metadata version + dependency.
4. Add rollback theo tung pack.

## 7) Tai lieu chi tiet

- [Architecture](./docs/zalous/ARCHITECTURE.md)
- [Operational Flow](./docs/zalous/FLOW.md)
- [CLI Reference](./docs/zalous/CLI.md)
