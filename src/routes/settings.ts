import type { FastifyInstance } from 'fastify';
import {
  createProfile,
  deleteProfile,
  getActiveProfile,
  getActiveServerSettings,
  getDefaults,
  getProfileDefaults,
  loadSettings,
  saveSettings,
  setActiveProfile,
  updateProfile,
  type AppSettings,
  type AwsProfile,
} from '../lib/settings.js';
import { configureAws } from '../aws.js';
import { sendAwsError } from '../lib/aws-error.js';

type ServerSettings = Pick<AppSettings, 'host' | 'port'>;

function validateServerSettings(body: Partial<ServerSettings>): ServerSettings | { error: string } {
  const host = String(body.host ?? '').trim();
  if (!host) return { error: 'Host is required' };

  const port = Number(body.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { error: 'Port must be an integer between 1 and 65535' };
  }

  return { host, port };
}

function validateProfileInput(body: Partial<AwsProfile>): Omit<AwsProfile, 'id'> | { error: string } {
  const name = String(body.name ?? '').trim();
  if (!name) return { error: 'Profile name is required' };

  const endpoint = String(body.endpoint ?? '').trim();
  if (!endpoint) return { error: 'Endpoint is required' };
  try {
    new URL(endpoint);
  } catch {
    return { error: 'Endpoint must be a valid URL' };
  }

  const region = String(body.region ?? '').trim();
  if (!region) return { error: 'Region is required' };

  const accessKeyId = String(body.accessKeyId ?? '').trim();
  const secretAccessKey = String(body.secretAccessKey ?? '').trim();
  if (!accessKeyId || !secretAccessKey) {
    return { error: 'Access key and secret key are required' };
  }

  return { name, endpoint, region, accessKeyId, secretAccessKey };
}

function settingsChanged(a: ServerSettings, b: ServerSettings) {
  return a.host !== b.host || a.port !== b.port;
}

function publicProfile(profile: AwsProfile) {
  return { ...profile };
}

function settingsResponse(saved: AppSettings) {
  const activeServer = getActiveServerSettings() ?? { host: saved.host, port: saved.port };
  const activeProfile = getActiveProfile(saved);
  return {
    host: saved.host,
    port: saved.port,
    defaults: getDefaults(),
    profileDefaults: getProfileDefaults(),
    active: activeServer,
    requiresRestart: settingsChanged(saved, activeServer),
    activeProfileId: saved.activeProfileId,
    profiles: saved.profiles.map(publicProfile),
    activeProfile: publicProfile(activeProfile),
  };
}

async function applyActiveProfile(saved: AppSettings) {
  const profile = getActiveProfile(saved);
  configureAws(profile);
  return profile;
}

export async function settingsRoutes(server: FastifyInstance) {
  server.get('/', async (_req, reply) => {
    try {
      const saved = await loadSettings();
      return reply.send(settingsResponse(saved));
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.put<{ Body: Partial<ServerSettings> }>('/', async (req, reply) => {
    try {
      const parsed = validateServerSettings(req.body);
      if ('error' in parsed) {
        return reply.status(400).send({ error: true, message: parsed.error });
      }

      const saved = await saveSettings(parsed);
      return reply.send(settingsResponse(saved));
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post('/reset', async (_req, reply) => {
    try {
      const current = await loadSettings();
      const defaults = getDefaults();
      const saved = await saveSettings({
        ...current,
        host: defaults.host,
        port: defaults.port,
      });
      return reply.send(settingsResponse(saved));
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Body: Partial<AwsProfile> }>('/profiles', async (req, reply) => {
    try {
      const parsed = validateProfileInput(req.body);
      if ('error' in parsed) {
        return reply.status(400).send({ error: true, message: parsed.error });
      }

      const current = await loadSettings();
      const next = createProfile(current, parsed);
      const saved = await saveSettings(next);
      return reply.status(201).send(settingsResponse(saved));
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.put<{ Params: { id: string }; Body: Partial<AwsProfile> }>(
    '/profiles/:id',
    async (req, reply) => {
      try {
        const current = await loadSettings();
        const existing = current.profiles.find((profile) => profile.id === req.params.id);
        if (!existing) {
          return reply.status(404).send({ error: true, message: 'Profile not found' });
        }

        const parsed = validateProfileInput({ ...existing, ...req.body });
        if ('error' in parsed) {
          return reply.status(400).send({ error: true, message: parsed.error });
        }

        const updated = updateProfile(current, req.params.id, parsed);
        if ('error' in updated) {
          return reply.status(404).send({ error: true, message: updated.error });
        }

        const saved = await saveSettings(updated);
        if (saved.activeProfileId === req.params.id) {
          await applyActiveProfile(saved);
        }
        return reply.send(settingsResponse(saved));
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.delete<{ Params: { id: string } }>('/profiles/:id', async (req, reply) => {
    try {
      const current = await loadSettings();
      const updated = deleteProfile(current, req.params.id);
      if ('error' in updated) {
        return reply.status(400).send({ error: true, message: updated.error });
      }

      const saved = await saveSettings(updated);
      await applyActiveProfile(saved);
      return reply.send(settingsResponse(saved));
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Params: { id: string } }>('/profiles/:id/activate', async (req, reply) => {
    try {
      const current = await loadSettings();
      const updated = setActiveProfile(current, req.params.id);
      if ('error' in updated) {
        return reply.status(404).send({ error: true, message: updated.error });
      }

      const saved = await saveSettings(updated);
      await applyActiveProfile(saved);
      return reply.send(settingsResponse(saved));
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });
}

export async function initAwsFromSettings() {
  const saved = await loadSettings();
  return applyActiveProfile(saved);
}
