import {
  state, api, toast, confirmAction, openModal, closeModal, showPage, navigate,
  escHtml, escAttr, formatBytes, renderError, setPanelLoading, registerPageHandler,
  copyToClipboard,
} from './core.js';
import { icon } from './icons.js';

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'pdf', 'zip', 'gz', 'tar',
  'mp4', 'mp3', 'wav', 'woff', 'woff2', 'ttf', 'eot', 'bin', 'exe',
]);

export function getFilteredObjects() {
  const q = document.getElementById('fileFilter')?.value.toLowerCase() ?? '';
  if (!q) return state.currentObjects;
  return state.currentObjects.filter((o) => {
    const name = o.isFolder ? (o.Prefix ?? '') : (o.Key ?? '');
    return name.toLowerCase().includes(q);
  });
}

export async function loadBuckets({ silent = false, force = false } = {}) {
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
  } catch (e) {
    if (!silent && !hasData) grid.innerHTML = renderError(e.message);
    else if (!silent) toast(e.message, 'error');
  } finally {
    state.loading.buckets = false;
    setPanelLoading('bucketsGrid', false);
  }
}

function renderBucketsGrid(buckets) {
  const grid = document.getElementById('bucketsGrid');
  if (!grid) return;

  if (!buckets.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('bucket', 'icon icon-xl')}</div>
        <div class="empty-title">No buckets</div>
        <div class="empty-sub">Create your first bucket to get started</div>
        <button class="btn btn-primary" data-action="open-modal" data-modal="modal-create-bucket">${icon('plus', 'icon icon-sm')} Create Bucket</button>
      </div>`;
    return;
  }

  const cards = buckets.map((b) => {
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
  grid.innerHTML = `<div class="buckets-grid">${cards}</div>`;
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
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteBucket(name) {
  const ok = await confirmAction({
    title: 'Delete Bucket',
    message: `Delete bucket "${name}"? All objects will be emptied first.`,
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
  } catch (e) {
    toast(e.message, 'error');
  }
}

export function renderBrowserEmpty() {
  document.getElementById('s3Breadcrumb')?.classList.add('hidden');
  document.getElementById('browserActions')?.classList.add('hidden');
  const title = document.getElementById('browserTitle');
  if (title) title.innerHTML = `${icon('browser', 'icon icon-sm')} Select a Bucket`;
  const content = document.getElementById('browserContent');
  if (content) {
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('browser', 'icon icon-xl')}</div>
        <div class="empty-title">Select a bucket to start browsing</div>
        <div id="bucketPickerList"></div>
      </div>`;
  }
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
    state.buckets.map((b) => `<button class="btn btn-secondary" data-action="open-bucket" data-bucket="${escAttr(b.Name)}">${escHtml(b.Name)}</button>`).join('')
  }</div>`;
}

export async function openBucket(name, prefix = '', append = false) {
  const prevBucket = state.currentBucket;
  const prevPrefix = state.currentPrefix;
  state.currentBucket = name;
  state.currentPrefix = prefix;
  document.getElementById('s3Breadcrumb')?.classList.remove('hidden');
  document.getElementById('browserActions')?.classList.remove('hidden');
  const uploadPrefix = document.getElementById('uploadPrefix');
  if (uploadPrefix) uploadPrefix.value = prefix;
  renderBreadcrumb(name, prefix);
  const browserTitle = document.getElementById('browserTitle');
  if (browserTitle) {
    browserTitle.innerHTML = `${icon('folder', 'icon icon-sm')} ${escHtml(name)}${prefix ? ' / ' + escHtml(prefix) : ''}`;
  }

  showPage('s3-browser', document.querySelector('[data-page="s3-browser"]'));

  const content = document.getElementById('browserContent');
  const sameLocation = prevBucket === name && prevPrefix === prefix;

  if (!append) {
    state.nextToken = null;
    state.isTruncated = false;
    if (!sameLocation || !state.currentObjects.length) {
      if (content) content.innerHTML = '<div class="loader"></div>';
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
    const newItems = [...commonPrefixes.map((cp) => ({ ...cp, isFolder: true })), ...objects];

    if (append) {
      state.currentObjects = [...state.currentObjects, ...newItems];
    } else {
      state.currentObjects = newItems;
    }
    state.nextToken = nextToken ?? null;
    state.isTruncated = !!isTruncated;
    renderObjects(getFilteredObjects());
  } catch (e) {
    if (content) content.innerHTML = renderError(e.message);
  } finally {
    state.loading.browser = false;
    setPanelLoading('browserContent', false);
    document.querySelector('[data-action="load-more-objects"]')?.classList.remove('is-loading');
  }
}

function renderBreadcrumb(bucket, prefix) {
  const el = document.getElementById('s3Breadcrumb');
  if (!el) return;
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

function isImageFile(filename, contentType) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'].includes(ext)) return true;
  return !!contentType?.startsWith('image/');
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function renderDetailField(label, value, { copyable = false, mono = true, full = false } = {}) {
  const display = value == null || value === '' ? '—' : String(value);
  const valueClass = mono ? 'detail-value monospace' : 'detail-value';
  const copyBtn = copyable && display !== '—'
    ? `<button type="button" class="detail-copy-btn" data-action="copy-field" data-value="${escAttr(display)}" title="Copy">${icon('copy', 'icon icon-sm')}</button>`
    : '';
  return `
    <div class="detail-field${full ? ' detail-field-full' : ''}">
      <div class="detail-label">${escHtml(label)}</div>
      <div class="detail-value-wrap">
        <div class="${valueClass}" title="${escAttr(display)}">${escHtml(display)}</div>
        ${copyBtn}
      </div>
    </div>`;
}

function renderDetailSection(title, fieldsHtml) {
  return `
    <section class="detail-section">
      <div class="detail-section-title">${escHtml(title)}</div>
      <div class="detail-grid">${fieldsHtml}</div>
    </section>`;
}

function renderObjectInspectorShell(loading = false, visible = false) {
  return `
    <div class="object-inspector${visible ? '' : ' hidden'}" id="objectInspector">
      <div class="object-inspector-header">
        <div class="object-inspector-title-wrap">
          <div class="object-inspector-icon">${icon('file', 'icon')}</div>
          <div>
            <div class="object-inspector-title" id="objectInspectorTitle">Object Details</div>
            <div class="object-inspector-path monospace" id="objectInspectorPath"></div>
          </div>
        </div>
        <div class="object-inspector-toolbar" id="objectInspectorToolbar"></div>
        <button type="button" class="object-inspector-close" data-action="close-object-inspector" title="Close">${icon('close', 'icon icon-sm')}</button>
      </div>
      <div class="object-inspector-tabs" id="objectInspectorTabs"></div>
      <div class="object-inspector-body" id="objectInspectorBody">
        ${loading ? '<div class="loader"></div>' : ''}
      </div>
    </div>`;
}

function renderObjectToolbar(key, filename) {
  const bucket = state.currentBucket;
  const downloadHref = `/api/s3/buckets/${encodeURIComponent(bucket)}/objects/download?key=${encodeURIComponent(key)}`;
  return `
    <button type="button" class="btn btn-secondary btn-sm" data-action="object-preview" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}">${icon('eye', 'icon icon-sm')} Preview</button>
    <a class="btn btn-secondary btn-sm" href="${escAttr(downloadHref)}" download="${escAttr(filename)}">${icon('download', 'icon icon-sm')} Download</a>
    <button type="button" class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="modal-upload">${icon('upload', 'icon icon-sm')} Upload</button>
    <button type="button" class="btn btn-danger btn-sm" data-action="delete-object" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}">${icon('trash', 'icon icon-sm')} Delete</button>
    <button type="button" class="btn btn-secondary btn-sm" data-action="open-rename-object" data-key="${escAttr(key)}">${icon('edit', 'icon icon-sm')} Rename</button>
    <button type="button" class="btn btn-secondary btn-sm" data-action="open-copy-object" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}">${icon('copy', 'icon icon-sm')} Copy</button>
    <button type="button" class="btn btn-secondary btn-sm" data-action="open-copy-object" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}" data-move="1">${icon('layers', 'icon icon-sm')} Move</button>`;
}

