# Build Guide

## 1) Prerequisites

- Node.js >= 18
- Da chay `npm install`

## 2) Build exe

```powershell
npm run build:exe
```

Mac dinh script hien tai:

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
2. Chay safe `apply` flow (kill Zalo -> wait -> verify stopped -> apply -> mo shortcut).
3. Verify runtime bang CDP script (`pass=true`).
4. Build exe.
5. Copy exe vao `tools`.
6. `git add` docs + cli + exe + packs (neu co).
7. Commit.
8. Push `master`.
9. Tag release.
