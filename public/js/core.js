import { ICON_PATHS, icon } from './icons.js';

export { icon };

export const pageHandlers = new Map();

export const state = {
  queues: [],
  queuesRaw: [],
  buckets: [],
  tables: [],
  topics: [],
  secrets: [],
  parameters: [],
  functions: [],
  logGroups: [],
  rules: [],
  machines: [],
  currentBucket: null,
  currentPrefix: '',
  currentObjects: [],
  nextToken: null,
  isTruncated: false,
  pendingUploadFiles: [],
  connectionOk: false,
  health: null,
  peekQueue: null,
  confirmCallback: null,
  currentTable: null,
  tableItems: [],
  tableLastKey: null,
  currentTopic: null,
  subscriptions: [],
  secretsTab: 'manager',
  currentFunction: null,
  currentLogGroup: null,
  logStreams: [],
  currentStream: null,
  logAutoRefresh: false,
  logRefreshTimer: null,
  currentRule: null,
  currentMachine: null,
  executions: [],
  copyObjectKey: null,
  currentObjectKey: null,
  objectDetailTab: 'overview',
  objectDetail: null,
  theme: 'dark',
  loaded: {
    queues: false,
    buckets: false,
    tables: false,
    topics: false,
    secrets: false,
    parameters: false,
    functions: false,
    logGroups: false,
    rules: false,
    machines: false,
  },
  loading: {
    queues: false,
    buckets: false,
    browser: false,
    tables: false,
    topics: false,
    secrets: false,
    parameters: false,
    functions: false,
    logGroups: false,
    rules: false,
    machines: false,
  },
};

export function registerPageHandler(page, handler) {
  pageHandlers.set(page, handler);
}

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function updateThemeIcon() {
  const el = document.getElementById('themeIcon');
  if (!el) return;
  const name = getTheme() === 'light' ? 'moon' : 'sun';
  el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('local-aws-theme', theme);
  state.theme = theme;
  updateThemeIcon();
}

export function toggleTheme() {
  applyTheme(getTheme() === 'light' ? 'dark' : 'light');
}

export function showPage(page, el) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });
  document.getElementById('page-' + page)?.classList.add('active');
  el?.classList.add('active');
  el?.setAttribute('aria-current', 'page');
}

export function navigate(page, el) {
  showPage(page, el);
  pageHandlers.get(page)?.();
}

export function setPanelLoading(id, loading) {
  document.getElementById(id)?.classList.toggle('is-refreshing', loading);
}

export async function api(method, path, body) {
  const opts = { method, headers: {}, cache: 'no-store' };
  if (body instanceof FormData) {
    opts.body = body;
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch('/api' + path, opts);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export function confirmAction({ title, message, confirmText = 'Confirm', variant = 'danger' }) {
  return new Promise((resolve) => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const btn = document.getElementById('confirmBtn');
    btn.textContent = confirmText;
    btn.className = variant === 'warning' ? 'btn btn-warning' : 'btn btn-danger';
    state.confirmCallback = resolve;
    openModal('modal-confirm');
    setTimeout(() => btn.focus(), 50);
  });
}

export function handleConfirm(ok) {
  closeModal('modal-confirm');
  state.confirmCallback?.(ok);
  state.confirmCallback = null;
}

export function openModal(id) {
  const el = document.getElementById(id);
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
}

export function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
}

export function updateStatusFromHealth(data) {
  state.health = data;
  state.connectionOk = !!data?.ok;
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (!dot || !text) return;

  const services = data?.services ?? {};
  const connected = Object.values(services).filter((s) => s.ok).length;
  const total = Object.keys(services).length;

  const profileName = data?.profile?.name;
  const profileLabel = profileName ? `${profileName} · ` : '';

  if (data?.ok) {
    dot.className = 'status-dot';
    text.textContent = total
      ? `${profileLabel}${connected}/${total} services connected`
      : `${profileLabel || ''}LocalStack Connected`.replace(/^ · /, '');
  } else {
    dot.className = 'status-dot error';
    text.textContent = connected > 0
      ? `${profileLabel}${connected}/${total} services connected`
      : profileName ? `${profileName} unreachable` : 'LocalStack Unreachable';
  }
}

export async function checkHealth() {
  try {
    const data = await api('GET', '/health');
    updateStatusFromHealth(data);
    return data;
  } catch {
    updateStatusFromHealth({ ok: false, services: {} });
    return null;
  }
}

export async function refreshAll() {
  const iconEl = document.getElementById('refreshIcon');
  iconEl?.classList.add('spinning');
  await checkHealth();

  const loaders = await Promise.all([
    import('./sqs.js'),
    import('./s3.js'),
    import('./dynamodb.js'),
    import('./sns.js'),
    import('./secrets.js'),
    import('./lambda.js'),
    import('./logs.js'),
    import('./eventbridge.js'),
    import('./stepfunctions.js'),
  ]);

  await Promise.allSettled([
    loaders[0].loadQueues?.({ force: true }),
    loaders[1].loadBuckets?.({ force: true }),
    state.loaded.tables ? loaders[2].loadTables?.({ force: true }) : Promise.resolve(),
    state.loaded.topics ? loaders[3].loadTopics?.({ force: true }) : Promise.resolve(),
    state.loaded.secrets ? loaders[4].loadSecrets?.({ force: true }) : Promise.resolve(),
    state.loaded.parameters ? loaders[4].loadParameters?.({ force: true }) : Promise.resolve(),
    state.loaded.functions ? loaders[5].loadFunctions?.({ force: true }) : Promise.resolve(),
    state.loaded.logGroups ? loaders[6].loadLogGroups?.({ force: true }) : Promise.resolve(),
    state.loaded.rules ? loaders[7].loadRules?.({ force: true }) : Promise.resolve(),
    state.loaded.machines ? loaders[8].loadMachines?.({ force: true }) : Promise.resolve(),
  ]);

  if (state.currentBucket) {
    await loaders[1].openBucket?.(state.currentBucket, state.currentPrefix);
  }
  if (state.currentTable && document.getElementById('page-dynamodb-browser')?.classList.contains('active')) {
    await loaders[2].scanTable?.();
  }
  if (state.currentLogGroup && document.getElementById('page-logs-viewer')?.classList.contains('active')) {
    await loaders[6].loadLogEvents?.();
  }

  iconEl?.classList.remove('spinning');
}

export function toast(msg, type = 'info') {
  const iconName = type === 'success' ? 'check' : type === 'error' ? 'alert' : 'info';
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icon(iconName, 'icon icon-sm')}<span>${escHtml(String(msg))}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

export function renderError(msg) {
  return `<div class="alert alert-error">${icon('alert', 'icon icon-sm')} ${escHtml(msg)}</div>`;
}

export function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function escAttr(str) {
  return escHtml(str).replace(/'/g, '&#39;');
}

export function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatJson(id) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    el.value = JSON.stringify(JSON.parse(el.value), null, 2);
  } catch {
    toast('Invalid JSON', 'error');
  }
}

export function insertSample(id = 'publishBody') {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = JSON.stringify({
    id: crypto.randomUUID(),
    event: 'sample.message',
    payload: { hello: 'world' },
    timestamp: new Date().toISOString(),
  }, null, 2);
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 'success');
  } catch {
    toast('Failed to copy', 'error');
  }
}

export function parseKeyValueLines(text) {
  const attrs = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (key) attrs[key] = val;
  }
  return Object.keys(attrs).length ? attrs : undefined;
}
