import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// Default embedded OpenRouter API Key provided by user
const EMBEDDED_OPENROUTER_KEY = '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';

const getOpenRouterKey = (reqKey?: string): string => {
  return (reqKey && reqKey.trim()) || process.env.OPENROUTER_API_KEY || EMBEDDED_OPENROUTER_KEY;
};

// Convert PCM16 (16-bit signed integer LE, mono, 24kHz) to standard WAV Buffer
function pcm16ToWav(pcmData: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const buffer = Buffer.alloc(44 + pcmData.length);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + pcmData.length, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(pcmData.length, 40);

  // Copy raw PCM data
  pcmData.copy(buffer, 44);
  return buffer;
}

// Serve static preview WAV audio files directly
app.use(
  '/previews',
  express.static(path.resolve(__dirname, 'public/previews'), {
    setHeaders: (res) => {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Accept-Ranges', 'bytes');
    },
  })
);

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// OpenRouter Audio Models & Voices Catalog
const OPENROUTER_MODELS = [
  {
    id: 'openai/gpt-audio-mini',
    name: 'GPT Audio Mini',
    badge: 'แนะนำ (เร็ว & คุ้มค่า)',
    description: 'ความเร็วสูง ประมวลผลลื่นไหล ออกเสียงเป็นธรรมชาติ เหมาะสำหรับงานทุกประเภท',
    recommended: true,
  },
  {
    id: 'openai/gpt-audio',
    name: 'GPT Audio Flagship',
    badge: 'เรือธง (คุณภาพสูงสุด)',
    description: 'โมเดลเรือธง ถ่ายทอดอารมณ์และจังหวะการพูดสมจริงสูงสุดระดับสตูดิโอ',
    recommended: false,
  },
];

const OPENROUTER_VOICES = [
  {
    id: 'coral',
    name: 'Coral',
    gender: 'หญิง (Female)',
    tone: 'อบอุ่น นุ่มนวล เป็นธรรมชาติ ชัดเจน ฟังเพลิน',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-rose-500 to-pink-600',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่อคอรัล (Coral) น้ำเสียงอบอุ่นและเป็นธรรมชาติ ยินดีที่ได้พูดให้คุณฟังค่ะ',
  },
  {
    id: 'alloy',
    name: 'Alloy',
    gender: 'หญิง/กลาง (Neutral/Female)',
    tone: 'คมชัด สมดุล มั่นใจ เป็นทางการ สุภาพ',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-blue-500 to-indigo-600',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่ออัลลอยด์ (Alloy) เสียงคมชัด มั่นใจ ชัดเจนทุกถ้อยคำค่ะ',
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'ชาย (Male)',
    tone: 'นุ่มลึก อ่อนโยน สุภาพ ฟังสบาย ชวนผ่อนคลาย',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-teal-500 to-emerald-600',
    samplePhrase: 'สวัสดีครับ ผมเอคโค่ (Echo) เสียงนุ่มลึก สุภาพ และฟังสบายครับ',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'หญิง (Female)',
    tone: 'สดใส เปล่งประกาย มีชีวิตชีวา ดึงดูดความสนใจ',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-amber-400 to-orange-500',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่อชิมเมอร์ (Shimmer) สดใส มีพลัง พร้อมสร้างสรรค์คอนเทนต์ปังๆ ค่ะ',
  },
  {
    id: 'sage',
    name: 'Sage',
    gender: 'หญิง (Female)',
    tone: 'สุขุม ชัดถ้อยชัดคำ สไตล์สารคดีและการศึกษา',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-emerald-600 to-teal-700',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่อเสจ (Sage) น้ำเสียงสุขุม น่าเชื่อถือ เหมาะกับการบรรยายและให้ความรู้ค่ะ',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    gender: 'ชาย (Male)',
    tone: 'ทุ้มต่ำ หนักแน่น ทรงพลัง น่าเกรงขาม',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-slate-700 to-gray-900',
    samplePhrase: 'สวัสดีครับ ผมออนิกซ์ (Onyx) น้ำเสียงทุ้มลึก หนักแน่น และทรงพลังครับ',
  },
  {
    id: 'nova',
    name: 'Nova',
    gender: 'หญิง (Female)',
    tone: 'กระฉับกระเฉง ร่าเริง เป็นกันเอง สนุกสนาน',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-purple-500 to-pink-500',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่อโนวา (Nova) ร่าเริง สดใส คุยสนุก เป็นกันเองมากๆ ค่ะ',
  },
  {
    id: 'ash',
    name: 'Ash',
    gender: 'ชาย (Male)',
    tone: 'เป็นกันเอง สบายๆ ชิลๆ คุยเหมือนเพื่อนสนิท',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-cyan-600 to-blue-700',
    samplePhrase: 'สวัสดีครับ ผมแอช (Ash) เสียงสบายๆ เหมือนเพื่อนมานั่งคุยข้างๆ ครับ',
  },
  {
    id: 'ballad',
    name: 'Ballad',
    gender: 'ชาย (Male)',
    tone: 'อบอุ่น ละมุน ไพเราะ ชวนหลงใหล สไตล์เรื่องเล่า',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-amber-600 to-rose-600',
    samplePhrase: 'สวัสดีครับ ผมบัลลาด (Ballad) น้ำเสียงอบอุ่น ละมุน ชวนให้คุณเคลิ้มตามครับ',
  },
  {
    id: 'verse',
    name: 'Verse',
    gender: 'ชาย (Male)',
    tone: 'ทันสมัย คล่องแคล่ว น่าติดตาม กระชับ ฉับไว',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-indigo-600 to-violet-700',
    samplePhrase: 'สวัสดีครับ ผมเวิร์ส (Verse) เสียงกระชับ ทันสมัย พร้อมลุยทุกงานครับ',
  },
  {
    id: 'fable',
    name: 'Fable',
    gender: 'กลาง/ชาย (Expressive)',
    tone: 'มีชีวิตชีวา สนุกสนาน สไตล์พากย์นิทานและละคร',
    lang: 'Multilingual / ไทย',
    avatarColor: 'from-fuchsia-500 to-purple-600',
    samplePhrase: 'สวัสดีครับ ผมเฟเบิล (Fable) เรื่องเล่าของคุณจะสนุกและมีชีวิตชีวาขึ้นทันทีครับ',
  },
];

