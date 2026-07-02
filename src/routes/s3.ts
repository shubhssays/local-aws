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
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectTaggingCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, getActiveAwsProfile } from '../aws.js';
import { sendAwsError } from '../lib/aws-error.js';

async function emptyBucket(bucket: string) {
  let token: string | undefined;
  do {
    const list = await s3Client.send(
      new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
    );
    const keys = (list.Contents ?? []).map((o) => ({ Key: o.Key! }));
    if (keys.length) {
      await s3Client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
    }
    token = list.NextContinuationToken;
  } while (token);
}

export async function s3Routes(server: FastifyInstance) {
  server.get('/buckets', async (_req, reply) => {
    try {
      const res = await s3Client.send(new ListBucketsCommand({}));
      return reply.send({ buckets: res.Buckets ?? [] });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Body: { name: string } }>('/buckets', async (req, reply) => {
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: req.body.name }));
      return reply.send({ success: true });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.delete<{ Params: { bucket: string } }>('/buckets/:bucket', async (req, reply) => {
    try {
      await emptyBucket(req.params.bucket);
      await s3Client.send(new DeleteBucketCommand({ Bucket: req.params.bucket }));
      return reply.send({ success: true });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.post<{ Params: { bucket: string } }>('/buckets/:bucket/empty', async (req, reply) => {
    try {
      await emptyBucket(req.params.bucket);
      return reply.send({ success: true });
    } catch (err) {
      return sendAwsError(reply, err);
    }
  });

  server.get<{ Params: { bucket: string }; Querystring: { prefix?: string; continuationToken?: string } }>(
    '/buckets/:bucket/objects',
    async (req, reply) => {
      try {
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
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.get<{ Params: { bucket: string }; Querystring: { key: string; expires?: string } }>(
    '/buckets/:bucket/objects/presign',
    async (req, reply) => {
      try {
        const { bucket } = req.params;
        const { key, expires = '3600' } = req.query;
        const url = await getSignedUrl(
          s3Client,
          new GetObjectCommand({ Bucket: bucket, Key: key }),
          { expiresIn: parseInt(expires, 10) }
        );
        return reply.send({ url });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.get<{ Params: { bucket: string }; Querystring: { key: string } }>(
    '/buckets/:bucket/objects/download',
    async (req, reply) => {
      try {
        const { bucket } = req.params;
        const { key } = req.query;
        const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        const res = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const filename = key.split('/').pop() ?? key;
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        reply.header('Content-Type', head.ContentType ?? 'application/octet-stream');
        if (head.ContentLength) reply.header('Content-Length', head.ContentLength);
        return reply.send(res.Body);
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.get<{ Params: { bucket: string }; Querystring: { key: string } }>(
    '/buckets/:bucket/objects/view',
    async (req, reply) => {
      try {
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
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.get<{ Params: { bucket: string }; Querystring: { key: string; expires?: string } }>(
    '/buckets/:bucket/objects/details',
    async (req, reply) => {
      try {
        const { bucket } = req.params;
        const { key, expires = '3600' } = req.query;
        const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

        let tags: Record<string, string> = {};
        try {
          const tagRes = await s3Client.send(new GetObjectTaggingCommand({ Bucket: bucket, Key: key }));
          tags = Object.fromEntries(
            (tagRes.TagSet ?? [])
              .filter((tag) => tag.Key)
              .map((tag) => [tag.Key!, tag.Value ?? ''])
          );
        } catch {
          tags = {};
        }

        const profile = getActiveAwsProfile();
        const endpoint = profile.endpoint.replace(/\/$/, '');
        const filename = key.split('/').pop() ?? key;
        const extension = filename.includes('.') ? (filename.split('.').pop() ?? '') : '';
        const folderPath = key.includes('/') ? key.slice(0, key.lastIndexOf('/') + 1) : '';
        const presignedUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({ Bucket: bucket, Key: key }),
          { expiresIn: parseInt(expires, 10) }
        );

        let endpointHost = endpoint;
        try {
          endpointHost = new URL(endpoint).host;
        } catch {
          endpointHost = endpoint.replace(/^https?:\/\//, '');
        }

        return reply.send({
          bucket,
          key,
          filename,
          extension,
          folderPath,
          region: profile.region,
          arn: `arn:aws:s3:::${bucket}/${key}`,
          s3Uri: `s3://${bucket}/${key}`,
          pathStyleUrl: `${endpoint}/${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
          virtualHostUrl: `https://${bucket}.${endpointHost}/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
          downloadUrl: `/api/s3/buckets/${encodeURIComponent(bucket)}/objects/download?key=${encodeURIComponent(key)}`,
          presignedUrl,
          properties: {
            contentType: head.ContentType ?? null,
            contentLength: head.ContentLength ?? null,
            lastModified: head.LastModified ?? null,
            etag: head.ETag ?? null,
            storageClass: head.StorageClass ?? null,
            versionId: head.VersionId ?? null,
            serverSideEncryption: head.ServerSideEncryption ?? null,
            sseCustomerAlgorithm: head.SSECustomerAlgorithm ?? null,
            cacheControl: head.CacheControl ?? null,
            contentDisposition: head.ContentDisposition ?? null,
            contentEncoding: head.ContentEncoding ?? null,
            contentLanguage: head.ContentLanguage ?? null,
            expires: head.Expires ?? null,
            websiteRedirectLocation: head.WebsiteRedirectLocation ?? null,
            archiveStatus: head.ArchiveStatus ?? null,
            objectLockMode: head.ObjectLockMode ?? null,
            objectLockRetainUntilDate: head.ObjectLockRetainUntilDate ?? null,
            objectLockLegalHoldStatus: head.ObjectLockLegalHoldStatus ?? null,
            metadata: head.Metadata ?? {},
          },
          tags,
        });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.get<{ Params: { bucket: string }; Querystring: { key: string } }>(
    '/buckets/:bucket/objects/metadata',
    async (req, reply) => {
      try {
        const { bucket } = req.params;
        const { key } = req.query;
        const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return reply.send({
          contentType: head.ContentType,
          contentLength: head.ContentLength,
          lastModified: head.LastModified,
          metadata: head.Metadata ?? {},
          etag: head.ETag,
        });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.put<{ Params: { bucket: string }; Body: { key: string; metadata?: Record<string, string>; contentType?: string } }>(
    '/buckets/:bucket/objects/metadata',
    async (req, reply) => {
      try {
        const { bucket } = req.params;
        const { key, metadata, contentType } = req.body;
        const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        await s3Client.send(
          new CopyObjectCommand({
            Bucket: bucket,
            Key: key,
            CopySource: `${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
            Metadata: metadata ?? head.Metadata,
            MetadataDirective: 'REPLACE',
            ContentType: contentType ?? head.ContentType,
          })
        );
        return reply.send({ success: true });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.put<{ Params: { bucket: string }; Querystring: { prefix: string } }>(
    '/buckets/:bucket/objects/folder',
    async (req, reply) => {
      try {
        const { bucket } = req.params;
        let { prefix } = req.query;
        if (!prefix.endsWith('/')) prefix += '/';
        await s3Client.send(new PutObjectCommand({ Bucket: bucket, Key: prefix, Body: '' }));
        return reply.send({ key: prefix });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.post<{ Params: { bucket: string }; Body: { oldKey: string; newKey: string } }>(
    '/buckets/:bucket/objects/rename',
    async (req, reply) => {
      try {
        const { bucket } = req.params;
        const { oldKey, newKey } = req.body;
        if (!oldKey || !newKey) {
          return reply.status(400).send({ error: true, message: 'oldKey and newKey are required' });
        }
        await s3Client.send(
          new CopyObjectCommand({
            Bucket: bucket,
            Key: newKey,
            CopySource: `${bucket}/${encodeURIComponent(oldKey).replace(/%2F/g, '/')}`,
          })
        );
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: oldKey }));
        return reply.send({ success: true, key: newKey });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.post<{ Params: { bucket: string }; Body: { sourceKey: string; destBucket: string; destKey: string; move?: boolean } }>(
    '/buckets/:bucket/objects/copy',
    async (req, reply) => {
      try {
        const { bucket } = req.params;
        const { sourceKey, destBucket, destKey, move = false } = req.body;
        await s3Client.send(
          new CopyObjectCommand({
            Bucket: destBucket,
            Key: destKey,
            CopySource: `${bucket}/${encodeURIComponent(sourceKey).replace(/%2F/g, '/')}`,
          })
        );
        if (move) {
          await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: sourceKey }));
        }
        return reply.send({ success: true, destKey });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.post<{ Params: { bucket: string }; Querystring: { prefix?: string } }>(
    '/buckets/:bucket/objects',
    async (req, reply) => {
      try {
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
          await s3Client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: key,
              Body: Buffer.concat(chunks),
              ContentType: part.mimetype,
            })
          );
          uploaded.push(key);
        }
        return reply.send({ uploaded });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );

  server.delete<{ Params: { bucket: string }; Body: { key: string } }>(
    '/buckets/:bucket/objects',
    async (req, reply) => {
      try {
        await s3Client.send(
          new DeleteObjectCommand({ Bucket: req.params.bucket, Key: req.body.key })
        );
        return reply.send({ success: true });
      } catch (err) {
        return sendAwsError(reply, err);
      }
    }
  );
}
