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
import type { AwsProfile } from './lib/settings.js';
import { getDefaultProfile } from './lib/settings.js';

type AwsBaseConfig = {
  region: string;
  endpoint: string;
  credentials: { accessKeyId: string; secretAccessKey: string };
};

function profileToConfig(profile: AwsProfile): AwsBaseConfig {
  return {
    region: profile.region,
    endpoint: profile.endpoint,
    credentials: {
      accessKeyId: profile.accessKeyId,
      secretAccessKey: profile.secretAccessKey,
    },
  };
}

function buildClients(config: AwsBaseConfig) {
  const dynamo = new DynamoDBClient(config);
  return {
    s3Client: new S3Client({ ...config, forcePathStyle: true }),
    sqsClient: new SQSClient(config),
    dynamoClient: dynamo,
    docClient: DynamoDBDocumentClient.from(dynamo, {
      marshallOptions: { removeUndefinedValues: true },
    }),
    snsClient: new SNSClient(config),
    secretsClient: new SecretsManagerClient(config),
    ssmClient: new SSMClient(config),
    lambdaClient: new LambdaClient(config),
    logsClient: new CloudWatchLogsClient(config),
    eventBridgeClient: new EventBridgeClient(config),
    sfnClient: new SFNClient(config),
  };
}

let activeProfile = getDefaultProfile();
let clients = buildClients(profileToConfig(activeProfile));

export function configureAws(profile: AwsProfile) {
  activeProfile = profile;
  clients = buildClients(profileToConfig(profile));
  syncExports();
}

export function getActiveAwsProfile(): AwsProfile {
  return activeProfile;
}

export function getAwsEndpoint(): string {
  return activeProfile.endpoint;
}

export let s3Client = clients.s3Client;
export let sqsClient = clients.sqsClient;
export let dynamoClient = clients.dynamoClient;
export let docClient = clients.docClient;
export let snsClient = clients.snsClient;
export let secretsClient = clients.secretsClient;
export let ssmClient = clients.ssmClient;
export let lambdaClient = clients.lambdaClient;
export let logsClient = clients.logsClient;
export let eventBridgeClient = clients.eventBridgeClient;
export let sfnClient = clients.sfnClient;

function syncExports() {
  s3Client = clients.s3Client;
  sqsClient = clients.sqsClient;
  dynamoClient = clients.dynamoClient;
  docClient = clients.docClient;
  snsClient = clients.snsClient;
  secretsClient = clients.secretsClient;
  ssmClient = clients.ssmClient;
  lambdaClient = clients.lambdaClient;
  logsClient = clients.logsClient;
  eventBridgeClient = clients.eventBridgeClient;
  sfnClient = clients.sfnClient;
}
