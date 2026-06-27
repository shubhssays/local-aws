import type { FastifyInstance } from 'fastify';
import {
  DescribeLogGroupsCommand,
  DescribeLogStreamsCommand,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { logsClient } from '../aws.js';
import { sendAwsError } from '../lib/aws-error.js';

export async function logsRoutes(server: FastifyInstance) {
  server.get<{ Querystring: { nextToken?: string; limit?: string; prefix?: string } }>(
    '/groups',
    async (req, reply) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
        const res = await logsClient.send(
          new DescribeLogGroupsCommand({
            limit: Math.min(limit, 50),
            nextToken: req.query.nextToken,
            logGroupNamePrefix: req.query.prefix,
          })
        );
        return reply.send({
          groups: (res.logGroups ?? []).map(
            ({ logGroupName, arn, creationTime, storedBytes, retentionInDays, metricFilterCount }) => ({
              name: logGroupName,
              arn,
              creationTime,
              storedBytes,
              retentionInDays,
              metricFilterCount,
            })
          ),
          nextToken: res.nextToken,
        });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.get<{
    Querystring: { groupName: string; nextToken?: string; limit?: string };
  }>('/streams', async (req, reply) => {
    try {
      const { groupName, nextToken } = req.query;
      if (!groupName) {
        return reply.status(400).send({ error: true, code: 'BadRequest', message: 'groupName is required' });
      }
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const res = await logsClient.send(
        new DescribeLogStreamsCommand({
          logGroupName: groupName,
          orderBy: 'LastEventTime',
          descending: true,
          limit: Math.min(limit, 50),
          nextToken,
        })
      );
      return reply.send({
        streams: (res.logStreams ?? []).map(
          ({
            logStreamName,
            creationTime,
            firstEventTimestamp,
            lastEventTimestamp,
            lastIngestionTime,
            storedBytes,
          }) => ({
            name: logStreamName,
            creationTime,
            firstEventTimestamp,
            lastEventTimestamp,
            lastIngestionTime,
            storedBytes,
          })
        ),
        nextToken: res.nextToken,
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{
    Querystring: {
      groupName: string;
      streamName?: string;
      filterPattern?: string;
      limit?: string;
      startTime?: string;
      nextToken?: string;
    };
  }>('/events', async (req, reply) => {
    try {
      const { groupName, streamName, filterPattern, nextToken } = req.query;
      if (!groupName) {
        return reply.status(400).send({ error: true, code: 'BadRequest', message: 'groupName is required' });
      }
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const startTime = req.query.startTime ? parseInt(req.query.startTime, 10) : undefined;

      const res = await logsClient.send(
        new FilterLogEventsCommand({
          logGroupName: groupName,
          logStreamNames: streamName ? [streamName] : undefined,
          filterPattern: filterPattern || undefined,
          limit: Math.min(limit, 10000),
          startTime,
          nextToken,
        })
      );
      return reply.send({
        events: (res.events ?? []).map(
          ({ eventId, logStreamName, timestamp, message, ingestionTime }) => ({
            eventId,
            logStreamName,
            timestamp,
            message,
            ingestionTime,
          })
        ),
        nextToken: res.nextToken,
        searchedLogStreams: res.searchedLogStreams,
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });
}
