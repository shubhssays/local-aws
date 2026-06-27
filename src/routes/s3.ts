import type { FastifyInstance } from 'fastify';
import {
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../aws.js';
import { pipeline } from 'node:stream/promises';
import type { MultipartFile } from '@fastify/multipart';

export async function s3Routes(server: FastifyInstance) {
  // GET /api/s3/buckets — list all buckets
  server.get('/buckets', async (req, reply) => {
    const res = await s3Client.send(new ListBucketsCommand({}));
    return reply.send({ buckets: res.Buckets ?? [] });
  });

  // POST /api/s3/buckets — create bucket
  server.post<{ Body: { name: string } }>('/buckets', async (req, reply) => {
    await s3Client.send(new CreateBucketCommand({ Bucket: req.body.name }));
    return reply.send({ success: true });
  });

  // DELETE /api/s3/buckets/:bucket — delete bucket
  server.delete<{ Params: { bucket: string } }>('/buckets/:bucket', async (req, reply) => {
    await s3Client.send(new DeleteBucketCommand({ Bucket: req.params.bucket }));
    return reply.send({ success: true });
  });

  // GET /api/s3/buckets/:bucket/objects — list objects
  server.get<{ Params: { bucket: string }; Querystring: { prefix?: string; continuationToken?: string } }>(
    '/buckets/:bucket/objects',
    async (req, reply) => {
      const { bucket } = req.params;
      const { prefix, continuationToken } = req.query;
      const res = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: 100,
          Delimiter: '/',
        })
      );
      return reply.send({
        objects: res.Contents ?? [],
        commonPrefixes: res.CommonPrefixes ?? [],
        nextToken: res.NextContinuationToken,
        isTruncated: res.IsTruncated,
      });
    }
  );

  // GET /api/s3/buckets/:bucket/objects/download — download a file
  server.get<{ Params: { bucket: string }; Querystring: { key: string } }>(
    '/buckets/:bucket/objects/download',
    async (req, reply) => {
      const { bucket } = req.params;
      const { key } = req.query;

      const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      const res = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

      const filename = key.split('/').pop() ?? key;
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.header('Content-Type', head.ContentType ?? 'application/octet-stream');
      if (head.ContentLength) reply.header('Content-Length', head.ContentLength);

      return reply.send(res.Body);
    }
  );

  // GET /api/s3/buckets/:bucket/objects/view — view file content (text/JSON)
  server.get<{ Params: { bucket: string }; Querystring: { key: string } }>(
    '/buckets/:bucket/objects/view',
    async (req, reply) => {
      const { bucket } = req.params;
      const { key } = req.query;
      const res = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const contentType = res.ContentType ?? 'application/octet-stream';
      const isText =
        contentType.startsWith('text/') ||
        contentType.includes('json') ||
        contentType.includes('xml') ||
        contentType.includes('javascript') ||
        contentType.includes('yaml');

      if (!isText) {
        return reply.send({ content: null, contentType, binary: true });
      }

      const body = await res.Body?.transformToString();
      return reply.send({ content: body, contentType, binary: false });
    }
  );

  // POST /api/s3/buckets/:bucket/objects — upload a file (multipart)
  server.post<{ Params: { bucket: string }; Querystring: { prefix?: string } }>(
    '/buckets/:bucket/objects',
    async (req, reply) => {
      const { bucket } = req.params;
      const { prefix = '' } = req.query;

      const parts = req.files();
      const uploaded: string[] = [];

      for await (const part of parts) {
        const key = prefix
          ? `${prefix.endsWith('/') ? prefix : `${prefix}/`}${part.filename}`
          : part.filename;
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: part.mimetype,
          })
        );
        uploaded.push(key);
      }

      return reply.send({ uploaded });
    }
  );

  // DELETE /api/s3/buckets/:bucket/objects — delete an object
  server.delete<{ Params: { bucket: string }; Body: { key: string } }>(
    '/buckets/:bucket/objects',
    async (req, reply) => {
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: req.params.bucket, Key: req.body.key })
      );
      return reply.send({ success: true });
    }
  );
}
