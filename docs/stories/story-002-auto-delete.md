# Story 002 — Automatic Deletion of Old Video Clips from Google Cloud

Version: v1  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. User story
As an NVR operator, I want old video clips to be automatically deleted from Google Cloud after 7 days, so that I don't incur unnecessary storage costs.

2. Acceptance criteria
- AC‑3: When lifecycle rule age>7d is applied, then objects older than 7 days are automatically deleted and verification via gsutil lifecycle get shows the expected rule.

3. Functional requirements addressed
- FR‑12: Lifecycle policy reliance

4. Technical notes
- This functionality is primarily handled by Google Cloud Storage's Object Lifecycle Management feature, not by the backup script itself.
- The solution will provide a JSON configuration file ([tools/gcs-lifecycle-7d.json](tools/gcs-lifecycle-7d.json:1)) and instructions in the README on how to apply this policy to the GCS bucket.
- Verification will involve using the `gsutil lifecycle get` command.

5. References
- Epic: [Epic 001: Off‑Site NVR Backup to Google Cloud](docs/stories/epic-001-offsite-backup.md:1)
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Functional Requirements: [docs/prd/03-requirements.md](docs/prd/03-requirements.md:1)
- Acceptance Criteria: [docs/prd/04-acceptance-criteria.md](docs/prd/04-acceptance-criteria.md:1)