import type { FastifyInstance } from 'fastify';
import {
  ListTablesCommand,
  CreateTableCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  type AttributeDefinition,
  type KeySchemaElement,
} from '@aws-sdk/client-dynamodb';
import {
  ScanCommand,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient, docClient } from '../aws.js';
import { sendAwsError } from '../lib/aws-error.js';

type AttrType = 'S' | 'N' | 'B';

function buildKeySchema(partitionKey: string, sortKey?: string): KeySchemaElement[] {
  const schema: KeySchemaElement[] = [{ AttributeName: partitionKey, KeyType: 'HASH' }];
  if (sortKey) schema.push({ AttributeName: sortKey, KeyType: 'RANGE' });
  return schema;
}

function buildAttributeDefinitions(
  partitionKey: string,
  partitionKeyType: AttrType,
  sortKey?: string,
  sortKeyType?: AttrType
): AttributeDefinition[] {
  const defs: AttributeDefinition[] = [
    { AttributeName: partitionKey, AttributeType: partitionKeyType },
  ];
  if (sortKey) {
    defs.push({ AttributeName: sortKey, AttributeType: sortKeyType ?? 'S' });
  }
  return defs;
}

function buildUpdateExpression(updates: Record<string, unknown>) {
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};
  const parts: string[] = [];
  let i = 0;
  for (const [key, value] of Object.entries(updates)) {
    const nameKey = `#k${i}`;
    const valueKey = `:v${i}`;
    expressionAttributeNames[nameKey] = key;
    expressionAttributeValues[valueKey] = value;
    parts.push(`${nameKey} = ${valueKey}`);
    i++;
  }
  return {
    UpdateExpression: `SET ${parts.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
  };
}

async function batchWriteItems(tableName: string, items: Record<string, unknown>[]) {
  const BATCH_SIZE = 25;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk.map((item) => ({ PutRequest: { Item: item } })),
        },
      })
    );
  }
}

export async function dynamodbRoutes(server: FastifyInstance) {
  server.get('/tables', async (_req, reply) => {
    try {
      const { TableNames = [] } = await dynamoClient.send(new ListTablesCommand({}));
      const tables = await Promise.all(
        TableNames.map(async (name) => {
          const res = await dynamoClient.send(new DescribeTableCommand({ TableName: name }));
          const table = res.Table!;
          return {
            name: table.TableName ?? name,
            itemCount: table.ItemCount ?? 0,
            keySchema: table.KeySchema ?? [],
          };
        })
      );
      return reply.send({ tables });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{
    Body: {
      name: string;
      partitionKey: string;
      partitionKeyType?: AttrType;
      sortKey?: string;
      sortKeyType?: AttrType;
      billingMode?: 'PAY_PER_REQUEST' | 'PROVISIONED';
    };
  }>('/tables', async (req, reply) => {
    try {
      const {
        name,
        partitionKey,
        partitionKeyType = 'S',
        sortKey,
        sortKeyType = 'S',
        billingMode = 'PAY_PER_REQUEST',
      } = req.body;

      await dynamoClient.send(
        new CreateTableCommand({
          TableName: name,
          KeySchema: buildKeySchema(partitionKey, sortKey),
          AttributeDefinitions: buildAttributeDefinitions(
            partitionKey,
            partitionKeyType,
            sortKey,
            sortKeyType
          ),
          BillingMode: billingMode,
        })
      );
      return reply.send({ success: true, name });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.delete<{ Params: { name: string } }>('/tables/:name', async (req, reply) => {
    try {
      await dynamoClient.send(new DeleteTableCommand({ TableName: req.params.name }));
      return reply.send({ success: true });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Params: { name: string } }>('/tables/:name', async (req, reply) => {
    try {
      const res = await dynamoClient.send(
        new DescribeTableCommand({ TableName: req.params.name })
      );
      return reply.send({ table: res.Table });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{
    Params: { name: string };
    Body: { limit?: number; exclusiveStartKey?: Record<string, unknown> };
  }>('/tables/:name/scan', async (req, reply) => {
    try {
      const { limit, exclusiveStartKey } = req.body;
      const res = await docClient.send(
        new ScanCommand({
          TableName: req.params.name,
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
        })
      );
      return reply.send({
        items: res.Items ?? [],
        count: res.Count ?? 0,
        scannedCount: res.ScannedCount ?? 0,
        lastEvaluatedKey: res.LastEvaluatedKey,
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{
    Params: { name: string };
    Body: {
      partitionKeyName: string;
      partitionKeyValue: unknown;
      sortKeyName?: string;
      sortKeyValue?: unknown;
      limit?: number;
      exclusiveStartKey?: Record<string, unknown>;
    };
  }>('/tables/:name/query', async (req, reply) => {
    try {
      const {
        partitionKeyName,
        partitionKeyValue,
        sortKeyName,
        sortKeyValue,
        limit,
        exclusiveStartKey,
      } = req.body;

      const expressionAttributeNames: Record<string, string> = { '#pk': partitionKeyName };
      const expressionAttributeValues: Record<string, unknown> = { ':pk': partitionKeyValue };
      let keyConditionExpression = '#pk = :pk';

      if (sortKeyName && sortKeyValue !== undefined) {
        expressionAttributeNames['#sk'] = sortKeyName;
        expressionAttributeValues[':sk'] = sortKeyValue;
        keyConditionExpression += ' AND #sk = :sk';
      }

      const res = await docClient.send(
        new QueryCommand({
          TableName: req.params.name,
          KeyConditionExpression: keyConditionExpression,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          Limit: limit,
          ExclusiveStartKey: exclusiveStartKey,
        })
      );
      return reply.send({
        items: res.Items ?? [],
        count: res.Count ?? 0,
        scannedCount: res.ScannedCount ?? 0,
        lastEvaluatedKey: res.LastEvaluatedKey,
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.put<{ Params: { name: string }; Body: { item: Record<string, unknown> } }>(
    '/tables/:name/items',
    async (req, reply) => {
      try {
        await docClient.send(
          new PutCommand({ TableName: req.params.name, Item: req.body.item })
        );
        return reply.send({ success: true });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.patch<{
    Params: { name: string };
    Body: { key: Record<string, unknown>; updates: Record<string, unknown> };
  }>('/tables/:name/items', async (req, reply) => {
    try {
      const { key, updates } = req.body;
      const updateExpr = buildUpdateExpression(updates);
      const res = await docClient.send(
        new UpdateCommand({
          TableName: req.params.name,
          Key: key,
          ...updateExpr,
          ReturnValues: 'ALL_NEW',
        })
      );
      return reply.send({ item: res.Attributes });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.delete<{ Params: { name: string }; Body: { key: Record<string, unknown> } }>(
    '/tables/:name/items',
    async (req, reply) => {
      try {
        await docClient.send(
          new DeleteCommand({ TableName: req.params.name, Key: req.body.key })
        );
        return reply.send({ success: true });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.post<{ Params: { name: string }; Body: { items: Record<string, unknown>[] } }>(
    '/tables/:name/seed',
    async (req, reply) => {
      try {
        const { items } = req.body;
        await batchWriteItems(req.params.name, items);
        return reply.send({ success: true, count: items.length });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );
}
