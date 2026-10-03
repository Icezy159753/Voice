import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Radio,
  Globe,
  Check,
  Volume2,
  Square,
  Loader2,
  Download,
  Laptop,
  Smartphone,
  HelpCircle,
  X,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Key,
  ShieldCheck,
  Zap,
  Sliders,
} from 'lucide-react';
import { base64ToArrayBuffer } from '../utils/audioUtils';

export interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  tone: string;
  lang: string;
  avatarColor: string;
  samplePhrase: string;
}

export interface OpenRouterModelOption {
  id: string;
  name: string;
  badge: string;
  description: string;
  recommended?: boolean;
}

export const OPENROUTER_MODELS: OpenRouterModelOption[] = [
  {
    id: 'openai/gpt-audio-mini',
    name: 'GPT Audio Mini',
    badge: '🚀 แนะนำ (เร็ว & คุ้มค่า)',
    description: 'ความเร็วสูง ประมวลผลลื่นไหล ออกเสียงเป็นธรรมชาติ เหมาะสำหรับงานทุกประเภท',
    recommended: true,
  },
  {
    id: 'openai/gpt-audio',
    name: 'GPT Audio Flagship',
    badge: '💎 เรือธง (คุณภาพสูงสุด)',
    description: 'โมเดลเรือธง ถ่ายทอดอารมณ์และจังหวะการพูดสมจริงสูงสุดระดับสตูดิโอ',
    recommended: false,
  },
];

export const OPENROUTER_VOICES: VoiceOption[] = [
  {
    id: 'coral',
    name: 'Coral',
    gender: 'หญิง (Female)',
    tone: 'อบอุ่น นุ่มนวล เป็นธรรมชาติ ชัดเจน ฟังเพลิน',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-rose-500 to-pink-600',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่อคอรัล (Coral) น้ำเสียงอบอุ่นและเป็นธรรมชาติค่ะ',
  },
  {
    id: 'alloy',
    name: 'Alloy',
    gender: 'หญิง/กลาง (Neutral/Female)',
    tone: 'คมชัด สมดุล มั่นใจ เป็นทางการ สุภาพ',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-blue-500 to-indigo-600',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่ออัลลอยด์ (Alloy) เสียงคมชัด มั่นใจ ชัดเจนทุกถ้อยคำค่ะ',
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'ชาย (Male)',
    tone: 'นุ่มลึก อ่อนโยน สุภาพ ฟังสบาย ชวนผ่อนคลาย',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-teal-500 to-emerald-600',
    samplePhrase: 'สวัสดีครับ ผมเอคโค่ (Echo) เสียงนุ่มลึก สุภาพ และผ่อนคลายครับ',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'หญิง (Female)',
    tone: 'สดใส เปล่งประกาย มีชีวิตชีวา ดึงดูดความสนใจ',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-amber-400 to-orange-500',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่อชิมเมอร์ (Shimmer) สดใส มีพลัง พร้อมใช้งานค่ะ',
  },
  {
    id: 'sage',
    name: 'Sage',
    gender: 'หญิง (Female)',
    tone: 'สุขุม ชัดถ้อยชัดคำ สไตล์สารคดีและการศึกษา',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-emerald-600 to-teal-700',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่อเสจ (Sage) น้ำเสียงสุขุม น่าเชื่อถือ สไตล์บรรยายค่ะ',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    gender: 'ชาย (Male)',
    tone: 'ทุ้มต่ำ หนักแน่น ทรงพลัง น่าเกรงขาม',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-slate-700 to-gray-900',
    samplePhrase: 'สวัสดีครับ ผมออนิกซ์ (Onyx) น้ำเสียงทุ้มลึก หนักแน่น น่าเชื่อถือครับ',
  },
  {
    id: 'nova',
    name: 'Nova',
    gender: 'หญิง (Female)',
    tone: 'กระฉับกระเฉง ร่าเริง เป็นกันเอง สนุกสนาน',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-purple-500 to-pink-500',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่อโนวา (Nova) ร่าเริง กระฉับกระเฉง เป็นกันเองค่ะ',
  },
  {
    id: 'ash',
    name: 'Ash',
    gender: 'ชาย (Male)',
    tone: 'เป็นกันเอง สบายๆ ชิลๆ คุยเหมือนเพื่อนสนิท',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-cyan-600 to-blue-700',
    samplePhrase: 'สวัสดีครับ ผมแอช (Ash) เสียงสบายๆ เหมือนเพื่อนคุยกันครับ',
  },
  {
    id: 'ballad',
    name: 'Ballad',
    gender: 'ชาย (Male)',
    tone: 'อบอุ่น ละมุน ไพเราะ ชวนหลงใหล สไตล์เรื่องเล่า',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-amber-600 to-rose-600',
    samplePhrase: 'สวัสดีครับ ผมบัลลาด (Ballad) น้ำเสียงอบอุ่นและนุ่มนวลครับ',
  },
  {
    id: 'verse',
    name: 'Verse',
    gender: 'ชาย (Male)',
    tone: 'ทันสมัย คล่องแคล่ว น่าติดตาม กระชับ ฉับไว',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-indigo-600 to-violet-700',
    samplePhrase: 'สวัสดีครับ ผมเวิร์ส (Verse) เสียงกระชับ ทันสมัย พร้อมลุยครับ',
  },
  {
    id: 'fable',
    name: 'Fable',
    gender: 'กลาง/ชาย (Expressive)',
    tone: 'มีชีวิตชีวา สนุกสนาน สไตล์พากย์นิทานและละคร',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-fuchsia-500 to-purple-600',
    samplePhrase: 'สวัสดีครับ ผมเฟเบิล (Fable) เสียงสนุกสนานสไตล์เล่านิทานครับ',
  },
];

