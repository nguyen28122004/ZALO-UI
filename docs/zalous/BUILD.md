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

1. Build `email-prototype`.
2. Build `dist/zalous.exe`.
3. Copy exe sang `tools/zalous.exe`.
4. Verify `help`, `doctor`, `init`, `status`.
5. Patch workspace / patch `asar` neu can.
6. Verify lai bang CDP.
7. Commit code + docs + generated bundle.

## Notes

- Daily update theme/theme-pack/extension nen dung `add` / `patch` / `reload`.
- `apply` chi dung khi can patch that vao `app.asar`.
- Shortcut launch de verify CDP nen uu tien Windows shell `explorer.exe`.
