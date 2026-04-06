require('dotenv').config();

const express = require('express');
const cors = require('cors');
const voiceRoutes = require('./routes/voiceRoutes');

const app = express();
const port = Number(process.env.VOICE_PORT || 8012);

const allowedOrigins = (process.env.VOICE_CORS_ORIGINS || process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
}));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'nano-voice',
    provider: process.env.VOICE_PROVIDER || 'minimax',
  });
});

app.use('/api/voice', voiceRoutes);

app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      error: 'invalid_json',
      message: 'Body JSON invalido.',
    });
  }
  return next(error);
});

app.listen(port, () => {
  console.log(`Nano voice service listening on http://127.0.0.1:${port}`);
});
