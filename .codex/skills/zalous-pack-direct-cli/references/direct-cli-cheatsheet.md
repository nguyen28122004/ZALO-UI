# Direct CLI Cheatsheet

## Theme

```powershell
node .\tools\zalous-cli.js add --type theme --file .\tmp\my-theme.css --name my-theme.css --activate --reload
node .\tools\zalous-cli.js patch --type theme --name my-theme.css --file .\tmp\my-theme.css --reload
node .\tools\zalous-cli.js reload --type theme --name my-theme.css
```

## Theme-Pack

```powershell
node .\tools\zalous-cli.js add --type theme-pack --dir .\zalous\market\packs\themepack-hello-kitty --reload
node .\tools\zalous-cli.js patch --type theme-pack --id themepack-hello-kitty --dir .\zalous\market\packs\themepack-hello-kitty --activate --reload
node .\tools\zalous-cli.js reload --type theme-pack --name themepack-hello-kitty
```

## Extension

```powershell
node .\tools\zalous-cli.js add --type extension --file .\tmp\hello.js --name hello.js --reload
node .\tools\zalous-cli.js patch --type extension --name hello.js --file .\tmp\hello.js --reload
node .\tools\zalous-cli.js reload --type extension --name hello.js --enable
```

## Full refresh

```powershell
node .\tools\zalous-cli.js reload --type all
```
