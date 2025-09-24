
// verify.test.ts - Unit tests for verify.ts using ts-node compatible assertions
// Run with: ts-node tests/verify.test.ts

import * as dotenv from 'dotenv';
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
      getMetadata: () => Promise.resolve([{}])
    };
  };
};

let mockBackupMain = (global as any).backupMain = function() {
  return Promise.resolve();
};

// Import under test after mocks

const verify: any = require('../src/verify');


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
  const mockBucket = {
    getMetadata: () => Promise.resolve([{ lifecycle: {} }])
  };
  mockStorageClass.prototype.bucket = () => mockBucket;
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
  const mockBucket = {
    getMetadata: () => Promise.reject(new Error('GCS error'))
  };
  mockStorageClass.prototype.bucket = () => mockBucket;
  const result = await verify.testGCSConnection();
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
  mockStorageClass.prototype.bucket = () => mockBucket;
  const result = await verify.verifyGCSLifecyclePolicy();
  assert(result === true, 'Should verify lifecycle');
  console.log('verifyGCSLifecycle success passed');
}

async function testVerifyGCSLifecycleNoRules() {
  console.log('Testing verifyGCSLifecycle no rules...');
  const mockBucket = {
    getMetadata: () => Promise.resolve([{}])
  };
  mockStorageClass.prototype.bucket = () => mockBucket;
  const result = await verify.verifyGCSLifecyclePolicy();
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
  mockStorageClass.prototype.bucket = () => mockBucket;
  const result = await verify.verifyGCSLifecyclePolicy();
  assert(result === false, 'Should fail on wrong age');
  console.log('verifyGCSLifecycle wrong age passed');
}

async function testRunDryRunSuccess() {
  console.log('Testing runDryRunBackup success...');
  mockBackupMain = function() {
    return Promise.resolve();
  };
  const originalUpload = (global as any).uploadToGCSWithRetry;
  (global as any).uploadToGCSWithRetry = function() {
    return Promise.resolve();
  };
  const result = await verify.runDryRunBackup();
  (global as any).uploadToGCSWithRetry = originalUpload;
  assert(result === true, 'Should run dry-run success');
  console.log('runDryRun success passed');
}

async function testRunDryRunFail() {
  console.log('Testing runDryRunBackup fail...');
  mockBackupMain = function() {
    return Promise.reject(new Error('Backup fail'));
  };
  const result = await verify.runDryRunBackup();
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
