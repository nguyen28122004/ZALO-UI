  function renderListPanel(folder, total, pages, rowsHtml) {
    return `
      <div class="mail-card">
        <div class="mail-head"><div><div class="mail-brand">${esc(folder.label || folder.name || 'Folder')}</div><div class="mail-muted">${esc(folder.name || state.currentFolder)} | ${total} mails</div></div>
          <div class="mail-tools">
            <button class="mail-btn ghost" data-act="first" ${state.busy || state.page <= 1 ? 'disabled' : ''}>First</button>
            <button class="mail-btn ghost" data-act="prev" ${state.busy || state.page <= 1 ? 'disabled' : ''}>Prev</button>
            <button class="mail-btn ghost" data-act="next" ${state.busy || state.page >= pages ? 'disabled' : ''}>Next</button>
            <button class="mail-btn ghost" data-act="last" ${state.busy || state.page >= pages ? 'disabled' : ''}>Last</button>
          </div>
        </div>
        <div class="mail-body"><input class="mail-search" data-role="search" type="search" placeholder="Filter by from / to / subject" value="${esc(state.query)}"><div class="mail-list">${rowsHtml}</div></div>
        <div class="mail-pager"><span>Page ${state.page}/${pages}</span><span>${esc(dateText(new Date().toISOString()))}</span></div>
      </div>`;
  }
