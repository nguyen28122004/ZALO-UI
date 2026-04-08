# Hướng dẫn chỉnh UI (Zalous)

## 1) Quy tắc selector

Ưu tiên selector ổn định theo thứ tự:
1. `id`
2. `data-*`, `aria-*`
3. `role`
4. `class*="..."` khi không còn lựa chọn tốt hơn

## 2) Loại pack giao diện

### `theme`

- Chỉ CSS.
- Manifest tối thiểu:

```json
{
  "id": "theme.xxx",
  "type": "theme",
  "entry": "xxx.css"
}
```

### `theme-pack`

- Hỗ trợ CSS + JS + HTML.
- Manifest mẫu:

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
- CSS: inject vào style host.
- HTML: mount vào `#zalous-theme-pack-html`.
- JS: execute khi apply pack, có thể trả `cleanup()`.

## 3) Quy trình chỉnh theme/theme-pack

1. Sửa pack tại `zalous/market/packs/<pack-id>/`.
2. Chạy:

```powershell
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js apply
```

3. Restart Zalo.

## 4) Quy trình chỉnh extension

1. Sửa extension tại `zalous/market/packs/<ext-id>/<entry>.js`.
2. Dùng API runtime nếu cần config:
   - `zalous.registerConfig(...)`
   - `zalous.getConfig(...)`
   - `zalous.setConfig(...)`
3. Schema config UI hiện hỗ trợ:
   - `select`
   - `checkbox`
4. Chạy lại `apply` để sync payload/runtime.
5. Restart Zalo.

## 5) Flow an toàn khi patch

1. Đóng toàn bộ process Zalo.
2. Đảm bảo `resources\app.asar.unpacked` đầy đủ.
3. Chạy `apply`.
4. Mở lại Zalo và verify UI.

## 6) Debug nhanh

- DevTools endpoint: `http://localhost:9222/`
- Kiểm tra config: `%APPDATA%\Zalous\config.json`
- Kiểm tra assets runtime:
  - `%APPDATA%\Zalous\themes`
  - `%APPDATA%\Zalous\theme-packs`
  - `%APPDATA%\Zalous\extensions`

Khi gặp lỗi `ENOENT` liên quan `app.asar.unpacked`:
- nguyên nhân thường là thiếu file native unpacked,
- cần khôi phục lại thư mục `resources\app.asar.unpacked` rồi chạy lại `apply`.

## 7) Ghi chú vận hành

- `apply` mặc định full payload, dùng `--lite-payload` nếu cần.
- `apply` luôn patch từ clean base theo version Zalo.
- Runtime ưu tiên config external, fallback `localStorage`.
- `restore` ưu tiên backup patch timestamp, sau đó mới đến pre-restore.
- Tránh dùng script patch cũ ngoài `tools/zalous-cli.js`.
