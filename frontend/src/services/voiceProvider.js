import axios from 'axios';
import voiceService from './voiceService';

const getRecognitionConstructor = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const getSupportedRecordingMimeType = () => {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return '';
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];

  return candidates.find((type) => window.MediaRecorder.isTypeSupported?.(type)) || '';
};

const filenameForMimeType = (mimeType) => {
  if (!mimeType) return 'nano-recording.webm';
  if (mimeType.includes('wav')) return 'nano-recording.wav';
  if (mimeType.includes('ogg')) return 'nano-recording.ogg';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'nano-recording.m4a';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'nano-recording.mp3';
  return 'nano-recording.webm';
};

const PT_BR_UNITS = [
  'zero',
  'um',
  'dois',
  'tres',
  'quatro',
  'cinco',
  'seis',
  'sete',
  'oito',
  'nove',
  'dez',
  'onze',
  'doze',
  'treze',
  'quatorze',
  'quinze',
  'dezesseis',
  'dezessete',
  'dezoito',
  'dezenove',
];

const PT_BR_TENS = [
  '',
  '',
  'vinte',
  'trinta',
  'quarenta',
  'cinquenta',
  'sessenta',
  'setenta',
  'oitenta',
  'noventa',
];

const PT_BR_HUNDREDS = [
  '',
  'cento',
  'duzentos',
  'trezentos',
  'quatrocentos',
  'quinhentos',
  'seiscentos',
  'setecentos',
  'oitocentos',
  'novecentos',
];

const joinWords = (parts) => parts.filter(Boolean).join(' e ');

