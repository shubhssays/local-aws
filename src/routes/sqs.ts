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

export async function sqsRoutes(server: FastifyInstance) {
  // GET /api/sqs/queues — list all queues with attributes
  server.get('/queues', async (req, reply) => {
    const { QueueUrls = [] } = await sqsClient.send(new ListQueuesCommand({ MaxResults: 100 }));

    const queues = await Promise.all(
      (QueueUrls).map(async (url) => {
        const name = url.split('/').pop() ?? url;
        try {
          const attrs = await sqsClient.send(
            new GetQueueAttributesCommand({
              QueueUrl: url,
              AttributeNames: [
                'ApproximateNumberOfMessages',
                'ApproximateNumberOfMessagesNotVisible',
                'ApproximateNumberOfMessagesDelayed',
                'CreatedTimestamp',
                'VisibilityTimeout',
                'MessageRetentionPeriod',
              ],
            })
          );
          return { url, name, attributes: attrs.Attributes ?? {} };
        } catch {
          return { url, name, attributes: {} };
        }
      })
    );

    return reply.send({ queues });
  });

  // POST /api/sqs/queues — create a queue
  server.post<{ Body: { name: string; fifo?: boolean; dlq?: boolean } }>(
    '/queues',
    async (req, reply) => {
      const { name, fifo = false } = req.body;
      const queueName = fifo && !name.endsWith('.fifo') ? `${name}.fifo` : name;

      const attrs: Record<string, string> = {};
      if (fifo) {
        attrs['FifoQueue'] = 'true';
        attrs['ContentBasedDeduplication'] = 'true';
      }

      const res = await sqsClient.send(
        new CreateQueueCommand({ QueueName: queueName, Attributes: attrs })
      );
      return reply.send({ url: res.QueueUrl });
    }
  );

  // DELETE /api/sqs/queues — delete a queue
  server.delete<{ Body: { url: string } }>('/queues', async (req, reply) => {
    await sqsClient.send(new DeleteQueueCommand({ QueueUrl: req.body.url }));
    return reply.send({ success: true });
  });

  // POST /api/sqs/queues/purge — purge a queue
  server.post<{ Body: { url: string } }>('/queues/purge', async (req, reply) => {
    await sqsClient.send(new PurgeQueueCommand({ QueueUrl: req.body.url }));
    return reply.send({ success: true });
  });

  // POST /api/sqs/messages/send — publish a message
  server.post<{ Body: { url: string; body: string; attributes?: Record<string, string> } }>(
    '/messages/send',
    async (req, reply) => {
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
    }
  );

  // POST /api/sqs/messages/peek — peek at messages (receive + don't delete)
  server.post<{ Body: { url: string; max?: number } }>('/messages/peek', async (req, reply) => {
    const { url, max = 10 } = req.body;
    const res = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: url,
        MaxNumberOfMessages: Math.min(max, 10),
        WaitTimeSeconds: 0,
        VisibilityTimeout: 0,
        MessageAttributeNames: ['All'],
        AttributeNames: ['All'],
      })
    );
    return reply.send({ messages: res.Messages ?? [] });
  });

  // POST /api/sqs/messages/delete — delete a message
  server.post<{ Body: { url: string; receiptHandle: string } }>(
    '/messages/delete',
    async (req, reply) => {
      await sqsClient.send(
        new DeleteMessageCommand({ QueueUrl: req.body.url, ReceiptHandle: req.body.receiptHandle })
      );
      return reply.send({ success: true });
    }
  );
}
