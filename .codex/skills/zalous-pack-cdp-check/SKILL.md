---
name: zalous-pack-cdp-check
description: Mandatory CDP-first UI verification for any Zalous theme/theme-pack/pack-related task. Always run a baseline CDP check before editing, then verify again after runtime patch/reload. Auto-discover the active Zalo DevTools WebSocket target from http://127.0.0.1:9222/json/list and report pass/fail evidence.
---

# Zalous Pack CDP Check

## Core Goal
Dùng CDP làm bước chẩn đoán đầu tiên và cổng verify cuối cho mọi thay đổi theme/pack.

1. Trước khi sửa, luôn chạy baseline CDP để lấy trạng thái runtime hiện tại.
2. Sau mỗi lần update theme/theme-pack/extension, verify lại bằng CDP.
3. Mặc định dùng runtime direct patch (`add`/`patch`/`reload`), không dùng asar patch.
4. Chỉ chạy `apply` khi user yêu cầu patch asar rõ ràng.
5. Auto-discover target từ `http://127.0.0.1:9222/json/list`; không hardcode ws URL.
6. Nếu CDP endpoint lỗi hoặc assertion fail thì coi là blocked.
7. Báo cáo phải có bằng chứng:
   - target title/url
   - active theme
   - theme-pack attribute
   - selector/style assertions

## Command Playbook
Run từ repo root.

- Baseline check:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'`

- Post-change check:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1`

- Check expected active theme-pack và selector:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -ExpectedActiveTheme 'pack:themepack.console-minimal' -ExpectedThemePackAttr 'console-minimal' -Selector '[class*="avatar"], .avatar'`

- Assert CSS includes/excludes text:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -MustIncludeCss 'border-radius: 5px;' -MustExcludeCss 'border-radius: 8px;'`

Implementation note:
- `verify-zalo-cdp.ps1` là wrapper.
- Backend verify chạy trong `scripts/verify-zalo-cdp.mjs` (WebSocket + Runtime.evaluate).

## Runtime Source Caveat

Triệu chứng:
- CLI patch báo thành công nhưng UI chưa đổi ngay.

Nguyên nhân:
- Runtime đang `source=local+embedded` và `hasRequire=false`, nên không đọc external pack ngay.

Fallback workflow:
1. Kiểm tra `window.zalous.source` + `hasRequire` qua CDP.
2. Inject CSS/JS hotfix trực tiếp qua CDP vào tab Zalo đang chạy.
3. Báo cáo rõ:
   - đã inject hotfix runtime tạm thời
   - source code đã được lưu trong repo/workspace

## Failure Handling
1. Nếu CDP endpoint down, báo `http://127.0.0.1:9222` unavailable và stop.
2. Nếu không tìm thấy target page hợp lệ, báo list targets và stop.
3. Nếu assertion fail, báo field fail + giá trị hiện tại.
4. Sau khi fix, patch runtime và verify lại đến khi `pass=true`.
5. Exit code:
   - `0`: pass
   - `2`: assertion failed
   - `1`: CDP/tooling error
