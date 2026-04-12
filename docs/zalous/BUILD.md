# Build Guide

## Prerequisites

- Node.js >= 18
- `npm install`
- Windows host cho `pkg` target `node18-win-x64`

## Build extension bundle

```powershell
npm run build:email-prototype
```

Script:

```json
"build:email-prototype": "node tools/build-email-prototype.js"
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

Muc tieu: `zalous.exe` mang day du runtime, manifest va tat ca packs.

## Release flow

1. Build `email-prototype`.
2. Build `dist/zalous.exe`.
3. Copy exe sang `tools/zalous.exe`.
4. Commit code + docs + generated bundle.
5. Push branch chinh.

## Notes

- Daily update cho theme/theme-pack/extension nen dung `add` / `patch` / `reload`.
- `apply` chi dung khi can patch that vao `app.asar`.
