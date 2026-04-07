require('dotenv').config();

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const voiceConfig = {
  provider: process.env.VOICE_PROVIDER || 'minimax',
  minimax: {
    apiKey: process.env.MINIMAX_API_KEY || '',
    groupId: process.env.MINIMAX_GROUP_ID || '',
    endpoint: process.env.MINIMAX_TTS_ENDPOINT || 'https://api.minimax.io/v1/t2a_v2',
    model: process.env.MINIMAX_TTS_MODEL || 'speech-02-hd',
    // Troque este voice_id quando escolher a voz oficial do Nano no painel do MiniMax.
    defaultVoiceId: process.env.MINIMAX_VOICE_ID || 'English_expressive_narrator',
    languageBoost: process.env.MINIMAX_LANGUAGE_BOOST || 'Portuguese',
    voice: {
      // Ajuste velocidade, volume e tom aqui sem mexer no controller ou frontend.
      speed: toNumber(process.env.MINIMAX_VOICE_SPEED, 1),
      volume: toNumber(process.env.MINIMAX_VOICE_VOLUME, 1),
      pitch: toNumber(process.env.MINIMAX_VOICE_PITCH, 0),
    },
    audio: {
      format: process.env.MINIMAX_AUDIO_FORMAT || 'mp3',
      sampleRate: toNumber(process.env.MINIMAX_AUDIO_SAMPLE_RATE, 32000),
      bitrate: toNumber(process.env.MINIMAX_AUDIO_BITRATE, 128000),
      channel: toNumber(process.env.MINIMAX_AUDIO_CHANNEL, 1),
    },
  },
};

module.exports = voiceConfig;
