import { api, toast, icon, registerPageHandler, confirmAction, refreshAll } from './core.js';

let editingProfileId = null;
let cachedProfileDefaults = null;

function renderStatus(data) {
  const el = document.getElementById('settingsStatus');
  if (!el) return;

  const active = data.active ?? { host: data.host, port: data.port };
  const clientHost = active.host === '0.0.0.0' ? '127.0.0.1' : active.host;

  el.innerHTML = `
    <div class="settings-status-row">
      <span class="text-muted-sm">Currently running at</span>
      <code class="monospace">http://${clientHost}:${active.port}</code>
    </div>
    ${data.requiresRestart
      ? `<div class="alert alert-warning" style="margin-top:12px">${icon('alert', 'icon icon-sm')} Restart the app to apply saved host/port changes.</div>`
      : ''}`;
}

function getProfileFormValues() {
  return {
    name: document.getElementById('profileName')?.value.trim() ?? '',
    endpoint: document.getElementById('profileEndpoint')?.value.trim() ?? '',
    region: document.getElementById('profileRegion')?.value.trim() ?? '',
    accessKeyId: document.getElementById('profileAccessKey')?.value.trim() ?? '',
    secretAccessKey: document.getElementById('profileSecretKey')?.value.trim() ?? '',
  };
}

function setProfileFormValues(profile, defaults) {
  const values = profile ?? defaults ?? {};
  document.getElementById('profileName').value = values.name ?? '';
  document.getElementById('profileEndpoint').value = values.endpoint ?? '';
  document.getElementById('profileRegion').value = values.region ?? '';
  document.getElementById('profileAccessKey').value = values.accessKeyId ?? '';
  document.getElementById('profileSecretKey').value = values.secretAccessKey ?? '';
}

