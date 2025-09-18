# Source Tree — Scrypted NVR Backup

Version: v1  
Owner: Engineering  
Status: Draft  
Last updated: 2025-09-18

1. Project root
- [.env.example](.env.example:1): Template for environment variables
- [package.json](package.json:1): Node.js project metadata and dependencies
- [tsconfig.json](tsconfig.json:1): TypeScript compiler configuration
- [README.md](README.md:1) (to be created): Project overview, setup, and operational guidance

2. Source code ([src/](src/backup.ts:1))
- [src/backup.ts](src/backup.ts:1): Main backup script logic, including:
  - Configuration loading
  - State management ([readLastTimestamp()](src/backup.ts:68), [updateLastTimestamp()](src/backup.ts:84))
  - Scrypted interaction ([extractNewClips()](src/backup.ts:159))
  - GCS upload ([uploadToGCSWithRetry()](src/backup.ts:112))
  - Main execution loop ([main()](src/backup.ts:190))
  - Logging and retry helpers ([log](src/backup.ts:26), [withRetry<T>()](src/backup.ts:34))
- [src/test-scrypted.ts](src/test-scrypted.ts:1): Utility script for testing Scrypted connectivity and VideoClips interface discovery.

3. Documentation ([docs/](docs/idea.md:1))
- [docs/idea.md](docs/idea.md:1): Initial strategic and technical guide
- [docs/prd.md](docs/prd.md:1): Product Requirements Document (root)
- [docs/prd/](docs/prd/01-problem.md:1): Product Requirements Document shards
  - [docs/prd/01-problem.md](docs/prd/01-problem.md:1): Problem statement, context, scope
  - [docs/prd/02-goals.md](docs/prd/02-goals.md:1): Objectives and Key Results
  - [docs/prd/03-requirements.md](docs/prd/03-requirements.md:1): Functional Requirements, Data Model, User Flows
  - [docs/prd/04-acceptance-criteria.md](docs/prd/04-acceptance-criteria.md:1): Acceptance Criteria
  - [docs/prd/05-non-functional.md](docs/prd/05-non-functional.md:1): Non‑Functional Requirements
  - [docs/prd/06-risks.md](docs/prd/06-risks.md:1): Risks and Mitigations
- [docs/architecture.md](docs/architecture.md:1): Architecture Document (root)
- [docs/architecture/](docs/architecture/coding-standards.md:1): Architecture Document shards
  - [docs/architecture/coding-standards.md](docs/architecture/coding-standards.md:1): Coding standards and conventions
  - [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md:1): Technology stack overview
  - [docs/architecture/source-tree.md](docs/architecture/source-tree.md:1): This document
- [docs/qa/](docs/qa/): (to be created) Quality Assurance documentation
  - [docs/qa/test-plan.md](docs/qa/test-plan.md:1) (to be created): Overall test strategy
  - [docs/qa/acceptance-matrix.md](docs/qa/acceptance-matrix.md:1) (to be created): Traceability of AC to tests
  - [docs/qa/traceability.md](docs/qa/traceability.md:1) (to be created): Traceability of requirements to tests
- [docs/stories/](docs/stories/): (to be created) User stories and epics

4. Tools and assets ([tools/](tools/gcs-lifecycle-7d.json:1))
- [tools/gcs-lifecycle-7d.json](tools/gcs-lifecycle-7d.json:1) (to be created): JSON configuration for GCS object lifecycle management.

5. Build output ([dist/](dist/backup.js:1))
- [dist/backup.js](dist/backup.js:1): Transpiled JavaScript for [src/backup.ts](src/backup.ts:1)
- [dist/backup.js.map](dist/backup.js.map:1): Source map for debugging
- [dist/test-scrypted.js](dist/test-scrypted.js:1): Transpiled JavaScript for [src/test-scrypted.ts](src/test-scrypted.ts:1)
- [dist/test-scrypted.js.map](dist/test-scrypted.js.map:1): Source map for debugging