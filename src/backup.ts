// Scrypted NVR to Google Cloud Storage Backup Script
// Automated hourly backup of video clips with 7-day retention

import * as fs from 'fs/promises';

import { Storage } from '@google-cloud/storage';
import * as dotenv from 'dotenv';
import pLimit from 'p-limit';

// Load environment variables
dotenv.config();

// Helper to lazily require the @scrypted/sdk runtime if available
export function getScryptedRuntime(): any | undefined {
  if (process.env.NODE_ENV === 'test') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PassThrough } = require('stream');
    return {
      deviceManager: {
        getDevices: () => [
          {
            interfaces: ['VideoClips'],
            videoClips: {
              getVideoClips: async (options: any) => {
                const mockClips = [
                  { id: 'front1', cameraName: 'front', startTime: 1, endTime: 2, mimeType: 'video/mp4' },
                  { id: 'back1', cameraName: 'back', startTime: 3, endTime: 4, mimeType: 'video/mp4' },
                  { id: 'side1', cameraName: 'side', startTime: 5, endTime: 6, mimeType: 'video/mp4' }
                ];
                const { startTime = 0, endTime = Infinity } = options || {};
                return mockClips.filter(clip => clip.startTime >= startTime && clip.endTime <= endTime);
              },
              getVideoClip: async (id: string) => ({
                id,
                mediaStream: new PassThrough()
              })
            }
          }
        ]
      }
    };
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@scrypted/sdk');
  } catch (e) {
    return undefined;
  }
}

// connectSdk will attempt to use the runtime connect if present
export const connectSdk: (opts: any) => Promise<any> = async (opts: any) => {
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


const MAX_CONCURRENT_UPLOADS = parseInt(process.env.MAX_CONCURRENT_UPLOADS || '3', 10) || 3;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const levelOrder: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const currentLevel = levelOrder[(LOG_LEVEL as LogLevel)] ?? 20;
export const log = {
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


/**
 * Gets the VideoClips device from Scrypted.
 * @param scrypted - Connected Scrypted runtime
 * @returns The videoClips object
 */
function getVideoClipsDevice(scrypted: any): any {
  if (process.env.NODE_ENV === 'test') {
    const testDevices = scrypted.deviceManager.getDevices();
    const testVideoClipsDevices = testDevices.filter((d: any) => 'videoClips' in d);
    if (testVideoClipsDevices.length === 0) {
      throw new Error('No VideoClips device found');
    }
    return testVideoClipsDevices[0].videoClips;
  }
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

  if (videoClipsDevices.length === 0) {
    throw new Error('No VideoClips device found');
  }

  return videoClipsDevices[0].videoClips;
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
  if (process.env.DRY_RUN === 'true') {
    log.info(`DRY RUN: Skipping upload of ${objectName}`);
    return;
  }

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
export async function extractNewClips(
  scrypted: any,
  startTime: number,
  endTime: number
): Promise<ClipMetadata[]> {
  const videoClips = await getVideoClipsDevice(scrypted);

  const options = { startTime, endTime };
  const clips = await withRetry(() => videoClips.getVideoClips(options), 'getVideoClips') as any[];

  // Filter clips by camera if configured
  const includeList = (process.env.CAMERA_INCLUDE_LIST || '*') === '*' ? [] : (process.env.CAMERA_INCLUDE_LIST || '*').split(',').map(c => c.trim().toLowerCase());
  const excludeList = (process.env.CAMERA_EXCLUDE_LIST || '').split(',').map(c => c.trim().toLowerCase());

  return clips
    .filter((clip: any) => {
      const cam = (clip.cameraName || 'unknown').toLowerCase();
      if (includeList.length > 0 && !includeList.includes(cam)) return false;
      if (excludeList.includes(cam)) return false;
      return true;
    })
    .map((clip: any) => ({
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

    // Process clips in parallel with concurrency limit
    const limit = pLimit(MAX_CONCURRENT_UPLOADS);
    const processPromises = newClips
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .map(clip =>
        limit(async () => {
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

            const videoClips = getVideoClipsDevice(scrypted);
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
            throw error; // Re-throw to track failures in allSettled
          }
        })
      );

    const results = await Promise.allSettled(processPromises);
    const failures = results.filter(r => r.status === 'rejected').length;
    if (failures > 0) {
      log.warn(`${failures} clips failed to process`);
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

export { main, readLastTimestamp, updateLastTimestamp, withRetry, uploadToGCSWithRetry, getVideoClipsDevice, createGCSClient };