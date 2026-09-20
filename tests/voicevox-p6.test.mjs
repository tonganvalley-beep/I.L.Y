import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { loadEffectiveStory, loadVoiceLines } from '../tools/voicevox/story-source.mjs';

const code = await readFile(new URL('../game/src/core/voice.js', import.meta.url), 'utf8');
const hash = values => createHash('sha256').update(JSON.stringify(values)).digest('hex');
const defer = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function harness(options = {}) {
  const context = vm.createContext({ ILY: {}, TextEncoder, crypto: webcrypto, console });
  vm.runInContext(code, context);
  const values = ['chapter1', 'S01', '', 'dialogue', '甲', '中文字幕'];
  const manifest = { schemaVersion: 1, entries: { line: { file: 'assets/audio/voices/published/12345678901234567890.wav', sourceFingerprint: hash(values), renderHash: 'render' } } };
  const audios = [], warnings = [];
  const voice = new context.ILY.VoicePlayer({ manifest, getSource: () => ({ sourceValues: values }),
    warn: message => warnings.push(message), createAudio: path => {
      const audio = { path, playing: false, pauses: 0, play() { this.playing = true; return Promise.resolve(); }, pause() { this.playing = false; this.pauses++; }, removeAttribute() { this.released = true; }, load() {} };
      audios.push(audio); return audio;
    }, ...options });
  return { voice, audios, warnings, manifest, values, node: { id: 'proxy-body', reviewId: 'line', type: 'dialogue', text: '中文字幕' } };
}

test('P6 stable review identity, release on replacement/end, Chinese text unchanged', async () => {
  const h = harness();
  assert.equal(await h.voice.play(h.node), true);
  assert.equal(h.audios[0].volume, 0.8);
  assert.match(h.audios[0].path, /\?v=render$/);
  await h.voice.play(h.node);
  assert.equal(h.audios[0].playing, false);
  assert.equal(h.audios[0].released, true);
  assert.equal(h.audios[0].onended, null);
  h.audios[1].onended();
  assert.equal(h.voice.audio, null);
  assert.equal(h.node.text, '中文字幕');
});

test('P6 stopped or superseded fingerprint requests cannot start late audio', async () => {
  const pending = defer();
  const h = harness({ fingerprint: () => pending.promise });
  const first = h.voice.play(h.node);
  h.voice.stop();
  pending.resolve(hash(h.values));
  assert.equal(await first, false);
  assert.equal(h.audios.length, 0);
});

test('P6 late play resolve/reject cannot revive or stop newer audio', async () => {
  for (const rejected of [false, true]) {
    const pending = defer();
    const h = harness({ fingerprint: async () => hash(h.values) });
    const factory = h.voice.createAudio;
    h.voice.createAudio = path => { const audio = factory(path); if (h.audios.length === 1) audio.play = () => pending.promise; return audio; };
    const old = h.voice.play(h.node);
    await new Promise(resolve => setImmediate(resolve));
    await h.voice.play(h.node);
    if (rejected) pending.reject(new Error('late failure')); else pending.resolve();
    assert.equal(await old, false);
    assert.equal(h.audios[0].playing, false);
    assert.equal(h.audios[1].playing, true);
    h.voice.stop();
  }
});

test('P6 missing/stale/malformed manifest, disallowed nodes and paused context are silent', async () => {
  const h = harness();
  for (const type of ['cue', 'choice', 'rpg']) assert.equal(await h.voice.play({ ...h.node, type }), false);
  h.voice.canPlay = () => false;
  assert.equal(await h.voice.play(h.node), false);
  h.voice.canPlay = () => true;
  h.values[5] = '已编辑';
  assert.equal(await h.voice.play(h.node), false);
  assert.equal(h.warnings.length, 1);
  h.manifest.entries.line.file = '../untrusted.wav';
  assert.equal(await h.voice.play(h.node), false);
  h.voice.manifest = null;
  assert.equal(await h.voice.play(h.node), false);
  assert.equal(h.audios.length, 0);
});

test('P6 autoplay denial and corrupt audio degrade; settings persist independently', async () => {
  let settings;
  const storage = { getItem: () => settings, setItem: (_, value) => { settings = value; } };
  const h = harness({ storage });
  const factory = h.voice.createAudio;
  h.voice.createAudio = path => { const audio = factory(path); audio.play = () => Promise.reject(new Error('NotAllowedError')); return audio; };
  assert.equal(await h.voice.play(h.node), false);
  assert.equal(h.voice.audio, null);
  h.voice.createAudio = factory;
  await h.voice.play(h.node);
  h.voice.audio.onerror();
  assert.equal(h.voice.audio, null);
  h.voice.setVolume(0.35);
  h.voice.setEnabled(false);
  const restored = harness({ storage });
  assert.equal(restored.voice.volume, 0.35);
  assert.equal(restored.voice.enabled, false);
  assert.equal(await restored.voice.play(restored.node), false);
  const brokenStorage = harness({ storage: { getItem() { throw Error(); }, setItem() { throw Error(); } } });
  brokenStorage.voice.setVolume(0);
  assert.equal(await brokenStorage.voice.play(brokenStorage.node), false);
});

test('P6 browser source fingerprint equals P4 published source for every effective line', async () => {
  const { context, story, base } = await loadEffectiveStory();
  const expected = await loadVoiceLines();
  const actual = context.ILY.collectVoiceSources(story, base, context.ILY.data.stories);
  assert.equal(actual.length, expected.lines.length);
  for (let i = 0; i < actual.length; ++i) {
    assert.equal(actual[i].lineId, expected.lines[i].lineId);
    assert.equal(hash(actual[i].sourceValues), expected.lines[i].sourceFingerprint);
  }
});
