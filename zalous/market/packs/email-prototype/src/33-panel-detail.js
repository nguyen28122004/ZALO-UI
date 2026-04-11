  function sanitizeMailHtml(raw) {
    const source = String(raw || '').trim();
    if (!source) return '';
    try {
      const doc = document.implementation.createHTMLDocument('zmail');
      doc.body.innerHTML = source;
      doc.querySelectorAll('script,style,link,meta,iframe,object,embed,form,button,input,textarea,select').forEach((el) => el.remove());
      doc.querySelectorAll('*').forEach((el) => {
        Array.from(el.attributes || []).forEach((attr) => {
          const name = String(attr.name || '').toLowerCase();
          const value = String(attr.value || '').trim();
          const scriptRef = /^(?:javascript:|data:text\/html)/i.test(value);
          if (name.startsWith('on') || name === 'srcdoc' || name === 'formaction' || ((name === 'src' || name === 'href' || name === 'xlink:href') && scriptRef)) {
            el.removeAttribute(attr.name);
          }
        });
      });
      return String(doc.body.innerHTML || '').trim();
    } catch (_) {
      return '';
    }
  }

  function renderAttachments(detail) {
    const files = Array.isArray(detail && detail.attachments) ? detail.attachments : [];
    if (!files.length) return '<div class="mail-attach-empty">No attachment</div>';
    return `<div class="mail-attach-list">${
      files.map((f) => {
        const name = esc((f && f.name) || 'attachment');
        const size = Number(f && f.size);
        const type = esc((f && f.type) || '');
        const meta = [
          Number.isFinite(size) && size > 0 ? bytesText(size) : '',
          type
        ].filter(Boolean).join(' | ');
        return `<div class="mail-attach-item"><strong>${name}</strong>${meta ? `<span>${meta}</span>` : ''}</div>`;
      }).join('')
    }</div>`;
  }

  function renderDetailPanel(chip, showSettings) {
    const detail = state.selectedMessage;
    const currentStar = detail ? isStarred(state.currentFolder, detail.uid) : false;

    if (showSettings) {
      return `
        <div class="mail-card">
          <div class="mail-head"><div><div class="mail-brand">Mail Settings</div><div class="mail-muted">Saved to local extension config only.</div></div><span class="mail-chip">Local config</span></div>
          <div class="mail-body"><div class="mail-form">
            <label>IMAP Host<input data-cfg="imapHost" type="text" value="${esc(cfg().imapHost)}"></label>
            <label>IMAP Port<input data-cfg="imapPort" type="number" value="${esc(cfg().imapPort)}"></label>
            <label>SMTP Host<input data-cfg="smtpHost" type="text" value="${esc(cfg().smtpHost)}"></label>
            <label>SMTP Port<input data-cfg="smtpPort" type="number" value="${esc(cfg().smtpPort)}"></label>
            <label class="full">Username<input data-cfg="username" type="text" value="${esc(cfg().username)}"></label>
            <label class="full">Password<input data-cfg="password" id="zalous-email-config-pass" class="zalous-email-config-pass" data-zalous-skip-pin="1" type="password" value="${esc(cfg().password)}"></label>
            <label>Emails per page<input data-cfg="pageSize" type="number" value="${esc(cfg().pageSize)}"></label>
            <label>Body preview bytes<input data-cfg="previewBytes" type="number" value="${esc(cfg().previewBytes)}"></label>
            <label class="mail-check"><input data-cfg-check="imapSsl" type="checkbox" ${cfg().imapSsl ? 'checked' : ''}> IMAP SSL</label>
            <label class="mail-check"><input data-cfg-check="smtpSsl" type="checkbox" ${cfg().smtpSsl ? 'checked' : ''}> SMTP SSL</label>
            <label class="mail-check"><input data-cfg-check="onlyUnread" type="checkbox" ${cfg().onlyUnread ? 'checked' : ''}> Only unread by default</label>
            <label class="mail-check full"><input data-cfg-check="allowSelfSigned" type="checkbox" ${cfg().allowSelfSigned ? 'checked' : ''}> Allow self-signed certificate</label>
          </div><div class="mail-tools" style="margin-top:14px;justify-content:flex-end"><button class="mail-btn ghost" data-act="close-settings">Close</button><button class="mail-btn pri" data-act="save-settings">Save local config</button></div></div>
        </div>`;
    }

    if (!detail) {
      return '<div class="mail-card"><div class="mail-empty">Choose one email to view detail.</div></div>';
    }

    const safeHtml = sanitizeMailHtml(detail.html || '');
    const textBody = String(detail.text || detail.body || '(Empty body preview)');
    const bodyPane = safeHtml
      ? `<div class="mail-html">${safeHtml}</div>`
      : `<div class="mail-text">${esc(textBody)}</div>`;
    const attachmentCount = Array.isArray(detail.attachments) ? detail.attachments.length : 0;

    return `
      <div class="mail-card">
        <div class="mail-head"><div><div class="mail-detail-subject">${esc(detail.subject || '(No subject)')}</div><div class="mail-muted">Read-only IMAP detail view</div></div>
          <div class="mail-tools"><button class="mail-btn ghost" data-act="toggle-star">${currentStar ? 'Unstar' : 'Star'}</button><button class="mail-btn ghost" data-act="copy-message-id">Copy Message-ID</button>${chip}</div>
        </div>
        <div class="mail-body">
          <div class="mail-outlook-head">
            <div class="mail-outlook-line"><span>From</span><strong>${esc(detail.from || '--')}</strong></div>
            <div class="mail-outlook-line"><span>To</span><strong>${esc(detail.to || '--')}</strong></div>
            <div class="mail-outlook-line"><span>CC</span><strong>${esc(detail.cc || '--')}</strong></div>
            <div class="mail-outlook-line"><span>Date</span><strong>${esc(dateText(detail.date))}</strong></div>
          </div>
          <div class="mail-grid"><div>Size</div><div>${esc(bytesText(detail.size))}</div><div>Message-ID</div><div>${esc(detail.messageId || '--')}</div><div>Attachment</div><div>${attachmentCount}</div></div>
          <div class="mail-attach-wrap"><div class="mail-attach-title">Attachments</div>${renderAttachments(detail)}</div>
          <div class="mail-preview-pane">${bodyPane}</div>
        </div>
      </div>`;
  }
