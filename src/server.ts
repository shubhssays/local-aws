import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { sqsRoutes } from './routes/sqs.js';
import { s3Routes } from './routes/s3.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
});

await server.register(cors, { origin: true });
await server.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

// Serve static frontend (disable browser caching for dev assets)
await server.register(staticPlugin, {
  root: join(__dirname, '..', 'public'),
  prefix: '/',
  cacheControl: false,
  setHeaders: (res, path) => {
    if (/\.(html|css|js)$/.test(path)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  },
});

// API routes
await server.register(sqsRoutes, { prefix: '/api/sqs' });
await server.register(s3Routes, { prefix: '/api/s3' });

server.addHook('onSend', async (request, reply, payload) => {
  if (request.url.startsWith('/api/')) {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    reply.header('Pragma', 'no-cache');
  }
  return payload;
});

const PORT = parseInt(process.env.PORT ?? '4580', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

try {
  await server.listen({ port: PORT, host: HOST });
  console.log(`\n🚀 local-aws running at http://localhost:${PORT}\n`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
