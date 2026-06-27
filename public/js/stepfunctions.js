import {
  state, api, toast, navigate, openModal, closeModal,
  escHtml, escAttr, renderError, setPanelLoading, registerPageHandler, formatJson, insertSample,
} from './core.js';
import { icon } from './icons.js';

function encodeArn(arn) {
  return encodeURIComponent(arn);
}

export async function loadMachines({ silent = false, force = false } = {}) {
  if (state.loading.machines) return;
  const wrap = document.getElementById('machinesTableWrap');
  const hasData = state.loaded.machines && state.machines.length > 0;

  if (!silent && wrap) {
    if (!hasData || force) wrap.innerHTML = '<div class="loader"></div>';
    else setPanelLoading('machinesTableWrap', true);
  }

  state.loading.machines = true;
  try {
    const { stateMachines } = await api('GET', '/stepfunctions/machines');
    state.machines = stateMachines;
    state.loaded.machines = true;
    const badge = document.getElementById('sfnBadge');
    if (badge) badge.textContent = stateMachines.length;
    renderMachines(stateMachines);
    populateMachineSelects(stateMachines);
  } catch (e) {
    if (!silent && wrap && !hasData) wrap.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
  } finally {
    state.loading.machines = false;
    setPanelLoading('machinesTableWrap', false);
  }
}

function populateMachineSelects(machines = state.machines) {
  for (const id of ['sfnMachineSelect', 'sfnStartMachineSelect']) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    sel.innerHTML = '<option value="">— select state machine —</option>' +
      machines.map((m) => `<option value="${escAttr(m.stateMachineArn)}" data-name="${escAttr(m.name)}">${escHtml(m.name)}</option>`).join('');
  }
}

