import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface GeminiAudioPlayerProps {
  src?: string;
  durationInSeconds?: number;
  title?: string;
  className?: string;
}

export const GeminiAudioPlayer: React.FC<GeminiAudioPlayerProps> = ({
  src,
  durationInSeconds = 152, // Default 2:32 fallback
  title = 'Spoken Response',
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalDuration = audioRef.current?.duration && !isNaN(audioRef.current.duration)
    ? audioRef.current.duration
    : durationInSeconds;

  // Draw audio waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let step = 0;

    const renderWaveform = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = 3;
      const barGap = 2.5;
      const numBars = Math.floor(canvas.width / (barWidth + barGap));
      const centerY = canvas.height / 2;

      for (let i = 0; i < numBars; i++) {
        let barHeight = 4;
        if (isPlaying) {
          // Dynamic simulated frequency bars
          const wave1 = Math.sin(step * 0.15 + i * 0.3) * 10;
          const wave2 = Math.cos(step * 0.1 + i * 0.5) * 8;
          barHeight = Math.max(4, Math.min(canvas.height - 4, 8 + Math.abs(wave1 + wave2)));
        } else {
          // Flat static gray bars
          barHeight = 4 + (i % 3 === 0 ? 3 : 0);
        }

        const x = i * (barWidth + barGap);
        const y = centerY - barHeight / 2;

        // Progress highlighting
        const progress = currentTime / totalDuration;
        const barProgressRatio = i / numBars;

        if (barProgressRatio <= progress) {
          // Active gradient (blue -> purple)
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#4285F4');
          gradient.addColorStop(1, '#9B51E0');
          ctx.fillStyle = gradient;
        } else {
          // Inactive flat gray
          ctx.fillStyle = '#4A4D51';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 1.5);
        ctx.fill();
      }

      if (isPlaying) {
        step++;
        animationFrameRef.current = requestAnimationFrame(renderWaveform);
      }
    };

    renderWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, totalDuration]);

  // Handle audio play/pause
  const togglePlay = () => {
    if (audioRef.current && src) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(true));
      }
    } else {
      // Simulated playback fallback if src is not an actual audio file
      setIsPlaying(prev => !prev);
    }
  };

  // Simulated timer update when playing without audio ref
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(time => {
          if (time >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return time + 0.5;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  return (
    <div
      className={`relative flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/90 px-3.5 py-2 shadow-sm transition hover:border-blue-400/50 dark:border-white/10 dark:bg-[#1e1f20] dark:hover:border-blue-400/30 w-full sm:w-[320px] shrink-0 ${className}`}
      aria-label={`Audio player: ${title}`}
    >
      {src && (
        <audio
          ref={audioRef}
          src={src}
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Circular Play / Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#4285F4] to-[#9B51E0] text-white shadow-md transition transform hover:scale-105 active:scale-95"
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
      </button>

      {/* Visual Waveform Canvas */}
      <div className="flex-1 flex items-center min-w-0 px-1">
        <canvas
          ref={canvasRef}
          width={150}
          height={28}
          className="w-full h-[28px] cursor-pointer"
          onClick={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const ratio = clickX / rect.width;
            const newTime = ratio * totalDuration;
            setCurrentTime(newTime);
            if (audioRef.current) {
              audioRef.current.currentTime = newTime;
            }
          }}
        />
      </div>

      {/* Real-time Countdown Tracker */}
      <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-medium text-slate-600 dark:text-[#c4c7c5] tracking-tight">
        <span>{formatTime(currentTime)}</span>
        <span className="opacity-40">/</span>
        <span>{formatTime(totalDuration)}</span>
      </div>

      {/* Volume Mute Toggle */}
      <button
        type="button"
        onClick={() => {
          setIsMuted(!isMuted);
          if (audioRef.current) audioRef.current.muted = !isMuted;
        }}
        className="rounded-full p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};

export default GeminiAudioPlayer;