function renderObjectTabs(activeTab) {
  const tabs = [
    ['overview', 'Overview'],
    ['properties', 'Properties'],
    ['metadata', 'User Metadata'],
    ['tags', 'Tags'],
    ['preview', 'Preview'],
  ];
  return tabs.map(([id, label]) => `
    <button type="button" class="object-tab${activeTab === id ? ' active' : ''}" data-action="object-tab" data-tab="${id}">${label}</button>
  `).join('');
}

function renderObjectTabContent(detail, tab, previewContent) {
  const p = detail.properties ?? {};
  const meta = p.metadata ?? {};
  const tags = detail.tags ?? {};

  if (tab === 'overview') {
    return `
      ${renderDetailSection('General', [
        renderDetailField('File name', detail.filename),
        renderDetailField('Extension', detail.extension ? `.${detail.extension}` : '—'),
        renderDetailField('Folder path', detail.folderPath || '/'),
        renderDetailField('Last modified', formatDateTime(p.lastModified)),
        renderDetailField('Size', formatBytes(p.contentLength)),
      ].join(''))}
      ${renderDetailSection('Object identifiers', [
        renderDetailField('Bucket', detail.bucket),
        renderDetailField('Key', detail.key, { copyable: true, full: true }),
        renderDetailField('ARN', detail.arn, { copyable: true, full: true }),
        renderDetailField('S3 URI', detail.s3Uri, { copyable: true, full: true }),
        renderDetailField('Region', detail.region),
      ].join(''))}
      ${renderDetailSection('Endpoints', [
        renderDetailField('Path-style URL', detail.pathStyleUrl, { copyable: true, full: true }),
        renderDetailField('Virtual-hosted URL', detail.virtualHostUrl, { copyable: true, full: true }),
        renderDetailField('Presigned URL', detail.presignedUrl, { copyable: true, full: true }),
      ].join(''))}`;
  }

  if (tab === 'properties') {
    const fields = [
      renderDetailField('Content-Type', p.contentType),
      renderDetailField('Content-Length', p.contentLength != null ? `${p.contentLength} bytes (${formatBytes(p.contentLength)})` : '—'),
      renderDetailField('ETag', p.etag, { copyable: true }),
      renderDetailField('Storage Class', p.storageClass),
      renderDetailField('Version ID', p.versionId, { copyable: true }),
      renderDetailField('Server-side encryption', p.serverSideEncryption),
      renderDetailField('SSE customer algorithm', p.sseCustomerAlgorithm),
      renderDetailField('Cache-Control', p.cacheControl),
      renderDetailField('Content-Disposition', p.contentDisposition),
      renderDetailField('Content-Encoding', p.contentEncoding),
      renderDetailField('Content-Language', p.contentLanguage),
      renderDetailField('Expires', formatDateTime(p.expires)),
      renderDetailField('Website redirect', p.websiteRedirectLocation, { full: true }),
      renderDetailField('Archive status', p.archiveStatus),
      renderDetailField('Object lock mode', p.objectLockMode),
      renderDetailField('Object lock retain until', formatDateTime(p.objectLockRetainUntilDate)),
      renderDetailField('Legal hold', p.objectLockLegalHoldStatus),
    ].join('');
    return renderDetailSection('System properties', fields);
  }

  if (tab === 'metadata') {
    const entries = Object.entries(meta);
    if (!entries.length) {
      return `<div class="empty-state compact"><div class="empty-sub">No user-defined metadata on this object</div></div>`;
    }
    return renderDetailSection('User-defined metadata', entries.map(([k, v]) =>
      renderDetailField(k, v, { copyable: true, full: true })
    ).join(''));
  }

  if (tab === 'tags') {
    const entries = Object.entries(tags);
    if (!entries.length) {
      return `<div class="empty-state compact"><div class="empty-sub">No tags on this object</div></div>`;
    }
    return `
      <div class="tag-grid">
        ${entries.map(([k, v]) => `
          <div class="tag-chip">
            <span class="tag-chip-key">${escHtml(k)}</span>
            <span class="tag-chip-sep">=</span>
            <span class="tag-chip-value">${escHtml(v)}</span>
            <button type="button" class="detail-copy-btn" data-action="copy-field" data-value="${escAttr(`${k}=${v}`)}" title="Copy">${icon('copy', 'icon icon-sm')}</button>
          </div>`).join('')}
      </div>`;
  }

  if (tab === 'preview') {
    if (previewContent?.image) {
      return `<div class="object-preview-image"><img src="${escAttr(previewContent.image)}" alt="${escAttr(detail.filename)}" /></div>`;
    }
    if (previewContent?.binary) {
      return `<div class="empty-state compact"><div class="empty-sub">Binary file (${escHtml(previewContent.contentType ?? 'unknown')}) — use Download to save.</div></div>`;
    }
    if (previewContent?.content != null) {
      return `<pre class="code-block object-preview-code">${escHtml(previewContent.content)}</pre>`;
    }
    return '<div class="loader"></div>';
  }

  return '';
}

