import type { FastifyInstance } from 'fastify';
import {
  ListQueuesCommand,
  CreateQueueCommand,
  DeleteQueueCommand,
  GetQueueAttributesCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  PurgeQueueCommand,
  GetQueueUrlCommand,
} from '@aws-sdk/client-sqs';
import { sqsClient } from '../aws.js';
import { sendAwsError } from '../lib/aws-error.js';

const QUEUE_ATTRS = [
  'ApproximateNumberOfMessages',
  'ApproximateNumberOfMessagesNotVisible',
  'ApproximateNumberOfMessagesDelayed',
  'CreatedTimestamp',
  'VisibilityTimeout',
  'MessageRetentionPeriod',
  'RedrivePolicy',
  'FifoQueue',
  'ContentBasedDeduplication',
];

export async function sqsRoutes(server: FastifyInstance) {
  server.get('/queues', async (_req, reply) => {
    try {
      const { QueueUrls = [] } = await sqsClient.send(new ListQueuesCommand({ MaxResults: 100 }));
      const queues = await Promise.all(
        QueueUrls.map(async (url) => {
          const name = url.split('/').pop() ?? url;
          try {
            const attrs = await sqsClient.send(
              new GetQueueAttributesCommand({ QueueUrl: url, AttributeNames: QUEUE_ATTRS as never })
            );
            return { url, name, attributes: attrs.Attributes ?? {} };
          } catch {
            return { url, name, attributes: {} };
          }
        })
      );
      return reply.send({ queues });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{
    Body: { name: string; fifo?: boolean; dlqArn?: string; maxReceiveCount?: number };
  }>('/queues', async (req, reply) => {
    try {
      const { name, fifo = false, dlqArn, maxReceiveCount = 3 } = req.body;
      const queueName = fifo && !name.endsWith('.fifo') ? `${name}.fifo` : name;
      const attrs: Record<string, string> = {};
      if (fifo) {
        attrs.FifoQueue = 'true';
        attrs.ContentBasedDeduplication = 'true';
      }
      if (dlqArn) {
        attrs.RedrivePolicy = JSON.stringify({
          deadLetterTargetArn: dlqArn,
          maxReceiveCount,
        });
      }
      const res = await sqsClient.send(
        new CreateQueueCommand({ QueueName: queueName, Attributes: attrs })
      );
      return reply.send({ url: res.QueueUrl });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.delete<{ Body: { url: string } }>('/queues', async (req, reply) => {
    try {
      await sqsClient.send(new DeleteQueueCommand({ QueueUrl: req.body.url }));
      return reply.send({ success: true });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Body: { url: string } }>('/queues/purge', async (req, reply) => {
    try {
      await sqsClient.send(new PurgeQueueCommand({ QueueUrl: req.body.url }));
      return reply.send({ success: true });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Body: { url: string; body: string; attributes?: Record<string, string> } }>(
    '/messages/send',
    async (req, reply) => {
      try {
        const { url, body, attributes } = req.body;
        const msgAttrs: Record<string, { DataType: string; StringValue: string }> = {};
        if (attributes) {
          for (const [k, v] of Object.entries(attributes)) {
            msgAttrs[k] = { DataType: 'String', StringValue: v };
          }
        }
        const isFifo = url.endsWith('.fifo') || url.includes('.fifo');
        const res = await sqsClient.send(
          new SendMessageCommand({
            QueueUrl: url,
            MessageBody: body,
            MessageAttributes: Object.keys(msgAttrs).length ? msgAttrs : undefined,
            ...(isFifo ? { MessageGroupId: 'default' } : {}),
          })
        );
        return reply.send({ messageId: res.MessageId });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.post<{ Body: { url: string; max?: number; visibilityTimeout?: number } }>(
    '/messages/peek',
    async (req, reply) => {
      try {
        const { url, max = 10, visibilityTimeout = 0 } = req.body;
        const res = await sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: url,
            MaxNumberOfMessages: Math.min(max, 10),
            WaitTimeSeconds: 0,
            VisibilityTimeout: visibilityTimeout,
            MessageAttributeNames: ['All'],
            AttributeNames: ['All'],
          })
        );
        return reply.send({ messages: res.Messages ?? [] });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.post<{
    Body: { url: string; max?: number; visibilityTimeout?: number; deleteAfter?: boolean };
  }>('/messages/receive', async (req, reply) => {
    try {
      const { url, max = 1, visibilityTimeout = 30, deleteAfter = false } = req.body;
      const res = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: url,
          MaxNumberOfMessages: Math.min(max, 10),
          WaitTimeSeconds: 0,
          VisibilityTimeout: visibilityTimeout,
          MessageAttributeNames: ['All'],
          AttributeNames: ['All'],
        })
      );
      const messages = res.Messages ?? [];
      if (deleteAfter) {
        for (const m of messages) {
          if (m.ReceiptHandle) {
            await sqsClient.send(
              new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: m.ReceiptHandle })
            );
          }
        }
      }
      return reply.send({ messages });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Body: { url: string; receiptHandle: string } }>(
    '/messages/delete',
    async (req, reply) => {
      try {
        await sqsClient.send(
          new DeleteMessageCommand({ QueueUrl: req.body.url, ReceiptHandle: req.body.receiptHandle })
        );
        return reply.send({ success: true });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.post<{ Body: { dlqUrl: string; sourceUrl: string; max?: number } }>(
    '/messages/redrive',
    async (req, reply) => {
      try {
        const { dlqUrl, sourceUrl, max = 10 } = req.body;
        const res = await sqsClient.send(
          new ReceiveMessageCommand({
            QueueUrl: dlqUrl,
            MaxNumberOfMessages: Math.min(max, 10),
            WaitTimeSeconds: 0,
            VisibilityTimeout: 0,
            MessageAttributeNames: ['All'],
          })
        );
        const messages = res.Messages ?? [];
        let moved = 0;
        for (const m of messages) {
          if (!m.Body || !m.ReceiptHandle) continue;
          const isFifo = sourceUrl.includes('.fifo');
          await sqsClient.send(
            new SendMessageCommand({
              QueueUrl: sourceUrl,
              MessageBody: m.Body,
              MessageAttributes: m.MessageAttributes,
              ...(isFifo ? { MessageGroupId: 'default' } : {}),
            })
          );
          await sqsClient.send(
            new DeleteMessageCommand({ QueueUrl: dlqUrl, ReceiptHandle: m.ReceiptHandle })
          );
          moved++;
        }
        return reply.send({ moved });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );
}
