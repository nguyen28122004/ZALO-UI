# Zalo UI Mod Guide (Selector + CSS Vars)

## A. Nguyen tac chon selector ben vung

Uu tien theo thu tu:
1. `id` on dinh
2. `data-*`/`aria-*`
3. semantic role (`[role="navigation"]`, `[role="log"]`)
4. text anchor + cau truc (`:has()` khi can)
5. class contains (`[class*="..."]`) khi khong co selector tot hon

Tranh:
- class hash/minified de doi theo version
- selector qua sau (qua 5-6 cap)

## B. Mapping UI element thuong gap

| UI element | Selector goi y |
|---|---|
| App root | `#app`, `body > div[id]`, `[class*="app"]` |
| Left sidebar | `[role="navigation"]`, `nav`, `[class*="sidebar"]` |
| Conversation list | `[class*="conversation"]`, `[class*="thread-list"]` |
| Chat header | `header`, `[class*="chat-header"]` |
| Message pane | `[role="log"]`, `[class*="message-pane"]` |
| Outgoing bubble | `[data-msg-out="1"]`, `[class*="outgoing"]` |
| Incoming bubble | `[data-msg-in="1"]`, `[class*="incoming"]` |
| Composer | `textarea`, `[contenteditable="true"]`, `[class*="composer"]` |

## C. Workflow check theo element

1. Inspect node trong Elements panel.
2. Chon selector on dinh (id/data/aria/role).
3. Thu selector trong Console: `document.querySelector('...')`.
4. Sua token trong file theme dang dung:
- `themes/zalo-green.css`
- `themes/zalo-pink.css`
- `themes/zalo-blue.css`
- `themes/zalo-purple.css`
- `themes/zalo-orange.css`
5. Apply lai:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\zalo-green.css -TargetMatch Zalo
```

## D. Script probe selector nhanh

Trong DevTools Console:

```js
zaloProbe.run();
```

## E. Check CSS custom properties

```js
const cs = getComputedStyle(document.documentElement);
const vars = [...cs]
  .filter((n) => n.startsWith('--'))
  .sort()
  .map((n) => ({ name: n, value: cs.getPropertyValue(n).trim() }));
console.table(vars);
```

## F. Patch nhanh theo theme

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme green
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme pink
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme blue
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme purple
powershell -ExecutionPolicy Bypass -File .\tools\patch-zalo-now.ps1 -Theme orange
```

## G. Troubleshooting

- Khong thay target: check `http://127.0.0.1:9222/json/list`.
- Style khong an: tang specificity hoac them `!important`.
- Mo nhieu target: them `-TargetMatch Zalo`.

Luu y: tai lieu nay khong bao gom buoc kill/mo Zalo kem debug argument.
