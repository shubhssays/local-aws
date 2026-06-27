import {
  state, api, toast, confirmAction, openModal, closeModal,
  escHtml, escAttr, renderError, setPanelLoading, registerPageHandler, copyToClipboard,
} from './core.js';
import { icon } from './icons.js';

export async function loadSecrets({ silent = false, force = false } = {}) {
  if (state.loading.secrets) return;
  const wrap = document.getElementById('secretsList');
  const hasData = state.loaded.secrets && state.secrets.length > 0;

  if (!silent && wrap) {
    if (!hasData || force) wrap.innerHTML = '<div class="loader"></div>';
    else setPanelLoading('secretsList', true);
  }

  state.loading.secrets = true;
  try {
    const { secrets } = await api('GET', '/secrets/manager');
    state.secrets = secrets;
    state.loaded.secrets = true;
    const badge = document.getElementById('secretsBadge');
    if (badge) badge.textContent = secrets.length;
    renderSecretsList(secrets);
  } catch (e) {
    if (!silent && wrap && !hasData) wrap.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
  } finally {
    state.loading.secrets = false;
    setPanelLoading('secretsList', false);
  }
}

export async function loadParameters({ silent = false, force = false } = {}) {
  if (state.loading.parameters) return;
  const wrap = document.getElementById('parametersList');
  const hasData = state.loaded.parameters && state.parameters.length > 0;

  if (!silent && wrap) {
    if (!hasData || force) wrap.innerHTML = '<div class="loader"></div>';
    else setPanelLoading('parametersList', true);
  }

  state.loading.parameters = true;
  try {
    const { parameters } = await api('GET', '/secrets/parameters');
    state.parameters = parameters;
    state.loaded.parameters = true;
    const badge = document.getElementById('parametersBadge');
    if (badge) badge.textContent = parameters.length;
    renderParametersList(parameters);
  } catch (e) {
    if (!silent && wrap && !hasData) wrap.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
  } finally {
    state.loading.parameters = false;
    setPanelLoading('parametersList', false);
  }
}

