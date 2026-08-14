// Floating AI chat widget. Talks only to /api/chat (a serverless
// function) — never calls any AI provider directly, so no API key
// is ever present in this file or visible to the browser.

(function () {
  const state = { messages: [] };

  function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
  }

  function addMessage(container, role, text) {
    const div = document.createElement('div');
    div.className = 'chat-message chat-message-' + role;
    div.textContent = text;
    container.appendChild(div);
    scrollToBottom(container);
    return div;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const root = document.createElement('div');
    root.className = 'chat-widget';
    root.innerHTML = `
      <button class="chat-toggle btn btn-primary notch" id="chat-toggle" aria-expanded="false" aria-controls="chat-panel">Chat</button>
      <div class="chat-panel" id="chat-panel" role="dialog" aria-label="Chat assistant">
        <div class="chat-panel-header">
          <span>Ask us anything<span class="chat-ai-tag mono">AI assistant</span></span>
          <button class="chat-close" id="chat-close" aria-label="Close chat">&times;</button>
        </div>
        <div class="chat-messages" id="chat-messages"></div>
        <form class="chat-input-row" id="chat-form">
          <input type="text" id="chat-input" placeholder="Type a message…" autocomplete="off" maxlength="500">
          <button type="submit" class="btn btn-primary" id="chat-send">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(root);

    const toggle = document.getElementById('chat-toggle');
    const panel = document.getElementById('chat-panel');
    const closeBtn = document.getElementById('chat-close');
    const messagesEl = document.getElementById('chat-messages');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');

    addMessage(
      messagesEl,
      'assistant',
      "Hi, I can help with questions about our services, pricing, or getting a quote. If water's actively spreading in your home, call (555) 010-2030 right now instead of chatting here."
    );

    function openChat() {
      panel.classList.add('open');
      toggle.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'true');
      input.focus();
    }
    function closeChat() {
      panel.classList.remove('open');
      toggle.style.display = '';
      toggle.setAttribute('aria-expanded', 'false');
    }
    toggle.addEventListener('click', openChat);
    closeBtn.addEventListener('click', closeChat);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      addMessage(messagesEl, 'user', text);
      state.messages.push({ role: 'user', content: text });
      input.value = '';
      input.disabled = true;
      sendBtn.disabled = true;

      const loadingEl = addMessage(messagesEl, 'assistant', 'Thinking…');
      loadingEl.classList.add('chat-message-loading');

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: state.messages }),
        });
        const data = await res.json();
        loadingEl.remove();

        if (!res.ok) {
          addMessage(messagesEl, 'assistant', "Sorry, I'm having trouble right now. Please call (555) 010-2030 instead.");
        } else {
          addMessage(messagesEl, 'assistant', data.reply);
          state.messages.push({ role: 'assistant', content: data.reply });
        }
      } catch (err) {
        loadingEl.remove();
        addMessage(messagesEl, 'assistant', "Sorry, I'm having trouble right now. Please call (555) 010-2030 instead.");
      } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
      }
    });
  });
})();
