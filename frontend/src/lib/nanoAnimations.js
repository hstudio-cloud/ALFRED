/**
 * nanoAnimations.js
 * Biblioteca centralizada de animações cinematográficas para o Nano IA
 * Mantém identidade visual (vermelho/preto) com efeitos premium
 */

// ============================================
// PALETA DE CORES (NUNCA MUDA)
// ============================================
export const NANO_COLORS = {
  red: '#ef4444',
  redDark: '#dc2626',
  redLight: '#ff6b6b',
  redGlow: 'rgba(239, 68, 68, 0.5)',
  redGlowBright: 'rgba(239, 68, 68, 0.8)',
  black: '#000000',
  blackDark: '#090203',
  blackMedium: '#1a1a1a',
  gray: '#374151',
  grayLight: '#9ca3af',
  gold: '#fbbf24',
};

// ============================================
// TIMING E EASING (CURVAS PREMIUM)
// ============================================
export const TIMING = {
  // Durações padrão
  MICRO: 150,
  FAST: 250,
  NORMAL: 400,
  SLOW: 800,
  CINEMATIC: 1200,
  
  // Curvas de Bézier premium
  EASE_STANDARD: 'cubic-bezier(0.4, 0, 0.2, 1)',
  EASE_NATURAL: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  EASE_NEURAL: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  EASE_SMOOTH: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  EASE_BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

// ============================================
// CONFIGURAÇÕES DE ESTADOS DA IA
// ============================================
export const AI_STATES = {
  IDLE: {
    key: 'idle',
    name: 'Ocioso',
    nodeCount: 52,
    radius: 116,
    drift: 0.18,
    pulse: 0.2,
    alpha: 0.34,
    lineDistance: 94,
    coreScale: 0.76,
    coreOpacity: 0.34,
    glowOpacity: 0.3,
    particleSpeed: 0.3,
    description: 'Pronto para ouvir',
  },
  
  LISTENING: {
    key: 'listening',
    name: 'Ouvindo',
    nodeCount: 68,
    radius: 132,
    drift: 0.32,
    pulse: 0.42,
    alpha: 0.56,
    lineDistance: 108,
    coreScale: 0.88,
    coreOpacity: 0.58,
    glowOpacity: 0.5,
    particleSpeed: 0.6,
    description: 'Capturando áudio...',
    waveAmplitude: 0.4,
  },
  
  THINKING: {
    key: 'thinking',
    name: 'Pensando',
    nodeCount: 84,
    radius: 156,
    drift: 0.38,
    pulse: 0.58,
    alpha: 0.76,
    lineDistance: 124,
    coreScale: 1,
    coreOpacity: 0.92,
    glowOpacity: 0.7,
    particleSpeed: 0.8,
    description: 'Processando...',
    networkActive: true,
  },
  
  EXECUTING: {
    key: 'executing',
    name: 'Executando',
    nodeCount: 96,
    radius: 174,
    drift: 0.46,
    pulse: 0.72,
    alpha: 0.88,
    lineDistance: 136,
    coreScale: 1.08,
    coreOpacity: 0.98,
    glowOpacity: 0.85,
    particleSpeed: 1,
    description: 'Executando ações...',
    networkActive: true,
    progressVisible: true,
  },
  
  SPEAKING: {
    key: 'speaking',
    name: 'Falando',
    nodeCount: 88,
    radius: 162,
    drift: 0.52,
    pulse: 0.94,
    alpha: 0.92,
    lineDistance: 132,
    coreScale: 1.02,
    coreOpacity: 1,
    glowOpacity: 0.95,
    particleSpeed: 0.95,
    description: 'Respondendo...',
    networkActive: true,
    rhythmSync: true,
  },
};

// ============================================
// VARIANTES DE ANIMAÇÃO FRAMER-MOTION
// ============================================
export const ANIMATION_VARIANTS = {
  // Entrada de mensagens no chat
  messageEntry: {
    initial: { opacity: 0, y: 8, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.95 },
    transition: { duration: 0.3, ease: TIMING.EASE_NATURAL },
  },

  // Fade suave
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4 },
  },

  fadeOut: {
    animate: { opacity: 0 },
    transition: { duration: 0.4 },
  },

  // Slide up (entrada de modais/panels)
  slideUpIn: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: TIMING.EASE_NATURAL },
  },

  slideDownOut: {
    animate: { opacity: 0, y: 16 },
    transition: { duration: 0.3 },
  },

  // Scale em (cards, buttons)
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3, ease: TIMING.EASE_BOUNCE },
  },

  // Glow pulse (efeito de holofote)
  glowPulse: {
    animate: {
      boxShadow: [
        `0 0 20px ${NANO_COLORS.redGlow}`,
        `0 0 40px ${NANO_COLORS.redGlowBright}`,
        `0 0 20px ${NANO_COLORS.redGlow}`,
      ],
    },
    transition: { duration: 2, repeat: Infinity },
  },

  // Respiração (idle state)
  breathing: {
    animate: { opacity: [0.3, 0.6, 0.3] },
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },

  // Onda suave
  wave: {
    animate: { y: [0, -6, 0] },
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },

  // Action item completo
  actionComplete: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.25, ease: TIMING.EASE_BOUNCE },
  },

  // Blur de fundo (contexto focado)
  backgroundBlur: {
    animate: { backdropFilter: ['blur(0px)', 'blur(4px)'] },
    transition: { duration: 0.3 },
  },

  // Shimmer (carregamento)
  shimmer: {
    animate: {
      backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'],
    },
    transition: { duration: 2, repeat: Infinity },
  },

  // Glow de rede neural
  neuralNetwork: {
    animate: {
      opacity: [0.4, 0.8, 0.4],
      scale: [1, 1.02, 1],
    },
    transition: { duration: 2, repeat: Infinity },
  },

  // Pulsação rítmica (fala)
  rhythmPulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.8, 1, 0.8],
    },
    transition: { duration: 0.8, repeat: Infinity },
  },

  // Micro movimento de partículas
  particleFloat: (delay) => ({
    animate: {
      y: [0, -12, 0],
      x: [0, Math.random() * 6 - 3, 0],
    },
    transition: {
      duration: 3 + Math.random() * 2,
      delay,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  }),

  // Hover elegante (cards)
  cardHover: {
    whileHover: {
      scale: 1.02,
      boxShadow: `0 20px 40px ${NANO_COLORS.redGlow}`,
    },
    transition: { duration: 0.3, ease: TIMING.EASE_SMOOTH },
  },

  // Rotação suave (loading spinner)
  spin: {
    animate: { rotate: 360 },
    transition: { duration: 2, repeat: Infinity, linear: true },
  },
};

