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

## 2) Kien truc theme

- `themes/zalo-common.css`: phan layout/selector chung, luon duoc apply khi bat `ON`.
- `themes/zalo-<color>.css`: chi chua token mau cho tung theme (`green/pink/blue/purple/orange`).

## 3) Patch runtime

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\zalo-green.css -TargetMatch Zalo
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action clear -Port 9222 -TargetMatch Zalo
```

Sau khi `apply`, UI co cum nut giao dien:
- `ON/OFF`: bat/tat patch (common + theme)
- nut theme: chuyen vong `green -> pink -> blue -> purple -> orange`

## 4) Patch nhanh theo ten theme

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme green
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme pink
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme blue
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme purple
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme orange
```

## 5) Cau truc file

- `tools/zalo-cdp-patch.ps1`: patch/clear CSS qua CDP websocket + controls
- `tools/patch-zalo-now.ps1`: patch nhanh theo ten theme
- `themes/zalo-common.css`: css chung
- `themes/zalo-green.css`: pastel green tokens
- `themes/zalo-pink.css`: pastel pink tokens
- `themes/zalo-blue.css`: pastel blue tokens
- `themes/zalo-purple.css`: pastel purple tokens
- `themes/zalo-orange.css`: pastel orange tokens