async function loadObjectPreview(key, filename, detail) {
  const contentType = detail?.properties?.contentType;
  if (isImageFile(filename, contentType)) {
    return { image: detail.presignedUrl || detail.downloadUrl, contentType, binary: true };
  }
  try {
    const viewRes = await api('GET', `/s3/buckets/${encodeURIComponent(state.currentBucket)}/objects/view?key=${encodeURIComponent(key)}`);
    if (viewRes.binary) return { binary: true, contentType: viewRes.contentType };
    let display = viewRes.content ?? '';
    if (viewRes.contentType?.includes('json') || filename.endsWith('.json')) {
      try { display = JSON.stringify(JSON.parse(viewRes.content), null, 2); } catch {}
    }
    return { content: display, contentType: viewRes.contentType, binary: false };
  } catch (e) {
    return { content: `Error loading preview: ${e.message}`, binary: false };
  }
}

async function openObjectDetails(key, filename) {
  state.currentObjectKey = key;
  state.objectDetailTab = 'overview';
  state.objectDetail = null;
  renderObjects(getFilteredObjects());

  const inspector = document.getElementById('objectInspector');
  inspector?.classList.remove('hidden');
  inspector?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  try {
    const detail = await api('GET', `/s3/buckets/${encodeURIComponent(state.currentBucket)}/objects/details?key=${encodeURIComponent(key)}`);
    state.objectDetail = detail;
    document.getElementById('objectInspectorTitle').textContent = detail.filename;
    document.getElementById('objectInspectorPath').textContent = `${detail.bucket}/${detail.key}`;
    document.getElementById('objectInspectorToolbar').innerHTML = renderObjectToolbar(key, detail.filename);
    document.getElementById('objectInspectorTabs').innerHTML = renderObjectTabs('overview');
    document.getElementById('objectInspectorBody').innerHTML = renderObjectTabContent(detail, 'overview');
    const iconWrap = document.querySelector('.object-inspector-icon');
    if (iconWrap) {
      iconWrap.innerHTML = icon(isImageFile(detail.filename, detail.properties?.contentType) ? 'image' : fileIconName(detail.filename), 'icon');
    }
  } catch (e) {
    document.getElementById('objectInspectorBody').innerHTML = renderError(e.message);
  }
}

