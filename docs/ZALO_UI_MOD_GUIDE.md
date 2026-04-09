# UI Mod Guide

## 1) Selector rules

Uu tien selector theo thu tu:
1. `id`
2. `data-*`, `aria-*`
3. `role`
4. `class*="..."` khi khong con lua chon tot hon

## 2) Pack types

### `theme`
- CSS only.

Manifest toi thieu:

```json
{
  "id": "theme.xxx",
  "type": "theme",
  "entry": "xxx.css"
}
```

### `theme-pack`
- Ho tro CSS + JS + HTML.

Manifest mau:

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
- CSS inject vao style host.
- HTML mount vao `#zalous-theme-pack-html`.
- JS co the return `cleanup()`.

## 3) Daily edit flow (khuyen dung)

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

Ghi chu:
- `reload` chi gui token signal.
- Watcher bat (`WR`) thi auto reload.
- Watcher tat (`WX`) thi bam `RL` de reload tay.
- Flow nay khong can kill Zalo.

## 4) Runtime/ASAR update flow (chi khi can)

Dung khi can cap nhat runtime payload trong `app.asar`.

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

## 5) CDP verify (mandatory)

Baseline:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

Assert active pack:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -ExpectedActiveTheme 'pack:themepack.console-minimal' -ExpectedThemePackAttr 'console-minimal'
```

Chi coi la xong khi report `pass=true`.

## 6) Runtime caveat: local+embedded + hasRequire=false

Trieu chung:
- Patch CLI ghi file thanh cong trong `%APPDATA%\Zalous`.
- UI tab dang mo chua doi.

Nguyen nhan:
- Runtime khong doc external pack ngay trong mode hien tai.

Xu ly:
1. Van luu code moi trong repo.
2. Patch direct workspace nhu binh thuong.
3. Inject CSS/JS hotfix qua CDP de doi UI ngay.

## 7) Debug nhanh

- DevTools endpoint: `http://127.0.0.1:9222/`
- Target list: `http://127.0.0.1:9222/json/list`
- Config runtime: `%APPDATA%\Zalous\config.json`
- Runtime assets:
  - `%APPDATA%\Zalous\themes`
  - `%APPDATA%\Zalous\theme-packs`
  - `%APPDATA%\Zalous\extensions`
