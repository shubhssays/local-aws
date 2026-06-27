import type { FastifyInstance } from 'fastify';
import {
  ListTopicsCommand,
  CreateTopicCommand,
  DeleteTopicCommand,
  ListSubscriptionsByTopicCommand,
  SubscribeCommand,
  UnsubscribeCommand,
  PublishCommand,
} from '@aws-sdk/client-sns';
import { snsClient } from '../aws.js';
import { sendAwsError } from '../lib/aws-error.js';

function decodeArn(raw: string): string {
  return decodeURIComponent(raw);
}

export async function snsRoutes(server: FastifyInstance) {
  server.get('/topics', async (_req, reply) => {
    try {
      const { Topics = [] } = await snsClient.send(new ListTopicsCommand({}));
      const topics = await Promise.all(
        Topics.map(async (topic) => {
          const arn = topic.TopicArn ?? '';
          let subscriptionCount = 0;
          try {
            const subs = await snsClient.send(
              new ListSubscriptionsByTopicCommand({ TopicArn: arn })
            );
            subscriptionCount = subs.Subscriptions?.length ?? 0;
          } catch {
            subscriptionCount = 0;
          }
          return {
            arn,
            name: arn.split(':').pop() ?? arn,
            subscriptionCount,
          };
        })
      );
      return reply.send({ topics });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Body: { name: string; fifo?: boolean } }>('/topics', async (req, reply) => {
    try {
      const { name, fifo = false } = req.body;
      const topicName = fifo && !name.endsWith('.fifo') ? `${name}.fifo` : name;
      const attributes: Record<string, string> = {};
      if (fifo) {
        attributes.FifoTopic = 'true';
        attributes.ContentBasedDeduplication = 'true';
      }
      const res = await snsClient.send(
        new CreateTopicCommand({
          Name: topicName,
          Attributes: Object.keys(attributes).length ? attributes : undefined,
        })
      );
      return reply.send({ arn: res.TopicArn, name: topicName });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.delete<{ Params: { '*': string } }>('/topics/*', async (req, reply) => {
    try {
      const arn = decodeArn(req.params['*']);
      await snsClient.send(new DeleteTopicCommand({ TopicArn: arn }));
      return reply.send({ success: true });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Params: { arn: string } }>('/topics/:arn/subscriptions', async (req, reply) => {
    try {
      const arn = decodeArn(req.params.arn);
      const res = await snsClient.send(
        new ListSubscriptionsByTopicCommand({ TopicArn: arn })
      );
      return reply.send({ subscriptions: res.Subscriptions ?? [] });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Params: { arn: string }; Body: { protocol: string; endpoint: string } }>(
    '/topics/:arn/subscribe',
    async (req, reply) => {
      try {
        const arn = decodeArn(req.params.arn);
        const { protocol, endpoint } = req.body;
        const res = await snsClient.send(
          new SubscribeCommand({ TopicArn: arn, Protocol: protocol, Endpoint: endpoint })
        );
        return reply.send({ subscriptionArn: res.SubscriptionArn });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.delete<{ Params: { arn: string } }>('/subscriptions/:arn', async (req, reply) => {
    try {
      const subscriptionArn = decodeArn(req.params.arn);
      await snsClient.send(new UnsubscribeCommand({ SubscriptionArn: subscriptionArn }));
      return reply.send({ success: true });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{
    Params: { arn: string };
    Body: { message: string; subject?: string; attributes?: Record<string, string> };
  }>('/topics/:arn/publish', async (req, reply) => {
    try {
      const arn = decodeArn(req.params.arn);
      const { message, subject, attributes } = req.body;
      const messageAttributes: Record<string, { DataType: string; StringValue: string }> = {};
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          messageAttributes[key] = { DataType: 'String', StringValue: value };
        }
      }
      const res = await snsClient.send(
        new PublishCommand({
          TopicArn: arn,
          Message: message,
          Subject: subject,
          MessageAttributes: Object.keys(messageAttributes).length ? messageAttributes : undefined,
        })
      );
      return reply.send({ messageId: res.MessageId });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });
}
