# local-aws

A lightweight web console for managing **S3** and **SQS** against [LocalStack](https://localstack.cloud/) (or any S3/SQS-compatible endpoint). Browse buckets, upload files, inspect queues, and publish messages from a single local UI.

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [LocalStack](https://docs.localstack.cloud/getting-started/) running locally (default: `http://localhost:4566`)

Start LocalStack with S3 and SQS enabled, for example:

```bash
localstack start
```

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:4580](http://localhost:4580).

For production-style usage:

```bash
npm run build
npm start
```

## Configuration

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4580` | HTTP port for the web UI and API |
| `HOST` | `0.0.0.0` | Bind address |
| `AWS_ENDPOINT_URL` | `http://localhost:4566` | LocalStack (or custom) endpoint |
| `AWS_DEFAULT_REGION` | `us-east-1` | AWS region passed to SDK clients |

LocalStack uses dummy credentials (`test` / `test`), which are configured automatically in `src/aws.ts`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Build with watch mode and start the server |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled server |
| `npm run typecheck` | Type-check without emitting |
| `npm run clean` | Remove `dist/` |

## Features

### SQS

- List queues with message counts and attributes
- Create standard or FIFO queues
- Publish messages (JSON or plain text)
- Peek at messages without deleting them
- Purge or delete queues

### S3

- List and create buckets
- Browse objects with folder-style prefixes
- Upload files (up to 100 MB)
- View text/JSON content inline
- Download or delete objects

## API

All routes are prefixed with `/api`.

### SQS (`/api/sqs`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/queues` | List queues with attributes |
| `POST` | `/queues` | Create a queue (`{ name, fifo? }`) |
| `DELETE` | `/queues` | Delete a queue (`{ url }`) |
| `POST` | `/queues/purge` | Purge a queue (`{ url }`) |
| `POST` | `/messages/send` | Send a message (`{ url, body, attributes? }`) |
| `POST` | `/messages/peek` | Peek messages (`{ url, max? }`) |
| `POST` | `/messages/delete` | Delete a message (`{ url, receiptHandle }`) |

### S3 (`/api/s3`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/buckets` | List buckets |
| `POST` | `/buckets` | Create a bucket (`{ name }`) |
| `DELETE` | `/buckets/:bucket` | Delete a bucket |
| `GET` | `/buckets/:bucket/objects` | List objects (`?prefix=&continuationToken=`) |
| `GET` | `/buckets/:bucket/objects/download` | Download an object (`?key=`) |
| `GET` | `/buckets/:bucket/objects/view` | View text/JSON content (`?key=`) |
| `POST` | `/buckets/:bucket/objects` | Upload files (multipart, `?prefix=`) |
| `DELETE` | `/buckets/:bucket/objects` | Delete an object (`{ key }`) |

## Project structure

```
local-aws/
├── public/          # Static web UI (HTML, CSS, JS)
├── src/
│   ├── aws.ts       # S3/SQS SDK clients
│   ├── server.ts    # Fastify entry point
│   └── routes/      # API route handlers
├── tsup.config.ts
└── tsconfig.json
```

## License

Private — see `package.json`.
