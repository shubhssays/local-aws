import {
  state, api, toast, confirmAction, openModal, closeModal, navigate,
  escHtml, escAttr, renderError, setPanelLoading, registerPageHandler,
  formatJson, insertSample,
} from './core.js';
import { icon } from './icons.js';

let peekMode = 'peek';

export function getFilteredQueues() {
  const q = document.getElementById('queueFilter')?.value.toLowerCase() ?? '';
  if (!q) return state.queuesRaw;
  return state.queuesRaw.filter((queue) => queue.name.toLowerCase().includes(q));
}

export async function loadQueues({ silent = false, force = false } = {}) {
  if (state.loading.queues) return;
  const wrap = document.getElementById('queueTableWrap');
  const hasData = state.loaded.queues && state.queuesRaw.length > 0;

  if (!silent && wrap) {
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

    let totalMsgs = 0;
    let totalInFlight = 0;
    queues.forEach((q) => {
      totalMsgs += parseInt(q.attributes?.ApproximateNumberOfMessages || '0', 10);
      totalInFlight += parseInt(q.attributes?.ApproximateNumberOfMessagesNotVisible || '0', 10);
    });
    document.getElementById('statTotalQueues').textContent = queues.length;
    document.getElementById('statTotalMsgs').textContent = totalMsgs;
    document.getElementById('statInFlight').textContent = totalInFlight;

    renderQueueTable(getFilteredQueues());
    populateDlqSelect();
  } catch (e) {
    if (!silent && wrap && !hasData) wrap.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
  } finally {
    state.loading.queues = false;
    setPanelLoading('queueTableWrap', false);
  }
}