// ============================================
// FUNÇÕES UTILITÁRIAS DE ANIMAÇÃO
// ============================================

/**
 * Cria delay em cascata para elementos sequenciais
 * @param {number} index - Índice do elemento
 * @param {number} baseDelay - Delay base em ms
 * @returns {number} Delay em segundos
 */
export const staggerDelay = (index, baseDelay = 50) => {
  return (index * baseDelay) / 1000;
};

/**
 * Gera efeito de glow adaptado ao estado
 * @param {string} state - Estado da IA (idle, listening, thinking, etc)
 * @returns {string} CSS box-shadow
 */
export const getGlowEffect = (state) => {
  const stateConfig = AI_STATES[state] || AI_STATES.IDLE;
  const opacity = stateConfig.glowOpacity || 0.3;
  
  return `0 0 ${20 + stateConfig.nodeCount / 5}px rgba(239, 68, 68, ${opacity}),
          inset 0 0 20px rgba(239, 68, 68, ${opacity * 0.3})`;
};

/**
 * Calcula movimento de partículas baseado em tempo
 * @param {number} time - Tempo decorrido em ms
 * @param {number} speed - Velocidade da partícula
 * @returns {object} Posição x, y
 */
export const calculateParticlePosition = (time, speed = 0.5) => {
  const angle = (time * speed * 0.001) % (Math.PI * 2);
  return {
    x: Math.cos(angle) * 20,
    y: Math.sin(angle) * 20,
  };
};

/**
 * Gera cor de glow adaptativa
 * @param {number} intensity - Intensidade (0-1)
 * @returns {string} Cor RGBA
 */
export const getAdaptiveGlow = (intensity = 0.5) => {
  const opacity = 0.3 + intensity * 0.7;
  return `rgba(239, 68, 68, ${opacity})`;
};

/**
 * Cria skeleton de carregamento estilizado
 * @param {number} lines - Número de linhas
 * @returns {object} Classe Tailwind aplicável
 */
export const getSkeletonClass = () => {
  return 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 animate-pulse rounded-lg';
};

/**
 * Retorna classe de transição premium
 * @param {string} type - Tipo de transição (fast, normal, slow)
 * @returns {string} Classe CSS
 */
export const getTransitionClass = (type = 'normal') => {
  const timings = {
    fast: 'transition-all duration-250',
    normal: 'transition-all duration-400',
    slow: 'transition-all duration-800',
  };
  return timings[type] || timings.normal;
};

// ============================================
// KEYFRAMES CSS CUSTOMIZADAS
// ============================================
export const CSS_KEYFRAMES = `
  @keyframes nano-glow-pulse {
    0%, 100% {
      box-shadow: 0 0 20px rgba(239, 68, 68, 0.3),
                  inset 0 0 20px rgba(239, 68, 68, 0.1);
    }
    50% {
      box-shadow: 0 0 40px rgba(239, 68, 68, 0.8),
                  inset 0 0 30px rgba(239, 68, 68, 0.3);
    }
  }

  @keyframes nano-breathing {
    0%, 100% {
      opacity: 0.4;
    }
    50% {
      opacity: 0.9;
    }
  }

  @keyframes nano-network-pulse {
    0%, 100% {
      opacity: 0.4;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.02);
    }
  }

  @keyframes nano-wave {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-6px);
    }
  }

  @keyframes nano-shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  @keyframes nano-float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-8px);
    }
  }

  @keyframes nano-glow-ring {
    0%, 100% {
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.2),
                  0 0 30px rgba(239, 68, 68, 0),
                  0 0 50px rgba(239, 68, 68, 0);
    }
    50% {
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.5),
                  0 0 30px rgba(239, 68, 68, 0.3),
                  0 0 50px rgba(239, 68, 68, 0.1);
    }
  }

  @keyframes nano-text-shimmer {
    0% {
      background-position: 0% 50%;
    }
    100% {
      background-position: 100% 50%;
    }
  }
`;

export default {
  NANO_COLORS,
  TIMING,
  AI_STATES,
  ANIMATION_VARIANTS,
  staggerDelay,
  getGlowEffect,
  calculateParticlePosition,
  getAdaptiveGlow,
  getSkeletonClass,
  getTransitionClass,
  CSS_KEYFRAMES,
};
