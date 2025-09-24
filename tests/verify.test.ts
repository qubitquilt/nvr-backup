
// verify.test.ts - Unit tests for verify.ts using ts-node compatible assertions
// Run with: ts-node tests/verify.test.ts

import * as dotenv from 'dotenv';
import * as sinon from 'sinon';
import * as GCS from '@google-cloud/storage';
dotenv.config();

process.env.NODE_ENV = 'test';

process.env.SCRYPTED_HOST = 'https://192.168.10.7:10443';
process.env.SCRYPTED_USER = 'testuser';
process.env.SCRYPTED_PASSWORD = 'testpass';
process.env.ALLOW_SELF_SIGNED = 'true';
process.env.GCS_PROJECT_ID = 'testproject';
process.env.GCS_BUCKET_NAME = 'testbucket';
process.env.GCS_KEYFILE_PATH = '/tmp/key.json';

// Mock modules
(global as any).mockDevices = [
  {
    interfaces: ['VideoClips'],
    name: 'Mock Camera',
    type: 'Camera',
    getVideoClips: () => Promise.resolve([]) // empty clips for basic connection test
  }
] as any[];

let mockConnect: any = (global as any).mockConnect = function(opts: any) {
  return Promise.resolve({
    getDevices: () => (global as any).mockDevices
  });
};
const mockScryptedInterface = (global as any).mockScryptedInterface = { VideoClips: 'VideoClips' };

let mockStorageClass = (global as any).Storage = function() {
  this.bucket = function() {
    return {
      getMetadata: () => {
        if ((global as any).mockGetMetadataError) {
          return Promise.reject(new Error('GCS error'));
        }
        return Promise.resolve((global as any).mockBucketMetadata || [{}]);
      }
    };
  };
};

(global as any).mockBucketMetadata = [{}];
(global as any).mockGetMetadataError = false;

let mockBackupMain = (global as any).backupMain = function() {
  return Promise.resolve();
};

// Import under test after mocks

const verify: any = require('../src/verify');



const backup: any = require('../src/backup');





async function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    process.exit(1);
  }
}

async function testScryptedConnectionSuccess() {
  console.log('Testing testScryptedConnection success...');
  (global as any).mockConnect = function(opts: any) {
    assert(opts.host === process.env.SCRYPTED_HOST, 'Wrong host');
    assert(opts.username === process.env.SCRYPTED_USER, 'Wrong user');
    assert(opts.password === process.env.SCRYPTED_PASSWORD, 'Wrong password');
    assert(opts.rejectUnauthorized === false, 'Wrong rejectUnauthorized');
    return Promise.resolve({
      getDevices: () => [{ interfaces: ['VideoClips'] }]
    });
  };
  const result = await verify.testScryptedConnection();
  assert(result === true, 'Should connect successfully');
  console.log('testScryptedConnection success passed');
}

async function testScryptedConnectionNoDevices() {
  console.log('Testing testScryptedConnection no devices...');
  (global as any).mockDevices = [];
  const result = await verify.testScryptedConnection();
  assert(result === false, 'Should fail on no devices');
  console.log('testScryptedConnection no devices passed');
}

async function testScryptedConnectionError() {
  console.log('Testing testScryptedConnection error...');
  (global as any).mockConnect = function(opts: any) {
    return Promise.reject(new Error('Connection error'));
  };
  const result = await verify.testScryptedConnection();
  assert(result === false, 'Should fail on error');
  console.log('testScryptedConnection error passed');
}

async function testGCSConnectionSuccess() {
  console.log('Testing testGCSConnection success...');
  (global as any).mockBucketMetadata = [{ lifecycle: {} }];
  (global as any).mockGetMetadataError = false;
  const result = await verify.testGCSConnection();
  assert(result === true, 'Should connect to GCS');
  console.log('testGCSConnection success passed');
}

