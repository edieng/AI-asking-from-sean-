/* api.js — fetch wrapper, SSE streaming reader, AbortController */
(function () {
  'use strict';

  let abortController = null;

  function startAbort() {
    abortController = new AbortController();
    return abortController.signal;
  }

  function stop() {
    if (abortController) {
      abortController.abort();
    }
  }

  function signal() {
    return abortController ? abortController.signal : null;
  }

  /*
   * Read a Server-Sent-Events stream produced by the server.
   * onToken(text) fires for each token string.
   * onMeta(obj) fires for metadata messages (e.g. type: 'thinking').
   * Returns a Promise that resolves when the stream ends.
   */
  function streamChat(messages, onToken, onMeta) {
    return fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-secret': 'secret-1' },
      body: JSON.stringify({ messages: messages }),
      signal: signal()
    }).then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          return Promise.reject(new Error(data.error || 'Server error.'));
        });
      }
      return readSSE(res, onToken, onMeta);
    });
  }

  function readSSE(res, onToken, onMeta) {
    return new Promise(function (resolve, reject) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function pump() {
        return reader.read().then(function (part) {
          if (part.done) {
            resolve();
            return;
          }
          buffer += decoder.decode(part.value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          lines.forEach(function (line) {
            const trimmed = line.trim();
            if (trimmed.indexOf('data:') !== 0) return;
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') return;
            try {
              const data = JSON.parse(payload);
              if (data.type === 'thinking') {
                if (onMeta) onMeta(data);
              } else if (typeof data.token === 'string' && data.token.length > 0) {
                onToken(data.token);
              }
            } catch (e) {
              /* skip malformed line */
            }
          });
          return pump();
        });
      }

      return pump();
    });
  }

  window.Api = {
    startAbort: startAbort,
    stop: stop,
    signal: signal,
    streamChat: streamChat
  };
})();
