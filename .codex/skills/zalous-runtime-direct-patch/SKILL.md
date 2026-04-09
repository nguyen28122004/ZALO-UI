---
name: zalous-runtime-direct-patch
description: Runtime-only patch workflow for Zalo UI packs via Zalous CLI (`add`/`patch`/`reload`) with mandatory CDP checks. Use this when updating theme/theme-pack/extension without patching asar.
---

# Zalous Runtime Direct Patch

## Core Goal
Patch UI changes directly into `%APPDATA%\Zalous` and apply them to the running app without `apply` (asar patch).

## When To Use
- User asks to update theme/theme-pack/extension and explicitly does not want asar patch.
- User wants fast iteration on CSS/JS/HTML in runtime workspace.
- User needs CDP-first verification before/after every UI change.

## Guardrails
- Never run `node .\tools\zalous-cli.js apply` unless user explicitly asks for asar patch.
- Do not kill Zalo for runtime flow (`add`/`patch`/`reload`).
- Always run CDP baseline and post-change verify.

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
4. Post-change CDP check:
   - `powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1`

## Fallback: Runtime Does Not Reflect New CSS/JS
If CDP indicates runtime still using embedded style/state (for example style length unchanged after patch):
1. Keep the source-of-truth changes in repo and `%APPDATA%\Zalous`.
2. Inject temporary hotfix CSS/JS through CDP into current tab.
3. Report clearly that hotfix is session-level and source files are already patched.

## Quick Reference
Use [references/direct-runtime-cheatsheet.md](references/direct-runtime-cheatsheet.md) for command snippets.
