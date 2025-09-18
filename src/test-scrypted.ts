/**
 * Lightweight Scrypted connectivity tester.
 * This file avoids importing the runtime SDK top-level to prevent initialization errors
 * when not running inside the Scrypted environment. It dynamically requires the runtime
 * SDK only when needed.
 */
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Dynamic require of @scrypted/sdk to avoid runtime initialization errors when not running inside Scrypted environment
let connectSdk: (opts: any) => Promise<any>;
let ScryptedInterface: any;

// Try to load the lightweight types-only entry first to avoid runtime initialization.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require.resolve('@scrypted/sdk/types');
  // types-only import is fine; continue to attempt runtime module dynamically below
} catch (e) {
  // types package missing is okay; runtime require may still work
}

try {
  // require at runtime so package doesn't attempt to initialize deviceManager on import
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sdk = require('@scrypted/sdk');
  // Many versions export a default connect function; prefer that if available
  connectSdk = (sdk && (sdk.connect ?? sdk.default ?? sdk)) as any;
  ScryptedInterface = sdk.ScryptedInterface ?? {};
} catch (err) {
  console.error('Runtime require of @scrypted/sdk failed. This test requires either running inside Scrypted or having the SDK available. Error:', err);
  // Do not exit; allow the script to continue and present a helpful message when attempting to connect.
  connectSdk = undefined as any;
  ScryptedInterface = {};
}

const SCRYPTED_HOST = process.env.SCRYPTED_HOST || 'https://192.168.10.7:10443';
const SCRYPTED_USER = process.env.SCRYPTED_USER;
const SCRYPTED_PASSWORD = process.env.SCRYPTED_PASSWORD;
const ALLOW_SELF_SIGNED = process.env.ALLOW_SELF_SIGNED === 'true';

async function testConnection() {
  try {
    console.log('Connecting to Scrypted...');
    if (typeof connectSdk !== 'function') {
      console.error('The @scrypted/sdk package did not expose a connect function. This environment may not be a Scrypted runtime. To run this test, either run inside Scrypted or use the verify script which handles cross-compat shims: npm run verify');
      return;
    }
    const scrypted = await connectSdk({
      host: SCRYPTED_HOST,
      username: SCRYPTED_USER,
      password: SCRYPTED_PASSWORD,
      rejectUnauthorized: !ALLOW_SELF_SIGNED,
    });

    console.log('Connected successfully');
    const devices = (scrypted.getDevices && scrypted.getDevices()) || [];
    console.log('Available devices:', devices.length);

    const videoClipsDevices = devices.filter((device: any) => {
      const ifaces = (device.interfaces as string[]) || [];
      return ifaces.includes(ScryptedInterface?.VideoClips) || ifaces.includes('VideoClips');
    });
    console.log(`Found ${videoClipsDevices.length} VideoClips devices`);

    if (videoClipsDevices.length > 0) {
      const firstDevice = videoClipsDevices[0];
      console.log('First VideoClips device:', firstDevice.name || firstDevice.id);

      // Test getVideoClips (last 1 hour for test)
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000);
      try {
        const clips = await (firstDevice as any).videoClips.getVideoClips({ startTime: oneHourAgo, endTime: now });
        console.log(`Clips in last hour: ${Array.isArray(clips) ? clips.length : 'unknown'}`);
        if (Array.isArray(clips) && clips.length > 0) {
          console.log('Sample clip:', clips[0]);
        }
      } catch (e) {
        console.warn('Could not call getVideoClips on device (possible permissions or runtime differences):', e);
      }
    }
  } catch (error) {
    console.error('Scrypted connection/test failed:', error);
  }
}

testConnection();