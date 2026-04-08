---
name: zalous-pack-direct-cli
description: Manage Zalous theme, theme-pack, and extension packs through direct workspace CLI commands (`add`, `patch`, `reload`) without `app.asar` repack. Use when editing packs in this repo, syncing assets to `%APPDATA%\\Zalous`, hot-reloading UI changes, or updating pack state quickly during development.
---

# Zalous Pack Direct CLI

## Core Goal
Use this skill to deliver pack changes through `%APPDATA%\\Zalous` assets instead of re-running `apply` for every edit.

## Workflow Decision
1. Run `apply` only when runtime payload changed or this machine has not been patched yet.
2. Run `add` when a new theme, theme-pack, or extension must be copied into workspace assets.
3. Run `patch` when an existing workspace asset must be replaced in place.
4. Run `reload` to trigger runtime hot reload (updates `config.hotReload.token`) and apply changes in a running app.

## Command Playbook
Use these commands from repo root (`node .\\tools\\zalous-cli.js ...`):

- Add theme:
  - `add --type theme --file <path.css> [--name custom.css] [--activate] [--reload]`
- Add extension:
  - `add --type extension --file <path.js> [--name custom.js] [--no-enable] [--reload]`
- Add theme-pack:
  - `add --type theme-pack --dir <pack-dir> [--id pack-id] [--activate] [--reload]`
- Patch theme:
  - `patch --type theme --name <file.css> --file <path.css> [--activate] [--reload]`
- Patch extension:
  - `patch --type extension --name <file.js> --file <path.js> [--reload]`
- Patch theme-pack by directory:
  - `patch --type theme-pack --id <pack-id> --dir <pack-dir> [--activate] [--reload]`
- Patch theme-pack by partial assets:
  - `patch --type theme-pack --id <pack-id> --css <path.css> [--js <path.js>] [--html <path.html>] [--reload]`
- Reload runtime state:
  - `reload --type <all|theme|theme-pack|extension> [--name <asset>] [--enable|--disable]`

## Pack-Specific Rules
- Keep `theme-pack` manifests valid (`type: theme-pack`) before add/patch.
- Treat active theme-pack key as `pack:<id>`.
- Keep extension names as `.js` files and theme names as `.css` files.
- Prefer `--reload` after add/patch during interactive UI work.

## Validation
1. Run `status` after major changes.
2. Run `list-themes` and `list-extensions` to confirm assets are present.
3. Open `%APPDATA%\\Zalous\\config.json` and verify `hotReload.token` changed after `reload`.
4. If runtime behavior is old after reload, run one `apply` and retry direct flow.

## References
- Use `references/direct-cli-cheatsheet.md` for compact examples.
- Use `docs/zalous/CLI.md` for full command syntax.
- Use `docs/zalous/FLOW.md` for asar flow vs direct flow boundaries.
