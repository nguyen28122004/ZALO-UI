# Zalo Runtime UI Mod (CDP + CSS/JS)

Muc tieu: patch giao dien Zalo runtime qua Chrome DevTools Protocol (CDP), khong sua file goc cua app.

## 1) Dieu kien tien quyet

- CDP endpoint da san sang tren `127.0.0.1:9222`.
- Kiem tra nhanh:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/version | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/list | Select-Object -ExpandProperty Content
```

Luu y: Tai lieu nay KHONG huong dan kill/mo Zalo kem debug argument.

## 2) Patch runtime bang tool

File tool: `tools/zalo-cdp-patch.ps1`

Apply theme bat ky:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\zalo-green.css -TargetMatch Zalo
```

Clear patch:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action clear -Port 9222 -TargetMatch Zalo
```

Sau khi `apply`, script inject cum nut giao dien o left nav:
- `ON/OFF`: bat/tat patch
- nut theme: chuyen vong qua `green -> pink -> blue -> purple -> orange`

## 3) Patch nhanh theo ten theme

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme green
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme pink
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme blue
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme purple
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme orange
```

## 4) Runtime mod thu cong trong DevTools

Trong DevTools Console, nap `snippets/zalo-runtime-mod.js`, sau do:

```js
zaloMod.apply(`
  :root { --accent: #22c55e !important; }
  [class*="sidebar"] { background: #dcfce7 !important; }
`);
```

Rollback:

```js
zaloMod.clear();
```

## 5) Tim selector va debug style

Dung playbook: `docs/ZALO_UI_MOD_GUIDE.md`.

## 6) Cau truc file

- `tools/zalo-cdp-patch.ps1`: patch/clear CSS qua CDP websocket + UI controls
- `tools/patch-zalo-now.ps1`: patch nhanh theo ten theme
- `themes/zalo-green.css`: pastel green
- `themes/zalo-pink.css`: pastel pink
- `themes/zalo-blue.css`: pastel blue
- `themes/zalo-purple.css`: pastel purple
- `themes/zalo-orange.css`: pastel orange
- `snippets/zalo-selector-probe.js`: scan UI va goi y selector
- `snippets/zalo-runtime-mod.js`: inject/remove CSS runtime trong DevTools
