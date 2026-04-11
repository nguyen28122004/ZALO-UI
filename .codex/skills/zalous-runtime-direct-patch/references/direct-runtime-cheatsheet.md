# Direct Runtime Cheatsheet

## Baseline

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

## Default Assumption

- Runtime is usually `source=local+embedded`.
- `add/patch/reload` persists files/config, but UI may not reflect immediately.
- Always verify selector/style and inject CDP hotfix when missing.

## Patch Theme-Pack (directory)

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --dir .\zalous\market\packs\themepack-console-minimal --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

## Patch Theme-Pack (partial assets)

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal --css .\tmp\console.css --js .\tmp\console.js --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack.console-minimal
```

## Patch Extension

```powershell
node .\tools\zalous-cli.js patch --type extension --name theme-common-mod.js --file .\zalous\market\packs\theme-common-mod\theme-common-mod.js --reload
node .\tools\zalous-cli.js reload --type extension --name theme-common-mod.js --enable
```

## Verify Selector

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo' -Selector '<expected-selector>'
```

## CDP Hotfix From Local JS File

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-runtime-direct-patch\scripts\cdp-eval-file.ps1 -TargetMatch 'Zalo' -FilePath .\zalous\market\packs\email-prototype\email-prototype.js
```

## Post-check

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo' -Selector '<expected-selector>'
```

## Rule

- Runtime flow only. Do not run `node .\tools\zalous-cli.js apply` unless user explicitly asks for asar patch.
