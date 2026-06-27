import type { FastifyInstance } from 'fastify';
import {
  ListEventBusesCommand,
  ListRulesCommand,
  PutRuleCommand,
  ListTargetsByRuleCommand,
  PutTargetsCommand,
  DeleteRuleCommand,
  PutEventsCommand,
  type RuleState,
} from '@aws-sdk/client-eventbridge';
import { eventBridgeClient } from '../aws.js';
import { sendAwsError } from '../lib/aws-error.js';

function busName(bus?: string): string {
  return bus ?? 'default';
}

function jsonString(value: string | Record<string, unknown>): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export async function eventbridgeRoutes(server: FastifyInstance) {
  server.get('/buses', async (_req, reply) => {
    try {
      const res = await eventBridgeClient.send(new ListEventBusesCommand({}));
      return reply.send({ buses: res.EventBuses ?? [] });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Querystring: { bus?: string } }>('/rules', async (req, reply) => {
    try {
      const res = await eventBridgeClient.send(
        new ListRulesCommand({ EventBusName: busName(req.query.bus) })
      );
      return reply.send({ rules: res.Rules ?? [] });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{
    Body: {
      name: string;
      eventPattern: string | Record<string, unknown>;
      bus?: string;
      state?: RuleState;
    };
  }>('/rules', async (req, reply) => {
    try {
      const { name, eventPattern, bus, state } = req.body;
      const res = await eventBridgeClient.send(
        new PutRuleCommand({
          Name: name,
          EventPattern: jsonString(eventPattern),
          EventBusName: busName(bus),
          State: state,
        })
      );
      return reply.send({ ruleArn: res.RuleArn });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Params: { name: string }; Querystring: { bus?: string } }>(
    '/rules/:name/targets',
    async (req, reply) => {
      try {
        const res = await eventBridgeClient.send(
          new ListTargetsByRuleCommand({
            Rule: req.params.name,
            EventBusName: busName(req.query.bus),
          })
        );
        return reply.send({ targets: res.Targets ?? [] });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.put<{
    Params: { name: string };
    Body: { bus?: string; targets: Array<{ Id: string; Arn: string }> };
  }>('/rules/:name/targets', async (req, reply) => {
    try {
      const { bus, targets } = req.body;
      const res = await eventBridgeClient.send(
        new PutTargetsCommand({
          Rule: req.params.name,
          EventBusName: busName(bus),
          Targets: targets,
        })
      );
      return reply.send({ failedEntries: res.FailedEntries ?? [] });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.delete<{ Params: { name: string }; Querystring: { bus?: string } }>(
    '/rules/:name',
    async (req, reply) => {
      try {
        await eventBridgeClient.send(
          new DeleteRuleCommand({
            Name: req.params.name,
            EventBusName: busName(req.query.bus),
          })
        );
        return reply.send({ success: true });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.post<{
    Body: {
      entries: Array<{
        source: string;
        detailType: string;
        detail: string | Record<string, unknown>;
        bus?: string;
      }>;
    };
  }>('/events', async (req, reply) => {
    try {
      const res = await eventBridgeClient.send(
        new PutEventsCommand({
          Entries: req.body.entries.map((entry) => ({
            Source: entry.source,
            DetailType: entry.detailType,
            Detail: jsonString(entry.detail),
            EventBusName: entry.bus ? busName(entry.bus) : undefined,
          })),
        })
      );
      return reply.send({
        failedEntryCount: res.FailedEntryCount ?? 0,
        entries: res.Entries ?? [],
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });
}
