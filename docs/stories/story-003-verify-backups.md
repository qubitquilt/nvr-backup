# Story 003 — Verification of Backup and Deletion Processes

Version: v1  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. User story
As an NVR operator, I want to be able to verify that my backups are running correctly and that old clips are being deleted, so that I have confidence in the system.

2. Acceptance criteria
- AC‑3: When lifecycle rule age>7d is applied, then objects older than 7 days are automatically deleted and verification via gsutil lifecycle get shows the expected rule.
- AC‑6: When LOG_LEVEL is set to 'debug', then detailed debug messages are output to the console.
- AC‑10: When an object is uploaded to GCS, its key follows the hierarchical UTC pattern: {cameraName}/{yyyy}/{MM}/{dd}/{HH-mm-ss}.mp4.

3. Functional requirements addressed
- FR‑8: Logging
- FR‑12: Lifecycle policy reliance

4. Technical notes
- Verification will primarily involve using Google Cloud's `gsutil` command-line tool to list objects, check storage usage, and inspect lifecycle policies.
- Detailed logging within the backup script will provide insights into its operation.
- A simple verification script or dry-run mode could be added in the future to automate some checks.

5. References
- Epic: [Epic 001: Off‑Site NVR Backup to Google Cloud](docs/stories/epic-001-offsite-backup.md:1)
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Functional Requirements: [docs/prd/03-requirements.md](docs/prd/03-requirements.md:1)
- Acceptance Criteria: [docs/prd/04-acceptance-criteria.md](docs/prd/04-acceptance-criteria.md:1)
- Test Plan: [docs/qa/test-plan.md](docs/qa/test-plan.md:1)