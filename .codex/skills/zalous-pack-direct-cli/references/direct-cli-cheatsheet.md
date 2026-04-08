# Direct CLI Cheatsheet

## Safe ASAR Apply

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

## CDP Verify (Mandatory)

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -ExpectedActiveTheme 'pack:themepack.console-minimal' -ExpectedThemePackAttr 'console-minimal'
```

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -MustExcludeCss 'border: 1px solid var(--border-subtle) !important;'
```

## Theme

```powershell
node .\tools\zalous-cli.js add --type theme --file .\tmp\my-theme.css --name my-theme.css --activate --reload
node .\tools\zalous-cli.js patch --type theme --name my-theme.css --file .\tmp\my-theme.css --reload
node .\tools\zalous-cli.js reload --type theme --name my-theme.css
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1
```

## Theme-Pack

```powershell
node .\tools\zalous-cli.js add --type theme-pack --dir .\zalous\market\packs\themepack-hello-kitty --reload
node .\tools\zalous-cli.js patch --type theme-pack --id themepack-hello-kitty --dir .\zalous\market\packs\themepack-hello-kitty --activate --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack-hello-kitty
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1
```

## Extension

```powershell
node .\tools\zalous-cli.js add --type extension --file .\tmp\hello.js --name hello.js --reload
node .\tools\zalous-cli.js patch --type extension --name hello.js --file .\tmp\hello.js --reload
node .\tools\zalous-cli.js reload --type extension --name hello.js --enable
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1
```

## Full refresh

```powershell
node .\tools\zalous-cli.js reload --type all
```

Neu CDP report `hasWatcher=false`, dung manual reload tren UI (nut `RL` hoac nut `Reload Trang` trong market).
