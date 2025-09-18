# Story 001 — Automatic Hourly Backup of New Video Clips

Version: v1  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. User story
As an NVR operator, I want to automatically back up new video clips to Google Cloud hourly, so that my footage is protected off‑site.

2. Acceptance criteria
- AC‑1: When the job runs hourly with valid credentials and available VideoClips, then all completed clips within the last hour are uploaded and lastTimestamp advances to the most recent successful clip’s endTime.
- AC‑7: When the system restarts, then it resumes processing clips from the last successfully uploaded clip's endTime, preventing duplicates and gaps.
- AC‑8: When a clip's media stream is retrieved, then it is uploaded to GCS using a streaming mechanism, ensuring memory usage remains stable regardless of clip size.
- AC‑9: When an object is uploaded to GCS, its key follows the hierarchical UTC pattern: {cameraName}/{yyyy}/{MM}/{dd}/{HH-mm-ss}.mp4.

3. Functional requirements addressed
- FR‑1: Discovery of VideoClips devices
- FR‑2: Clip listing by time window
- FR‑3: Media stream retrieval by clip ID
- FR‑4: Streaming upload to GCS
- FR‑5: Idempotent state tracking
- FR‑6: Chronological processing, no duplicates
- FR‑9: Cron scheduling design

4. Technical notes
- Implementation will leverage [src/backup.ts](src/backup.ts:1) main function.
- State management via [readLastTimestamp()](src/backup.ts:68) and [updateLastTimestamp()](src/backup/ts:84) is critical.
- GCS streaming upload is handled by [uploadToGCSWithRetry()](src/backup.ts:112).
- Object naming convention is implemented in [src/backup.ts](src/backup.ts:223).

5. References
- Epic: [Epic 001: Off‑Site NVR Backup to Google Cloud](docs/stories/epic-001-offsite-backup.md:1)
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Functional Requirements: [docs/prd/03-requirements.md](docs/prd/03-requirements.md:1)
- Acceptance Criteria: [docs/prd/04-acceptance-criteria.md](docs/prd/04-acceptance-criteria.md:1)