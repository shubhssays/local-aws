import type { FastifyInstance } from 'fastify';
import { ListBucketsCommand } from '@aws-sdk/client-s3';
import { ListQueuesCommand } from '@aws-sdk/client-sqs';
import { ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { ListTopicsCommand } from '@aws-sdk/client-sns';
import { ListSecretsCommand } from '@aws-sdk/client-secrets-manager';
import { DescribeParametersCommand } from '@aws-sdk/client-ssm';
import { ListFunctionsCommand } from '@aws-sdk/client-lambda';
import { DescribeLogGroupsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { ListEventBusesCommand } from '@aws-sdk/client-eventbridge';
import { ListStateMachinesCommand } from '@aws-sdk/client-sfn';
import {
  LOCALSTACK_ENDPOINT,
  s3Client,
  sqsClient,
  dynamoClient,
  snsClient,
  secretsClient,
  ssmClient,
  lambdaClient,
  logsClient,
  eventBridgeClient,
  sfnClient,
} from '../aws.js';

async function probe(name: string, fn: () => Promise<unknown>): Promise<{ ok: boolean; error?: string }> {
  try {
    await fn();
    return { ok: true };
  } catch (err) {
    const e = err as { message?: string };
    return { ok: false, error: e.message ?? 'unavailable' };
  }
}

export async function healthRoutes(server: FastifyInstance) {
  server.get('/', async (_req, reply) => {
    const [s3, sqs, dynamodb, sns, secretsmanager, ssm, lambda, logs, eventbridge, stepfunctions] =
      await Promise.all([
        probe('s3', () => s3Client.send(new ListBucketsCommand({}))),
        probe('sqs', () => sqsClient.send(new ListQueuesCommand({ MaxResults: 1 }))),
        probe('dynamodb', () => dynamoClient.send(new ListTablesCommand({ Limit: 1 }))),
        probe('sns', () => snsClient.send(new ListTopicsCommand({}))),
        probe('secretsmanager', () => secretsClient.send(new ListSecretsCommand({ MaxResults: 1 }))),
        probe('ssm', () => ssmClient.send(new DescribeParametersCommand({ MaxResults: 1 }))),
        probe('lambda', () => lambdaClient.send(new ListFunctionsCommand({ MaxItems: 1 }))),
        probe('logs', () => logsClient.send(new DescribeLogGroupsCommand({ limit: 1 }))),
        probe('eventbridge', () => eventBridgeClient.send(new ListEventBusesCommand({ Limit: 1 }))),
        probe('stepfunctions', () => sfnClient.send(new ListStateMachinesCommand({ maxResults: 1 }))),
      ]);

    const services = { s3, sqs, dynamodb, sns, secretsmanager, ssm, lambda, logs, eventbridge, stepfunctions };
    const ok = Object.values(services).some((s) => s.ok);

    return reply.send({ ok, endpoint: LOCALSTACK_ENDPOINT, services });
  });
}