async function switchObjectTab(tab) {
  if (!state.currentObjectKey || !state.objectDetail) return;
  state.objectDetailTab = tab;
  document.querySelectorAll('.object-tab').forEach((el) => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  const body = document.getElementById('objectInspectorBody');
  if (!body) return;

  if (tab === 'preview') {
    body.innerHTML = '<div class="loader"></div>';
    const filename = state.objectDetail.filename;
    const preview = await loadObjectPreview(state.currentObjectKey, filename, state.objectDetail);
    body.innerHTML = renderObjectTabContent(state.objectDetail, 'preview', preview);
    return;
  }

  body.innerHTML = renderObjectTabContent(state.objectDetail, tab);
}

function closeObjectInspector() {
  state.currentObjectKey = null;
  state.objectDetail = null;
  state.objectDetailTab = 'overview';
  document.getElementById('objectInspector')?.classList.add('hidden');
  renderObjects(getFilteredObjects());
}

function openRenameModal(key) {
  state.copyObjectKey = key;
  document.getElementById('renameObjectKey').value = key;
  openModal('modal-rename-object');
}

async function renameObject() {
  const oldKey = state.copyObjectKey;
  const newKey = document.getElementById('renameObjectKey')?.value.trim();
  if (!oldKey || !newKey) return toast('New key is required', 'error');
  if (oldKey === newKey) return toast('Key unchanged', 'info');
  try {
    await api('POST', `/s3/buckets/${encodeURIComponent(state.currentBucket)}/objects/rename`, { oldKey, newKey });
    closeModal('modal-rename-object');
    toast('Object renamed', 'success');
    closeObjectInspector();
    openBucket(state.currentBucket, state.currentPrefix);
  } catch (e) {
    toast(e.message, 'error');
  }
}

function renderObjects(items, { filtered = false } = {}) {
  const content = document.getElementById('browserContent');
  if (!content) return;

  if (!items.length) {
    const title = filtered ? 'No files match your search' : 'Empty directory';
    const sub = filtered ? 'Try a different filter term' : 'Upload files or create a folder to get started';
    content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('folder', 'icon icon-xl')}</div>
        <div class="empty-title">${title}</div>
        <div class="empty-sub">${sub}</div>
        ${filtered ? '' : `<div class="form-actions" style="justify-content:center;gap:8px">
          <button class="btn btn-secondary" data-action="open-modal" data-modal="modal-create-folder">${icon('folder', 'icon icon-sm')} Create Folder</button>
          <button class="btn btn-secondary" data-action="open-modal" data-modal="modal-upload">${icon('upload', 'icon icon-sm')} Upload Files</button>
        </div>`}
      </div>`;
    return;
  }

  const rows = items.map((item) => {
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
    const selected = state.currentObjectKey === key;
    return `<tr class="row-object${selected ? ' row-selected' : ''}" data-action="object-details" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}">
      <td><span class="file-icon">${icon(fileIconName(filename), 'icon icon-sm')}</span> <span class="truncate" title="${escAttr(key)}">${escHtml(filename)}</span></td>
      <td><span class="badge badge-muted">.${escHtml(ext ?? 'file')}</span></td>
      <td>${size}</td>
      <td class="text-muted-sm">${modified}</td>
      <td class="td-actions">
        <div class="action-row">
          <button class="btn btn-secondary btn-sm btn-icon" data-action="object-details" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}" title="Details">${icon('info', 'icon icon-sm')}</button>
          ${binary ? '' : `<button class="btn btn-secondary btn-sm btn-icon" data-action="object-preview" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}" title="Preview">${icon('eye', 'icon icon-sm')}</button>`}
          <button class="btn btn-secondary btn-sm btn-icon" data-action="open-copy-object" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}" title="Copy/Move">${icon('copy', 'icon icon-sm')}</button>
          <a class="btn btn-secondary btn-sm btn-icon" href="/api/s3/buckets/${encodeURIComponent(state.currentBucket)}/objects/download?key=${encodeURIComponent(key)}" download="${escAttr(filename)}" title="Download">${icon('download', 'icon icon-sm')}</a>
          <button class="btn btn-danger btn-sm btn-icon" data-action="delete-object" data-key="${escAttr(key)}" data-filename="${escAttr(filename)}" title="Delete">${icon('close', 'icon icon-sm')}</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  const loadMore = state.isTruncated
    ? `<div class="load-more-wrap"><button class="btn btn-secondary" data-action="load-more-objects">Load More</button></div>`
    : '';

  const inspector = renderObjectInspectorShell(
    !!state.currentObjectKey && !state.objectDetail,
    !!state.currentObjectKey
  );

  content.innerHTML = `
    <div class="browser-layout">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Modified</th><th class="text-right">Actions</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${loadMore}
      ${inspector}
    </div>`;

  if (state.currentObjectKey && state.objectDetail) {
    const filename = state.objectDetail.filename;
    document.getElementById('objectInspector')?.classList.remove('hidden');
    document.getElementById('objectInspectorTitle').textContent = filename;
    document.getElementById('objectInspectorPath').textContent = `${state.currentBucket}/${state.currentObjectKey}`;
    document.getElementById('objectInspectorToolbar').innerHTML = renderObjectToolbar(state.currentObjectKey, filename);
    document.getElementById('objectInspectorTabs').innerHTML = renderObjectTabs(state.objectDetailTab);
    document.getElementById('objectInspectorBody').innerHTML = renderObjectTabContent(state.objectDetail, state.objectDetailTab);
  }
}

