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

## 3) Runtime/ASAR update flow (safe apply)

Dung khi co thay doi runtime payload trong `app.asar`.

```powershell
$zaloShortcut = 'C:\Users\ACER\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk'
$zaloProc = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' -or $_.Path -like 'C:\Users\ACER\AppData\Local\Programs\Zalo*' }
if ($zaloProc) { $zaloProc | Stop-Process -Force }
Start-Sleep -Seconds 2
$stillRunning = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' -or $_.Path -like 'C:\Users\ACER\AppData\Local\Programs\Zalo*' }
if ($stillRunning) { throw 'Zalo is still running; abort apply.' }

node .\tools\zalous-cli.js apply
Start-Process -FilePath $zaloShortcut
```

## 4) Workflow update theme/theme-pack (direct)

```powershell
node .\tools\zalous-cli.js add --type theme --file .\my-theme.css --name my-theme.css --reload
node .\tools\zalous-cli.js patch --type theme-pack --id themepack-hello-kitty --dir .\zalous\market\packs\themepack-hello-kitty --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack-hello-kitty
```

Ghi chu:
- `reload` chi gui signal token.
- Neu runtime co watcher (`hasWatcher=true`) thi page se auto reload.
- Neu `hasWatcher=false` thi bam reload tay (`RL` hoac `Reload Trang`).

## 5) Workflow update extension (direct)

- Edit `zalous/market/packs/<ext-id>/<entry>.js`.
- Neu can config, dung API:
  - `zalous.registerConfig(...)`
  - `zalous.getConfig(...)`
  - `zalous.setConfig(...)`
- Patch vao runtime workspace:

```powershell
node .\tools\zalous-cli.js patch --type extension --name lock-pin-dots.js --file .\zalous\market\packs\lock-pin-dots\lock-pin-dots.js --reload
node .\tools\zalous-cli.js reload --type extension --name lock-pin-dots.js --enable
```

## 6) CDP verify (bat buoc sau moi thay doi)

Baseline:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

Assert active pack:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -ExpectedActiveTheme 'pack:themepack.console-minimal' -ExpectedThemePackAttr 'console-minimal'
```

Assert CSS removed/added:

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -MustIncludeCss 'filter: grayscale(0.2) contrast(1.05);' -MustExcludeCss 'border: 1px solid var(--border-subtle) !important;'
```

Chi coi la xong khi report `pass=true`.

## 7) Patch safety

1. Dong toan bo process Zalo truoc `apply`.
2. Dam bao `resources\app.asar.unpacked` day du.
3. Chay `apply` khi can cap nhat runtime moi.
4. Mo lai Zalo bang shortcut va verify.

## 8) Debug nhanh

- DevTools endpoint: `http://127.0.0.1:9222/`
- Target list: `http://127.0.0.1:9222/json/list`
- Config runtime: `%APPDATA%\Zalous\config.json`
- Runtime assets:
  - `%APPDATA%\Zalous\themes`
  - `%APPDATA%\Zalous\theme-packs`
  - `%APPDATA%\Zalous\extensions`

## 9) Luu y van hanh

- `apply` mac dinh full payload (`--lite-payload` neu can).
- `apply` luon patch tu clean base.
- `add/patch/reload` la luong cap nhat hang ngay cho pack.
- `restore` uu tien backup patch timestamp.
- Tranh dung script patch cu ngoai `tools/zalous-cli.js`.