export function renderQueueTable(queues, { filtered = false } = {}) {
  const wrap = document.getElementById('queueTableWrap');
  if (!wrap) return;

  if (!queues.length) {
    const title = filtered ? 'No queues match your search' : 'No queues yet';
    const sub = filtered ? 'Try a different filter term' : 'Create your first SQS queue to get started';
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('inbox', 'icon icon-xl')}</div>
        <div class="empty-title">${title}</div>
        <div class="empty-sub">${sub}</div>
        ${filtered ? '' : `<button class="btn btn-primary" data-action="open-modal" data-modal="modal-create-queue">${icon('plus', 'icon icon-sm')} Create Queue</button>`}
      </div>`;
    return;
  }

  const rows = queues.map((q) => {
    const msgs = q.attributes?.ApproximateNumberOfMessages ?? '—';
    const inflight = q.attributes?.ApproximateNumberOfMessagesNotVisible ?? '—';
    const isFifo = q.name.endsWith('.fifo');
    const isDlq = q.name.toLowerCase().includes('dlq') || q.name.toLowerCase().includes('dead');
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
          <button class="btn btn-secondary btn-sm" data-action="peek-messages" data-queue-url="${escAttr(q.url)}" data-queue-name="${escAttr(q.name)}" data-is-dlq="${isDlq ? '1' : '0'}">${icon('eye', 'icon icon-sm')} Peek</button>
          <button class="btn btn-secondary btn-sm" data-action="publish-to-queue" data-queue-url="${escAttr(q.url)}">${icon('send', 'icon icon-sm')} Send</button>
          <button class="btn btn-warning btn-sm" data-action="purge-queue" data-queue-url="${escAttr(q.url)}" data-queue-name="${escAttr(q.name)}">${icon('trash', 'icon icon-sm')} Purge</button>
          <button class="btn btn-danger btn-sm btn-icon" data-action="delete-queue" data-queue-url="${escAttr(q.url)}" data-queue-name="${escAttr(q.name)}" title="Delete queue">${icon('close', 'icon icon-sm')}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Queue Name</th><th>Type</th><th>Messages</th><th>In Flight</th><th class="text-right">Actions</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function filterQueues() {
  renderQueueTable(getFilteredQueues(), {
    filtered: (document.getElementById('queueFilter')?.value.length ?? 0) > 0,
  });
}

function populateDlqSelect() {
  const sel = document.getElementById('newQueueDlqSelect');
  if (!sel) return;
  const dlqQueues = state.queues.filter((q) =>
    q.name.toLowerCase().includes('dlq') || q.name.toLowerCase().includes('dead')
  );
  sel.innerHTML = '<option value="">— select queue —</option>' +
    dlqQueues.map((q) => `<option value="${escAttr(q.url)}">${escHtml(q.name)}</option>`).join('');
}

function toggleDlqOptions() {
  const enabled = document.getElementById('newQueueDlq')?.checked;
  document.getElementById('dlqOptionsGroup')?.classList.toggle('hidden', !enabled);
  document.getElementById('dlqMaxReceiveGroup')?.classList.toggle('hidden', !enabled);
  if (enabled) populateDlqSelect();
}

function collectPublishAttributes() {
  const attrs = {};
  document.querySelectorAll('#publishAttributesRows .attr-row').forEach((row) => {
    const key = row.querySelector('.attr-key')?.value.trim();
    const val = row.querySelector('.attr-value')?.value.trim();
    if (key && val) attrs[key] = val;
  });
  return Object.keys(attrs).length ? attrs : undefined;
}

function addPublishAttributeRow() {
  const container = document.getElementById('publishAttributesRows');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'attr-row form-row';
  row.innerHTML = `
    <input class="form-input attr-key" placeholder="Attribute name" />
    <input class="form-input attr-value" placeholder="Value" />
    <button type="button" class="btn btn-secondary btn-sm btn-icon" data-action="remove-publish-attribute" title="Remove">×</button>`;
  container.appendChild(row);
}

function setPeekMode(mode) {
  peekMode = mode;
  document.getElementById('peekModePeek')?.classList.toggle('active', mode === 'peek');
  document.getElementById('peekModeConsume')?.classList.toggle('active', mode === 'consume');
}

async function createQueue() {
  const name = document.getElementById('newQueueName').value.trim();
  const fifo = document.getElementById('newQueueFifo').checked;
  const useDlq = document.getElementById('newQueueDlq')?.checked;
  const dlqArn = useDlq ? document.getElementById('newQueueDlqSelect')?.value : undefined;
  const maxReceiveCount = parseInt(document.getElementById('newQueueMaxReceiveCount')?.value || '3', 10);
  if (!name) return toast('Queue name is required', 'error');
  try {
    await api('POST', '/sqs/queues', { name, fifo, dlqArn, maxReceiveCount });
    closeModal('modal-create-queue');
    document.getElementById('newQueueName').value = '';
    document.getElementById('newQueueFifo').checked = false;
    if (document.getElementById('newQueueDlq')) document.getElementById('newQueueDlq').checked = false;
    toggleDlqOptions();
    toast(`Queue "${name}" created`, 'success');
    loadQueues({ force: true });
  } catch (e) {
    toast(e.message, 'error');
  }
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
  } catch (e) {
    toast(e.message, 'error');
  }
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
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function peekMessages(url, name, isDlq = false) {
  state.peekQueue = { url, name, isDlq: isDlq || name.toLowerCase().includes('dlq') || name.toLowerCase().includes('dead') };
  document.getElementById('peekTitle').textContent = `Messages — ${name}`;
  document.getElementById('peekBody').innerHTML = '';
  document.getElementById('peekRedriveArea')?.classList.toggle('hidden', !state.peekQueue.isDlq);
  setPeekMode('peek');
  openModal('modal-peek');
}

async function fetchPeekMessages() {
  if (!state.peekQueue) return;
  const { url } = state.peekQueue;
  const visibilityTimeout = parseInt(document.getElementById('peekVisibilityTimeout')?.value || '0', 10);
  const bodyEl = document.getElementById('peekBody');
  bodyEl.innerHTML = '<div class="loader"></div>';

  try {
    const consume = peekMode === 'consume';
    const endpoint = consume ? '/sqs/messages/receive' : '/sqs/messages/peek';
    const payload = consume
      ? { url, max: 10, visibilityTimeout, deleteAfter: true }
      : { url, max: 10, visibilityTimeout };
    const { messages } = await api('POST', endpoint, payload);

    if (!messages.length) {
      bodyEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icon('inbox', 'icon icon-xl')}</div>
          <div class="empty-title">Queue is empty</div>
        </div>`;
      return;
    }

    bodyEl.innerHTML = messages.map((m, i) => {
      let body = m.Body;
      try { body = JSON.stringify(JSON.parse(m.Body), null, 2); } catch {}
      const attrs = m.MessageAttributes
        ? Object.entries(m.MessageAttributes).map(([k, v]) => `${k}: ${v.StringValue ?? v}`).join(', ')
        : '';
      return `<div class="card card-nested">
        <div class="card-header">
          <div class="card-title card-title-sm">Message ${i + 1} <span class="monospace text-muted-sm"> · ${escHtml(m.MessageId?.substring(0, 16) ?? '')}…</span></div>
          <button class="btn btn-danger btn-sm" data-action="delete-message" data-queue-url="${escAttr(url)}" data-receipt-handle="${escAttr(m.ReceiptHandle ?? '')}">Delete</button>
        </div>
        <div class="card-body">
          <pre class="code-block">${escHtml(body)}</pre>
          ${attrs ? `<div class="msg-meta">Attributes: ${escHtml(attrs)}</div>` : ''}
          ${m.Attributes ? `<div class="msg-meta">Receive Count: ${escHtml(m.Attributes.ApproximateReceiveCount ?? '?')}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    bodyEl.innerHTML = renderError(e.message);
  }
}

