# local-aws

A lightweight dev console for managing AWS services locally via [LocalStack](https://localstack.cloud/). Browse S3 buckets, inspect SQS queues, query DynamoDB tables, publish SNS messages, manage secrets, invoke Lambda functions, tail CloudWatch logs, send EventBridge events, and run Step Functions — all from one UI.

Available as a **web app** (browser) or **desktop app** (macOS, Windows, Linux).

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Step-by-step: Web console](#step-by-step-web-console)
3. [Step-by-step: Desktop app (macOS)](#step-by-step-desktop-app-macos)
4. [Step-by-step: Desktop app (Windows & Linux)](#step-by-step-desktop-app-windows--linux)
5. [Step-by-step: Settings & AWS profiles](#step-by-step-settings--aws-profiles)
6. [Step-by-step: S3 object inspector](#step-by-step-s3-object-inspector)
7. [Configuration](#configuration)
8. [LocalStack services](#localstack-services)
9. [Features](#features)
10. [Scripts reference](#scripts-reference)
11. [API reference](#api-reference)
12. [Project structure](#project-structure)

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| [Node.js](https://nodejs.org/) 20+ | Required to build and run from source |
| [LocalStack](https://docs.localstack.cloud/getting-started/) | Docker recommended (`docker compose up -d`) |
| Docker (optional) | Easiest way to run LocalStack with all services |

LocalStack uses dummy credentials (`test` / `test`). The console connects to whatever endpoint you configure (default `http://localhost:4566`).

---

## Step-by-step: Web console

Use this path if you prefer the browser or are developing the project.

### 1. Clone and install dependencies

```bash
git clone https://github.com/shubhssays/local-aws.git
cd local-aws
npm install
```

### 2. Start LocalStack

From the project folder:

```bash
docker compose up -d
```

Wait until LocalStack is healthy (`curl -s http://localhost:4566/_localstack/health`).

### 3. Start the console

**Development** (auto-rebuild on file changes):

```bash
npm run dev
```

**Production-style** (build once, then run):

```bash
npm run build
npm start
```

### 4. Open the UI

Go to [http://localhost:4580](http://localhost:4580).

The top bar shows connection status (e.g. `LocalStack · 8/10 services connected`).

### 5. Verify services

- Green dot in the top bar = at least one LocalStack service is reachable.
- Click **Refresh** (top right) to reload all data.
- If services show as unreachable, confirm LocalStack is running and the endpoint in **Settings → AWS Profiles** matches your setup.

---

## Step-by-step: Desktop app (macOS)

Install **local-aws** into **Applications** like a normal Mac app.

### 1. Prerequisites

- Node.js 20+ (for the one-time build)
- LocalStack running (`docker compose up -d`)

### 2. Build, install, and launch

From the project folder:

```bash
./local-aws-mac.sh
```

The script will:

1. **Quit** local-aws if it is already running
2. **Uninstall** any existing `/Applications/local-aws.app`
3. **Build** a fresh `.app` (`npm run dist:mac`)
4. **Install** to Applications
5. **Open** the app

> First install may take a few minutes while dependencies and the Electron bundle are built.

### 3. Open from Applications (next time)

Use **Spotlight**, **Launchpad**, or the **Dock** — no terminal needed.

To launch without rebuilding:

```bash
./local-aws-mac.sh --open-only
```

### 4. First launch security (unsigned app)

macOS may block the first open. Use **Right-click → Open** on `local-aws.app` (not double-click), then confirm **Open**.

### 5. After code changes

Run the installer script again — it always uninstalls the old app and installs a fresh build:

```bash
./local-aws-mac.sh
```

### 6. Keep LocalStack running

The desktop app embeds the API server but **does not** run LocalStack. Start it separately:

```bash
docker compose up -d
```

---

## Step-by-step: Desktop app (Windows & Linux)

### Windows

1. Install [Node.js](https://nodejs.org/) 20+.
2. Start LocalStack (Docker or standalone).
3. Double-click or run:

   ```bat
   local-aws-windows.bat
   ```

4. Follow the NSIS installer; local-aws appears in the **Start Menu**.

### Linux

1. Install Node.js 20+.
2. Start LocalStack.
3. Run:

   ```bash
   chmod +x local-aws-linux.sh
   ./local-aws-linux.sh
   ```

4. An AppImage is installed with a desktop menu entry.

### Build installers only (no install)

```bash
npm run dist:mac    # .dmg + .app in release/
npm run dist:win    # NSIS installer in release/
npm run dist:linux  # AppImage + .deb in release/
```

### Developers (hot reload)

```bash
npm run electron:dev
```

---

## Step-by-step: Settings & AWS profiles

Configure the server and switch between LocalStack (or other AWS-compatible) endpoints.

### Open Settings

- Sidebar → **App → Settings**, or
- Click the **gear icon** in the top bar.

### Server host & port

| Field | Default | Notes |
|-------|---------|--------|
| Host | `0.0.0.0` | Use `127.0.0.1` to bind localhost only |
| Port | `4580` | Web UI and API port |

1. Enter host and port.
2. Click **Save settings**.
3. **Restart the app** (quit and reopen) for host/port changes to take effect.

Settings are stored at:

- **CLI / browser:** `~/.config/local-aws/settings.json`
- **Electron:** `{userData}/settings.json`

Environment variables `HOST` and `PORT` override saved values at startup.

### AWS profiles

Profiles store **endpoint**, **region**, and **credentials** for AWS SDK clients.

#### Create a profile

1. Go to **Settings → AWS Profiles**.
2. Click **New profile**.
3. Fill in:
   - **Profile name** — e.g. `LocalStack`, `Dev`, `Staging`
   - **Endpoint URL** — default `http://localhost:4566`
   - **Region** — default `us-east-1`
   - **Access key / Secret key** — default `test` / `test` for LocalStack
4. Click **Save profile**.

#### Switch profiles

1. Click a profile in the list.
2. Click **Use profile**.
3. The top bar refreshes and all service data reloads — **no restart required**.

#### Delete a profile

1. Select the profile.
2. Click **Delete** (you must keep at least one profile).

The **active profile** is restored automatically the next time you open the app.

---

## Step-by-step: S3 object inspector

Inspect any S3 object with full metadata, tags, URLs, and preview.

### 1. Open the Object Browser

Sidebar → **S3 → Object Browser**.

### 2. Select a bucket

Click a bucket card or pick one from the empty-state list.

### 3. Open object details

- **Click a file row**, or
- Click the **info** button on a row.

An **object inspector** panel opens below the file table.

### 4. Use the action toolbar

| Action | Description |
|--------|-------------|
| **Preview** | Text/JSON content or inline image preview |
| **Download** | Save the file locally |
| **Upload** | Upload more files to the current prefix |
| **Delete** | Remove the object |
| **Rename** | Change the object key (copy + delete) |
| **Copy** | Copy to another bucket/key |
| **Move** | Copy then delete source |

### 5. Browse tabs

| Tab | Contents |
|-----|----------|
| **Overview** | Name, size, dates, bucket, key, ARN, S3 URI, path-style URL, virtual-hosted URL, presigned URL |
| **Properties** | Content-Type, ETag, storage class, encryption, cache headers, object lock, etc. |
| **User Metadata** | `x-amz-meta-*` key/value pairs |
| **Tags** | S3 object tags |
| **Preview** | Rendered image or syntax-friendly text |

Use the **copy** button next to any field to copy ARN, URLs, or keys to the clipboard.

### 6. Close the inspector

Click **×** on the inspector header or navigate to another folder.

---

## Configuration

Copy `.env.example` to `.env` for CLI / `npm run dev`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4580` | HTTP port for the web UI and API |
| `HOST` | `0.0.0.0` | Bind address |
| `AWS_ENDPOINT_URL` | `http://localhost:4566` | Default profile endpoint at first run |
| `AWS_DEFAULT_REGION` | `us-east-1` | Default profile region at first run |

UI-based **Settings** and **AWS Profiles** are preferred for day-to-day use; they persist across restarts.

---

## LocalStack services

The included [`docker-compose.yml`](docker-compose.yml) enables:

```
s3, sqs, dynamodb, sns, secretsmanager, ssm, lambda, logs, events, stepfunctions
```

The topbar shows how many services are reachable (e.g. `LocalStack · 8/10 services connected`). Step Functions and some EventBridge features may require LocalStack Pro — errors are surfaced in the UI.

---

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
- **Object inspector** with full metadata, tags, URLs, and preview
- Upload files (up to 100 MB), create folders
- Download, rename, copy/move objects
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

---

## Scripts reference

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
| `npm run dist:mac` | Build macOS `.dmg` / `.app` |
| `npm run dist:win` | Build Windows NSIS installer |
| `npm run dist:linux` | Build Linux AppImage and `.deb` |
| `npm run install:mac` | Build and copy `.app` to `/Applications` |
| `npm run open:mac` | Launch installed macOS app |
| `./local-aws-mac.sh` | Uninstall old app, rebuild, install, open (macOS) |
| `./local-aws-mac.sh --open-only` | Open installed app without rebuilding |

---

## API reference

All routes are prefixed with `/api`. Health check: `GET /api/health`.

### Health (`/api/health`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Probe LocalStack services; returns `{ ok, endpoint, profile, services }` |

### Settings (`/api/settings`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Server settings, profiles, active profile |
| PUT | `/` | Update host/port `{ host, port }` |
| POST | `/reset` | Reset host/port to defaults |
| POST | `/profiles` | Create profile |
| PUT | `/profiles/:id` | Update profile |
| DELETE | `/profiles/:id` | Delete profile |
| POST | `/profiles/:id/activate` | Switch active profile |

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
| GET | `/buckets/:bucket/objects/details` | Full object details, tags, URLs `?key=` |
| GET | `/buckets/:bucket/objects/presign` | Presigned URL `?key=&expires=` |
| GET | `/buckets/:bucket/objects/download` | Download `?key=` |
| GET | `/buckets/:bucket/objects/view` | View text content `?key=` |
| GET | `/buckets/:bucket/objects/metadata` | Object metadata `?key=` |
| PUT | `/buckets/:bucket/objects/metadata` | Update metadata `{ key, metadata?, contentType? }` |
| PUT | `/buckets/:bucket/objects/folder` | Create folder `?prefix=` |
| POST | `/buckets/:bucket/objects/rename` | Rename `{ oldKey, newKey }` |
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

---

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
│   ├── aws.ts           # SDK client factory (profile-aware)
│   ├── lib/settings.ts  # Persisted server + profile settings
│   └── routes/          # Per-service API routes
├── build/               # Optional app icons for electron-builder
├── docker-compose.yml   # LocalStack with all services
├── local-aws-mac.sh     # macOS install script
├── local-aws-linux.sh   # Linux install script
├── local-aws-windows.bat
└── tsup.config.ts
```

---

## License

MIT — see [LICENSE](LICENSE).
