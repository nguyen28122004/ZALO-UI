  function ensureStyle() {
    let tag = document.getElementById(STYLE_ID);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = [
      `#${ITEM_ID}{cursor:pointer;position:absolute;left:0;top:0;width:100%;height:${PINNED_HEIGHT}px;z-index:3;box-sizing:border-box;padding:10px 14px 10px 20px;}`,
      `#${ITEM_ID} .mail-pin{height:100%;padding:10px 14px 10px 18px;border-radius:16px;border:1px solid var(--zmail-accent-soft,rgba(37,99,235,.18));background:linear-gradient(135deg,var(--zmail-accent-soft,rgba(37,99,235,.14)),rgba(14,165,233,.08));display:flex;flex-direction:column;justify-content:center;gap:3px;}`,
      `#${ITEM_ID}[data-active="1"] .mail-pin{background:linear-gradient(135deg,var(--zmail-accent-soft,rgba(37,99,235,.24)),rgba(14,165,233,.16));border-color:var(--zmail-accent-soft,rgba(37,99,235,.34));}`,
      `#${ITEM_ID} .mail-pin-k{font-size:11px;text-transform:uppercase;letter-spacing:.08em;opacity:.7;}#${ITEM_ID} .mail-pin-t{font-size:14px;font-weight:700;}#${ITEM_ID} .mail-pin-p{font-size:12px;opacity:.78;}`,
      `.${MAIN_MARKER}{height:100%;padding:16px;box-sizing:border-box;background:linear-gradient(180deg,var(--zmail-bg-a,#f8fbff),var(--zmail-bg-b,#eef4ff));font-family:"Segoe UI",Tahoma,sans-serif;color:var(--text-primary,#0f172a);}`,
      `.${MAIN_MARKER} *{box-sizing:border-box;} .${MAIN_MARKER} .mail-app{display:grid;grid-template-columns:260px 380px 1fr;gap:14px;height:100%;}`,
      `.${MAIN_MARKER} .mail-card{background:var(--layer-background,#fff);border:1px solid rgba(148,163,184,.24);border-radius:20px;box-shadow:0 18px 36px rgba(15,23,42,.08);display:flex;flex-direction:column;min-height:0;overflow:hidden;}`,
      `.${MAIN_MARKER} .mail-head{padding:16px 18px 12px;border-bottom:1px solid rgba(148,163,184,.18);display:flex;justify-content:space-between;gap:10px;align-items:flex-start;} .${MAIN_MARKER} .mail-body{padding:14px 16px;overflow:auto;min-height:0;}`,
      `.${MAIN_MARKER} .mail-brand{font-size:20px;font-weight:700;} .${MAIN_MARKER} .mail-muted{color:var(--text-secondary,#64748b);font-size:12px;} .${MAIN_MARKER} .mail-chip{padding:6px 10px;border-radius:999px;background:var(--zmail-accent-soft,rgba(37,99,235,.13));color:var(--zmail-accent,#1d4ed8);font-size:12px;font-weight:700;}`,
      `.${MAIN_MARKER} .mail-chip.err{background:#fee2e2;color:#b91c1c;} .${MAIN_MARKER} .mail-chip.ok{background:#dcfce7;color:#047857;} .${MAIN_MARKER} .mail-tools{display:flex;gap:8px;flex-wrap:wrap;}`,
      `.${MAIN_MARKER} .mail-btn{border:none;border-radius:12px;padding:9px 12px;background:#e2e8f0;color:var(--text-primary,#0f172a);font-size:12px;font-weight:700;cursor:pointer;} .${MAIN_MARKER} .mail-btn.pri{background:var(--zmail-accent,#2563eb);color:#fff;} .${MAIN_MARKER} .mail-btn.ghost{background:#fff;border:1px solid rgba(148,163,184,.28);} .${MAIN_MARKER} .mail-btn:disabled{opacity:.55;cursor:wait;}`,
      `.${MAIN_MARKER} .mail-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px;} .${MAIN_MARKER} .mail-metric{padding:12px;border-radius:14px;background:#f8fafc;border:1px solid rgba(148,163,184,.16);} .${MAIN_MARKER} .mail-metric strong{display:block;font-size:18px;}`,
      `.${MAIN_MARKER} .mail-folder-list,.${MAIN_MARKER} .mail-list{display:flex;flex-direction:column;gap:8px;} .${MAIN_MARKER} .mail-folder,.${MAIN_MARKER} .mail-row{padding:12px 14px;border-radius:16px;background:#fff;border:1px solid rgba(148,163,184,.18);cursor:pointer;}`,
      `.${MAIN_MARKER} .mail-folder.active,.${MAIN_MARKER} .mail-row.active{background:linear-gradient(135deg,var(--zmail-accent-soft,rgba(37,99,235,.12)),rgba(14,165,233,.08));border-color:var(--zmail-accent-soft,rgba(37,99,235,.34));} .${MAIN_MARKER} .mail-folder{display:flex;justify-content:space-between;gap:8px;align-items:center;} .${MAIN_MARKER} .mail-badge{min-width:26px;height:26px;border-radius:999px;background:var(--zmail-accent-soft,rgba(37,99,235,.12));color:var(--zmail-accent,#1d4ed8);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;}`,
      `.${MAIN_MARKER} .mail-folder-path{font-size:11px;color:#94a3b8;margin-top:2px;} .${MAIN_MARKER} .mail-search{width:100%;height:38px;border:1px solid rgba(148,163,184,.3);border-radius:12px;padding:0 12px;background:#fff;margin-bottom:10px;}`,
      `.${MAIN_MARKER} .mail-row-top{display:flex;justify-content:space-between;gap:10px;} .${MAIN_MARKER} .mail-row-from{font-weight:700;} .${MAIN_MARKER} .mail-row-date,.${MAIN_MARKER} .mail-row-meta{font-size:11px;color:#64748b;}`,
      `.${MAIN_MARKER} .mail-subject{font-size:13px;font-weight:700;margin-top:4px;} .${MAIN_MARKER} .mail-preview{font-size:12px;color:#64748b;margin-top:4px;line-height:1.4;} .${MAIN_MARKER} .mail-pager{padding:12px 16px;border-top:1px solid rgba(148,163,184,.18);display:flex;justify-content:space-between;gap:10px;font-size:12px;color:#475569;}`,
      `.${MAIN_MARKER} .mail-detail-subject{font-size:24px;font-weight:700;line-height:1.2;margin-bottom:12px;} .${MAIN_MARKER} .mail-grid{display:grid;grid-template-columns:110px 1fr;gap:8px 12px;font-size:12px;margin-bottom:16px;} .${MAIN_MARKER} .mail-grid div:nth-child(odd){color:#64748b;}`,
      `.${MAIN_MARKER} .mail-text{white-space:pre-wrap;line-height:1.6;font-size:13px;color:#1e293b;padding:18px;border-radius:16px;background:#fff;border:1px solid rgba(148,163,184,.16);} .${MAIN_MARKER} .mail-empty{padding:32px 18px;color:#64748b;text-align:center;}`,
      `.${MAIN_MARKER} .mail-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;} .${MAIN_MARKER} .mail-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;color:#334155;} .${MAIN_MARKER} .mail-form input{height:38px;border:1px solid rgba(148,163,184,.3);border-radius:12px;padding:0 12px;background:#fff;} .${MAIN_MARKER} .mail-form .full{grid-column:1/-1;} .${MAIN_MARKER} .mail-check{display:flex;align-items:center;gap:8px;font-size:12px;color:#334155;}`,
      `@media (max-width:1280px){.${MAIN_MARKER} .mail-app{grid-template-columns:240px 1fr;} .${MAIN_MARKER} .mail-card:nth-child(3){grid-column:1/-1;}}`,
      `@media (max-width:980px){.${MAIN_MARKER} .mail-app{grid-template-columns:1fr;}}`
    ].join('');
  }
