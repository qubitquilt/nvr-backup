# Tech Stack — Scrypted NVR Backup

Version: v1  
Owner: Engineering  
Status: Draft  
Last updated: 2025-09-18

1. Core technologies
- Language: TypeScript (TS 5.x)
- Runtime: Node.js (v18+)
- Package Manager: npm
- Build Tool: TypeScript Compiler (tsc)

2. Key libraries and frameworks
- Scrypted SDK: [@scrypted/sdk](package.json:14) for NVR integration (connect, VideoClips interface)
- Google Cloud Storage Client: [@google-cloud/storage](package.json:13) for GCS interactions
- Environment Variables: [dotenv](package.json:15) for configuration management

3. Architectural patterns
- Modular design: Separation of concerns (Extractor, Uploader, State, Orchestrator)
- Cloud-agnostic extractor: Designed to allow future Uploader module replacement (e.g., Backblaze B2, AWS S3)
- Idempotent processing: State management ensures restarts don't cause duplicates or gaps
- Retry with exponential backoff: For transient network/API failures

4. Data storage
- Local state: JSON file ([STATE_FILE_PATH](.env.example:11)) for last successful backup timestamp
- Cloud storage: Google Cloud Storage Standard class for video clips

5. Operational tools
- Scheduling: cron (Linux)
- Cloud management: gsutil (Google Cloud CLI) for bucket/lifecycle management and verification
- Logging: Basic console logging with configurable levels ([LOG_LEVEL](.env.example:14))

6. Development tools
- Editor: VS Code
- Linting/Formatting: (Future consideration, e.g., ESLint, Prettier)
- Testing: (Future consideration, e.g., Jest, Mocha)

7. Future considerations
- Alternative cloud providers: Backblaze B2, AWS S3
- Enhanced monitoring: Prometheus/Grafana integration for metrics
- Advanced logging: Structured logging to a centralized system (e.g., Cloud Logging, ELK stack)
- Containerization: Docker for easier deployment and isolation
- Orchestration: Kubernetes or similar for high-availability scheduling