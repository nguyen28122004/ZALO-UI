# Direct Runtime Cheatsheet

## Baseline

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1 -TargetMatch 'Zalo'
```

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

## Post-check

```powershell
powershell -ExecutionPolicy Bypass -File .\.codex\skills\zalous-pack-cdp-check\scripts\verify-zalo-cdp.ps1
```

## Rule

- Runtime flow only. Do not run `node .\tools\zalous-cli.js apply` unless user explicitly asks for asar patch.
