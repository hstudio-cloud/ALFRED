/**
 * useNanoState.js
 * Hook centralizado para gerenciar todos os estados da IA Nano
 * Estados: IDLE, LISTENING, THINKING, EXECUTING, SPEAKING
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AI_STATES } from '../lib/nanoAnimations';

export const useNanoState = () => {
  const [state, setState] = useState('idle');
  const [actions, setActions] = useState([]);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const stateTimerRef = useRef(null);
  const actionTimerRef = useRef(null);

  /**
   * Transiciona para um novo estado
   */
  const transitionTo = useCallback((newState, duration = null) => {
    if (AI_STATES[newState.toUpperCase()]) {
      setState(newState.toLowerCase());
      
      // Auto-transição para IDLE após duração se especificada
      if (duration) {
        if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
        stateTimerRef.current = setTimeout(() => {
          setState('idle');
        }, duration);
      }
    }
  }, []);

  /**
   * Inicia estado de ouvindo
   */
  const startListening = useCallback(() => {
    transitionTo('LISTENING');
    setAudioAmplitude(0.2);
  }, [transitionTo]);

  /**
   * Simula amplitude de áudio para visualizador
   */
  const updateAudioAmplitude = useCallback((amplitude) => {
    setAudioAmplitude(Math.max(0, Math.min(1, amplitude)));
  }, []);

  /**
   * Para de ouvir e vai para pensando
   */
  const stopListening = useCallback(() => {
    setAudioAmplitude(0);
    transitionTo('THINKING', 1500); // Pensa por 1.5s antes de voltar
  }, [transitionTo]);

  /**
   * Inicia estado de execução com ações
   */
  const startExecuting = useCallback((actionList = []) => {
    transitionTo('EXECUTING');
    setActions(actionList);
    setExecutionProgress(0);

    if (actionList.length > 0) {
      // Simula progresso das ações
      let completed = 0;
      if (actionTimerRef.current) clearInterval(actionTimerRef.current);
      
      actionTimerRef.current = setInterval(() => {
        completed++;
        const progress = Math.min((completed / actionList.length) * 100, 100);
        setExecutionProgress(progress);
        
        if (completed >= actionList.length) {
          clearInterval(actionTimerRef.current);
          // Auto-transição para IDLE após 2s
          setTimeout(() => {
            setState('idle');
            setActions([]);
            setExecutionProgress(0);
          }, 2000);
        }
      }, 300 + Math.random() * 400);
    }
  }, [transitionTo]);

  /**
   * Inicia estado de fala
   */
  const startSpeaking = useCallback((duration = 3000) => {
    transitionTo('SPEAKING', duration);
  }, [transitionTo]);

  /**
   * Volta ao estado idle
   */
  const reset = useCallback(() => {
    if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    if (actionTimerRef.current) clearInterval(actionTimerRef.current);
    setState('idle');
    setActions([]);
    setExecutionProgress(0);
    setAudioAmplitude(0);
  }, []);

  /**
   * Retorna configuração do estado atual
   */
  const currentStateConfig = AI_STATES[state.toUpperCase()] || AI_STATES.IDLE;

  /**
   * Retorna status legível do estado
   */
  const stateLabel = currentStateConfig.description || 'Pronto para ouvir';

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
      if (actionTimerRef.current) clearInterval(actionTimerRef.current);
    };
  }, []);

  return {
    // Estado atual
    state: state.toLowerCase(),
    stateConfig: currentStateConfig,
    stateLabel,
    
    // Dados de execução
    actions,
    executionProgress,
    audioAmplitude,
    
    // Métodos de transição
    transitionTo,
    startListening,
    updateAudioAmplitude,
    stopListening,
    startExecuting,
    startSpeaking,
    reset,
    
    // Helpers
    isIdle: state === 'idle',
    isListening: state === 'listening',
    isThinking: state === 'thinking',
    isExecuting: state === 'executing',
    isSpeaking: state === 'speaking',
  };
};

export default useNanoState;
