const BASE = 'http://127.0.0.1:' + (process.env.VOICEVOX_PORT || '50021');

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout || 15000);
  try {
    const response = await fetch(BASE + path, { ...options, signal: controller.signal });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const error = new Error(body.slice(0, 500) || `Engine HTTP ${response.status}`);
      error.code = response.status === 422 ? 'QUERY_INVALID' : 'ENGINE_HTTP';
      error.status = response.status;
      throw error;
    }
    return response;
  } catch (error) {
    if (error.name === 'AbortError') { error.code = 'ENGINE_TIMEOUT'; }
    if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') error.code = 'ENGINE_OFFLINE';
    throw error;
  } finally { clearTimeout(timer); }
}

export async function status() {
  const [version, speakers, manifest] = await Promise.all([
    request('/version').then(r => r.json()),
    request('/speakers').then(r => r.json()),
    request('/engine_manifest').then(r => r.json()).catch(() => ({}))
  ]);
  const styles = [];
  for (const speaker of speakers) for (const style of speaker.styles || []) styles.push({
    speakerUuid: speaker.speaker_uuid, speakerName: speaker.name,
    styleId: style.id, styleName: style.name,
    terms: style.terms_of_use || speaker.terms_of_use || ''
  });
  return { version: version.version || version, uuid: manifest.uuid || null,
    manifestVersion: manifest.version || null, styles, speakers: speakers.map(s => ({
      uuid: s.speaker_uuid, name: s.name, styles: (s.styles || []).map(x => ({ id: x.id, name: x.name }))
    })) };
}

export async function query(text, styleId, options = {}) {
  const response = await request(`/audio_query?text=${encodeURIComponent(text)}&speaker=${encodeURIComponent(styleId)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enable_katakana_english: options.enableKatakanaEnglish !== false }), timeout: 30000
  });
  return response.json();
}

export async function synthesize(audioQuery, styleId, signal) {
  const timeout = AbortSignal.timeout(120000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const body = JSON.stringify(audioQuery);
  try {
    let response = await fetch(`${BASE}/cancellable_synthesis?speaker=${encodeURIComponent(styleId)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: combined
    });
    if (!response.ok && !combined.aborted) {
      // Engine 0.25.x can advertise this experimental route while keeping it disabled.
      response = await fetch(`${BASE}/synthesis?speaker=${encodeURIComponent(styleId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: combined
      });
    }
    if (!response.ok) { const e = new Error((await response.text()).slice(0, 500)); e.code = response.status === 422 ? 'QUERY_INVALID' : 'ENGINE_HTTP'; throw e; }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (timeout.aborted && !signal?.aborted) error.code = 'ENGINE_TIMEOUT';
    else if (signal?.aborted) error.code = 'CANCELLED';
    else if (error.cause?.code === 'ECONNREFUSED') error.code = 'ENGINE_OFFLINE';
    throw error;
  }
}

export async function analyze({ text, styleId, mode, phrases }) {
  if (!Number.isInteger(styleId)) throw new Error('必须选择有效风格');
  if (!['accent_phrases', 'mora_data', 'mora_pitch', 'mora_length'].includes(mode)) throw new Error('无效重算类型');
  const suffix = mode === 'accent_phrases' ? `&text=${encodeURIComponent(text)}` : '';
  const response = await request(`/${mode}?speaker=${styleId}${suffix}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    ...(mode === 'accent_phrases' ? {} : { body: JSON.stringify(phrases) }), timeout: 30000
  });
  return response.json();
}

export { BASE };
