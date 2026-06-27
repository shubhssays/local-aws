import {
  state, api, toast, confirmAction, openModal, closeModal, navigate, showPage,
  escHtml, escAttr, renderError, setPanelLoading, registerPageHandler, formatJson, insertSample,
} from './core.js';
import { icon } from './icons.js';

export async function loadTables({ silent = false, force = false } = {}) {
  if (state.loading.tables) return;
  const wrap = document.getElementById('tablesGrid');
  const hasData = state.loaded.tables && state.tables.length > 0;

  if (!silent && wrap) {
    if (!hasData || force) wrap.innerHTML = '<div class="loader"></div>';
    else setPanelLoading('tablesGrid', true);
  }

  state.loading.tables = true;
  try {
    const { tables } = await api('GET', '/dynamodb/tables');
    state.tables = tables;
    state.loaded.tables = true;
    const badge = document.getElementById('dynamodbBadge');
    if (badge) badge.textContent = tables.length;
    renderTables(tables);
  } catch (e) {
    if (!silent && wrap && !hasData) wrap.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
  } finally {
    state.loading.tables = false;
    setPanelLoading('tablesGrid', false);
  }
}

export function renderTables(tables) {
  const wrap = document.getElementById('tablesGrid');
  if (!wrap) return;

  if (!tables.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('database', 'icon icon-xl')}</div>
        <div class="empty-title">No tables yet</div>
        <div class="empty-sub">Create a DynamoDB table to get started</div>
        <button class="btn btn-primary" data-action="open-modal" data-modal="modal-create-table">${icon('plus', 'icon icon-sm')} Create Table</button>
      </div>`;
    return;
  }

  const rows = tables.map((t) => {
    const keys = (t.keySchema ?? []).map((k) => `${k.KeyType === 'HASH' ? 'PK' : 'SK'}: ${k.AttributeName}`).join(', ');
    return `<tr>
      <td><div class="font-medium">${escHtml(t.name)}</div><div class="text-muted-xs">${escHtml(keys)}</div></td>
      <td>${t.itemCount ?? '—'}</td>
      <td class="td-actions">
        <div class="action-row">
          <button class="btn btn-secondary btn-sm" data-action="open-table" data-table="${escAttr(t.name)}">${icon('browser', 'icon icon-sm')} Browse</button>
          <button class="btn btn-danger btn-sm btn-icon" data-action="delete-table" data-table="${escAttr(t.name)}" title="Delete">${icon('close', 'icon icon-sm')}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Table</th><th>Items</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

async function createTable() {
  const name = document.getElementById('newTableName').value.trim();
  const partitionKey = document.getElementById('newTablePartitionKey').value.trim();
  const partitionKeyType = document.getElementById('newTablePartitionKeyType').value;
  const sortKey = document.getElementById('newTableSortKey').value.trim() || undefined;
  const sortKeyType = document.getElementById('newTableSortKeyType').value;
  if (!name || !partitionKey) return toast('Table name and partition key required', 'error');
  try {
    await api('POST', '/dynamodb/tables', { name, partitionKey, partitionKeyType, sortKey, sortKeyType });
    closeModal('modal-create-table');
    toast(`Table "${name}" created`, 'success');
    loadTables({ force: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteTable(name) {
  const ok = await confirmAction({
    title: 'Delete Table',
    message: `Delete table "${name}"? This cannot be undone.`,
    confirmText: 'Delete Table',
  });
  if (!ok) return;
  try {
    await api('DELETE', `/dynamodb/tables/${encodeURIComponent(name)}`);
    toast(`Table "${name}" deleted`, 'success');
    if (state.currentTable === name) state.currentTable = null;
    loadTables({ force: true });
  } catch (e) {
    toast(e.message, 'error');
  }
}

export async function openTable(name) {
  state.currentTable = name;
  state.tableItems = [];
  state.tableLastKey = null;
  const title = document.getElementById('dynamoBrowserTitle');
  if (title) title.innerHTML = `${icon('database', 'icon icon-sm')} ${escHtml(name)}`;
  document.getElementById('dynamoBreadcrumb')?.classList.remove('hidden');
  showPage('dynamodb-browser', document.querySelector('[data-page="dynamodb-browser"]'));
  await scanTable();
}

export async function scanTable(append = false) {
  const wrap = document.getElementById('dynamoBrowserContent');
  if (!wrap || !state.currentTable) return;
  if (!append) wrap.innerHTML = '<div class="loader"></div>';

  try {
    const body = { limit: 50 };
    if (append && state.tableLastKey) body.exclusiveStartKey = state.tableLastKey;
    const res = await api('POST', `/dynamodb/tables/${encodeURIComponent(state.currentTable)}/scan`, body);
    state.tableItems = append ? [...state.tableItems, ...(res.items ?? [])] : (res.items ?? []);
    state.tableLastKey = res.lastEvaluatedKey ?? null;
    renderItems();
  } catch (e) {
    wrap.innerHTML = renderError(e.message);
  }
}

function renderItems() {
  const wrap = document.getElementById('dynamoBrowserContent');
  if (!wrap) return;

  if (!state.tableItems.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('database', 'icon icon-xl')}</div>
        <div class="empty-title">No items</div>
        <button class="btn btn-primary" data-action="open-modal" data-modal="modal-put-item">${icon('plus', 'icon icon-sm')} Put Item</button>
      </div>`;
    return;
  }

  const rows = state.tableItems.map((item, i) => {
    const preview = JSON.stringify(item).slice(0, 120);
    return `<tr>
      <td class="monospace text-muted-sm">${i + 1}</td>
      <td><span class="truncate" title="${escAttr(JSON.stringify(item))}">${escHtml(preview)}${preview.length >= 120 ? '…' : ''}</span></td>
      <td class="td-actions">
        <div class="action-row">
          <button class="btn btn-secondary btn-sm" data-action="edit-item" data-index="${i}">${icon('edit', 'icon icon-sm')} Edit</button>
          <button class="btn btn-danger btn-sm btn-icon" data-action="delete-item" data-index="${i}" title="Delete">${icon('close', 'icon icon-sm')}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  const loadMore = state.tableLastKey
    ? `<div class="load-more-wrap"><button class="btn btn-secondary" data-action="load-more-items">Load More</button></div>`
    : '';

  wrap.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Item (JSON)</th><th class="text-right">Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>${loadMore}`;
}

function openPutItemModal(index) {
  const itemEl = document.getElementById('dynamoItemJson');
  if (index !== undefined && state.tableItems[index]) {
    itemEl.value = JSON.stringify(state.tableItems[index], null, 2);
    itemEl.dataset.editIndex = String(index);
  } else {
    itemEl.value = '{\n  \n}';
    delete itemEl.dataset.editIndex;
  }
  openModal('modal-put-item');
}

async function saveItem() {
  const itemEl = document.getElementById('dynamoItemJson');
  let item;
  try {
    item = JSON.parse(itemEl.value);
  } catch {
    return toast('Invalid JSON', 'error');
  }
  try {
    await api('PUT', `/dynamodb/tables/${encodeURIComponent(state.currentTable)}/items`, { item });
    closeModal('modal-put-item');
    toast('Item saved', 'success');
    scanTable();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteItem(index) {
  const item = state.tableItems[index];
  if (!item) return;
  const ok = await confirmAction({
    title: 'Delete Item',
    message: 'Delete this item?',
    confirmText: 'Delete',
  });
  if (!ok) return;
  try {
    const { table } = await api('GET', `/dynamodb/tables/${encodeURIComponent(state.currentTable)}`);
    const key = {};
    for (const ks of table.KeySchema ?? []) {
      key[ks.AttributeName] = item[ks.AttributeName];
    }
    await api('DELETE', `/dynamodb/tables/${encodeURIComponent(state.currentTable)}/items`, { key });
    toast('Item deleted', 'success');
    scanTable();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function seedTable() {
  const raw = document.getElementById('dynamoSeedJson').value.trim();
  let items;
  try {
    items = JSON.parse(raw);
    if (!Array.isArray(items)) items = [items];
  } catch {
    return toast('Invalid JSON array', 'error');
  }
  try {
    await api('POST', `/dynamodb/tables/${encodeURIComponent(state.currentTable)}/seed`, { items });
    closeModal('modal-seed-table');
    toast(`${items.length} item(s) seeded`, 'success');
    scanTable();
  } catch (e) {
    toast(e.message, 'error');
  }
}

export function handleDynamoAction(action, el) {
  switch (action) {
    case 'create-table':
      createTable();
      break;
    case 'delete-table':
      deleteTable(el.dataset.table);
      break;
    case 'open-table':
      openTable(el.dataset.table);
      break;
    case 'load-more-items':
      scanTable(true);
      break;
    case 'put-item':
      saveItem();
      break;
    case 'edit-item':
      openPutItemModal(parseInt(el.dataset.index, 10));
      break;
    case 'delete-item':
      deleteItem(parseInt(el.dataset.index, 10));
      break;
    case 'seed-table':
      seedTable();
      break;
    case 'format-json':
      formatJson(el.dataset.target);
      break;
    case 'insert-sample':
      insertSample(el.dataset.target || 'dynamoSeedJson');
      break;
  }
}

export function initDynamoListeners() {
  registerPageHandler('dynamodb-tables', () => {
    if (state.loaded.tables) renderTables(state.tables);
    else loadTables();
  });
  registerPageHandler('dynamodb-browser', () => {
    if (state.currentTable) renderItems();
  });
}
