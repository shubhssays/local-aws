import type { FastifyInstance } from 'fastify';
import {
  ListSecretsCommand,
  CreateSecretCommand,
  GetSecretValueCommand,
  PutSecretValueCommand,
  DeleteSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import {
  DescribeParametersCommand,
  PutParameterCommand,
  GetParameterCommand,
  DeleteParameterCommand,
  type ParameterType,
} from '@aws-sdk/client-ssm';
import { secretsClient, ssmClient } from '../aws.js';
import { sendAwsError } from '../lib/aws-error.js';

export async function secretsRoutes(server: FastifyInstance) {
  server.get('/manager', async (_req, reply) => {
    try {
      const res = await secretsClient.send(new ListSecretsCommand({ MaxResults: 100 }));
      return reply.send({
        secrets: (res.SecretList ?? []).map(({ Name, Description, LastChangedDate, Tags }) => ({
          name: Name,
          description: Description,
          lastChangedDate: LastChangedDate,
          tags: Tags,
        })),
        nextToken: res.NextToken,
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Body: { name: string; secretString: string } }>('/manager', async (req, reply) => {
    try {
      const { name, secretString } = req.body;
      const res = await secretsClient.send(
        new CreateSecretCommand({ Name: name, SecretString: secretString })
      );
      return reply.send({ arn: res.ARN, name: res.Name, versionId: res.VersionId });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Params: { name: string } }>('/manager/:name', async (req, reply) => {
    try {
      const res = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: req.params.name })
      );
      return reply.send({
        arn: res.ARN,
        name: res.Name,
        versionId: res.VersionId,
        secretString: res.SecretString,
        createdDate: res.CreatedDate,
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.put<{ Params: { name: string }; Body: { secretString: string } }>(
    '/manager/:name',
    async (req, reply) => {
      try {
        const res = await secretsClient.send(
          new PutSecretValueCommand({
            SecretId: req.params.name,
            SecretString: req.body.secretString,
          })
        );
        return reply.send({ arn: res.ARN, name: res.Name, versionId: res.VersionId });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.delete<{ Params: { name: string } }>('/manager/:name', async (req, reply) => {
    try {
      const res = await secretsClient.send(
        new DeleteSecretCommand({ SecretId: req.params.name, ForceDeleteWithoutRecovery: true })
      );
      return reply.send({ arn: res.ARN, name: res.Name, deletionDate: res.DeletionDate });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Querystring: { nextToken?: string; maxResults?: string } }>(
    '/parameters',
    async (req, reply) => {
      try {
        const maxResults = req.query.maxResults ? parseInt(req.query.maxResults, 10) : 50;
        const res = await ssmClient.send(
          new DescribeParametersCommand({
            MaxResults: Math.min(maxResults, 50),
            NextToken: req.query.nextToken,
          })
        );
        return reply.send({
          parameters: (res.Parameters ?? []).map(
            ({ Name, Type, LastModifiedDate, Version, Description }) => ({
              name: Name,
              type: Type,
              lastModifiedDate: LastModifiedDate,
              version: Version,
              description: Description,
            })
          ),
          nextToken: res.NextToken,
        });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.post<{
    Body: { name: string; value: string; type?: 'String' | 'SecureString' };
  }>('/parameters', async (req, reply) => {
    try {
      const { name, value, type = 'String' } = req.body;
      const res = await ssmClient.send(
        new PutParameterCommand({
          Name: name,
          Value: value,
          Type: type as ParameterType,
          Overwrite: true,
        })
      );
      return reply.send({ version: res.Version, tier: res.Tier });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Params: { name: string } }>('/parameters/:name', async (req, reply) => {
    try {
      const res = await ssmClient.send(
        new GetParameterCommand({ Name: req.params.name, WithDecryption: true })
      );
      const param = res.Parameter;
      return reply.send({
        name: param?.Name,
        type: param?.Type,
        value: param?.Value,
        version: param?.Version,
        lastModifiedDate: param?.LastModifiedDate,
        arn: param?.ARN,
      });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.delete<{ Params: { name: string } }>('/parameters/:name', async (req, reply) => {
    try {
      await ssmClient.send(new DeleteParameterCommand({ Name: req.params.name }));
      return reply.send({ success: true });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });
}
