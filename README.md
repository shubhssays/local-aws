# local-aws

A lightweight web console for managing AWS services locally via [LocalStack](https://localstack.cloud/). Browse S3 buckets, inspect SQS queues, query DynamoDB tables, publish SNS messages, manage secrets, invoke Lambda functions, tail CloudWatch logs, send EventBridge events, and run Step Functions — all from one UI.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [LocalStack](https://docs.localstack.cloud/getting-started/) (Docker recommended)

## Quick start

Start LocalStack with the services you need:

```bash
docker compose up -d
```

Or run LocalStack directly:

```bash
localstack start
```

Then start the console:

```bash
npm install
npm run dev
```

Open [http://localhost:4580](http://localhost:4580).

### Desktop app (Electron)

Install **local-aws** as a normal app in your Applications / Start Menu — no `npm run electron:dev` needed after the first install.

**macOS** — run once from the project folder:

```bash
./local-aws-mac.sh
```

This builds the app (first time only), installs `local-aws.app` to **Applications**, and launches it. After that, open it from **Spotlight**, **Launchpad**, or the **Dock** like any other app.

To rebuild after code changes:

```bash
./local-aws-mac.sh --reinstall
```

Or manually:

```bash
npm run install:mac   # build + copy to /Applications
npm run open:mac      # launch installed app
```

**First launch on macOS:** Because the app is unsigned, you may need **Right-click → Open** the first time (not double-click).

**Windows:**

```bat
local-aws-windows.bat
```

Runs the NSIS installer and adds local-aws to the Start Menu.

**Linux:**

```bash
./local-aws-linux.sh
```

Installs an AppImage and desktop entry under your application menu.

**Developers** (hot reload):

```bash
npm run electron:dev
```

Build installers without installing:

```bash
npm run dist:mac    # .dmg + .app in release/
npm run dist:win    # NSIS installer in release/
npm run dist:linux  # AppImage + .deb in release/
```

The desktop app embeds the API server. **LocalStack must still run separately** (e.g. `docker compose up -d`).

Production-style CLI run:

```bash
npm run build
npm start
```

## Configuration

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4580` | HTTP port for the web UI and API |
| `HOST` | `0.0.0.0` | Bind address |
| `AWS_ENDPOINT_URL` | `http://localhost:4566` | LocalStack endpoint |
| `AWS_DEFAULT_REGION` | `us-east-1` | AWS region for SDK clients |

LocalStack uses dummy credentials (`test` / `test`), configured in [`src/aws.ts`](src/aws.ts).

## LocalStack services

The included [`docker-compose.yml`](docker-compose.yml) enables:

```
s3, sqs, dynamodb, sns, secretsmanager, ssm, lambda, logs, events, stepfunctions
```

The topbar shows how many services are reachable (e.g. `8/10 services connected`). Step Functions and some EventBridge features may require LocalStack Pro — errors are surfaced in the UI.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build with watch mode and start the server |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting |
| `npm run clean` | Remove `dist/` and `release/` |
| `npm run electron:dev` | Build and launch the Electron desktop app |
| `npm run electron:watch` | Rebuild and relaunch Electron on file changes |
| `npm run dist` | Build installers for the current OS (`release/`) |
| `npm run dist:mac` | Build macOS `.dmg` / `.zip` |
| `npm run dist:win` | Build Windows NSIS installer |
| `npm run dist:linux` | Build Linux AppImage and `.deb` |

## Features

### SQS
- List queues with message counts, DLQ info, FIFO badges
- Create queues with optional DLQ redrive policy
- Publish messages with message attributes
- Peek or consume messages (with visibility timeout)
- Redrive messages from DLQ back to source queue
- Purge or delete queues

### S3
- List, create, and delete buckets (auto-empty on delete)
- Browse objects with folder-style prefixes
- Upload files (up to 100 MB), create folders
- View text/JSON inline, download, copy/move objects
- Generate presigned URLs, edit object metadata

### DynamoDB
- List and create tables (partition + optional sort key)
- Scan and query items, put/update/delete items
- Seed tables from JSON arrays

### SNS
- List topics, create/delete topics (standard or FIFO)
- Publish messages, manage subscriptions
- Subscribe SQS queues to topics

### Secrets
- **Secrets Manager** — list, create, view, update, delete secrets
- **Parameter Store** — list, create, view, update, delete parameters
- Values masked by default with reveal and copy actions

### Lambda
- List functions with runtime/handler info
- Invoke with JSON payload, view response and logs link

### CloudWatch Logs
- Browse log groups and streams
- Tail log events with filter and auto-refresh

### EventBridge
- List rules and targets on the default bus
- Send custom events, manage rule targets

### Step Functions
- List state machines, start executions
- View execution history with failure highlighting

## API reference

All routes are prefixed with `/api`. Health check: `GET /api/health`.

### Health (`/api/health`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Probe LocalStack services, return `{ ok, endpoint, services }` |

### SQS (`/api/sqs`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/queues` | List queues with attributes |
| POST | `/queues` | Create queue `{ name, fifo?, dlqArn?, maxReceiveCount? }` |
| DELETE | `/queues` | Delete queue `{ url }` |
| POST | `/queues/purge` | Purge queue `{ url }` |
| POST | `/messages/send` | Send message `{ url, body, attributes? }` |
| POST | `/messages/peek` | Peek messages `{ url, max?, visibilityTimeout? }` |
| POST | `/messages/receive` | Receive/consume `{ url, max?, visibilityTimeout?, deleteAfter? }` |
| POST | `/messages/delete` | Delete message `{ url, receiptHandle }` |
| POST | `/messages/redrive` | Redrive from DLQ `{ dlqUrl, sourceUrl, max? }` |

### S3 (`/api/s3`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/buckets` | List buckets |
| POST | `/buckets` | Create bucket `{ name }` |
| DELETE | `/buckets/:bucket` | Delete bucket (empties first) |
| POST | `/buckets/:bucket/empty` | Empty bucket |
| GET | `/buckets/:bucket/objects` | List objects |
| GET | `/buckets/:bucket/objects/presign` | Presigned URL `?key=&expires=` |
| GET | `/buckets/:bucket/objects/download` | Download `?key=` |
| GET | `/buckets/:bucket/objects/view` | View text content `?key=` |
| GET | `/buckets/:bucket/objects/metadata` | Object metadata `?key=` |
| PUT | `/buckets/:bucket/objects/metadata` | Update metadata `{ key, metadata?, contentType? }` |
| PUT | `/buckets/:bucket/objects/folder` | Create folder `?prefix=` |
| POST | `/buckets/:bucket/objects/copy` | Copy/move `{ sourceKey, destBucket, destKey, move? }` |
| POST | `/buckets/:bucket/objects` | Upload (multipart) |
| DELETE | `/buckets/:bucket/objects` | Delete object `{ key }` |

### DynamoDB (`/api/dynamodb`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tables` | List tables |
| POST | `/tables` | Create table |
| DELETE | `/tables/:name` | Delete table |
| GET | `/tables/:name` | Describe table |
| POST | `/tables/:name/scan` | Scan items |
| POST | `/tables/:name/query` | Query items |
| PUT | `/tables/:name/items` | Put item |
| PATCH | `/tables/:name/items` | Update item |
| DELETE | `/tables/:name/items` | Delete item |
| POST | `/tables/:name/seed` | Batch seed `{ items: [] }` |

### SNS (`/api/sns`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/topics` | List topics |
| POST | `/topics` | Create topic `{ name, fifo? }` |
| DELETE | `/topics/*` | Delete topic (URL-encoded ARN) |
| GET | `/topics/:arn/subscriptions` | List subscriptions |
| POST | `/topics/:arn/subscribe` | Subscribe `{ protocol, endpoint }` |
| DELETE | `/subscriptions/:arn` | Unsubscribe |
| POST | `/topics/:arn/publish` | Publish `{ message, subject?, attributes? }` |

### Secrets (`/api/secrets`)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST/GET/PUT/DELETE | `/manager`, `/manager/:name` | Secrets Manager CRUD |
| GET/POST/GET/DELETE | `/parameters`, `/parameters/:name` | SSM Parameter Store CRUD |

### Lambda (`/api/lambda`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/functions` | List functions |
| GET | `/functions/:name` | Get function details |
| POST | `/functions/:name/invoke` | Invoke `{ payload?, invocationType? }` |

### Logs (`/api/logs`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/groups` | List log groups |
| GET | `/streams?groupName=` | List streams |
| GET | `/events?groupName=&streamName=&filterPattern=&limit=` | Filter log events |

### EventBridge (`/api/eventbridge`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/buses` | List event buses |
| GET/POST/DELETE | `/rules` | Manage rules |
| GET/PUT | `/rules/:name/targets` | Rule targets |
| POST | `/events` | PutEvents |

### Step Functions (`/api/stepfunctions`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/machines` | List state machines |
| GET | `/machines/:arn` | Describe machine |
| POST | `/machines/:arn/executions` | Start execution |
| GET | `/machines/:arn/executions` | List executions |
| GET | `/executions/:arn` | Execution details + history |

## Project structure

```
local-aws/
├── public/
│   ├── index.html       # UI shell and page panels
│   ├── app.css          # Styles
│   └── js/              # ES module frontend
├── src/
│   ├── create-server.ts # Shared Fastify app factory
│   ├── server.ts        # CLI entry (browser)
│   ├── electron/main.ts # Electron main process
│   ├── aws.ts           # SDK client factory
│   └── routes/          # Per-service API routes
├── build/               # Optional app icons for electron-builder
├── docker-compose.yml   # LocalStack with all services
└── tsup.config.ts
```

## License

MIT — see [LICENSE](LICENSE).
