## Learned User Preferences

- Prefer splitting the frontend into `index.html`, `app.css`, and `app.js` rather than a single monolithic HTML file.
- Expects a polished, professional UI (SVG icons over emojis, custom dialogs, light/dark theme).
- When implementing attached plans, do not edit the plan file itself.
- Wants thorough end-to-end verification of functionality before considering work complete.

## Learned Workspace Facts

- Project is **local-aws** — a LocalStack dev console for S3 and SQS; Git remote is `https://github.com/shubhssays/local-aws`.
- Backend: Fastify + TypeScript (`tsup`); frontend: vanilla HTML/CSS/JS served from `public/` (no framework or bundler).
- LocalStack default endpoint `http://localhost:4566`; app runs on port **4580** by default.
- AWS SDK clients use dummy credentials (`test`/`test`) configured in `src/aws.ts`.
- Frontend theme preference stored in `localStorage` under key `local-aws-theme`.
- Static assets and API responses use no-cache headers to avoid stale data during development.
- On-disk workspace folder may still be `local-dev-console` while npm package name is `local-aws`.
- Planned expansion roadmap: DynamoDB → SNS → Secrets/SSM → Lambda + Logs → EventBridge + Step Functions; Phase 0 includes splitting `app.js` into ES modules under `public/js/`.
