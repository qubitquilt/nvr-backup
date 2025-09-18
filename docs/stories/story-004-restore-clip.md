# Story 004 — Manual Restoration of a Video Clip from Google Cloud

Version: v1  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. User story
As an NVR operator, I want to be able to restore a specific video clip from Google Cloud, so that I can retrieve important footage in case of an incident.

2. Acceptance criteria
- AC‑10: When an object is uploaded to GCS, its key follows the hierarchical UTC pattern: {cameraName}/{yyyy}/{MM}/{dd}/{HH-mm-ss}.mp4, making it easy to locate specific clips for restoration.

3. Functional requirements addressed
- FR‑4: Cloud upload (specifically the object naming convention)

4. Technical notes
- Restoration is a manual process using the `gsutil cp` command. The backup script itself does not include restoration logic.
- The hierarchical object naming convention is crucial for easily identifying and downloading specific clips based on camera and timestamp.
- Instructions for manual restoration will be provided in the README.

5. References
- Epic: [Epic 001: Off‑Site NVR Backup to Google Cloud](docs/stories/epic-001-offsite-backup.md:1)
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Functional Requirements: [docs/prd/03-requirements.md](docs/prd/03-requirements.md:1)
- Acceptance Criteria: [docs/prd/04-acceptance-criteria.md](docs/prd/04-acceptance-criteria.md:1)