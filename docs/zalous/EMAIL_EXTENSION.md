# Email Extension

Pack: `zalous/market/packs/email-prototype`

## Mục tiêu

- Tạo tab mail riêng trong UI Zalo.
- IMAP read-only client: folder, list, pagination, xem chi tiết mail.
- Không reply/send.

## Chức năng chính

- Pinned item `#zalous-email-prototype-item` ở danh sách hội thoại.
- Khi mở tab mail, extension thay nội dung main panel.
- Khi click item hội thoại khác, extension restore main panel cũ.
- IMAP folder list + unseen count.
- Search/filter list.
- Pagination `First/Prev/Next/Last`.
- Star/Unstar local theo folder (lưu local config, không ghi server).
- Keyboard shortcuts trong mail tab:
  - `Ctrl+R`: refresh mailbox
  - `J/K`: chọn mail kế tiếp/trước
  - `S`: star/unstar mail đang chọn
  - `Alt+C`: copy `Message-ID` của mail đang chọn

## Local Config

Path:
- `%APPDATA%\\Zalous\\config.json`

Key:
- `extensionConfigs["email-prototype.js"]`

Các trường:
- `imapHost`, `imapPort`, `imapSsl`
- `smtpHost`, `smtpPort`, `smtpSsl`
- `username`, `password`
- `pageSize`, `previewBytes`
- `allowSelfSigned`
- `onlyUnread`
- `starredByFolder` (internal, local-only)

## Build

```powershell
node .\tools\build-email-prototype.js
```

Script build sẽ concat `src/*.js` theo thứ tự tên file số prefix.
