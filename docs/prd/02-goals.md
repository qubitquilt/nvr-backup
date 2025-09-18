# PRD Shard 02 — Objectives and Key Results

Version: v4  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. Objectives and key results
- OKR‑1 Reliability: ≥ 99.5% successful upload of eligible completed clips per 7‑day window
- OKR‑2 Cost predictability: Monthly GCS bill aligns with 7‑day data footprint projection (e.g., ~225 USD at 6 Mbps per camera, 22 cams)
- OKR‑3 Operational simplicity: Single scheduled task, no manual rotation; lifecycle auto‑deletion at age>7d
- OKR‑4 Portability: Extractor logic cloud‑agnostic with pluggable uploader

2. Success metrics
- ≥ 99.5% of eligible clips uploaded within 2 scheduled cycles
- Mean time to recover from transient failures < 1 hour
- Monthly cost within ±10% of projection for chosen bitrate profile

3. References
- Strategy and technical background: [idea](docs/idea.md:2)
- Full PRD: [docs/prd.md](docs/prd.md:1)