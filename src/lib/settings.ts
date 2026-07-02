import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const DEFAULT_HOST = '0.0.0.0';
export const DEFAULT_PORT = 4580;
export const DEFAULT_ENDPOINT = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
export const DEFAULT_REGION = process.env.AWS_DEFAULT_REGION ?? 'us-east-1';
export const DEFAULT_ACCESS_KEY = 'test';
export const DEFAULT_SECRET_KEY = 'test';

export type AwsProfile = {
  id: string;
  name: string;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type AppSettings = {
  host: string;
  port: number;
  activeProfileId: string;
  profiles: AwsProfile[];
};

type ServerSettings = Pick<AppSettings, 'host' | 'port'>;

let activeSettings: ServerSettings | null = null;

export function getSettingsPath(): string {
  if (process.env.LOCAL_AWS_SETTINGS_PATH) {
    return process.env.LOCAL_AWS_SETTINGS_PATH;
  }
  return join(homedir(), '.config', 'local-aws', 'settings.json');
}

export function getDefaultProfile(): AwsProfile {
  return {
    id: 'default',
    name: 'LocalStack',
    endpoint: DEFAULT_ENDPOINT,
    region: DEFAULT_REGION,
    accessKeyId: DEFAULT_ACCESS_KEY,
    secretAccessKey: DEFAULT_SECRET_KEY,
  };
}

export function getProfileDefaults(): Omit<AwsProfile, 'id' | 'name'> & { name: string } {
  const defaults = getDefaultProfile();
  return {
    name: defaults.name,
    endpoint: defaults.endpoint,
    region: defaults.region,
    accessKeyId: defaults.accessKeyId,
    secretAccessKey: defaults.secretAccessKey,
  };
}

export function getDefaults(): ServerSettings {
  return { host: DEFAULT_HOST, port: DEFAULT_PORT };
}

function normalizeServerSettings(raw: Partial<ServerSettings>): ServerSettings {
  const defaults = getDefaults();
  const port = Number(raw.port);
  return {
    host: String(raw.host ?? defaults.host).trim() || defaults.host,
    port: Number.isFinite(port) && port >= 1 && port <= 65535 ? port : defaults.port,
  };
}

function normalizeProfile(raw: Partial<AwsProfile>, fallback?: AwsProfile): AwsProfile {
  const base = fallback ?? getDefaultProfile();
  const name = String(raw.name ?? base.name).trim() || base.name;
  const endpoint = String(raw.endpoint ?? base.endpoint).trim() || base.endpoint;
  const region = String(raw.region ?? base.region).trim() || base.region;
  const accessKeyId = String(raw.accessKeyId ?? base.accessKeyId).trim() || base.accessKeyId;
  const secretAccessKey = String(raw.secretAccessKey ?? base.secretAccessKey).trim() || base.secretAccessKey;

  return {
    id: String(raw.id ?? base.id).trim() || base.id,
    name,
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
  };
}

function normalizeSettings(raw: Partial<AppSettings>): AppSettings {
  const server = normalizeServerSettings(raw);
  const defaultProfile = getDefaultProfile();

  let profiles = Array.isArray(raw.profiles)
    ? raw.profiles.map((profile) => normalizeProfile(profile))
    : [defaultProfile];

  if (profiles.length === 0) {
    profiles = [defaultProfile];
  }

  const ids = new Set<string>();
  profiles = profiles.map((profile) => {
    let id = profile.id;
    while (!id || ids.has(id)) {
      id = randomUUID();
    }
    ids.add(id);
    return { ...profile, id };
  });

  const activeProfileId = profiles.some((profile) => profile.id === raw.activeProfileId)
    ? String(raw.activeProfileId)
    : profiles[0].id;

  return {
    ...server,
    activeProfileId,
    profiles,
  };
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(getSettingsPath(), 'utf8');
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return normalizeSettings({});
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const normalized = normalizeSettings({ ...current, ...settings });
  const path = getSettingsPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(normalized, null, 2) + '\n', 'utf8');
  return normalized;
}

export function getActiveProfile(settings: AppSettings): AwsProfile {
  return settings.profiles.find((profile) => profile.id === settings.activeProfileId) ?? settings.profiles[0];
}

export function createProfile(
  settings: AppSettings,
  input: Omit<AwsProfile, 'id'> & { id?: string }
): AppSettings {
  const profile = normalizeProfile({ ...input, id: input.id ?? randomUUID() });
  return normalizeSettings({
    ...settings,
    profiles: [...settings.profiles, profile],
  });
}

export function updateProfile(
  settings: AppSettings,
  id: string,
  input: Partial<Omit<AwsProfile, 'id'>>
): AppSettings | { error: string } {
  const index = settings.profiles.findIndex((profile) => profile.id === id);
  if (index === -1) return { error: 'Profile not found' };

  const profiles = [...settings.profiles];
  profiles[index] = normalizeProfile({ ...profiles[index], ...input, id });
  return normalizeSettings({ ...settings, profiles });
}

export function deleteProfile(settings: AppSettings, id: string): AppSettings | { error: string } {
  if (settings.profiles.length <= 1) {
    return { error: 'Cannot delete the last profile' };
  }

  const profiles = settings.profiles.filter((profile) => profile.id !== id);
  if (profiles.length === settings.profiles.length) {
    return { error: 'Profile not found' };
  }

  const activeProfileId =
    settings.activeProfileId === id ? profiles[0].id : settings.activeProfileId;

  return normalizeSettings({ ...settings, profiles, activeProfileId });
}

export function setActiveProfile(settings: AppSettings, id: string): AppSettings | { error: string } {
  if (!settings.profiles.some((profile) => profile.id === id)) {
    return { error: 'Profile not found' };
  }
  return normalizeSettings({ ...settings, activeProfileId: id });
}

export function setActiveServerSettings(settings: ServerSettings) {
  activeSettings = normalizeServerSettings(settings);
}

export function getActiveServerSettings(): ServerSettings | null {
  return activeSettings;
}

/** Host to use in browser/Electron window when server binds to 0.0.0.0 */
export function getClientHost(bindHost: string): string {
  if (bindHost === '0.0.0.0' || bindHost === '::') return '127.0.0.1';
  return bindHost;
}

export function resolveListenOptions(
  saved: ServerSettings,
  overrides?: { host?: string; port?: number }
): ServerSettings {
  const envPort = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
  const envHost = process.env.HOST?.trim();

  return normalizeServerSettings({
    host: overrides?.host ?? envHost ?? saved.host,
    port: overrides?.port ?? envPort ?? saved.port,
  });
}
