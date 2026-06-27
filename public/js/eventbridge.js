import {
  state, api, toast, confirmAction,
  escHtml, escAttr, renderError, setPanelLoading, registerPageHandler, formatJson, insertSample,
} from './core.js';
import { icon } from './icons.js';

export async function loadRules({ silent = false, force = false } = {}) {
  if (state.loading.rules) return;
  const wrap = document.getElementById('rulesTableWrap');
  const hasData = state.loaded.rules && state.rules.length > 0;

  if (!silent && wrap) {
    if (!hasData || force) wrap.innerHTML = '<div class="loader"></div>';
    else setPanelLoading('rulesTableWrap', true);
  }

  state.loading.rules = true;
  try {
    const { rules } = await api('GET', '/eventbridge/rules');
    state.rules = rules;
    state.loaded.rules = true;
    const badge = document.getElementById('eventbridgeBadge');
    if (badge) badge.textContent = rules.length;
    renderRules(rules);
  } catch (e) {
    if (!silent && wrap && !hasData) wrap.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
  } finally {
    state.loading.rules = false;
    setPanelLoading('rulesTableWrap', false);
  }
}

function renderRules(rules) {
  const wrap = document.getElementById('rulesTableWrap');
  if (!wrap) return;

  if (!rules.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('activity', 'icon icon-xl')}</div>
        <div class="empty-title">No rules</div>
        <div class="empty-sub">Create rules via AWS CLI or LocalStack to see them here</div>
      </div>`;
    return;
  }

  const rows = rules.map((r) => `<tr>
    <td><div class="font-medium">${escHtml(r.Name ?? '—')}</div><div class="monospace text-muted-xs">${escHtml(r.Arn ?? '')}</div></td>
    <td><span class="badge ${r.State === 'ENABLED' ? 'badge-primary' : 'badge-muted'}">${escHtml(r.State ?? '—')}</span></td>
    <td class="text-muted-sm truncate" title="${escAttr(r.EventPattern ?? '')}">${escHtml((r.EventPattern ?? '').slice(0, 60))}${(r.EventPattern?.length ?? 0) > 60 ? '…' : ''}</td>
    <td class="td-actions">
      <button class="btn btn-danger btn-sm btn-icon" data-action="delete-rule" data-name="${escAttr(r.Name)}" title="Delete">${icon('close', 'icon icon-sm')}</button>
    </td>
  </tr>`).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Rule</th><th>State</th><th>Pattern</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function deleteRule(name) {
  const ok = await confirmAction({
    title: 'Delete Rule',
    message: `Delete rule "${name}"?`,
    confirmText: 'Delete',
  });
  if (!ok) return;
  try {
    await api('DELETE', `/eventbridge/rules/${encodeURIComponent(name)}`);
    toast('Rule deleted', 'success');
    loadRules({ force: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function sendEvent(fromModal = false) {
  const source = document.getElementById(fromModal ? 'eventSource' : 'sendEventSource')?.value.trim();
  const detailType = document.getElementById(fromModal ? 'eventDetailType' : 'sendEventDetailType')?.value.trim();
  const detailRaw = document.getElementById(fromModal ? 'eventDetailJson' : 'sendEventDetail')?.value.trim();
  if (!source || !detailType) return toast('Source and detail type required', 'error');
  let detail;
  try {
    detail = detailRaw ? JSON.parse(detailRaw) : {};
  } catch {
    return toast('Invalid JSON detail', 'error');
  }
  try {
    const res = await api('POST', '/eventbridge/events', {
      entries: [{ source, detailType, detail }],
    });
    toast(
      res.failedEntryCount ? `${res.failedEntryCount} entries failed` : 'Event sent',
      res.failedEntryCount ? 'error' : 'success'
    );
  } catch (e) {
    toast(e.message, 'error');
  }
}

export function handleEventbridgeAction(action, el) {
  switch (action) {
    case 'delete-rule':
      deleteRule(el.dataset.name);
      break;
    case 'send-event':
      sendEvent(false);
      break;
    case 'send-event-modal':
      sendEvent(true);
      break;
    case 'format-json':
      formatJson(el.dataset.target);
      break;
    case 'insert-sample':
      insertSample(el.dataset.target || 'sendEventDetail');
      break;
  }
}

export function initEventbridgeListeners() {
  registerPageHandler('eventbridge-rules', () => {
    if (state.loaded.rules) renderRules(state.rules);
    else loadRules();
  });
  registerPageHandler('eventbridge-send', () => {});
}