const parseCurrencyNumber = (rawValue = '') => {
  const raw = String(rawValue || '')
    .replace(/[^\d.,-]/g, '')
    .trim();

  if (!raw) return null;

  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');
  let normalized = raw;

  if (lastDot >= 0 && lastComma >= 0) {
    normalized = lastDot > lastComma
      ? raw.replace(/,/g, '')
      : raw.replace(/\./g, '').replace(',', '.');
  } else if (lastComma >= 0) {
    const decimals = raw.length - lastComma - 1;
    normalized = decimals === 3
      ? raw.replace(/,/g, '')
      : raw.replace(/\./g, '').replace(',', '.');
  } else if (lastDot >= 0) {
    const dotCount = (raw.match(/\./g) || []).length;
    const decimals = raw.length - lastDot - 1;
    if (dotCount > 1) {
      const integerPart = raw.slice(0, lastDot).replace(/\./g, '');
      const decimalPart = raw.slice(lastDot + 1);
      normalized = `${integerPart}.${decimalPart}`;
    } else if (decimals === 3) {
      normalized = raw.replace(/\./g, '');
    }
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
};

const integerToPtBrWords = (value) => {
  const number = Math.trunc(Math.abs(value));
  if (number < 20) return PT_BR_UNITS[number];
  if (number < 100) {
    const tens = Math.trunc(number / 10);
    const unit = number % 10;
    return joinWords([PT_BR_TENS[tens], unit ? PT_BR_UNITS[unit] : '']);
  }
  if (number === 100) return 'cem';
  if (number < 1000) {
    const hundreds = Math.trunc(number / 100);
    const rest = number % 100;
    return joinWords([PT_BR_HUNDREDS[hundreds], rest ? integerToPtBrWords(rest) : '']);
  }
  if (number < 1000000) {
    const thousands = Math.trunc(number / 1000);
    const rest = number % 1000;
    const thousandLabel = thousands === 1 ? 'mil' : `${integerToPtBrWords(thousands)} mil`;
    if (!rest) return thousandLabel;
    const connector = rest < 100 || rest % 100 === 0 ? ' e ' : ' ';
    return `${thousandLabel}${connector}${integerToPtBrWords(rest)}`;
  }
  if (number < 1000000000) {
    const millions = Math.trunc(number / 1000000);
    const rest = number % 1000000;
    const millionLabel = millions === 1 ? 'um milhao' : `${integerToPtBrWords(millions)} milhoes`;
    if (!rest) return millionLabel;
    const connector = rest < 100 || rest % 100 === 0 ? ' e ' : ' ';
    return `${millionLabel}${connector}${integerToPtBrWords(rest)}`;
  }

  const billions = Math.trunc(number / 1000000000);
  const rest = number % 1000000000;
  const billionLabel = billions === 1 ? 'um bilhao' : `${integerToPtBrWords(billions)} bilhoes`;
  if (!rest) return billionLabel;
  const connector = rest < 100 || rest % 100 === 0 ? ' e ' : ' ';
  return `${billionLabel}${connector}${integerToPtBrWords(rest)}`;
};

const currencyToSpeech = (rawValue) => {
  const amount = parseCurrencyNumber(rawValue);
  if (amount === null) return rawValue;

  const integerPart = Math.trunc(amount);
  const cents = Math.round((amount - integerPart) * 100);
  const major = integerPart === 1
    ? 'um real'
    : `${integerToPtBrWords(integerPart)} reais`;

  if (!cents) return major;

  const centsLabel = cents === 1
    ? 'um centavo'
    : `${integerToPtBrWords(cents)} centavos`;
  return `${major} e ${centsLabel}`;
};

const sanitizeSpeechText = (text = '') => {
  let cleaned = String(text || '').trim();
  if (!cleaned) return '';

  cleaned = cleaned.replace(/R\$\s*([0-9][0-9.,]*)/gi, (_, rawAmount) => currencyToSpeech(rawAmount));
  cleaned = cleaned.replace(/^\s*[-*]\s*/gm, '');
  cleaned = cleaned.replace(/[*_`#>[\]]/g, '');

  const replacements = [
    [/\bNano IA\b/g, 'Nano I A'],
    [/\bIA\b/g, 'I A'],
    [/\bCPF\b/g, 'C P F'],
    [/\bCNPJ\b/g, 'C N P J'],
    [/\bPJ\b/g, 'P J'],
    [/\bPF\b/g, 'P F'],
    [/\bDRE\b/g, 'D R E'],
    [/\bPix\b/gi, 'piks'],
    [/\bworkspace\b/gi, 'espaco de trabalho'],
    [/\btransaction\b/gi, 'transacao'],
  ];

  replacements.forEach(([pattern, value]) => {
    cleaned = cleaned.replace(pattern, value);
  });

  // Ajustes de acentuacao para melhorar a pronuncia em pt-BR no TTS.
  // Mantemos o mapa pequeno e focado nas palavras mais frequentes no Nano.
  const accentFixes = [
    [/\bvoce\b/gi, 'você'],
    [/\bvoces\b/gi, 'vocês'],
    [/\bja\b/gi, 'já'],
    [/\bnao\b/gi, 'não'],
    [/\best[aá]\b/gi, 'está'],
    [/\bsera\b/gi, 'será'],
    [/\bpossivel\b/gi, 'possível'],
    [/\brelatorio\b/gi, 'relatório'],
    [/\brelatorios\b/gi, 'relatórios'],
    [/\bfinanceiro\b/gi, 'financeiro'],
    [/\bfinanceiros\b/gi, 'financeiros'],
    [/\btransacao\b/gi, 'transação'],
    [/\btransacoes\b/gi, 'transações'],
    [/\bmovimentacao\b/gi, 'movimentação'],
    [/\bmovimentacoes\b/gi, 'movimentações'],
    [/\bcategoria\b/gi, 'categoria'],
    [/\bcategorias\b/gi, 'categorias'],
    [/\blembrete\b/gi, 'lembrete'],
    [/\blembretes\b/gi, 'lembretes'],
    [/\bagenda\b/gi, 'agenda'],
    [/\bproximo\b/gi, 'próximo'],
    [/\bproximos\b/gi, 'próximos'],
    [/\bmes\b/gi, 'mês'],
    [/\bmeses\b/gi, 'meses'],
    [/\bcredito\b/gi, 'crédito'],
    [/\bdebito\b/gi, 'débito'],
    [/\bempresa\b/gi, 'empresa'],
    [/\bpessoal\b/gi, 'pessoal'],
    [/\banalise\b/gi, 'análise'],
    [/\banalises\b/gi, 'análises'],
    [/\batingiu\b/gi, 'atingiu'],
    [/\bhistorico\b/gi, 'histórico'],
    [/\bautomatico\b/gi, 'automático'],
    [/\bautomaticos\b/gi, 'automáticos'],
    [/\bautomaticamente\b/gi, 'automaticamente'],
    [/\bnumero\b/gi, 'número'],
    [/\bpercentual\b/gi, 'percentual'],
    [/\bjuros\b/gi, 'juros'],
    [/\bcartao\b/gi, 'cartão'],
    [/\bcartoes\b/gi, 'cartões'],
    [/\bfuncionario\b/gi, 'funcionário'],
    [/\bfuncionarios\b/gi, 'funcionários'],
    [/\bacao\b/gi, 'ação'],
    [/\bacoes\b/gi, 'ações'],
    [/\bconclui\b/gi, 'concluí'],
    [/\bconcluido\b/gi, 'concluído'],
    [/\bconteudo\b/gi, 'conteúdo'],
    [/\bexperiencia\b/gi, 'experiência'],
    [/\bnegocio\b/gi, 'negócio'],
    [/\bnegocios\b/gi, 'negócios'],
    [/\bprojecao\b/gi, 'projeção'],
    [/\bprojecoes\b/gi, 'projeções'],
  ];

  accentFixes.forEach(([pattern, value]) => {
    cleaned = cleaned.replace(pattern, value);
  });

  cleaned = cleaned
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, '. ')
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

  if (cleaned.length > 1000) {
    cleaned = `${cleaned.slice(0, 1000).replace(/\s+\S*$/, '')}.`;
  }

  return cleaned || 'Tudo certo.';
};

const buildBrowserVoiceProvider = ({ apiBase }) => {
  let recognition = null;
  let currentAudio = null;
  let currentUtterance = null;
  let backendCaptureSession = null;
  let premiumUnavailable = false;
  let backendSpeechAvailable = true;

  return {
    type: 'browser-fallback',

    isRecognitionSupported() {
      return Boolean(getRecognitionConstructor());
    },

    isMediaRecordingSupported() {
      return typeof window !== 'undefined'
        && typeof window.MediaRecorder !== 'undefined'
        && Boolean(navigator?.mediaDevices?.getUserMedia);
    },

    async getVoiceStatus() {
      try {
        const response = await axios.get(`${apiBase}/assistant/voice-status`);
        backendSpeechAvailable = Boolean(response?.data?.premium_available);
        return response.data;
      } catch (error) {
        backendSpeechAvailable = false;
        return {
          provider: 'browser_fallback',
          premium_available: false,
          transcription_available: false
        };
      }
    },

    supportsBackendTranscription() {
      return this.isMediaRecordingSupported();
    },

    async transcribeBlob(blob, locale = 'pt-BR') {
      const formData = new FormData();
      formData.append('audio', blob, filenameForMimeType(blob?.type || ''));
      formData.append('locale', locale);

      const response = await axios.post(`${apiBase}/assistant/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },

    async createBackendCaptureSession(handlers = {}, options = {}) {
      if (!this.isMediaRecordingSupported()) {
        throw new Error('backend_transcription_unavailable');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedRecordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const chunks = [];
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const threshold = options.threshold ?? 0.015;
      const maxDuration = options.maxDurationMs ?? 7000;
      const silenceDuration = options.silenceDurationMs ?? 700;
      const minSpeechMs = options.minSpeechMs ?? 140;
      const dataArray = new Uint8Array(analyser.fftSize);

      let rafId = null;
      let stopTimer = null;
      let startedAt = null;
      let speechStartedAt = null;
      let lastVoiceAt = null;
      let stopping = false;

      const cleanup = async () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        if (stopTimer) {
          clearTimeout(stopTimer);
          stopTimer = null;
        }
        try {
          source.disconnect();
          analyser.disconnect();
        } catch (error) {
          // noop
        }
        stream.getTracks().forEach((track) => track.stop());
        if (audioContext.state !== 'closed') {
          await audioContext.close();
        }
        backendCaptureSession = null;
      };

      const stopRecorder = () => {
        if (stopping) return;
        stopping = true;
        try {
          recorder.stop();
        } catch (error) {
          // noop
        }
      };

      const monitor = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }

        const level = Math.min(1, Math.sqrt(sumSquares / dataArray.length) * 3.4);
        handlers.onAudioLevel?.(level);

        const now = Date.now();
        if (level > threshold) {
          if (!speechStartedAt) {
            speechStartedAt = now;
          }
          lastVoiceAt = now;
        }

        const heardEnough = speechStartedAt && (now - speechStartedAt) >= minSpeechMs;
        const silentTooLong = heardEnough && lastVoiceAt && (now - lastVoiceAt) >= silenceDuration;
        const maxReached = startedAt && (now - startedAt) >= maxDuration;

        if (silentTooLong || maxReached) {
          stopRecorder();
          return;
        }

        rafId = requestAnimationFrame(monitor);
      };

      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          chunks.push(event.data);
        }
      };

      recorder.onerror = async (event) => {
        await cleanup();
        handlers.onError?.(event);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType || recorder.mimeType || 'audio/webm' });
        await cleanup();

        if (!blob.size) {
          handlers.onError?.({ error: 'empty-recording' });
          handlers.onEnd?.();
          return;
        }

        try {
          const transcription = await this.transcribeBlob(blob, options.locale || 'pt-BR');
          const transcriptText = (transcription?.text || '').trim();
          if (!transcriptText) {
            handlers.onError?.({ error: speechStartedAt ? 'empty-transcript' : 'no-speech' });
          } else {
            handlers.onFinalTranscript?.(transcriptText);
          }
        } catch (error) {
          handlers.onError?.(error);
        } finally {
          handlers.onEnd?.();
        }
      };

      backendCaptureSession = {
        stop: stopRecorder,
        cancel: async () => {
          stopping = true;
          try {
            recorder.onstop = null;
            recorder.stop();
          } catch (error) {
            // noop
          }
          await cleanup();
        }
      };

      startedAt = Date.now();
      handlers.onStart?.();
      recorder.start(180);
      stopTimer = setTimeout(stopRecorder, maxDuration + 500);
      rafId = requestAnimationFrame(monitor);

      return backendCaptureSession;
    },

    createRecognizer(handlers) {
      const SpeechRecognition = getRecognitionConstructor();
      if (!SpeechRecognition) return null;

      recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => handlers.onStart?.();

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index][0]?.transcript || '';
          if (event.results[index].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript.trim()) {
          handlers.onPartialTranscript?.(interimTranscript.trim());
        }

        if (finalTranscript.trim()) {
          handlers.onFinalTranscript?.(finalTranscript.trim());
        }
      };

      recognition.onerror = (event) => handlers.onError?.(event);
      recognition.onend = () => handlers.onEnd?.();

      return {
        start() {
          recognition.start();
        },
        stop() {
          recognition.stop();
        },
        abort() {
          recognition.abort();
        },
        destroy() {
          if (!recognition) return;
          recognition.onstart = null;
          recognition.onresult = null;
          recognition.onerror = null;
          recognition.onend = null;
          try {
            recognition.abort();
          } catch (error) {
            // noop
          }
          recognition = null;
        }
      };
    },

    async speak(text, callbacks = {}) {
      const { preferPremium = true, onStart, onEnd, onError } = callbacks;
      const speechText = sanitizeSpeechText(text);
      onStart?.();

      if (preferPremium && !premiumUnavailable) {
        if (voiceService.isMiniMaxConfigured()) {
          try {
            await voiceService.speakWithMiniMax(speechText, {
              voiceId: callbacks.voiceId,
              onEnd,
              onError
            });
            premiumUnavailable = false;
            return 'minimax';
          } catch (error) {
            // MiniMax e uma camada opcional. Se falhar, preservamos o chat e seguimos no TTS atual.
            void error;
          }
        }

        if (!backendSpeechAvailable) {
          return this.speakWithBrowser(speechText, { onEnd, onError });
        }

        try {
          const response = await axios.post(
            `${apiBase}/assistant/speech`,
            { text: speechText },
            { responseType: 'blob' }
          );

          const blobUrl = URL.createObjectURL(response.data);
          currentAudio = new Audio(blobUrl);

          currentAudio.onended = () => {
            URL.revokeObjectURL(blobUrl);
            currentAudio = null;
            premiumUnavailable = false;
            onEnd?.('backend');
          };

          currentAudio.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            currentAudio = null;
            premiumUnavailable = true;
            this.speakWithBrowser(speechText, { onEnd, onError });
          };

          await currentAudio.play();
          return 'backend';
        } catch (error) {
          const statusCode = error?.response?.status;
          if ([401, 402, 403, 404, 429, 500, 503].includes(statusCode)) {
            premiumUnavailable = true;
            if ([401, 402, 403, 404, 503].includes(statusCode)) {
              backendSpeechAvailable = false;
            }
          }
          return this.speakWithBrowser(speechText, { onEnd, onError });
        }
      }

      return this.speakWithBrowser(speechText, { onEnd, onError });
    },

    speakWithBrowser(text, callbacks = {}) {
      const { onEnd, onError } = callbacks;
      const speechText = sanitizeSpeechText(text);

      if (typeof window === 'undefined' || !window.speechSynthesis) {
        onError?.(new Error('speech_synthesis_unavailable'));
        return 'browser-unavailable';
      }

      currentUtterance = new SpeechSynthesisUtterance(speechText);
      const voices = window.speechSynthesis.getVoices?.() || [];
      const preferredVoice =
        voices.find((voice) => /pt-BR/i.test(voice.lang) && /(daniel|antonio|carlos|felipe|ricardo|microsoft|google)/i.test(voice.name))
        || voices.find((voice) => /pt-BR/i.test(voice.lang))
        || voices.find((voice) => /en-(US|GB)/i.test(voice.lang) && /(david|mark|guy|james|daniel)/i.test(voice.name))
        || null;

      if (preferredVoice) {
        currentUtterance.voice = preferredVoice;
      }

      currentUtterance.lang = preferredVoice?.lang || 'pt-BR';
      currentUtterance.rate = 0.9;
      currentUtterance.pitch = 0.82;
      currentUtterance.onend = () => {
        currentUtterance = null;
        onEnd?.('browser');
      };
      currentUtterance.onerror = (event) => {
        currentUtterance = null;
        onError?.(event);
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(currentUtterance);
      return 'browser';
    },

    stopSpeaking() {
      voiceService.stopMiniMaxSpeech();

      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }

      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      currentUtterance = null;
    },

    async stopBackendCapture() {
      if (!backendCaptureSession) return;
      backendCaptureSession.stop?.();
    },

    async cancelBackendCapture() {
      if (!backendCaptureSession) return;
      await backendCaptureSession.cancel?.();
    }
  };
};

const buildRealtimeVoiceProvider = ({ apiBase }) => {
  const fallback = buildBrowserVoiceProvider({ apiBase });
  return {
    ...fallback,
    type: 'realtime-placeholder'
  };
};

export const createVoiceProvider = ({ apiBase, mode = 'browser-fallback' }) => {
  if (mode === 'realtime') {
    return buildRealtimeVoiceProvider({ apiBase });
  }

  return buildBrowserVoiceProvider({ apiBase });
};
