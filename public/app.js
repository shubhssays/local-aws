// =============================================
// ICONS
// =============================================
const ICON_PATHS = {
  logo: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  queue: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  bucket: '<path d="M4 7h16v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  browser: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  paperclip: '<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
};

function icon(name, sizeClass = 'icon') {
  const path = ICON_PATHS[name] ?? ICON_PATHS.file;
  return `<span class="${sizeClass}"><svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg></span>`;
}

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'pdf', 'zip', 'gz', 'tar',
  'mp4', 'mp3', 'wav', 'woff', 'woff2', 'ttf', 'eot', 'bin', 'exe',
]);

// =============================================
// STATE
// =============================================
const state = {
  queues: [],
  queuesRaw: [],
  buckets: [],
  currentBucket: null,
  currentPrefix: '',
  currentObjects: [],
  nextToken: null,
  isTruncated: false,
  pendingUploadFiles: [],
  connectionOk: false,
  peekQueue: null,
  confirmCallback: null,
  loaded: { queues: false, buckets: false },
  loading: { queues: false, buckets: false, browser: false },
  theme: 'dark',
};

// =============================================
// THEME
// =============================================
function getTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

function updateThemeIcon() {
  const el = document.getElementById('themeIcon');
  if (!el) return;
  const name = getTheme() === 'light' ? 'moon' : 'sun';
  el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('local-aws-theme', theme);
  state.theme = theme;
  updateThemeIcon();
}

function toggleTheme() {
  applyTheme(getTheme() === 'light' ? 'dark' : 'light');
}

// =============================================
// NAVIGATION
// =============================================
function showPage(page, el) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });
  document.getElementById('page-' + page)?.classList.add('active');
  el?.classList.add('active');
  el?.setAttribute('aria-current', 'page');
}

function navigate(page, el) {
  showPage(page, el);

  if (page === 'sqs-queues') {
    if (state.loaded.queues) renderQueueTable(getFilteredQueues());
    else loadQueues();
    return;
  }
  if (page === 'sqs-publish') {
    populatePublishSelect();
    return;
  }
  if (page === 's3-buckets') {
    if (state.loaded.buckets) renderBucketsGrid(state.buckets);
    else loadBuckets();
    return;
  }
  if (page === 's3-browser') {
    if (state.currentBucket) {
      renderObjects(getFilteredObjects());
    } else {
      renderBrowserEmpty();
    }
    if (!state.loaded.buckets) loadBuckets({ silent: true });
  }
}

function getFilteredQueues() {
  const q = document.getElementById('queueFilter')?.value.toLowerCase() ?? '';
  if (!q) return state.queuesRaw;
  return state.queuesRaw.filter(queue => queue.name.toLowerCase().includes(q));
}

function getFilteredObjects() {
  const q = document.getElementById('fileFilter')?.value.toLowerCase() ?? '';
  if (!q) return state.currentObjects;
  return state.currentObjects.filter(o => {
    const name = o.isFolder ? (o.Prefix ?? '') : (o.Key ?? '');
    return name.toLowerCase().includes(q);
  });
}

function setPanelLoading(id, loading) {
  document.getElementById(id)?.classList.toggle('is-refreshing', loading);
}

// =============================================
// API HELPERS
// =============================================
async function api(method, path, body) {
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
  return res.json();
}

