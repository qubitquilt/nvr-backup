import assert from 'assert';
import { Readable, PassThrough } from 'stream';
import { withRetry, uploadToGCSWithRetry, extractNewClips } from '../src/backup';

async function testWithRetrySuccess() {
  let calls = 0;
  const fn = async () => {
    calls++;
    if (calls < 3) throw new Error('temporary');
    return 'ok';
  };

  const res = await withRetry(fn, 'testWithRetry', 3);
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
    await withRetry(fn, 'testWithRetryFail', 2);
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
  await uploadToGCSWithRetry(mockBucket, 'obj.mp4', buf, 'video/mp4');

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
  const promise = uploadToGCSWithRetry(mockBucket, 'obj.mp4', readable, 'video/mp4');

  // When readable pipes to pass, end the pass after a tick to emit finish
  // Actually pipe will end pass when readable ends, so just wait for promise
  await promise;
  console.log('testUploadToGCSWithRetryStream passed');
}



	async function testDryRun() {
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
	  await uploadToGCSWithRetry(mockBucket, 'obj.mp4', buf, 'video/mp4');

	  assert.strictEqual(savedBuffer, null, 'should not save buffer in dry-run mode');
	  assert.strictEqual(savedOptions, null, 'should not set options in dry-run mode');
	  console.log('testDryRun passed');
	}

async function run() {
  await testWithRetrySuccess();
  await testWithRetryFail();
  await testUploadToGCSWithRetryBuffer();



	async function testExtractNewClipsFiltering() {
	  const mockScrypted = {
	    getDevices: () => [
	      {
	        interfaces: ['VideoClips'],
	        videoClips: {
	          getVideoClips: async (options: any) => {
	            // Mock clips within time range
	            if (options.startTime <= 1 && options.endTime >= 4) {
	              return [
	                { id: '1', cameraName: 'front', startTime: 1, endTime: 2, mimeType: 'video/mp4' },
	                { id: '2', cameraName: 'back', startTime: 3, endTime: 4, mimeType: 'video/mp4' },
	                { id: '3', cameraName: 'side', startTime: 5, endTime: 6, mimeType: 'video/mp4' } // outside range
	              ];
	            }
	            return [];
	          }
	        }
	      }
	    ]
	  };

	  // Test include list
	  process.env.CAMERA_INCLUDE_LIST = 'front';
	  process.env.CAMERA_EXCLUDE_LIST = '';
	  let clips = await extractNewClips(mockScrypted, 0, 10);
	  assert.strictEqual(clips.length, 1);
	  assert.strictEqual(clips[0].cameraName, 'front');

	  // Test exclude list
	  process.env.CAMERA_INCLUDE_LIST = '';
	  process.env.CAMERA_EXCLUDE_LIST = 'front';
	  clips = await extractNewClips(mockScrypted, 0, 10);
	  assert.strictEqual(clips.length, 1);
	  assert.strictEqual(clips[0].cameraName, 'back'); // front excluded, back included

	  // Test both include and exclude
	  process.env.CAMERA_INCLUDE_LIST = 'front,side';
	  process.env.CAMERA_EXCLUDE_LIST = 'front';
	  clips = await extractNewClips(mockScrypted, 0, 10);
	  assert.strictEqual(clips.length, 1);
	  assert.strictEqual(clips[0].cameraName, 'side'); // front excluded despite include

	  // Test wildcard include
	  process.env.CAMERA_INCLUDE_LIST = '*';
	  process.env.CAMERA_EXCLUDE_LIST = '';
	  clips = await extractNewClips(mockScrypted, 0, 10);
	  assert.strictEqual(clips.length, 2); // front and back, side outside range

	  console.log('testExtractNewClipsFiltering passed');
	}



  await testUploadToGCSWithRetryStream();
      await testDryRun();
  console.log('All tests passed');
}

run().catch(err => {
  console.error('Test failed', err);
  process.exit(1);
});
