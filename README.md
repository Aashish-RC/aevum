# Aevum — AI Core Platform

Aevum is a SaaS "Brain Factory" that creates, configures, and operates customized AI Brains across consumer and enterprise products.

## Architecture

Aevum consists of 20 cognitive pillars organized into 7 tiers:

- **Tier 0 — Perception**: Inputs (#1)
- **Tier 1 — Cognition**: Model Gateway (#2), Memory (#3), RAG (#4), NLU (#5), Reasoning (#6)
- **Tier 2 — Action**: Agents (#7), Orchestration (#8), Execution (#9), Workflow (#10)
- **Tier 3 — Output**: Output/Generation (#11)
- **Tier 4 — Personalization**: Recommender (#12), Identity/Profile (#13)
- **Tier 5 — Governance**: Guardrails (#14), Policy (#15)
- **Tier 6 — Operations**: State/Session (#16), Observability (#17), Evaluation (#18), Learning (#19), Versioning (#20)

## Repository Structure

```
aevum/
├── apps/
│   └── api/                # Fastify HTTP API gateway
├── services/
│   └── identity/           # Identity pillar core service
├── packages/
│   ├── shared/             # Domain types, errors, logger, config
│   ├── db/                 # Drizzle ORM schema & migrations
│   ├── crypto/             # Envelope encryption & crypto primitives
│   ├── storage/            # MinIO WORM client & local filesystem
│   └── sdk/                # Cross-product SSO Bridge SDK
├── infra/                  # Docker Compose setups for dev & test
└── docs/                   # Architecture specs and PR tracker
```

## Quick Start

### Prerequisites

- Node.js 22+ (LTS)
- pnpm 10+
- Docker Desktop

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Dev Infrastructure

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

### 3. Setup Environment

```bash
cp .env.example .env
```

### 4. Run Migrations & Start API

```bash
pnpm db:generate
pnpm db:migrate
pnpm dev
```

### 5. Run Tests & Linter

```bash
pnpm test
pnpm lint
```

## License

MIT License. Copyright (c) 2026 Aevum. All rights reserved.

