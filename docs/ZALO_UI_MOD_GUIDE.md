# Zalo UI Mod Guide (Selector + Theme Workflow)

## A. Nguyen tac selector

Uu tien theo thu tu:
1. `id` on dinh
2. `data-*` / `aria-*`
3. `role`
4. `class contains` (chi dung khi can)

Tranh selector qua sau va class hash khong on dinh.

## B. Kien truc css

- `zalo-common.css`: rule chung cho toan bo giao dien light.
- `zalo-<color>.css`: chi chua token mau.

Khi ON:
- script inject `zalo-common.css`
- script inject theme dang chon (`green/pink/blue/purple/orange`)

## C. Quy trinh chinh giao dien

1. Inspect element trong DevTools.
2. Tim selector on dinh.
3. Neu la mau: sua trong file `themes/zalo-<color>.css`.
4. Neu la rule chung/layout: sua trong `themes/zalo-common.css`.
5. Patch lai:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\zalo-green.css -TargetMatch Zalo
```

## D. Theme nhanh

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme green
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme pink
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme blue
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme purple
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme orange
```

## E. Troubleshooting

- Khong thay target: check `http://127.0.0.1:9222/json/list`.
- Patch thanh cong nhung UI khong doi: bam ON/OFF 1 lan hoac doi tab chat de re-render.
- Style khong an: tang specificity hoac them `!important`.
- Nhieu target: them `-TargetMatch Zalo`.

Luu y: guide nay khong bao gom buoc kill/mo Zalo kem debug argument.
