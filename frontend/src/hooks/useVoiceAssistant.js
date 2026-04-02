import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { createVoiceProvider } from '../services/voiceProvider';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const useVoiceAssistant = ({ wakeWord = 'alfred', onAfterMessage } = {}) => {
  const [chatHistory, setChatHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceState, setVoiceState] = useState('idle');
  const [voiceStatus, setVoiceStatus] = useState('Ative a voz para conversar com o Alfred.');
  const [voiceProviderType, setVoiceProviderType] = useState('browser-fallback');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isWakeArmed, setIsWakeArmed] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0.08);
  const [error, setError] = useState(null);

  const providerRef = useRef(null);
  const recognizerRef = useRef(null);
  const awaitingCommandRef = useRef(false);
  const keepListeningRef = useRef(false);
  const pausedForAssistantRef = useRef(false);

  const updateVoiceState = useCallback((nextState, nextStatus) => {
    setVoiceState(nextState);
    if (nextStatus) setVoiceStatus(nextStatus);
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
          updateVoiceState('error', 'Nao consegui carregar o historico do Alfred.');
        }
      }
    };

    fetchHistory();

    return () => {
      mounted = false;
    };
  }, [updateVoiceState]);

  const pauseRecognitionForAssistant = useCallback(() => {
    if (!recognizerRef.current || !keepListeningRef.current) return;
    pausedForAssistantRef.current = true;
    try {
      recognizerRef.current.stop?.();
    } catch (error) {
      // noop
    }
  }, []);

  const resumeRecognitionAfterAssistant = useCallback(() => {
    if (!recognizerRef.current || !keepListeningRef.current) return;
    pausedForAssistantRef.current = false;
    try {
      recognizerRef.current.start?.();
    } catch (error) {
      // noop
    }
  }, []);

  useEffect(() => {
    const provider = createVoiceProvider({
      apiBase: API,
      mode: process.env.REACT_APP_VOICE_PROVIDER === 'realtime' ? 'realtime' : 'browser-fallback'
    });
    providerRef.current = provider;
    setVoiceProviderType(provider.type);
    setVoiceSupported(provider.isRecognitionSupported());

    return () => {
      recognizerRef.current?.destroy?.();
      provider.stopSpeaking?.();
    };
  }, []);

  useEffect(() => {
    if (!providerRef.current || !voiceSupported) return undefined;

    const recognizer = providerRef.current.createRecognizer({
      onStart: () => {
        setIsListening(true);
      },
      onPartialTranscript: (transcript) => {
        setPartialTranscript(transcript);
      },
      onFinalTranscript: async (transcript) => {
        const cleanedTranscript = transcript.trim();
        if (!cleanedTranscript) return;

        setFinalTranscript(cleanedTranscript);
        setPartialTranscript('');

        const lowered = cleanedTranscript.toLowerCase();
        const wakeRegex = new RegExp(`\\b${wakeWord.toLowerCase()}\\b[\\s,:-]*(.*)`);
        const wakeMatch = lowered.match(wakeRegex);

        if (awaitingCommandRef.current) {
          awaitingCommandRef.current = false;
          updateVoiceState('processing', `Comando recebido: "${cleanedTranscript}"`);
          await handleRealtimeTurn(cleanedTranscript, { source: 'voice' });
          return;
        }

        if (!wakeMatch) {
          updateVoiceState('idle', `Diga ${wakeWord} para comecar.`);
          return;
        }

        const inlineCommand = (wakeMatch[1] || '').trim();

        if (inlineCommand) {
          updateVoiceState('processing', `Comando recebido: "${inlineCommand}"`);
          await handleRealtimeTurn(inlineCommand, { source: 'voice' });
          return;
        }

        awaitingCommandRef.current = true;
        updateVoiceState('listening', 'Em que posso ajudar, senhor? Estou ouvindo.');
        pauseRecognitionForAssistant();
        await providerRef.current.speak('Em que posso ajudar, senhor?', {
          preferPremium: true,
          onStart: () => setIsSpeaking(true),
          onEnd: () => {
            setIsSpeaking(false);
            updateVoiceState('listening', 'Pode falar. Estou aguardando seu pedido.');
            resumeRecognitionAfterAssistant();
          },
          onError: () => {
            setIsSpeaking(false);
            updateVoiceState('listening', 'Pode falar. Vou continuar com a voz local ou texto.');
            resumeRecognitionAfterAssistant();
          }
        });
      },
      onError: (event) => {
        if (event?.error === 'no-speech') {
          updateVoiceState(isWakeArmed ? 'listening' : 'idle', `Diga ${wakeWord} para comecar.`);
          return;
        }

        if (event?.error === 'not-allowed') {
          keepListeningRef.current = false;
          setIsWakeArmed(false);
          setIsListening(false);
          updateVoiceState('error', 'Permissao do microfone negada. Libere o acesso para usar a voz.');
          return;
        }

        setError(event);
        updateVoiceState('error', 'A experiencia de voz encontrou uma instabilidade.');
      },
      onEnd: () => {
        setIsListening(false);
        if (keepListeningRef.current && !pausedForAssistantRef.current) {
          try {
            recognizer.start();
          } catch (startError) {
            setError(startError);
          }
        }
      }
    });

    recognizerRef.current = recognizer;

    return () => {
      recognizer?.destroy?.();
    };
  }, [isWakeArmed, pauseRecognitionForAssistant, resumeRecognitionAfterAssistant, updateVoiceState, voiceSupported, wakeWord]);

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
      setCurrentLevel(partialTranscript ? 0.66 : 0.34);
      return;
    }
    if (voiceState === 'error') {
      setCurrentLevel(0.18);
      return;
    }
    setCurrentLevel(0.08);
  }, [partialTranscript, voiceState]);

  const interruptSpeaking = useCallback(() => {
    providerRef.current?.stopSpeaking?.();
    setIsSpeaking(false);
    resumeRecognitionAfterAssistant();
    updateVoiceState(isWakeArmed ? 'listening' : 'idle', 'Fala interrompida. Voce pode continuar.');
  }, [isWakeArmed, resumeRecognitionAfterAssistant, updateVoiceState]);

  const handleRealtimeTurn = useCallback(async (content, options = {}) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setIsProcessing(true);
    updateVoiceState('processing', 'Processando seu pedido financeiro...');

    const optimisticUserMessage = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString()
    };

    setChatHistory((prev) => [...prev, optimisticUserMessage]);

    try {
      const response = await axios.post(`${API}/chat/message`, { content: trimmed });
      const assistantMessage = response.data.message;

      setChatHistory((prev) => [...prev, assistantMessage]);
      setError(null);

      if (onAfterMessage) {
        onAfterMessage();
      }

      if (options.source === 'voice' || isWakeArmed) {
        updateVoiceState('speaking', 'Alfred esta respondendo por voz.');
        pauseRecognitionForAssistant();
        await providerRef.current?.speak?.(assistantMessage.content, {
          preferPremium: true,
          onStart: () => setIsSpeaking(true),
          onEnd: (type) => {
            setIsSpeaking(false);
            resumeRecognitionAfterAssistant();
            updateVoiceState(isWakeArmed ? 'listening' : 'idle', type === 'openai'
              ? `Resposta concluida. Diga ${wakeWord} para continuar.`
              : `Resposta concluida com voz local. Diga ${wakeWord} para continuar.`);
          },
          onError: () => {
            setIsSpeaking(false);
            resumeRecognitionAfterAssistant();
            updateVoiceState(isWakeArmed ? 'listening' : 'error', 'Nao consegui sintetizar a resposta do Alfred. Voce pode continuar pelo texto.');
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
      updateVoiceState('error', 'Nao consegui enviar sua mensagem ao Alfred.');
      throw requestError;
    } finally {
      setIsProcessing(false);
    }
  }, [isWakeArmed, onAfterMessage, pauseRecognitionForAssistant, resumeRecognitionAfterAssistant, updateVoiceState, wakeWord]);

  const sendMessage = useCallback(async (content, options = {}) => {
    const outgoing = typeof content === 'string' ? content : message;
    const currentMessage = outgoing.trim();
    if (!currentMessage) return;
    setMessage('');
    await handleRealtimeTurn(currentMessage, options);
  }, [handleRealtimeTurn, message]);

  const startListening = useCallback(() => {
    if (!voiceSupported || !recognizerRef.current) {
      updateVoiceState('error', 'Reconhecimento de voz indisponivel neste navegador.');
      return;
    }

    keepListeningRef.current = true;
    awaitingCommandRef.current = false;
    setIsWakeArmed(true);
    setPartialTranscript('');
    setFinalTranscript('');
    updateVoiceState('listening', `Diga ${wakeWord} para ativar o Alfred.`);

    try {
      recognizerRef.current.start();
    } catch (startError) {
      setError(startError);
      updateVoiceState('error', 'Nao consegui iniciar o microfone agora.');
    }
  }, [updateVoiceState, voiceSupported, wakeWord]);

  const stopListening = useCallback(() => {
    keepListeningRef.current = false;
    awaitingCommandRef.current = false;
    setIsWakeArmed(false);
    setIsListening(false);
    setPartialTranscript('');
    setFinalTranscript('');

    try {
      recognizerRef.current?.stop?.();
    } catch (error) {
      // noop
    }

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
    voiceSupported,
    isWakeArmed,
    error,
    startListening,
    stopListening,
    interruptSpeaking,
    sendMessage,
    handleRealtimeTurn
  };
};
