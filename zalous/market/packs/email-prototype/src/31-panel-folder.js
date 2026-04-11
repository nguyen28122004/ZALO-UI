  function renderFolderPanel(chip, foldersHtml) {
    return `
      <div class="mail-card">
        <div class="mail-head"><div><div class="mail-brand">Mail Workspace</div><div class="mail-muted">Folders, pagination, read view. Reply/send is disabled.</div></div>${chip}</div>
        <div class="mail-body">
          <div class="mail-tools">
            <button class="mail-btn pri" data-act="refresh-all" ${state.busy ? 'disabled' : ''}>Refresh mailbox</button>
            <button class="mail-btn ghost" data-act="reconnect" ${state.busy ? 'disabled' : ''}>Reconnect</button>
            <button class="mail-btn ghost" data-act="toggle-unread">${state.onlyUnread ? 'Showing unread' : 'Showing all'}</button>
            <button class="mail-btn ghost" data-act="open-settings">Config</button>
          </div>
          <div class="mail-muted" style="margin-top:10px">${esc(state.notice || (state.busy ? 'Syncing mailbox...' : ''))}</div>
          <div class="mail-metrics">
            <div class="mail-metric"><strong>${state.folders.length}</strong><span class="mail-muted">Folders</span></div>
            <div class="mail-metric"><strong>${state.folders.reduce((s, x) => s + (Number(x.messages) || 0), 0)}</strong><span class="mail-muted">Total mails</span></div>
            <div class="mail-metric"><strong>${state.folders.filter((x) => Number(x.unseen) > 0).length}</strong><span class="mail-muted">Folders unread</span></div>
            <div class="mail-metric"><strong>${state.pageSize}</strong><span class="mail-muted">Page size</span></div>
          </div>
          <div class="mail-folder-list" style="margin-top:16px">${foldersHtml}</div>
        </div>
      </div>`;
  }
