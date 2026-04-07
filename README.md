# Zalo Runtime UI Mod (Electron + Remote Debugging)

Muc tieu: hook vao renderer cua Zalo (Electron) qua Chrome DevTools Protocol, sau do mod giao dien runtime bang CSS/JS.

## 1) Chay Zalo voi remote debug

```powershell
Get-Process -Name Zalo,ZaloCall,ZaloCap -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Process "C:\Users\Lien\AppData\Local\Programs\Zalo\Zalo.exe" "--remote-debugging-port=9222"
```

Neu launcher khong an argument, thu binary versioned:

```powershell
Start-Process "C:\Users\Lien\AppData\Local\Programs\Zalo\Zalo-26.3.20\Zalo.exe" "--remote-debugging-port=9222"
```

Kiem tra cong debug:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/version | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/list | Select-Object -ExpandProperty Content
```

## 2) Mo Chrome Inspect

1. Mo `chrome://inspect/#devices`
2. Bam `Configure...` va them `localhost:9222`
3. Chon target cua Zalo va bam `Inspect`

Hoac mo truc tiep danh sach target: `http://127.0.0.1:9222/json/list`

## 3) Tool patch runtime (tu dong)

File tool: `tools/zalo-cdp-patch.ps1`

Apply giao dien xanh la:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222
```

Rollback theme da patch:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action clear -Port 9222
```

Doi CSS theo theme khac:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\zalo-green.css
```

Loc target theo title/url neu mo nhieu webcontents:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -TargetMatch Zalo
```

Sau khi `apply`, tool se tao 2 nut trong `#titleBar`:
- `Apply Pastel`: apply lai theme ngay trong UI
- `Clear Theme`: go bo theme runtime
## 4) Runtime mod thu cong trong DevTools

Trong DevTools Console, nap file `snippets/zalo-runtime-mod.js` roi dung:

```js
zaloMod.apply(`
  :root { --accent: #22c55e !important; }
  [class*="sidebar"] { background: #dcfce7 !important; }
`);
```

## 5) Tim selector tung UI element

Dung playbook: `docs/ZALO_UI_MOD_GUIDE.md`

Noi dung co:
- cach tim selector ben vung (tranh class hash bi doi)
- script probe auto map cac khu vuc UI
- cach dump va override `:root` / CSS vars

## 6) Files

- `tools/zalo-cdp-patch.ps1`: patch/clear CSS qua CDP websocket
- `themes/zalo-green.css`: preset giao dien xanh la
- `snippets/zalo-selector-probe.js`: scan UI va goi y selector
- `snippets/zalo-runtime-mod.js`: inject/remove CSS runtime trong DevTools


## 7) Auto patch khi mo Zalo

Chay script auto:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\start-zalo-auto-patch.ps1 -Port 9222
```

Neu muon kill Zalo cu truoc khi mo lai:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\start-zalo-auto-patch.ps1 -Port 9222 -KillExisting
```

Script se:
1. Mo Zalo voi `--remote-debugging-port=9222`
2. Cho CDP san sang
3. Tu dong apply theme va inject icon controls vao `#main-tab.nav__tabs__bottom`

File: `tools/start-zalo-auto-patch.ps1`
