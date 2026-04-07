# Hướng dẫn chỉnh UI (Zalous)

## 1) Quy tắc selector

Ưu tiên selector ổn định:
1. `id`
2. `data-*`, `aria-*`
3. `role`
4. `class*="..."` (chỉ khi cần)

## 2) Cấu trúc theme hiện tại

Theme không còn quản lý ở thư mục `themes/` repo.

Nguồn chuẩn hiện tại:
- `zalous/market/packs/<theme-id>/<theme-id>.css`
- manifest tại `zalous/market/packs/<theme-id>/manifest.json`

Khi `apply`, CLI tự sync pack theme vào `%APPDATA%\Zalous\themes`.

## 3) Quy trình chỉnh theme

1. Sửa file theme trong `zalous/market/packs/...`.
2. Chạy:
```powershell
node .\tools\zalous-cli.js apply
```
3. Restart Zalo.

## 4) Quy trình chỉnh extension

1. Sửa extension trong `zalous/market/packs/<ext-id>/<entry>.js`.
2. `apply` để sync + inject lại runtime payload.
3. Restart Zalo.

## 5) Debug nhanh

- DevTools endpoint: `http://localhost:9222/`
- Nếu UI sai màu/tab:
  - kiểm tra token trong theme đang active (`%APPDATA%\Zalous\config.json`)
  - kiểm tra selector override trong theme pack

## 6) Lưu ý vận hành

- `apply` luôn patch từ clean base theo version Zalo.
- Config runtime ưu tiên external config, fallback localStorage.
- Tránh chạy script patch cũ ngoài `zalous-cli.js` nếu không cần.
