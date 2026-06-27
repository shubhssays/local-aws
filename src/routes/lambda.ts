import type { FastifyInstance } from 'fastify';
import {
  ListFunctionsCommand,
  GetFunctionCommand,
  InvokeCommand,
  type InvocationType,
} from '@aws-sdk/client-lambda';
import { lambdaClient } from '../aws.js';
import { sendAwsError } from '../lib/aws-error.js';

function parseInvokePayload(raw: string | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export async function lambdaRoutes(server: FastifyInstance) {
  server.get('/functions', async (_req, reply) => {
    try {
      const res = await lambdaClient.send(new ListFunctionsCommand({ MaxItems: 100 }));
      return reply.send({
        functions: (res.Functions ?? []).map(
          ({
            FunctionName,
            FunctionArn,
            Runtime,
            Handler,
            CodeSize,
            Description,
            Timeout,
            MemorySize,
            LastModified,
            State,
          }) => ({
            name: FunctionName,
            arn: FunctionArn,
            runtime: Runtime,
            handler: Handler,
            codeSize: CodeSize,
            description: Description,
            timeout: Timeout,
            memorySize: MemorySize,
            lastModified: LastModified,
            state: State,
          })
        ),
        nextMarker: res.NextMarker,
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Params: { name: string } }>('/functions/:name', async (req, reply) => {
    try {
      const res = await lambdaClient.send(
        new GetFunctionCommand({ FunctionName: req.params.name })
      );
      const config = res.Configuration;
      return reply.send({
        configuration: config
          ? {
              name: config.FunctionName,
              arn: config.FunctionArn,
              runtime: config.Runtime,
              handler: config.Handler,
              role: config.Role,
              codeSize: config.CodeSize,
              description: config.Description,
              timeout: config.Timeout,
              memorySize: config.MemorySize,
              lastModified: config.LastModified,
              state: config.State,
              environment: config.Environment?.Variables,
            }
          : null,
        code: {
          repositoryType: res.Code?.RepositoryType,
          location: res.Code?.Location,
          imageUri: res.Code?.ImageUri,
        },
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{
    Params: { name: string };
    Body: { payload?: unknown; invocationType?: 'RequestResponse' | 'Event' | 'DryRun' };
  }>('/functions/:name/invoke', async (req, reply) => {
    try {
      const { payload, invocationType = 'RequestResponse' } = req.body;
      const payloadStr =
        payload === undefined || payload === null
          ? '{}'
          : typeof payload === 'string'
            ? payload
            : JSON.stringify(payload);

      const res = await lambdaClient.send(
        new InvokeCommand({
          FunctionName: req.params.name,
          InvocationType: invocationType as InvocationType,
          Payload: new TextEncoder().encode(payloadStr),
          LogType: 'Tail',
        })
      );

      const rawPayload = res.Payload
        ? new TextDecoder().decode(res.Payload)
        : undefined;

      return reply.send({
        statusCode: res.StatusCode,
        payload: parseInvokePayload(rawPayload),
        functionError: res.FunctionError,
        logResult: res.LogResult,
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });
}
