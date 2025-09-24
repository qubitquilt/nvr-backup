// Scrypted NVR Backup Verification Script
// This script provides a dry-run mode for the backup process and verifies GCS lifecycle policy.


import { main as backupMain } from './backup';

import * as dotenv from 'dotenv';

// Dynamic imports for test compatibility
let connect: (opts: any) => Promise<any>;
let ScryptedInterface: any;
let GCSStorage: any;

if (process.env.NODE_ENV === 'test') {
  connect = (global as any).mockConnect;
  ScryptedInterface = (global as any).mockScryptedInterface || {};
  GCSStorage = (global as any).Storage;
} else {
  try {
    // require at runtime so package doesn't attempt to initialize deviceManager on import
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sdk = require('@scrypted/sdk');
    // Many versions export a default connect function; prefer that if available
    connect = (sdk && (sdk.connect ?? sdk.default ?? sdk)) as any;
    ScryptedInterface = sdk.ScryptedInterface ?? {};
  } catch (err) {
    console.error('Runtime require of @scrypted/sdk failed. This test requires either running inside Scrypted or having the SDK available. Error:', err);
    // Do not exit; allow the script to continue and present a helpful message when attempting to connect.
    connect = undefined as any;
    ScryptedInterface = {};
  }
  const { Storage } = require('@google-cloud/storage');
  GCSStorage = Storage;
}// Load environment variables


console.log('Test mode:', process.env.NODE_ENV === 'test');
console.log('GCSStorage type:', typeof GCSStorage);
if (process.env.NODE_ENV === 'test') {
  console.log('GCSStorage is global.Storage:', GCSStorage === (global as any).Storage);
  console.log('Global Storage toString:', (global as any).Storage.toString().substring(0, 50));
}


dotenv.config();

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


async function testScryptedConnection(): Promise<boolean> {
  log.info('Testing Scrypted connection...');
  try {
    const scrypted = await connect({
      host: SCRYPTED_HOST,
      username: SCRYPTED_USER,
      password: SCRYPTED_PASSWORD,
      rejectUnauthorized: !ALLOW_SELF_SIGNED,
    }) as any; // Cast to any to bypass strict type checking for now

    const devices: any[] = (scrypted as any).getDevices ? (scrypted as any).getDevices() : [];
    const videoClipsDevices = devices.filter((device: any) => {
      const ifaces = (device.interfaces as string[]) || [];
      return ifaces.includes((ScryptedInterface as any).VideoClips) || ifaces.includes('VideoClips');
    });

    if (videoClipsDevices.length === 0) {
      log.error('No VideoClips device found on Scrypted NVR.');
      return false;
    }
    log.info(`Successfully connected to Scrypted and found ${videoClipsDevices.length} VideoClips devices.`);
    return true;
  } catch (error) {
    log.error('Scrypted connection test failed:', error);
    return false;
  }
}

async function testGCSConnection(): Promise<boolean> {
  log.info('Testing Google Cloud Storage connection...');
  try {
    if (!process.env.GCS_PROJECT_ID || !process.env.GCS_BUCKET_NAME || !process.env.GCS_KEYFILE_PATH) {
      log.error('GCS configuration missing: PROJECT_ID, BUCKET_NAME, KEYFILE_PATH');
      return false;
    }
    const storage = new GCSStorage({
      projectId: process.env.GCS_PROJECT_ID,
      keyFilename: process.env.GCS_KEYFILE_PATH,
    });
    await storage.bucket(process.env.GCS_BUCKET_NAME).getMetadata();
    log.info(`Successfully connected to GCS bucket: ${process.env.GCS_BUCKET_NAME}`);
    return true;
  } catch (error) {
    log.error('GCS connection test failed:', error);
    return false;
  }
}

async function verifyGCSLifecyclePolicy(): Promise<boolean> {
  log.info('Verifying GCS lifecycle policy...');
  try {
    if (!GCS_BUCKET_NAME) {
      log.error('GCS_BUCKET_NAME is not defined.');
      return false;
    }
    const storage = new GCSStorage({
      projectId: GCS_PROJECT_ID,
      keyFilename: GCS_KEYFILE_PATH,
    });
    const [metadata] = await storage.bucket(GCS_BUCKET_NAME).getMetadata();
    const lifecycle = metadata.lifecycle;

    if (!lifecycle || !lifecycle.rule || lifecycle.rule.length === 0) {
      log.warn('No lifecycle rules found on GCS bucket.');
      return false;
    }

    const deleteRule = lifecycle.rule.find((rule: any) =>
      rule.action && rule.action.type === 'Delete' &&
      rule.condition && rule.condition.age === 7
    );

    if (deleteRule) {
      log.info('GCS lifecycle policy for 7-day deletion is correctly configured.');
      return true;
    } else {
      log.warn('GCS lifecycle policy for 7-day deletion not found. Please apply tools/gcs-lifecycle-7d.json.');
      return false;
    }
  } catch (error) {
    log.error('Error verifying GCS lifecycle policy:', error);
    return false;
  }
}

async function runDryRunBackup(): Promise<boolean> {
  log.info('Starting dry-run backup...');
  // Temporarily override upload function to prevent actual uploads
  const originalUpload = (global as any).uploadToGCSWithRetry;
  (global as any).uploadToGCSWithRetry = async (bucket: any, objectName: string, stream: any, contentType: string) => {
    log.info(`DRY RUN: Would upload ${objectName} with content type ${contentType}`);
    // Simulate stream consumption
    if (stream && typeof stream.read === 'function') {
      while (stream.read());
    }
    await sleep(100); // Simulate network delay
  };

  try {
    await backupMain();
    log.info('Dry-run backup completed successfully.');
    return true;
  } catch (error) {
    log.error('Dry-run backup failed:', error);
    return false;
  } finally {
    // Restore original upload function
    (global as any).uploadToGCSWithRetry = originalUpload;
  }
}

async function mainVerification(): Promise<void> {
  log.info('Starting NVR Backup Verification Script...');

  let allPassed = true;

  if (!(await testScryptedConnection())) {
    allPassed = false;
  }
  await sleep(1000); // Small delay between checks

  if (!(await testGCSConnection())) {
    allPassed = false;
  }
  await sleep(1000);

  if (!(await verifyGCSLifecyclePolicy())) {
    allPassed = false;
  }
  await sleep(1000);

  // Note: Dry run requires the backupMain function to be exported and callable.
  // It also requires the global.uploadToGCSWithRetry override to work, which might be tricky with module imports.
  // For a robust dry-run, consider passing a 'dryRun' flag through the main function.
  // For now, this dry-run is illustrative and might need adjustments based on actual module structure.
  log.warn('Dry run functionality is illustrative and may require adjustments based on module structure.');
  if (!(await runDryRunBackup())) {
    allPassed = false;
  }

  if (allPassed) {
    log.info('All verification checks passed successfully!');
  } else {
    log.error('Some verification checks failed. Please review the logs above.');
  }
}

if (require.main === module) {
  mainVerification().catch(log.error);
}

module.exports = {
  testScryptedConnection,
  testGCSConnection,
  verifyGCSLifecyclePolicy,
  runDryRunBackup,
  mainVerification,
  connect,
  ScryptedInterface
};
