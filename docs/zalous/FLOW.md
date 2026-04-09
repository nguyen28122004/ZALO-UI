# Flow

## A) Init

```powershell
node .\tools\zalous-cli.js init
```

- Tao `%APPDATA%\Zalous` + cac folder can thiet.
- Sync built-in packs vao runtime workspace.
- Normalize config theo assets hien co.

## B) Detect

```powershell
node .\tools\zalous-cli.js detect [--asar <path>]
```

- Resolve `app.asar` target.
- Ghi vao `config.appAsarPath`.

## C) CDP Baseline (mandatory truoc khi sua)

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

Muc tieu:
- Biet runtime source hien tai.
- Biet active theme/theme-pack.
- Biet co watcher va Node bridge hay khong.

## D) Daily Direct Flow (khong repack asar)

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

Flow:
1. CLI copy file/dir vao `%APPDATA%\Zalous\themes|theme-packs|extensions`.
2. CLI cap nhat `config.json`.
3. CLI bump `config.hotReload.token`.
4. Runtime watcher (neu bat) se theo doi token va reload.
5. Neu watcher tat/khong co, dung `RL` de reload tay.

Quy tac:
- Sua theme/theme-pack/extension theo direct flow thi khong kill Zalo.
- `apply` (patch asar) chi chay khi user yeu cau ro rang.

## E) Runtime Source Caveat

Neu CDP cho thay:
- `source=local+embedded`
- `hasRequire=false`

Thi runtime co the khong doc external pack tu `%APPDATA%\Zalous` ngay tren tab dang mo.

Cach xu ly:
1. Van patch source trong repo + `%APPDATA%` binh thuong.
2. Inject CSS/JS hotfix truc tiep qua CDP de UI doi ngay.
3. Verify lai bang CDP.

## F) Apply (asar patch, chi khi duoc yeu cau)

```powershell
$zaloShortcut = 'C:\Users\Lien\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk'
$zaloProc = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' }
if ($zaloProc) { $zaloProc | Stop-Process -Force }
Start-Sleep -Seconds 2

$stillRunning = Get-Process | Where-Object { $_.ProcessName -like 'Zalo*' }
if ($stillRunning) { throw 'Zalo is still running; abort apply.' }

node .\tools\zalous-cli.js apply [--asar <path>] [--no-backup] [--lite-payload|--full-payload] [--keep-controls]
Start-Process -FilePath $zaloShortcut
```

Apply internals:
1. Resolve `app.asar`.
2. Restore clean base.
3. Build payload va inject runtime.
4. Repack `app.asar`.
5. Sync lai `app.asar.unpacked`.

## G) CDP Verify (mandatory sau khi patch)

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1
```

Chi coi la xong khi report `pass=true`.

## H) Restore

```powershell
node .\tools\zalous-cli.js restore [--asar <path>]
```

- Uu tien backup patch timestamp gan nhat.

## I) Loi thuong gap

### `ENOENT ... app.asar.unpacked\...`

Nguyen nhan: thieu native files trong `.unpacked`.

Cach xu ly:
1. Dong Zalo.
2. Khoi phuc day du `resources\app.asar.unpacked`.
3. Chay lai `apply`.
