import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './create-server.js';

function resolvePublicDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return join(__dirname, '..', 'public');
}

try {
  const { port } = await startServer({ publicDir: resolvePublicDir() });
  console.log(`\n🚀 local-aws running at http://localhost:${port}\n`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