export const GEMINI_VOICES: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'หญิง (Female)',
    tone: 'อบอุ่น นุ่มนวล ชัดเจน ฟังง่าย (Warm & Articulate)',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-pink-500 to-rose-600',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่อคอร์ (Kore) น้ำเสียงอบอุ่นและชัดเจนค่ะ',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'หญิง (Female)',
    tone: 'สงบ ผ่อนคลาย ละมุนละไม (Calm & Soothing)',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-violet-500 to-indigo-600',
    samplePhrase: 'สวัสดีค่ะ ฉันชื่อเซเฟอร์ (Zephyr) น้ำเสียงสงบ อ่อนโยน และผ่อนคลายค่ะ',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'ชาย (Male)',
    tone: 'สดใส มีพลัง ร่าเริง ดึงดูด (Upbeat & Energetic)',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-amber-500 to-orange-600',
    samplePhrase: 'สวัสดีครับ! ผมพัค (Puck) เสียงสดใส มีพลัง พร้อมใช้งานครับ',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'ชาย (Male)',
    tone: 'ทุ้มลึก หนักแน่น น่าเชื่อถือ (Deep & Resonant)',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-blue-600 to-cyan-700',
    samplePhrase: 'สวัสดีครับ ผมเฟนริร์ (Fenrir) เสียงทุ้มลึก หนักแน่น และน่าเชื่อถือครับ',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'ชาย (Male)',
    tone: 'สุขุม เป็นทางการ ผู้ประกาศข่าว (Authoritative & Steady)',
    lang: 'ไทย / Multilingual',
    avatarColor: 'from-emerald-600 to-teal-700',
    samplePhrase: 'สวัสดีครับ ผมแครอน (Charon) สุขุม เป็นทางการ สไตล์ผู้ประกาศข่าวครับ',
  },
];

export const STYLE_PRESETS = [
  { label: '✨ ธรรมชาติทั่วไป', prompt: 'Natural, clear, conversational cadence in fluent Thai' },
  { label: '🎙️ ผู้ประกาศข่าว', prompt: 'Clear, formal, professional news anchor tone in clear Thai' },
  { label: '📖 เล่านิทาน/หนังสือเสียง', prompt: 'Warm, expressive, captivating storytelling cadence' },
  { label: '🎉 ร่าเริง/กระตือรือร้น', prompt: 'Cheerful, upbeat, friendly and smiling tone' },
  { label: '📢 โฆษณา/รีวิวสินค้า', prompt: 'Persuasive, energetic, engaging product commercial presenter' },
  { label: '🌙 ผ่อนคลาย/ก่อนนอน', prompt: 'Soft, gentle, slow, relaxing bedtime narration' },
];

