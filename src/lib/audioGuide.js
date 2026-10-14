// AI 장소 해설(오디오 가이드) — 서버 전용.
// 1) Gemini가 공개된 사실 위주로 1분 30초 안팎의 원고를 쓰고 2) Gemini TTS로 읽어 3) MP3로 줄여 Storage에 저장한다.
// 같은 장소·언어는 Firestore audio_guides/{id}에 저장해 다시 만들지 않는다(비용은 장소당 한 번).
import { createHash, randomUUID } from 'node:crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Mp3Encoder } from '@breezystack/lamejs';
import { admin } from './firebaseAdmin';
import { generateWithRetry } from './geminiRetry';

const TEXT_MODEL = process.env.GEMINI_GUIDE_MODEL || 'gemini-3.1-flash-lite';
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
const VOICE = process.env.GEMINI_TTS_VOICE || 'Sulafat';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'my-trip-pro.firebasestorage.app';
const SAMPLE_RATE = 24000;

export const guideId = ({ name, city, lang }) =>
  createHash('sha1').update(`${lang}|${String(name).trim().toLowerCase()}|${String(city || '').trim().toLowerCase()}`).digest('hex').slice(0, 24);

// ── 원고 ────────────────────────────────────────────────
function scriptPrompt({ name, city, category, description, lang }) {
  const facts = [`장소: ${name}`, city && `도시: ${city}`, category && `종류: ${category}`, description && `일정에 적힌 설명: ${description}`].filter(Boolean).join('\n');
  if (lang === 'en') {
    return `You are Timmy, a warm travel audio guide for solo travelers. Write a spoken audio guide for this place.
${facts}

Rules:
- About 200-230 words, 3 short paragraphs, second person ("you"), easy spoken English.
- Only well-established facts (history, what it is known for, what to look at). If you are not sure about a number, date or name, leave it out. Never invent.
- Do not mention prices, opening hours or anything that changes often.
- End with one practical, safety-minded tip for a solo visitor (e.g. quieter times, where to stand, keep valuables close in crowds).
- If you do not know this place well, describe it only in general terms from the information above.
Return JSON only: {"title": "...", "teaser": "one short line under 40 characters about the story", "script": "..."}`;
  }
  return `당신은 혼자 여행하는 사람을 위한 다정한 오디오 가이드 '티미'예요. 이 장소의 음성 해설 원고를 써 주세요.
${facts}

규칙:
- 600~700자, 짧은 문단 3개, 말하듯 쉬운 존댓말(해요체), "여기", "지금 보시는" 같은 현장감 있는 표현.
- 널리 알려진 사실(역사, 유명한 이유, 꼭 볼 것)만 쓰세요. 숫자·연도·이름이 확실하지 않으면 빼세요. 지어내지 마세요.
- 입장료·운영 시간처럼 자주 바뀌는 정보는 쓰지 마세요.
- 마지막 문단에 혼자 온 여행자를 위한 실용적이고 안전한 팁 하나(덜 붐비는 시간, 소지품 주의 등).
- 잘 모르는 장소라면 위 정보 안에서 일반적인 내용만 쓰세요.
JSON만 돌려주세요: {"title": "...", "teaser": "20자 안팎의 한 줄 소개", "script": "..."}`;
}

async function writeScript(input) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: TEXT_MODEL, generationConfig: { responseMimeType: 'application/json', temperature: 0.4 } });
  const result = await generateWithRetry(model, scriptPrompt(input));
  const json = JSON.parse(result.response.text());
  const script = String(json.script || '').trim();
  if (script.length < 80) throw new Error('script too short');
  return { title: String(json.title || input.name).slice(0, 60), teaser: String(json.teaser || '').slice(0, 60), script };
}

// ── 음성 ────────────────────────────────────────────────
// 문단을 2~3개 덩어리로 나눠 동시에 읽힌다(함수 시간 제한 60초 안에 끝내기 위해).
function chunksOf(script) {
  const paras = script.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (paras.length >= 2 && paras.length <= 3) return paras;
  const sentences = script.match(/[^.!?。]+[.!?。]+|\S[^.!?。]*$/g) || [script];
  const per = Math.ceil(sentences.length / 3);
  const out = [];
  for (let i = 0; i < sentences.length; i += per) out.push(sentences.slice(i, i + per).join(' ').trim());
  return out.filter(Boolean);
}

// WAV(16bit mono)에서 PCM 부분만 꺼낸다
function pcmFromWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF') return buf; // 이미 PCM
  let off = 12;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'data') return buf.subarray(off + 8, off + 8 + size);
    off += 8 + size + (size % 2);
  }
  throw new Error('no wav data');
}

async function speak(text) {
  // 말투 지시문("Say warmly:" 등)은 넣지 않는다 — 원고 언어에 따라 지시문까지 소리 내어 읽는다(2026-10 확인).
  // 목소리(VOICE)만 차분한 것으로 고른다. 이 모델은 systemInstruction도 받지 않는다.
  const body = {
    contents: [{ parts: [{ text }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });
    if (res.ok) {
      const json = await res.json();
      const data = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
      if (data) return pcmFromWav(Buffer.from(data, 'base64'));
    }
    if (attempt === 0 && [429, 500, 503].includes(res.status)) { await new Promise((r) => setTimeout(r, 1500)); continue; }
    throw new Error(`tts ${res.status}`);
  }
  throw new Error('tts failed');
}

function toMp3(pcm) {
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const enc = new Mp3Encoder(1, SAMPLE_RATE, 48);
  const out = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const b = enc.encodeBuffer(samples.subarray(i, i + 1152));
    if (b.length) out.push(Buffer.from(b));
  }
  out.push(Buffer.from(enc.flush()));
  return Buffer.concat(out);
}

// 자막: 덩어리별 실제 길이 안에서 문장 길이(글자 수)에 비례해 시작 시각을 나눈다
function cuesFor(chunks, durations) {
  const cues = [];
  let start = 0;
  chunks.forEach((chunk, i) => {
    const sentences = chunk.match(/[^.!?。]+[.!?。]+["”’)]?|\S[^.!?。]*$/g) || [chunk];
    const total = sentences.reduce((a, s) => a + s.trim().length, 0) || 1;
    let t = start;
    sentences.forEach((s) => {
      const text = s.trim();
      if (!text) return;
      cues.push({ t: Math.round(t * 10) / 10, text, p: i });
      t += (durations[i] * text.length) / total;
    });
    start += durations[i];
  });
  return cues;
}

async function upload(id, mp3) {
  const token = randomUUID();
  const path = `audio-guides/${id}.mp3`;
  await admin.storage().bucket(BUCKET).file(path).save(mp3, {
    resumable: false,
    metadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable', metadata: { firebaseStorageDownloadTokens: token } },
  });
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

/** 원고 → 음성 → 저장. 반환: 한 개 트랙 */
export async function createAiGuide(id, input) {
  const { title, teaser, script } = await writeScript(input);
  const chunks = chunksOf(script);
  const pcms = await Promise.all(chunks.map((c) => speak(c)));
  const durations = pcms.map((p) => p.length / 2 / SAMPLE_RATE);
  const mp3 = toMp3(Buffer.concat(pcms));
  const src = await upload(id, mp3);
  const duration = Math.round(durations.reduce((a, b) => a + b, 0));
  return { title, teaser, tracks: [{ title, src, duration, script, cues: cuesFor(chunks, durations) }] };
}
