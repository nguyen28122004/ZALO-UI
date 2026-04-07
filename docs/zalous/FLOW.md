# Luồng hoạt động Zalous

## A. Init

Lệnh:

```powershell
node .\tools\zalous-cli.js init
```

Kết quả:
1. Tạo `%APPDATA%\Zalous` nếu chưa có.
2. Tạo `config.json` mặc định.
3. Đồng bộ built-in pack vào máy:
   - `theme` -> `themes`
   - `theme-pack` -> `theme-packs`
   - `extension` -> `extensions`
4. Chuẩn hóa config theo assets hợp lệ.

## B. Apply

Lệnh:

```powershell
node .\tools\zalous-cli.js apply
```

Luồng:
1. Resolve `app.asar` mục tiêu (latest Zalo nếu không truyền `--asar`).
2. Đảm bảo có clean backup cho version đó.
3. Restore clean backup vào `app.asar`.
4. Sync built-in assets vào `%APPDATA%\Zalous`.
5. Sync config (`activeTheme`, `enabledExtensions`, `extensionConfigs`).
6. Build payload (`themes`, `themePacks`, `extensions`) và inject runtime vào `pc-dist/index.html`.
7. Repack và backup timestamp.
8. Ghi đè `resources\app.asar`.

## C. Runtime boot

Khi mở Zalo:
1. Runtime đọc payload embedded.
2. Runtime thử nạp external config/assets.
3. Nếu không đọc được external config, fallback `localStorage`.
4. Normalize config, lưu lại nếu cần.
5. Nếu `patchEnabled=true`, apply theme hiện tại:
   - nếu là `theme` -> inject CSS
   - nếu là `theme-pack` -> inject CSS + mount HTML + execute JS (có cleanup)
6. Chạy các extension đang bật.
7. Gắn `zalous-controls` và Market Manager.

## D. Market install

Lệnh:

```powershell
node .\tools\zalous-cli.js market-install --id <packId>
```

Luồng:
1. Đọc catalog local.
2. Resolve pack + `manifest.json`.
3. Cài theo `manifest.type`:
   - `theme`: copy CSS vào `themes`.
   - `theme-pack`: copy `manifest + assets` vào `theme-packs/<id>`.
   - `extension`: copy JS vào `extensions` và tự add vào `enabledExtensions`.

## E. Restore

Lệnh:

```powershell
node .\tools\zalous-cli.js restore
```

Kết quả:
- Khôi phục backup timestamp gần nhất vào `app.asar` mục tiêu.
