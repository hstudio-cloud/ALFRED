/**
 * NanoAIActions.jsx
 * Painel de ações executadas pela IA em tempo real
 * Mostra: ✔ cruzando transações, ✔ verificando saldo, etc
 */

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { TIMING, NANO_COLORS, staggerDelay } from '../lib/nanoAnimations';

const NanoAIActions = ({
  actions = [],
  isActive = false,
  progress = 0,
  size = 'normal',
}) => {
  const [displayActions, setDisplayActions] = useState([]);

  useEffect(() => {
    if (isActive && actions.length > 0) {
      // Simula completação progressiva de ações
      let currentIndex = 0;

      const interval = setInterval(() => {
        if (currentIndex < actions.length) {
          setDisplayActions((prev) => {
            const updated = [...prev];
            updated[currentIndex] = { ...actions[currentIndex], completed: true };
            return updated;
          });
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 400 + Math.random() * 300);

      return () => clearInterval(interval);
    } else {
      setDisplayActions(actions.map((a) => ({ ...a, completed: false })));
    }
  }, [actions, isActive]);

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    normal: 'text-sm px-3 py-2',
    large: 'text-base px-4 py-3',
  };

  const iconSize = {
    small: 'h-3 w-3',
    normal: 'h-4 w-4',
    large: 'h-5 w-5',
  };

  if (displayActions.length === 0) return null;

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {/* Barra de progresso (opcional) */}
      {progress > 0 && (
        <motion.div
          className="h-1 w-full overflow-hidden rounded-full bg-slate-700/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-red-500 via-red-400 to-red-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              boxShadow: `0 0 10px ${NANO_COLORS.redGlow}`,
            }}
          />
        </motion.div>
      )}

      {/* Lista de ações */}
      <div className="space-y-2">
        <AnimatePresence>
          {displayActions.map((action, idx) => (
            <motion.div
              key={action.id}
              className={`flex items-center gap-2 rounded-lg border border-slate-700/30 bg-gradient-to-r from-slate-900/40 to-slate-800/20 ${sizeClasses[size]} transition-all duration-300`}
              initial={{ opacity: 0, x: -10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{
                duration: 0.3,
                delay: staggerDelay(idx, 100),
                ease: 'easeOut',
              }}
              style={{
                borderColor: action.completed
                  ? 'rgba(239, 68, 68, 0.5)'
                  : 'rgba(55, 65, 81, 0.3)',
              }}
            >
              {/* Ícone status */}
              <div className="flex-shrink-0">
                <AnimatePresence mode="wait">
                  {action.completed ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckCircle2
                        className={`${iconSize[size]} text-red-400`}
                        style={{ filter: `drop-shadow(0 0 4px ${NANO_COLORS.redGlow})` }}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="loader"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, linear: true }}
                    >
                      <Loader2 className={`${iconSize[size]} text-slate-500`} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Label da ação */}
              <span className={`flex-1 font-medium ${action.completed ? 'text-red-300' : 'text-slate-300'}`}>
                {action.label || 'Processando...'}
              </span>

              {/* Efeito de glow no background quando completa */}
              {action.completed && (
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  initial={{ opacity: 0.3 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{
                    background: `radial-gradient(circle, ${NANO_COLORS.redGlow}, transparent)`,
                    pointerEvents: 'none',
                  }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Dica de contexto */}
      {isActive && displayActions.length > 0 && (
        <motion.div
          className="flex items-center gap-2 text-xs text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Sparkles className="h-3 w-3" />
          <span>
            {Math.round(progress)}% completo
            {progress < 100 && ' · processando...'}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default NanoAIActions;
