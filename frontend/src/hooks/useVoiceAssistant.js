import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { createVoiceProvider } from '../services/voiceProvider';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useVoiceAssistant = ({ wakeWord = 'nano', onAfterMessage } = {}) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [lastVoiceCommand, setLastVoiceCommand] = useState('');
  const [lastAssistantReply, setLastAssistantReply] = useState('');
  const [isAwaitingVoiceCommand, setIsAwaitingVoiceCommand] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceState, setVoiceState] = useState('idle');
  const [voiceStatus, setVoiceStatus] = useState('Ative a voz para conversar com o Nano.');
  const [voiceProviderType, setVoiceProviderType] = useState('browser-fallback');
  const [assistantRuntime, setAssistantRuntime] = useState({
    runtimeMode: 'browser_fallback',
    llmProvider: 'rule_based',
    llmModel: 'nano_rules',
    voiceProvider: 'browser_fallback',
    transcriptionAvailable: false,
    premiumAvailable: false
  });
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isWakeArmed, setIsWakeArmed] = useState(false);
  const [inputLevel, setInputLevel] = useState(0.08);
  const [currentLevel, setCurrentLevel] = useState(0.08);
  const [error, setError] = useState(null);

  const providerRef = useRef(null);
  const recognizerRef = useRef(null);
  const backendCaptureRef = useRef(null);
  const backendCaptureStarterRef = useRef(null);
  const transcriptProcessorRef = useRef(null);
  const preferBackendTranscriptionRef = useRef(false);
  const awaitingCommandRef = useRef(false);
  const keepListeningRef = useRef(false);
  const pausedForAssistantRef = useRef(false);
  const transcriptClearTimerRef = useRef(null);
  const lastInputLevelRef = useRef(0.08);
  const lastInputLevelPushRef = useRef(0);

  const updateVoiceState = useCallback((nextState, nextStatus) => {
    setVoiceState(nextState);
    if (nextStatus) setVoiceStatus(nextStatus);
  }, []);

  const scheduleTranscriptCleanup = useCallback((delayMs = 4200) => {
    if (transcriptClearTimerRef.current) {
      clearTimeout(transcriptClearTimerRef.current);
    }
    transcriptClearTimerRef.current = setTimeout(() => {
      setPartialTranscript('');
      setFinalTranscript('');
    }, delayMs);
  }, []);

  const looksLikeWakeWord = useCallback((text) => {
    const lowered = (text || '').toLowerCase().trim();
    if (!lowered) return false;
    return /\b(nano|nanno|nanu|na no)\b/.test(lowered);
  }, []);

  const looksLikeDirectFinancialCommand = useCallback((text) => {
    const lowered = (text || '').toLowerCase().trim();
    if (!lowered) return false;
    const commandHints = [
      'criar despesa',
      'crie uma despesa',
      'despesa',
      'gasto',
      'gastei',
      'paguei',
      'comprei',
      'registrar pix',
      'pix',
      'boleto',
      'conta',
      'fatura',
      'vencimento',
      'lembrete',
      'lembrar',
      'receita',
      'recebi',
      'ganhei',
      'fluxo de caixa',
      'analisar gastos',
      'gastos do mes',
      'mostrar gastos',
      'categoria',
      'combustivel',
      'alimentacao',
      'fornecedor',
      'empresa',
      'pessoal'
    ];
    return commandHints.some((hint) => lowered.includes(hint));
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API}/chat/history`);
        if (mounted) {
          setChatHistory(response.data || []);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError);
          updateVoiceState('error', 'Nao consegui carregar o historico do Nano.');
        }
      }
    };

    fetchHistory();

    return () => {
      mounted = false;
      if (transcriptClearTimerRef.current) {
        clearTimeout(transcriptClearTimerRef.current);
      }
    };
  }, [updateVoiceState]);

  const pauseRecognitionForAssistant = useCallback(() => {
    if (!keepListeningRef.current) return;
    pausedForAssistantRef.current = true;
    if (backendCaptureRef.current) {
      providerRef.current?.stopBackendCapture?.();
    }
    try {
      recognizerRef.current.stop?.();
    } catch (pauseError) {
      void pauseError;
    }
  }, []);

  const resumeRecognitionAfterAssistant = useCallback(() => {
    if (!keepListeningRef.current) return;
    pausedForAssistantRef.current = false;
    if (preferBackendTranscriptionRef.current || !providerRef.current?.isRecognitionSupported?.()) {
      backendCaptureStarterRef.current?.();
      return;
    }
    try {
      recognizerRef.current.start?.();
    } catch (resumeError) {
      void resumeError;
    }
  }, []);

  useEffect(() => {
    const provider = createVoiceProvider({
      apiBase: API,
      mode: process.env.REACT_APP_VOICE_PROVIDER === 'realtime' ? 'realtime' : 'browser-fallback'
    });
    providerRef.current = provider;
    setVoiceSupported(
      provider.isRecognitionSupported() || provider.supportsBackendTranscription?.()
    );

    provider.getVoiceStatus?.()
      .then((status) => {
        setVoiceProviderType(status?.provider || provider.type);
        preferBackendTranscriptionRef.current = Boolean(status?.transcription_available);
        setAssistantRuntime({
          runtimeMode: status?.runtime_mode || 'browser_fallback',
          llmProvider: status?.llm_provider || 'rule_based',
          llmModel: status?.llm_model || 'nano_rules',
          voiceProvider: status?.voice_provider || status?.provider || provider.type,
          transcriptionAvailable: Boolean(status?.transcription_available),
          premiumAvailable: Boolean(status?.premium_available)
        });
      })
      .catch(() => {
        setVoiceProviderType(provider.type);
        preferBackendTranscriptionRef.current = false;
        setAssistantRuntime({
          runtimeMode: 'browser_fallback',
          llmProvider: 'rule_based',
          llmModel: 'nano_rules',
          voiceProvider: provider.type,
          transcriptionAvailable: false,
          premiumAvailable: false
        });
      });

    return () => {
      recognizerRef.current?.destroy?.();
      provider.cancelBackendCapture?.();
      provider.stopSpeaking?.();
    };
  }, []);

  useEffect(() => {
    if (!providerRef.current || !providerRef.current.isRecognitionSupported()) return undefined;

    const recognizer = providerRef.current.createRecognizer({
      onStart: () => {
        setError(null);
        setIsListening(true);
      },
      onPartialTranscript: (transcript) => {
        setPartialTranscript(transcript);
      },
      onFinalTranscript: async (transcript) => {
        await transcriptProcessorRef.current?.(transcript);
      },
      onError: (event) => {
        if (event?.error === 'no-speech') {
          setError(null);
          updateVoiceState(isWakeArmed ? 'listening' : 'idle', `Diga ${wakeWord} para comecar.`);
          return;
        }

        if (event?.error === 'not-allowed') {
          keepListeningRef.current = false;
          setIsWakeArmed(false);
          setIsListening(false);
          setError(event);
          updateVoiceState('error', 'Permissao do microfone negada. Libere o acesso para usar a voz.');
          return;
        }

        if (providerRef.current?.supportsBackendTranscription?.()) {
          preferBackendTranscriptionRef.current = true;
          setError(null);
          updateVoiceState('listening', 'SpeechRecognition falhou. Vou continuar com transcricao pelo Nano.');
          backendCaptureStarterRef.current?.();
          return;
        }

        setError(event);
        updateVoiceState('error', 'A experiencia de voz encontrou uma instabilidade.');
      },
      onEnd: () => {
        setIsListening(false);
        if (keepListeningRef.current && !pausedForAssistantRef.current) {
          if (preferBackendTranscriptionRef.current) {
            backendCaptureStarterRef.current?.();
          } else {
            try {
              recognizer.start();
            } catch (startError) {
              setError(startError);
            }
          }
        }
      }
    });

    recognizerRef.current = recognizer;

    return () => {
      recognizer?.destroy?.();
    };
  }, [isWakeArmed, updateVoiceState, wakeWord]);

  useEffect(() => {
    if (voiceState === 'speaking') {
      setCurrentLevel(0.82);
      return;
    }
    if (voiceState === 'processing') {
      setCurrentLevel(0.54);
      return;
    }
    if (voiceState === 'listening') {
      setCurrentLevel(partialTranscript ? 0.66 : Math.max(0.24, inputLevel));
      return;
    }
    if (voiceState === 'error') {
      setCurrentLevel(0.18);
      return;
    }
    setCurrentLevel(0.08);
  }, [inputLevel, partialTranscript, voiceState]);

  const interruptSpeaking = useCallback(() => {
    providerRef.current?.stopSpeaking?.();
    setIsSpeaking(false);
    resumeRecognitionAfterAssistant();
    updateVoiceState(
      isWakeArmed ? 'listening' : 'idle',
      isWakeArmed
        ? `Resposta interrompida. Diga ${wakeWord} quando quiser continuar.`
        : 'Fala interrompida. Voce pode continuar.'
    );
  }, [isWakeArmed, resumeRecognitionAfterAssistant, updateVoiceState, wakeWord]);

  const handleRealtimeTurn = useCallback(async (content, options = {}) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsProcessing(true);
    updateVoiceState(
      'processing',
      options.source === 'voice'
        ? 'Entendi. Estou organizando isso agora.'
        : 'Processando seu pedido financeiro...'
    );

    if (options.source === 'voice') {
      setLastVoiceCommand(trimmed);
    } else {
      const optimisticUserMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString()
      };

      setChatHistory((prev) => [...prev, optimisticUserMessage]);
    }

    try {
      const response = await axios.post(`${API}/chat/message`, { content: trimmed });
      const assistantMessage = response.data.message;

      setChatHistory((prev) => [...prev, assistantMessage]);
      setLastAssistantReply(assistantMessage?.content || '');
      setError(null);
      scheduleTranscriptCleanup();

      if (onAfterMessage) {
        onAfterMessage();
      }

      if (options.source === 'voice' || isWakeArmed) {
        updateVoiceState('speaking', 'Nano esta respondendo por voz.');
        pauseRecognitionForAssistant();
        await providerRef.current?.speak?.(assistantMessage.content, {
          preferPremium: true,
          onStart: () => {
            setError(null);
            setIsSpeaking(true);
          },
          onEnd: (type) => {
            setIsSpeaking(false);
            setError(null);
            resumeRecognitionAfterAssistant();
            updateVoiceState(
              isWakeArmed ? 'listening' : 'idle',
              type === 'openai'
                ? `Concluido. Diga ${wakeWord} quando quiser o proximo comando.`
                : `Concluido em voz local. Diga ${wakeWord} quando quiser continuar.`
            );
          },
          onError: () => {
            setIsSpeaking(false);
            resumeRecognitionAfterAssistant();
            updateVoiceState(
              isWakeArmed ? 'listening' : 'error',
              isWakeArmed
                ? `Nao consegui falar a resposta. Diga ${wakeWord} novamente ou continue pelo texto.`
                : 'Nao consegui sintetizar a resposta do Nano. Voce pode continuar pelo texto.'
            );
          }
        });
      } else {
        updateVoiceState('idle', 'Mensagem concluida. Voce pode enviar outra agora.');
      }
    } catch (requestError) {
      setError(requestError);
      setChatHistory((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'Nao consegui concluir esse pedido agora. Tente novamente ou reformule o comando.',
          created_at: new Date().toISOString()
        }
      ]);
      updateVoiceState('error', 'Nao consegui enviar sua mensagem ao Nano.');
      throw requestError;
    } finally {
      setIsProcessing(false);
    }
  }, [isWakeArmed, onAfterMessage, pauseRecognitionForAssistant, resumeRecognitionAfterAssistant, scheduleTranscriptCleanup, updateVoiceState, wakeWord]);

  const processVoiceTranscript = useCallback(async (transcript) => {
    const cleanedTranscript = (transcript || '').trim();
    if (!cleanedTranscript) return;

    setFinalTranscript(cleanedTranscript);
    setPartialTranscript('');
    scheduleTranscriptCleanup();

    const lowered = cleanedTranscript.toLowerCase();
    const wakeRegex = new RegExp(`\\b(?:${wakeWord.toLowerCase()}|nanu|nanno|na no)\\b[\\s,:-]*(.*)`);
    const wakeMatch = lowered.match(wakeRegex);

    if (awaitingCommandRef.current) {
      awaitingCommandRef.current = false;
      setIsAwaitingVoiceCommand(false);
      updateVoiceState('processing', `Comando recebido: "${cleanedTranscript}"`);
      await handleRealtimeTurn(cleanedTranscript, { source: 'voice' });
      return;
    }

    if (!wakeMatch) {
      if (isWakeArmed && looksLikeDirectFinancialCommand(cleanedTranscript)) {
        updateVoiceState('processing', `Comando recebido: "${cleanedTranscript}"`);
        await handleRealtimeTurn(cleanedTranscript, { source: 'voice' });
        return;
      }

      updateVoiceState(
        isWakeArmed ? 'listening' : 'idle',
        isWakeArmed
          ? `Escuta continua ativa. Aguardando a palavra ${wakeWord}.`
          : `Diga ${wakeWord} para comecar.`
      );
      return;
    }

    const inlineCommand = (wakeMatch[1] || '').trim();

    if (inlineCommand) {
      updateVoiceState('processing', `Comando recebido: "${inlineCommand}"`);
      await handleRealtimeTurn(inlineCommand, { source: 'voice' });
      return;
    }

    awaitingCommandRef.current = true;
    setIsAwaitingVoiceCommand(true);
    updateVoiceState('listening', 'Em que posso ajudar, senhor? Estou ouvindo.');
    pauseRecognitionForAssistant();
    await providerRef.current?.speak?.('Em que posso ajudar, senhor?', {
      preferPremium: true,
      onStart: () => {
        setError(null);
        setIsSpeaking(true);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setError(null);
        updateVoiceState('listening', 'Pode falar. Estou aguardando seu pedido.');
        resumeRecognitionAfterAssistant();
      },
      onError: () => {
        setIsSpeaking(false);
        updateVoiceState('listening', 'Pode falar. Vou continuar com a voz local ou texto.');
        resumeRecognitionAfterAssistant();
      }
    });
  }, [handleRealtimeTurn, isWakeArmed, looksLikeDirectFinancialCommand, pauseRecognitionForAssistant, resumeRecognitionAfterAssistant, scheduleTranscriptCleanup, updateVoiceState, wakeWord]);

  useEffect(() => {
    transcriptProcessorRef.current = processVoiceTranscript;
  }, [processVoiceTranscript]);

  const startBackendCaptureSession = useCallback(async () => {
    if (!keepListeningRef.current || pausedForAssistantRef.current || backendCaptureRef.current || !providerRef.current?.supportsBackendTranscription?.()) {
      return;
    }

    try {
      backendCaptureRef.current = await providerRef.current.createBackendCaptureSession({
        onStart: () => {
          setError(null);
          setIsListening(true);
          updateVoiceState(
            'listening',
            awaitingCommandRef.current
              ? 'Pode falar. Estou aguardando seu pedido.'
              : `Escuta continua ativa. Diga ${wakeWord} para falar com o Nano.`
          );
        },
        onAudioLevel: (level) => {
          const normalizedLevel = Number.isFinite(level) ? Math.max(0, Math.min(1, level)) : 0.08;
          const now = Date.now();
          const levelDelta = Math.abs(normalizedLevel - lastInputLevelRef.current);
          if (levelDelta < 0.02 && now - lastInputLevelPushRef.current < 80) {
            return;
          }

          lastInputLevelRef.current = normalizedLevel;
          lastInputLevelPushRef.current = now;
          setInputLevel(normalizedLevel);
        },
        onFinalTranscript: async (transcript) => {
          await transcriptProcessorRef.current?.(transcript);
        },
        onError: (captureError) => {
          if (
            captureError?.error === 'no-speech'
            || captureError?.error === 'empty-transcript'
            || captureError?.error === 'empty-recording'
          ) {
            setError(null);
            updateVoiceState(
              isWakeArmed ? 'listening' : 'idle',
              isWakeArmed
                ? awaitingCommandRef.current
                  ? 'Nao captei a frase inteira. Pode repetir o pedido.'
                  : `Escuta continua ativa. Aguardando a palavra ${wakeWord}.`
                : `Diga ${wakeWord} para comecar.`
            );
            return;
          }
          setError(captureError);
          updateVoiceState('error', 'Nao consegui transcrever o audio no backend.');
        },
        onEnd: () => {
          backendCaptureRef.current = null;
          setIsListening(false);
          lastInputLevelRef.current = 0.08;
          lastInputLevelPushRef.current = Date.now();
          setInputLevel(0.08);
          if (keepListeningRef.current && !pausedForAssistantRef.current) {
            backendCaptureStarterRef.current?.();
          }
        }
      }, {
        locale: 'pt-BR'
      });
    } catch (captureError) {
      backendCaptureRef.current = null;
      setError(captureError);
      updateVoiceState('error', 'Nao consegui abrir a captura de audio para transcricao do Nano.');
    }
  }, [isWakeArmed, updateVoiceState, wakeWord]);

  useEffect(() => {
    backendCaptureStarterRef.current = startBackendCaptureSession;
  }, [startBackendCaptureSession]);

  const sendMessage = useCallback(async (content, options = {}) => {
    const outgoing = typeof content === 'string' ? content : message;
    const currentMessage = outgoing.trim();
    if (!currentMessage) return;
    setMessage('');
    await handleRealtimeTurn(currentMessage, options);
  }, [handleRealtimeTurn, message]);

  const startListening = useCallback(() => {
    if (!voiceSupported) {
      updateVoiceState('error', 'Reconhecimento de voz indisponivel neste navegador.');
      return;
    }

    setError(null);
    keepListeningRef.current = true;
    awaitingCommandRef.current = false;
    setIsAwaitingVoiceCommand(false);
    setIsWakeArmed(true);
    setPartialTranscript('');
    setFinalTranscript('');
    updateVoiceState('listening', `Escuta continua ativada. Diga ${wakeWord} quando quiser.`);

    if (!preferBackendTranscriptionRef.current && providerRef.current?.isRecognitionSupported?.() && recognizerRef.current) {
      try {
        recognizerRef.current.start();
        return;
      } catch (startError) {
        preferBackendTranscriptionRef.current = true;
        void startError;
      }
    }

    backendCaptureStarterRef.current?.();
  }, [updateVoiceState, voiceSupported, wakeWord]);

  const stopListening = useCallback(() => {
    keepListeningRef.current = false;
    awaitingCommandRef.current = false;
    setIsAwaitingVoiceCommand(false);
    setIsWakeArmed(false);
    setIsListening(false);
    setPartialTranscript('');
    setFinalTranscript('');
    setError(null);
    lastInputLevelRef.current = 0.08;
    lastInputLevelPushRef.current = Date.now();
    setInputLevel(0.08);

    try {
      recognizerRef.current?.stop?.();
    } catch (stopError) {
      void stopError;
    }

    providerRef.current?.cancelBackendCapture?.();
    backendCaptureRef.current = null;

    pausedForAssistantRef.current = false;
    updateVoiceState('idle', 'Escuta de voz desativada.');
  }, [updateVoiceState]);

  return {
    apiBase: API,
    chatHistory,
    message,
    setMessage,
    partialTranscript,
    finalTranscript,
    isListening,
    isProcessing,
    isSpeaking,
    currentLevel,
    voiceState,
    voiceStatus,
    voiceProviderType,
    assistantRuntime,
    voiceSupported,
    isWakeArmed,
    isAwaitingVoiceCommand,
    lastVoiceCommand,
    lastAssistantReply,
    error,
    startListening,
    stopListening,
    interruptSpeaking,
    sendMessage,
    handleRealtimeTurn
  };
};