async function redriveMessages() {
  if (!state.peekQueue) return;
  const sourceUrl = prompt('Enter source queue URL to redrive messages to:');
  if (!sourceUrl) return;
  try {
    const { moved } = await api('POST', '/sqs/messages/redrive', {
      dlqUrl: state.peekQueue.url,
      sourceUrl,
      max: 10,
    });
    toast(`Redrove ${moved} message(s)`, 'success');
    fetchPeekMessages();
    loadQueues({ silent: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteMessage(url, receiptHandle) {
  try {
    await api('POST', '/sqs/messages/delete', { url, receiptHandle });
    toast('Message deleted', 'success');
    if (state.peekQueue) await fetchPeekMessages();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function populatePublishSelect() {
  if (!state.loaded.queues) await loadQueues({ silent: true });
  const sel = document.getElementById('publishQueueSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">— select queue —</option>' +
    state.queues.map((q) => `<option value="${escAttr(q.url)}">${escHtml(q.name)}</option>`).join('');
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
  const attributes = collectPublishAttributes();
  if (!url) return toast('Select a queue', 'error');
  if (!body) return toast('Message body is required', 'error');
  try {
    const payload = { url, body };
    if (attributes) payload.attributes = attributes;
    const { messageId } = await api('POST', '/sqs/messages/send', payload);
    toast(`Message sent! ID: ${messageId?.substring(0, 16)}…`, 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
}

export function handleSqsAction(action, el) {
  switch (action) {
    case 'create-queue':
      createQueue();
      break;
    case 'publish-message':
      publishMessage();
      break;
    case 'add-publish-attribute':
      addPublishAttributeRow();
      break;
    case 'remove-publish-attribute':
      el.closest('.attr-row')?.remove();
      break;
    case 'peek-messages':
      peekMessages(el.dataset.queueUrl, el.dataset.queueName, el.dataset.isDlq === '1');
      break;
    case 'fetch-messages':
      fetchPeekMessages();
      break;
    case 'set-peek-mode':
      setPeekMode(el.dataset.mode);
      break;
    case 'redrive-messages':
      redriveMessages();
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
    case 'format-json':
      formatJson(el.dataset.target);
      break;
    case 'insert-sample':
      insertSample(el.dataset.target || 'publishBody');
      break;
  }
}

export function initSqsListeners() {
  document.getElementById('queueFilter')?.addEventListener('input', filterQueues);
  document.getElementById('newQueueDlq')?.addEventListener('change', toggleDlqOptions);

  registerPageHandler('sqs-queues', () => {
    if (state.loaded.queues) renderQueueTable(getFilteredQueues());
    else loadQueues();
  });
  registerPageHandler('sqs-publish', populatePublishSelect);
}
