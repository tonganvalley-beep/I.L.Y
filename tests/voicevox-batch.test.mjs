import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { BatchQueue, isValidWav } from '../tools/voicevox/batch-queue.mjs';
import { parseDelimited, validateImport } from '../tools/voicevox/import-parser.mjs';

function wav() {
  const value = Buffer.alloc(44);
  value.write('RIFF', 0); value.writeUInt32LE(36, 4); value.write('WAVEfmt ', 8);
  value.writeUInt32LE(16, 16); value.writeUInt16LE(1, 20); value.writeUInt16LE(1, 22);
  value.writeUInt32LE(24000, 24); value.writeUInt32LE(48000, 28); value.writeUInt16LE(2, 32);
  value.writeUInt16LE(16, 34); value.write('data', 36); value.writeUInt32LE(0, 40);
  return value;
}

async function fixture(engine) {
  const dir = await mkdtemp(join(tmpdir(), 'ily-voicevox-'));
  const queue = new BatchQueue({ engine, journalFile: join(dir, 'queue.json'), renderDir: join(dir, 'renders') });
  await queue.init();
  return { queue, dir };
}

async function settled(queue) {
  for (let index = 0; index < 100; index += 1) {
    if (!queue.snapshot().tasks.some(task => ['pending', 'running'].includes(task.status))) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error('queue did not settle');
}

test('CSV parser supports quoted multiline fields and reports transactional duplicate errors', () => {
  const rows = parseDelimited('line_id,speech_text\r\na,"一行\n二行"\r\na,重复\r\nunknown,未知', ',');
  assert.equal(rows[0].speech_text, '一行\n二行');
  const result = validateImport([{ name: 'sample.csv', rows }], ['a']);
  assert.equal(result.updates.length, 1);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0], /重复 ID/);
  assert.match(result.errors[1], /未知 ID/);
});

test('queue completes serial tasks and exports only validated WAV files', async () => {
  let active = 0, maxActive = 0;
  const engine = {
    query: async text => ({ text, speedScale: 1 }),
    synthesize: async () => { active += 1; maxActive = Math.max(maxActive, active); await new Promise(resolve => setTimeout(resolve, 5)); active -= 1; return wav(); }
  };
  const { queue, dir } = await fixture(engine);
  await queue.enqueue([{ lineId: 'a', speechText: 'あ', styleId: 1, translationStatus: 'proofread' }, { lineId: 'b', speechText: 'い', styleId: 1, translationStatus: 'proofread' }], { uuid: 'engine', version: '1' });
  await settled(queue);
  assert.equal(maxActive, 1);
  assert.deepEqual(queue.snapshot().counts, { completed: 2 });
  const manifest = await queue.exportCompleted(['a', 'b'], join(dir, 'export'), join(dir, 'export', 'manifest.json'));
  assert.equal(manifest.count, 2);
  assert.match(manifest.entries[0].file, /^[a-f0-9]{24}\.wav$/);
  assert.ok(isValidWav(await readFile(join(dir, 'export', manifest.entries[0].file))));
});

test('WAV validation rejects truncated chunks instead of trusting the RIFF header', () => {
  const broken = wav();
  broken.writeUInt32LE(1024, 40);
  assert.equal(isValidWav(broken), false);
  assert.equal(isValidWav(wav()), true);
});

test('invalid WAV fails, retry succeeds, and restart recovers running tasks', async () => {
  let valid = false;
  const engine = { query: async () => ({ speedScale: 1 }), synthesize: async () => valid ? wav() : Buffer.from('bad') };
  const { queue, dir } = await fixture(engine);
  const result = await queue.enqueue([{ lineId: 'a', speechText: 'あ', styleId: 1, translationStatus: 'proofread' }]);
  await settled(queue);
  assert.equal(queue.snapshot().tasks[0].error.code, 'INVALID_WAV');
  valid = true; await queue.retry([result.added[0]]); await settled(queue);
  assert.equal(queue.snapshot().tasks[0].status, 'completed');
  await queue.persistChain;

  const journal = JSON.parse(await readFile(join(dir, 'queue.json'), 'utf8'));
  journal.tasks[0].status = 'running';
  await writeFile(join(dir, 'queue.json'), JSON.stringify(journal));
  const restored = new BatchQueue({ engine, journalFile: join(dir, 'queue.json'), renderDir: join(dir, 'renders') });
  await restored.init(); await settled(restored);
  assert.equal(restored.snapshot().tasks[0].status, 'completed');
});

test('cancelled late synthesis result cannot become completed', async () => {
  let release;
  const engine = { query: async () => ({}), synthesize: async () => new Promise(resolve => { release = () => resolve(wav()); }) };
  const { queue } = await fixture(engine);
  const result = await queue.enqueue([{ lineId: 'a', speechText: 'あ', styleId: 1, translationStatus: 'proofread' }]);
  while (queue.snapshot().tasks[0].status !== 'running') await new Promise(resolve => setTimeout(resolve, 1));
  while (!release) await new Promise(resolve => setTimeout(resolve, 1));
  await queue.cancel([result.added[0]]); release(); await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(queue.snapshot().tasks[0].status, 'cancelled');
});

test('5,000 prepared tasks can be validated and journaled without synthesis', async () => {
  const engine = { query: async () => ({}), synthesize: async () => wav() };
  const { queue } = await fixture(engine); await queue.setPaused(true);
  const lines = Array.from({ length: 5000 }, (_, index) => ({ lineId: `line-${index}`, speechText: `テスト${index}`, styleId: 1, translationStatus: 'proofread' }));
  const result = await queue.enqueue(lines, { uuid: 'mock', version: '1' });
  assert.equal(result.added.length, 5000);
  assert.equal(result.queue.counts.pending, 5000);
});
