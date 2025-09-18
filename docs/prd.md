# Product Requirements Document — Scrypted NVR Off‑Site Backup to Google Cloud (v4)

Version: v4
Owner: Product Owner
Status: Draft
Last updated: 2025-09-18

1. Summary
- Purpose: Provide an automated, reliable, and cost‑transparent 7‑day rolling backup of a local Scrypted NVR to Google Cloud Storage Standard class.
- Drivers:
  - Off‑site resilience for 22×2K cameras recording 24/7
  - Clear cost control via lifecycle deletion at 7 days
  - Operational simplicity and recoverability
- Non‑goals:
  - Live streaming or real‑time viewing from GCS
  - Long‑term archival beyond 7 days
  - Vendor‑locked implementations

2. Problem statement
Local NVR storage is vulnerable to device failure, theft, and environmental damage. Existing ad‑hoc file sync approaches risk corruption and lack transactional integrity for active recording sets. The product must programmatically extract complete, valid clips and maintain a sliding 7‑day cloud archive without hidden costs or manual intervention.

3. Objectives and key results
- OKR‑1 Reliability: ≥ 99.5% successful upload of eligible completed clips per 7‑day window
- OKR‑2 Cost predictability: Monthly GCS bill aligns with 7‑day data footprint projection (e.g., ~225 USD at 6 Mbps per camera, 22 cams)
- OKR‑3 Operational simplicity: Single scheduled task, no manual rotation; lifecycle auto‑deletion at age>7d
- OKR‑4 Portability: Extractor logic cloud‑agnostic with pluggable uploader

4. Users and stakeholders
- Primary user: Home/SOHO operator running Scrypted NVR
- Secondary user: IT admin for small businesses
- Stakeholders: Security/ops team, cost owner, incident response

5. Assumptions and constraints
- Scrypted exposes VideoClips interface on at least one device
- Network uplink sustains aggregate bitrate (e.g., ~132 Mbps for 6 Mbps×22 cams)
- Google Cloud project, bucket, and service account credentials available
- Self‑signed TLS may be present on local Scrypted; user can opt‑in to accept
- Retention is fixed at 7 days, implemented by GCS lifecycle policy (not script)
- Environment: Node.js 18+, Linux host with cron available

6. In scope
- Programmatic discovery of VideoClips interface
- Periodic query for clips within [lastTimestamp, now]
- Retrieval of clip media stream by id
- Streaming upload to GCS bucket with durable naming scheme per camera/time
- Idempotent state management to avoid gaps/duplicates
- Basic retry/backoff for transient failures
- Config via environment variables and .env

7. Out of scope
- Re‑encoding/transcoding media
- Cloud‑to‑cloud migrations
- UI dashboard
- Automatic Scrypted configuration

8. Functional requirements
- FR‑1 Discovery
  - The system shall enumerate Scrypted devices and select those implementing VideoClips.
- FR‑2 Clip listing
  - The system shall list clips between startTime=lastTimestamp and endTime=now inclusive, sorted by start/end time.
- FR‑3 Media retrieval
  - The system shall fetch a clip media stream by clip id via VideoClips.getVideoClip.
- FR‑4 Cloud upload
  - The system shall upload the stream to GCS using a streaming writer without buffering the entire file into memory.
  - Object key pattern: {cameraName}/{yyyy}/{MM}/{dd}/{HH‑mm‑ss}.mp4
- FR‑5 State tracking
  - The system shall persist lastTimestamp in a state file; only advance after successful upload of a clip’s endTime.
- FR‑6 Idempotency and ordering
  - The system shall process clips in chronological order and be resilient to restarts without duplicate uploads (by advancing state only on success).
- FR‑7 Retries and resilience
  - The system shall retry transient errors for both Scrypted calls and GCS uploads with exponential backoff (min 2 attempts, max 3).
- FR‑8 Logging
  - The system shall log start/end of runs, number of clips found, successes/failures, and state advancement, honoring a LOG_LEVEL variable.
- FR‑9 Scheduling
  - The system shall be designed to run via cron (e.g., hourly) and exit on completion.
