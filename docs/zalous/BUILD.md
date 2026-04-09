# Build Guide

## 1) Prerequisites

- Node.js >= 18
- Đã chạy `npm install`
- Nếu `npm` không có trong `PATH`, dùng đường dẫn đầy đủ tới `npm.cmd` hoặc bổ sung `PATH` trước khi build.

## 2) Build exe

```powershell
npm run build:exe
```

Script hiện tại:

```json
"build:exe": "pkg . --targets node18-win-x64 --output dist/zalous.exe"
```

## 3) Copy exe vào tools

```powershell
Copy-Item .\dist\zalous.exe .\tools\zalous.exe -Force
```

## 4) Kiểm tra exe

```powershell
.\tools\zalous.exe help
.\tools\zalous.exe doctor
```

## 5) Asset bundling (quan trọng)

`pkg.assets` trong `package.json` phải có:

- `zalous/runtime/**/*.js`
- `zalous/market/**/*.json`
- `zalous/market/packs/**/*`

Mục tiêu: exe phải kèm runtime + catalog + packs.

## 6) Release checklist

1. Chạy `init` test local.
2. Verify theme/runtime flow bằng CDP (`pass=true`).
3. Build exe.
4. Copy exe vào `tools`.
5. Kiểm tra `help`/`doctor`.
6. `git add` docs + runtime + packs + exe (nếu đổi).
7. Commit.
8. Push `master`.
9. Tag release và push tag.

## 7) Lưu ý vận hành

- Theme/theme-pack/extension update hằng ngày dùng direct flow (`add`/`patch`/`reload`), không cần repack asar.
- `apply` chỉ dùng khi cần patch `app.asar` thật sự (và đã được user yêu cầu).
