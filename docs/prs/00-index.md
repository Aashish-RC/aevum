# Pillar #13: Identity — PR Tracker

| PR | Title | Status | Tests | Source |
|---|---|---|---|---|
| 13.0 | Repo skeleton + shared packages (db, crypto, storage, logger) | Completed | Smoke tests (5 passed) | — |
| 13.1 | Email/password auth + password policy validator | Completed | T13.1, T13.2, T13.17-T13.24, T13.40 (25 passed total) | Better Auth merge |
| 13.2 | Session manager + JWT issuance + refresh rotation | Completed | T13.3, T13.15 (30 passed total) | Better Auth merge |
| 13.3 | OAuth providers — Google + Apple | Pending | T13.4, T13.5 | Better Auth merge |
| 13.4 | OAuth providers — GitHub + GitLab + Microsoft | Pending | T13.6, T13.7, T13.8 | Better Auth merge |
| 13.5 | Token Vault with envelope encryption (Tink) | Pending | T13.10, T13.25, T13.26 | Tink merge |
| 13.6 | API Keys (user-level, scoped) | Pending | T13.11, T13.12 | Better Auth merge |
| 13.7 | Profile store (basic + AI) | Pending | T13.16 | Better Auth merge |
| 13.8 | Consent Ledger | Pending | T13.4 consent assertions | Reimpl |
| 13.9 | Audit Logger — Postgres mirror + MinIO WORM writer | Pending | T13.27, T13.28, T13.29 | MinIO sidecar |
| 13.10 | Cross-Product SSO Gateway + JWKS + dynamic TTL + adaptive rotation | Pending | T13.30-T13.40 | Reimpl |

