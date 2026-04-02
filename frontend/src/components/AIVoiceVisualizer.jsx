import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const AIVoiceVisualizer = ({ isSpeaking = false, intensity = 1 }) => {
  const dotCount = 40;
  const radius = 80;

  // Gera a posição inicial dos pontos em um círculo
  const dots = useMemo(() => {
    return [...Array(dotCount)].map((_, i) => {
      const angle = (i / dotCount) * Math.PI * 2;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        delay: Math.random() * 2,
      };
    });
  }, [dotCount, radius]);

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      {/* Brilho de fundo central */}
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.2, 1] : 1,
          opacity: isSpeaking ? [0.2, 0.4, 0.2] : 0.1,
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute w-32 h-32 bg-cyan-500 rounded-full blur-3xl"
      />

      {/* Anel de pontos */}
      <div className="relative">
        {dots.map((dot, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            initial={{ x: dot.x, y: dot.y }}
            animate={{
              x: isSpeaking 
                ? [dot.x, dot.x * (1 + Math.random() * 0.3 * intensity), dot.x] 
                : dot.x,
              y: isSpeaking 
                ? [dot.y, dot.y * (1 + Math.random() * 0.3 * intensity), dot.y] 
                : dot.y,
              scale: isSpeaking ? [1, 1.5, 1] : 1,
              opacity: isSpeaking ? [0.4, 1, 0.4] : 0.6,
            }}
            transition={{
              duration: isSpeaking ? 0.3 + Math.random() * 0.5 : 2,
              repeat: Infinity,
              delay: isSpeaking ? 0 : dot.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Círculos orbitais sutis */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute w-48 h-48 border border-cyan-500/20 rounded-full"
      />
      <motion.div 
        animate={{ rotate: -360 }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute w-52 h-52 border border-blue-500/10 rounded-full border-dashed"
      />
    </div>
  );
};

export default AIVoiceVisualizer;
