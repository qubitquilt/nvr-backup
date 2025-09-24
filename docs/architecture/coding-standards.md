# Coding Standards — Scrypted NVR Backup

Version: v1  
Owner: Engineering  
Status: Draft  
Last updated: 2025-09-18

1. Language and runtime
- Language: TypeScript targeting Node.js 18+
- Build output: CommonJS modules; entrypoint guarded via [require.main === module](src/backup.ts:268)
- Lib targets: ES2020
- Strict mode: enabled

2. Project structure
- Source code lives under src/
  - Main job runner: [main()](src/backup.ts:190)
  - Utilities and helpers live colocated near usage; prefer file-local helpers unless reused elsewhere
- Docs structured per GitHub Spec Kit
  - Specifications: docs/specs/ with executable specs generated via specify CLI
  - Architecture: docs/architecture.md integrated with spec-driven plans
  - QA: docs/qa/ aligned with spec validation
  - Stories: docs/stories/ derived from spec tasks
- Tools and sample assets: tools/ for operational JSON and scripts (e.g., tools/gcs-lifecycle-7d.json)

3. Style conventions
- Indentation: 2 spaces, no tabs
- Semicolons: required
- Line length: target 100–120 chars
- Naming
  - Variables: camelCase
  - Types/Interfaces: PascalCase
  - Constants: UPPER_SNAKE_CASE if module-level immutable config
  - Functions: camelCase verbs (e.g., [readLastTimestamp()](src/backup.ts:68), [updateLastTimestamp()](src/backup.ts:84))
- Imports
  - Node/core builtins first, third-party next, local last
  - Use default import for Scrypted SDK connect shim; see [connect typing shim](src/backup.ts:12)
- Comments
  - JSDoc-style for public/helpers; line comments for local context; keep concise and actionable

4. Error handling and resilience
- Use async/await, never raw .then/.catch chains
- Centralized retry helper [withRetry<T>()](src/backup.ts:34) with exponential backoff
  - Backoff schedule 2^n seconds; max attempts = 3 unless otherwise justified
- Propagate errors after logging at appropriate level; fail fast for configuration errors
- Partial-failure semantics
  - Do not advance state past a failed clip; leave for next run
  - Keep ordering deterministic and idempotent

5. Logging standards
- Use lightweight leveled logger wrapper [log](src/backup.ts:26) honoring LOG_LEVEL env: debug, info, warn, error
- Required log events
  - Job start and end with timestamps
  - Clip count discovered, each clip processing start, success, and failure
  - State advancement summary
  - Retry attempts with cause

6. Configuration and environment
- Config via environment variables defined in [.env.example](.env.example:1)
  - Required: SCRYPTED_HOST, GCS_PROJECT_ID, GCS_BUCKET_NAME, GCS_KEYFILE_PATH
  - Optional: SCRYPTED_USER, SCRYPTED_PASSWORD, ALLOW_SELF_SIGNED, STATE_FILE_PATH, LOG_LEVEL
- Never log secrets; redact user/password if ever surfaced
- Self-signed TLS
  - Respect ALLOW_SELF_SIGNED to toggle rejectUnauthorized
  - Default: rejectUnauthorized = true

7. Cloud and storage interactions
- Google Cloud Storage
  - Use streaming writes: file.createWriteStream; never buffer whole files into memory
  - Set contentType from source mime
  - Object naming format: {cameraName}/{yyyy}/{MM}/{dd}/{HH-mm-ss}.mp4 (UTC)
- Lifecycle management
  - Rely on bucket lifecycle age>7d deletion policy
  - Provide canonical JSON under tools/ and document usage in README

8. State and idempotency
- State persisted to JSON at STATE_FILE_PATH
- Advance lastTimestamp only after successful upload of a clip; use clip endTime
- Process clips in chronological order

9. Dependency management
- Pin critical SDK versions to known-good ranges in [package.json](package.json:12)
- No heavyweight logging or retry libraries; keep runtime footprint lean
- Avoid introducing new cloud SDKs for MVP scope

10. Testing and verification (initial guidance)
- Connectivity smoke: [test script](src/test-scrypted.ts:6) must enumerate devices and confirm VideoClips interface count ≥ 1
- Dry-run plan
  - Add a future dry-run switch to list clips without uploading
  - Manual verification using gsutil documented in README

11. Security considerations
- Use least-privilege service account: Storage Object Creator for uploads; separate identity for admin tasks
- No plaintext secrets in repo; .env in local dev only; CI/CD secrets via environment/secret manager
- Validate inputs when switching to user-supplied object naming patterns (future)

12. Code review checklist
- Logging at appropriate levels added or updated
- Retries applied to remote calls
- Memory-safe streaming used for uploads
- State advancement semantics preserved and unit-tested where feasible
- Env variables validated with clear startup failures
- Documentation updated if behavior changes affect operations

Appendix A: Glossary
- VideoClips: Scrypted interface providing clip enumeration and retrieval
- GCS: Google Cloud Storage