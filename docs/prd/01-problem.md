# PRD Shard 01 — Problem, Context, Scope

Version: v4  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. Problem statement
Local Scrypted NVR storage is exposed to physical and operational risks including device failure, theft, and environmental damage. Naive file sync approaches risk copying in-progress recordings, causing corruption and gaps. The product needs a programmatic, transactional method to extract completed clips and maintain a 7‑day off‑site archive with predictable costs and minimal operational burden.

2. Context
- Deployment size: 22 cameras, 2K 24/7 recording
- Sustained uplink required is a core constraint; cost projection targets GCS Standard storage with lifecycle deletion
- Scrypted exposes the VideoClips interface, enabling reliable clip discovery and retrieval

3. Goals (summary)
- Reliable: ≥ 99.5% successful upload of eligible clips per 7 days
- Predictable cost: align with 7‑day footprint and lifecycle deletion
- Operationally simple: scheduled task, logs, and verifiable lifecycle rule
- Portable: extractor logic cloud‑agnostic with pluggable uploader

4. Non‑goals
- Live streaming, re-encoding/transcoding, long‑term archival beyond 7 days, vendor lock‑in

5. Scope
In scope:
- Programmatic clip discovery and retrieval via Scrypted VideoClips
- Streaming uploads to GCS Standard with robust error handling and idempotent state
- Lifecycle rule JSON and verification guidance
- Cron‑friendly job orchestration and logging

Out of scope:
- UI dashboards, analytics, cloud‑to‑cloud migrations, automatic Scrypted configuration

6. Constraints and assumptions
- Node.js 18+, Linux host with cron
- Service account credentials available for GCS
- Self‑signed TLS may be present; acceptance is configurable
- Retention enforced by GCS lifecycle rule, not by the script

7. References
- Strategy and technical background: [idea](docs/idea.md:2)
- Implementation entrypoint: [main()](src/backup.ts:190)
- Logging and retry helpers: [log](src/backup.ts:26), [withRetry<T>()](src/backup.ts:34)