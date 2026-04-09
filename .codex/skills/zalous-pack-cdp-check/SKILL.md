---
name: zalous-pack-cdp-check
description: Mandatory CDP-first UI verification for any Zalous theme/theme-pack/pack-related task. Always run a baseline CDP check before editing, then verify again after runtime patch/reload. Auto-discover the active Zalo DevTools WebSocket target from http://127.0.0.1:9222/json/list and report pass/fail evidence.
---

# Zalous Pack CDP Check

## Core Goal
Use CDP as first diagnostic step and final verification gate for every theme/pack change.

1. Before any edit, run baseline CDP verification to capture current runtime UI state.
2. After every theme/theme-pack/extension update, verify again via CDP.
3. Default to runtime direct patch flow (`add`/`patch`/`reload`), not asar patch.
4. Only run `apply` when user explicitly asks to patch asar.
5. Auto-discover target from `http://127.0.0.1:9222/json/list`; do not hardcode ws URL.
6. Missing CDP endpoint or failed checks = blocked, not success.
7. Include evidence in report:
   - target title/url
   - active theme
   - theme-pack attribute
   - selector/style assertions

## Command Playbook
Run from repo root.

- Baseline check:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'`

- Post-change check:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1`

- Check expected active theme-pack and selector:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -ExpectedActiveTheme 'pack:themepack.console-minimal' -ExpectedThemePackAttr 'console-minimal' -Selector '[class*="avatar"], .avatar'`

- Assert CSS includes/excludes text:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -MustIncludeCss 'border-radius: 5px;' -MustExcludeCss 'border-radius: 8px;'`

Implementation note:
- `verify-zalo-cdp.ps1` la wrapper.
- Backend verify chay trong `scripts/verify-zalo-cdp.mjs` (WebSocket + Runtime.evaluate).

## Runtime Source Caveat

Trieu chung:
- CLI patch bao thanh cong nhung UI chua doi ngay.

Nguyen nhan:
- Runtime dang `source=local+embedded` va `hasRequire=false`, nen khong doc external pack ngay.

Fallback workflow:
1. Kiem tra `window.zalous.source` + `hasRequire` qua CDP.
2. Inject CSS/JS hotfix truc tiep qua CDP vao tab Zalo dang chay.
3. Bao cao ro:
   - da inject hotfix runtime tam thoi
   - source code da duoc luu trong repo/workspace

## Failure Handling
1. Neu CDP endpoint down, report `http://127.0.0.1:9222` unavailable va stop.
2. Neu khong tim thay target page hop le, report list targets va stop.
3. Neu assertion fail, report field fail + value hien tai.
4. Sau khi fix, patch runtime va verify lai den khi `pass=true`.
5. Exit code:
   - `0`: pass
   - `2`: assertion failed
   - `1`: CDP/tooling error
