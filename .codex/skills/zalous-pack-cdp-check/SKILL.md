---
name: zalous-pack-cdp-check
description: Mandatory CDP UI verification for any Zalous theme/theme-pack/pack-related task. Use whenever creating, editing, patching, applying, or reloading themes or packs. Automatically discover the active Zalo DevTools WebSocket target from http://127.0.0.1:9222/json/list, run Runtime.evaluate checks, and report pass/fail evidence before completion.
---

# Zalous Pack CDP Check

## Core Goal
Verify real runtime UI state via CDP for every theme/pack change before claiming completion.

## Mandatory Rules
1. Run CDP verification after every `add`, `patch`, `reload`, or `apply` related to themes/packs.
2. Auto-discover the WebSocket target from `http://127.0.0.1:9222/json/list`; do not hardcode a stale `ws://...` URL.
3. Treat missing CDP endpoint or failed checks as blocked work, not success.
4. Include verification evidence in the final response:
   - target title/url
   - active theme
   - theme-pack attribute
   - selector/style assertions

## Command Playbook
Run from repo root.

- Baseline check (discover target automatically):
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1`

- Check expected active theme-pack and selector:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -ExpectedActiveTheme 'pack:themepack.console-minimal' -ExpectedThemePackAttr 'console-minimal' -Selector '[class*="avatar"], .avatar'`

- Assert CSS includes/excludes specific text:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -MustIncludeCss 'filter: grayscale(0.2) contrast(1.05);' -MustExcludeCss 'border: 1px solid var(--border-subtle) !important;'`

- Target fallback match override:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo' -Port 9222`

Implementation note:
- `verify-zalo-cdp.ps1` la wrapper.
- Backend verify thuc te chay trong `scripts/verify-zalo-cdp.mjs` (WebSocket + Runtime.evaluate).

## Failure Handling
1. If CDP endpoint is down, stop and report that `http://127.0.0.1:9222` is unavailable.
2. If no valid page target is found, report the available targets and stop.
3. If assertions fail, include failed fields and current runtime values.
4. After fixes, rerun verification until it passes.
5. Treat exit code:
   - `0`: pass
   - `2`: assertion failed
   - `1`: CDP/tooling error
