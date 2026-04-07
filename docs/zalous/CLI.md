# Zalous CLI Reference (Node)

## Base command

```powershell
node .\tools\zalous-cli.js <command> [flags]
```

## Commands

- `init`
  - Tao `%APPDATA%\Zalous`
  - Tao `config.json`
  - Copy built-in themes

- `detect [--asar <path>]`
  - Tu dong tim `app.asar` cua Zalo
  - Luu vao `config.appAsarPath`

- `status`
  - In trang thai current

- `apply [--asar <path>] [--no-backup]`
  - Patch `app.asar` va inject runtime

- `restore [--asar <path>]`
  - Restore backup gan nhat

- `list-themes`
  - Liet ke `%APPDATA%\Zalous\themes\*.css`

- `set-theme --theme <name.css>`
  - Doi active theme

- `import-theme --file <path.css> [--name custom.css]`
  - Import theme moi

- `list-extensions`
  - Liet ke `%APPDATA%\Zalous\extensions\*.js`

- `enable-extension --name <file.js>`
  - Bat extension

- `disable-extension --name <file.js>`
  - Tat extension

- `import-extension --file <path.js> [--name custom.js]`
  - Import extension moi

- `market-list [--catalog <path.json>]`
  - Xem catalog packs

- `market-install --id <packId> [--catalog <path.json>]`
  - Cai pack tu catalog

- `doctor`
  - Health check dependency/path/runtime

## Build EXE

```powershell
npm run build:exe
```

Output: `dist/zalous.exe`

