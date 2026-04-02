import React, { useMemo, useState, useRef } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';

const AIVoiceVisualizer = () => {
  const dotCount = 50;
  const radius = 90;
  const containerRef = useRef(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Configuração suave para o movimento
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Normaliza a posição do mouse em relação ao centro do componente
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const dots = useMemo(() => {
    return [...Array(dotCount)].map((_, i) => {
      const angle = (i / dotCount) * Math.PI * 2;
      return {
        baseX: Math.cos(angle) * radius,
        baseY: Math.sin(angle) * radius,
        id: i,
        randomFactor: 0.2 + Math.random() * 0.8
      };
    });
  }, [dotCount, radius]);

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex items-center justify-center w-80 h-80 cursor-none"
    >
      {/* Brilho de fundo interativo */}
      <motion.div
        style={{
          x: useTransform(smoothX, (v) => v * 0.2),
          y: useTransform(smoothY, (v) => v * 0.2),
        }}
        className="absolute w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl"
      />

      {/* Partículas Antigravity */}
      <div className="relative">
        {dots.map((dot) => {
          // Cálculo de deslocamento baseado na distância do mouse (Efeito Antigravidade)
          const dotX = useTransform([smoothX, smoothY], ([mx, my]) => {
            const dx = dot.baseX - mx;
            const dy = dot.baseY - my;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = Math.max(0, (150 - distance) / 150);
            return dot.baseX + (dx * force * 0.8 * dot.randomFactor);
          });

          const dotY = useTransform([smoothX, smoothY], ([mx, my]) => {
            const dx = dot.baseX - mx;
            const dy = dot.baseY - my;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = Math.max(0, (150 - distance) / 150);
            return dot.baseY + (dy * force * 0.8 * dot.randomFactor);
          });

          return (
            <motion.div
              key={dot.id}
              style={{ x: dotX, y: dotY }}
              className="absolute w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.9)]"
              animate={{
                opacity: [0.6, 1, 0.6],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          );
        })}
      </div>

      {/* Elementos Decorativos de UI */}
      <motion.div 
        style={{
          rotate: useTransform(smoothX, (v) => v * 0.05),
          x: useTransform(smoothX, (v) => v * 0.05),
          y: useTransform(smoothY, (v) => v * 0.05),
        }}
        className="absolute w-60 h-60 border border-cyan-500/10 rounded-full"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute w-64 h-64 border border-blue-500/5 rounded-full border-dashed"
      />
    </div>
  );
};

export default AIVoiceVisualizer;