function filterFiles() {
  renderObjects(getFilteredObjects(), {
    filtered: (document.getElementById('fileFilter')?.value.length ?? 0) > 0,
  });
}

async function objectPreview(key, filename) {
  state.objectDetailTab = 'preview';
  if (state.currentObjectKey !== key) {
    await openObjectDetails(key, filename);
  }
  await switchObjectTab('preview');
  document.getElementById('objectInspector')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function openCopyModal(key, filename, move = false) {
  state.copyObjectKey = key;
  const sel = document.getElementById('copyDestBucket');
  if (sel) {
    sel.innerHTML = '<option value="">— select bucket —</option>' +
      state.buckets.map((b) => `<option value="${escAttr(b.Name)}" ${b.Name === state.currentBucket ? 'selected' : ''}>${escHtml(b.Name)}</option>`).join('');
  }
  document.getElementById('copyDestKey').value = key;
  document.getElementById('copyMoveCheckbox').checked = move;
  document.getElementById('copyObjectTitle').textContent = move ? 'Move Object' : 'Copy Object';
  openModal('modal-copy-object');
}

async function copyObject() {
  const sourceKey = state.copyObjectKey;
  const destBucket = document.getElementById('copyDestBucket').value;
  const destKey = document.getElementById('copyDestKey').value.trim();
  const move = document.getElementById('copyMoveCheckbox').checked;
  if (!sourceKey || !destBucket || !destKey) return toast('Destination bucket and key required', 'error');
  try {
    await api('POST', `/s3/buckets/${encodeURIComponent(state.currentBucket)}/objects/copy`, {
      sourceKey,
      destBucket,
      destKey,
      move,
    });
    closeModal('modal-copy-object');
    toast(move ? 'Object moved' : 'Object copied', 'success');
    openBucket(state.currentBucket, state.currentPrefix);
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function createFolder() {
  const name = document.getElementById('newFolderName').value.trim();
  if (!name) return toast('Folder name is required', 'error');
  if (!state.currentBucket) return toast('Select a bucket first', 'error');
  const prefix = state.currentPrefix + (state.currentPrefix && !state.currentPrefix.endsWith('/') ? '/' : '') + name;
  try {
    await api('PUT', `/s3/buckets/${encodeURIComponent(state.currentBucket)}/objects/folder?prefix=${encodeURIComponent(prefix)}`);
    closeModal('modal-create-folder');
    document.getElementById('newFolderName').value = '';
    toast(`Folder "${name}" created`, 'success');
    openBucket(state.currentBucket, state.currentPrefix);
  } catch (e) {
    toast(e.message, 'error');
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
    if (state.currentObjectKey === key) closeObjectInspector();
    openBucket(state.currentBucket, state.currentPrefix);
  } catch (e) {
    toast(e.message, 'error');
  }
}

function handleFileSelect(event) {
  state.pendingUploadFiles = Array.from(event.target.files);
  renderUploadList();
}

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('dropzone')?.classList.remove('dragover');
  state.pendingUploadFiles = Array.from(event.dataTransfer.files);
  renderUploadList();
}

function renderUploadList() {
  const el = document.getElementById('uploadFileList');
  if (!state.pendingUploadFiles.length) {
    if (el) el.innerHTML = '';
    const btn = document.getElementById('uploadBtn');
    if (btn) btn.disabled = true;
    return;
  }
  el.innerHTML = state.pendingUploadFiles.map((f) => `
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
  state.pendingUploadFiles.forEach((f) => form.append('files', f));
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

export function handleS3Action(action, el, event) {
  switch (action) {
    case 'create-bucket':
      createBucket();
      break;
    case 'delete-bucket':
      event?.stopPropagation();
      deleteBucket(el.dataset.bucket);
      break;
    case 'open-bucket':
      if (event?.target.closest('[data-action="delete-bucket"]')) return;
      closeObjectInspector();
      openBucket(el.dataset.bucket, el.dataset.prefix || '');
      break;
    case 'object-details':
      event?.stopPropagation();
      openObjectDetails(el.dataset.key, el.dataset.filename);
      break;
    case 'object-tab':
      switchObjectTab(el.dataset.tab);
      break;
    case 'object-preview':
      event?.stopPropagation();
      objectPreview(el.dataset.key, el.dataset.filename);
      break;
    case 'open-copy-object':
      event?.stopPropagation();
      openCopyModal(el.dataset.key, el.dataset.filename, el.dataset.move === '1');
      break;
    case 'confirm-copy-object':
      copyObject();
      break;
    case 'open-rename-object':
      event?.stopPropagation();
      openRenameModal(el.dataset.key);
      break;
    case 'confirm-rename-object':
      renameObject();
      break;
    case 'copy-field':
      copyToClipboard(el.dataset.value ?? '');
      break;
    case 'copy-presign-url':
      copyToClipboard(document.getElementById('presignUrlInput')?.value ?? '');
      break;
    case 'close-object-inspector':
      closeObjectInspector();
      break;
    case 'create-folder':
      createFolder();
      break;
    case 'delete-object':
      event?.stopPropagation();
      deleteObject(el.dataset.key, el.dataset.filename);
      break;
    case 'load-more-objects':
      openBucket(state.currentBucket, state.currentPrefix, true);
      break;
    case 'upload-files':
      uploadFiles();
      break;
  }
}

export function initS3Listeners() {
  document.getElementById('fileFilter')?.addEventListener('input', filterFiles);
  document.getElementById('dropzone')?.addEventListener('click', () => document.getElementById('fileInput')?.click());
  document.getElementById('dropzone')?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  });
  document.getElementById('dropzone')?.addEventListener('dragleave', (e) => {
    e.currentTarget.classList.remove('dragover');
  });
  document.getElementById('dropzone')?.addEventListener('drop', handleDrop);
  document.getElementById('fileInput')?.addEventListener('change', handleFileSelect);

  registerPageHandler('s3-buckets', () => {
    if (state.loaded.buckets) renderBucketsGrid(state.buckets);
    else loadBuckets();
  });
  registerPageHandler('s3-browser', () => {
    if (state.currentBucket) renderObjects(getFilteredObjects());
    else renderBrowserEmpty();
    if (!state.loaded.buckets) loadBuckets({ silent: true });
  });
}
