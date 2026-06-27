import {
  state, api, toast, confirmAction, openModal, closeModal, navigate,
  escHtml, escAttr, renderError, setPanelLoading, registerPageHandler,
  parseKeyValueLines, formatJson, insertSample,
} from './core.js';
import { icon } from './icons.js';

function encodeArn(arn) {
  return encodeURIComponent(arn);
}

export async function loadTopics({ silent = false, force = false } = {}) {
  if (state.loading.topics) return;
  const wrap = document.getElementById('topicsTableWrap');
  const hasData = state.loaded.topics && state.topics.length > 0;

  if (!silent && wrap) {
    if (!hasData || force) wrap.innerHTML = '<div class="loader"></div>';
    else setPanelLoading('topicsTableWrap', true);
  }

  state.loading.topics = true;
  try {
    const { topics } = await api('GET', '/sns/topics');
    state.topics = topics;
    state.loaded.topics = true;
    const badge = document.getElementById('snsBadge');
    if (badge) badge.textContent = topics.length;
    renderTopics(topics);
  } catch (e) {
    if (!silent && wrap && !hasData) wrap.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
  } finally {
    state.loading.topics = false;
    setPanelLoading('topicsTableWrap', false);
  }
}

function renderTopics(topics) {
  const wrap = document.getElementById('topicsTableWrap');
  if (!wrap) return;

  if (!topics.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('bell', 'icon icon-xl')}</div>
        <div class="empty-title">No topics yet</div>
        <button class="btn btn-primary" data-action="open-modal" data-modal="modal-create-topic">${icon('plus', 'icon icon-sm')} Create Topic</button>
      </div>`;
    return;
  }

  const rows = topics.map((t) => `<tr>
    <td><div class="font-medium">${escHtml(t.name)}</div><div class="monospace text-muted-xs">${escHtml(t.arn)}</div></td>
    <td>${t.subscriptionCount ?? 0}</td>
    <td class="td-actions">
      <div class="action-row">
        <button class="btn btn-secondary btn-sm" data-action="open-subscribe-sns" data-arn="${escAttr(t.arn)}" data-name="${escAttr(t.name)}">${icon('layers', 'icon icon-sm')} Subscribe</button>
        <button class="btn btn-secondary btn-sm" data-action="publish-to-topic" data-arn="${escAttr(t.arn)}">${icon('send', 'icon icon-sm')} Publish</button>
        <button class="btn btn-danger btn-sm btn-icon" data-action="delete-topic" data-arn="${escAttr(t.arn)}" data-name="${escAttr(t.name)}" title="Delete">${icon('close', 'icon icon-sm')}</button>
      </div>
    </td>
  </tr>`).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Topic</th><th>Subscriptions</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function createTopic() {
  const name = document.getElementById('newTopicName').value.trim();
  const fifo = document.getElementById('newTopicFifo')?.checked ?? false;
  if (!name) return toast('Topic name is required', 'error');
  try {
    await api('POST', '/sns/topics', { name, fifo });
    closeModal('modal-create-topic');
    document.getElementById('newTopicName').value = '';
    toast(`Topic "${name}" created`, 'success');
    loadTopics({ force: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteTopic(arn, name) {
  const ok = await confirmAction({
    title: 'Delete Topic',
    message: `Delete topic "${name}"?`,
    confirmText: 'Delete Topic',
  });
  if (!ok) return;
  try {
    await api('DELETE', `/sns/topics/${encodeArn(arn)}`);
    toast(`Topic "${name}" deleted`, 'success');
    loadTopics({ force: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function loadSubscriptions(arn, name) {
  state.currentTopic = { arn, name };
  document.getElementById('snsSubsTitle').textContent = `Subscriptions — ${name}`;
  document.getElementById('snsSubsBody').innerHTML = '<div class="loader"></div>';
  openModal('modal-sns-subs');
  try {
    const { subscriptions } = await api('GET', `/sns/topics/${encodeArn(arn)}/subscriptions`);
    state.subscriptions = subscriptions;
    renderSubscriptions(subscriptions, arn);
  } catch (e) {
    document.getElementById('snsSubsBody').innerHTML = renderError(e.message);
  }
}

function renderSubscriptions(subs, topicArn) {
  const body = document.getElementById('snsSubsBody');
  if (!subs.length) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">No subscriptions</div>
        <button class="btn btn-primary btn-sm" data-action="open-subscribe-sqs" data-arn="${escAttr(topicArn)}">${icon('plus', 'icon icon-sm')} Subscribe SQS Queue</button>
      </div>`;
    return;
  }

  const rows = subs.map((s) => `<tr>
    <td>${escHtml(s.Protocol ?? '—')}</td>
    <td class="monospace text-muted-sm">${escHtml(s.Endpoint ?? '—')}</td>
    <td><span class="badge badge-muted">${escHtml(s.SubscriptionArn?.split(':').pop() ?? 'Pending')}</span></td>
    <td class="td-actions">
      ${s.SubscriptionArn && !s.SubscriptionArn.includes('PendingConfirmation')
        ? `<button class="btn btn-danger btn-sm" data-action="unsubscribe" data-sub-arn="${escAttr(s.SubscriptionArn)}">Unsubscribe</button>`
        : ''}
    </td>
  </tr>`).join('');

  body.innerHTML = `
    <div class="form-actions" style="margin-bottom:12px">
      <button class="btn btn-primary btn-sm" data-action="open-subscribe-sqs" data-arn="${escAttr(topicArn)}">${icon('plus', 'icon icon-sm')} Subscribe SQS Queue</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Protocol</th><th>Endpoint</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function openSubscribeSqs(arn) {
  state.currentTopic = { arn, name: arn.split(':').pop() };
  document.getElementById('snsSubscribeProtocol').value = 'sqs';
  const { loadQueues } = await import('./sqs.js');
  if (!state.loaded.queues) await loadQueues({ silent: true });
  const sel = document.getElementById('snsSubscribeEndpoint');
  sel.innerHTML = '<option value="">— select SQS queue —</option>' +
    state.queues.map((q) => `<option value="${escAttr(q.url)}">${escHtml(q.name)}</option>`).join('');
  openModal('modal-subscribe-sns');
}

async function subscribeSqs() {
  const arn = state.currentTopic?.arn;
  const protocol = document.getElementById('snsSubscribeProtocol').value;
  const endpoint = document.getElementById('snsSubscribeEndpoint').value.trim();
  if (!arn || !endpoint) return toast('Endpoint required', 'error');
  try {
    await api('POST', `/sns/topics/${encodeArn(arn)}/subscribe`, { protocol, endpoint });
    closeModal('modal-subscribe-sns');
    toast('Subscribed', 'success');
    loadTopics({ silent: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function unsubscribe(subArn) {
  try {
    await api('DELETE', `/sns/subscriptions/${encodeArn(subArn)}`);
    toast('Unsubscribed', 'success');
    if (state.currentTopic) loadSubscriptions(state.currentTopic.arn, state.currentTopic.name);
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function populatePublishTopicSelect() {
  if (!state.loaded.topics) await loadTopics({ silent: true });
  const sel = document.getElementById('snsPublishTopicSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">— select topic —</option>' +
    state.topics.map((t) => `<option value="${escAttr(t.arn)}">${escHtml(t.name)}</option>`).join('');
}

function publishToTopic(arn) {
  navigate('sns-publish', document.querySelector('[data-page="sns-publish"]'));
  populatePublishTopicSelect().then(() => {
    document.getElementById('snsPublishTopicSelect').value = arn;
  });
}

async function publishMessage() {
  const arn = document.getElementById('snsPublishTopicSelect').value;
  const message = document.getElementById('snsPublishBody').value.trim();
  const subject = document.getElementById('snsPublishSubject')?.value.trim() || undefined;
  const attributes = parseKeyValueLines(document.getElementById('snsPublishAttributes')?.value ?? '');
  if (!arn) return toast('Select a topic', 'error');
  if (!message) return toast('Message is required', 'error');
  try {
    const payload = { message, subject };
    if (attributes) payload.attributes = attributes;
    const { messageId } = await api('POST', `/sns/topics/${encodeArn(arn)}/publish`, payload);
    toast(`Published! ID: ${messageId?.substring(0, 16)}…`, 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
}

export function handleSnsAction(action, el) {
  switch (action) {
    case 'create-topic':
      createTopic();
      break;
    case 'delete-topic':
      deleteTopic(el.dataset.arn, el.dataset.name);
      break;
    case 'open-subscribe-sns':
      state.currentTopic = { arn: el.dataset.arn, name: el.dataset.name };
      openSubscribeSqs(el.dataset.arn);
      break;
    case 'subscribe-sns':
      subscribeSqs();
      break;
    case 'unsubscribe':
      unsubscribe(el.dataset.subArn);
      break;
    case 'publish-to-topic':
      publishToTopic(el.dataset.arn);
      break;
    case 'sns-publish-message':
      publishMessage();
      break;
    case 'format-json':
      formatJson(el.dataset.target);
      break;
    case 'insert-sample':
      insertSample(el.dataset.target || 'snsPublishBody');
      break;
  }
}

export function initSnsListeners() {
  registerPageHandler('sns-topics', () => {
    if (state.loaded.topics) renderTopics(state.topics);
    else loadTopics();
  });
  registerPageHandler('sns-publish', populatePublishTopicSelect);
}
