# hara-zalous v0.3.3

## Highlights

- Add a generated theme-token source of truth for built-in themes and theme packs.
- Move Zalous UI sync to runtime tokens so market, controls, and email surfaces stay aligned per theme.
- Update `blur-elements` with privacy presets for preview, name, message body, and full privacy modes.
- Fix `detect` so the default path follows the latest installed Zalo `app.asar`.

## Theme Runtime

- Apply CSS/theme-pack assets before sampling and syncing computed palette values.
- Clear stale inline theme variables between theme changes.
- Preserve separate `console-minimal` and `console-minimal-v2` identities.

## CDP Verification

- Theme cycle check now scrolls conversation, market, and email panels.
- Blur presets are tested through the CDP-friendly extension config API and restored after the pass.

## Validation

- Run `npm run build:themes` before packaging.
- Patch latest Zalo ASAR and launch through the existing Zalo shortcut with remote debugging already configured.
