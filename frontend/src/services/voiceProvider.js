import axios from 'axios';

const getRecognitionConstructor = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const buildBrowserVoiceProvider = ({ apiBase }) => {
  let recognition = null;
  let currentAudio = null;
  let currentUtterance = null;

  return {
    type: 'browser-fallback',

    isRecognitionSupported() {
      return Boolean(getRecognitionConstructor());
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
            `${apiBase}/chat/speech`,
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
