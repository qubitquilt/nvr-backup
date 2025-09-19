import assert from 'assert';
import { Readable, PassThrough } from 'stream';
import { withRetry, uploadToGCSWithRetry } from '../src/backup';

async function testWithRetrySuccess() {
  let calls = 0;
  const fn = async () => {
    calls++;
    if (calls < 3) throw new Error('temporary');
    return 'ok';
  };

  const res = await withRetry(fn, 'testWithRetry', 3);
  assert.strictEqual(res, 'ok');
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
    await withRetry(fn, 'testWithRetryFail', 2);
  } catch (e: any) {
    threw = true;
    assert.ok(e.message.includes('failed after'));
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
    file: (name: string) => mockFile
  } as any;

  const buf = Buffer.from('hello');
  await uploadToGCSWithRetry(mockBucket, 'obj.mp4', buf, 'video/mp4');

  assert.ok(savedBuffer && savedBuffer.equals(buf), 'buffer should be saved');
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
    createWriteStream: (opts: any) => pass
  };

  const mockBucket = {
    file: (name: string) => mockFile
  } as any;

  // Pipe readable into a slight delay to simulate async streaming
  const promise = uploadToGCSWithRetry(mockBucket, 'obj.mp4', readable, 'video/mp4');

  // When readable pipes to pass, end the pass after a tick to emit finish
  // Actually pipe will end pass when readable ends, so just wait for promise
  await promise;
  console.log('testUploadToGCSWithRetryStream passed');
}

async function run() {
  await testWithRetrySuccess();
  await testWithRetryFail();
  await testUploadToGCSWithRetryBuffer();
  await testUploadToGCSWithRetryStream();
  console.log('All tests passed');
}

run().catch(err => {
  console.error('Test failed', err);
  process.exit(1);
});
