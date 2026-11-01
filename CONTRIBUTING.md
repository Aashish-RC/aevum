# Contributing to Aevum

Thank you for contributing to Aevum.

## Development Workflow

1. Create a branch following the `pr-13.X` convention.
2. Run `pnpm lint` and `pnpm test` prior to submitting code.
3. Keep commits structured: `PR 13.X: <description>`.

## Coding Standards

- **TypeScript Strict**: `strict: true`. Never use `any`, `@ts-ignore`, or unsafe type assertions.
- **File Headers**: Every `.ts` file must begin with the standard MIT copyright header.
- **License Compliance**: Aevum is a SaaS platform. AGPL-licensed code must never be merged into the repository. AGPL services (such as MinIO) operate strictly as external sidecars over network protocols. Merged code from MIT or Apache-2.0 sources must retain upstream copyright notices and strip upstream branding.
- **Formatting & Linting**: Managed by Biome. Run `pnpm lint` or `pnpm lint:fix`.
- **Testing**: Co-located `*.test.ts` files using Vitest.

