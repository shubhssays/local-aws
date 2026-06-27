import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { SSMClient } from '@aws-sdk/client-ssm';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { SFNClient } from '@aws-sdk/client-sfn';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const LOCALSTACK_ENDPOINT = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
export const REGION = process.env.AWS_DEFAULT_REGION ?? 'us-east-1';
export const CREDENTIALS = { accessKeyId: 'test', secretAccessKey: 'test' };

const baseConfig = {
  region: REGION,
  endpoint: LOCALSTACK_ENDPOINT,
  credentials: CREDENTIALS,
};

export const s3Client = new S3Client({ ...baseConfig, forcePathStyle: true });
export const sqsClient = new SQSClient(baseConfig);
export const dynamoClient = new DynamoDBClient(baseConfig);
export const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});
export const snsClient = new SNSClient(baseConfig);
export const secretsClient = new SecretsManagerClient(baseConfig);
export const ssmClient = new SSMClient(baseConfig);
export const lambdaClient = new LambdaClient(baseConfig);
export const logsClient = new CloudWatchLogsClient(baseConfig);
export const eventBridgeClient = new EventBridgeClient(baseConfig);
export const sfnClient = new SFNClient(baseConfig);
