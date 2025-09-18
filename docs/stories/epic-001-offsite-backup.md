# Epic 001 — Off‑Site NVR Backup to Google Cloud

Version: v1  
Owner: Product Owner  
Status: Draft  
Last updated: 2025-09-18

1. Epic summary
This epic encompasses the development of an automated, reliable, and cost‑effective solution for backing up Scrypted NVR video clips to Google Cloud Storage with a 7‑day rolling retention policy. It addresses the need for off‑site data resilience for 22x2K cameras, ensuring data integrity and predictable cloud costs.

2. Business value
- Enhanced data resilience: Protects critical surveillance footage from local hardware failures, theft, or disaster.
- Cost control: Automated lifecycle management ensures storage costs remain predictable and aligned with a 7‑day retention.
- Operational efficiency: Eliminates manual backup processes and reduces administrative overhead.
- Compliance readiness: Provides a clear audit trail for data retention policies.

3. User stories (linked)
- [Story 001: As an NVR operator, I want to automatically back up new video clips to Google Cloud hourly, so that my footage is protected off‑site.](docs/stories/story-001-auto-backup.md) (to be created)
- [Story 002: As an NVR operator, I want old video clips to be automatically deleted from Google Cloud after 7 days, so that I don't incur unnecessary storage costs.](docs/stories/story-002-auto-delete.md) (to be created)
- [Story 003: As an NVR operator, I want to be able to verify that my backups are running correctly and that old clips are being deleted, so that I have confidence in the system.](docs/stories/story-003-verify-backups.md) (to be created)
- [Story 004: As an NVR operator, I want to be able to restore a specific video clip from Google Cloud, so that I can retrieve important footage in case of an incident.](docs/stories/story-004-restore-clip.md) (to be created)

4. Dependencies
- Functional requirements defined in [docs/prd/03-requirements.md](docs/prd/03-requirements.md:1)
- Architectural decisions in [docs/architecture.md](docs/architecture.md:1)
- Google Cloud Project setup with GCS bucket and service account

5. Out of scope for this epic
- Development of a user interface for backup management
- Integration with other cloud providers (though architecture supports it)
- Real‑time streaming or advanced video analytics in the cloud

6. References
- Full PRD: [docs/prd.md](docs/prd.md:1)
- Architecture: [docs/architecture.md](docs/architecture.md:1)