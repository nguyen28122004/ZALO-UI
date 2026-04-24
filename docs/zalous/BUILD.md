# Build Guide

## Prerequisites

- Node.js >= 18
- `npm install`
- Windows host cho target `node18-win-x64`

## Build email bundle

```powershell
npm run build:email-prototype
```

Script:

```json
"build:email-prototype": "node tools/build-email-prototype.js"
```

## Build theme tokens

```powershell
npm run build:themes
```

Script:

```json
"build:themes": "node tools/build-themes.js"
```

Palette source:

```text
zalous/market/theme-palettes.json
```

## Build exe

```powershell
npm run build:exe
```

Script:

```json
"build:exe": "pkg . --targets node18-win-x64 --output dist/zalous.exe"
```

## Publish local binary

```powershell
Copy-Item .\dist\zalous.exe .\tools\zalous.exe -Force
```

## Asset bundling

`pkg.assets` trong `package.json` phai include:

- `zalous/runtime/**/*.js`
- `zalous/market/**/*.json`
- `zalous/market/packs/**/*`

Muc tieu: `zalous.exe` mang day du runtime, manifest, va tat ca packs.

## Release flow

1. Build theme tokens.
2. Build `email-prototype`.
3. Build `dist/zalous.exe`.
4. Copy exe sang `tools/zalous.exe`.
5. Verify `help`, `doctor`, `init`, `status`.
6. Patch latest `app.asar` neu can.
7. Mo Zalo bang shortcut `.lnk` da co remote debug.
8. Verify lai bang CDP.
9. Commit code + docs + generated bundle.

## Notes

- Daily update theme/theme-pack/extension nen dung `add` / `patch` / `reload`.
- `apply` chi dung khi can patch that vao `app.asar`.
- Shortcut launch de verify CDP nen uu tien Windows shell `explorer.exe`.
