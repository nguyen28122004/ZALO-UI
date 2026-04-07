# Zalo UI Mod Guide (Selector + CSS Vars)

## A. Nguyen tac chon selector ben vung

Uu tien theo thu tu:
1. `id` on dinh
2. `data-*`/`aria-*` (`[data-testid]`, `[aria-label]`)
3. semantic role (`[role="navigation"]`, `[role="log"]`)
4. text anchor + cau truc (`:has()` khi can)
5. class contains (`[class*="..."]`) chi dung khi khong con lua chon tot hon

Tranh:
- class hash/minified de doi theo version
- selector qua sau (qua 5-6 cap)

## B. Mapping UI element thuong gap

| UI element | Selector goi y (uu tien trai -> phai) |
|---|---|
| App root | `#app`, `body > div[id]`, `[class*="app"]` |
| Left sidebar | `[role="navigation"]`, `nav`, `[class*="sidebar"]` |
| Conversation list | `[aria-label*="conversation" i]`, `[class*="conversation"]`, `[class*="thread-list"]` |
| Chat header | `header`, `[class*="chat-header"]`, `[class*="conversation-header"]` |
| Message pane | `[role="log"]`, `[class*="message-pane"]`, `[class*="chat-content"]` |
| Outgoing bubble | `[data-msg-out="1"]`, `[class*="outgoing"]`, `[class*="self"]` |
| Incoming bubble | `[data-msg-in="1"]`, `[class*="incoming"]`, `[class*="other"]` |
| Composer | `textarea`, `[contenteditable="true"]`, `[class*="composer"]` |
| Send button | `button[aria-label*="send" i]`, `button[type="submit"]`, `[class*="send"]` |
| Search box | `input[type="search"]`, `input[placeholder*="search" i]`, `[class*="search"] input` |

## C. Workflow check theo element

1. Inspect node trong Elements panel.
2. Tim attr on dinh (id/data/aria/role).
3. Thu selector trong Console: `document.querySelector('...')`.
4. Sua token trong `themes/zalo-green.css` (uu tien sua token truoc khi sua selector).
5. Apply lai:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\zalo-green.css -TargetMatch Zalo
```

## D. Script probe selector nhanh

Trong DevTools Console, nap `snippets/zalo-selector-probe.js`, roi chay:

```js
zaloProbe.run();
```

Ket qua tra ve:
- node tim duoc cho tung khu vuc
- cssPath goi y de copy thanh selector

## E. Check CSS custom properties

Lay computed vars tren root:

```js
const cs = getComputedStyle(document.documentElement);
const vars = [...cs]
  .filter((n) => n.startsWith('--'))
  .sort()
  .map((n) => ({ name: n, value: cs.getPropertyValue(n).trim() }));
console.table(vars);
```

Tim var khai bao trong stylesheet:

```js
const out = [];
for (const sheet of [...document.styleSheets]) {
  let rules;
  try { rules = sheet.cssRules; } catch { continue; }
  for (const rule of [...rules]) {
    if (!rule.selectorText || !rule.style) continue;
    if (!rule.selectorText.includes(':root') && !rule.selectorText.includes('body')) continue;
    for (const name of [...rule.style]) {
      if (name.startsWith('--')) {
        out.push({
          source: sheet.href || 'inline',
          selector: rule.selectorText,
          name,
          value: rule.style.getPropertyValue(name).trim()
        });
      }
    }
  }
}
console.table(out);
```

## F. Runtime override nhanh

```js
zaloMod.apply(`
  :root {
    --accent: #22c55e !important;
    --bg-primary: #f2fff5 !important;
  }

  [role="navigation"], [class*="sidebar"] {
    background: #ecf8f0 !important;
  }
`);
```

Rollback:

```js
zaloMod.clear();
```

## G. Patch tool qua CDP

Apply:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\zalo-green.css -TargetMatch Zalo
```

Clear:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action clear -Port 9222 -TargetMatch Zalo
```

## H. Troubleshooting

- Khong thay target: check `http://127.0.0.1:9222/json/list`.
- Style khong an: tang specificity hoac them `!important`.
- Khong doc duoc `cssRules`: stylesheet cross-origin, bo qua va dung computed style.
- Update Zalo lam vo selector: uu tien `data-*`, `aria-*`, `role` thay vi class hash.
- Mo nhieu target: them `-TargetMatch Zalo`.

Luu y: Tai lieu nay khong bao gom buoc kill/mo Zalo kem debug argument.
