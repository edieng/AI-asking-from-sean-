/* chat.js — DOM rendering, scroll, typing indicator */
(function () {
  'use strict';

  const chat = document.getElementById('chat');

  function addCopyBehavior(btn, getText) {
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(getText()).then(function () {
        const prev = btn.textContent;
        btn.textContent = 'Copied.';
        setTimeout(function () { btn.textContent = prev; }, 1500);
      });
    });
  }

  function wrapCodeBlocks(container) {
    container.querySelectorAll('pre').forEach(function (pre) {
      const block = document.createElement('div');
      block.className = 'code-block';
      const header = document.createElement('div');
      header.className = 'code-block-header';
      const label = document.createElement('span');
      label.textContent = 'Code';
      header.appendChild(label);
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      header.appendChild(copyBtn);
      addCopyBehavior(copyBtn, function () { return pre.textContent; });
      block.appendChild(header);
      block.appendChild(pre);
      pre.parentNode.replaceChild(block, pre);
    });
  }

  function renderText(el, text) {
    el.innerHTML = text && text.trim()
      ? `<div class="markdown-body">${DOMPurify.sanitize(marked.parse(text))}</div>`
      : '<div class="markdown-body"><em>(No text generated)</em></div>';
  }

  function appendMessage(role, text, reasoning, timestamp) {
    const div = document.createElement('div');
    div.className = `msg ${role === 'user' ? 'user' : 'ai'}`;

    if (role === 'ai') {
      if (reasoning) {
        const thinkDiv = document.createElement('details');
        thinkDiv.className = 'thinking';
        const cleanReasoning = DOMPurify.sanitize(marked.parse(reasoning));
        thinkDiv.innerHTML = `
          <summary>🧠 Thinking Process...</summary>
          <div class="thinking-body markdown-body">${cleanReasoning}</div>
        `;
        div.appendChild(thinkDiv);
      }

      const ansDiv = document.createElement('div');
      ansDiv.className = 'answer';
      renderText(ansDiv, text);
      div.appendChild(ansDiv);
      wrapCodeBlocks(ansDiv);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'copy-btn';
      copyBtn.textContent = 'Copy';
      addCopyBehavior(copyBtn, function () { return text; });
      div.appendChild(copyBtn);
    } else {
      const content = document.createElement('div');
      content.className = 'bubble-content';
      content.textContent = text;
      div.appendChild(content);
    }

    if (timestamp) {
      const ts = document.createElement('span');
      ts.className = 'timestamp';
      ts.textContent = timestamp;
      div.appendChild(ts);
    }

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
    return div;
  }

  /* Streaming: one bubble, tokens appended in real time */
  function startStreamBubble() {
    const div = document.createElement('div');
    div.className = 'msg ai';
    const ansDiv = document.createElement('div');
    ansDiv.className = 'answer';
    ansDiv.innerHTML = '<div class="markdown-body"></div>';
    div.appendChild(ansDiv);
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    let text = '';
    let first = true;
    function onToken(token) {
      if (first) {
        hideTypingIndicator();
        first = false;
      }
      text += token;
      ansDiv.innerHTML = `<div class="markdown-body">${DOMPurify.sanitize(marked.parse(text))}</div>`;
      chat.scrollTop = chat.scrollHeight;
    }
    return {
      onToken: onToken,
      div: div,
      text: function () { return text; }
    };
  }

  function finishStreamBubble(stream, thinking) {
    wrapCodeBlocks(stream.div);
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'copy-btn';
    copyBtn.textContent = 'Copy';
    addCopyBehavior(copyBtn, function () { return stream.text(); });
    stream.div.appendChild(copyBtn);
    if (thinking) {
      const thinkDiv = document.createElement('details');
      thinkDiv.className = 'thinking';
      thinkDiv.innerHTML = `
        <summary>🧠 Thinking Process...</summary>
        <div class="thinking-body markdown-body">${DOMPurify.sanitize(marked.parse(thinking))}</div>
      `;
      stream.div.insertBefore(thinkDiv, stream.div.firstChild);
    }
    chat.scrollTop = chat.scrollHeight;
  }

  function showTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.className = 'msg ai';
    div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  function hideTypingIndicator() {
    const div = document.getElementById('typingIndicator');
    if (div) div.remove();
  }

  function addRegenerateButton(div, onRegenerate) {
    const btn = document.createElement('button');
    btn.textContent = 'Regenerate';
    btn.type = 'button';
    btn.addEventListener('click', function () {
      if (document.getElementById('msg').disabled) return;
      btn.remove();
      div.remove();
      onRegenerate();
    });
    div.appendChild(btn);
    return btn;
  }

  function setBusy(busy) {
    const input = document.getElementById('msg');
    const sendBtn = document.querySelector('#form button[type="submit"]');
    const stopBtn = document.getElementById('stopBtn');
    input.disabled = busy;
    sendBtn.disabled = busy;
    stopBtn.style.display = busy ? '' : 'none';
  }

  function autoExpand() {
    const input = document.getElementById('msg');
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 5 * (1.5 * 16 + 16)) + 'px';
  }

  window.Chat = {
    appendMessage: appendMessage,
    startStreamBubble: startStreamBubble,
    finishStreamBubble: finishStreamBubble,
    showTypingIndicator: showTypingIndicator,
    hideTypingIndicator: hideTypingIndicator,
    addRegenerateButton: addRegenerateButton,
    setBusy: setBusy,
    autoExpand: autoExpand
  };
})();
