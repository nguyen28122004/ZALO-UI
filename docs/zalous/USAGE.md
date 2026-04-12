# Usage Guide

## Basic commands

```powershell
node .\tools\zalous-cli.js help
node .\tools\zalous-cli.js doctor
node .\tools\zalous-cli.js status
```

## Set active theme

```powershell
node .\tools\zalous-cli.js list-themes
node .\tools\zalous-cli.js set-theme --theme pack:themepack.console-minimal-v2
```

## Enable or disable extension

```powershell
node .\tools\zalous-cli.js list-extensions
node .\tools\zalous-cli.js enable-extension --name email-prototype.js
node .\tools\zalous-cli.js disable-extension --name email-prototype.js
```

## Import custom assets

```powershell
node .\tools\zalous-cli.js import-theme --file .\my-theme.css --name my-theme.css
node .\tools\zalous-cli.js import-extension --file .\my-extension.js --name my-extension.js
```

## Direct patch external workspace

```powershell
node .\tools\zalous-cli.js patch --type theme-pack --id themepack.console-minimal-v2 --dir .\zalous\market\packs\themepack-console-minimal-v2 --reload
```

## Patch installed Zalo

```powershell
node .\tools\zalous-cli.js apply
```

## Build local exe

```powershell
npm run build:email-prototype
npm run build:exe
Copy-Item .\dist\zalous.exe .\tools\zalous.exe -Force
```
