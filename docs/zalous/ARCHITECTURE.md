# Architecture

## Core Parts

### CLI (`tools/zalous-cli.js`)

- Quản lý workspace `%APPDATA%\Zalous`.
- Resolve `app.asar` theo `--asar` hoặc latest Zalo.
- Sync built-in assets vào workspace.
- Patch `app.asar` theo clean-base strategy.
- Backup/restore.
- Hỗ trợ direct mode:
  - `add`/`patch` cho `theme`, `theme-pack`, `extension` trên external workspace.
  - `reload` bằng hot-reload signal (`config.hotReload.token`).

### Runtime (`zalous/runtime/zalous-runtime.js`)

- Chạy trong renderer sau khi inject.
- Đọc embedded payload + merge external config/assets nếu truy cập được.
- Apply `theme`/`theme-pack`.
- Chạy extension + config extension.
- Có controls:
  - `RL`: reload tay.
  - `WR`/`WX`: bật tắt hot reload watcher.

### Market (`zalous/market/*`)

- `catalog.local.json`: danh sách pack local.
- `packs/*`: mỗi pack có `manifest.json` + assets.

## Runtime Load Priority

Config boot order:
1. `%APPDATA%\Zalous\config.json` (nếu runtime đọc được external)
2. `localStorage` (`zalous.config.v1`)
3. Embedded payload trong `app.asar`

Assets priority:
- External assets ưu tiên hơn embedded assets nếu runtime có thể đọc external.

## Hot Reload Watcher

Signal do CLI ghi vào `config.hotReload`:
- `token`
- `type`
- `name`
- `source`
- `at`

Runtime behavior:
- Watcher bật (`WR`): theo dõi token và reload khi token đổi.
- Watcher tắt (`WX`): không auto reload, cần bấm `RL`.

## Runtime Source Caveat

Case:
- `source=local+embedded`
- `hasRequire=false`

Tác động:
- Runtime có thể không đọc external filesystem pack ngay.
- `add/patch/reload` vẫn ghi file thành công, nhưng UI trên tab hiện tại có thể chưa đổi.

Fallback:
1. Verify bằng CDP.
2. Inject CSS/JS hotfix qua CDP vào tab đang chạy.
3. Vẫn lưu source fix trong repo và external workspace.

## Patch Strategy

### Clean Backup theo version

- Clean backup: `%APPDATA%\Zalous\backups\app.asar.clean.<version>.bak`.
- Mỗi lần `apply`, CLI restore clean base trước khi inject.

### Payload mode

- Mặc định full payload.
- Có thể dùng `--lite-payload` nếu cần.

### Unpacked dependency

- `@electron/asar` cần native files trong `resources\app.asar.unpacked`.
- Nếu thiếu unpacked files thì `apply` sẽ fail.
- Sau repack, CLI sync lại `.unpacked` về app target.

## Operational Rule

- Theme/theme-pack/extension: mặc định direct runtime patch (`add`/`patch`/`reload`), không kill Zalo.
- Patch `asar` chỉ khi user yêu cầu.
- CDP verify là gate bắt buộc trước/sau mỗi thay đổi UI.

## Restore Strategy

`restore` ưu tiên:
1. `app.asar.<timestamp>.bak`
2. `app.asar.pre_restore.<timestamp>.bak`
