
# Architecture Diagram

The following Mermaid diagram illustrates the high-level architecture and data flow of the Scrypted NVR Backup system:

```mermaid
graph TD
    A[Scrypted NVR<br/>Video Clips] -->|SDK Connection<br/>getVideoClips()| B[Extract New Clips<br/>extractNewClips()<br/>(with filtering: include/exclude)]
    B -->|Clip Metadata<br/>(id, cameraName, startTime, endTime)| C[Parallel Processing<br/>p-limit (concurrency)<br/>Promise.allSettled()]
    C -->|Stream/Buffer| D[Upload to GCS<br/>uploadToGCSWithRetry<br/>(dry-run option)]
    D -->|Success| E[Update State File<br/>backup-state.json<br/>(lastProcessedTimestamp)]
    D -->|Retry/Backoff| F[Exponential Retry<br/>withRetry()]
    G[Environment Config<br/>(.env vars:<br/>CAMERA_INCLUDE_LIST, etc.)] --> B
    G --> C
    G --> D
    H[Local State<br/>backup-state.json] --> B
    E --> H
    I[Google Cloud Storage<br/>Bucket with 7-day Lifecycle] <--> D

    style A fill:#f9f,stroke:#333
    style I fill:#bbf,stroke:#333
```

## Key Components

- **Scrypted Integration**: Uses `@scrypted/sdk` to fetch video clips via `getVideoClipsDevice` and `getVideoClips(options)`.
- **Filtering**: `extractNewClips` applies `CAMERA_INCLUDE_LIST` and `CAMERA_EXCLUDE_LIST` to select relevant clips.
- **Parallelism**: Main loop uses `p-limit` to throttle concurrent uploads, with `Promise.allSettled` for handling mixed success/failure.
- **Resilience**: `withRetry` provides exponential backoff; `uploadToGCSWithRetry` handles GCS-specific errors.
- **Dry-Run Mode**: When `DRY_RUN=true`, simulates extraction and upload without GCS writes or state updates.
- **State Management**: Tracks `lastProcessedTimestamp` to avoid re-processing old clips.
- **Testing**: Unit tests mock Scrypted/GCS; integration via `verify.ts`; CI enforces lint/coverage thresholds.

For more details on coding standards, see [coding-standards.md](../coding-standards.md).
