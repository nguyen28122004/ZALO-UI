# hara-zalous v0.3.0

## Highlights

- Refactor CLI thành `entry + core module`.
- Refactor runtime thành module loader (`zalous/runtime/modules/*`).
- Refactor extension email thành nhiều source module + build script riêng.

## Email Extension

- Tách render thành component riêng:
  - folder panel
  - mail list panel
  - detail/settings panel
- Fix restore main panel khi rời tab email.
- Fix layout dư panel phải khi mở email tab (ẩn sibling panel khi active).
- Fix pinned conversation item bị lệch vị trí do shift tích lũy.
- Fix xung đột password input với lock-pin-dots (`data-zalous-skip-pin` + lọc lock scope).
- Thêm tính năng Star/Unstar local theo folder (không ghi IMAP server).

## Theme Sync

- Mail workspace dùng biến màu `--zmail-*`.
- Các CSS theme/theme-pack trong market có thêm palette variables để đồng bộ mail UI với theme.

## Docs

- Rewrite `README.md`.
- Rewrite `docs/zalous/ARCHITECTURE.md`.
- Add `docs/zalous/EMAIL_EXTENSION.md`.
- Update `docs/zalous/BUILD.md`.