function renderProfiles(data) {
  const list = document.getElementById('profileList');
  if (!list) return;

  const profiles = data.profiles ?? [];
  if (!profiles.length) {
    list.innerHTML = '<div class="text-muted-sm">No profiles yet.</div>';
    return;
  }

  list.innerHTML = profiles.map((profile) => {
    const active = profile.id === data.activeProfileId;
    return `
      <button
        type="button"
        class="profile-item${active ? ' active' : ''}"
        data-action="select-profile"
        data-profile-id="${profile.id}"
      >
        <span class="profile-item-main">
          <span class="profile-item-name">${escapeHtml(profile.name)}</span>
          <span class="profile-item-meta monospace">${escapeHtml(profile.endpoint)} · ${escapeHtml(profile.region)}</span>
        </span>
        ${active ? '<span class="badge badge-success">Active</span>' : ''}
      </button>`;
  }).join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function updateProfileDefaults(defaults) {
  document.getElementById('profileDefaultEndpoint').textContent = defaults.endpoint ?? 'http://localhost:4566';
  document.getElementById('profileDefaultRegion').textContent = defaults.region ?? 'us-east-1';
  document.getElementById('profileDefaultAccessKey').textContent = defaults.accessKeyId ?? 'test';
}

async function applySettingsResponse(data) {
  const defaults = data.defaults ?? { host: '0.0.0.0', port: 4580 };
  const profileDefaults = data.profileDefaults ?? {};
  cachedProfileDefaults = profileDefaults;

  document.getElementById('settingsHost').value = data.host ?? defaults.host;
  document.getElementById('settingsPort').value = String(data.port ?? defaults.port);
  document.getElementById('settingsHost').placeholder = defaults.host;
  document.getElementById('settingsPort').placeholder = String(defaults.port);
  document.getElementById('settingsDefaultHost').textContent = defaults.host;
  document.getElementById('settingsDefaultPort').textContent = String(defaults.port);

  updateProfileDefaults(profileDefaults);
  renderStatus(data);
  renderProfiles(data);

  const activeProfile = data.activeProfile ?? profilesFind(data, data.activeProfileId);
  if (!editingProfileId && activeProfile) {
    setProfileFormValues(activeProfile, profileDefaults);
    editingProfileId = activeProfile.id;
  } else if (editingProfileId) {
    const selected = profilesFind(data, editingProfileId);
    if (selected) setProfileFormValues(selected, profileDefaults);
  }
}

function profilesFind(data, id) {
  return (data.profiles ?? []).find((profile) => profile.id === id) ?? null;
}

async function loadSettingsPage() {
  const hostInput = document.getElementById('settingsHost');
  const portInput = document.getElementById('settingsPort');
  if (!hostInput || !portInput) return;

  try {
    const data = await api('GET', '/settings');
    await applySettingsResponse(data);
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function saveSettings() {
  const host = document.getElementById('settingsHost')?.value.trim();
  const port = parseInt(document.getElementById('settingsPort')?.value ?? '', 10);

  if (!host) return toast('Host is required', 'error');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return toast('Port must be between 1 and 65535', 'error');
  }

  try {
    const data = await api('PUT', '/settings', { host, port });
    await applySettingsResponse(data);
    if (data.requiresRestart) {
      toast('Settings saved. Restart the app to apply changes.', 'info');
    } else {
      toast('Settings saved', 'success');
    }
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function resetSettings() {
  try {
    const data = await api('POST', '/settings/reset');
    await applySettingsResponse(data);
    toast('Reset to defaults. Restart the app to apply changes.', 'info');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function newProfile(defaults) {
  editingProfileId = null;
  setProfileFormValues(
    {
      name: '',
      endpoint: defaults?.endpoint ?? 'http://localhost:4566',
      region: defaults?.region ?? 'us-east-1',
      accessKeyId: defaults?.accessKeyId ?? 'test',
      secretAccessKey: defaults?.secretAccessKey ?? 'test',
    },
    defaults
  );
  document.querySelectorAll('.profile-item').forEach((el) => el.classList.remove('active'));
}

async function saveProfile() {
  const body = getProfileFormValues();
  if (!body.name) return toast('Profile name is required', 'error');
  if (!body.endpoint) return toast('Endpoint is required', 'error');
  if (!body.region) return toast('Region is required', 'error');
  if (!body.accessKeyId || !body.secretAccessKey) {
    return toast('Access key and secret key are required', 'error');
  }

  try {
    const data = editingProfileId
      ? await api('PUT', `/settings/profiles/${encodeURIComponent(editingProfileId)}`, body)
      : await api('POST', '/settings/profiles', body);

    if (!editingProfileId) {
      const created = (data.profiles ?? []).find(
        (profile) => profile.name === body.name && profile.endpoint === body.endpoint
      );
      editingProfileId = created?.id ?? data.activeProfileId;
    }

    await applySettingsResponse(data);
    toast('Profile saved', 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function activateProfile(id) {
  if (!id) return;
  try {
    const data = await api('POST', `/settings/profiles/${encodeURIComponent(id)}/activate`);
    editingProfileId = id;
    await applySettingsResponse(data);
    await refreshAll();
    toast('Profile activated', 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteProfile(id) {
  if (!id) return;
  const ok = await confirmAction({
    title: 'Delete profile',
    message: 'Delete this profile? This cannot be undone.',
    confirmText: 'Delete',
    variant: 'danger',
  });
  if (!ok) return;

  try {
    const data = await api('DELETE', `/settings/profiles/${encodeURIComponent(id)}`);
    editingProfileId = data.activeProfileId;
    await applySettingsResponse(data);
    await refreshAll();
    toast('Profile deleted', 'success');
  } catch (e) {
    toast(e.message, 'error');
  }
}

export function handleSettingsAction(action, el) {
  switch (action) {
    case 'save-settings':
      saveSettings();
      break;
    case 'reset-settings':
      resetSettings();
      break;
    case 'new-profile':
      newProfile(cachedProfileDefaults);
      break;
    case 'save-profile':
      saveProfile();
      break;
    case 'activate-profile':
      activateProfile(editingProfileId);
      break;
    case 'delete-profile':
      deleteProfile(editingProfileId);
      break;
    case 'select-profile': {
      const id = el?.dataset?.profileId;
      if (!id) return;
      editingProfileId = id;
      api('GET', '/settings')
        .then((data) => {
          const profile = profilesFind(data, id);
          if (profile) setProfileFormValues(profile, data.profileDefaults);
          renderProfiles(data);
        })
        .catch((e) => toast(e.message, 'error'));
      break;
    }
  }
}

export function initSettingsListeners() {
  registerPageHandler('settings', loadSettingsPage);
}
