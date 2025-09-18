# PRD Shard 05 — Non‑Functional Requirements

Version: v4  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. Non‑functional requirements
- NFR‑1 Reliability: No data corruption; upload operations are atomic at object level.
- NFR‑2 Performance: Memory usage stable under streaming; typical concurrency of 1–2 uploads to avoid saturating uplink.
- NFR‑3 Observability: Logs sufficient to trace run outcomes; CLI verification steps documented.
- NFR‑4 Portability: Uploader module abstracted to support future B2/S3 with minimal changes.
- NFR‑5 Security: Credentials not logged; TLS controls explicit; ability to reject or accept self‑signed certs via configuration flag.

2. References
- Strategy and technical background: [idea](docs/idea.md:2)
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Functional Requirements: [docs/prd/03-requirements.md](docs/prd/03-requirements.md:1)
- Architecture: [docs/architecture.md](docs/architecture.md:1)