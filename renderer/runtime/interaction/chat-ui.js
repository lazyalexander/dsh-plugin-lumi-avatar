import { ConversationController, ConversationTransport } from './conversation-client.mjs';

export async function connectChat(player) {
  const dialogue = document.querySelector('#dialogue'), error = document.querySelector('#chatError'), provider = document.querySelector('#providerStatus');
  const input = document.querySelector('#textInput'), submit = document.querySelector('#send');
  const changed = state => {
    dialogue.replaceChildren();
    const messages = state.messages.length ? state.messages : [{ role: 'assistant', content: '我在。今天有什么想和我说的？' }];
    const lastUser = messages.findLastIndex(m => m.role === 'user'), lastReply = messages.findLastIndex(m => m.role === 'assistant');
    messages.forEach((m, i) => {
      const bubble = document.createElement('div'); bubble.className = 'bubble' + (m.role === 'user' ? ' user' : '');
      const label = document.createElement('div'); label.className = 'label'; label.textContent = m.role === 'user' ? '你' : 'Lumi';
      const text = document.createElement('span'); text.textContent = m.content;
      if (i === lastUser) text.id = 'userText'; if (i === lastReply) text.id = 'reply';
      bubble.append(label, text); dialogue.append(bubble);
    });
    if (state.status === 'waiting') { const thinking = document.createElement('p'); thinking.className = 'thinking'; thinking.textContent = 'Lumi 正在想…'; dialogue.append(thinking); }
    error.textContent = state.error; error.hidden = !state.error;
    provider.textContent = state.providerKind === 'scripted-test' ? '测试数据 · 非 AI' : state.connected ? 'DeepSeek 已连接' : state.configured ? 'DeepSeek 待连接' : '尚未连接';
    provider.dataset.ready = String(state.configured);
    input.disabled = ['loading', 'resetting'].includes(state.status) || !state.configured;
    submit.disabled = input.disabled; document.querySelector('#newChat').disabled = ['loading', 'resetting'].includes(state.status);
    dialogue.scrollTop = dialogue.scrollHeight;
  };
  const chat = new ConversationController({ transport: new ConversationTransport(fetch.bind(window), sessionStorage), player, changed });
  window.lumiChat = { send: text => chat.send(text), stop: () => chat.stop(), clear: () => chat.clear(), snapshot: () => chat.snapshot() };
  document.querySelector('#textForm').onsubmit = event => { event.preventDefault(); const text = input.value.trim(); if (text) { input.value = ''; void chat.send(text); } };
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); document.querySelector('#textForm').requestSubmit(); } });
  document.querySelector('#interrupt').onclick = () => chat.stop();
  document.querySelector('#newChat').onclick = () => void chat.clear();
  document.querySelectorAll('[data-gesture]').forEach(button => button.addEventListener('click', () => chat.stop(false), { capture: true }));
  await chat.init(); window.chatReady = true;
  return chat;
}