interface VoiceSelectorProps {
  engine: 'openrouter' | 'gemini' | 'browser';
  setEngine: (engine: 'openrouter' | 'gemini' | 'browser') => void;
  // OpenRouter Model
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  // Voices
  selectedVoice: string;
  setSelectedVoice: (voiceId: string) => void;
  // Styles
  selectedStyle: string;
  setSelectedStyle: (stylePrompt: string) => void;
  customStyle: string;
  setCustomStyle: (custom: string) => void;
  // Engine Availability
  openrouterConfigured: boolean;
  openrouterMaskedKey: string | null;
  geminiAvailable: boolean;
  // Browser Voices
  browserVoices: SpeechSynthesisVoice[];
  selectedBrowserVoiceUri: string;
  setSelectedBrowserVoiceUri: (uri: string) => void;
  // Custom API key handlers
  userCustomKey: string;
  setUserCustomKey: (key: string) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  engine,
  setEngine,
  selectedModel,
  setSelectedModel,
  selectedVoice,
  setSelectedVoice,
  selectedStyle,
  setSelectedStyle,
  customStyle,
  setCustomStyle,
  openrouterConfigured,
  openrouterMaskedKey,
  geminiAvailable,
  browserVoices,
  selectedBrowserVoiceUri,
  setSelectedBrowserVoiceUri,
  userCustomKey,
  setUserCustomKey,
}) => {
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null);
  const [isBrowserPreviewPlaying, setIsBrowserPreviewPlaying] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);
  const [guidePlatform, setGuidePlatform] = useState<'windows' | 'mac' | 'android' | 'edge'>('windows');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [tempKeyInput, setTempKeyInput] = useState<string>(userCustomKey);

  // Web Audio Context reference for ultra-reliable preview playback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const previewCacheRef = useRef<Record<string, ArrayBuffer>>({});
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Stop any active preview when component unmounts
  useEffect(() => {
    return () => {
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch {}
        currentSourceRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Play preview for OpenRouter voice
  const handlePlayOpenRouterPreview = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewError(null);

    if (playingVoiceId === voiceId) {
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch {}
        currentSourceRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {}
      currentSourceRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsBrowserPreviewPlaying(false);

    try {
      setLoadingVoiceId(voiceId);
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      let arrayBuf: ArrayBuffer;
      const cacheKey = `openrouter_${voiceId}`;
      if (previewCacheRef.current[cacheKey]) {
        arrayBuf = previewCacheRef.current[cacheKey];
      } else {
        const res = await fetch(`/api/tts/openrouter/preview/${voiceId}`);
        const data = await res.json();
        if (!res.ok || !data.success || !data.audioBase64) {
          throw new Error(data.error || 'ไม่สามารถโหลดเสียงตัวอย่างได้');
        }
        arrayBuf = base64ToArrayBuffer(data.audioBase64);
        previewCacheRef.current[cacheKey] = arrayBuf;
      }

      const decodedBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));

      setLoadingVoiceId(null);
      setPlayingVoiceId(voiceId);

      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.05);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.onended = () => {
        setPlayingVoiceId((curr) => (curr === voiceId ? null : curr));
        currentSourceRef.current = null;
      };

      source.start(0);
      currentSourceRef.current = source;
    } catch (err: any) {
      console.error('Failed to play OpenRouter voice preview:', err);
      setLoadingVoiceId(null);
      setPlayingVoiceId(null);
      setPreviewError(err.message || 'ไม่สามารถเล่นเสียงตัวอย่างได้ โปรดลองอีกครั้ง');
    }
  };

  // Play preview for Gemini voice
  const handlePlayGeminiPreview = async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewError(null);

    if (playingVoiceId === voiceId) {
      if (currentSourceRef.current) {
        try {
          currentSourceRef.current.stop();
        } catch {}
        currentSourceRef.current = null;
      }
      setPlayingVoiceId(null);
      return;
    }

    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {}
      currentSourceRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsBrowserPreviewPlaying(false);

    try {
      setLoadingVoiceId(voiceId);
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      let arrayBuf: ArrayBuffer;
      const cacheKey = `gemini_${voiceId}`;
      if (previewCacheRef.current[cacheKey]) {
        arrayBuf = previewCacheRef.current[cacheKey];
      } else {
        const res = await fetch(`/api/tts/preview/${voiceId}`);
        const data = await res.json();
        if (!res.ok || !data.success || !data.audioBase64) {
          throw new Error(data.error || 'ไม่สามารถโหลดเสียงตัวอย่างได้');
        }
        arrayBuf = base64ToArrayBuffer(data.audioBase64);
        previewCacheRef.current[cacheKey] = arrayBuf;
      }

      const decodedBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));

      setLoadingVoiceId(null);
      setPlayingVoiceId(voiceId);

      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.05);

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.onended = () => {
        setPlayingVoiceId((curr) => (curr === voiceId ? null : curr));
        currentSourceRef.current = null;
      };

      source.start(0);
      currentSourceRef.current = source;
    } catch (err: any) {
      console.error('Failed to play Gemini voice preview:', err);
      setLoadingVoiceId(null);
      setPlayingVoiceId(null);
      setPreviewError(err.message || 'ไม่สามารถเล่นเสียงตัวอย่างได้ โปรดลองอีกครั้ง');
    }
  };

  // Play preview for Browser voice
  const handlePlayBrowserPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewError(null);

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setPreviewError('เบราว์เซอร์ของคุณไม่รองรับ SpeechSynthesis');
      return;
    }

    if (isBrowserPreviewPlaying) {
      window.speechSynthesis.cancel();
      setIsBrowserPreviewPlaying(false);
      activeUtteranceRef.current = null;
      return;
    }

    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch {}
      currentSourceRef.current = null;
      setPlayingVoiceId(null);
    }

    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    setTimeout(() => {
      try {
        const text = 'สวัสดีครับ นี่คือเสียงทดสอบภาษาไทยจากระบบของคุณ';
        const utterance = new SpeechSynthesisUtterance(text);
        activeUtteranceRef.current = utterance;

        const voice = browserVoices.find((v) => v.voiceURI === selectedBrowserVoiceUri);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onend = () => {
          setIsBrowserPreviewPlaying(false);
          activeUtteranceRef.current = null;
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          setIsBrowserPreviewPlaying(false);
          activeUtteranceRef.current = null;
        };

        setIsBrowserPreviewPlaying(true);
        window.speechSynthesis.speak(utterance);
      } catch (err: any) {
        console.error('Browser speech failed:', err);
        setIsBrowserPreviewPlaying(false);
        setPreviewError('ไม่สามารถเล่นเสียงเบราว์เซอร์ได้');
      }
    }, 50);
  };

  // Group browser voices
  const thaiVoices = browserVoices.filter(
    (v) => v.lang.startsWith('th') || v.name.toLowerCase().includes('thai')
  );
  const otherVoices = browserVoices.filter(
    (v) => !v.lang.startsWith('th') && !v.name.toLowerCase().includes('thai')
  );

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-md">
      {/* Engine Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">เครื่องยนต์สังเคราะห์เสียง AI</h3>
            <p className="text-xs text-slate-400">เลือกโมเดล และกด &quot;ลองฟังเสียง&quot; ในแต่ละเสียงก่อนใช้งาน</p>
          </div>
        </div>

        {/* Engine Tabs */}
        <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => {
              setEngine('openrouter');
              if (!OPENROUTER_VOICES.some((v) => v.id === selectedVoice)) {
                setSelectedVoice('coral');
              }
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              engine === 'openrouter'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-amber-400/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 fill-current" />
            <span>OpenRouter AI (แนะนำ)</span>
          </button>

          <button
            onClick={() => {
              setEngine('gemini');
              if (!GEMINI_VOICES.some((v) => v.id === selectedVoice)) {
                setSelectedVoice('Kore');
              }
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              engine === 'gemini'
                ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Gemini AI</span>
          </button>

          <button
            onClick={() => setEngine('browser')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              engine === 'browser'
                ? 'bg-slate-800 text-cyan-300 shadow-md ring-1 ring-cyan-500/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>เสียงในเครื่อง</span>
          </button>
        </div>
      </div>

      {previewError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center justify-between">
          <span>⚠️ {previewError}</span>
          <button onClick={() => setPreviewError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* OPENROUTER ENGINE VIEW */}
      {engine === 'openrouter' && (
        <div className="space-y-4">
          {/* OpenRouter Model Selection & API Status Card */}
          <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-950/20 via-slate-900/50 to-orange-950/20 p-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Left: Model Selector */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    โมเดลเสียง (OpenRouter Audio Model):
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {OPENROUTER_MODELS.map((m) => {
                    const isModelSelected = selectedModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={`cursor-pointer rounded-xl border p-2.5 transition-all flex items-start gap-2.5 ${
                          isModelSelected
                            ? 'border-amber-500/90 bg-amber-950/40 shadow-md shadow-amber-950/50 ring-1 ring-amber-400/50'
                            : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isModelSelected
                              ? 'border-amber-400 bg-amber-500 text-slate-950'
                              : 'border-slate-600 bg-slate-900'
                          }`}
                        >
                          {isModelSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white">{m.name}</span>
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-amber-300">
                              {m.badge}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-400 leading-snug">
                            {m.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: API Key Status Badge */}
              <div className="flex flex-col sm:items-end justify-center shrink-0 border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-2 sm:pt-0 sm:pl-3 gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>เชื่อมต่อ OpenRouter แล้ว</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {userCustomKey ? `${userCustomKey.slice(0, 10)}...${userCustomKey.slice(-4)}` : (openrouterMaskedKey || 'sk-or-v1-7ff2...5b2b')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempKeyInput(userCustomKey);
                      setShowKeyModal(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 underline"
                  >
                    <Key className="h-3 w-3" />
                    <span>แก้ไข Key</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Voice Cards Grid (11 OpenRouter Voices) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                เลือกเสียงพากย์ ({OPENROUTER_VOICES.length} เสียง):
              </span>
              <span className="text-[11px] text-slate-400">
                รองรับภาษาไทย สำเนียงธรรมชาติสูง
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {OPENROUTER_VOICES.map((v) => {
                const isSelected = selectedVoice === v.id;
                const isPlaying = playingVoiceId === v.id;
                const isLoading = loadingVoiceId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500/90 bg-gradient-to-br from-amber-950/40 to-slate-900 shadow-lg shadow-amber-950/50 ring-1 ring-amber-400'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${v.avatarColor} text-white font-bold text-base shadow-md`}
                      >
                        {v.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white text-sm">
                            {v.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {v.gender.split(' ')[0]}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {v.tone}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Preview Button */}
                    <div className="mt-3 flex items-center justify-between border-t border-slate-800/70 pt-2.5">
                      <button
                        type="button"
                        onClick={(e) => handlePlayOpenRouterPreview(v.id, e)}
                        disabled={isLoading}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          isPlaying
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : 'bg-slate-800/80 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-slate-700/60'
                        }`}
                        title={`ลองฟังตัวอย่างเสียง ${v.name}`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>กำลังโหลด...</span>
                          </>
                        ) : isPlaying ? (
                          <>
                            <Square className="h-3 w-3 fill-current" />
                            <span>หยุดฟัง</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3 w-3" />
                            <span>ลองฟังเสียง</span>
                          </>
                        )}
                      </button>

                      <span className="text-[11px] font-medium text-slate-400">
                        {isSelected ? (
                          <span className="text-amber-400 font-semibold">✓ เลือกอยู่</span>
                        ) : (
                          <span className="text-slate-500 group-hover:text-slate-300">คลิกเพื่อเลือก</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Style & Emotion Presets */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                สไตล์และอารมณ์เสียง (Speech Style / Tone)
              </span>
              <button
                onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                className="text-[11px] text-amber-400 hover:underline"
              >
                {showCustomPrompt ? 'ซ่อนการระบุเอง' : '+ ระบุสไตล์คำสั่งเอง'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map((preset) => {
                const isActive = selectedStyle === preset.prompt;
                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setSelectedStyle(preset.prompt);
                      setCustomStyle('');
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
                        : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {showCustomPrompt && (
              <div className="mt-2 space-y-1">
                <input
                  type="text"
                  placeholder="เช่น: พูดเร็ว กระตือรือร้น น้ำเสียงสุภาพเป็นทางการ..."
                  value={customStyle}
                  onChange={(e) => {
                    setCustomStyle(e.target.value);
                    if (e.target.value.trim()) {
                      setSelectedStyle(e.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* GEMINI ENGINE VIEW */}
      {engine === 'gemini' && (
        <div className="space-y-4">
          {!geminiAvailable && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              💡 หมายเหตุ: หากยังไม่ได้ระบุ GEMINI_API_KEY คุณสามารถใช้โหมด OpenRouter AI ด้านบนซึ่งมีคีย์พร้อมใช้งานทันที!
            </div>
          )}

          {/* Gemini Voice Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {GEMINI_VOICES.map((v) => {
              const isSelected = selectedVoice === v.id;
              const isPlaying = playingVoiceId === v.id;
              const isLoading = loadingVoiceId === v.id;

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedVoice(v.id)}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500/90 bg-indigo-950/30 shadow-lg shadow-indigo-950/50 ring-1 ring-indigo-500'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${v.avatarColor} text-white font-bold text-base shadow-md`}
                    >
                      {v.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-sm">
                          {v.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {v.gender.split(' ')[0]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {v.tone}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* PREVIEW BUTTON */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/70 pt-2.5">
                    <button
                      type="button"
                      onClick={(e) => handlePlayGeminiPreview(v.id, e)}
                      disabled={isLoading}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                        isPlaying
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                          : 'bg-slate-800/80 text-indigo-300 hover:bg-indigo-600 hover:text-white border border-slate-700/60'
                      }`}
                      title={`ลองฟังตัวอย่างเสียง ${v.name}`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>กำลังโหลด...</span>
                        </>
                      ) : isPlaying ? (
                        <>
                          <Square className="h-3 w-3 fill-current" />
                          <span>หยุดฟัง</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-3 w-3" />
                          <span>ลองฟังเสียง</span>
                        </>
                      )}
                    </button>

                    <span className="text-[11px] font-medium text-slate-400">
                      {isSelected ? (
                        <span className="text-indigo-400">✓ เลือกอยู่</span>
                      ) : (
                        <span className="text-slate-500 group-hover:text-slate-300">คลิกเพื่อเลือก</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gemini Style Presets */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                สไตล์และอารมณ์เสียง (Speech Style / Tone)
              </span>
              <button
                onClick={() => setShowCustomPrompt(!showCustomPrompt)}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                {showCustomPrompt ? 'ซ่อนการระบุเอง' : '+ ระบุสไตล์คำสั่งเอง'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {STYLE_PRESETS.map((preset) => {
                const isActive = selectedStyle === preset.prompt;
                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setSelectedStyle(preset.prompt);
                      setCustomStyle('');
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-600/30'
                        : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {showCustomPrompt && (
              <div className="mt-2 space-y-1">
                <input
                  type="text"
                  placeholder="เช่น: พูดเร็ว กระตือรือร้น น้ำเสียงสุภาพเป็นทางการ..."
                  value={customStyle}
                  onChange={(e) => {
                    setCustomStyle(e.target.value);
                    if (e.target.value.trim()) {
                      setSelectedStyle(e.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* BROWSER LOCAL ENGINE VIEW */}
      {engine === 'browser' && (
        <div className="space-y-4">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
            <div className="flex items-center gap-2">
              {thaiVoices.length > 0 ? (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-medium text-emerald-300">
                    🇹🇭 พบเสียงภาษาไทยในเครื่อง {thaiVoices.length} เสียง (พร้อมใช้งาน)
                  </span>
                </>
              ) : (
                <>
                  <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="font-medium text-amber-300">
                    ⚠️ ยังไม่พบเสียงภาษาไทยในเครื่อง (มีเสียงภาษาอังกฤษ/สากล {otherVoices.length} เสียง)
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowInstallGuide(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span>วิธีดาวน์โหลดเสียงภาษาไทยลงเครื่อง (ฟรี)</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              เลือกเสียงของเบราว์เซอร์:
            </label>
            <div className="flex gap-2">
              <select
                value={selectedBrowserVoiceUri}
                onChange={(e) => setSelectedBrowserVoiceUri(e.target.value)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                {thaiVoices.length > 0 && (
                  <optgroup label="🇹🇭 เสียงภาษาไทย (Thai Voices)">
                    {thaiVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="🌐 เสียงภาษาอื่นๆ ในเครื่อง (Other Languages)">
                  {otherVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              </select>

              <button
                type="button"
                onClick={handlePlayBrowserPreview}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  isBrowserPreviewPlaying
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-600 hover:text-white'
                }`}
                title="ลองฟังเสียงที่เลือกจากเบราว์เซอร์"
              >
                {isBrowserPreviewPlaying ? (
                  <>
                    <Square className="h-3.5 w-3.5 fill-current" />
                    <span>หยุดฟัง</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>ลองฟังเสียง</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API KEY SETTINGS MODAL */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <Key className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-white text-base">ตั้งค่า OpenRouter API Key</h3>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              ระบบมี API Key ฝังไว้ให้อัตโนมัติแล้ว (<span className="text-emerald-400 font-mono">sk-or-v1-7ff2...5b2b</span>) คุณสามารถใช้งานได้ทันที หรือระบุ Key ส่วนตัวของคุณเองด้านล่าง:
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">API Key:</label>
              <input
                type="password"
                placeholder="sk-or-v1-..."
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setUserCustomKey('');
                  setTempKeyInput('');
                  localStorage.removeItem('openrouter_user_key');
                  setShowKeyModal(false);
                }}
                className="text-xs text-rose-400 hover:underline"
              >
                คืนค่า Key เริ่มต้น (Embedded)
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserCustomKey(tempKeyInput.trim());
                    if (tempKeyInput.trim()) {
                      localStorage.setItem('openrouter_user_key', tempKeyInput.trim());
                    } else {
                      localStorage.removeItem('openrouter_user_key');
                    }
                    setShowKeyModal(false);
                  }}
                  className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THAI VOICE INSTALLATION GUIDE MODAL */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    วิธีดาวน์โหลด & ติดตั้งเสียงภาษาไทยลงเครื่อง
                  </h3>
                  <p className="text-xs text-slate-400">
                    ติดตั้งฟรีจากระบบปฏิบัติการของคุณเพื่อใช้งาน Text-to-Speech แบบไม่จำกัด
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/30 p-2 gap-1.5 overflow-x-auto">
              <button
                onClick={() => setGuidePlatform('windows')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  guidePlatform === 'windows'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Laptop className="h-3.5 w-3.5" />
                <span>🪟 Windows 10/11</span>
              </button>
              <button
                onClick={() => setGuidePlatform('mac')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  guidePlatform === 'mac'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>🍏 Mac / iPhone (iOS)</span>
              </button>
              <button
                onClick={() => setGuidePlatform('android')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  guidePlatform === 'android'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>🤖 Android</span>
              </button>
              <button
                onClick={() => setGuidePlatform('edge')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  guidePlatform === 'edge'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Globe className="h-3.5 w-3.5" />
                <span>🌐 Microsoft Edge (วิธีลัด)</span>
              </button>
            </div>

            {/* Guide Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              {guidePlatform === 'windows' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3.5">
                    <p className="font-semibold text-cyan-300">
                      🪟 วิธีเพิ่มเสียงภาษาไทย (Microsoft Niwat / Premwadee) บน Windows 10 และ 11:
                    </p>
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 marker:text-cyan-400 font-medium text-slate-200">
                    <li>
                      กดปุ่ม <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-cyan-300 border border-slate-700">Win + I</kbd> บนแป้นพิมพ์เพื่อเปิด <strong>Settings (การตั้งค่า)</strong>
                    </li>
                    <li>
                      คลิกเมนู <strong>Time &amp; Language (เวลาและภาษา)</strong> ทางซ้ายมือ
                    </li>
                    <li>
                      เลือกหัวข้อ <strong>Speech (การแปลงเสียงเป็นคำพูด)</strong>
                    </li>
                    <li>
                      เลื่อนลงมาที่หัวข้อ <em>Manage voices (จัดการเสียง)</em> แล้วกดปุ่ม <strong>+ Add voices (เพิ่มเสียง)</strong>
                    </li>
                    <li>
                      ในช่องค้นหา พิมพ์คำว่า <strong className="text-cyan-300">&quot;Thai&quot;</strong> หรือ <strong className="text-cyan-300">&quot;ไทย&quot;</strong>
                    </li>
                    <li>
                      ติ๊กถูกที่ภาษาไทย แล้วกดปุ่ม <strong>Add (เพิ่ม)</strong> เพื่อเริ่มดาวน์โหลดชุดเสียง (ฟรี)
                    </li>
                    <li>
                      เมื่อดาวน์โหลดเสร็จสิ้น ให้กลับมาที่หน้านี้แล้วกด <strong>รีเฟรชหน้าเว็บ (F5)</strong> 1 ครั้ง เสียง <em>Microsoft Niwat</em> และ <em>Microsoft Premwadee</em> จะปรากฏให้เลือกใช้งานทันที!
                    </li>
                  </ol>
                </div>
              )}

              {guidePlatform === 'mac' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3.5">
                    <p className="font-semibold text-cyan-300">
                      🍏 วิธีดาวน์โหลดเสียงภาษาไทยคุณภาพสูง (Kanya / Narisa / Siri Voice) บน Mac &amp; iPhone:
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    <p className="font-bold text-white">สำหรับเครื่อง Mac (macOS):</p>
                    <ol className="list-decimal pl-5 space-y-1.5 marker:text-cyan-400 text-slate-200">
                      <li>เปิด <strong>System Settings (การตั้งค่าระบบ)</strong></li>
                      <li>เลือก <strong>Accessibility (การช่วยการเข้าถึง)</strong> ➔ <strong>Spoken Content (เนื้อหาที่พูด)</strong></li>
                      <li>ตรงเมนู <em>System voice (เสียงของระบบ)</em> คลิกเลือก <strong>Manage Voices... (จัดการเสียง...)</strong></li>
                      <li>เลื่อนหา <strong>Thai (ภาษาไทย)</strong> แล้วกดดาวน์โหลดเสียง <strong>Kanya (Enhanced)</strong> หรือเสียง <strong>Siri ภาษาไทย</strong> (ฟรี)</li>
                      <li>รีเฟรชหน้าเว็บนี้เพื่อเริ่มใช้งาน</li>
                    </ol>
                  </div>
                  <div className="space-y-2.5 border-t border-slate-800 pt-3">
                    <p className="font-bold text-white">สำหรับ iPhone / iPad (iOS):</p>
                    <ol className="list-decimal pl-5 space-y-1.5 marker:text-cyan-400 text-slate-200">
                      <li>ไปที่ <strong>Settings (การตั้งค่า)</strong> ➔ <strong>Accessibility (การช่วยการเข้าถึง)</strong></li>
                      <li>เลือก <strong>Spoken Content (การอ่านเนื้อหา)</strong> ➔ <strong>Voices (เสียง)</strong></li>
                      <li>เลือก <strong>Thai (ไทย)</strong> ➔ แตะไอคอนก้อนเมฆเพื่อดาวน์โหลดเสียง <strong>Kanya</strong> หรือ <strong>Siri (เสียง 1 / 2)</strong></li>
                    </ol>
                  </div>
                </div>
              )}

              {guidePlatform === 'android' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3.5">
                    <p className="font-semibold text-cyan-300">
                      🤖 วิธีติดตั้งข้อมูลเสียงภาษาไทยบนมือถือ Android:
                    </p>
                  </div>
                  <ol className="list-decimal pl-5 space-y-2 marker:text-cyan-400 text-slate-200">
                    <li>เปิดแอป <strong>Settings (การตั้งค่า)</strong> บนมือถือของคุณ</li>
                    <li>ไปที่ <strong>Accessibility (การเข้าถึง)</strong> หรือ <strong>System (ระบบ)</strong></li>
                    <li>เลือก <strong>Text-to-speech output (การแปลงข้อความเป็นคำพูด)</strong></li>
                    <li>แตะไอคอนฟันเฟือง ⚙️ ข้างเครื่องมือ <strong>Speech Services by Google</strong></li>
                    <li>เลือก <strong>Install voice data (ติดตั้งข้อมูลเสียง)</strong></li>
                    <li>ค้นหาและเลือก <strong>Thai (ภาษาไทย)</strong> แล้วกดดาวน์โหลดชุดเสียงฟรี</li>
                    <li>เปิดเบราว์เซอร์ Chrome แล้วรีเฟรชหน้านี้เพื่อเลือกใช้เสียงภาษาไทย</li>
                  </ol>
                </div>
              )}

              {guidePlatform === 'edge' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3.5">
                    <p className="font-semibold text-cyan-300">
                      🌐 เคล็ดลับพิเศษ: ใช้งานผ่าน Microsoft Edge (เสียง AI ภาษาไทยธรรมชาติ ฟรีทันทีโดยไม่ต้องโหลด):
                    </p>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    หากคุณใช้งานบนคอมพิวเตอร์และไม่อยากเข้าไปกดดาวน์โหลดใน Settings:
                  </p>
                  <ol className="list-decimal pl-5 space-y-2 marker:text-cyan-400 text-slate-200">
                    <li>
                      เพียงคัดลอกลิงก์ของเว็บไซต์นี้ไปเปิดในเบราว์เซอร์ <strong>Microsoft Edge</strong> (มีติดตั้งมาพร้อมกับ Windows ทุกเครื่อง)
                    </li>
                    <li>
                      Microsoft Edge จะมีชุดเสียง <strong>Microsoft Niwat Online (Natural)</strong> และ <strong>Microsoft Premwadee Online (Natural)</strong> ให้เลือกใช้งานได้ทันทีโดยอัตโนมัติ!
                    </li>
                    <li>
                      น้ำเสียงมีความเป็นธรรมชาติสูงมาก และใช้งานได้ฟรีไม่จำกัดจำนวนครั้งครับ
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 p-4 bg-slate-950/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                เมื่อติดตั้งเสร็จแล้ว ให้กดรีเฟรชหน้าเว็บ 1 ครั้ง
              </span>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors"
              >
                เข้าใจแล้ว / ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
