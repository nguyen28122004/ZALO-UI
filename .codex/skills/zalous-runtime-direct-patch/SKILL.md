---
name: zalous-runtime-direct-patch
description: Runtime-only patch workflow for Zalo UI packs via Zalous CLI (`add`/`patch`/`reload`) with mandatory CDP checks. Use this when updating theme/theme-pack/extension without patching asar.
---

# Zalous Runtime Direct Patch

## Core Goal
Patch UI changes directly into `%APPDATA%\Zalous` and apply them to the running app without `apply` (asar patch).
Default assumption: runtime is `source=local+embedded` unless CDP proves otherwise.

## When To Use
- User asks to update theme/theme-pack/extension and explicitly does not want asar patch.
- User wants fast iteration on CSS/JS/HTML in runtime workspace.
- User needs CDP-first verification before/after every UI change.

## Guardrails
- Never run `node .\tools\zalous-cli.js apply` unless user explicitly asks for asar patch.
- Do not kill Zalo for runtime flow (`add`/`patch`/`reload`).
- Always run CDP baseline and post-change verify.
- With `source=local+embedded`, treat CLI patch as persistence-only and CDP hotfix as mandatory for immediate UI effect.

## Runtime-Only Workflow
1. Baseline CDP check:
   - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'`
2. Patch runtime assets via CLI:
   - theme: `patch --type theme --name <file.css> --file <path.css> --reload`
   - extension: `patch --type extension --name <file.js> --file <path.js> --reload`
   - theme-pack dir: `patch --type theme-pack --id <pack-id> --dir <pack-dir> --reload`
   - theme-pack partial: `patch --type theme-pack --id <pack-id> --css <path.css> [--js <path.js>] [--html <path.html>] --reload`
3. Signal reload:
   - `node .\tools\zalous-cli.js reload --type <theme|theme-pack|extension|all> [--name <asset>]`
4. Verify target selector/style by CDP:
   - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo' -Selector '<expected-selector>'`
5. If selector/style is still missing (common on `local+embedded`), inject hotfix from local file into current tab:
   - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-runtime-direct-patch\scripts\cdp-eval-file.ps1 -TargetMatch 'Zalo' -FilePath '<absolute-or-relative-js-file>'`
6. Post-change CDP check:
   - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo' -Selector '<expected-selector>'`

## Local+Embedded Rule (Mandatory)
When CDP reports `source=local+embedded`:
1. Keep source-of-truth in repo and `%APPDATA%\Zalous` using CLI `add/patch`.
2. Do not assume runtime auto-loads external assets.
3. Inject runtime hotfix via CDP from the same source file.
4. Report clearly: hotfix is session-level; persistence is already written by CLI.

## CDP Hotfix Script
- Script: `.codex/skills/zalous-runtime-direct-patch/scripts/cdp-eval-file.ps1`
- Purpose: evaluate a local JS file in the active Zalo tab through CDP.
- Typical usage:
  - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-runtime-direct-patch\scripts\cdp-eval-file.ps1 -TargetMatch 'Zalo' -FilePath .\zalous\market\packs\email-prototype\email-prototype.js`

## Quick Reference
Use [references/direct-runtime-cheatsheet.md](references/direct-runtime-cheatsheet.md) for command snippets.
