# PRD Shard 03 — Functional Requirements

Version: v4  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. Functional requirements
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

2. Data model (logical)
- ClipMetadata
  - id: string
  - cameraName: string
  - startTime: epoch ms
  - endTime: epoch ms
  - mimeType: string
- State
  - lastTimestamp: epoch ms

3. User flows
- Scheduled run
  - Load env and lastTimestamp → discover VideoClips → list clips within window → for each clip: getVideoClip → stream to GCS → on success advance latestTimestamp to clip.endTime → after all, if advanced, persist state → exit.

4. References
- Strategy and technical background: [idea](docs/idea.md:2)
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Architecture: [docs/architecture.md](docs/architecture.md:1)