# Creative Automation Engine

A versioned, inspectable production pipeline that converts a campaign idea into structured creative
specifications, shot plans, generated assets, deterministic renders, and auditable deliverables.

This repository currently implements **Phase 0 + Phase 1** of the V1 technical specification dated
1 September 2026. It deliberately contains no real AI provider calls and cannot generate media yet.

## What is implemented

- pnpm TypeScript monorepo boundaries for web, API, workers, domain packages, and infrastructure
- strict Zod contracts for CreativeSpec, StorySpec, SceneSpec, ShotSpec, Asset, GenerationJob,
  QAResult, Approval, Timeline, Render, and CharacterReference
- deterministic runtime, scene-budget, face-time, and brand-presence validators
- PostgreSQL migration for projects, revisions, scenes, shots, assets, jobs, QA results, and approvals
- immutable asset enforcement at both schema and database levels
- local PostgreSQL and private MinIO object storage via Docker Compose
- versioned reference BrandPack, StylePack, CampaignPack, and prompt templates
- provider-neutral video interface and an in-memory mock (no external request)
- unit/integration tests, strict TypeScript, ESLint, Prettier, and CI

## Prerequisites

- Node.js 22 or newer
- pnpm 11.19.0
- Docker with Compose (only needed for local persistence services)

## Setup

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm check
```

PostgreSQL listens on `localhost:5432`. MinIO's S3 endpoint is `localhost:9000`, and its local
console is `localhost:9001`. The development credentials in `.env.example` are intentionally local-
only and must never be reused in deployed environments.

## Useful commands

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check
```

## Repository map

```text
apps/
  web/                    # Reserved for the Phase 5 Next.js UI
  api/                    # API service boundary
  worker/                 # Durable workflow activity boundary
packages/
  schemas/                # Canonical Zod schemas and inferred TS types
  validators/             # Deterministic pre-generation validators
  prompt-templates/       # Immutable/versioned planning contracts
  brand-packs/            # Long-lived brand configuration
  style-packs/            # Reusable creative grammar
  campaign-packs/         # Campaign-specific constraints
  provider-adapters/      # Stable provider interfaces and mocks
  renderer/ qa/ shared/   # Later-phase package boundaries
infra/
  migrations/             # PostgreSQL schema
  docker/ terraform/      # Local and future deployment boundaries
tests/
  unit/ integration/ golden/ fixtures/
docs/
```

## Design guardrails

- Structured decisions precede any generative call.
- An approved pack version or asset is never mutated in place.
- Provider interfaces are isolated from domain logic.
- Validators return typed issue codes that API/UI clients can act on.
- Edit durations, not raw source clip lengths, drive runtime and face-time calculations.
- Official logos, legal copy, supers, and end cards are deterministic overlays.
- Uploaded documents are untrusted input and cannot override system, brand, or campaign policy.

## Phase boundary

The next build slice is Phase 2: project CRUD, revisions, uploads, immutable object registration,
short-lived signed URLs, and audit events. See [architecture](docs/architecture.md), [API roadmap](docs/api.md),
and [runbook](docs/runbook.md).
