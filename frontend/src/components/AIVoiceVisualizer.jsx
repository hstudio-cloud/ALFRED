import React, { useMemo, useRef, useState } from 'react';
import { motion, useSpring, useMotionValue, useAnimationFrame } from 'framer-motion';
import { Play, Square } from 'lucide-react';

// ==========================================
// 1. SUB-COMPONENTE DA PARTÍCULA
// ==========================================
const WaveParticle = ({ dot, smoothX, smoothY, audioAnalyzeRef }) => {
  const x = useMotionValue(dot.baseX);
  const y = useMotionValue(dot.baseY);
  const scale = useMotionValue(1);
  const opacity = useMotionValue(0.7);

  useAnimationFrame((time) => {
    const distFromCenter = Math.sqrt(dot.baseX ** 2 + dot.baseY ** 2);
    
    // --- OBTENÇÃO DADOS ÁUDIO SIMULADO ---
    const audioPeak = audioAnalyzeRef.current || 0;

    // --- FÍSICA BASE (Onda e Tempo) ---
    const waveSpeed = time / 1200;
    
    // Reduzimos o multiplicador de bônus para a expansão ser mais gentil
    const baseAmplitude = 35;
    const audioAmplitudeBonus = audioPeak * 25; // Antes era 60, agora expande suavemente
    const finalAmplitude = baseAmplitude + audioAmplitudeBonus;

    const waveX = Math.cos(waveSpeed + distFromCenter / 80) * finalAmplitude;
    const waveY = Math.sin(waveSpeed + distFromCenter / 80) * finalAmplitude;

    // --- PULSAÇÃO (Scale e Opacity) ---
    const basePulse = 1 + Math.sin(waveSpeed + distFromCenter / 100) * 0.3;
    
    // A escala também aumenta menos bruscamente
    const audioScaleBonus = audioPeak * 0.5; // Antes era 1.2
    scale.set(basePulse + audioScaleBonus);
    
    opacity.set(0.7 + audioPeak * 0.2);

    // --- ATRAÇÃO DO MOUSE ---
    const mx = smoothX.get();
    const my = smoothY.get();
    const dx = mx - dot.baseX;
    const dy = my - dot.baseY;
    const distToMouse = Math.sqrt(dx * dx + dy * dy);

    let pullX = 0;
    let pullY = 0;
    const INTERACTION_RADIUS = 350;

    if (distToMouse < INTERACTION_RADIUS) {
      const pullStrength = Math.pow((INTERACTION_RADIUS - distToMouse) / INTERACTION_RADIUS, 2);
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
      className="absolute w-1 h-1 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)]"
    />
  );
};

// ==========================================
// 2. COMPONENTE PRINCIPAL (Contêiner Circular)
// ==========================================
const AntigravityWave = () => {
  const containerRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const audioAnalyzeRef = useRef(0);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 40, stiffness: 180 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // --- LOOP DE SIMULAÇÃO DE ÁUDIO SUAVE ---
  useAnimationFrame(() => {
    if (isPlaying) {
      const time = Date.now();
      
      // Criamos um ritmo orgânico de fala calma usando harmonias lentas
      // 1. "Respiração": uma onda bem lenta que dita o volume geral (0 a 1)
      const breath = Math.sin(time / 800) * 0.5 + 0.5; 
      
      // 2. "Sílabas": ondas médias que se cruzam criando picos arredondados
      const syllables = Math.abs(Math.sin(time / 200) * Math.cos(time / 300));
      
      // Multiplicamos a respiração pelas sílabas para um som natural
      let simValue = breath * syllables; 
      
      // Filtro passa-baixa mais forte (Inércia de 85%). Evita qualquer salto brusco.
      audioAnalyzeRef.current = audioAnalyzeRef.current * 0.85 + simValue * 0.15;
    } else {
      // Desliga de forma preguiçosa e suave
      audioAnalyzeRef.current = audioAnalyzeRef.current * 0.9;
      if (audioAnalyzeRef.current < 0.001) audioAnalyzeRef.current = 0;
    }
  });

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
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

    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const baseX = (i - cols / 2) * spacing;
        const baseY = (j - rows / 2) * spacing;
        
        if (Math.sqrt(baseX**2 + baseY**2) > 380) continue;

        const progress = i / cols;
        const colorIndex = Math.min(Math.floor(progress * colors.length), colors.length - 1);
        const angle = Math.atan2(baseY, baseX) * (180 / Math.PI);

        generatedDots.push({
          id: `${i}-${j}`,
          baseX: baseX + (Math.random() - 0.5) * 5,
          baseY: baseY + (Math.random() - 0.5) * 5,
          color: colors[colorIndex],
          angle: angle
        });
      }
    }
    return generatedDots;
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-screen bg-slate-950 p-4 gap-8 overflow-hidden">
      
      {/* --- CONTÊINER CIRCULAR --- */}
      <motion.div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{
            borderColor: isPlaying ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'
        }}
        className="relative flex items-center justify-center w-full max-w-[700px] aspect-square bg-slate-900 rounded-full overflow-hidden border-2 transition-colors duration-1000 shadow-[0_0_60px_-15px_rgba(0,0,0,0.7)]"
      >
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
        
        <div className="absolute inset-0 rounded-full pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
      </motion.div>

      {/* --- BOTÃO DE CONTROLE --- */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="z-20 flex items-center gap-3 px-8 py-4 bg-white text-slate-950 rounded-full font-semibold text-lg shadow-lg hover:bg-slate-200 transition-all active:scale-95 group"
      >
        {isPlaying ? (
          <>
            <Square className="w-5 h-5 fill-slate-950" />
            Parar Simulação
          </>
        ) : (
          <>
            <Play className="w-6 h-6 fill-slate-950" />
            Simular Áudio (Fala Calma)
          </>
        )}
        
        {isPlaying && (
            <span className="flex gap-1 items-center h-4">
                {/* Barrinhas do botão agora são mais lentas para combinar */}
                <span className="w-1 h-3 bg-slate-950 animate-[pulse_1.5s_ease-in-out_infinite] [animation-delay:-0.5s]"></span>
                <span className="w-1 h-4 bg-slate-950 animate-[pulse_1.5s_ease-in-out_infinite] [animation-delay:-0.2s]"></span>
                <span className="w-1 h-3 bg-slate-950 animate-[pulse_1.5s_ease-in-out_infinite]"></span>
            </span>
        )}
      </button>

      <div className="absolute bottom-4 right-6 pointer-events-none opacity-10">
        <h1 className="text-4xl font-light tracking-widest text-white center">
            AI <span className="font-bold">VOICE</span>
        </h1>
      </div>
    </div>
  );
};

export default AntigravityWave;