async function testGCSConnectionMissingConfig() {
  console.log('Testing testGCSConnection missing config...');
  const originalProjectId = process.env.GCS_PROJECT_ID;
  delete process.env.GCS_PROJECT_ID;
  const result = await verify.testGCSConnection();
  process.env.GCS_PROJECT_ID = originalProjectId;
  assert(result === false, 'Should fail on missing config');
  console.log('testGCSConnection missing config passed');
}

async function testGCSConnectionError() {
  console.log('Testing testGCSConnection error...');
  const originalStorage = (global as any).Storage;
  (global as any).Storage = function() {
    this.bucket = function() {
      return {
        getMetadata: () => Promise.reject(new Error('GCS error'))
      };
    };
  };
  verify.GCSStorage = (global as any).Storage;
  const result = await verify.testGCSConnection();
  (global as any).Storage = originalStorage;
  verify.GCSStorage = originalStorage;
  assert(result === false, 'Should fail on GCS error');
  console.log('testGCSConnection error passed');
}

async function testVerifyGCSLifecycleSuccess() {
  console.log('Testing verifyGCSLifecyclePolicy success...');
  const mockBucket = {
    getMetadata: () => Promise.resolve([{
      lifecycle: {
        rule: [{ action: { type: 'Delete' }, condition: { age: 7 } }]
      }
    }])
  };
  const originalStorage = (global as any).Storage;
  (global as any).Storage = function() {
    this.bucket = () => mockBucket;
  };
  const result = await verify.verifyGCSLifecyclePolicy();
  (global as any).Storage = originalStorage;
  assert(result === true, 'Should verify lifecycle');
  console.log('verifyGCSLifecycle success passed');
}

async function testVerifyGCSLifecycleNoRules() {
  console.log('Testing verifyGCSLifecycle no rules...');
  const mockBucket = {
    getMetadata: () => Promise.resolve([{}])
  };
  const originalStorage = (global as any).Storage;
  (global as any).Storage = function() {
    this.bucket = () => mockBucket;
  };
  const result = await verify.verifyGCSLifecyclePolicy();
  (global as any).Storage = originalStorage;
  assert(result === false, 'Should fail on no rules');
  console.log('verifyGCSLifecycle no rules passed');
}

async function testVerifyGCSLifecycleWrongAge() {
  console.log('Testing verifyGCSLifecycle wrong age...');
  const mockBucket = {
    getMetadata: () => Promise.resolve([{
      lifecycle: {
        rule: [{ action: { type: 'Delete' }, condition: { age: 30 } }]
      }
    }])
  };
  const originalStorage = (global as any).Storage;
  (global as any).Storage = function() {
    this.bucket = () => mockBucket;
  };
  const result = await verify.verifyGCSLifecyclePolicy();
  (global as any).Storage = originalStorage;
  assert(result === false, 'Should fail on wrong age');
  console.log('verifyGCSLifecycle wrong age passed');
}

