---
name: zalous-pack-cdp-check
description: Mandatory CDP-first UI verification for any Zalous theme/theme-pack/pack-related task. Always run a baseline CDP check before editing, then verify again after runtime patch/reload. Auto-discover the active Zalo DevTools WebSocket target from http://127.0.0.1:9222/json/list and report pass/fail evidence.
---

# Zalous Pack CDP Check

## Core Goal
Use CDP as first diagnostic step and final verification gate for every theme/pack change.

## Mandatory Rules
1. Before any edit, run a baseline CDP verification to capture current runtime UI state and decide what must be fixed.
2. After every theme/theme-pack/extension update, patch runtime assets directly (`add`/`patch`/`reload`) and verify again by CDP.
3. Do not treat `asar` patch as default flow for UI tweaks; only run `apply` when user explicitly asks for `asar` patch.
4. Auto-discover the WebSocket target from `http://127.0.0.1:9222/json/list`; do not hardcode a stale `ws://...` URL.
5. Treat missing CDP endpoint or failed checks as blocked work, not success.
6. Include verification evidence in the final response:
   - target title/url
   - active theme
   - theme-pack attribute
   - selector/style assertions

## Command Playbook
Run from repo root.

- Baseline check (mandatory before any other step):
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'`

- Post-change check (mandatory after runtime patch/reload):
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
4. After fixes, patch runtime assets (`add`/`patch`/`reload`) and rerun verification until it passes.
5. Treat exit code:
   - `0`: pass
   - `2`: assertion failed
   - `1`: CDP/tooling error
