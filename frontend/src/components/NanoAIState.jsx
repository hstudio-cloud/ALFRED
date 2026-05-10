/**
 * NanoAIState.jsx
 * Componente que visualiza o estado atual da IA Nano
 * Mostra: orb respirando, glow pulsando, estado atual
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  NANO_COLORS,
  ANIMATION_VARIANTS,
  getGlowEffect,
  AI_STATES,
  TIMING,
} from '../lib/nanoAnimations';

const NanoAIState = ({ state = 'idle', size = 240, interactive = true }) => {
  const stateConfig = AI_STATES[state.toUpperCase()] || AI_STATES.IDLE;
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  // Renderiza canvas de partículas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    const center = size / 2;
    let animationTime = 0;

    const drawParticles = () => {
      // Clear com fade trail
      ctx.fillStyle = 'rgba(9, 2, 3, 0.1)';
      ctx.fillRect(0, 0, size, size);

      // Configurações por estado
      const nodeCount = stateConfig.nodeCount;
      const radius = stateConfig.radius;
      const lineDistance = stateConfig.lineDistance;

      // Array de partículas (posicionadas em círculo)
      const particles = Array.from({ length: nodeCount }, (_, i) => {
        const angle = (Math.PI * 2 * i) / nodeCount;
        const drift = Math.sin(animationTime * 0.001 * stateConfig.drift) * 10;
        const x = center + (radius + drift) * Math.cos(angle);
        const y = center + (radius + drift) * Math.sin(angle);
        return { x, y, angle, index: i };
      });

      // Desenha linhas conectando partículas
      const lineAlpha = stateConfig.alpha || 0.3;
      ctx.strokeStyle = `rgba(239, 68, 68, ${lineAlpha * 0.4})`;
      ctx.lineWidth = 1;

      particles.forEach((p1, idx) => {
        const nextIdx = (idx + 1) % particles.length;
        const p2 = particles[nextIdx];

        const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (distance < lineDistance) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });

      // Desenha partículas
      particles.forEach((p) => {
        const pulse = Math.sin(animationTime * 0.003 * stateConfig.pulse) * 1.5 + 2;
        const alpha = Math.max(0.3, Math.sin(animationTime * 0.002) * 0.5 + 0.7);

        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
        ctx.fill();

        // Glow de partícula
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulse + 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Núcleo central (orb)
      const corePulse = Math.sin(animationTime * 0.004 * stateConfig.pulse) * 6 + 12;
      const coreOpacity = stateConfig.coreOpacity;

      // Glow do núcleo (múltiplas camadas)
      for (let i = 3; i > 0; i--) {
        ctx.fillStyle = `rgba(239, 68, 68, ${(coreOpacity * 0.2) / i})`;
        ctx.beginPath();
        ctx.arc(center, center, corePulse + i * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Núcleo sólido
      ctx.fillStyle = `rgba(239, 68, 68, ${coreOpacity})`;
      ctx.beginPath();
      ctx.arc(center, center, corePulse, 0, Math.PI * 2);
      ctx.fill();

      animationTime += 16;
      frameRef.current = requestAnimationFrame(drawParticles);
    };

    frameRef.current = requestAnimationFrame(drawParticles);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [state, size, stateConfig]);

  // Variante de animação baseada no estado
  const getOrbVariant = () => {
    switch (state) {
      case 'listening':
        return {
          animate: {
            scale: [1, 1.05, 1],
            opacity: [0.8, 1, 0.8],
          },
          transition: {
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };

      case 'thinking':
        return {
          animate: {
            scale: [1, 1.03, 1],
            opacity: [0.9, 1, 0.9],
          },
          transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };

      case 'executing':
        return {
          animate: {
            scale: [1, 1.08, 1],
            opacity: [0.9, 1, 0.9],
          },
          transition: {
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };

      case 'speaking':
        return {
          animate: {
            scale: [1, 1.06, 0.98, 1],
            opacity: [0.95, 1, 0.95, 1],
          },
          transition: {
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };

      default: // idle
        return {
          animate: {
            opacity: [0.6, 0.85, 0.6],
          },
          transition: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        };
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-4"
      {...getOrbVariant()}
    >
      {/* Canvas de partículas */}
      <motion.div
        className="relative rounded-full"
        style={{
          boxShadow: getGlowEffect(state),
          width: size,
          height: size,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <canvas
          ref={canvasRef}
          className="rounded-full"
          style={{
            width: '100%',
            height: '100%',
            filter: state === 'speaking' ? 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.6))' : 'none',
          }}
        />
      </motion.div>

      {/* Status text */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h3 className="text-xl font-semibold text-white">{stateConfig.name}</h3>
        <p className="mt-1 text-sm text-gray-400">{stateConfig.description}</p>
      </motion.div>

      {/* State indicator badge */}
      <motion.div
        className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1"
        animate={{ borderColor: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.8)', 'rgba(239, 68, 68, 0.3)'] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: NANO_COLORS.red,
            boxShadow: `0 0 10px ${NANO_COLORS.redGlow}`,
          }}
        />
        <span className="text-xs font-medium text-red-200">{stateConfig.key.toUpperCase()}</span>
      </motion.div>
    </motion.div>
  );
};

export default NanoAIState;
