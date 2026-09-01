# Architecture

## Current slice

Phase 0/1 establishes the durable contracts beneath the Creative Automation Engine. The API and worker
directories are service boundaries, not deployable products yet. Domain code lives in packages so that a
future Next.js UI, API service, and workflow worker consume the same schemas and validators.

```text
Client (future)
  -> API boundary
      -> PostgreSQL (versioned specs and approvals)
      -> S3-compatible storage (immutable media)
      -> workflow worker boundary
          -> provider adapters (mock-only today)
          -> deterministic validators
```

## Decisions

### TypeScript across product boundaries

The reference specification allows FastAPI or NestJS. A TypeScript-first monorepo was selected so the later
Next.js storyboard UI, API, workers, and package contracts share the same inferred types. An HTTP framework is
deferred until the Phase 2 endpoints are implemented.

### Zod is the canonical executable schema

Each contract is strict: unknown fields fail validation, domain refinements return structured paths, and
TypeScript types are inferred from the runtime schema. This avoids separate interface and validation models
drifting apart.

### Relational identity, JSONB revisions

Core ownership and lineage relationships are relational. Creative documents remain JSONB within immutable
project revisions, matching the specification's need for exact historical replay without flattening every
creative field into database columns.

### Immutable media, deletable personal data

The asset table rejects content mutation. A changed generation creates a new asset. Deletion remains possible
so the future personal-data policy can hard-delete or crypto-delete user identity assets.

### Brand time is a timeline calculation

Brand validation uses each shot's edit start and declared brand screen-time target. The reference campaign
policy is data supplied to a generic validator; it is not embedded in the validation algorithm.

## Future workflow boundary

The durable state machine, human waits, retries, budget guards, and idempotency records belong to Phase 4 and
beyond. No in-process pseudo-orchestrator is introduced in Phase 1 because it would create durability semantics
that cannot survive a restart.
