# CDP Verification Flow

## Launch Zalo for CDP

Flow da verify:

```powershell
explorer.exe "C:\Users\ACER\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk"
```

Kiem tra endpoint:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/list
```

## Quick checks

Email/runtime check:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\cdp-email-check.ps1 -Port 9222 -TargetMatch 'Zalo' -ScreenshotPath .\artifacts\cdp-email-check.png
```

Theme cycle check:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\cdp-theme-cycle.ps1 -Port 9222 -TargetMatch 'Zalo' -OutDir .\artifacts\theme-cycle-refactor -WaitMs 1600
```

## What to expect

- `hasZalousApi = true`
- `hasRuntimeTag = true`
- `hasPayloadTag = true`
- `hasEmailMain = true` sau khi click pinned mail item
- Theme cycle tra ve screenshot cho tat ca theme va pack

## Verified notes

- Runtime inject da verify tren `app.asar` patched
- Market modal va email workspace mo duoc qua CDP
- `#main-tab` dang lay mau tu `--layer-background-leftmenu`
- `#zalous-email-prototype-item` da bo padding/border o container goc, phan visual nam trong `.mail-pin-shell`