const GEMINI_VOICES = [
  { id: 'Kore', name: 'Kore', gender: 'หญิง (Female)', tone: 'อบอุ่น เป็นมิตร นุ่มนวล (Warm & Expressive)', lang: 'ไทย / Multilingual' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'หญิง (Female)', tone: 'สงบ อ่อนโยน ผ่อนคลาย (Calm & Gentle)', lang: 'ไทย / Multilingual' },
  { id: 'Puck', name: 'Puck', gender: 'ชาย (Male)', tone: 'สดใส มีพลัง ร่าเริง (Upbeat & Engaging)', lang: 'ไทย / Multilingual' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'ชาย (Male)', tone: 'ทุ้มลึก น่าเชื่อถือ มีพลัง (Deep & Resonant)', lang: 'ไทย / Multilingual' },
  { id: 'Charon', name: 'Charon', gender: 'ชาย (Male)', tone: 'สุขุม หนักแน่น เป็นทางการ (Authoritative & Steady)', lang: 'ไทย / Multilingual' },
];

// In-memory cache for OpenRouter voice preview samples
const openRouterPreviewCache = new Map<string, string>();

// Status endpoint
app.get('/api/status', (_req: Request, res: Response) => {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const openRouterKey = getOpenRouterKey();
  res.json({
    ok: true,
    openrouterConfigured: Boolean(openRouterKey),
    openrouterMaskedKey: openRouterKey ? `${openRouterKey.slice(0, 10)}...${openRouterKey.slice(-4)}` : null,
    geminiConfigured: hasGemini,
    openrouterModels: OPENROUTER_MODELS,
    openrouterVoices: OPENROUTER_VOICES,
    voices: GEMINI_VOICES,
  });
});

