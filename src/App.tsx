import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Download,
  Copy,
  Check,
  FileText,
  Trash2,
  Wand2,
  AudioLines,
  AlertCircle,
  HelpCircle,
  Share2,
  Settings,
  Layers,
  ChevronRight,
  Headphones,
  Scissors,
  Globe,
} from 'lucide-react';
import { AudioVisualizer } from './components/AudioVisualizer';
import { AudioControls } from './components/AudioControls';
import { VoiceSelector, GEMINI_VOICES, STYLE_PRESETS } from './components/VoiceSelector';
import { SampleScripts, SAMPLE_SCRIPTS } from './components/SampleScripts';
import { HistoryList, HistoryItem } from './components/HistoryList';
import {
  base64ToArrayBuffer,
  audioBufferToWav,
  renderProcessedAudioBuffer,
  trimSilenceFromAudioBuffer,
  downloadBlob,
  formatDuration,
  AudioProcessingOptions,
} from './utils/audioUtils';
import {
  optimizeThaiTextForSpeech,
  formatThaiTextSpacing,
} from './utils/thaiSpeechOptimizer';

const DEFAULT_TEXT = 'สวัสดีครับ ยินดีต้อนรับสู่สตูดิโอแปลงข้อความเป็นเสียง AI อัจฉริยะ คุณสามารถวางข้อความ ปรับแต่งความเร็ว และโทนเสียงทุ้มแหลมได้ตามต้องการ พร้อมดาวน์โหลดไฟล์เสียงออกไปใช้งานได้ทันที';

