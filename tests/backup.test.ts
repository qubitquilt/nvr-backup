import assert from 'assert';
import * as fs from 'fs/promises';
import { Storage } from '@google-cloud/storage';
import { Readable, PassThrough } from 'stream';
import * as backup from '../src/backup';
import * as sinon from 'sinon';
process.env.NODE_ENV = 'test';


/* eslint-disable no-global-assign, @typescript-eslint/no-var-requires, @typescript-eslint/no-unused-vars */


async function testWithRetrySuccess() {
  let calls = 0;
  const fn = async () => {
    calls++;
    if (calls < 3) throw new Error('temporary');
    return 'ok';
  };
  const res = await backup.withRetry(fn, 'testWithRetry', 3);
  assert.strictEqual(res, 'ok');
  assert.strictEqual(calls, 3, 'should retry twice and succeed on third');
  console.log('testWithRetrySuccess passed');
}
async function testWithRetryFail() {
  let calls = 0;
  const fn = async () => {
    calls++;
    throw new Error('persistent');
  };
  let threw = false;
  try {
    await backup.withRetry(fn, 'testWithRetryFail', 2);
  } catch (e: any) {
    threw = true;
    assert.ok(e.message.includes('failed after'));
    assert.strictEqual(calls, 2, 'should call fn twice on fail');
  }
  assert.ok(threw, 'withRetry should throw after failing attempts');
  console.log('testWithRetryFail passed');
}
async function testUploadToGCSWithRetryBuffer() {
  let savedBuffer: Buffer | null = null;
  let savedOptions: any = null;
  const mockFile = {
    save: async (buffer: Buffer, options: any) => {
      savedBuffer = buffer;
      savedOptions = options;
      return Promise.resolve();
    }
  };
  const mockBucket = {
    file: (_name: string) => mockFile
  } as any;
  const buf = Buffer.from('hello');
  await backup.uploadToGCSWithRetry(mockBucket, 'obj.mp4', buf, 'video/mp4');
  assert.ok(savedBuffer && Buffer.compare(savedBuffer, buf) === 0, 'buffer should be saved');
  assert.strictEqual(savedOptions.metadata.contentType, 'video/mp4');
  console.log('testUploadToGCSWithRetryBuffer passed');
}
async function testUploadToGCSWithRetryStream() {
  const data = Buffer.from('streamdata');
  const readable = new Readable();
  readable._read = function () { /* noop */ };
  readable.push(data);
  readable.push(null);
  const pass = new PassThrough();
  // mock file that returns a writable stream
  const mockFile = {
    createWriteStream: () => pass
  };
  const mockBucket = {
    file: (_name: string) => mockFile
  } as any;
  // Pipe readable into a slight delay to simulate async streaming
  const promise = backup.uploadToGCSWithRetry(mockBucket, 'obj.mp4', readable, 'video/mp4');
  // When readable pipes to pass, end the pass after a tick to emit finish
  // Actually pipe will end pass when readable ends, so just wait for promise
  await promise;
  console.log('testUploadToGCSWithRetryStream passed');



}
	async function testDryRun() {

async function testUploadToGCSWithRetryFail() {
  let attemptCount = 0;
  const mockFile = {
    save: async () => {
      attemptCount++;
      throw new Error('upload fail');
    },
    createWriteStream: () => ({
      on: (event: string, cb: any) => {
        if (event === 'error') cb(new Error('stream fail'));
      }
    })
  };
  const mockBucket = { file: () => mockFile } as any;
  const buf = Buffer.from('test');
  let threw = false;
  try {
    await backup.uploadToGCSWithRetry(mockBucket, 'test.mp4', buf, 'video/mp4');
  } catch (e: any) {
    threw = true;
    assert.strictEqual(attemptCount, 3, 'should retry 3 times');
    assert.ok(e.message.includes('Upload failed after 3 attempts'));
  }
  assert.ok(threw);
  console.log('testUploadToGCSWithRetryFail passed');
}

  process.env.DRY_RUN = 'true';
  let savedBuffer: Buffer | null = null;
  let savedOptions: any = null;
  const mockFile = {
    save: async (buffer: Buffer, options: any) => {
      savedBuffer = buffer;
      savedOptions = options;
      return Promise.resolve();
    }
  };
  const mockBucket = {
    file: (_name: string) => mockFile
  } as any;
  const buf = Buffer.from('hello');
  await backup.uploadToGCSWithRetry(mockBucket, 'obj.mp4', buf, 'video/mp4');
  assert.strictEqual(savedBuffer, null, 'should not save buffer in dry-run mode');
  assert.strictEqual(savedOptions, null, 'should not set options in dry-run mode');
  console.log('testDryRun passed');
	}
