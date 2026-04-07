# Zalo UI Mod Guide (Selector + Root CSS)

## A. Nguyen tac chon selector ben vung

Uu tien theo thu tu:
1. `id` on dinh
2. `data-*`/`aria-*` (`[data-testid]`, `[aria-label]`)
3. semantic role (`[role="navigation"]`, `[role="log"]`)
4. text anchor + cau truc (`:has()` khi can)
5. class contains (`[class*="..."]`) chi dung khi khong con lua chon tot hon

Tranh:
- class hash/minified dai, de doi theo version
- selector qua sau (qua 5-6 cap)

## B. Mapping UI element thuong gap

Luu y: ten class Zalo co the thay doi. Hay inspect lai va cap nhat theo app build hien tai.

| UI element | Selector goi y (uu tien trai -> phai) |
|---|---|
| App root | `#app`, `body > div[id]`, `[class*="app"]` |
| Left sidebar | `[role="navigation"]`, `nav`, `[class*="sidebar"]` |
| Conversation list | `[aria-label*="conversation" i]`, `[class*="conversation"]`, `[class*="thread-list"]` |
| Chat header | `header`, `[class*="chat-header"]`, `[class*="conversation-header"]` |
| Message log/pane | `[role="log"]`, `[class*="message-pane"]`, `[class*="chat-content"]` |
| Message bubble outgoing | `[data-msg-out="1"]`, `[class*="outgoing"]`, `[class*="self"]` |
| Message bubble incoming | `[data-msg-in="1"]`, `[class*="incoming"]`, `[class*="other"]` |
| Composer/editor | `textarea`, `[contenteditable="true"]`, `[class*="composer"]` |
| Send button | `button[aria-label*="send" i]`, `button[type="submit"]`, `[class*="send"]` |
| Search box | `input[type="search"]`, `input[placeholder*="search" i]`, `[class*="search"] input` |

## C. Element Checklist (Pastel full-app)

File theme hien tai: `themes/zalo-green.css`

| Element | Rule nhom trong CSS | Muc tieu mau |
|---|---|---|
| Toan app nen | `/* 1) Global surfaces */` | `--pastel-bg-app` |
| Cot trai + list chat | `/* 2) Left icon rail + conversation list */` | `--pastel-bg-pane` |
| Thread row hover/active | `/* 3) Thread rows */` | `--pastel-bg-hover`, `--pastel-bg-active` |
| Header tren | `/* 4) Top headers */` | `--pastel-bg-pane` |
| Khung chat giua | `/* 5) Center chat area */` | `--pastel-bg-app` |
| Bong bong tin nhan | `/* 6) Message cards/bubbles */` | outgoing `#cfeeda`, incoming `--pastel-bg-card` |
| Panel thong tin phai | `/* 7) Right info panel */` | `--pastel-bg-pane`, `--pastel-bg-card` |
| Composer + toolbar duoi | `/* 8) Composer + toolbar */` | `#fff`, `--pastel-bg-pane` |
| Nut hanh dong | `/* 9) Buttons + actions */` | `--pastel-accent` |
| Link/chu phu | `/* 10) Typography accents */` | `--pastel-text-soft` |
| Focus/selection | `/* 11) Selection/focus */` | `--pastel-focus` |
| Scrollbar | `/* 12) Scrollbar */` | mint pastel |

Quy trinh check tung element:
1. Dung inspect, click vao element can sua.
2. Tim rule trung selector trong file `themes/zalo-green.css` theo table tren.
3. Sua bien mau (`--pastel-*`) truoc, tranh sua tung selector le.
4. Apply lai: `powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222`

## D. Script probe selector nhanh

Mo DevTools Console, copy file `snippets/zalo-selector-probe.js` vao, chay:

```js
zaloProbe.run();
```

Ket qua tra ve:
- node da tim duoc cho tung khu vuc
- cssPath tu dong cho tung node
- de copy thanh selector mod runtime

## E. Check `:root` va CSS custom properties

### 1) Lay gia tri computed vars tren `:root`

```js
const cs = getComputedStyle(document.documentElement);
const vars = [...cs]
  .filter((n) => n.startsWith('--'))
  .sort()
  .map((n) => ({ name: n, value: cs.getPropertyValue(n).trim() }));
console.table(vars);
```

### 2) Tim var duoc khai bao trong stylesheet (`:root { --x: ... }`)

```js
const out = [];
for (const sheet of [...document.styleSheets]) {
  let rules;
  try { rules = sheet.cssRules; } catch { continue; }
  for (const rule of [...rules]) {
    if (!rule.selectorText || !rule.style) continue;
    if (!rule.selectorText.includes(':root')) continue;
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

## F. Runtime override (safe pattern)

Khuyen nghi dung 1 style tag rieng de rollback nhanh:

```js
zaloMod.apply(`
  :root {
    --accent: #22c55e !important;
    --bg-primary: #f2fff5 !important;
  }

  [role="navigation"], [class*="sidebar"] {
    background: #ecf8f0 !important;
  }

  [role="log"], [class*="message-pane"] {
    background: #f4fbf6 !important;
  }
`);
```

Rollback:

```js
zaloMod.clear();
```

## G. Quy trinh mod cho tung element

1. Inspect node trong Elements panel.
2. Tim attr on dinh (id/data/aria/role).
3. Thu selector trong Console: `document.querySelector('...')`.
4. Them rule vao `zaloMod.apply(...)`.
5. Test tren nhieu view (chat 1-1, group, settings).
6. Luu snippet theo module (sidebar, chat, composer) de de bao tri.

## H. Tool patch qua CDP (khong can mo Console)

Apply theme xanh la:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222
```

Clear patch:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action clear -Port 9222
```

Dung file CSS khac:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\zalo-cdp-patch.ps1 -Action apply -Port 9222 -CssPath .\themes\my-theme.css
```

## I. Troubleshooting

- Khong thay target trong `chrome://inspect`: kiem tra lai `http://127.0.0.1:9222/json/version`.
- Khong doc duoc `cssRules`: stylesheet cross-origin, bo qua va dung computed style.
- Style khong an: tang specificity hoac them `!important`.
- Update Zalo lam vo selector: uu tien selector theo `data-*`, `aria-*`, `role` thay vi class hash.
- Mo nhieu target cung luc: them `-TargetMatch Zalo` cho script CDP.
