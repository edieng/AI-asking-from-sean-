require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(cors({ origin: 'http://localhost:3001' }));
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Load API client
const openai = new OpenAI({
  apiKey: process.env.API_KEY || 'not-needed',
  baseURL: process.env.API_URL || 'https://api.openai.com/v1',
});

function safeLog(err) {
  console.error('[API Error]', err);
}

// Token check for the /chat endpoint
function authCheck(req, res, next) {
  const token = req.headers['x-secret'] || req.query.secret;
  if (token !== process.env.SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

// Rate limiter for /chat
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many requests. Try again in a minute.' }
});

// Chat API Endpoint — streams tokens to the client with Server-Sent Events
app.post('/chat', limiter, authCheck, async (req, res) => {
  try {
    if (!req.body.messages || !Array.isArray(req.body.messages)) {
      return res.status(400).json({ success: false, error: 'Invalid request format. Expected array of messages.' });
    }

    const payload = {
      model: process.env.MODEL || 'unsloth/Qwen3.6-35B-A3B-MTP-GGUF',
      messages: req.body.messages,
      temperature: parseFloat(req.body.temperature) || 0.7,
      max_tokens: parseInt(req.body.max_tokens) || 2048,
      stream: true
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await openai.chat.completions.create(payload);
    const THINK_TAG = process.env.THINK_TAG || '< think>';
    let thinking = '';
    let inThinking = false;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta || {};
      const piece = delta.content || '';
      if (piece === '') continue;
      if (inThinking) {
        thinking += piece;
        continue;
      }
      const markerIdx = piece.indexOf(THINK_TAG);
      if (markerIdx !== -1) {
        inThinking = true;
        thinking += piece.slice(markerIdx + THINK_TAG.length);
        continue;
      }
      res.write(`data: ${JSON.stringify({ token: piece })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'thinking', text: thinking })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    safeLog(err);
    res.status(502).json({
      success: false,
      error: err.message || 'Failed to reach AI service. Check API Key, API_URL, or network connection.'
    });
  }
});

// SPA index
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`));