function renderSecretsList(secrets) {
  const wrap = document.getElementById('secretsList');
  if (!wrap) return;

  if (!secrets.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('lock', 'icon icon-xl')}</div>
        <div class="empty-title">No secrets</div>
        <button class="btn btn-primary" data-action="open-modal" data-modal="modal-create-secret">${icon('plus', 'icon icon-sm')} Create Secret</button>
      </div>`;
    return;
  }

  const rows = secrets.map((s) => `<tr>
    <td><div class="font-medium">${escHtml(s.name)}</div><div class="text-muted-xs">${escHtml(s.description ?? '')}</div></td>
    <td class="text-muted-sm">${s.lastChangedDate ? new Date(s.lastChangedDate).toLocaleString() : '—'}</td>
    <td class="td-actions">
      <div class="action-row">
        <button class="btn btn-secondary btn-sm" data-action="view-secret" data-name="${escAttr(s.name)}">${icon('eye', 'icon icon-sm')} View</button>
        <button class="btn btn-danger btn-sm btn-icon" data-action="delete-secret" data-name="${escAttr(s.name)}" title="Delete">${icon('close', 'icon icon-sm')}</button>
      </div>
    </td>
  </tr>`).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Last Changed</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderParametersList(params) {
  const wrap = document.getElementById('parametersList');
  if (!wrap) return;

  if (!params.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('key', 'icon icon-xl')}</div>
        <div class="empty-title">No parameters</div>
        <button class="btn btn-primary" data-action="open-modal" data-modal="modal-create-parameter">${icon('plus', 'icon icon-sm')} Create Parameter</button>
      </div>`;
    return;
  }

  const rows = params.map((p) => `<tr>
    <td><div class="font-medium">${escHtml(p.name)}</div><div class="text-muted-xs">${escHtml(p.description ?? '')}</div></td>
    <td><span class="badge badge-muted">${escHtml(p.type ?? 'String')}</span></td>
    <td class="text-muted-sm">${p.lastModifiedDate ? new Date(p.lastModifiedDate).toLocaleString() : '—'}</td>
    <td class="td-actions">
      <div class="action-row">
        <button class="btn btn-secondary btn-sm" data-action="view-parameter" data-name="${escAttr(p.name)}">${icon('eye', 'icon icon-sm')} View</button>
        <button class="btn btn-danger btn-sm btn-icon" data-action="delete-parameter" data-name="${escAttr(p.name)}" title="Delete">${icon('close', 'icon icon-sm')}</button>
      </div>
    </td>
  </tr>`).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Modified</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function createSecret() {
  const name = document.getElementById('newSecretName').value.trim();
  const secretString = document.getElementById('newSecretValue').value;
  if (!name) return toast('Secret name is required', 'error');
  try {
    await api('POST', '/secrets/manager', { name, secretString });
    closeModal('modal-create-secret');
    toast(`Secret "${name}" created`, 'success');
    loadSecrets({ force: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function viewSecret(name) {
  try {
    const data = await api('GET', `/secrets/manager/${encodeURIComponent(name)}`);
    document.getElementById('secretViewTitle').textContent = name;
    const el = document.getElementById('secretViewValue');
    el.textContent = '••••••••••••';
    el.dataset.revealed = '0';
    el.dataset.value = data.secretString ?? '';
    openModal('modal-view-secret');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function toggleReveal(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (el.dataset.revealed === '1') {
    el.textContent = '••••••••••••';
    el.dataset.revealed = '0';
  } else {
    el.textContent = el.dataset.value ?? '';
    el.dataset.revealed = '1';
  }
}

async function deleteSecret(name) {
  const ok = await confirmAction({
    title: 'Delete Secret',
    message: `Delete secret "${name}"?`,
    confirmText: 'Delete',
  });
  if (!ok) return;
  try {
    await api('DELETE', `/secrets/manager/${encodeURIComponent(name)}`);
    toast('Secret deleted', 'success');
    loadSecrets({ force: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function createParameter() {
  const name = document.getElementById('newParameterName').value.trim();
  const value = document.getElementById('newParameterValue').value;
  const type = document.getElementById('newParameterType').value;
  if (!name) return toast('Parameter name is required', 'error');
  try {
    await api('POST', '/secrets/parameters', { name, value, type });
    closeModal('modal-create-parameter');
    toast(`Parameter "${name}" created`, 'success');
    loadParameters({ force: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function viewParameter(name) {
  try {
    const data = await api('GET', `/secrets/parameters/${encodeURIComponent(name)}`);
    document.getElementById('paramViewTitle').textContent = name;
    const el = document.getElementById('paramViewValue');
    el.textContent = '••••••••••••';
    el.dataset.revealed = '0';
    el.dataset.value = data.value ?? '';
    openModal('modal-view-parameter');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteParameter(name) {
  const ok = await confirmAction({
    title: 'Delete Parameter',
    message: `Delete parameter "${name}"?`,
    confirmText: 'Delete',
  });
  if (!ok) return;
  try {
    await api('DELETE', `/secrets/parameters/${encodeURIComponent(name)}`);
    toast('Parameter deleted', 'success');
    loadParameters({ force: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

export function handleSecretsAction(action, el) {
  switch (action) {
    case 'create-secret':
      createSecret();
      break;
    case 'view-secret':
      viewSecret(el.dataset.name);
      break;
    case 'toggle-secret-reveal':
      toggleReveal('secretViewValue');
      break;
    case 'copy-secret-value':
      copyToClipboard(document.getElementById('secretViewValue')?.dataset.value ?? '');
      break;
    case 'delete-secret':
      deleteSecret(el.dataset.name);
      break;
    case 'create-parameter':
      createParameter();
      break;
    case 'view-parameter':
      viewParameter(el.dataset.name);
      break;
    case 'toggle-param-reveal':
      toggleReveal('paramViewValue');
      break;
    case 'copy-param-value':
      copyToClipboard(document.getElementById('paramViewValue')?.dataset.value ?? '');
      break;
    case 'delete-parameter':
      deleteParameter(el.dataset.name);
      break;
  }
}

export function initSecretsListeners() {
  registerPageHandler('secrets-manager', () => {
    if (state.loaded.secrets) renderSecretsList(state.secrets);
    else loadSecrets();
  });
  registerPageHandler('secrets-parameters', () => {
    if (state.loaded.parameters) renderParametersList(state.parameters);
    else loadParameters();
  });
}
