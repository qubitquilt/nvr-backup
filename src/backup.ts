// Scrypted NVR to Google Cloud Storage Backup Script
// Automated hourly backup of video clips with 7-day retention

import * as fs from 'fs/promises';
import * as path from 'path';
import { Storage } from '@google-cloud/storage';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Helper to lazily require the @scrypted/sdk runtime if available
function getScryptedRuntime(): any | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@scrypted/sdk');
  } catch (e) {
    return undefined;
  }
}

// connectSdk will attempt to use the runtime connect if present
const connectSdk: (opts: any) => Promise<any> = async (opts: any) => {
  const Scrypted = getScryptedRuntime();
  const connect = (Scrypted as any)?.connect ?? (Scrypted as any)?.default ?? (Scrypted as any);
  if (typeof connect === 'function')
    return connect(opts);
  return connect;
};

// No longer need connectSdk shim

const STATE_FILE = process.env.STATE_FILE_PATH || './backup-state.json';
const SCRYPTED_HOST = process.env.SCRYPTED_HOST || 'https://192.168.10.7:10443';
const SCRYPTED_USER = process.env.SCRYPTED_USER;
const SCRYPTED_PASSWORD = process.env.SCRYPTED_PASSWORD;
const ALLOW_SELF_SIGNED = process.env.ALLOW_SELF_SIGNED === 'true';
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID;
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const GCS_KEYFILE_PATH = process.env.GCS_KEYFILE_PATH;
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase();

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const levelOrder: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel = levelOrder[(LOG_LEVEL as LogLevel)] ?? 20;
const log = {
  debug: (...args: any[]) => { if (currentLevel <= 10) console.debug('[DEBUG]', ...args); },
  info:  (...args: any[]) => { if (currentLevel <= 20) console.info('[INFO]', ...args); },
  warn:  (...args: any[]) => { if (currentLevel <= 30) console.warn('[WARN]', ...args); },
  error: (...args: any[]) => { if (currentLevel <= 40) console.error('[ERROR]', ...args); },
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let lastErr: any;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i === attempts) break;
      const delay = Math.pow(2, i) * 1000;
      log.warn(`${label} attempt ${i} failed, retrying in ${delay}ms:`, err);
      await sleep(delay);
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastErr}`);
}

// Interfaces for types
interface BackupState {
  lastTimestamp: number; // Unix timestamp in ms
}

interface ClipMetadata {
  id: string;
  cameraName: string;
  startTime: Date;
  endTime: Date;
  mimeType: string;
}

/**
 * Reads the last backup timestamp from state file.
 * Defaults to 24 hours ago if no state exists.
 * @returns Promise<number> Last timestamp in ms
 */
async function readLastTimestamp(): Promise<number> {
  try {
    const data = await fs.readFile(STATE_FILE, 'utf8');
    const state: BackupState = JSON.parse(data);
    return state.lastTimestamp;
  } catch (error) {
    console.warn('No state file found, starting from 24 hours ago');
    const now = Date.now();
    return now - (24 * 60 * 60 * 1000);
  }
}

/**
 * Updates the state file with the latest successful timestamp.
 * @param timestamp - Unix timestamp in ms
 */
async function updateLastTimestamp(timestamp: number): Promise<void> {
  const state: BackupState = { lastTimestamp: timestamp };
  await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Creates GCS storage client.
 * @returns Storage client instance
 */
function createGCSClient() {
  if (!GCS_PROJECT_ID || !GCS_BUCKET_NAME || !GCS_KEYFILE_PATH) {
    throw new Error('GCS configuration missing: PROJECT_ID, BUCKET_NAME, KEYFILE_PATH');
  }
  return new Storage({
    projectId: GCS_PROJECT_ID,
    keyFilename: GCS_KEYFILE_PATH,
  });
}

/**
 * Uploads a media stream to GCS with retry logic.
 * Uses exponential backoff up to 3 attempts.
 * @param bucket - GCS bucket
 * @param objectName - Object key in bucket
 * @param stream - Readable stream of video data
 * @param contentType - MIME type (e.g., 'video/mp4')
 * @returns Promise<void>
 */
async function uploadToGCSWithRetry(
  bucket: any,
  objectName: string,
  stream: any,
  contentType: string
): Promise<void> {
  const maxRetries = 3;
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const file = bucket.file(objectName);
      if (stream && typeof stream.pipe === 'function') {
        await new Promise<void>((resolve, reject) => {
          const writeStream = file.createWriteStream({ resumable: false, contentType });
          stream.on('error', reject);
          writeStream.on('error', reject);
          writeStream.on('finish', resolve);
          stream.pipe(writeStream);
        });
      } else {
        const buffer = Buffer.isBuffer(stream) ? stream : Buffer.from(stream);
        await file.save(buffer, {
          metadata: { contentType },
          private: true,
        });
      }
      log.info(`Uploaded ${objectName} successfully`);
      return;
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(`Upload failed after ${maxRetries} attempts: ${error}`);
      }
      const delay = Math.pow(2, attempt) * 1000;
      log.warn(`Upload attempt ${attempt} failed, retrying in ${delay}ms: ${error}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Extracts new clips from Scrypted using VideoClips interface.
 * @param scrypted - Connected Scrypted runtime
 * @param startTime - Start timestamp in ms
 * @param endTime - End timestamp in ms
 * @returns Promise<ClipMetadata[]>
 */
