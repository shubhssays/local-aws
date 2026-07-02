import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './create-server.js';
import { getClientHost } from './lib/settings.js';

function resolvePublicDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, '..', 'public');
}

try {
  const { port, host } = await startServer({ publicDir: resolvePublicDir() });
  const clientHost = getClientHost(host);
  console.log(`\n🚀 local-aws running at http://${clientHost}:${port}\n`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
