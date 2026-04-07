# Hướng dẫn chỉnh UI (Zalous)

## 1) Quy tắc selector

Ưu tiên selector ổn định:
1. `id`
2. `data-*`, `aria-*`
3. `role`
4. `class*="..."` (chỉ dùng khi không có lựa chọn ổn định hơn)

## 2) Loại pack giao diện

### `theme`
- Chỉ có CSS.
- Manifest tối thiểu:

```json
{
  "id": "theme.xxx",
  "type": "theme",
  "entry": "xxx.css"
}
```

### `theme-pack`
- Nâng cao hơn `theme`.
- Có thể dùng đồng thời CSS, JS và HTML.
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

Ghi chú runtime:
- CSS được inject vào style chính.
- HTML được mount vào host `#zalous-theme-pack-html`.
- JS được execute khi apply pack; có thể `return function cleanup(){...}` để dọn khi đổi theme.

## 3) Quy trình chỉnh theme/theme-pack

1. Sửa trong `zalous/market/packs/<pack-id>/`.
2. Chạy:

```powershell
node .\tools\zalous-cli.js init
node .\tools\zalous-cli.js apply
```

3. Restart Zalo.

## 4) Quy trình chỉnh extension

1. Sửa extension trong `zalous/market/packs/<ext-id>/<entry>.js`.
2. Nếu extension cần config, dùng API runtime `zalous.registerConfig(...)`, `zalous.getConfig(...)`, `zalous.setConfig(...)`.
3. Schema config hiện hỗ trợ tối thiểu:
   - `select`
   - `checkbox`
4. Nút `Config` trong Market Manager sẽ render theo schema để lưu vào `extensionConfigs`.
5. `apply` để sync + inject payload/runtime mới.
6. Restart Zalo.

## 4.1) Blur extension (ví dụ)

`extension.blur-elements` có 2 nhóm cấu hình độc lập:
- `mode`: blur nhóm selector cũ (`content`/`name`/`all`/`off`)
- `blurMessageWrapper`: blur riêng `.message-content-wrapper`

Hai nhóm này có thể bật đồng thời.

## 5) Debug nhanh

- DevTools endpoint: `http://localhost:9222/`
- Nếu lỗi giao diện:
  - kiểm tra `activeTheme` trong `%APPDATA%\Zalous\config.json`
  - kiểm tra file trong `%APPDATA%\Zalous\themes` hoặc `%APPDATA%\Zalous\theme-packs`
  - kiểm tra extension nào đang bật trong `enabledExtensions`

## 6) Lưu ý vận hành

- `apply` luôn patch từ clean base theo version Zalo.
- Runtime ưu tiên config external; fallback `localStorage`.
- Không dùng script patch cũ ngoài `tools/zalous-cli.js` nếu không bắt buộc.
