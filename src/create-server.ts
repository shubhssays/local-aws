import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import { healthRoutes } from './routes/health.js';
import { sqsRoutes } from './routes/sqs.js';
import { s3Routes } from './routes/s3.js';
import { dynamodbRoutes } from './routes/dynamodb.js';
import { snsRoutes } from './routes/sns.js';
import { secretsRoutes } from './routes/secrets.js';
import { lambdaRoutes } from './routes/lambda.js';
import { logsRoutes } from './routes/logs.js';
import { eventbridgeRoutes } from './routes/eventbridge.js';
import { stepfunctionsRoutes } from './routes/stepfunctions.js';

export type CreateServerOptions = {
  publicDir: string;
  /** Disable pino-pretty (recommended for Electron). */
  quiet?: boolean;
};

export async function createServer(options: CreateServerOptions): Promise<FastifyInstance> {
  const server = Fastify({
    logger: options.quiet
      ? false
      : {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true },
          },
        },
  });

  await server.register(cors, { origin: true });
  await server.register(multipart, { limits: { fileSize: 100 * 1024 * 1024 } });

  await server.register(staticPlugin, {
    root: options.publicDir,
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

  await server.register(healthRoutes, { prefix: '/api/health' });
  await server.register(sqsRoutes, { prefix: '/api/sqs' });
  await server.register(s3Routes, { prefix: '/api/s3' });
  await server.register(dynamodbRoutes, { prefix: '/api/dynamodb' });
  await server.register(snsRoutes, { prefix: '/api/sns' });
  await server.register(secretsRoutes, { prefix: '/api/secrets' });
  await server.register(lambdaRoutes, { prefix: '/api/lambda' });
  await server.register(logsRoutes, { prefix: '/api/logs' });
  await server.register(eventbridgeRoutes, { prefix: '/api/eventbridge' });
  await server.register(stepfunctionsRoutes, { prefix: '/api/stepfunctions' });

  server.addHook('onSend', async (request, reply, payload) => {
    if (request.url.startsWith('/api/')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
      reply.header('Pragma', 'no-cache');
    }
    return payload;
  });

  return server;
}

export type StartServerOptions = CreateServerOptions & {
  port?: number;
  host?: string;
};

export async function startServer(options: StartServerOptions) {
  const server = await createServer(options);
  const port = options.port ?? parseInt(process.env.PORT ?? '4580', 10);
  const host = options.host ?? process.env.HOST ?? '0.0.0.0';

  await server.listen({ port, host });

  const address = server.server.address();
  const actualPort =
    typeof address === 'object' && address && 'port' in address ? address.port : port;

  return { server, port: actualPort, host };
}
