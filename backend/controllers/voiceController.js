const { synthesizeSpeech } = require('../services/minimaxTtsService');

const speak = async (req, res) => {
  try {
    const { text, voiceId, speed, volume, pitch } = req.body || {};

    const result = await synthesizeSpeech(text, {
      voiceId,
      speed,
      volume,
      pitch,
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', 'inline; filename="nano-voice.mp3"');
    res.setHeader('X-Voice-Provider', result.provider);
    res.setHeader('X-Voice-Id', result.voiceId);
    res.setHeader('X-Voice-Model', result.model);
    return res.status(200).send(result.audioBuffer);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      error: 'voice_synthesis_failed',
      message: error.message || 'Nao foi possivel gerar audio agora.',
      details: process.env.NODE_ENV === 'production' ? undefined : error.details,
    });
  }
};

module.exports = {
  speak,
};
