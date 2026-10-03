import React from 'react';
import { History, Play, Trash2, Download, Clock, Music } from 'lucide-react';
import { formatDuration } from '../utils/audioUtils';

export interface HistoryItem {
  id: string;
  timestamp: number;
  text: string;
  voiceName: string;
  engine: 'openrouter' | 'gemini' | 'browser';
  audioBase64?: string;
  duration?: number;
  speed: number;
  pitchSemitones: number;
}

interface HistoryListProps {
  items: HistoryItem[];
  onPlay: (item: HistoryItem) => void;
  onDownload: (item: HistoryItem) => void;
  onClear: () => void;
  onDelete: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  onPlay,
  onDownload,
  onClear,
  onDelete,
}) => {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-500">
          <History className="h-6 w-6" />
        </div>
        <h4 className="mt-3 text-sm font-semibold text-slate-300">ยังไม่มีประวัติการสร้างเสียง</h4>
        <p className="mt-1 text-xs text-slate-500">
          ข้อความที่คุณแปลงเป็นเสียงจะปรากฏที่นี่ เพื่อให้คุณกลับมาฟังและดาวน์โหลดซ้ำได้ตลอดเวลา
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-pink-400">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white">ประวัติเสียงที่สร้าง ({items.length})</h3>
            <p className="text-xs text-slate-400">คลิกเพื่อฟังซ้ำ หรือดาวน์โหลดไฟล์เสียง</p>
          </div>
        </div>

        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>ล้างประวัติ</span>
        </button>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {items.map((item) => {
          const dateStr = new Date(item.timestamp).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 transition-colors hover:border-slate-700 hover:bg-slate-900/90"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium text-slate-200 line-clamp-1">
                  &quot;{item.text}&quot;
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                    item.engine === 'openrouter'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : item.engine === 'gemini'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    <Music className="h-3 w-3" />
                    {item.voiceName} {item.engine === 'openrouter' ? '• OpenRouter' : item.engine === 'gemini' ? '• Gemini' : '• เบราว์เซอร์'}
                  </span>
                  <span>ความเร็ว: {item.speed.toFixed(2)}x</span>
                  <span>โทน: {item.pitchSemitones > 0 ? `+${item.pitchSemitones}` : item.pitchSemitones}st</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3" />
                    {dateStr}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  onClick={() => onPlay(item)}
                  title="ฟังเสียงนี้"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 transition-colors hover:bg-indigo-600 hover:text-white"
                >
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </button>
                <button
                  onClick={() => onDownload(item)}
                  title="ดาวน์โหลดไฟล์เสียง"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 transition-colors hover:bg-emerald-600 hover:text-white"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  title="ลบรายการนี้"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
