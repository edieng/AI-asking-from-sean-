/* app.js — state management, messages array, localStorage, theme, wiring */
(function () {
  'use strict';

  const THEME_KEY = 'ai-chat-theme';
  const STORAGE_KEY = 'ai-chat-history';
  const messages = [];

  const input = document.getElementById('msg');
  const form = document.getElementById('form');
  const emptyState = document.getElementById('emptyState');
  const chips = document.getElementById('chips');
  const stopBtn = document.getElementById('stopBtn');

  /* Theme: first load from prefers-color-scheme, persist choice */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('themeToggle');
    btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
  }
  function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) {
      applyTheme(stored);
    } else {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(dark ? 'dark' : 'light');
    }
  }
  initTheme();
  document.getElementById('themeToggle').addEventListener('click', function () {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  function saveMessages() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }

  function loadMessages() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        parsed.forEach(function (m) {
          messages.push(m);
          Chat.appendMessage(m.role === 'user' ? 'user' : 'ai', m.content, m.thinking || '', m.timestamp || '');
        });
      }
    }
  }

  function resetChat() {
    messages.length = 0;
    document.getElementById('chat').innerHTML = '';
    localStorage.removeItem(STORAGE_KEY);
    emptyState.hidden = false;
  }

  loadMessages();
  emptyState.hidden = messages.length > 0;

  function sendRequest() {
    Chat.setBusy(true);
    Chat.showTypingIndicator();
    Api.startAbort();
    const stream = Chat.startStreamBubble();
    let thinking = '';

    Api.streamChat(messages, stream.onToken, function (meta) {
      if (meta.type === 'thinking') {
        thinking = meta.text || '';
      }
    }).then(function () {
      Chat.hideTypingIndicator();
      Chat.setBusy(false);
      const ts = new Date().toLocaleTimeString();
      messages.push({ role: 'assistant', content: stream.text(), thinking: thinking, timestamp: ts });
      Chat.finishStreamBubble(stream, thinking);
      saveMessages();
      Chat.addRegenerateButton(stream.div, function () {
        messages.pop();
        saveMessages();
        sendRequest();
      });
    }).catch(function (err) {
      Chat.hideTypingIndicator();
      Chat.setBusy(false);
      stream.div.remove();
      if (err.name === 'AbortError') {
        Chat.appendMessage('ai', 'Stopped.');
      } else {
        Chat.appendMessage('ai', '❌ ' + (err.message || 'Error contacting server'));
        console.error(err);
      }
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg) return;

    const ts = new Date().toLocaleTimeString();
    messages.push({ role: 'user', content: msg, timestamp: ts });
    Chat.appendMessage('user', msg, '', ts);
    input.value = '';
    Chat.autoExpand();
    emptyState.hidden = true;

    sendRequest();
  });

  stopBtn.addEventListener('click', function () {
    Api.stop();
  });

  chips.addEventListener('click', function (e) {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    input.value = chip.textContent;
    input.focus();
  });

  document.getElementById('newChat').addEventListener('click', resetChat);
  document.getElementById('clear').addEventListener('click', resetChat);
  input.addEventListener('input', Chat.autoExpand);
})();