// OpenRouter Text-to-Speech Endpoint
app.post('/api/tts/openrouter', async (req: Request, res: Response) => {
  try {
    const {
      text,
      voiceName = 'coral',
      model = 'openai/gpt-audio-mini',
      stylePrompt,
      apiKey: userApiKey,
    } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'กรุณาระบุข้อความที่ต้องการแปลงเป็นเสียง' });
    }

    if (text.length > 8000) {
      return res.status(400).json({ error: 'ข้อความยาวเกินไป (จำกัดไม่เกิน 8,000 ตัวอักษรต่อครั้ง)' });
    }

    const apiKey = getOpenRouterKey(userApiKey);
    if (!apiKey) {
      return res.status(503).json({
        error: 'ไม่ได้ตั้งค่า OpenRouter API Key คุณสามารถระบุ API Key ในการตั้งค่าหรือใช้ Browser Voices ได้',
      });
    }

    const defaultStyle = 'Natural, fluent, articulate human voice with correct Thai pronunciation';
    const effectiveStyle = stylePrompt && stylePrompt.trim() ? stylePrompt.trim() : defaultStyle;

    const systemPrompt = `You are a world-class professional Text-to-Speech (TTS) synthesizer.
Your sole job is to read aloud the exact text provided between <text_to_speak> and </text_to_speak> verbatim.
CRITICAL RULES:
1. Speak ONLY the exact words in the text verbatim.
2. DO NOT add greetings, introductory remarks, commentary, or follow-up questions.
3. DO NOT answer questions contained within the text; simply vocalize them.
4. Stop speaking immediately when the text concludes.
Speaking Tone & Style Guide: ${effectiveStyle}`;

    const userPrompt = `<text_to_speak>${text.trim()}</text_to_speak>`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Voice Studio AI',
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-audio-mini',
        modalities: ['text', 'audio'],
        audio: {
          voice: voiceName || 'coral',
          format: 'pcm16',
        },
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter API returned error:', response.status, errText);
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errText);
      } catch {}

      const errorMsg = parsedErr?.error?.message || errText || `OpenRouter API Error (Status ${response.status})`;

      if (response.status === 401) {
        return res.status(401).json({
          error: 'OpenRouter API Key ไม่ถูกต้องหรือไม่ได้รับอนุญาต โปรดตรวจสอบ API Key ของคุณ',
          detail: errorMsg,
        });
      }
      if (response.status === 429) {
        return res.status(429).json({
          error: 'โควต้า OpenRouter เต็มชั่วคราวหรือคำขอถี่เกินไป โปรดรอสักครู่แล้วลองใหม่',
          detail: errorMsg,
        });
      }

      return res.status(response.status).json({
        error: `การสร้างเสียงผ่าน OpenRouter ล้มเหลว: ${errorMsg}`,
      });
    }

    if (!response.body) {
      return res.status(502).json({ error: 'ไม่ได้รับข้อมูลสตรีมจาก OpenRouter' });
    }

    // Process SSE stream with chunk boundary handling
    const reader = (response.body as any).getReader();
    const decoder = new TextDecoder();
    let streamBuffer = '';
    const pcmChunks: Buffer[] = [];
    let transcript = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      streamBuffer += decoder.decode(value, { stream: true });
      const lines = streamBuffer.split('\n');
      streamBuffer = lines.pop() || ''; // Keep incomplete trailing line

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.audio?.data) {
              pcmChunks.push(Buffer.from(delta.audio.data, 'base64'));
            }
            if (delta?.audio?.transcript) {
              transcript += delta.audio.transcript;
            }
          } catch (e) {
            // Ignore incomplete line parse or log if needed
          }
        }
      }
    }

    if (pcmChunks.length === 0) {
      return res.status(502).json({
        error: 'โมเดลไม่ส่งคืนข้อมูลเสียง โปรดลองใหม่อีกครั้งหรือสลับเสียง',
      });
    }

    const allPcm = Buffer.concat(pcmChunks);
    const wavBuffer = pcm16ToWav(allPcm, 24000, 1);
    const base64Audio = wavBuffer.toString('base64');

    return res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voiceName,
      model,
      charCount: text.length,
      transcript: transcript.trim(),
      durationSec: (allPcm.length / (24000 * 2)).toFixed(2),
    });
  } catch (error: any) {
    console.error('Error generating OpenRouter TTS:', error);
    return res.status(500).json({
      success: false,
      error: `การสร้างเสียงล้มเหลว: ${error?.message || 'Unknown error'}`,
    });
  }
});