async function run() {
  await testWithRetrySuccess();
  await testWithRetryFail();
  await testUploadToGCSWithRetryBuffer();
  await testExtractNewClipsFiltering();
	async function testExtractNewClipsFiltering() {
  const mockScrypted = {
    deviceManager: {
      getDevices: () => [
        {
          interfaces: ['VideoClips'],
          videoClips: {
            getVideoClips: async (options: any) => {
              // Mock clips within time range
              const mockClips = [
                { id: '1', cameraName: 'front', startTime: 1, endTime: 2, mimeType: 'video/mp4' },
                { id: '2', cameraName: 'back', startTime: 3, endTime: 4, mimeType: 'video/mp4' },
                { id: '3', cameraName: 'side', startTime: 5, endTime: 6, mimeType: 'video/mp4' }
              ];
              return mockClips.filter(clip => options.startTime <= clip.startTime && clip.endTime <= options.endTime);
            }
          }
        }
      ]
    }
  
  };
  // Test include list
  process.env.CAMERA_INCLUDE_LIST = 'front';
  process.env.NODE_ENV = 'test';
  process.env.CAMERA_EXCLUDE_LIST = '';
  let clips = await backup.extractNewClips(mockScrypted, 0, 10);
  assert.strictEqual(clips.length, 1);
  assert.strictEqual(clips[0].cameraName, 'front');
  // Test exclude list
  process.env.CAMERA_INCLUDE_LIST = '';
  process.env.CAMERA_EXCLUDE_LIST = 'front';
  clips = await backup.extractNewClips(mockScrypted, 0, 10);
  assert.strictEqual(clips.length, 2);
  assert.strictEqual(clips[0].cameraName, 'back'); // front excluded, back and side included
  assert.strictEqual(clips[1].cameraName, 'side');
  // Test both include and exclude
  process.env.CAMERA_INCLUDE_LIST = 'front,side';
  process.env.CAMERA_EXCLUDE_LIST = 'front';
  clips = await backup.extractNewClips(mockScrypted, 0, 10);
  assert.strictEqual(clips.length, 1);
  assert.strictEqual(clips[0].cameraName, 'side'); // front excluded despite include
  // Test wildcard include
  process.env.CAMERA_INCLUDE_LIST = '*';
  process.env.CAMERA_EXCLUDE_LIST = '';
  clips = await backup.extractNewClips(mockScrypted, 0, 10);
  assert.strictEqual(clips.length, 3); // all three clips in range
  console.log('testExtractNewClipsFiltering passed');
	}

async function testReadLastTimestampSuccess() {
  const mockData = JSON.stringify({ lastTimestamp: 1234567890 });
  const originalReadFile = (fs as any).readFile;
  (fs as any).readFile = async () => Buffer.from(mockData, 'utf8');
  try {
    const timestamp = await backup.readLastTimestamp();
    assert.strictEqual(timestamp, 1234567890);
  } finally {
    (fs as any).readFile = originalReadFile;
  }
  console.log('testReadLastTimestampSuccess passed');
}

async function testReadLastTimestampFallback() {
  const originalReadFile = (fs as any).readFile;
  (fs as any).readFile = async () => { throw new Error('no file'); };
  try {
    const timestamp = await backup.readLastTimestamp();
    const expected = Date.now() - (24 * 60 * 60 * 1000);
    assert.ok(Math.abs(timestamp - expected) < 1000, 'should fallback to 24h ago');
  } finally {





    (fs as any).readFile = originalReadFile;
  }
  console.log('testReadLastTimestampFallback passed');
}

async function testUpdateLastTimestamp() {
  const testTimestamp = 1234567890;
  let writtenData: string | undefined;
  const originalWriteFile = (fs as any).writeFile;
  (fs as any).writeFile = async (path: string, data: Buffer | string) => {
    writtenData = data.toString();
  };
  try {
    await backup.updateLastTimestamp(testTimestamp);
    assert.ok(writtenData, 'should have written data');
    const state = JSON.parse(writtenData);
    assert.strictEqual(state.lastTimestamp, testTimestamp);
  } finally {
    (fs as any).writeFile = originalWriteFile;
  }
  console.log('testUpdateLastTimestamp passed');
}

async function testCreateGCSClientSuccess() {
  process.env.GCS_PROJECT_ID = 'testproj';
  process.env.GCS_BUCKET_NAME = 'testbucket';
  process.env.GCS_KEYFILE_PATH = '/tmp/key.json';
  const client = backup.createGCSClient();
  assert.ok(client instanceof Storage);
  console.log('testCreateGCSClientSuccess passed');
}

async function testCreateGCSClientMissingEnv() {
  delete process.env.GCS_PROJECT_ID;
  let threw = false;
  try {
    backup.createGCSClient();
  } catch (e: any) {
    threw = true;
    assert.ok(e.message.includes('GCS configuration missing'));
  }
  assert.ok(threw);
  console.log('testCreateGCSClientMissingEnv passed');
}

async function testGetVideoClipsDevice() {
  const mockScrypted = {
    getDevices: () => [
      {
        interfaces: ['VideoClips'],
        videoClips: { getVideoClips: async () => [] }
      }
    ]
  };
  const videoClips = backup.getVideoClipsDevice(mockScrypted);
  assert.ok(videoClips);
  assert.strictEqual(videoClips.getVideoClips, mockScrypted.getDevices()[0].videoClips.getVideoClips);
  console.log('testGetVideoClipsDevice passed');
}

async function testGetScryptedRuntimeTestFilter() {
  process.env.NODE_ENV = 'test';
  const runtime = backup.getScryptedRuntime();
  const videoClips = runtime.deviceManager.getDevices()[0].videoClips;
  // Test filter with startTime > 0, should exclude first clip
  const clipsStart = await videoClips.getVideoClips({ startTime: 2 });
  assert.strictEqual(clipsStart.length, 2); // clips 2 and 3
  // Test filter with endTime < Infinity, but all within
  const clipsEnd = await videoClips.getVideoClips({ endTime: 10 });
  assert.strictEqual(clipsEnd.length, 3);
  // Test full range
  const allClips = await videoClips.getVideoClips({});
  assert.strictEqual(allClips.length, 3);
  console.log('testGetScryptedRuntimeTestFilter passed');
}

async function testMainMock() {
  const connectStub = sinon.stub(backup, 'connectSdk').callsFake(async () => ({
    getDevices: () => [{ interfaces: ['VideoClips'], videoClips: { getVideoClips: async () => [{ id: 'test', cameraName: 'testcam', startTime: Date.now(), endTime: Date.now() + 1000, mimeType: 'video/mp4' }] } }]
  }));
  const extractStub = sinon.stub(backup, 'extractNewClips').callsFake(async () => [{ id: 'test', cameraName: 'testcam', startTime: new Date(), endTime: new Date(Date.now() + 1000), mimeType: 'video/mp4' }]);


async function testGetScryptedRuntimeProd() {
  process.env.NODE_ENV = 'prod';
  const scrypted = backup.getScryptedRuntime();
  assert.ok(scrypted, 'should load scrypted sdk in prod mode');
  process.env.NODE_ENV = 'test';
  console.log('testGetScryptedRuntimeProd passed');
}

async function testConnectSdk() {
  const scrypted = await backup.connectSdk({});
  assert.ok(scrypted, 'should connect to sdk');
  console.log('testConnectSdk passed');
}

async function testConnectSdkFunction() {
  process.env.NODE_ENV = 'test';
  const mockScrypted = {
    connect: async (opts: any) => ({ connected: true, opts })
  };
  const originalRequire = require;
  (require as any) = () => mockScrypted;
  try {
    const result = await backup.connectSdk({ test: 'opts' });
    assert.ok(result.connected);
    assert.deepStrictEqual(result.opts, { test: 'opts' });
  } finally {
    require = originalRequire;
    process.env.NODE_ENV = 'test';
  }
  console.log('testConnectSdkFunction passed');
}

async function testLogLevels() {
  const consoleDebugSpy = sinon.spy(console, 'debug');
  const consoleInfoSpy = sinon.spy(console, 'info');
  const consoleWarnSpy = sinon.spy(console, 'warn');
  const consoleErrorSpy = sinon.spy(console, 'error');
  try {
    // Test debug level
    process.env.LOG_LEVEL = 'debug';
    backup.log.debug('debug msg');
    assert.ok(consoleDebugSpy.calledWith('[DEBUG]', 'debug msg'));
    consoleDebugSpy.resetHistory();

    // Test info level (debug not called)
    process.env.LOG_LEVEL = 'info';
    backup.log.debug('debug msg');
    assert.ok(!consoleDebugSpy.called);
    backup.log.info('info msg');
    assert.ok(consoleInfoSpy.calledWith('[INFO]', 'info msg'));
    consoleInfoSpy.resetHistory();

    // Test warn level
    process.env.LOG_LEVEL = 'warn';
    backup.log.warn('warn msg');
    assert.ok(consoleWarnSpy.calledWith('[WARN]', 'warn msg'));
    consoleWarnSpy.resetHistory();

    // Test error level
    process.env.LOG_LEVEL = 'error';
    backup.log.error('error msg');
    assert.ok(consoleErrorSpy.calledWith('[ERROR]', 'error msg'));
    consoleErrorSpy.resetHistory();

    // Test invalid level defaults to info
    process.env.LOG_LEVEL = 'invalid';
    backup.log.info('info msg');
    assert.ok(consoleInfoSpy.calledWith('[INFO]', 'info msg'));
  } finally {
    consoleDebugSpy.restore();
    consoleInfoSpy.restore();
    consoleWarnSpy.restore();
    consoleErrorSpy.restore();
    process.env.LOG_LEVEL = 'info'; // reset
  }
  console.log('testLogLevels passed');
}



async function testUploadToGCSWithRetryStreamError() {
  const mockFile = {
    createWriteStream: () => ({
      on: (event: string, cb: any) => {
        if (event === 'error') setImmediate(() => cb(new Error('stream error')));
      }
    })
  };
  const mockBucket = { file: () => mockFile } as any;
  const readable = new Readable();
  readable._read = () => {};
  readable.push(Buffer.from('data'));
  readable.push(null);
  let threw = false;
  try {
    await backup.uploadToGCSWithRetry(mockBucket, 'test.mp4', readable, 'video/mp4');
  } catch (e: any) {
    threw = true;
    assert.ok(e.message.includes('Upload failed after 3 attempts'));
  }
  assert.ok(threw);
  console.log('testUploadToGCSWithRetryStreamError passed');
}







async function testGetScryptedRuntimeFail() {
  process.env.NODE_ENV = 'prod';
  const originalRequire = require;
  (require as any) = () => { throw new Error('sdk not found'); };
  try {
    const scrypted = backup.getScryptedRuntime();
    assert.strictEqual(scrypted, undefined);
    console.log('testGetScryptedRuntimeFail passed');
  } finally {
    require = originalRequire;
    process.env.NODE_ENV = 'test';
  }
}











async function testGetVideoClipsDeviceProdNoVideoClips() {
  process.env.NODE_ENV = 'prod';
  const mockScryptedRuntime = {
    ScryptedInterface: { VideoClips: 'VideoClips' },
    connect: async () => ({ getDevices: () => [
      { interfaces: ['Other'], videoClips: undefined }
    ] })
  };
  const originalRequire = require;
  (require as any) = () => mockScryptedRuntime;
  try {
    const scrypted = { getDevices: () => mockScryptedRuntime.connect() };
    backup.getVideoClipsDevice(scrypted);
    assert.fail('should throw no VideoClips');
  } catch (e: any) {
    assert.strictEqual(e.message, 'No VideoClips device found');
  } finally {
    require = originalRequire;
    process.env.NODE_ENV = 'test';
  }
  console.log('testGetVideoClipsDeviceProdNoVideoClips passed');
}


async function testGetVideoClipsDeviceProdNoInterface() {
  process.env.NODE_ENV = 'prod';
  const mockScryptedRuntime = { connect: async () => ({ getDevices: () => [] }) };
  const originalRequire = require;
  (require as any) = () => mockScryptedRuntime;
  try {
    const scrypted = { getDevices: () => mockScryptedRuntime.connect() };
    backup.getVideoClipsDevice(scrypted);
    assert.fail('should throw no devices');
  } catch (e: any) {
    assert.strictEqual(e.message, 'No VideoClips device found');
  } finally {
    require = originalRequire;
    process.env.NODE_ENV = 'test';
  }
  console.log('testGetVideoClipsDeviceProdNoInterface passed');
}

async function testGetVideoClipsDeviceProdSuccess() {
  process.env.NODE_ENV = 'prod';
  const mockScryptedRuntime = {
    ScryptedInterface: { VideoClips: 'VideoClips' },
    connect: async () => ({
      getDevices: () => [
        { interfaces: ['Other'] }, // no match
        { interfaces: ['VideoClips'], videoClips: { getVideoClips: async () => [] } } // match
      ]
    })
  };
  const originalRequire = require;
  (require as any) = () => mockScryptedRuntime;
  try {
    const scrypted = await mockScryptedRuntime.connect();
    const videoClips = backup.getVideoClipsDevice(scrypted);
    assert.ok(videoClips);
    assert.ok(videoClips.getVideoClips);
  } finally {
    require = originalRequire;
    process.env.NODE_ENV = 'test';
  }
  console.log('testGetVideoClipsDeviceProdSuccess passed');
}

async function testMainFullFlow() {
  // Mock pLimit to single thread for test
  const originalPLimit = require('p-limit');
  (require as any).cache['p-limit'] = () => (fn: any) => fn(); // single execution
  const originalFsWriteFile = fs.writeFile;
  let writtenData: string | undefined;
  (fs as any).writeFile = async (path: string, data: Buffer | string) => {
    writtenData = data.toString();
  };
  const mockScrypted = backup.getScryptedRuntime(); // use test runtime
  const connectStub = sinon.stub(backup, 'connectSdk').resolves(mockScrypted);
  const readStub = sinon.stub(backup, 'readLastTimestamp').resolves(Date.now() - 3600000);
  const uploadStub = sinon.stub(backup, 'uploadToGCSWithRetry').resolves();
  const getVideoClipStub = sinon.stub(mockScrypted.deviceManager.getDevices()[0].videoClips, 'getVideoClip').resolves({
    mediaStream: new PassThrough()
  });
  try {
    await backup.main();
    assert.ok(connectStub.calledOnce);
    assert.ok(readStub.calledOnce);
    assert.ok(uploadStub.called);
    assert.ok(getVideoClipStub.called);
    assert.ok(writtenData, 'should update state');
    const state = JSON.parse(writtenData);
    assert.ok(state.lastTimestamp > Date.now() - 3600000, 'should update timestamp');
    // Check objectName via upload args
    const call = uploadStub.firstCall;
    assert.ok(call.args[1].includes('front/2025/09/24/'), 'should generate objectName with date/camera');
  } finally {
    connectStub.restore();
    readStub.restore();
    uploadStub.restore();
    getVideoClipStub.restore();
    (fs as any).writeFile = originalFsWriteFile;
    require.cache['p-limit'] = originalPLimit;
  }
  console.log('testMainFullFlow passed');
}

async function testMainEmptyClips() {
  const connectStub = sinon.stub(backup, 'connectSdk').resolves(backup.getScryptedRuntime());
  const extractStub = sinon.stub(backup, 'extractNewClips').resolves([]);
  const readStub = sinon.stub(backup, 'readLastTimestamp').resolves(Date.now());
  const originalFsWriteFile = fs.writeFile;
  (fs as any).writeFile = async () => {}; // no-op
  try {
    await backup.main();
    assert.ok(connectStub.calledOnce);
    assert.ok(extractStub.calledOnce);
    assert.ok(readStub.calledOnce);
    // No upload or update called
  } finally {
    connectStub.restore();
    extractStub.restore();
    readStub.restore();
    (fs as any).writeFile = originalFsWriteFile;
  }
  console.log('testMainEmptyClips passed');
}






async function testConnectSdkNonFunction() {
  process.env.NODE_ENV = 'test';
  const mockScrypted = { connect: 'not a function' };
  const originalRequire = require;
  (require as any) = () => mockScrypted;
  try {
    const result = await backup.connectSdk({});
    assert.strictEqual(result, mockScrypted);
    console.log('testConnectSdkNonFunction passed');
  } finally {
    require = originalRequire;
    process.env.NODE_ENV = 'test';
  }
}





async function testMainNoClips() {
  const extractStub = sinon.stub(backup, 'extractNewClips').resolves([]);
  const connectStub = sinon.stub(backup, 'connectSdk').resolves({});
  const readStub = sinon.stub(backup, 'readLastTimestamp').resolves(Date.now());
  const createStub = sinon.stub(backup, 'createGCSClient').callsFake(() => ({} as any));
  const updateStub = sinon.stub(backup, 'updateLastTimestamp').resolves();
  try {
    await backup.main();
    assert.ok(connectStub.calledOnce);
    assert.ok(extractStub.calledOnce);
    assert.ok(createStub.notCalled);
    assert.ok(updateStub.notCalled);
    console.log('testMainNoClips passed');
  } finally {
    extractStub.restore();
    connectStub.restore();
    readStub.restore();
    createStub.restore();
    updateStub.restore();
  }
}



async function testMainWithFailures() {
  const clips = [
    { id: 'clip1', cameraName: 'front', startTime: new Date(Date.now()), endTime: new Date(Date.now() + 1000), mimeType: 'video/mp4' },
    { id: 'clip2', cameraName: 'back', startTime: new Date(Date.now() + 2000), endTime: new Date(Date.now() + 3000), mimeType: 'video/mp4' }
  ];
  const extractStub = sinon.stub(backup, 'extractNewClips').resolves(clips);
  const connectStub = sinon.stub(backup, 'connectSdk').resolves({});
  const readStub = sinon.stub(backup, 'readLastTimestamp').resolves(Date.now() - 3600000);
  const createStub = sinon.stub(backup, 'createGCSClient').callsFake(() => ({ bucket: () => ({}) } as any));
  const updateStub = sinon.stub(backup, 'updateLastTimestamp').resolves();
  const uploadStub = sinon.stub(backup, 'uploadToGCSWithRetry');
  uploadStub.onFirstCall().resolves();
  uploadStub.onSecondCall().rejects(new Error('upload fail'));
  try {
    await backup.main();
    assert.ok(connectStub.calledOnce);
    assert.ok(extractStub.calledOnce);
    assert.ok(createStub.calledOnce);
    assert.ok(uploadStub.calledTwice);
    assert.ok(readStub.calledOnce);
    assert.ok(updateStub.calledOnce);
    console.log('testMainWithFailures passed');
  } finally {
    extractStub.restore();
    connectStub.restore();
    readStub.restore();
    createStub.restore();
    updateStub.restore();
    uploadStub.restore();
  }
}

async function testMainSuccess() {
  const clips = [
    { id: 'clip1', cameraName: 'front', startTime: new Date(Date.now()), endTime: new Date(Date.now() + 1000), mimeType: 'video/mp4' }
  ];
  const extractStub = sinon.stub(backup, 'extractNewClips').resolves(clips);
  const connectStub = sinon.stub(backup, 'connectSdk').resolves({
    getDevices: () => [{ interfaces: ['VideoClips'], videoClips: { getVideoClips: async () => clips } }]
  });
  const readStub = sinon.stub(backup, 'readLastTimestamp').resolves(Date.now() - 3600000);
  const createStub = sinon.stub(backup, 'createGCSClient').callsFake(() => ({
    bucket: () => ({
      file: () => ({
        createWriteStream: () => ({ on: () => {}, end: () => {} })
      })
    })
  } as any));
  const updateStub = sinon.stub(backup, 'updateLastTimestamp').resolves();
  const uploadStub = sinon.stub(backup, 'uploadToGCSWithRetry').resolves();
  try {
    await backup.main();
    assert.ok(connectStub.calledOnce);
    assert.ok(extractStub.calledOnce);
    assert.ok(createStub.calledOnce);
    assert.ok(uploadStub.calledOnce);
    assert.ok(readStub.calledOnce);
    assert.ok(updateStub.calledOnce);
    // Check objectName generation indirectly via upload call
    assert.ok(uploadStub.firstCall.args[1].includes('front/'));
    console.log('testMainSuccess passed');
  } finally {
    extractStub.restore();
    connectStub.restore();
    readStub.restore();
    createStub.restore();
    updateStub.restore();
    uploadStub.restore();
  }
}








async function testGetVideoClipsDeviceNoDevices() {
  const mockScrypted = {
    deviceManager: {
      getDevices: () => []
    }
  };
  let threw = false;
  try {
    backup.getVideoClipsDevice(mockScrypted);
  } catch (e: any) {
    threw = true;
    assert.strictEqual(e.message, 'No VideoClips device found');
  }
  assert.ok(threw);
  console.log('testGetVideoClipsDeviceNoDevices passed');
}





  const createStub = sinon.stub(backup, 'createGCSClient').callsFake(() => ({ bucket: () => ({ file: () => ({ createWriteStream: () => ({ on: () => {}, end: () => {} }) }) }) } as any));
  const uploadStub = sinon.stub(backup, 'uploadToGCSWithRetry').callsFake(async () => {});
  const readStub = sinon.stub(backup, 'readLastTimestamp').callsFake(async () => Date.now() - 3600000);
  const updateStub = sinon.stub(backup, 'updateLastTimestamp').callsFake(async () => {});

(async () => {
  try {
    await testWithRetrySuccess();
    await testWithRetryFail();
    await testUploadToGCSWithRetryBuffer();
    await testUploadToGCSWithRetryStream();

    await testUploadToGCSWithRetryStreamError();
    await testReadLastTimestampFallback();
    await testReadLastTimestampSuccess();
    await testUpdateLastTimestamp();
    await testCreateGCSClientSuccess();
    await testCreateGCSClientMissingEnv();
    await testExtractNewClipsFiltering();
    await testGetVideoClipsDevice();
    await testGetVideoClipsDeviceNoDevices();
    await testGetScryptedRuntimeTestFilter();
    await testMainMock();
    await testGetScryptedRuntimeProd();
    await testGetScryptedRuntimeFail();
    await testConnectSdk();
    await testConnectSdkFunction();
    await testConnectSdkNonFunction();
    await testLogLevels();
    await testGetVideoClipsDeviceProdNoVideoClips();
    await testGetVideoClipsDeviceProdNoInterface();
    await testGetVideoClipsDeviceProdSuccess();
    await testMainFullFlow();
    await testMainEmptyClips();
    await testMainNoClips();
    await testMainWithFailures();
    await testMainSuccess();
    console.log('All backup tests passed');
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
})();

  try {
    await backup.main();
    assert.ok(connectStub.calledOnce);
    assert.ok(extractStub.calledOnce);
    assert.ok(createStub.calledOnce);
    assert.ok(uploadStub.calledOnce);
    assert.ok(readStub.calledOnce);
    assert.ok(updateStub.calledOnce);
    console.log('testMainMock passed');
  } finally {
    connectStub.restore();
    extractStub.restore();
    createStub.restore();
    uploadStub.restore();
    readStub.restore();
    updateStub.restore();
  }
}

  await testUploadToGCSWithRetryStream();
      await testDryRun();
  console.log('All tests passed');
}
run().catch(err => {
  console.error('Test failed', err);
  process.exit(1);
});
