import React from 'react';
import { Gauge, Sliders, Volume2, RotateCcw, Sparkles } from 'lucide-react';
import { AudioProcessingOptions } from '../utils/audioUtils';

interface AudioControlsProps {
  options: AudioProcessingOptions;
  onChange: (newOptions: AudioProcessingOptions) => void;
  disabled?: boolean;
}

export const AudioControls: React.FC<AudioControlsProps> = ({
  options,
  onChange,
  disabled = false,
}) => {
  const speedPresets = [
    { label: '0.75x ช้า', value: 0.75 },
    { label: '1.0x ปกติ', value: 1.0 },
    { label: '1.25x กระชับ', value: 1.25 },
    { label: '1.5x เร็ว', value: 1.5 },
    { label: '1.75x เร็วมาก', value: 1.75 },
  ];

  const pitchPresets = [
    { label: 'ทุ้มลึกมาก', value: -6 },
    { label: 'ทุ้มอบอุ่น', value: -2 },
    { label: 'ธรรมชาติ', value: 0 },
    { label: 'เสียงใส', value: 2 },
    { label: 'แหลมสูง', value: 5 },
  ];

  const handleReset = () => {
    onChange({
      speed: 1.0,
      pitchSemitones: 0,
      bassDb: 0,
      trebleDb: 0,
      volume: 1.0,
    });
  };

  const getPitchLabel = (semitones: number) => {
    if (semitones === 0) return 'โทนปกติ (Natural)';
    if (semitones < -4) return `ทุ้มลึกมาก (${semitones}st)`;
    if (semitones < 0) return `ทุ้มนุ่ม (${semitones}st)`;
    if (semitones > 4) return `แหลมสูงมาก (+${semitones}st)`;
    return `เสียงใส (+${semitones}st)`;
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white">ปรับแต่งความเร็ว & โทนเสียง</h3>
            <p className="text-xs text-slate-400">กำหนดความเร็ว โทนเสียงทุ้ม-แหลม ตามต้องการ</p>
          </div>
        </div>

        <button
          onClick={handleReset}
          disabled={disabled}
          title="รีเซ็ตเป็นค่าเริ่มต้น"
          className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-700 hover:text-white disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3" />
          <span>รีเซ็ต</span>
        </button>
      </div>

      {/* 1. SPEED / ความเร็ว */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Gauge className="h-4 w-4 text-emerald-400" />
            <span>ระดับความเร็ว (Speed / Tempo)</span>
          </div>
          <span className="rounded-md bg-emerald-500/15 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-400">
            {options.speed.toFixed(2)}x
          </span>
        </div>

        <div className="relative">
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={options.speed}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...options, speed: parseFloat(e.target.value) })
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-emerald-500"
          />
          <div className="mt-1 flex justify-between text-[11px] text-slate-500 font-mono">
            <span>0.5x ช้า</span>
            <span>1.0x ปกติ</span>
            <span>2.0x เร็ว</span>
          </div>
        </div>

        {/* Speed Presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {speedPresets.map((preset) => {
            const isActive = Math.abs(options.speed - preset.value) < 0.03;
            return (
              <button
                key={preset.value}
                disabled={disabled}
                onClick={() => onChange({ ...options, speed: preset.value })}
                className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. PITCH / โทนเสียง ทุ้ม-แหลม */}
      <div className="space-y-2.5 border-t border-slate-800/80 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span>ระดับโทนเสียง (Pitch / Tone)</span>
          </div>
          <span className="rounded-md bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-300">
            {getPitchLabel(options.pitchSemitones)}
          </span>
        </div>

        <div className="relative">
          <input
            type="range"
            min="-10"
            max="10"
            step="1"
            value={options.pitchSemitones}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...options, pitchSemitones: parseInt(e.target.value, 10) })
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-violet-500"
          />
          <div className="mt-1 flex justify-between text-[11px] text-slate-500">
            <span>◄ ทุ้มต่ำ (Deep)</span>
            <span>ปกติ (0)</span>
            <span>แหลมสูง (High) ►</span>
          </div>
        </div>

        {/* Pitch Presets */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {pitchPresets.map((preset) => {
            const isActive = options.pitchSemitones === preset.value;
            return (
              <button
                key={preset.value}
                disabled={disabled}
                onClick={() => onChange({ ...options, pitchSemitones: preset.value })}
                className={`rounded-lg px-2.5 py-1 text-xs transition-all ${
                  isActive
                    ? 'bg-violet-500 text-white font-bold shadow-md shadow-violet-500/20'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. ACOUSTIC TIMBRE / EQUALIZER */}
      <div className="space-y-3 rounded-xl border border-slate-800/60 bg-slate-950/40 p-3.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            ปรับแต่งเอกลักษณ์เสียง (Tone Shaping EQ)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Bass Warmth */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">เสียงทุ้ม/เบส (Bass)</span>
              <span className="font-mono text-cyan-400">
                {options.bassDb > 0 ? `+${options.bassDb}` : options.bassDb} dB
              </span>
            </div>
            <input
              type="range"
              min="-8"
              max="12"
              step="1"
              value={options.bassDb}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...options, bassDb: parseInt(e.target.value, 10) })
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-cyan-400"
            />
          </div>

          {/* Treble Brightness */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">เสียงแหลม/โปร่ง (Treble)</span>
              <span className="font-mono text-pink-400">
                {options.trebleDb > 0 ? `+${options.trebleDb}` : options.trebleDb} dB
              </span>
            </div>
            <input
              type="range"
              min="-8"
              max="12"
              step="1"
              value={options.trebleDb}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...options, trebleDb: parseInt(e.target.value, 10) })
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-pink-400"
            />
          </div>
        </div>

        {/* Output Volume */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Volume2 className="h-3.5 w-3.5 text-amber-400" />
              ระดับความดัง (Master Volume)
            </span>
            <span className="font-mono text-amber-400">
              {Math.round(options.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1.5"
            step="0.05"
            value={options.volume}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...options, volume: parseFloat(e.target.value) })
            }
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-amber-400"
          />
        </div>
      </div>
    </div>
  );
};
