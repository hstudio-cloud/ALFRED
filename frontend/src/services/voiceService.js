import axios from 'axios';

let currentAudio = null;
let currentObjectUrl = null;

const getVoiceApiBase = () => {
  const configuredUrl = process.env.REACT_APP_VOICE_BACKEND_URL;
  return configuredUrl ? configuredUrl.replace(/\/$/, '') : '';
};

const cleanupCurrentAudio = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.src = '';
    currentAudio = null;
  }

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
};

const speakWithMiniMax = async (text, options = {}) => {
  const apiBase = getVoiceApiBase();
  if (!apiBase) {
    throw new Error('minimax_voice_backend_not_configured');
  }

  cleanupCurrentAudio();

  const response = await axios.post(
    `${apiBase}/api/voice/speak`,
    {
      text,
      // Para trocar a voz do Nano por tela/configuracao, envie voiceId aqui.
      voiceId: options.voiceId,
    },
    { responseType: 'blob' }
  );

  currentObjectUrl = URL.createObjectURL(response.data);
  currentAudio = new Audio(currentObjectUrl);

  currentAudio.onended = () => {
    cleanupCurrentAudio();
    options.onEnd?.('minimax');
  };

  currentAudio.onerror = (event) => {
    cleanupCurrentAudio();
    options.onError?.(event);
  };

  await currentAudio.play();
  return 'minimax';
};

const stopMiniMaxSpeech = () => {
  cleanupCurrentAudio();
};

const isMiniMaxConfigured = () => Boolean(getVoiceApiBase());

const voiceService = {
  isMiniMaxConfigured,
  speakWithMiniMax,
  stopMiniMaxSpeech,
};

export default voiceService;
