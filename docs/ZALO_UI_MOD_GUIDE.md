# UI Mod Guide

## 1) Quy tắc selector

Ưu tiên selector theo thứ tự:
1. `id`
2. `data-*`, `aria-*`
3. `role`
4. `class*="..."` khi không còn lựa chọn tốt hơn

## 2) Loại pack

### `theme`
- CSS only.

Manifest tối thiểu:

```json
{
  "id": "theme.xxx",
  "type": "theme",
  "entry": "xxx.css"
}
```

### `theme-pack`
- Hỗ trợ CSS + JS + HTML.

Manifest mẫu:

```json
{
  "id": "themepack.xxx",
  "type": "theme-pack",
  "assets": {
    "css": "theme.css",
    "js": "theme.js",
    "html": "theme.html"
  }
}
```

Runtime behavior:
- CSS inject vào style host.
- HTML mount vào `#zalous-theme-pack-html`.
- JS có thể return `cleanup()`.

## 3) Daily edit flow (khuyến nghị)

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

Ghi chú:
- `reload` chỉ gửi token signal.
- Watcher bật (`WR`) thì auto reload.
- Watcher tắt (`WX`) thì bấm `RL` để reload tay.
- Flow này không cần kill Zalo.

## 4) Runtime/ASAR update flow (chỉ khi cần)

Dùng khi cần cập nhật runtime payload trong `app.asar`.

```powershell
$zaloShortcut = 'C:\Users\Lien\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk'
$zaloProc = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' }
if ($zaloProc) { $zaloProc | Stop-Process -Force }
Start-Sleep -Seconds 2

$stillRunning = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' }
if ($stillRunning) { throw 'Zalo is still running; abort apply.' }

node .\tools\zalous-cli.js apply
Start-Process -FilePath $zaloShortcut
```

## 5) CDP verify (bắt buộc)

Baseline:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

Assert active pack:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -ExpectedActiveTheme 'pack:themepack.console-minimal' -ExpectedThemePackAttr 'console-minimal'
```

Chỉ coi là xong khi report `pass=true`.

## 6) Runtime caveat: local+embedded + hasRequire=false

Triệu chứng:
- Patch CLI ghi file thành công trong `%APPDATA%\Zalous`.
- UI tab đang mở chưa đổi.

Nguyên nhân:
- Runtime không đọc external pack ngay trong mode hiện tại.

Xử lý:
1. Vẫn lưu code mới trong repo.
2. Patch direct workspace như bình thường.
3. Inject CSS/JS hotfix qua CDP để đổi UI ngay.

## 7) Debug nhanh

- DevTools endpoint: `http://127.0.0.1:9222/`
- Target list: `http://127.0.0.1:9222/json/list`
- Config runtime: `%APPDATA%\Zalous\config.json`
- Runtime assets:
  - `%APPDATA%\Zalous\themes`
  - `%APPDATA%\Zalous\theme-packs`
  - `%APPDATA%\Zalous\extensions`
