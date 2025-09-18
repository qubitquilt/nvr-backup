# QA Shard — Requirements Traceability Matrix

Version: v1  
Owner: QA / Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. Introduction
This document provides a traceability matrix linking the Product Requirements Document (PRD) Functional Requirements to the Acceptance Criteria and high‑level Test Cases. This ensures comprehensive coverage and verification of all requirements.

2. Traceability matrix

| FR ID | Functional Requirement Summary | AC ID(s) | Test Case ID(s) |
| :---- | :----------------------------- | :------- | :-------------- |
| FR‑1 | Discovery of VideoClips devices | AC‑1 | TC‑001, TC‑002 |
| FR‑2 | Clip listing by time window | AC‑1 | TC‑001, TC‑002 |
| FR‑3 | Media stream retrieval by clip ID | AC‑1 | TC‑001, TC‑002 |
| FR‑4 | Streaming upload to GCS | AC‑1, AC‑8, AC‑9 | TC‑001, TC‑010 |
| FR‑5 | Idempotent state tracking | AC‑1, AC‑7 | TC‑001, TC‑002 |
| FR‑6 | Chronological processing, no duplicates | AC‑1, AC‑7 | TC‑001, TC‑002 |
| FR‑7 | Retries with exponential backoff | AC‑2 | TC‑003, TC‑004 |
| FR‑8 | Leveled logging | AC‑6 | TC‑001 (observe logs) |
| FR‑9 | Cron scheduling design | N/A | Operational |
| FR‑10 | Env var configuration | AC‑4, AC‑5, AC‑6 | TC‑005, TC‑006, TC‑007, TC‑008 |
| FR‑11 | Least privilege GCS service account | N/A | Operational |
| FR‑12 | GCS lifecycle policy reliance | AC‑3 | TC‑009 |

3. References
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Functional Requirements: [docs/prd/03-requirements.md](docs/prd/03-requirements.md:1)
- Acceptance Criteria: [docs/prd/04-acceptance-criteria.md](docs/prd/04-acceptance-criteria.md:1)
- Test Plan: [docs/qa/test-plan.md](docs/qa/test-plan.md:1)
- Acceptance Criteria Traceability Matrix: [docs/qa/acceptance-matrix.md](docs/qa/acceptance-matrix.md:1)