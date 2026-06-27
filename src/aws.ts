import { SQSClient } from '@aws-sdk/client-sqs';
import { S3Client } from '@aws-sdk/client-s3';

const LOCALSTACK_ENDPOINT = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
const REGION = process.env.AWS_DEFAULT_REGION ?? 'us-east-1';
const CREDENTIALS = { accessKeyId: 'test', secretAccessKey: 'test' };

export const sqsClient = new SQSClient({
  region: REGION,
  endpoint: LOCALSTACK_ENDPOINT,
  credentials: CREDENTIALS,
});

export const s3Client = new S3Client({
  region: REGION,
  endpoint: LOCALSTACK_ENDPOINT,
  credentials: CREDENTIALS,
  forcePathStyle: true,
});