- FR‑10 Configuration
  - The system shall accept configuration via environment variables: SCRYPTED_HOST, SCRYPTED_USER, SCRYPTED_PASSWORD, ALLOW_SELF_SIGNED, GCS_PROJECT_ID, GCS_BUCKET_NAME, GCS_KEYFILE_PATH, STATE_FILE_PATH, LOG_LEVEL.
- FR‑11 Security
  - The system shall use a GCS service account with least privilege: Storage Object Creator; optionally Object Admin for verifications.
- FR‑12 Lifecycle policy reliance
  - The system shall rely on a GCS lifecycle rule of delete age>7d; the product shall provide a sample JSON and CLI instructions to apply it.

9. Non‑functional requirements
- NFR‑1 Reliability: No data corruption; upload operations are atomic at object level.
- NFR‑2 Performance: Memory usage stable under streaming; typical concurrency of 1–2 uploads to avoid saturating uplink.
- NFR‑3 Observability: Logs sufficient to trace run outcomes; CLI verification steps documented.
- NFR‑4 Portability: Uploader module abstracted to support future B2/S3 with minimal changes.
- NFR‑5 Security: Credentials not logged; TLS controls explicit; ability to reject or accept self‑signed certs via configuration flag.

10. Data model (logical)
- ClipMetadata
  - id: string
  - cameraName: string
  - startTime: epoch ms
  - endTime: epoch ms
  - mimeType: string
- State
  - lastTimestamp: epoch ms

11. User flows
- Scheduled run
  - Load env and lastTimestamp → discover VideoClips → list clips within window → for each clip: getVideoClip → stream to GCS → on success advance latestTimestamp to clip.endTime → after all, if advanced, persist state → exit.

12. Success metrics
- ≥ 99.5% of eligible clips uploaded within 2 scheduled cycles
- Mean time to recover from transient failures < 1 hour
- Monthly cost within ±10% of projection for chosen bitrate profile

13. Recovery and verification
- Verification: gsutil ls and du -h to confirm objects and size; lifecycle get to confirm rules
- Recovery: gsutil cp to restore any clip by object key

14. Release plan
- MVP‑1
  - Discovery, listing, streaming uploads, state file, basic retries, logging
  - Lifecycle JSON and README instructions
  - Cron example and .env.example
- MVP‑2
  - Structured logging improvements, metrics counters, dry‑run mode
  - Optional concurrency control and backoff tuning
- MVP‑3
  - Cloud‑agnostic uploader interface, alternative provider adapter stub

15. Risks and mitigations
- R‑1 Insufficient uplink bandwidth → Mitigate with bitrate tuning, staggered schedules, or reduced concurrency.
- R‑2 TLS self‑signed issues → Configurable ALLOW_SELF_SIGNED flag; document risks.
- R‑3 SDK changes in Scrypted → Pin SDK version; add defensive checks and error handling.
- R‑4 Unexpected GCS costs → Lifecycle enforcement; documented verification; avoid cold tiers for 7‑day retention.

16. Acceptance criteria (samples)
- AC‑1 When the job runs hourly with valid credentials and available VideoClips, then all completed clips within the last hour are uploaded and lastTimestamp advances to the most recent successful clip’s endTime.
- AC‑2 When a transient network error occurs during upload, then the system retries up to max attempts and logs the failure if exhausted without advancing lastTimestamp past the failed clip.
- AC‑3 When lifecycle rule age>7d is applied, then objects older than 7 days are automatically deleted and verification via gsutil lifecycle get shows the expected rule.

17. Open questions
- OQ‑1 Should uploads be limited by camera or global rate to protect uplink?
- OQ‑2 Desired object naming variants by user locale/timezone?
- OQ‑3 Required metrics emission beyond logs?

18. Sharding plan
This PRD is sharded into:
- docs/prd/01-problem.md
- docs/prd/02-goals.md
- docs/prd/03-requirements.md
- docs/prd/04-acceptance-criteria.md
- docs/prd/05-non-functional.md
- docs/prd/06-risks.md

Root file maintains the canonical overview; shards hold detailed sections for iterative refinement.