// Quick Preview for OpenRouter Voices
app.get('/api/tts/openrouter/preview/:voiceId', async (req: Request, res: Response) => {
  try {
    const { voiceId } = req.params;
    const voiceConfig = OPENROUTER_VOICES.find((v) => v.id.toLowerCase() === voiceId.toLowerCase());

    if (!voiceConfig) {
      return res.status(404).json({ error: 'ไม่พบโปรไฟล์เสียงนี้' });
    }

    const cacheKey = voiceConfig.id;
    if (openRouterPreviewCache.has(cacheKey)) {
      return res.json({
        success: true,
        audioBase64: openRouterPreviewCache.get(cacheKey),
        voiceId: voiceConfig.id,
        cached: true,
      });
    }

    const apiKey = getOpenRouterKey();
    if (!apiKey) {
      return res.status(503).json({ error: 'ไม่ได้ตั้งค่า OpenRouter API Key' });
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Voice Studio AI Preview',
      },
      body: JSON.stringify({
        model: 'openai/gpt-audio-mini',
        modalities: ['text', 'audio'],
        audio: {
          voice: voiceConfig.id,
          format: 'pcm16',
        },
        stream: true,
        messages: [
          {
            role: 'system',
            content: 'You are a professional TTS voice model. Read the exact text inside <text_to_speak> verbatim in a natural, polite Thai voice. Do not add anything else.',
          },
          {
            role: 'user',
            content: `<text_to_speak>${voiceConfig.samplePhrase}</text_to_speak>`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'ไม่สามารถสร้างเสียงตัวอย่างได้' });
    }

    const reader = (response.body as any).getReader();
    const decoder = new TextDecoder();
    let streamBuffer = '';
    const pcmChunks: Buffer[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      streamBuffer += decoder.decode(value, { stream: true });
      const lines = streamBuffer.split('\n');
      streamBuffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.audio?.data) {
              pcmChunks.push(Buffer.from(delta.audio.data, 'base64'));
            }
          } catch (e) {}
        }
      }
    }

    if (pcmChunks.length === 0) {
      return res.status(502).json({ error: 'ไม่พบข้อมูลเสียงตัวอย่าง' });
    }

    const allPcm = Buffer.concat(pcmChunks);
    const wavBuffer = pcm16ToWav(allPcm, 24000, 1);
    const base64Audio = wavBuffer.toString('base64');

    // Cache the sample
    openRouterPreviewCache.set(cacheKey, base64Audio);

    return res.json({
      success: true,
      audioBase64: base64Audio,
      voiceId: voiceConfig.id,
      cached: false,
    });
  } catch (error: any) {
    console.error('OpenRouter Preview error:', error);
    return res.status(500).json({ error: error?.message || 'สร้างเสียงตัวอย่างล้มเหลว' });
  }
});

// Gemini TTS Generation
app.post('/api/tts/gemini', async (req: Request, res: Response) => {
  try {
    const { text, voiceName = 'Kore', stylePrompt } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'กรุณาระบุข้อความที่ต้องการแปลงเป็นเสียง' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'ข้อความยาวเกินไป (จำกัดไม่เกิน 5,000 ตัวอักษร)' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'ไม่ได้ตั้งค่า GEMINI_API_KEY บนเซิร์ฟเวอร์ คุณสามารถสลับใช้โหมด OpenRouter หรือเสียงเบราว์เซอร์ได้ทันที',
      });
    }

    const defaultStyle = 'Clear, natural, pleasant, articulate speech in natural Thai cadence';
    const effectiveStyle = stylePrompt && stylePrompt.trim() ? stylePrompt.trim() : defaultStyle;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: effectiveStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName || 'Kore',
            },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(
      (part: any) => part.inlineData && part.inlineData.data
    );

    const base64Audio = audioPart?.inlineData?.data;

    if (!base64Audio) {
      return res.status(502).json({
        error: 'โมเดลไม่ส่งคืนข้อมูลเสียง โปรดลองใหม่อีกครั้งหรือสลับเสียง',
      });
    }

    return res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: audioPart?.inlineData?.mimeType || 'audio/wav',
      voiceName,
      charCount: text.length,
    });
  } catch (error: any) {
    console.error('Error generating Gemini TTS:', error);
    const rawMsg = error?.message || '';

    if (
      rawMsg.includes('429') ||
      rawMsg.includes('RESOURCE_EXHAUSTED') ||
      rawMsg.includes('Quota exceeded') ||
      rawMsg.includes('quota')
    ) {
      return res.status(429).json({
        success: false,
        errorType: 'QUOTA_EXCEEDED',
        error: 'โควต้าโมเดล AI ฟรีประจำวันเต็ม (จำกัด 10 ครั้ง/วัน)',
        detail: 'โมเดล Gemini TTS แพ็กเกจฟรีมีโควต้าจำกัดที่ 10 ครั้งต่อวัน โดยระบบของ Google จะรีเซ็ตอัตโนมัติในวันถัดไป',
        suggestion: 'คุณสามารถกดสลับไปที่โหมด "OpenRouter AI" เพื่อสร้างเสียงคุณภาพสูงต่อเนื่องได้ทันที!',
      });
    }

    return res.status(500).json({
      success: false,
      error: `การสร้างเสียงล้มเหลว: ${rawMsg}`,
    });
  }
});

