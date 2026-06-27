import {
  state, api, toast, navigate,
  escHtml, escAttr, renderError, setPanelLoading, registerPageHandler, formatJson, insertSample,
} from './core.js';
import { icon } from './icons.js';
import { openLogsForGroup } from './logs.js';

export async function loadFunctions({ silent = false, force = false } = {}) {
  if (state.loading.functions) return;
  const wrap = document.getElementById('functionsTableWrap');
  const hasData = state.loaded.functions && state.functions.length > 0;

  if (!silent && wrap) {
    if (!hasData || force) wrap.innerHTML = '<div class="loader"></div>';
    else setPanelLoading('functionsTableWrap', true);
  }

  state.loading.functions = true;
  try {
    const { functions } = await api('GET', '/lambda/functions');
    state.functions = functions;
    state.loaded.functions = true;
    const badge = document.getElementById('lambdaBadge');
    if (badge) badge.textContent = functions.length;
    renderFunctions(functions);
    populateInvokeSelect(functions);
  } catch (e) {
    if (!silent && wrap && !hasData) wrap.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
  } finally {
    state.loading.functions = false;
    setPanelLoading('functionsTableWrap', false);
  }
}

function populateInvokeSelect(functions = state.functions) {
  const sel = document.getElementById('lambdaInvokeSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">— select function —</option>' +
    functions.map((f) => `<option value="${escAttr(f.name)}">${escHtml(f.name)}</option>`).join('');
}

function renderFunctions(functions) {
  const wrap = document.getElementById('functionsTableWrap');
  if (!wrap) return;

  if (!functions.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('zap', 'icon icon-xl')}</div>
        <div class="empty-title">No functions</div>
        <div class="empty-sub">Deploy Lambda functions to LocalStack to see them here</div>
      </div>`;
    return;
  }

  const rows = functions.map((f) => `<tr>
    <td><div class="font-medium">${escHtml(f.name)}</div><div class="text-muted-xs">${escHtml(f.runtime ?? '—')} · ${escHtml(f.handler ?? '—')}</div></td>
    <td>${f.memorySize ? `${f.memorySize} MB` : '—'}</td>
    <td>${f.timeout ?? '—'}s</td>
    <td><span class="badge badge-muted">${escHtml(f.state ?? 'Active')}</span></td>
    <td class="td-actions">
      <div class="action-row">
        <button class="btn btn-secondary btn-sm" data-action="invoke-function" data-name="${escAttr(f.name)}">${icon('play', 'icon icon-sm')} Invoke</button>
        <button class="btn btn-secondary btn-sm" data-action="view-lambda-logs" data-name="${escAttr(f.name)}">${icon('terminal', 'icon icon-sm')} Logs</button>
      </div>
    </td>
  </tr>`).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Function</th><th>Memory</th><th>Timeout</th><th>State</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function openInvokePage(name) {
  state.currentFunction = name;
  navigate('lambda-invoke', document.querySelector('[data-page="lambda-invoke"]'));
  populateInvokeSelect();
  document.getElementById('lambdaInvokeSelect').value = name;
  document.getElementById('lambdaInvokePayload').value = '{}';
  document.getElementById('lambdaInvokeResultCard')?.classList.add('hidden');
}

async function invokeFunction() {
  const name = document.getElementById('lambdaInvokeSelect')?.value || state.currentFunction;
  if (!name) return toast('Select a function', 'error');
  state.currentFunction = name;
  let payload;
  const raw = document.getElementById('lambdaInvokePayload').value.trim();
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return toast('Invalid JSON payload', 'error');
  }

  try {
    const res = await api('POST', `/lambda/functions/${encodeURIComponent(name)}/invoke`, { payload });
    const card = document.getElementById('lambdaInvokeResultCard');
    const resultEl = document.getElementById('lambdaInvokeResult');
    card?.classList.remove('hidden');
    let text = JSON.stringify(res.payload, null, 2);
    if (res.functionError) text = `Error: ${res.functionError}\n\n${text}`;
    if (res.logResult) text += `\n\n--- Log tail ---\n${atob(res.logResult)}`;
    resultEl.textContent = text;
    toast(`Invoked (HTTP ${res.statusCode ?? '—'})`, res.functionError ? 'error' : 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function viewFunctionLogs(name) {
  const fn = name || state.currentFunction || document.getElementById('lambdaInvokeSelect')?.value;
  if (!fn) return toast('Select a function', 'error');
  openLogsForGroup(`/aws/lambda/${fn}`);
}

export function handleLambdaAction(action, el) {
  switch (action) {
    case 'invoke-function':
      openInvokePage(el.dataset.name);
      break;
    case 'invoke-lambda':
      invokeFunction();
      break;
    case 'view-lambda-logs':
    case 'view-logs':
      viewFunctionLogs(el.dataset.name);
      break;
    case 'format-json':
      formatJson(el.dataset.target);
      break;
    case 'insert-sample':
      insertSample(el.dataset.target || 'lambdaInvokePayload');
      break;
  }
}

export function initLambdaListeners() {
  registerPageHandler('lambda-functions', () => {
    if (state.loaded.functions) renderFunctions(state.functions);
    else loadFunctions();
  });
  registerPageHandler('lambda-invoke', () => {
    if (!state.loaded.functions) loadFunctions({ silent: true });
    else populateInvokeSelect();
    if (state.currentFunction) {
      document.getElementById('lambdaInvokeSelect').value = state.currentFunction;
    }
  });
}
