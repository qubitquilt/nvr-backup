# PRD Shard 04 — Acceptance Criteria

Version: v4  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. Acceptance criteria (samples)
- AC‑1 When the job runs hourly with valid credentials and available VideoClips, then all completed clips within the last hour are uploaded and lastTimestamp advances to the most recent successful clip’s endTime.
- AC‑2 When a transient network error occurs during upload, then the system retries up to max attempts and logs the failure if exhausted without advancing lastTimestamp past the failed clip.
- AC‑3 When lifecycle rule age>7d is applied, then objects older than 7 days are automatically deleted and verification via gsutil lifecycle get shows the expected rule.
- AC‑4 When Scrypted authentication is required, then the system successfully connects using SCRYPTED_USER and SCRYPTED_PASSWORD from environment variables.
- AC‑5 When ALLOW_SELF_SIGNED is true, then the system connects to Scrypted with a self‑signed TLS certificate without error.
- AC‑6 When LOG_LEVEL is set to 'debug', then detailed debug messages are output to the console.
- AC‑7 When the system restarts, then it resumes processing clips from the last successfully uploaded clip's endTime, preventing duplicates and gaps.
- AC‑8 When a clip's media stream is retrieved, then it is uploaded to GCS using a streaming mechanism, ensuring memory usage remains stable regardless of clip size.
- AC‑9 When an object is uploaded to GCS, its key follows the hierarchical UTC pattern: {cameraName}/{yyyy}/{MM}/{dd}/{HH-mm-ss}.mp4.

2. References
- Strategy and technical background: [idea](docs/idea.md:2)
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Functional Requirements: [docs/prd/03-requirements.md](docs/prd/03-requirements.md:1)