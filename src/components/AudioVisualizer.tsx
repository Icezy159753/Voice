import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  onSeek?: (time: number) => void;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isPlaying,
  duration,
  currentTime,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bufferLength = 64;
    let dataArray = new Uint8Array(bufferLength);

    if (analyser) {
      analyser.fftSize = 128;
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, '#0f172a');
      bgGradient.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Grid / line accents
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else {
        // Subtle resting wave
        const now = Date.now() * 0.002;
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = isPlaying
            ? Math.floor(60 + Math.sin(now + i * 0.2) * 40)
            : Math.floor(12 + Math.sin(now + i * 0.15) * 6);
        }
      }

      const barCount = 48;
      const barWidth = (width / barCount) - 2;
      const step = Math.max(1, Math.floor(bufferLength / barCount));

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] || 0;
        const percent = val / 255;
        const barHeight = Math.max(4, percent * (height * 0.8));
        const x = i * (barWidth + 2) + 2;
        const y = (height - barHeight) / 2;

        // Glowing gradient for active bars
        const barGradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isPlaying) {
          barGradient.addColorStop(0, '#38bdf8');
          barGradient.addColorStop(0.5, '#818cf8');
          barGradient.addColorStop(1, '#c084fc');
        } else {
          barGradient.addColorStop(0, '#334155');
          barGradient.addColorStop(1, '#1e293b');
        }

        ctx.fillStyle = barGradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      // Draw progress overlay line
      if (duration > 0) {
        const progressX = (currentTime / duration) * width;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(progressX, 0);
        ctx.lineTo(progressX, height);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isPlaying, duration, currentTime]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSeek || duration <= 0) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/60 shadow-inner">
      <canvas
        ref={canvasRef}
        width={600}
        height={100}
        onClick={handleCanvasClick}
        className="h-24 w-full cursor-pointer transition-opacity duration-200"
      />
      <div className="pointer-events-none absolute bottom-1 right-2 text-[11px] font-mono text-slate-500">
        Interactive Waveform
      </div>
    </div>
  );
};
