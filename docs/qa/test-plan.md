# QA Shard — Test Plan

Version: v1  
Owner: QA / Engineering  
Status: Draft  
Last updated: 2025-09-18

1. Introduction
This document outlines the test plan for the Scrypted NVR Off‑Site Backup to Google Cloud solution. The primary goal is to ensure the system reliably backs up video clips, adheres to cost controls, and is operationally robust.

2. Test strategy
- Unit tests: Focus on individual functions (e.g., state file R/W, GCS client creation, object naming).
- Integration tests: Verify interaction between modules (e.g., Scrypted clip extraction to GCS upload).
- End‑to‑end tests: Simulate full backup runs against a test Scrypted instance and GCS bucket.
- Operational verification: Manual checks using gsutil and log analysis.

3. Test environment
- Local development machine: For unit and integration tests.
- Dedicated test server: Linux host with Scrypted NVR instance and network configuration mirroring production.
- Google Cloud Project: Dedicated project for testing, with a GCS bucket and service account.

4. Test cases (high‑level)
- TC‑001: Successful end‑to‑end backup run
  - Preconditions: Scrypted NVR running, new clips available, valid GCS credentials, empty state file.
  - Steps: Run backup script.
  - Expected results: All new clips uploaded to GCS, state file updated, logs show success.
- TC‑002: Resume from last successful timestamp
  - Preconditions: Scrypted NVR running, new clips available, valid GCS credentials, existing state file.
  - Steps: Run backup script.
  - Expected results: Only clips newer than lastTimestamp uploaded, state file updated.
- TC‑003: Scrypted API transient failure (getVideoClips)
  - Preconditions: Scrypted NVR running, simulate transient API error.
  - Steps: Run backup script.
  - Expected results: Script retries, logs warnings, eventually succeeds or fails after max retries.
- TC‑004: GCS upload transient failure
  - Preconditions: Scrypted NVR running, valid clips, simulate transient GCS upload error.
  - Steps: Run backup script.
  - Expected results: Script retries upload, logs warnings, eventually succeeds or fails after max retries.
- TC‑005: Missing GCS credentials
  - Preconditions: Missing GCS_PROJECT_ID, GCS_BUCKET_NAME, or GCS_KEYFILE_PATH.
  - Steps: Run backup script.
  - Expected results: Script exits with configuration error.
- TC‑006: Scrypted authentication failure
  - Preconditions: Incorrect SCRYPTED_USER/SCRYPTED_PASSWORD.
  - Steps: Run backup script.
  - Expected results: Script exits with authentication error.
- TC‑007: Self‑signed TLS rejection
  - Preconditions: Scrypted uses self‑signed TLS, ALLOW_SELF_SIGNED=false.
  - Steps: Run backup script.
  - Expected results: Script exits with TLS certificate error.
- TC‑008: Self‑signed TLS acceptance
  - Preconditions: Scrypted uses self‑signed TLS, ALLOW_SELF_SIGNED=true.
  - Steps: Run backup script.
  - Expected results: Script connects successfully.
- TC‑009: GCS lifecycle policy verification
  - Preconditions: GCS bucket created, lifecycle JSON applied.
  - Steps: Use gsutil lifecycle get to verify rule.
  - Expected results: Output confirms age>7d deletion rule.
- TC‑010: Streaming upload memory usage
  - Preconditions: Large video clip available.
  - Steps: Run backup script, monitor memory usage.
  - Expected results: Memory usage remains stable, not proportional to clip size.

5. Traceability
- See [docs/qa/acceptance-matrix.md](docs/qa/acceptance-matrix.md:1) for mapping test cases to acceptance criteria.

6. References
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Acceptance Criteria: [docs/prd/04-acceptance-criteria.md](docs/prd/04-acceptance-criteria.md:1)
- Architecture: [docs/architecture.md](docs/architecture.md:1)