# Zalo UI Mod Guide (Selector + CSS Vars)

## A. Nguyen tac chon selector ben vung

Uu tien: `id` -> `data/aria` -> `role` -> `class contains`.

## B. Kien truc theme

- `zalo-common.css`: rule chung (layout/selectors), luon duoc apply khi bat `ON`.
- `zalo-<color>.css`: chi token mau theo theme.

## C. Quy trinh sua giao dien

1. Inspect element.
2. Tim selector on dinh.
3. Sua token mau trong file theme dang dung.
4. Apply lai:

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
- Style khong an: tang specificity hoac them `!important`.
- Mo nhieu target: them `-TargetMatch Zalo`.

Luu y: tai lieu nay khong bao gom buoc kill/mo Zalo kem debug argument.