// =============================================
// CONFIRM MODAL
// =============================================
function confirmAction({ title, message, confirmText = 'Confirm', variant = 'danger' }) {
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

function handleConfirm(ok) {
  closeModal('modal-confirm');
  state.confirmCallback?.(ok);
  state.confirmCallback = null;
}

// =============================================
// MODALS
// =============================================
function openModal(id) {
  const el = document.getElementById(id);
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const el = document.getElementById(id);
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
}

// =============================================
// SQS
// =============================================
async function loadQueues({ silent = false, force = false } = {}) {
  if (state.loading.queues) return;
  const wrap = document.getElementById('queueTableWrap');
  const hasData = state.loaded.queues && state.queuesRaw.length > 0;

  if (!silent) {
    if (!hasData || force) wrap.innerHTML = '<div class="loader"></div>';
    else setPanelLoading('queueTableWrap', true);
  }

  state.loading.queues = true;
  try {
    const { queues } = await api('GET', '/sqs/queues');
    state.queues = queues;
    state.queuesRaw = queues;
    state.loaded.queues = true;
    document.getElementById('sqsBadge').textContent = queues.length;

    let totalMsgs = 0, totalInFlight = 0;
    queues.forEach(q => {
      totalMsgs += parseInt(q.attributes.ApproximateNumberOfMessages || '0', 10);
      totalInFlight += parseInt(q.attributes.ApproximateNumberOfMessagesNotVisible || '0', 10);
    });
    document.getElementById('statTotalQueues').textContent = queues.length;
    document.getElementById('statTotalMsgs').textContent = totalMsgs;
    document.getElementById('statInFlight').textContent = totalInFlight;

    renderQueueTable(getFilteredQueues());
    updateStatusOk();
  } catch (e) {
    if (!hasData) wrap.innerHTML = renderError(e.message);
    else toast(e.message, 'error');
    updateStatusError();
  } finally {
    state.loading.queues = false;
    setPanelLoading('queueTableWrap', false);
  }
}

function renderQueueTable(queues, { filtered = false } = {}) {
  if (!queues.length) {
    const title = filtered ? 'No queues match your search' : 'No queues yet';
    const sub = filtered ? 'Try a different filter term' : 'Create your first SQS queue to get started';
    document.getElementById('queueTableWrap').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('inbox', 'icon icon-xl')}</div>
        <div class="empty-title">${title}</div>
        <div class="empty-sub">${sub}</div>
        ${filtered ? '' : `<button class="btn btn-primary" data-action="open-modal" data-modal="modal-create-queue">${icon('plus', 'icon icon-sm')} Create Queue</button>`}
      </div>`;
    return;
  }

  const rows = queues.map(q => {
    const msgs = q.attributes.ApproximateNumberOfMessages ?? '—';
    const inflight = q.attributes.ApproximateNumberOfMessagesNotVisible ?? '—';
    const isFifo = q.name.endsWith('.fifo');
    const isDlq = q.name.includes('dlq') || q.name.includes('dead');
    const msgClass = parseInt(msgs, 10) > 0 ? 'text-highlight-accent' : 'text-muted-sm';
    const inflightClass = parseInt(inflight, 10) > 0 ? 'text-highlight-warning' : 'text-muted-sm';
    return `<tr>
      <td>
        <div class="font-medium">${escHtml(q.name)}</div>
        <div class="monospace text-muted-xs">${escHtml(q.url)}</div>
      </td>
      <td>${isFifo ? '<span class="badge badge-primary">FIFO</span>' : isDlq ? '<span class="badge badge-danger">DLQ</span>' : '<span class="badge badge-muted">Standard</span>'}</td>
      <td><span class="${msgClass}">${msgs}</span></td>
      <td><span class="${inflightClass}">${inflight}</span></td>
      <td class="td-actions">
        <div class="action-row">
          <button class="btn btn-secondary btn-sm" data-action="peek-messages" data-queue-url="${escAttr(q.url)}" data-queue-name="${escAttr(q.name)}">${icon('eye', 'icon icon-sm')} Peek</button>
          <button class="btn btn-secondary btn-sm" data-action="publish-to-queue" data-queue-url="${escAttr(q.url)}">${icon('send', 'icon icon-sm')} Send</button>
          <button class="btn btn-warning btn-sm" data-action="purge-queue" data-queue-url="${escAttr(q.url)}" data-queue-name="${escAttr(q.name)}">${icon('trash', 'icon icon-sm')} Purge</button>
          <button class="btn btn-danger btn-sm btn-icon" data-action="delete-queue" data-queue-url="${escAttr(q.url)}" data-queue-name="${escAttr(q.name)}" title="Delete queue">${icon('close', 'icon icon-sm')}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  document.getElementById('queueTableWrap').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Queue Name</th>
          <th>Type</th>
          <th>Messages</th>
          <th>In Flight</th>
          <th class="text-right">Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function filterQueues() {
  renderQueueTable(getFilteredQueues(), { filtered: (document.getElementById('queueFilter').value.length > 0) });
}

async function createQueue() {
  const name = document.getElementById('newQueueName').value.trim();
  const fifo = document.getElementById('newQueueFifo').checked;
  if (!name) return toast('Queue name is required', 'error');
  try {
    await api('POST', '/sqs/queues', { name, fifo });
    closeModal('modal-create-queue');
    document.getElementById('newQueueName').value = '';
    document.getElementById('newQueueFifo').checked = false;
    toast(`Queue "${name}" created`, 'success');
    loadQueues({ force: true });
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteQueue(url, name) {
  const ok = await confirmAction({
    title: 'Delete Queue',
    message: `Delete queue "${name}"? This cannot be undone.`,
    confirmText: 'Delete Queue',
  });
  if (!ok) return;
  try {
    await api('DELETE', '/sqs/queues', { url });
    toast(`Queue "${name}" deleted`, 'success');
    loadQueues({ force: true });
  } catch (e) { toast(e.message, 'error'); }
}

async function purgeQueue(url, name) {
  const ok = await confirmAction({
    title: 'Purge Queue',
    message: `Purge all messages from "${name}"?`,
    confirmText: 'Purge Messages',
    variant: 'warning',
  });
  if (!ok) return;
  try {
    await api('POST', '/sqs/queues/purge', { url });
    toast(`Queue "${name}" purged`, 'success');
    loadQueues({ force: true });
  } catch (e) { toast(e.message, 'error'); }
}

async function peekMessages(url, name) {
  state.peekQueue = { url, name };
  document.getElementById('peekTitle').textContent = `Messages — ${name}`;
  document.getElementById('peekBody').innerHTML = '<div class="loader"></div>';
  openModal('modal-peek');
  try {
    const { messages } = await api('POST', '/sqs/messages/peek', { url, max: 10 });
    if (!messages.length) {
      document.getElementById('peekBody').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icon('inbox', 'icon icon-xl')}</div>
          <div class="empty-title">Queue is empty</div>
        </div>`;
      return;
    }
    const html = messages.map((m, i) => {
      let body = m.Body;
      try { body = JSON.stringify(JSON.parse(m.Body), null, 2); } catch {}
      return `<div class="card card-nested">
        <div class="card-header">
          <div class="card-title card-title-sm">Message ${i + 1} <span class="monospace text-muted-sm"> · ${escHtml(m.MessageId?.substring(0, 16) ?? '')}…</span></div>
          <button class="btn btn-danger btn-sm" data-action="delete-message" data-queue-url="${escAttr(url)}" data-receipt-handle="${escAttr(m.ReceiptHandle ?? '')}">Delete</button>
        </div>
        <div class="card-body">
          <pre class="code-block">${escHtml(body)}</pre>
          ${m.Attributes ? `<div class="msg-meta">Receive Count: ${escHtml(m.Attributes.ApproximateReceiveCount ?? '?')}</div>` : ''}
        </div>
      </div>`;
    }).join('');
    document.getElementById('peekBody').innerHTML = html;
  } catch (e) {
    document.getElementById('peekBody').innerHTML = renderError(e.message);
  }
}

async function deleteMessage(url, receiptHandle) {
  try {
    await api('POST', '/sqs/messages/delete', { url, receiptHandle });
    toast('Message deleted', 'success');
    if (state.peekQueue) {
      await peekMessages(state.peekQueue.url, state.peekQueue.name);
    }
  } catch (e) { toast(e.message, 'error'); }
}

async function populatePublishSelect() {
  if (!state.loaded.queues) await loadQueues({ silent: true });
  const sel = document.getElementById('publishQueueSelect');
  sel.innerHTML = '<option value="">— select queue —</option>' +
    state.queues.map(q => `<option value="${escAttr(q.url)}">${escHtml(q.name)}</option>`).join('');
}

function publishToQueue(url) {
  navigate('sqs-publish', document.querySelector('[data-page="sqs-publish"]'));
  populatePublishSelect().then(() => {
    document.getElementById('publishQueueSelect').value = url;
  });
}

async function publishMessage() {
  const url = document.getElementById('publishQueueSelect').value;
  const body = document.getElementById('publishBody').value.trim();
  if (!url) return toast('Select a queue', 'error');
  if (!body) return toast('Message body is required', 'error');
  try {
    const { messageId } = await api('POST', '/sqs/messages/send', { url, body });
    toast(`Message sent! ID: ${messageId?.substring(0, 16)}…`, 'success');
  } catch (e) { toast(e.message, 'error'); }
}

function formatJson(id) {
  const el = document.getElementById(id);
  try { el.value = JSON.stringify(JSON.parse(el.value), null, 2); }
  catch { toast('Invalid JSON', 'error'); }
}

function insertSampleJob() {
  document.getElementById('publishBody').value = JSON.stringify({
    id: crypto.randomUUID(),
    event: 'sample.message',
    payload: { hello: 'world' },
    timestamp: new Date().toISOString(),
  }, null, 2);
}

// =============================================
// S3 — BUCKETS
// =============================================
async function loadBuckets({ silent = false, force = false } = {}) {
  if (state.loading.buckets) return;
  const grid = document.getElementById('bucketsGrid');
  if (!grid) return;
  const hasData = state.loaded.buckets && state.buckets.length > 0;

  if (!silent) {
    if (!hasData || force) grid.innerHTML = '<div class="loader"></div>';
    else setPanelLoading('bucketsGrid', true);
  }

  state.loading.buckets = true;
  try {
    const { buckets } = await api('GET', '/s3/buckets');
    state.buckets = buckets;
    state.loaded.buckets = true;
    document.getElementById('s3Badge').textContent = buckets.length;
    if (!silent || document.getElementById('page-s3-buckets')?.classList.contains('active')) {
      renderBucketsGrid(buckets);
    }
    if (document.getElementById('page-s3-browser')?.classList.contains('active') && !state.currentBucket) {
      renderBrowserEmpty();
    }
    updateStatusOk();
  } catch (e) {
    if (!silent && !hasData) grid.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
    updateStatusError();
  } finally {
    state.loading.buckets = false;
    setPanelLoading('bucketsGrid', false);
  }
}

function renderBucketsGrid(buckets) {
  if (!buckets.length) {
    document.getElementById('bucketsGrid').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('bucket', 'icon icon-xl')}</div>
        <div class="empty-title">No buckets</div>
        <div class="empty-sub">Create your first bucket to get started</div>
        <button class="btn btn-primary" data-action="open-modal" data-modal="modal-create-bucket">${icon('plus', 'icon icon-sm')} Create Bucket</button>
      </div>`;
    return;
  }
  const cards = buckets.map(b => {
    const created = b.CreationDate ? new Date(b.CreationDate).toLocaleDateString() : '—';
    return `<div class="card card-clickable" data-action="open-bucket" data-bucket="${escAttr(b.Name)}">
      <div class="card-body card-body-lg">
        <div class="bucket-icon-wrap">${icon('bucket', 'icon icon-xl')}</div>
        <div class="font-medium" style="font-size:15px;margin-bottom:4px">${escHtml(b.Name)}</div>
        <div class="text-muted-sm">Created ${created}</div>
      </div>
      <div class="card-footer card-footer-split">
        <button class="btn btn-secondary btn-sm" data-action="open-bucket" data-bucket="${escAttr(b.Name)}">Browse ${icon('arrowRight', 'icon icon-sm')}</button>
        <button class="btn btn-danger btn-sm btn-icon" data-action="delete-bucket" data-bucket="${escAttr(b.Name)}" title="Delete bucket">${icon('close', 'icon icon-sm')}</button>
      </div>
    </div>`;
  }).join('');
  document.getElementById('bucketsGrid').innerHTML = `<div class="buckets-grid">${cards}</div>`;
}

async function createBucket() {
  const name = document.getElementById('newBucketName').value.trim();
  if (!name) return toast('Bucket name is required', 'error');
  try {
    await api('POST', '/s3/buckets', { name });
    closeModal('modal-create-bucket');
    document.getElementById('newBucketName').value = '';
    toast(`Bucket "${name}" created`, 'success');
    loadBuckets({ force: true });
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteBucket(name) {
  const ok = await confirmAction({
    title: 'Delete Bucket',
    message: `Delete bucket "${name}"? The bucket must be empty.`,
    confirmText: 'Delete Bucket',
  });
  if (!ok) return;
  try {
    await api('DELETE', `/s3/buckets/${encodeURIComponent(name)}`);
    toast(`Bucket "${name}" deleted`, 'success');
    if (state.currentBucket === name) {
      state.currentBucket = null;
      state.currentPrefix = '';
      state.currentObjects = [];
      state.nextToken = null;
      state.isTruncated = false;
    }
    await loadBuckets({ force: true });
    if (document.getElementById('page-s3-browser')?.classList.contains('active') && !state.currentBucket) {
      renderBrowserEmpty();
    }
  } catch (e) { toast(e.message, 'error'); }
}

// =============================================
// S3 — BROWSER
// =============================================
function renderBrowserEmpty() {
  document.getElementById('s3Breadcrumb')?.classList.add('hidden');
  document.getElementById('browserActions')?.classList.add('hidden');
  document.getElementById('browserTitle').innerHTML = `${icon('browser', 'icon icon-sm')} Select a Bucket`;
  document.getElementById('browserContent').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${icon('browser', 'icon icon-xl')}</div>
      <div class="empty-title">Select a bucket to start browsing</div>
      <div id="bucketPickerList"></div>
    </div>`;
  renderBucketPicker();
}

function renderBucketPicker() {
  const el = document.getElementById('bucketPickerList');
  if (!el) return;
  if (!state.buckets.length) {
    el.innerHTML = '<div class="text-muted-sm" style="margin-top:12px">No buckets available</div>';
    return;
  }
  el.innerHTML = `<div class="bucket-picker">${
    state.buckets.map(b => `<button class="btn btn-secondary" data-action="open-bucket" data-bucket="${escAttr(b.Name)}">${escHtml(b.Name)}</button>`).join('')
  }</div>`;
}

async function openBucket(name, prefix = '', append = false) {
  const prevBucket = state.currentBucket;
  const prevPrefix = state.currentPrefix;
  state.currentBucket = name;
  state.currentPrefix = prefix;
  document.getElementById('s3Breadcrumb').classList.remove('hidden');
  document.getElementById('browserActions').classList.remove('hidden');
  document.getElementById('uploadPrefix').value = prefix;
  renderBreadcrumb(name, prefix);
  document.getElementById('browserTitle').innerHTML = `${icon('folder', 'icon icon-sm')} ${escHtml(name)}${prefix ? ' / ' + escHtml(prefix) : ''}`;

  showPage('s3-browser', document.querySelector('[data-page="s3-browser"]'));

  const content = document.getElementById('browserContent');
  const sameLocation = prevBucket === name && prevPrefix === prefix;

  if (!append) {
    state.nextToken = null;
    state.isTruncated = false;
    if (!sameLocation || !state.currentObjects.length) {
      content.innerHTML = '<div class="loader"></div>';
    } else {
      setPanelLoading('browserContent', true);
    }
  } else {
    document.querySelector('[data-action="load-more-objects"]')?.classList.add('is-loading');
  }

  state.loading.browser = true;
  try {
    let url = `/s3/buckets/${encodeURIComponent(name)}/objects?prefix=${encodeURIComponent(prefix)}`;
    if (append && state.nextToken) url += `&continuationToken=${encodeURIComponent(state.nextToken)}`;

    const { objects, commonPrefixes, nextToken, isTruncated } = await api('GET', url);
    const newItems = [...commonPrefixes.map(cp => ({ ...cp, isFolder: true })), ...objects];

    if (append) {
      state.currentObjects = [...state.currentObjects, ...newItems];
    } else {
      state.currentObjects = newItems;
    }
    state.nextToken = nextToken ?? null;
    state.isTruncated = !!isTruncated;
    renderObjects(getFilteredObjects());
  } catch (e) {
    content.innerHTML = renderError(e.message);
  } finally {
    state.loading.browser = false;
    setPanelLoading('browserContent', false);
    document.querySelector('[data-action="load-more-objects"]')?.classList.remove('is-loading');
  }
}

function renderBreadcrumb(bucket, prefix) {
  const el = document.getElementById('s3Breadcrumb');
  const parts = prefix.split('/').filter(Boolean);
  let html = `<button type="button" data-action="open-bucket" data-bucket="${escAttr(bucket)}" data-prefix="">${escHtml(bucket)}</button>`;
  let built = '';
  for (const part of parts) {
    built += part + '/';
    html += `<span class="breadcrumb-sep">/</span><button type="button" data-action="open-bucket" data-bucket="${escAttr(bucket)}" data-prefix="${escAttr(built)}">${escHtml(part)}</button>`;
  }
  el.innerHTML = html;
}

function fileIconName(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'json' || ext === 'html' || ext === 'txt' || ext === 'md') return 'file';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'image';
  return 'paperclip';
}

function isBinaryFile(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return BINARY_EXTENSIONS.has(ext);
}

function renderObjects(items, { filtered = false } = {}) {
  if (!items.length) {
    const title = filtered ? 'No files match your search' : 'Empty directory';
    const sub = filtered ? 'Try a different filter term' : 'Upload files to get started';
    document.getElementById('browserContent').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('folder', 'icon icon-xl')}</div>
        <div class="empty-title">${title}</div>
        <div class="empty-sub">${sub}</div>
        ${filtered ? '' : `<button class="btn btn-secondary" data-action="open-modal" data-modal="modal-upload">${icon('upload', 'icon icon-sm')} Upload Files</button>`}
      </div>`;
    return;
  }

  const rows = items.map(item => {
    if (item.isFolder) {
      const folderName = item.Prefix?.replace(state.currentPrefix, '').replace('/', '') ?? item.Prefix;
      return `<tr class="row-clickable" data-action="open-bucket" data-bucket="${escAttr(state.currentBucket)}" data-prefix="${escAttr(item.Prefix ?? '')}">
        <td><span class="file-icon">${icon('folder', 'icon icon-sm')}</span> <span class="text-accent">${escHtml(folderName)}/</span></td>
        <td>Folder</td><td>—</td><td>—</td><td></td>
      </tr>`;
    }
    const key = item.Key ?? '';
    const filename = key.split('/').pop() ?? key;
    const size = formatBytes(item.Size);
    const modified = item.LastModified ? new Date(item.LastModified).toLocaleString() : '—';
    const ext = filename.split('.').pop()?.toLowerCase();
    const binary = isBinaryFile(filename);
    return `<tr>
      <td><span class="file-icon">${icon(fileIconName(filename), 'icon icon-sm')}</span> <span class="truncate" title="${escAttr(key)}">${escHtml(filename)}</span></td>
      <td><span class="badge badge-muted">.${escHtml(ext ?? 'file')}</span></td>
      <td>${size}</td>
      <td class="text-muted-sm">${modified}</td>
      <td class="td-actions">
        <div class="action-row">
          ${binary ? '' : `<button class="btn btn-secondary btn-sm btn-icon" data-action="view-file" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}" title="View">${icon('eye', 'icon icon-sm')}</button>`}
          <a class="btn btn-secondary btn-sm btn-icon" href="/api/s3/buckets/${encodeURIComponent(state.currentBucket)}/objects/download?key=${encodeURIComponent(key)}" download="${escAttr(filename)}" title="Download">${icon('download', 'icon icon-sm')}</a>
          <button class="btn btn-danger btn-sm btn-icon" data-action="delete-object" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}" title="Delete">${icon('close', 'icon icon-sm')}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  const loadMore = state.isTruncated ? `
    <div class="load-more-wrap">
      <button class="btn btn-secondary" data-action="load-more-objects">Load More</button>
    </div>` : '';

  document.getElementById('browserContent').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Modified</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>${loadMore}`;
}

function filterFiles() {
  renderObjects(getFilteredObjects(), { filtered: document.getElementById('fileFilter').value.length > 0 });
}

async function viewFile(key, filename) {
  document.getElementById('viewFileTitle').textContent = filename;
  document.getElementById('viewFileContent').textContent = 'Loading…';
  openModal('modal-view-file');
  try {
    const { content, contentType, binary } = await api('GET', `/s3/buckets/${encodeURIComponent(state.currentBucket)}/objects/view?key=${encodeURIComponent(key)}`);
    if (binary) {
      document.getElementById('viewFileContent').textContent = `Binary file (${contentType ?? 'unknown type'}) — use Download to save this file.`;
      return;
    }
    let display = content ?? '';
    if (contentType?.includes('json') || filename.endsWith('.json')) {
      try { display = JSON.stringify(JSON.parse(content), null, 2); } catch {}
    }
    document.getElementById('viewFileContent').textContent = display;
  } catch (e) {
    document.getElementById('viewFileContent').textContent = `Error: ${e.message}`;
  }
}

async function deleteObject(key, filename) {
  const ok = await confirmAction({
    title: 'Delete Object',
    message: `Delete "${filename}"?`,
    confirmText: 'Delete',
  });
  if (!ok) return;
  try {
    await api('DELETE', `/s3/buckets/${encodeURIComponent(state.currentBucket)}/objects`, { key });
    toast(`"${filename}" deleted`, 'success');
    openBucket(state.currentBucket, state.currentPrefix);
  } catch (e) { toast(e.message, 'error'); }
}

// =============================================
// FILE UPLOAD
// =============================================
function handleFileSelect(event) {
  state.pendingUploadFiles = Array.from(event.target.files);
  renderUploadList();
}

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('dropzone').classList.remove('dragover');
  state.pendingUploadFiles = Array.from(event.dataTransfer.files);
  renderUploadList();
}

function renderUploadList() {
  const el = document.getElementById('uploadFileList');
  if (!state.pendingUploadFiles.length) {
    el.innerHTML = '';
    document.getElementById('uploadBtn').disabled = true;
    return;
  }
  el.innerHTML = state.pendingUploadFiles.map(f => `
    <div class="upload-item">
      ${icon('paperclip', 'icon icon-sm')}
      <span class="upload-item-name">${escHtml(f.name)}</span>
      <span class="upload-item-size">${formatBytes(f.size)}</span>
    </div>`).join('');
  document.getElementById('uploadBtn').disabled = false;
}

async function uploadFiles() {
  if (!state.currentBucket || !state.pendingUploadFiles.length) return;
  const prefix = document.getElementById('uploadPrefix').value.trim();
  const count = state.pendingUploadFiles.length;
  const form = new FormData();
  state.pendingUploadFiles.forEach(f => form.append('files', f));
  try {
    document.getElementById('uploadBtn').disabled = true;
    const res = await fetch(
      `/api/s3/buckets/${encodeURIComponent(state.currentBucket)}/objects?prefix=${encodeURIComponent(prefix)}`,
      { method: 'POST', body: form, cache: 'no-store' }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }
    const { uploaded } = await res.json();
    closeModal('modal-upload');
    state.pendingUploadFiles = [];
    document.getElementById('uploadFileList').innerHTML = '';
    document.getElementById('fileInput').value = '';
    toast(`${uploaded?.length ?? count} file(s) uploaded`, 'success');
    openBucket(state.currentBucket, state.currentPrefix);
  } catch (e) {
    toast(e.message, 'error');
    document.getElementById('uploadBtn').disabled = false;
  }
}

// =============================================
// STATUS
// =============================================
function updateStatusOk() {
  state.connectionOk = true;
  document.getElementById('statusDot').className = 'status-dot';
  document.getElementById('statusText').textContent = 'LocalStack Connected';
}

function updateStatusError() {
  state.connectionOk = false;
  document.getElementById('statusDot').className = 'status-dot error';
  document.getElementById('statusText').textContent = 'LocalStack Unreachable';
}

// =============================================
// TOAST
// =============================================
function toast(msg, type = 'info') {
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

// =============================================
// GLOBAL REFRESH
// =============================================
async function refreshAll() {
  const iconEl = document.getElementById('refreshIcon');
  iconEl.classList.add('spinning');
  await Promise.allSettled([
    loadQueues({ force: true }),
    loadBuckets({ force: true }),
  ]);
  if (state.currentBucket) {
    await openBucket(state.currentBucket, state.currentPrefix);
  }
  iconEl.classList.remove('spinning');
}

// =============================================
// HELPERS
// =============================================
function renderError(msg) {
  return `<div class="alert alert-error">${icon('alert', 'icon icon-sm')} ${escHtml(msg)}</div>`;
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  return escHtml(str).replace(/'/g, '&#39;');
}

function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// =============================================
// EVENT DELEGATION
// =============================================
document.addEventListener('click', (e) => {
  const card = e.target.closest('.card-clickable[data-action="open-bucket"]');
  if (card && !e.target.closest('[data-action="delete-bucket"]')) {
    openBucket(card.dataset.bucket, card.dataset.prefix || '');
    return;
  }

  const el = e.target.closest('[data-action]');
  if (!el) return;

  const action = el.dataset.action;
  switch (action) {
    case 'navigate':
      navigate(el.dataset.page, el);
      break;
    case 'open-modal':
      openModal(el.dataset.modal);
      break;
    case 'close-modal':
      closeModal(el.dataset.modal);
      break;
    case 'refresh-all':
      refreshAll();
      break;
    case 'create-queue':
      createQueue();
      break;
    case 'create-bucket':
      createBucket();
      break;
    case 'publish-message':
      publishMessage();
      break;
    case 'format-json':
      formatJson(el.dataset.target);
      break;
    case 'insert-sample':
      insertSampleJob();
      break;
    case 'upload-files':
      uploadFiles();
      break;
    case 'confirm-ok':
      handleConfirm(true);
      break;
    case 'confirm-cancel':
      handleConfirm(false);
      break;
    case 'peek-messages':
      peekMessages(el.dataset.queueUrl, el.dataset.queueName);
      break;
    case 'publish-to-queue':
      publishToQueue(el.dataset.queueUrl);
      break;
    case 'purge-queue':
      purgeQueue(el.dataset.queueUrl, el.dataset.queueName);
      break;
    case 'delete-queue':
      deleteQueue(el.dataset.queueUrl, el.dataset.queueName);
      break;
    case 'delete-message':
      deleteMessage(el.dataset.queueUrl, el.dataset.receiptHandle);
      break;
    case 'open-bucket':
      openBucket(el.dataset.bucket, el.dataset.prefix || '');
      break;
    case 'delete-bucket':
      e.stopPropagation();
      deleteBucket(el.dataset.bucket);
      break;
    case 'view-file':
      viewFile(el.dataset.key, el.dataset.filename);
      break;
    case 'delete-object':
      deleteObject(el.dataset.key, el.dataset.filename);
      break;
    case 'load-more-objects':
      openBucket(state.currentBucket, state.currentPrefix, true);
      break;
    case 'toggle-theme':
      toggleTheme();
      break;
  }
});

document.getElementById('queueFilter')?.addEventListener('input', filterQueues);
document.getElementById('fileFilter')?.addEventListener('input', filterFiles);

document.getElementById('dropzone')?.addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('dropzone')?.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
});
document.getElementById('dropzone')?.addEventListener('dragleave', (e) => {
  e.currentTarget.classList.remove('dragover');
});
document.getElementById('dropzone')?.addEventListener('drop', handleDrop);
document.getElementById('fileInput')?.addEventListener('change', handleFileSelect);

document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', (e) => {
    if (e.target === el && el.id !== 'modal-confirm') el.classList.remove('open');
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const openModalEl = document.querySelector('.modal-overlay.open');
  if (openModalEl) {
    if (openModalEl.id === 'modal-confirm') handleConfirm(false);
    else closeModal(openModalEl.id);
  }
});

// =============================================
// INIT
// =============================================
(async () => {
  state.theme = getTheme();
  updateThemeIcon();
  await Promise.all([loadQueues(), loadBuckets({ silent: true })]);
  renderBrowserEmpty();
})();