export default function App() {
  // Input Text State
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [copied, setCopied] = useState<boolean>(false);

  // Engine & Voice State
  const [engine, setEngine] = useState<'openrouter' | 'gemini' | 'browser'>('openrouter');
  const [selectedModel, setSelectedModel] = useState<string>('openai/gpt-audio-mini');
  const [selectedVoice, setSelectedVoice] = useState<string>('coral');
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLE_PRESETS[0].prompt);
  const [customStyle, setCustomStyle] = useState<string>('');
  const [openrouterConfigured, setOpenrouterConfigured] = useState<boolean>(true);
  const [openrouterMaskedKey, setOpenrouterMaskedKey] = useState<string | null>('sk-or-v1-7ff2...5b2b');
  const [userCustomKey, setUserCustomKey] = useState<string>(() => {
    try {
      return localStorage.getItem('openrouter_user_key') || '';
    } catch {
      return '';
    }
  });
  const [geminiAvailable, setGeminiAvailable] = useState<boolean>(true);

  // Browser Speech Voices
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoiceUri, setSelectedBrowserVoiceUri] = useState<string>('');

  // Audio Processing Options (Speed, Pitch, Timbre, Volume)
  const [audioOptions, setAudioOptions] = useState<AudioProcessingOptions>({
    speed: 1.0,
    pitchSemitones: 0,
    bassDb: 0,
    trebleDb: 0,
    volume: 1.0,
  });

  // Playback & Processing State
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isProcessingDownload, setIsProcessingDownload] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [originalDuration, setOriginalDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [autoTrimSilence, setAutoTrimSilence] = useState<boolean>(true);
  const [trimmedInfo, setTrimmedInfo] = useState<{ leading: number; trailing: number } | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [autoThaiOptimize, setAutoThaiOptimize] = useState<boolean>(true);

  // Web Audio References
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const rawAudioBufferRef = useRef<AudioBuffer | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackPauseOffsetRef = useRef<number>(0);
  const animationTimerRef = useRef<number | null>(null);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('voicecraft_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('voicecraft_history', JSON.stringify(history.slice(0, 15)));
    } catch (e) {
      console.error('Failed to save history to storage', e);
    }
  }, [history]);

  // Check server status & available browser voices
  useEffect(() => {
    // 1. Check server status (OpenRouter & Gemini)
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setGeminiAvailable(Boolean(data.geminiConfigured));
          setOpenrouterConfigured(Boolean(data.openrouterConfigured));
          if (data.openrouterMaskedKey) {
            setOpenrouterMaskedKey(data.openrouterMaskedKey);
          }
        }
      })
      .catch((err) => {
        console.warn('Status check failed:', err);
      });

    // 2. Load Browser Voices
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setBrowserVoices(voices);
        if (voices.length > 0 && !selectedBrowserVoiceUri) {
          const thai = voices.find((v) => v.lang.startsWith('th'));
          setSelectedBrowserVoiceUri(thai ? thai.voiceURI : voices[0].voiceURI);
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, [selectedBrowserVoiceUri]);

  // Helper to ensure AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return {
      ctx: audioContextRef.current,
      analyser: analyserRef.current!,
    };
  }, []);

  // Show temporary toast notification
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4000);
  };

  // Stop current Web Audio playback with anti-click fade out
  const stopPlayback = useCallback((smooth = false) => {
    if (animationTimerRef.current) {
      cancelAnimationFrame(animationTimerRef.current);
      animationTimerRef.current = null;
    }

    const source = sourceNodeRef.current;
    const gain = gainNodeRef.current;
    const ctx = audioContextRef.current;

    if (source) {
      if (smooth && gain && ctx && ctx.state === 'running') {
        try {
          const now = ctx.currentTime;
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(gain.gain.value, now);
          // 0.1s quick fade out on user pause/stop
          gain.gain.linearRampToValueAtTime(0.0001, now + 0.1);
          setTimeout(() => {
            try {
              source.stop();
              source.disconnect();
            } catch (e) {
              // already stopped
            }
          }, 110);
        } catch {
          try {
            source.stop();
            source.disconnect();
          } catch {}
        }
      } else {
        try {
          source.stop();
          source.disconnect();
        } catch (e) {
          // already stopped
        }
      }
      sourceNodeRef.current = null;
      gainNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Effective duration accounting for speed
  const effectiveDuration = originalDuration > 0
    ? originalDuration / Math.max(0.1, audioOptions.speed)
    : 0;

  // Play audio buffer from an offset with automatic 0.1s fade-in & fade-out
  const playAudioFromOffset = useCallback(
    (offsetSec: number) => {
      const buffer = rawAudioBufferRef.current;
      if (!buffer) return;

      stopPlayback(false);
      const { ctx, analyser } = getAudioContext();

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = audioOptions.speed;

      // Pitch shift detune in cents (1 semitone = 100 cents)
      if (audioOptions.pitchSemitones !== 0) {
        source.detune.value = audioOptions.pitchSemitones * 100;
      }

      // Bass Low Shelf filter
      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 250;
      bassFilter.gain.value = audioOptions.bassDb;

      // Treble High Shelf filter
      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 3500;
      trebleFilter.gain.value = audioOptions.trebleDb;

      // Master Gain with automatic 0.1s Fade-In and Fade-Out
      const gainNode = ctx.createGain();
      gainNodeRef.current = gainNode;

      const targetVolume = Math.max(0, Math.min(2.0, audioOptions.volume));
      const startTime = ctx.currentTime;
      const fadeDuration = 0.1; // 0.1s fade duration
      const remainingSec = Math.max(0, effectiveDuration - offsetSec);

      // 1. Automatic Fade-in: starts at 0.0001, smoothly ramps up to targetVolume over 0.1s
      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(
        targetVolume,
        startTime + Math.min(fadeDuration, remainingSec > 0 ? remainingSec / 2 : fadeDuration)
      );

      // 2. Automatic Fade-out: smoothly ramps down to 0.0001 over the final 0.1s before end
      if (remainingSec > fadeDuration) {
        const fadeOutStartTime = startTime + remainingSec - fadeDuration;
        gainNode.gain.setValueAtTime(targetVolume, fadeOutStartTime);
        gainNode.gain.linearRampToValueAtTime(0.0001, startTime + remainingSec);
      }

      // Connect source -> bass -> treble -> gain -> analyser -> destination
      source.connect(bassFilter);
      bassFilter.connect(trebleFilter);
      trebleFilter.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(ctx.destination);

      const bufferOffset = offsetSec * audioOptions.speed;
      if (bufferOffset >= buffer.duration) {
        playbackPauseOffsetRef.current = 0;
        setCurrentTime(0);
        return;
      }

      source.start(0, Math.max(0, bufferOffset));
      sourceNodeRef.current = source;
      playbackStartTimeRef.current = ctx.currentTime - offsetSec;
      setIsPlaying(true);

      source.onended = () => {
        setIsPlaying(false);
        if (animationTimerRef.current) {
          cancelAnimationFrame(animationTimerRef.current);
          animationTimerRef.current = null;
        }
      };

      // Progress Tracker loop
      const updateProgress = () => {
        if (sourceNodeRef.current) {
          const current = ctx.currentTime - playbackStartTimeRef.current;
          if (current >= effectiveDuration) {
            setCurrentTime(effectiveDuration);
            stopPlayback(false);
          } else {
            setCurrentTime(current);
            animationTimerRef.current = requestAnimationFrame(updateProgress);
          }
        }
      };
      animationTimerRef.current = requestAnimationFrame(updateProgress);
    },
    [audioOptions, effectiveDuration, getAudioContext, stopPlayback]
  );

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (isPlaying) {
      playbackPauseOffsetRef.current = currentTime;
      stopPlayback(true);
    } else {
      if (!rawAudioBufferRef.current) {
        handleGenerate();
        return;
      }
      playAudioFromOffset(currentTime >= effectiveDuration ? 0 : currentTime);
    }
  };

  // Replay from beginning
  const handleReplay = () => {
    if (!rawAudioBufferRef.current) return;
    playbackPauseOffsetRef.current = 0;
    setCurrentTime(0);
    playAudioFromOffset(0);
  };

  // User seeks on waveform
  const handleSeek = (timeSec: number) => {
    if (!rawAudioBufferRef.current) return;
    const clamped = Math.max(0, Math.min(effectiveDuration, timeSec));
    setCurrentTime(clamped);
    playbackPauseOffsetRef.current = clamped;
    if (isPlaying) {
      playAudioFromOffset(clamped);
    }
  };

  // Generate synthetic voice fallback for browser engine export
  const createFallbackBuffer = async (textToSpeak: string): Promise<AudioBuffer> => {
    const { ctx } = getAudioContext();
    const duration = Math.min(30, Math.max(1.5, textToSpeak.length * 0.08));
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);

    // Harmonic vocal formant simulation for preview
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const baseFreq = 160 + Math.sin(t * 3) * 20;
      const harmonic1 = Math.sin(2 * Math.PI * baseFreq * t) * 0.3;
      const harmonic2 = Math.sin(2 * Math.PI * (baseFreq * 2) * t) * 0.2;
      const harmonic3 = Math.sin(2 * Math.PI * (baseFreq * 3) * t) * 0.1;
      const envelope = Math.min(1, Math.sin((t / duration) * Math.PI) * 1.5);
      data[i] = (harmonic1 + harmonic2 + harmonic3) * envelope * 0.5;
    }
    return buffer;
  };

  // Core Generation Function
  const handleGenerate = async () => {
    if (!text.trim()) {
      setErrorMessage('กรุณาพิมพ์หรือวางข้อความที่ต้องการแปลงเป็นเสียง');
      return;
    }

    setErrorMessage(null);
    setIsGenerating(true);
    stopPlayback();

    try {
      if (engine === 'openrouter') {
        const response = await fetch('/api/tts/openrouter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            voiceName: selectedVoice,
            model: selectedModel,
            stylePrompt: customStyle.trim() || selectedStyle,
            apiKey: userCustomKey || undefined,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างเสียงผ่าน OpenRouter');
        }

        const arrayBuffer = base64ToArrayBuffer(data.audioBase64);
        const { ctx } = getAudioContext();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

        let finalBuffer = decodedBuffer;
        if (autoTrimSilence) {
          const trimResult = trimSilenceFromAudioBuffer(decodedBuffer, ctx);
          if (trimResult.isTrimmed) {
            finalBuffer = trimResult.buffer;
            setTrimmedInfo({
              leading: trimResult.trimmedLeadingSec,
              trailing: trimResult.trimmedTrailingSec,
            });
          } else {
            setTrimmedInfo(null);
          }
        } else {
          setTrimmedInfo(null);
        }

        rawAudioBufferRef.current = finalBuffer;
        setOriginalDuration(finalBuffer.duration);
        setCurrentTime(0);
        playbackPauseOffsetRef.current = 0;

        // Add to history
        const newHistoryItem: HistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: Date.now(),
          text: text.trim(),
          voiceName: selectedVoice,
          engine: 'openrouter',
          audioBase64: data.audioBase64,
          duration: finalBuffer.duration,
          speed: audioOptions.speed,
          pitchSemitones: audioOptions.pitchSemitones,
        };
        setHistory((prev) => [newHistoryItem, ...prev]);

        if (autoTrimSilence && trimmedInfo) {
          showToast(`✨ สร้างเสียง OpenRouter (${selectedVoice}) สำเร็จ! (ตัดช่วงเงียบ -${(trimmedInfo.leading + trimmedInfo.trailing).toFixed(2)}s)`);
        } else {
          showToast(`✨ สร้างเสียง OpenRouter (${selectedVoice}) สำเร็จ! กำลังเล่นตัวอย่างเสียง...`);
        }
        playAudioFromOffset(0);
      } else if (engine === 'gemini') {
        const response = await fetch('/api/tts/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            voiceName: selectedVoice,
            stylePrompt: customStyle.trim() || selectedStyle,
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
          if (response.status === 429 || data.errorType === 'QUOTA_EXCEEDED') {
            setQuotaExceeded(true);
            setErrorMessage(data.error || 'โควต้าคำขอฟรีของโมเดล AI (จำกัด 10 ครั้ง/วัน) เต็มแล้วสำหรับวันนี้');
            return;
          }
          throw new Error(data.error || 'เกิดข้อผิดพลาดในการสร้างเสียง');
        }

        const arrayBuffer = base64ToArrayBuffer(data.audioBase64);
        const { ctx } = getAudioContext();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

        let finalBuffer = decodedBuffer;
        if (autoTrimSilence) {
          const trimResult = trimSilenceFromAudioBuffer(decodedBuffer, ctx);
          if (trimResult.isTrimmed) {
            finalBuffer = trimResult.buffer;
            setTrimmedInfo({
              leading: trimResult.trimmedLeadingSec,
              trailing: trimResult.trimmedTrailingSec,
            });
          } else {
            setTrimmedInfo(null);
          }
        } else {
          setTrimmedInfo(null);
        }

        rawAudioBufferRef.current = finalBuffer;
        setOriginalDuration(finalBuffer.duration);
        setCurrentTime(0);
        playbackPauseOffsetRef.current = 0;

        // Add to history
        const newHistoryItem: HistoryItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: Date.now(),
          text: text.trim(),
          voiceName: selectedVoice,
          engine: 'gemini',
          audioBase64: data.audioBase64,
          duration: finalBuffer.duration,
          speed: audioOptions.speed,
          pitchSemitones: audioOptions.pitchSemitones,
        };
        setHistory((prev) => [newHistoryItem, ...prev]);

        if (autoTrimSilence && trimmedInfo) {
          showToast(`✨ สร้างเสียงสำเร็จ! (ตัดช่วงเงียบ -${(trimmedInfo.leading + trimmedInfo.trailing).toFixed(2)}s)`);
        } else {
          showToast('✨ สร้างเสียงสำเร็จ! กำลังเล่นตัวอย่างเสียง...');
        }
        playAudioFromOffset(0);
      } else {
        // Browser speech synthesis mode
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }

          // Smart Thai text preprocessing for natural pauses and breathing cadence
          const speechText = autoThaiOptimize ? optimizeThaiTextForSpeech(text) : text;
          const utterance = new SpeechSynthesisUtterance(speechText);

          // Calibrated speech rate (0.92x makes Thai consonants and tones articulate far more clearly)
          utterance.rate = Math.max(0.5, Math.min(2.0, audioOptions.speed * 0.92));
          // Map -10..+10 to 0.5..1.8
          utterance.pitch = Math.max(0.2, Math.min(2.0, 1 + audioOptions.pitchSemitones * 0.08));

          const voice = browserVoices.find((v) => v.voiceURI === selectedBrowserVoiceUri);
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          }

          // Keep active utterance in window to prevent Chrome GC bug
          (window as any)._activeUtterance = utterance;

          window.speechSynthesis.speak(utterance);
          const fallbackBuffer = await createFallbackBuffer(speechText);
          rawAudioBufferRef.current = fallbackBuffer;
          setOriginalDuration(fallbackBuffer.duration);
          setCurrentTime(0);

          showToast('🔊 กำลังอ่านออกเสียง (จัดจังหวะและเว้นวรรคให้อ่านลื่นหู)');
        } else {
          throw new Error('เบราว์เซอร์ของคุณไม่รองรับ SpeechSynthesis');
        }
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      setErrorMessage(err.message || 'ไม่สามารถสร้างเสียงได้ โปรดลองอีกครั้ง');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download Generated & Processed Audio as .WAV
  const handleDownload = async () => {
    if (!rawAudioBufferRef.current) {
      setErrorMessage('ยังไม่มีไฟล์เสียงที่ถูกสร้าง โปรดกด "สร้างเสียงพูด" ก่อนทำการดาวน์โหลด');
      return;
    }

    setIsProcessingDownload(true);
    setErrorMessage(null);

    try {
      // Render buffer through DSP with speed, pitch, EQ baked into the audio
      const processedBuffer = await renderProcessedAudioBuffer(
        rawAudioBufferRef.current,
        audioOptions
      );

      // Convert to clean RIFF WAV Blob
      const wavBlob = audioBufferToWav(processedBuffer);
      const voiceLabel = engine === 'gemini' ? selectedVoice : 'browser-voice';
      const speedLabel = `${audioOptions.speed.toFixed(2)}x`;
      const pitchLabel = audioOptions.pitchSemitones >= 0
        ? `pitch+${audioOptions.pitchSemitones}`
        : `pitch${audioOptions.pitchSemitones}`;
      const filename = `voicecraft-${voiceLabel}-${speedLabel}-${pitchLabel}.wav`;

      downloadBlob(wavBlob, filename);
      showToast(`🎉 ดาวน์โหลดสำเร็จ: ${filename}`);
    } catch (err: any) {
      console.error('Download export failed:', err);
      setErrorMessage('ไม่สามารถส่งออกไฟล์เสียงได้: ' + err.message);
    } finally {
      setIsProcessingDownload(false);
    }
  };

  // Play history item
  const handlePlayHistory = async (item: HistoryItem) => {
    if (item.audioBase64) {
      try {
        const arrayBuf = base64ToArrayBuffer(item.audioBase64);
        const { ctx } = getAudioContext();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        let finalBuffer = decoded;
        if (autoTrimSilence) {
          const trimResult = trimSilenceFromAudioBuffer(decoded, ctx);
          if (trimResult.isTrimmed) {
            finalBuffer = trimResult.buffer;
            setTrimmedInfo({
              leading: trimResult.trimmedLeadingSec,
              trailing: trimResult.trimmedTrailingSec,
            });
          } else {
            setTrimmedInfo(null);
          }
        } else {
          setTrimmedInfo(null);
        }
        rawAudioBufferRef.current = finalBuffer;
        setOriginalDuration(finalBuffer.duration);
        setText(item.text);
        setSelectedVoice(item.voiceName);
        setAudioOptions((prev) => ({
          ...prev,
          speed: item.speed,
          pitchSemitones: item.pitchSemitones,
        }));
        setCurrentTime(0);
        playbackPauseOffsetRef.current = 0;
        playAudioFromOffset(0);
        showToast(`กำลังเล่นประวัติ: ${item.voiceName}`);
      } catch (e: any) {
        setErrorMessage('ไม่สามารถเล่นรายการประวัตินี้ได้');
      }
    } else {
      setText(item.text);
      handleGenerate();
    }
  };

  // Download history item
  const handleDownloadHistory = async (item: HistoryItem) => {
    if (item.audioBase64) {
      try {
        const arrayBuf = base64ToArrayBuffer(item.audioBase64);
        const { ctx } = getAudioContext();
        const decoded = await ctx.decodeAudioData(arrayBuf);
        const processed = await renderProcessedAudioBuffer(decoded, {
          ...audioOptions,
          speed: item.speed,
          pitchSemitones: item.pitchSemitones,
        });
        const blob = audioBufferToWav(processed);
        downloadBlob(blob, `voicecraft-${item.voiceName}-history.wav`);
        showToast('ดาวน์โหลดไฟล์ประวัติเรียบร้อยแล้ว');
      } catch (e: any) {
        setErrorMessage('เกิดข้อผิดพลาดในการดาวน์โหลดประวัติ');
      }
    }
  };

  // Copy text helper
  const handleCopyText = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Words & Characters counting
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  // Estimated Thai speaking rate: ~180 words per minute / speed
  const estimatedSeconds = wordCount > 0
    ? Math.ceil((wordCount / 180) * 60 / Math.max(0.5, audioOptions.speed))
    : 0;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute right-0 top-1/4 h-[450px] w-[450px] rounded-full bg-violet-600/10 blur-[140px]" />
        <div className="absolute bottom-10 left-1/3 h-[500px] w-[500px] rounded-full bg-emerald-600/5 blur-[150px]" />
      </div>

      {/* Main Container */}
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Navigation / Header */}
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 shadow-lg shadow-indigo-600/30">
              <AudioLines className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  VoiceCraft <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Studio</span>
                </h1>
                <span className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                  AI TTS 3.8
                </span>
              </div>
              <p className="text-xs text-slate-400">
                แปลงข้อความเป็นเสียง AI ปรับความเร็ว & โทนเสียงทุ้ม-แหลม และดาวน์โหลดไฟล์เสียงได้ทันที
              </p>
            </div>
          </div>

          {/* Quick Engine Status Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-1.5 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-slate-300">
                {engine === 'openrouter'
                  ? `OpenRouter: ${selectedModel.includes('mini') ? 'GPT-Audio Mini' : 'GPT-Audio'} (${selectedVoice})`
                  : engine === 'gemini'
                  ? 'Gemini 3.8 Flash Lite TTS'
                  : 'เสียงในเครื่อง (Browser Voices)'}
              </span>
            </div>
          </div>
        </header>

        {/* Quota Exceeded Assistance Card */}
        {quotaExceeded && (
          <div className="mb-6 rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/80 via-slate-900 to-indigo-950/60 p-5 shadow-2xl backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-amber-200 text-base">
                      โควต้าโมเดล Gemini AI ฟรีประจำวันเต็ม (จำกัด 10 ครั้ง/วัน)
                    </h3>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      Free Tier Limit
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-2xl">
                    Google AI Studio จำกัดโควต้าสำหรับโมเดล TTS แพ็กเกจฟรีไว้ที่ 10 ครั้งต่อวัน
                    <br />
                    👉 <strong>วิธีใช้งานต่อได้ทันที:</strong> คุณสามารถกดปุ่มสลับไปที่ <strong>&quot;OpenRouter AI&quot;</strong> ซึ่งมี API Key ฝังพร้อมใช้งานทันที หรือเลือก &quot;เสียงในเครื่อง&quot; ได้เลย!
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap shrink-0 items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => {
                    setEngine('openrouter');
                    setQuotaExceeded(false);
                    setErrorMessage(null);
                    showToast('🚀 สลับมาใช้ OpenRouter AI เรียบร้อยแล้ว (มี 11 เสียงพากย์)');
                  }}
                  className="flex flex-1 md:flex-initial items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-orange-500/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>สลับใช้ OpenRouter AI (แนะนำ)</span>
                </button>
                <button
                  onClick={() => {
                    setEngine('browser');
                    setQuotaExceeded(false);
                    setErrorMessage(null);
                    showToast('สลับมาใช้เสียงในเครื่องเรียบร้อยแล้ว');
                  }}
                  className="flex flex-1 md:flex-initial items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-4 py-2.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 active:scale-95 transition-all"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>เสียงในเครื่อง (ฟรี)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Notifications / Error Alert */}
        {errorMessage && !quotaExceeded && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-300 shadow-lg backdrop-blur-md">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">เกิดข้อผิดพลาด</p>
              <p className="text-xs text-rose-200/90 mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-400 hover:text-white"
            >
              ปิด
            </button>
          </div>
        )}

        {notification && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-slate-900/95 px-4 py-3 text-sm text-emerald-300 shadow-2xl shadow-emerald-950/80 backdrop-blur-lg animate-in fade-in slide-in-from-bottom-3 duration-200">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        {/* Grid Layout: Left Column (Text & Voice setup) | Right Column (Player & Audio Modifiers) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT COLUMN: Text Editor & Voice Setup (7 cols on lg) */}
          <div className="space-y-6 lg:col-span-7">
            {/* TEXT INPUT CARD */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">ข้อความสำหรับสร้างเสียง</h2>
                    <p className="text-xs text-slate-400">พิมพ์หรือวางข้อความที่ต้องการแปลงเป็นเสียง</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (!text.trim()) return;
                      const formatted = formatThaiTextSpacing(text);
                      setText(formatted);
                      showToast('✨ จัดวรรคตอนและจังหวะพักหายใจภาษาไทยให้อ่านลื่นเรียบร้อยแล้ว!');
                    }}
                    title="จัดวรรคตอนและจังหวะพักหายใจคำไทยให้อ่านลื่นและถูกต้องตามหลักภาษา"
                    className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 hover:text-amber-200 transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>จัดวรรคตอนคำไทย</span>
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const clipText = await navigator.clipboard.readText();
                        if (clipText) setText(clipText);
                      } catch {
                        // ignore
                      }
                    }}
                    title="วางข้อความจาก Clipboard"
                    className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    <span>วาง (Paste)</span>
                  </button>
                  <button
                    onClick={handleCopyText}
                    title="คัดลอกข้อความ"
                    className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                  </button>
                  <button
                    onClick={() => setText('')}
                    title="ล้างข้อความ"
                    className="rounded-lg border border-slate-800 bg-slate-800/60 p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  rows={6}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="พิมพ์หรือวางข้อความภาษาไทย หรือภาษาอื่นๆ ที่คุณต้องการให้ระบบอ่านออกเสียง..."
                  className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-relaxed text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                />

                {/* Character & Word Counters */}
                <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-3">
                    <span>{charCount.toLocaleString()} ตัวอักษร</span>
                    <span>•</span>
                    <span>{wordCount.toLocaleString()} คำ</span>
                    <span>•</span>
                    <span>ประมาณ ~{estimatedSeconds} วินาที</span>
                  </div>
                  {charCount > 4500 && (
                    <span className="text-amber-400">ใกล้ถึงขีดจำกัด (สูงสุด 5,000 ตัวอักษร)</span>
                  )}
                </div>

                {/* Browser Mode Thai Reading Optimization Tip */}
                {engine === 'browser' && (
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-3.5 py-2.5 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold shrink-0">💡 เคล็ดลับเสียงในเครื่อง:</span>
                      <span className="text-slate-300 leading-relaxed">
                        ภาษาไทยเขียนติดกัน หากรู้สึกว่าระบบอ่านเร็วหรือเว้นวรรคผิด ให้กดปุ่ม <strong>&quot;จัดวรรคตอนคำไทย&quot;</strong> ด้านบน เพื่อเคาะเว้นวรรคจังหวะหายใจให้อ่านลื่นขึ้น
                      </span>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0 ml-auto sm:ml-2">
                      <input
                        type="checkbox"
                        checked={autoThaiOptimize}
                        onChange={(e) => setAutoThaiOptimize(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
                      />
                      <span className="text-[11px] text-cyan-300 font-medium">จัดจังหวะหายใจอัตโนมัติ</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Sample Scripts Chips */}
              <div className="mt-4 border-t border-slate-800/80 pt-3">
                <SampleScripts onSelect={(sample) => setText(sample)} />
              </div>
            </div>

            {/* VOICE & STYLE SELECTION CARD */}
            <VoiceSelector
              engine={engine}
              setEngine={setEngine}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              selectedVoice={selectedVoice}
              setSelectedVoice={setSelectedVoice}
              selectedStyle={selectedStyle}
              setSelectedStyle={setSelectedStyle}
              customStyle={customStyle}
              setCustomStyle={setCustomStyle}
              openrouterConfigured={openrouterConfigured}
              openrouterMaskedKey={openrouterMaskedKey}
              geminiAvailable={geminiAvailable}
              browserVoices={browserVoices}
              selectedBrowserVoiceUri={selectedBrowserVoiceUri}
              setSelectedBrowserVoiceUri={setSelectedBrowserVoiceUri}
              userCustomKey={userCustomKey}
              setUserCustomKey={setUserCustomKey}
            />

            {/* GENERATE ACTION BUTTON */}
            <div className="space-y-1.5">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                className={`group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl py-4 px-6 font-bold text-white shadow-xl transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                  engine === 'openrouter'
                    ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-orange-500/30'
                    : engine === 'gemini'
                    ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 shadow-indigo-600/30'
                    : 'bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 shadow-cyan-600/30'
                }`}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
                {isGenerating ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>กำลังสร้างเสียงผ่าน AI (กรุณารอสักครู่)...</span>
                  </>
                ) : engine === 'openrouter' ? (
                  <>
                    <Sparkles className="h-5 w-5 transition-transform group-hover:scale-125" />
                    <span className="text-base tracking-wide">
                      สร้างเสียงด้วย OpenRouter AI &amp; ดาวน์โหลดไฟล์ (.WAV)
                    </span>
                  </>
                ) : engine === 'gemini' ? (
                  <>
                    <Wand2 className="h-5 w-5 transition-transform group-hover:rotate-12" />
                    <span className="text-base tracking-wide">
                      สร้างเสียงด้วย Gemini AI &amp; ดาวน์โหลดไฟล์ (.WAV)
                    </span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-5 w-5 transition-transform group-hover:scale-110" />
                    <span className="text-base tracking-wide">
                      สั่งอ่านออกเสียงผ่านลำโพง (Read Aloud)
                    </span>
                  </>
                )}
              </button>

              {engine === 'browser' && (
                <p className="text-center text-[11px] text-slate-400">
                  ℹ️ เสียงในเครื่องเป็นการอ่านสดผ่านลำโพงของเครื่องโดยตรง (ระบบเบราว์เซอร์ไม่มี API ให้ดาวน์โหลดไฟล์เสียงจาก SpeechSynthesis)
                </p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Audio Player, Speed/Pitch Controls & Download (5 cols on lg) */}
          <div className="space-y-6 lg:col-span-5">
            {/* AUDIO STUDIO PLAYER CARD */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400">
                    <Headphones className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">เครื่องเล่นเสียง & ตัวแสดงคลื่น</h3>
                    <p className="text-xs text-slate-400">
                      {rawAudioBufferRef.current ? 'พร้อมเล่นและปรับแต่งเสียง' : 'รอการสร้างเสียง...'}
                    </p>
                  </div>
                </div>

                {rawAudioBufferRef.current && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {trimmedInfo && (
                      <span
                        className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300"
                        title={`ตัดช่วงเงียบเริ่มต้น: -${trimmedInfo.leading}s | ตัดช่วงเงียบสิ้นสุด: -${trimmedInfo.trailing}s`}
                      >
                        ✂️ Trim: -{(trimmedInfo.leading + trimmedInfo.trailing).toFixed(2)}s
                      </span>
                    )}
                    <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono text-indigo-300" title="ป้องกันเสียงคลิกและตัดหัว-ท้ายด้วย Fade In/Out 0.1s อัตโนมัติ">
                      Fade: 0.1s
                    </span>
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-mono font-semibold text-emerald-400">
                      24kHz Audio Ready
                    </span>
                  </div>
                )}
              </div>

              {/* Waveform Canvas Visualizer */}
              <div className="space-y-3">
                {/* Auto-Trim Silence Toggle Bar */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      const nextVal = !autoTrimSilence;
                      setAutoTrimSilence(nextVal);
                      showToast(nextVal ? 'เปิดใช้งานตัดช่วงเงียบอัตโนมัติ' : 'ปิดใช้งานตัดช่วงเงียบอัตโนมัติ');
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all ${
                      autoTrimSilence
                        ? 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 shadow-sm shadow-cyan-950'
                        : 'border border-slate-700/60 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                    }`}
                    title="ตรวจจับและตัดช่วงเงียบที่จุดเริ่มต้นและจุดสิ้นสุดออกอัตโนมัติ เพื่อให้เริ่มเล่นได้ทันทีแบบไม่มีอาการดีเลย์"
                  >
                    <Scissors className="h-3.5 w-3.5" />
                    <span>ตัดช่วงเงียบอัตโนมัติ (Auto-Trim Silence)</span>
                    <span className={`text-[10px] font-bold px-1 rounded ${autoTrimSilence ? 'bg-cyan-500/20 text-cyan-200' : 'bg-slate-700/50 text-slate-400'}`}>
                      {autoTrimSilence ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  {trimmedInfo && (
                    <span className="text-[11px] font-mono text-cyan-400/80">
                      ตัดหัว -{trimmedInfo.leading}s | ท้าย -{trimmedInfo.trailing}s
                    </span>
                  )}
                </div>

                <AudioVisualizer
                  analyser={analyserRef.current}
                  isPlaying={isPlaying}
                  duration={effectiveDuration}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                />

                {/* Progress Bar & Timestamps */}
                <div className="space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={effectiveDuration || 1}
                    step="0.05"
                    value={currentTime}
                    disabled={!rawAudioBufferRef.current}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-indigo-500 disabled:opacity-50"
                  />
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(effectiveDuration)}</span>
                  </div>
                </div>

                {/* Playback Controls & Direct Download Button */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTogglePlay}
                      disabled={isGenerating}
                      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {isPlaying ? (
                        <Pause className="h-5 w-5 fill-current" />
                      ) : (
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      )}
                    </button>

                    <button
                      onClick={handleReplay}
                      disabled={!rawAudioBufferRef.current}
                      title="เล่นใหม่อีกครั้ง"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>

                  {/* DOWNLOAD BUTTON */}
                  {engine === 'gemini' ? (
                    <button
                      onClick={handleDownload}
                      disabled={!rawAudioBufferRef.current || isProcessingDownload}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProcessingDownload ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>กำลังประมวลผล...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          <span>ดาวน์โหลดเสียง (.WAV)</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex-1 rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-center text-xs">
                      <span className="text-slate-300 font-medium">โหมดเสียงในเครื่อง (อ่านสดผ่านลำโพง)</span>
                      <p className="text-[10px] text-amber-300/90 mt-0.5">
                        *ต้องการบันทึกเป็นไฟล์ .WAV โปรดสลับไปใช้โหมด Gemini AI
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AUDIO CONTROLS (SPEED & PITCH) CARD */}
            <AudioControls
              options={audioOptions}
              onChange={(newOptions) => {
                setAudioOptions(newOptions);
                // If currently playing, update in real-time
                if (isPlaying && rawAudioBufferRef.current) {
                  playAudioFromOffset(currentTime);
                }
              }}
              disabled={false}
            />

            {/* GENERATION HISTORY CARD */}
            <HistoryList
              items={history}
              onPlay={handlePlayHistory}
              onDownload={handleDownloadHistory}
              onClear={() => setHistory([])}
              onDelete={(id) => setHistory((prev) => prev.filter((i) => i.id !== id))}
            />
          </div>
        </div>

        {/* Feature Highlights Footer */}
        <footer className="mt-12 rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-3xl space-y-2">
            <p className="font-medium text-slate-400">
              VoiceCraft AI Studio • สตูดิโอแปลงข้อความเป็นเสียงพูดภาษาไทยและสากล
            </p>
            <p>
              รองรับการปรับระดับความเร็ว (Speed: 0.5x - 2.0x), โทนเสียง (Pitch Shift: ทุ้มลึก ถึง แหลมสูง), ปรับแต่งเอกลักษณ์เสียงด้วย Parametric EQ และส่งออกไฟล์เสียง 16-bit PCM WAV คุณภาพสูง
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
