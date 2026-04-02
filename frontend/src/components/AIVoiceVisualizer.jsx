import React, { useMemo, useRef } from 'react';
import { LoaderCircle, Mic, Sparkles, Volume2 } from 'lucide-react';
import { motion, useAnimationFrame, useMotionValue, useSpring } from 'framer-motion';

const MODE_META = {
  idle: {
    icon: Sparkles,
    borderColor: 'rgba(255,255,255,0.08)',
    glow: 'rgba(34,211,238,0.12)',
    peak: 0.08
  },
  listening: {
    icon: Mic,
    borderColor: 'rgba(125,211,252,0.30)',
    glow: 'rgba(56,189,248,0.22)',
    peak: 0.44
  },
  processing: {
    icon: LoaderCircle,
    borderColor: 'rgba(255,255,255,0.14)',
    glow: 'rgba(255,255,255,0.08)',
    peak: 0.24
  },
  speaking: {
    icon: Volume2,
    borderColor: 'rgba(34,211,238,0.34)',
    glow: 'rgba(34,211,238,0.28)',
    peak: 0.72
  }
};

const WaveParticle = ({ dot, smoothX, smoothY, audioAnalyzeRef }) => {
  const x = useMotionValue(dot.baseX);
  const y = useMotionValue(dot.baseY);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(0.72);

  useAnimationFrame((time) => {
    const distFromCenter = Math.sqrt(dot.baseX ** 2 + dot.baseY ** 2);
    const audioPeak = audioAnalyzeRef.current || 0;
    const waveSpeed = time / 1200;

    const baseAmplitude = 35;
    const audioAmplitudeBonus = audioPeak * 26;
    const finalAmplitude = baseAmplitude + audioAmplitudeBonus;

    const waveX = Math.cos(waveSpeed + distFromCenter / 80) * finalAmplitude;
    const waveY = Math.sin(waveSpeed + distFromCenter / 80) * finalAmplitude;

    const basePulse = 1 + Math.sin(waveSpeed + distFromCenter / 100) * 0.28;
    const audioScaleBonus = audioPeak * 0.55;
    scale.set(basePulse + audioScaleBonus);
    opacity.set(0.62 + audioPeak * 0.28);

    const mx = smoothX.get();
    const my = smoothY.get();
    const dx = mx - dot.baseX;
    const dy = my - dot.baseY;
    const distToMouse = Math.sqrt(dx * dx + dy * dy);

    let pullX = 0;
    let pullY = 0;
    const interactionRadius = 350;

    if (distToMouse < interactionRadius) {
      const pullStrength = Math.pow((interactionRadius - distToMouse) / interactionRadius, 2);
      pullX = dx * pullStrength * 0.3;
      pullY = dy * pullStrength * 0.3;
    }

    x.set(dot.baseX + waveX + pullX);
    y.set(dot.baseY + waveY + pullY);
  });

  return (
    <motion.div
      style={{
        x,
        y,
        scale,
        opacity,
        rotate: dot.angle,
        backgroundColor: dot.color
      }}
      className="absolute h-1 w-1 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.35)]"
    />
  );
};

const AIVoiceVisualizer = ({ mode = 'idle', amplitude = 0.12 }) => {
  const containerRef = useRef(null);
  const audioAnalyzeRef = useRef(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { damping: 40, stiffness: 180 });
  const smoothY = useSpring(mouseY, { damping: 40, stiffness: 180 });

  const currentMode = MODE_META[mode] || MODE_META.idle;
  const Icon = currentMode.icon;

  useAnimationFrame(() => {
    const time = Date.now();
    const baseLevel = currentMode.peak;
    const breath = Math.sin(time / 800) * 0.5 + 0.5;
    const syllables = Math.abs(Math.sin(time / 200) * Math.cos(time / 300));
    const reactiveLevel = baseLevel * (0.55 + breath * 0.45) + syllables * baseLevel * 0.45 + amplitude * 0.25;

    audioAnalyzeRef.current =
      audioAnalyzeRef.current * 0.85 +
      reactiveLevel * 0.15;
  });

  const handleMouseMove = (event) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(event.clientX - rect.left - rect.width / 2);
    mouseY.set(event.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const dots = useMemo(() => {
    const generatedDots = [];
    const cols = 16;
    const rows = 16;
    const spacing = 50;
    const colors = ['#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e', '#fb923c', '#facc15'];

    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        const baseX = (i - cols / 2) * spacing;
        const baseY = (j - rows / 2) * spacing;

        if (Math.sqrt(baseX ** 2 + baseY ** 2) > 380) continue;

        const progress = i / cols;
        const colorIndex = Math.min(Math.floor(progress * colors.length), colors.length - 1);
        const angle = Math.atan2(baseY, baseX) * (180 / Math.PI);

        generatedDots.push({
          id: `${i}-${j}`,
          baseX: baseX + (Math.random() - 0.5) * 5,
          baseY: baseY + (Math.random() - 0.5) * 5,
          color: colors[colorIndex],
          angle
        });
      }
    }

    return generatedDots;
  }, []);

  return (
    <div className="relative flex w-full items-center justify-center overflow-hidden rounded-[44px] border border-white/10 bg-slate-950/85 p-4">
      <motion.div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{ borderColor: currentMode.borderColor }}
        className="relative flex aspect-square w-full max-w-[620px] items-center justify-center overflow-hidden rounded-full border-2 bg-slate-900 shadow-[0_0_60px_-15px_rgba(0,0,0,0.7)] transition-colors duration-1000"
      >
        <motion.div
          animate={{
            scale: mode === 'speaking' ? [1, 1.05, 1] : mode === 'listening' ? [1, 1.03, 1] : [1, 1.015, 1],
            opacity: mode === 'processing' ? [0.32, 0.5, 0.32] : [0.25, 0.42, 0.25]
          }}
          transition={{ duration: mode === 'speaking' ? 1.2 : 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-[10%] rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${currentMode.glow} 0%, transparent 68%)` }}
        />

        <div className="relative">
          {dots.map((dot) => (
            <WaveParticle
              key={dot.id}
              dot={dot}
              smoothX={smoothX}
              smoothY={smoothY}
              audioAnalyzeRef={audioAnalyzeRef}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04),_transparent_50%)]" />

        <motion.div
          animate={{
            scale: mode === 'speaking' ? [1, 1.08, 0.98, 1] : mode === 'listening' ? [1, 1.04, 1] : mode === 'processing' ? [1, 1.02, 1] : [1, 1.015, 1],
            rotate: mode === 'processing' ? 360 : 0
          }}
          transition={{
            scale: { duration: mode === 'speaking' ? 1.1 : 2, repeat: Infinity, ease: 'easeInOut' },
            rotate: { duration: 8, repeat: Infinity, ease: 'linear' }
          }}
          className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white backdrop-blur-md shadow-[0_0_50px_rgba(59,130,246,0.15)]"
        >
          <Icon className="h-11 w-11" />
        </motion.div>
      </motion.div>

      <div className="pointer-events-none absolute bottom-6 right-8 opacity-10">
        <p className="text-[11px] uppercase tracking-[0.38em] text-cyan-200">Voice Interface</p>
        <p className="mt-2 text-2xl font-light text-white">
          AI <span className="font-semibold">VOICE</span>
        </p>
      </div>
    </div>
  );
};

export default AIVoiceVisualizer;
