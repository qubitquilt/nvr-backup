# QA Shard — Acceptance Criteria Traceability Matrix

Version: v1  
Owner: QA / Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. Introduction
This document provides a traceability matrix linking the Product Requirements Document (PRD) Acceptance Criteria to high‑level test cases defined in the Test Plan. This ensures that all specified requirements are covered by testing efforts.

2. Traceability matrix

| AC ID | Acceptance Criteria Summary | Test Case ID(s) | Test Type | Status |
| :---- | :-------------------------- | :-------------- | :-------- | :----- |
| AC‑1 | All completed clips uploaded, state advances | TC‑001, TC‑002 | E2E, Integration | Pending |
| AC‑2 | Transient network error retries, logs failure | TC‑003, TC‑004 | Integration | Pending |
| AC‑3 | GCS lifecycle rule age>7d applied | TC‑009 | Operational | Pending |
| AC‑4 | Scrypted auth with env vars | TC‑006 | Integration | Pending |
| AC‑5 | Self‑signed TLS rejected (default) | TC‑007 | Integration | Pending |
| AC‑6 | Self‑signed TLS accepted (config) | TC‑008 | Integration | Pending |
| AC‑7 | LOG_LEVEL debug output | TC‑001 (observe logs) | Operational | Pending |
| AC‑8 | Restart resumes from last timestamp | TC‑002 | E2E | Pending |
| AC‑9 | Streaming upload memory stable | TC‑010 | Performance | Pending |
| AC‑10 | GCS object key hierarchical UTC | TC‑001 (verify GCS) | Operational | Pending |

3. References
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Acceptance Criteria: [docs/prd/04-acceptance-criteria.md](docs/prd/04-acceptance-criteria.md:1)
- Test Plan: [docs/qa/test-plan.md](docs/qa/test-plan.md:1)