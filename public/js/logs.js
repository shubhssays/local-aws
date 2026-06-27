import {
  state, api, toast, navigate,
  escHtml, escAttr, renderError, setPanelLoading, registerPageHandler,
} from './core.js';
import { icon } from './icons.js';

export async function loadLogGroups({ silent = false, force = false } = {}) {
  if (state.loading.logGroups) return;
  const wrap = document.getElementById('logGroupsTableWrap');
  const hasData = state.loaded.logGroups && state.logGroups.length > 0;

  if (!silent && wrap) {
    if (!hasData || force) wrap.innerHTML = '<div class="loader"></div>';
    else setPanelLoading('logGroupsTableWrap', true);
  }

  state.loading.logGroups = true;
  try {
    const { groups } = await api('GET', '/logs/groups');
    state.logGroups = groups;
    state.loaded.logGroups = true;
    const badge = document.getElementById('logsBadge');
    if (badge) badge.textContent = groups.length;
    renderLogGroups(groups);
    populateLogGroupSelect(groups);
  } catch (e) {
    if (!silent && wrap && !hasData) wrap.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
  } finally {
    state.loading.logGroups = false;
    setPanelLoading('logGroupsTableWrap', false);
  }
}

function populateLogGroupSelect(groups = state.logGroups) {
  const sel = document.getElementById('logGroupSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">— select log group —</option>' +
    groups.map((g) => `<option value="${escAttr(g.name)}">${escHtml(g.name)}</option>`).join('');
  if (state.currentLogGroup) sel.value = state.currentLogGroup;
}

function renderLogGroups(groups) {
  const wrap = document.getElementById('logGroupsTableWrap');
  if (!wrap) return;

  if (!groups.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('terminal', 'icon icon-xl')}</div>
        <div class="empty-title">No log groups</div>
        <div class="empty-sub">Log groups appear when Lambda or other services write logs</div>
      </div>`;
    return;
  }

  const rows = groups.map((g) => `<tr>
    <td><div class="font-medium monospace">${escHtml(g.name)}</div></td>
    <td>${g.retentionInDays ? `${g.retentionInDays} days` : 'Never expire'}</td>
    <td class="text-muted-sm">${g.creationTime ? new Date(g.creationTime).toLocaleString() : '—'}</td>
    <td class="td-actions">
      <button class="btn btn-secondary btn-sm" data-action="open-log-group" data-group="${escAttr(g.name)}">${icon('eye', 'icon icon-sm')} View</button>
    </td>
  </tr>`).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Log Group</th><th>Retention</th><th>Created</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function openLogsForGroup(groupName) {
  state.currentLogGroup = groupName;
  state.currentStream = null;
  navigate('logs-viewer', document.querySelector('[data-page="logs-viewer"]'));
  populateLogGroupSelect();
  document.getElementById('logGroupSelect').value = groupName;
  loadLogStreams().then(() => loadLogEvents());
}

async function loadLogStreams() {
  if (!state.currentLogGroup) return;
  const sel = document.getElementById('logStreamSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">All streams</option>';
  try {
    const { streams } = await api('GET', `/logs/streams?groupName=${encodeURIComponent(state.currentLogGroup)}`);
    state.logStreams = streams;
    sel.innerHTML = '<option value="">All streams</option>' +
      streams.map((s) => `<option value="${escAttr(s.name)}">${escHtml(s.name)}</option>`).join('');
  } catch (e) {
    toast(e.message, 'error');
  }
}

export async function loadLogEvents() {
  const groupName = state.currentLogGroup || document.getElementById('logGroupSelect')?.value;
  if (!groupName) return;
  state.currentLogGroup = groupName;

  const wrap = document.getElementById('logViewerContent');
  if (!wrap) return;
  wrap.innerHTML = '<div class="loader"></div>';

  const streamName = document.getElementById('logStreamSelect')?.value || undefined;
  const filterPattern = document.getElementById('logFilterPattern')?.value.trim() || undefined;
  state.currentStream = streamName || null;

  try {
    let url = `/logs/events?groupName=${encodeURIComponent(groupName)}&limit=100`;
    if (streamName) url += `&streamName=${encodeURIComponent(streamName)}`;
    if (filterPattern) url += `&filterPattern=${encodeURIComponent(filterPattern)}`;
    const { events } = await api('GET', url);
    renderLogEvents(events ?? []);
  } catch (e) {
    wrap.innerHTML = renderError(e.message);
  }
}

function renderLogEvents(events) {
  const wrap = document.getElementById('logViewerContent');
  if (!wrap) return;

  if (!events.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('terminal', 'icon icon-xl')}</div>
        <div class="empty-title">No log events</div>
      </div>`;
    return;
  }

  const rows = events.map((ev) => {
    const ts = ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '—';
    return `<tr>
      <td class="text-muted-sm" style="white-space:nowrap">${escHtml(ts)}</td>
      <td class="monospace text-muted-xs">${escHtml(ev.logStreamName ?? '—')}</td>
      <td><pre class="code-block code-inline">${escHtml(ev.message ?? '')}</pre></td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Time</th><th>Stream</th><th>Message</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function toggleLogAutoRefresh(enabled) {
  state.logAutoRefresh = enabled;
  if (state.logRefreshTimer) {
    clearInterval(state.logRefreshTimer);
    state.logRefreshTimer = null;
  }
  if (enabled) {
    state.logRefreshTimer = setInterval(() => loadLogEvents(), 2000);
  }
}

export function handleLogsAction(action, el) {
  switch (action) {
    case 'open-log-group':
      openLogsForGroup(el.dataset.group);
      break;
    case 'refresh-logs':
    case 'refresh-log-events':
      loadLogEvents();
      break;
    case 'toggle-log-auto-refresh':
      toggleLogAutoRefresh(el.checked);
      break;
  }
}

export function initLogsListeners() {
  document.getElementById('logGroupSelect')?.addEventListener('change', (e) => {
    state.currentLogGroup = e.target.value;
    loadLogStreams().then(() => loadLogEvents());
  });
  document.getElementById('logStreamSelect')?.addEventListener('change', loadLogEvents);
  document.getElementById('logFilterPattern')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadLogEvents();
  });
  document.getElementById('logAutoRefresh')?.addEventListener('change', (e) => {
    toggleLogAutoRefresh(e.target.checked);
  });

  registerPageHandler('logs-groups', () => {
    if (state.loaded.logGroups) renderLogGroups(state.logGroups);
    else loadLogGroups();
  });
  registerPageHandler('logs-viewer', () => {
    if (!state.loaded.logGroups) loadLogGroups({ silent: true });
    else populateLogGroupSelect();
    if (state.currentLogGroup) loadLogStreams().then(() => loadLogEvents());
  });
}