function renderMachines(machines) {
  const wrap = document.getElementById('machinesTableWrap');
  if (!wrap) return;

  if (!machines.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('gitBranch', 'icon icon-xl')}</div>
        <div class="empty-title">No state machines</div>
        <div class="empty-sub">Create state machines in LocalStack to manage them here</div>
      </div>`;
    return;
  }

  const rows = machines.map((m) => `<tr>
    <td><div class="font-medium">${escHtml(m.name ?? '—')}</div><div class="monospace text-muted-xs">${escHtml(m.stateMachineArn ?? '')}</div></td>
    <td class="text-muted-sm">${m.creationDate ? new Date(m.creationDate).toLocaleString() : '—'}</td>
    <td class="td-actions">
      <div class="action-row">
        <button class="btn btn-secondary btn-sm" data-action="start-execution" data-arn="${escAttr(m.stateMachineArn)}" data-name="${escAttr(m.name)}">${icon('play', 'icon icon-sm')} Start</button>
        <button class="btn btn-secondary btn-sm" data-action="view-executions" data-arn="${escAttr(m.stateMachineArn)}" data-name="${escAttr(m.name)}">${icon('activity', 'icon icon-sm')} Executions</button>
      </div>
    </td>
  </tr>`).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>State Machine</th><th>Created</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function openStartExecution(arn, name) {
  state.currentMachine = { arn, name };
  populateMachineSelects();
  document.getElementById('sfnStartMachineSelect').value = arn;
  document.getElementById('sfnStartInput').value = '{}';
  openModal('modal-sfn-start');
}

async function startExecution() {
  const sel = document.getElementById('sfnStartMachineSelect');
  const arn = sel?.value;
  const name = sel?.selectedOptions?.[0]?.dataset?.name ?? state.currentMachine?.name;
  if (!arn) return toast('Select a state machine', 'error');
  const input = document.getElementById('sfnStartInput').value.trim() || '{}';
  try {
    JSON.parse(input);
  } catch {
    return toast('Invalid JSON input', 'error');
  }
  try {
    const res = await api('POST', `/stepfunctions/machines/${encodeArn(arn)}/executions`, { input });
    closeModal('modal-sfn-start');
    toast('Execution started', 'success');
    state.currentMachine = { arn, name };
    navigate('sfn-executions', document.querySelector('[data-page="sfn-executions"]'));
    viewExecutions(arn, name);
    if (res.executionArn) viewExecutionHistory(res.executionArn);
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function viewExecutions(arn, name) {
  state.currentMachine = { arn, name };
  navigate('sfn-executions', document.querySelector('[data-page="sfn-executions"]'));
  populateMachineSelects();
  document.getElementById('sfnMachineSelect').value = arn;
  const wrap = document.getElementById('executionsTableWrap');
  wrap.innerHTML = '<div class="loader"></div>';

  try {
    const { executions } = await api('GET', `/stepfunctions/machines/${encodeArn(arn)}/executions`);
    state.executions = executions;
    renderExecutions(executions);
  } catch (e) {
    wrap.innerHTML = renderError(e.message);
  }
}

function renderExecutions(executions) {
  const wrap = document.getElementById('executionsTableWrap');
  if (!executions.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">No executions</div>
      </div>`;
    return;
  }

  const rows = executions.map((ex) => `<tr>
    <td class="monospace text-muted-sm">${escHtml(ex.name ?? ex.executionArn?.split(':').pop() ?? '—')}</td>
    <td><span class="badge badge-muted">${escHtml(ex.status ?? '—')}</span></td>
    <td class="text-muted-sm">${ex.startDate ? new Date(ex.startDate).toLocaleString() : '—'}</td>
    <td class="td-actions">
      <button class="btn btn-secondary btn-sm" data-action="view-execution-history" data-arn="${escAttr(ex.executionArn)}">${icon('eye', 'icon icon-sm')} History</button>
    </td>
  </tr>`).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Status</th><th>Started</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function viewExecutionHistory(executionArn) {
  document.getElementById('sfnHistoryCard')?.classList.remove('hidden');
  const wrap = document.getElementById('executionHistoryWrap');
  wrap.innerHTML = '<div class="loader"></div>';

  try {
    const data = await api('GET', `/stepfunctions/executions/${encodeArn(executionArn)}`);
    const events = data.events ?? [];
    if (!events.length) {
      wrap.innerHTML = `<div class="empty-state"><div class="empty-title">No history events</div></div>`;
      return;
    }
    const rows = events.map((ev) => `<tr>
      <td>${ev.id ?? '—'}</td>
      <td>${escHtml(ev.type ?? '—')}</td>
      <td class="text-muted-sm">${ev.timestamp ? new Date(ev.timestamp).toLocaleString() : '—'}</td>
    </tr>`).join('');
    wrap.innerHTML = `
      <div class="msg-meta" style="margin-bottom:12px">Status: ${escHtml(data.status ?? '—')}</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Id</th><th>Type</th><th>Time</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  } catch (e) {
    wrap.innerHTML = renderError(e.message);
  }
}

export function handleStepfunctionsAction(action, el) {
  switch (action) {
    case 'start-execution':
      openStartExecution(el.dataset.arn, el.dataset.name);
      break;
    case 'start-sfn-execution':
      startExecution();
      break;
    case 'view-executions':
      viewExecutions(el.dataset.arn, el.dataset.name);
      break;
    case 'view-execution-history':
      viewExecutionHistory(el.dataset.arn);
      break;
    case 'format-json':
      formatJson(el.dataset.target);
      break;
    case 'insert-sample':
      insertSample(el.dataset.target || 'sfnStartInput');
      break;
  }
}

export function initStepfunctionsListeners() {
  document.getElementById('sfnMachineSelect')?.addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    if (opt?.value) viewExecutions(opt.value, opt.dataset.name);
  });

  registerPageHandler('sfn-machines', () => {
    if (state.loaded.machines) renderMachines(state.machines);
    else loadMachines();
  });
  registerPageHandler('sfn-executions', () => {
    if (state.currentMachine?.arn) viewExecutions(state.currentMachine.arn, state.currentMachine.name);
  });
}
