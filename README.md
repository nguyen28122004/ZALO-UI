# Zalo Runtime UI Mod (CDP + Multi-Theme)

Patch giao dien Zalo runtime qua Chrome DevTools Protocol (CDP), khong sua file goc cua app.

## 1) Dieu kien tien quyet

- CDP da mo tren `127.0.0.1:9222`.
- Kiem tra nhanh:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/version | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/list | Select-Object -ExpandProperty Content
```

Luu y: README nay KHONG huong dan kill/mo Zalo voi debug argument.

## 2) Kien truc theme

- `themes/zalo-common.css`: phan rule chung (layout, selector, behavior), luon duoc apply khi theme ON.
- `themes/zalo-<color>.css`: token mau theo theme.

Theme hien co:
- `green`
- `pink`
- `blue`
- `purple`
- `orange`

## 3) Patch/Clear bang script chinh

Apply:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\zalo-green.css -TargetMatch Zalo
```

Clear:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action clear -Port 9222 -TargetMatch Zalo
```

## 4) Patch nhanh theo ten theme

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme green
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme pink
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme blue
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme purple
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme orange
```

## 5) In-app controls sau khi apply

Sau khi patch, left nav co cum controls:
- `ON/OFF`: bat/tat patch (`common + theme color`).
- nut theme: cycle theme theo thu tu `green -> pink -> blue -> purple -> orange`.

## 6) Cau truc file

- `tools/zalo-cdp-patch.ps1`: patch/clear qua CDP + inject controls
- `tools/patch-zalo-now.ps1`: wrapper patch nhanh theo `-Theme`
- `themes/zalo-common.css`: css chung
- `themes/zalo-green.css`: token mau green pastel
- `themes/zalo-pink.css`: token mau pink pastel
- `themes/zalo-blue.css`: token mau blue pastel
- `themes/zalo-purple.css`: token mau purple pastel
- `themes/zalo-orange.css`: token mau orange pastel
- `docs/ZALO_UI_MOD_GUIDE.md`: playbook selector/theme workflow
