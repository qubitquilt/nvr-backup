# PRD Shard 06 — Risks and Mitigations

Version: v4  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. Risks and mitigations
- R‑1 Insufficient uplink bandwidth
  - Mitigation: Bitrate tuning, staggered schedules, or reduced concurrency. Document ISP verification in README.
- R‑2 TLS self‑signed issues
  - Mitigation: Configurable ALLOW_SELF_SIGNED flag; document risks and configuration in README.
- R‑3 SDK changes in Scrypted
  - Mitigation: Pin SDK version in [package.json](package.json:14); add defensive checks and error handling; monitor Scrypted updates.
- R‑4 Unexpected GCS costs
  - Mitigation: Lifecycle enforcement (age>7d); documented verification via gsutil; avoid cold tiers for short retention.
- R‑5 State file corruption/loss
  - Mitigation: Implement robust file I/O with error handling; consider cloud‑based state for higher availability (future enhancement).
- R‑6 Local server performance impact
  - Mitigation: Monitor system load during script execution; recommend dedicated backup machine if NVR performance degrades.

2. References
- Strategy and technical background: [idea](docs/idea.md:2)
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Functional Requirements: [docs/prd/03-requirements.md](docs/prd/03-requirements.md:1)
- Non‑Functional Requirements: [docs/prd/05-non-functional.md](docs/prd/05-non-functional.md:1)