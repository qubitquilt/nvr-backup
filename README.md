# Scrypted NVR Off‑Site Backup to Google Cloud

An automated backup solution that extracts video clips from a local Scrypted NVR and stores them in Google Cloud Storage with a 7-day lifecycle.

Badges

- Build: N/A
- License: MIT

Table of Contents

- [About](#about)
- [Features](#features)
- [Files of interest](#files-of-interest)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Development and Testing](#development-and-testing)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)
- [Acknowledgements](#acknowledgements)

## About

This repository provides a small, resilient script that:

- Connects to a Scrypted NVR using the official SDK
- Extracts new video clips on an hourly cadence
- Streams uploads into Google Cloud Storage (GCS)
- Uses a GCS lifecycle policy to retain objects for 7 days

The primary implementation is [`src/backup.ts`](src/backup.ts:1).

## Features

- Streaming uploads to avoid in-memory buffering
- Exponential backoff and retries for transient failures
- Persistent state tracking to avoid re-downloading clips
- Configurable via environment variables

## Files of interest

- Main backup logic: [`src/backup.ts`](src/backup.ts:1)
- Verification / dry-run utilities: [`src/verify.ts`](src/verify.ts:1)
- Local Scrypted test helper: [`src/test-scrypted.ts`](src/test-scrypted.ts:1)
- TypeScript config: [`tsconfig.json`](tsconfig.json:1)
- GCS lifecycle sample: [`tools/gcs-lifecycle-7d.json`](tools/gcs-lifecycle-7d.json:1)

## Prerequisites

- Node.js 18 or newer
- npm (or yarn)
- A Google Cloud project and service account with Storage Object Creator permission
- A Scrypted NVR reachable from the host where you run the script

## Environment Variables

Create a `.env` file in the project root or export the following variables:

- `SCRYPTED_HOST` - Scrypted NVR URL (for example: https://192.168.10.7:10443)
- `SCRYPTED_USER` - optional username for Scrypted auth
- `SCRYPTED_PASSWORD` - optional password for Scrypted auth
- `ALLOW_SELF_SIGNED` - true to accept self-signed TLS certs (default false)
- `GCS_PROJECT_ID` - Google Cloud project ID
- `GCS_BUCKET_NAME` - GCS bucket to store backups
- `GCS_KEYFILE_PATH` - Path to service account JSON key file
- `STATE_FILE_PATH` - Path to local state file (default ./backup-state.json)
- `LOG_LEVEL` - debug|info|warn|error (default info)
- `CAMERA_INCLUDE_LIST` - Comma-separated list of camera names to include in backups (default empty; all cameras included). Use '*' to include all.
- `CAMERA_EXCLUDE_LIST` - Comma-separated list of camera names to exclude from backups (default empty).
- `DRY_RUN` - Set to 'true' to simulate backup without uploading to GCS or updating state file (default false).
- `CONCURRENCY` - Maximum number of concurrent clip uploads (default 3).

Example `.env` (do not commit secrets):

```
SCRYPTED_HOST=https://192.168.10.7:10443
GCS_PROJECT_ID=your-gcp-project
GCS_BUCKET_NAME=your-bucket
GCS_KEYFILE_PATH=/path/to/key.json
ALLOW_SELF_SIGNED=true
```

## Installation

1. Clone the repository

```bash
git clone https://github.com/your-repo/scrypted-nvr-backup.git
cd scrypted-nvr-backup
```

2. Install dependencies

```bash
npm install
```

## Development and Testing

- Build the TypeScript sources:

```bash
npm run build
```

- Run the backup script in dev mode (ts-node)

```bash
npm run dev
```

- Verify connectivity and config (note: tests requiring a live Scrypted runtime must be executed where Scrypted is available):

```bash
npm run test
```

Important: The [`@scrypted/sdk`](https://www.npmjs.com/package/@scrypted/sdk) package performs runtime initialization when imported. Local unit/integration tests that exercise the real SDK need to be run inside an environment where Scrypted is available or configured to accept remote connections. The project includes defensive shims in [`src/test-scrypted.ts`](src/test-scrypted.ts:1) and [`src/verify.ts`](src/verify.ts:1) to make local checks safer.

## Usage

To run the compiled JavaScript (recommended for production):

```bash
npm run build
npm start
```

The script writes a local state file (default [`./backup-state.json`](./backup-state.json:1)) to track the last successfully processed timestamp.

## Roadmap

- Add dry-run mode that exercises extraction and upload logic without modifying GCS or state
- Add unit tests that mock the Scrypted extractor and GCS uploader
- Add CI workflow (build, lint, tests)

## Contributing

Contributions are welcome. Please follow these steps:

1. Fork the repository
2. Create a branch for your feature or fix
3. Open a PR with a clear description and tests if applicable

See also the `CONTRIBUTING.md` if present.

## FAQ

Q: Why does `npm run test` fail locally with Scrypted errors?  
A: The `@scrypted/sdk` package attempts to initialize a device manager when imported in non-Scrypted environments. See the note above about running tests where Scrypted is available.

Q: How does the script avoid re-uploading clips?  
A: It stores the last processed timestamp in the state file and only requests clips after that time.

## License

MIT License — see the LICENSE file for details.

## Contact

Michael Ruelas - [email@example.com](mailto:email@example.com)

Project repository: https://github.com/your-repo/scrypted-nvr-backup

## Acknowledgements

- The Scrypted project and its SDK
- Google Cloud Storage libraries and documentation
- The awesome README template: https://github.com/Louis3797/awesome-readme-template