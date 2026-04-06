import axios from 'axios';

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

const buildBrowserVoiceProvider = ({ apiBase }) => {
  let recognition = null;
  let currentAudio = null;
  let currentUtterance = null;
  let backendCaptureSession = null;

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
        return response.data;
      } catch (error) {
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

      const threshold = options.threshold ?? 0.018;
      const maxDuration = options.maxDurationMs ?? 14000;
      const silenceDuration = options.silenceDurationMs ?? 1800;
      const minSpeechMs = options.minSpeechMs ?? 350;
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
      recorder.start(250);
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
      onStart?.();

      if (preferPremium) {
        try {
          const response = await axios.post(
            `${apiBase}/assistant/speech`,
            { text },
            { responseType: 'blob' }
          );

          const blobUrl = URL.createObjectURL(response.data);
          currentAudio = new Audio(blobUrl);

          currentAudio.onended = () => {
            URL.revokeObjectURL(blobUrl);
            currentAudio = null;
            onEnd?.('openai');
          };

          currentAudio.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            currentAudio = null;
            this.speakWithBrowser(text, { onEnd, onError });
          };

          await currentAudio.play();
          return 'openai';
        } catch (error) {
          return this.speakWithBrowser(text, { onEnd, onError });
        }
      }

      return this.speakWithBrowser(text, { onEnd, onError });
    },

    speakWithBrowser(text, callbacks = {}) {
      const { onEnd, onError } = callbacks;

      if (typeof window === 'undefined' || !window.speechSynthesis) {
        onError?.(new Error('speech_synthesis_unavailable'));
        return 'browser-unavailable';
      }

      currentUtterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices?.() || [];
      const preferredVoice =
        voices.find((voice) => /pt-BR/i.test(voice.lang) && /(google|microsoft|luciana|francisca)/i.test(voice.name))
        || voices.find((voice) => /pt-BR/i.test(voice.lang))
        || null;

      if (preferredVoice) {
        currentUtterance.voice = preferredVoice;
      }

      currentUtterance.lang = preferredVoice?.lang || 'pt-BR';
      currentUtterance.rate = 0.96;
      currentUtterance.pitch = 1;
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
