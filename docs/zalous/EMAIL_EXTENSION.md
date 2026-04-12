# Email Extension

Pack: `zalous/market/packs/email-prototype`

## Goal

Them mot workspace mail read-only vao giao dien Zalo Desktop.

## UI behavior

- Conversation list co pinned item `#zalous-email-prototype-item`.
- Container goc cua item nay khong giu padding/border visual.
- Phan visual duoc boc trong `.mail-pin-shell`.
- Khi active, extension thay noi dung main panel bang mail workspace.
- Khi chon conversation khac, extension restore lai main panel goc.

## Features

- Folder tree + unseen count
- Search/filter
- Pagination `First/Prev/Next/Last`
- Read-only detail pane
- Local star/unstar
- Local tags
- Copy `Message-ID`
- Share selected mail as generated image

## Keyboard shortcuts

- `Ctrl+R`: refresh mailbox
- `J / K`: next or previous mail
- `S`: star or unstar selected mail
- `Alt+C`: copy `Message-ID`

## Local config

Path:

- `%APPDATA%\Zalous\config.json`

Key:

- `extensionConfigs["email-prototype.js"]`

Fields:

- `imapHost`, `imapPort`, `imapSsl`
- `smtpHost`, `smtpPort`, `smtpSsl`
- `username`, `password`
- `pageSize`, `previewBytes`
- `allowSelfSigned`
- `onlyUnread`
- `starredByFolder`

## Build

```powershell
npm run build:email-prototype
```

Build script se concat `src/*.js` theo thu tu ten file sang `email-prototype.js`.
