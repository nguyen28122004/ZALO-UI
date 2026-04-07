# Zalo Runtime UI Mod (CDP + CSS/JS)

Muc tieu: patch giao dien Zalo runtime qua Chrome DevTools Protocol (CDP), khong sua file goc cua app.

## 1) Dieu kien tien quyet

- Zalo da co CDP endpoint dang mo tren `127.0.0.1:9222`.
- Kiem tra nhanh:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/version | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/list | Select-Object -ExpandProperty Content
```

Luu y: Tai lieu nay KHONG huong dan kill/mo Zalo kem debug argument.

## 2) Patch runtime bang tool

File tool: `tools/zalo-cdp-patch.ps1`

Apply theme hien tai:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\zalo-green.css -TargetMatch Zalo
```

Clear patch:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action clear -Port 9222 -TargetMatch Zalo
```

Dung CSS khac:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\my-theme.css -TargetMatch Zalo
```

Sau khi `apply`, script se inject 1 nut tron `ON/OFF` o thanh left nav de bat/tat theme nhanh.

## 3) Runtime mod thu cong trong DevTools

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

## 4) Tim selector va debug style

Dung playbook: `docs/ZALO_UI_MOD_GUIDE.md`

Noi dung chinh:
- quy tac chon selector ben vung
- script probe de map UI nhanh
- cach tra CSS vars va override an toan

## 5) Cau truc file

- `tools/zalo-cdp-patch.ps1`: patch/clear CSS qua CDP websocket
- `tools/start-zalo-auto-patch.ps1`: auto apply khi CDP san sang (khong trinh bay buoc kill/mo app trong README)
- `themes/zalo-green.css`: theme pastel light
- `snippets/zalo-selector-probe.js`: scan UI va goi y selector
- `snippets/zalo-runtime-mod.js`: inject/remove CSS runtime trong DevTools
