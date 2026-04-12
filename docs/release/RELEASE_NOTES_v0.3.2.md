# hara-zalous v0.3.2

## Highlights

- Remove legacy `zalo-*` themes from managed assets and runtime payloads.
- Fix theme-sync fallback so leaving `console-minimal` no longer keeps the mail workspace stuck on the previous palette.
- Improve MIME/body charset decoding for Vietnamese email content.
- Add managed asset pruning during `apply` to prevent stale theme and extension cache from leaking back into payloads.

## Theme Runtime

- Harden `console-minimal` cleanup so `color-scheme` overrides do not leak into the next theme.
- Keep local managed theme directories in `%APPDATA%\\Zalous` synced to the repo instead of only copying over old files.

## Email Workspace

- Decode encoded headers using the declared charset instead of forcing UTF-8.
- Decode `quoted-printable` and `base64` bodies through byte-aware charset conversion.
- Apply the same charset fix to the standalone email bridge.

## Validation

- Rebuilt `email-prototype.js` from source modules.
- Re-applied the patch payload after asset cleanup so runtime theme lists no longer include removed `zalo-*` entries.