async function testRunDryRunSuccess() {
  console.log('Testing runDryRunBackup success...');
  const mockScrypted = backup.getScryptedRuntime();
  const connectStub = sinon.stub(backup, 'connectSdk').resolves(mockScrypted);
  const readStub = sinon.stub(backup, 'readLastTimestamp').resolves(Date.now() - 7200000); // 2 hours ago to ensure clips are new
  const extractStub = sinon.stub(backup, 'extractNewClips').resolves([{
    id: 'test-clip',
    cameraName: 'test-cam',
    startTime: new Date(Date.now() - 3600000),
    endTime: new Date(),
    mimeType: 'video/mp4'
  }]);
  const getVideoClipStub = sinon.stub(mockScrypted.deviceManager.getDevices()[0].videoClips, 'getVideoClip').resolves({
    mediaStream: new PassThrough()
  });
  const originalUpload = (global as any).uploadToGCSWithRetry;
  let uploadCalled = false;
  (global as any).uploadToGCSWithRetry = async (bucket: any, objectName: string, stream: any, contentType: string) => {
    uploadCalled = true;
    console.log(`DRY RUN: Would upload ${objectName} with content type ${contentType}`);
    if (stream && typeof stream.pipe === 'function') {
      stream.on('end', () => {});
      stream.resume();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  };
  const originalUpdateTimestamp = backup.updateLastTimestamp;
  backup.updateLastTimestamp = async () => {}; // no-op for test
  try {
    const result = await verify.runDryRunBackup();
    assert(result === true, 'Should run dry-run success');
    assert(uploadCalled, 'Should call upload for clips in dry-run');
    assert(extractStub.calledOnce, 'Should call extractNewClips');
    assert(readStub.calledOnce, 'Should call readLastTimestamp');
    assert(connectStub.calledOnce, 'Should call connectSdk');
  } finally {
    connectStub.restore();
    readStub.restore();
    extractStub.restore();
    getVideoClipStub.restore();
    (global as any).uploadToGCSWithRetry = originalUpload;
    backup.updateLastTimestamp = originalUpdateTimestamp;
  }
  console.log('runDryRun success passed');
}

async function testRunDryRunWithClipsIntegration() {
  console.log('Testing runDryRunBackup with backup.main integration...');
  const originalBackupMain = backup.main;
  let mainCalled = false;
  backup.main = async () => {
    mainCalled = true;
    return Promise.resolve();
  };
  const originalUpload = (global as any).uploadToGCSWithRetry;
  (global as any).uploadToGCSWithRetry = async () => {
    // Simulate dry-run upload
    await new Promise(resolve => setTimeout(resolve, 50));
  };
  (global as any).mockConnect = function() {
    return Promise.resolve({
      deviceManager: {
        getDevices: () => [{
          interfaces: ['VideoClips'],
          videoClips: {
            getVideoClips: async () => [{ id: 'clip', cameraName: 'cam', startTime: Date.now(), endTime: Date.now() + 1000, mimeType: 'video/mp4' }]
          }
        }]
      }
    });
  };
  const result = await verify.runDryRunBackup();
  backup.main = originalBackupMain;
  (global as any).uploadToGCSWithRetry = originalUpload;
  assert(result === true, 'Should integrate with backup.main');
  assert(mainCalled, 'Should call backup.main in dry-run');
  console.log('testRunDryRunWithClipsIntegration passed');
}

async function testRunDryRunFail() {
  console.log('Testing runDryRunBackup fail...');
  const originalMain = backup.main;
  backup.main = async () => { throw new Error('Backup failed'); };
  const result = await verify.runDryRunBackup();
  backup.main = originalMain;
  assert(result === false, 'Should handle dry-run fail');
  console.log('runDryRun fail passed');
}

async function testMainVerification() {
  console.log('Testing mainVerification...');
  // Set mocks to success
   (global as any).mockConnect = function() {
    return Promise.resolve({ getDevices: () => [{ interfaces: ['VideoClips'] }] });
  };
  const mockBucket = {
    getMetadata: () => Promise.resolve([{
      lifecycle: { rule: [{ action: { type: 'Delete' }, condition: { age: 7 } }] }
    }])
  };
  mockStorageClass.prototype.bucket = () => mockBucket;
  mockBackupMain = function() {
    return Promise.resolve();
  };
  const originalUpload = (global as any).uploadToGCSWithRetry;
  (global as any).uploadToGCSWithRetry = function() {
    return Promise.resolve();
  };
  await verify.mainVerification();
  (global as any).uploadToGCSWithRetry = originalUpload;
  console.log('mainVerification passed (no crash)');
}

async function testVerifyProdRequireSuccess() {
  console.log('Testing verify prod require success...');
  process.env.NODE_ENV = 'prod';
  const originalRequire = require;
  const mockSdk = {
    connect: async () => ({}),
    ScryptedInterface: { VideoClips: 'VideoClips' }
  };
  (require as any) = function(module: string) {
    if (module === '@scrypted/sdk') return mockSdk;
    if (module === '@google-cloud/storage') return { Storage: class MockStorage {} };
    return originalRequire(module);
  };
  // Re-import to trigger prod code
  const verifyProd: any = require('../src/verify');
  assert(typeof verifyProd.connect === 'function', 'connect should be function');
  assert(verifyProd.ScryptedInterface.VideoClips === 'VideoClips', 'ScryptedInterface should be set');
  assert(typeof verifyProd.GCSStorage === 'function', 'GCSStorage should be set');
  require = originalRequire;
  process.env.NODE_ENV = 'test';
  console.log('testVerifyProdRequireSuccess passed');
}

async function testVerifyProdRequireFail() {
  console.log('Testing verify prod require fail...');
  process.env.NODE_ENV = 'prod';
  const originalRequire = require;
  (require as any) = function(module: string) {
    if (module === '@scrypted/sdk') throw new Error('SDK not found');
    if (module === '@google-cloud/storage') return { Storage: class MockStorage {} };
    return originalRequire(module);
  };
  // Re-import
  const verifyProd: any = require('../src/verify');
  assert(verifyProd.connect === undefined, 'connect should be undefined on fail');
  assert(typeof verifyProd.ScryptedInterface === 'object' && Object.keys(verifyProd.ScryptedInterface).length === 0, 'ScryptedInterface should be empty');
  assert(typeof verifyProd.GCSStorage === 'function', 'GCSStorage should still be set');
  require = originalRequire;
  process.env.NODE_ENV = 'test';
  console.log('testVerifyProdRequireFail passed');
}

async function testMainVerificationScryptedFail() {
  console.log('Testing mainVerification Scrypted fail...');
  (global as any).mockConnect = function() {
    return Promise.reject(new Error('Scrypted connection failed'));
  };
  const mockBucket = {
    getMetadata: () => Promise.resolve([{
      lifecycle: { rule: [{ action: { type: 'Delete' }, condition: { age: 7 } }] }
    }])
  };
  mockStorageClass.prototype.bucket = () => mockBucket;
  mockBackupMain = function() {
    return Promise.resolve();
  };
  const originalUpload = (global as any).uploadToGCSWithRetry;
  (global as any).uploadToGCSWithRetry = function() {
    return Promise.resolve();
  };
  // Capture console.error for error logs
  const consoleErrorSpy = sinon.spy(console, 'error');
  await verify.mainVerification();
  (global as any).uploadToGCSWithRetry = originalUpload;
  consoleErrorSpy.restore();
  assert(consoleErrorSpy.called, 'Should log Scrypted error');
  console.log('testMainVerificationScryptedFail passed (error logged)');
}

async function testMainVerificationGCSFail() {
  console.log('Testing mainVerification GCS fail...');
  (global as any).mockConnect = function() {
    return Promise.resolve({ getDevices: () => [{ interfaces: ['VideoClips'] }] });
  };
  const mockBucket = {
    getMetadata: () => Promise.reject(new Error('GCS metadata error'))
  };
  mockStorageClass.prototype.bucket = () => mockBucket;
  mockBackupMain = function() {
    return Promise.resolve();
  };
  const originalUpload = (global as any).uploadToGCSWithRetry;
  (global as any).uploadToGCSWithRetry = function() {
    return Promise.resolve();
  };
  const consoleErrorSpy = sinon.spy(console, 'error');
  await verify.mainVerification();
  (global as any).uploadToGCSWithRetry = originalUpload;
  consoleErrorSpy.restore();
  assert(consoleErrorSpy.called, 'Should log GCS error');
  console.log('testMainVerificationGCSFail passed (error logged)');
}

async function runAllTests() {
  await testScryptedConnectionSuccess();
  await testScryptedConnectionNoDevices();
  await testScryptedConnectionError();
  await testGCSConnectionSuccess();
  await testGCSConnectionMissingConfig();
  await testGCSConnectionError();
  await testVerifyGCSLifecycleSuccess();
  await testVerifyGCSLifecycleNoRules();
  await testVerifyGCSLifecycleWrongAge();
  await testRunDryRunSuccess();
  await testRunDryRunFail();
  await testMainVerification();
  console.log('All verify tests passed!');
}

if (require.main === module) {
  runAllTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}
