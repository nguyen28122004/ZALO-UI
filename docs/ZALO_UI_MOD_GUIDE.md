# Hướng dẫn chỉnh UI Zalo (Selector + Theme Workflow)

## 1) Nguyên tắc chọn selector

Ưu tiên theo thứ tự:
1. `id` ổn định
2. `data-*`, `aria-*`
3. `role`
4. `class*="..."` (chỉ dùng khi không có lựa chọn tốt hơn)

Tránh selector quá sâu hoặc class hash thay đổi theo build.

## 2) Cấu trúc CSS trong dự án

- `themes/zalo-common.css`: rule layout/chung cho light mode
- `themes/zalo-<màu>.css`: token màu theo từng theme

Khi runtime bật patch:
- Inject `zalo-common.css`
- Inject theme active (`zalo-green.css`, `zalo-blue.css`, ...)

## 3) Quy trình chỉnh giao diện đúng chuẩn

1. Inspect phần tử bằng DevTools/CDP
2. Xác định selector ổn định
3. Nếu là token màu: sửa `themes/zalo-<màu>.css`
4. Nếu là layout/chung: sửa `themes/zalo-common.css`
5. Chạy patch lại:

```powershell
node .\tools\zalous-cli.js apply
```

Lưu ý: `apply` đã tự sync theme/extension vào `%APPDATA%\Zalous` trước khi patch.

## 4) Patch live qua CDP (không cần restart)

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\zalo-green.css -TargetMatch Zalo
```

Dùng khi cần thử nhanh selector/màu trong phiên đang mở.

## 5) Kiểm tra nhanh khi màu không ăn

1. Kiểm tra file runtime đang dùng trong `%APPDATA%\Zalous\themes`
2. Kiểm tra selector có match đúng node thực tế chưa
3. Tăng specificity hoặc thêm `!important` cho vùng xung đột
4. Thử ON/OFF patch trong control UI hoặc đổi tab để ép re-render
5. Nếu cần, patch lại `app.asar` bằng `node .\tools\zalous-cli.js apply`

## 6) Troubleshooting

- Không thấy target CDP:
  - Mở `http://127.0.0.1:9222/json/list` để kiểm tra
- Patch thành công nhưng UI không đổi:
  - Thường do selector không trúng hoặc đang dùng cache view cũ
- Nhiều target CDP:
  - Dùng `-TargetMatch Zalo` để lọc đúng tab
