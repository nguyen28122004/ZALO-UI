# Flow

## 1. Init

```powershell
node .\tools\zalous-cli.js init
```

- Tao workspace `%APPDATA%\Zalous`
- Sync built-in packs
- Normalize config

## 2. Detect

```powershell
node .\tools\zalous-cli.js detect
```

- Resolve `app.asar`
- Luu path vao config

## 3. Daily direct flow

Dung cho theme, theme-pack, extension. Khong can repack `app.asar`.

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal-v2 --dir .\zalous\market\packs\themepack-console-minimal-v2 --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal-v2
```

Flow:

1. Copy asset vao `%APPDATA%\Zalous`.
2. Update `config.json`.
3. Bump `config.hotReload.token`.
4. Runtime watcher reload neu dang bat.

## 4. Apply flow

Chi dung khi can patch that vao Zalo Desktop.

```powershell
node .\tools\zalous-cli.js apply
```

Apply internals:

1. Resolve `app.asar`.
2. Restore clean backup.
3. Inject runtime/payload.
4. Repack.
5. Sync lai `.unpacked`.

## 5. Startup flow for CDP

Da verify on may nay:

```powershell
explorer.exe "C:\Users\ACER\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Zalo.lnk"
```

Sau do:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/list
```

## 6. Restore

```powershell
node .\tools\zalous-cli.js restore
```

- Uu tien backup patch moi nhat

## 7. Common issue

### `ENOENT ... app.asar.unpacked`

Nguyen nhan:

- Thieu native files trong `app.asar.unpacked`

Cach xu ly:

1. Dong Zalo.
2. Khoi phuc day du `resources\app.asar.unpacked`.
3. Chay lai `apply`.
