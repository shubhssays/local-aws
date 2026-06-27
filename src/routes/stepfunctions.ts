import type { FastifyInstance } from 'fastify';
import {
  ListStateMachinesCommand,
  DescribeStateMachineCommand,
  StartExecutionCommand,
  ListExecutionsCommand,
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
} from '@aws-sdk/client-sfn';
import { sfnClient } from '../aws.js';
import { sendAwsError } from '../lib/aws-error.js';

function decodeArn(arn: string): string {
  return decodeURIComponent(arn);
}

export async function stepfunctionsRoutes(server: FastifyInstance) {
  server.get('/machines', async (_req, reply) => {
    try {
      const res = await sfnClient.send(new ListStateMachinesCommand({}));
      return reply.send({ stateMachines: res.stateMachines ?? [] });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Params: { arn: string } }>('/machines/:arn', async (req, reply) => {
    try {
      const res = await sfnClient.send(
        new DescribeStateMachineCommand({ stateMachineArn: decodeArn(req.params.arn) })
      );
      return reply.send(res);
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Params: { arn: string }; Body: { input?: string; name?: string } }>(
    '/machines/:arn/executions',
    async (req, reply) => {
      try {
        const { input, name } = req.body;
        const res = await sfnClient.send(
          new StartExecutionCommand({
            stateMachineArn: decodeArn(req.params.arn),
            input,
            name,
          })
        );
        return reply.send({
          executionArn: res.executionArn,
          startDate: res.startDate,
        });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.get<{ Params: { arn: string } }>('/machines/:arn/executions', async (req, reply) => {
    try {
      const res = await sfnClient.send(
        new ListExecutionsCommand({ stateMachineArn: decodeArn(req.params.arn) })
      );
      return reply.send({ executions: res.executions ?? [] });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Params: { arn: string } }>('/executions/:arn', async (req, reply) => {
    try {
      const executionArn = decodeArn(req.params.arn);
      const [describe, history] = await Promise.all([
        sfnClient.send(new DescribeExecutionCommand({ executionArn })),
        sfnClient.send(new GetExecutionHistoryCommand({ executionArn })),
      ]);
      return reply.send({
        ...describe,
        events: history.events ?? [],
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });
}