async function extractNewClips(
  scrypted: any,
  startTime: number,
  endTime: number
): Promise<ClipMetadata[]> {
  // Discover VideoClips devices by interface (be permissive with SDK typings)
  const devices: any[] = scrypted.getDevices();
  const videoClipsDevices = devices
    .filter((device: any) => {
      const interfaces = device.interfaces as string[] || [];
      let iface: any;
      try {
        // require lazily for type reference if available at runtime
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ScryptedRuntime = require('@scrypted/sdk');
        iface = (ScryptedRuntime as any).ScryptedInterface;
      } catch (e) {
        iface = undefined;
      }
      return interfaces.includes(iface?.VideoClips) || interfaces.includes('VideoClips');
    })
    .filter((d: any) => 'videoClips' in d);

  if (videoClipsDevices.length === 0) {
    throw new Error('No VideoClips device found');
  }
  const videoClips = (videoClipsDevices[0] as any).videoClips as any;

  const options = { startTime, endTime };
  const clips = await withRetry(() => videoClips.getVideoClips(options), 'getVideoClips') as any[];

  return clips.map((clip: any) => ({
    id: clip.id,
    cameraName: clip.cameraName || 'unknown',
    startTime: new Date(clip.startTime),
    endTime: new Date(clip.endTime),
    mimeType: clip.mimeType || 'video/mp4',
  }));
}

/**
 * Main backup execution.
 */
async function main(): Promise<void> {
  log.info(`Starting backup at ${new Date().toISOString()}`);

  const startTime = await readLastTimestamp();
  const endTime = Date.now();
  let latestTimestamp = startTime;

  try {
    // Connect to Scrypted using compat connect shim, keep runtime loosely typed
    const scrypted: any = await connectSdk({
      host: SCRYPTED_HOST,
      username: SCRYPTED_USER,
      password: SCRYPTED_PASSWORD,
      rejectUnauthorized: !ALLOW_SELF_SIGNED,
    });

    // Extract new clips
    const newClips = await extractNewClips(scrypted, startTime, endTime);
    if (newClips.length === 0) {
      log.info('No new clips found');
      return;
    }

    log.info(`Found ${newClips.length} new clips`);

    // Create GCS client
    const storage = createGCSClient();
    const bucket = storage.bucket(GCS_BUCKET_NAME as string);

    // Process clips in order
    for (const clip of newClips.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())) {
      try {
        // Generate hierarchical UTC object name: camera/yyyy/MM/dd/HH-mm-ss.mp4
        const d = new Date(clip.startTime);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        const ss = String(d.getUTCSeconds()).padStart(2, '0');
        const objectName = `${clip.cameraName}/${y}/${m}/${day}/${hh}-${mm}-${ss}.mp4`;

        log.info(`Processing clip ${clip.id} for ${objectName}`);

        // Fetch media object (defensive around SDK typings)
        const devices: any[] = scrypted.getDevices();
        const videoClipsDevices = devices
          .filter((device: any) => {
            const interfaces = device.interfaces as string[] || [];
            let iface: any;
            try {
              const ScryptedRuntime = getScryptedRuntime();
              iface = (ScryptedRuntime as any)?.ScryptedInterface;
            } catch (e) {
              iface = undefined;
            }
            return interfaces.includes(iface?.VideoClips) || interfaces.includes('VideoClips');
          })
          .filter((d: any) => 'videoClips' in d);
        const videoClips = (videoClipsDevices[0] as any).videoClips as any;
        const mediaObject = await withRetry(() => videoClips.getVideoClip(clip.id), 'getVideoClip');

        // Get stream - best-effort, assuming mediaObject has mediaStream or is a stream itself
        const stream = (mediaObject as any).mediaStream || mediaObject;

        // Upload with retry
        await uploadToGCSWithRetry(bucket, objectName, stream, clip.mimeType);

        // Update latest timestamp
        if (clip.endTime.getTime() > latestTimestamp) {
          latestTimestamp = clip.endTime.getTime();
        }
      } catch (error) {
        log.error(`Failed to process clip ${clip.id}: ${error}`);
        // Do not update timestamp; retry next run
        continue;
      }
    }

    // Update state only if progress made
    if (latestTimestamp > startTime) {
      await updateLastTimestamp(latestTimestamp);
      log.info(`Backup completed, state updated to ${new Date(latestTimestamp).toISOString()}`);
    } else {
      log.warn('No successful uploads; state unchanged');
    }
  } catch (error) {
    log.error(`Backup failed: ${error}`);
    throw error;
  }
}

// Run if main module
if (require.main === module) {
  main().catch(err => log.error(err));
}

export { main, readLastTimestamp, updateLastTimestamp, withRetry, uploadToGCSWithRetry };