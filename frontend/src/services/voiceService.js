import axios from 'axios';
import { VOICE_BACKEND_URL, VOICE_PROVIDER } from '../config/env';

let currentAudio = null;
let currentObjectUrl = null;
let minimaxRouteAvailable = null;

const getVoiceApiBase = () => {
  const configuredUrl = VOICE_BACKEND_URL;
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
  if (!apiBase || minimaxRouteAvailable === false) {
    throw new Error('minimax_voice_backend_not_configured');
  }

  cleanupCurrentAudio();
  let response;
  try {
    response = await axios.post(
      `${apiBase}/api/voice/speak`,
      {
        text,
        // Para trocar a voz do Nano por tela/configuracao, envie voiceId aqui.
        voiceId: options.voiceId,
      },
      { responseType: 'blob' }
    );
    minimaxRouteAvailable = true;
  } catch (error) {
    const statusCode = error?.response?.status;
    if (statusCode === 404 || statusCode === 401) {
      minimaxRouteAvailable = false;
    }
    throw error;
  }

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

const isMiniMaxConfigured = () =>
  VOICE_PROVIDER === 'minimax'
  && Boolean(getVoiceApiBase())
  && minimaxRouteAvailable !== false;

const voiceService = {
  isMiniMaxConfigured,
  speakWithMiniMax,
  stopMiniMaxSpeech,
};

export default voiceService;
