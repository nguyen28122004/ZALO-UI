# Build Guide

## 1) Prerequisites

- Node.js >= 18
- Da chay `npm install`
- Neu `npm` khong co trong `PATH`, dung duong dan day du toi `npm.cmd` hoac bo sung `PATH` truoc khi build.

## 2) Build exe

```powershell
npm run build:exe
```

Script hien tai:

```json
"build:exe": "pkg . --targets node18-win-x64 --output dist/zalous.exe"
```

## 3) Copy exe vao tools

```powershell
Copy-Item .\dist\zalous.exe .\tools\zalous.exe -Force
```

## 4) Kiem tra exe

```powershell
.\tools\zalous.exe help
.\tools\zalous.exe doctor
```

## 5) Asset bundling (quan trong)

`pkg.assets` trong `package.json` phai co:

- `zalous/runtime/**/*.js`
- `zalous/market/**/*.json`
- `zalous/market/packs/**/*`

Muc tieu: exe phai kem runtime + catalog + packs.

## 6) Release checklist

1. Chay `init` test local.
2. Verify theme/runtime flow bang CDP (`pass=true`).
3. Build exe.
4. Copy exe vao `tools`.
5. Kiem tra `help`/`doctor`.
6. `git add` docs + runtime + packs + exe (neu doi).
7. Commit.
8. Push `master`.
9. Tag release va push tag.

## 7) Luu y van hanh

- Theme/theme-pack/extension update hang ngay dung direct flow (`add`/`patch`/`reload`), khong can repack asar.
- `apply` chi dung khi can patch `app.asar` that su (va da duoc user yeu cau).
