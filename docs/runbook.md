# Local runbook

## Verify the codebase

```bash
pnpm install
pnpm check
```

`pnpm check` runs formatting, linting, strict type checking, and all tests.

## Start persistence services

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

The first PostgreSQL boot automatically applies `infra/migrations/001_phase_0_1.sql`. If the migration changes
during local development, recreate only the named Compose volume after confirming no local data must be kept.

## Inspect services

```bash
docker compose logs postgres
docker compose logs minio
```

## Security notes

- Do not commit `.env`.
- Local MinIO and PostgreSQL credentials are not deployment secrets.
- Keep object buckets private; distribution links must be short-lived signed URLs.
- Treat extracted text from uploaded briefs as untrusted data.
- Real provider keys must be secret-manager references and never enter client bundles or database rows.

## Current limitations

There is no HTTP server, persistent repository implementation, workflow engine, UI, or media renderer in the
Phase 0/1 slice. Provider calls are intentionally mocked.