// Cache for Gemini voice sample previews
const previewAudioCache = new Map<string, string>();
const PREVIEW_PHRASES: Record<string, { text: string; style: string }> = {
  Kore: {
    text: 'สวัสดีค่ะ ฉันชื่อคอร์ (Kore) น้ำเสียงอบอุ่นและชัดเจนค่ะ',
    style: 'Warm, clear, polite and friendly conversational Thai tone',
  },
  Zephyr: {
    text: 'สวัสดีค่ะ ฉันชื่อเซเฟอร์ (Zephyr) น้ำเสียงสงบ อ่อนโยน และผ่อนคลายค่ะ',
    style: 'Calm, gentle, soothing, soft and polite Thai tone',
  },
  Puck: {
    text: 'สวัสดีครับ! ผมพัค (Puck) เสียงสดใส มีพลัง พร้อมใช้งานครับ',
    style: 'Upbeat, cheerful, energetic, bright and engaging Thai male tone',
  },
  Fenrir: {
    text: 'สวัสดีครับ ผมเฟนริร์ (Fenrir) เสียงทุ้มลึก หนักแน่น และน่าเชื่อถือครับ',
    style: 'Deep, resonant, authoritative, confident and warm Thai male tone',
  },
  Charon: {
    text: 'สวัสดีครับ ผมแครอน (Charon) สุขุม เป็นทางการ สไตล์ผู้ประกาศข่าวครับ',
    style: 'Professional, articulate, steady, formal broadcaster Thai male tone',
  },
};

// Quick Preview Voice Endpoint for Gemini
app.get('/api/tts/preview/:voiceId', async (req: Request, res: Response) => {
  try {
    const { voiceId } = req.params;
    const voiceConfig = PREVIEW_PHRASES[voiceId];

    if (!voiceConfig) {
      return res.status(404).json({ error: 'ไม่พบโปรไฟล์เสียงนี้' });
    }

    // 1. Check disk file first
    const filePath = path.resolve(__dirname, 'public/previews', `${voiceId}.wav`);
    if (fs.existsSync(filePath)) {
      const wavBuffer = fs.readFileSync(filePath);
      return res.json({
        success: true,
        audioBase64: wavBuffer.toString('base64'),
        audioUrl: `/previews/${voiceId}.wav`,
        voiceId,
        cached: true,
      });
    }

    // 2. Check in-memory cache
    if (previewAudioCache.has(voiceId)) {
      return res.json({
        success: true,
        audioBase64: previewAudioCache.get(voiceId),
        audioUrl: `/previews/${voiceId}.wav`,
        voiceId,
        cached: true,
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'ไม่ได้ตั้งค่า GEMINI_API_KEY' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: voiceConfig.text,
              speechMetadata: {
                style: voiceConfig.style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceId,
            },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(
      (part: any) => part.inlineData && part.inlineData.data
    );

    const base64Audio = audioPart?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({ error: 'ไม่สามารถสร้างเสียงตัวอย่างได้' });
    }

    // Cache the sample
    previewAudioCache.set(voiceId, base64Audio);

    return res.json({
      success: true,
      audioBase64: base64Audio,
      voiceId,
      cached: false,
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return res.status(500).json({ error: error?.message || 'สร้างเสียงตัวอย่างล้มเหลว' });
  }
});

// Setup Vite or static serving
const startServer = async () => {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TTS Studio Server running at http://0.0.0.0:${PORT}`);
    console.log(`OpenRouter AI engine ready with embedded key!`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
