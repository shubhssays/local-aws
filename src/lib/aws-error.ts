export function awsErrorReply(err: unknown): { error: true; code: string; message: string } {
  const e = err as { name?: string; message?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return {
    error: true,
    code: e.name ?? e.Code ?? 'UnknownError',
    message: e.message ?? 'An unknown error occurred',
  };
}

export function sendAwsError(reply: import('fastify').FastifyReply, err: unknown, status = 500) {
  const body = awsErrorReply(err);
  return reply.status(status).send(body);
}
