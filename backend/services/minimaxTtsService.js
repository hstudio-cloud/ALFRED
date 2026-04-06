const voiceConfig = require('../config/voiceConfig');

class MiniMaxConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MiniMaxConfigError';
    this.statusCode = 503;
  }
}

class MiniMaxTtsError extends Error {
  constructor(message, statusCode = 502, details = null) {
    super(message);
    this.name = 'MiniMaxTtsError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const stripUnsafeSpeechText = (text = '') => {
  return String(text || '')
    .replace(/[*_`#>[\]]/g, '')
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 9000);
};

const isProbablyHex = (value) => /^[0-9a-fA-F]+$/.test(value) && value.length % 2 === 0;

const decodeAudioPayload = async (payload) => {
  const audioValue = payload?.data?.audio || payload?.audio;
  const audioUrl = payload?.data?.audio_url || payload?.audio_url || payload?.data?.url || payload?.url;

  if (audioValue) {
    const audioString = String(audioValue);
    return isProbablyHex(audioString)
      ? Buffer.from(audioString, 'hex')
      : Buffer.from(audioString, 'base64');
  }

  if (audioUrl) {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new MiniMaxTtsError(`MiniMax retornou uma URL de audio, mas o download falhou: ${response.status}`, 502);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  throw new MiniMaxTtsError('MiniMax nao retornou audio utilizavel.', 502, payload);
};

const buildMiniMaxUrl = () => {
  const { endpoint, groupId } = voiceConfig.minimax;
  const url = new URL(endpoint);

  // Algumas contas legadas do MiniMax usam GroupId na query. Mantemos opcional para compatibilidade.
  if (groupId && !url.searchParams.has('GroupId')) {
    url.searchParams.set('GroupId', groupId);
  }

  return url.toString();
};

const contentTypeForFormat = (format) => {
  const normalized = String(format || '').toLowerCase();
  if (normalized === 'mp3') return 'audio/mpeg';
  if (normalized === 'wav') return 'audio/wav';
  if (normalized === 'flac') return 'audio/flac';
  return `audio/${normalized || 'mpeg'}`;
};

const synthesizeSpeech = async (text, options = {}) => {
  const cleanText = stripUnsafeSpeechText(text);
  if (!cleanText) {
    throw new MiniMaxTtsError('Texto vazio para sintese de voz.', 400);
  }

  const { minimax } = voiceConfig;
  if (!minimax.apiKey) {
    throw new MiniMaxConfigError('MINIMAX_API_KEY nao configurada.');
  }

  const voiceId = options.voiceId || minimax.defaultVoiceId;

  const payload = {
    model: minimax.model,
    text: cleanText,
    stream: false,
    language_boost: minimax.languageBoost,
    output_format: 'hex',
    voice_setting: {
      // Para trocar a voz do Nano, envie voiceId no body ou altere MINIMAX_VOICE_ID.
      voice_id: voiceId,
      speed: options.speed ?? minimax.voice.speed,
      vol: options.volume ?? minimax.voice.volume,
      pitch: options.pitch ?? minimax.voice.pitch,
    },
    audio_setting: {
      format: minimax.audio.format,
      sample_rate: minimax.audio.sampleRate,
      bitrate: minimax.audio.bitrate,
      channel: minimax.audio.channel,
    },
  };

  const response = await fetch(buildMiniMaxUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${minimax.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let responsePayload = null;

  try {
    responsePayload = responseText ? JSON.parse(responseText) : null;
  } catch (error) {
    throw new MiniMaxTtsError('Resposta inesperada do MiniMax.', 502, responseText);
  }

  const statusCodeRaw = responsePayload?.base_resp?.status_code;
  const statusCode = statusCodeRaw === undefined || statusCodeRaw === null ? 0 : Number(statusCodeRaw);
  if (!response.ok || statusCode !== 0) {
    throw new MiniMaxTtsError(
      responsePayload?.base_resp?.status_msg || `MiniMax TTS falhou com status ${response.status}.`,
      response.ok ? 502 : response.status,
      responsePayload
    );
  }

  const audioBuffer = await decodeAudioPayload(responsePayload);

  return {
    audioBuffer,
    contentType: contentTypeForFormat(minimax.audio.format),
    voiceId,
    model: minimax.model,
    provider: 'minimax',
  };
};

module.exports = {
  MiniMaxConfigError,
  MiniMaxTtsError,
  synthesizeSpeech,
};
