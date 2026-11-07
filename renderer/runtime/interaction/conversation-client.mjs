/** Session transport contains no provider key; only a local session capability. */
export class ConversationTransport {
  constructor(fetcher = globalThis.fetch.bind(globalThis), storage = null) {
    this.fetcher = fetcher; this.storage = storage; this.session = null;
  }
  async request(path, body, signal) {
    const response = await this.fetcher(path, body === undefined ? { signal } : {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'X-Lumi-Token': this.session?.token || '' },
      body: JSON.stringify({ ...body, session_id: this.session?.session_id }),
    });
    const result = await response.json();
    if (!response.ok) { const error = new Error(result.error?.message || '对话暂时无法连接。'); error.code = result.error?.code; throw error; }
    return result;
  }
  async init() {
    try { this.session = JSON.parse(this.storage?.getItem('lumi.conversation') || 'null'); } catch { this.session = null; }
    if (this.session?.token && this.session?.session_id) {
      try { return await this.request('/api/session', {}); }
      catch (error) { if (error.code !== 'session_expired') throw error; }
    }
    const result = await this.request('/api/session');
    this.session = { session_id: result.session_id, token: result.token };
    try { this.storage?.setItem('lumi.conversation', JSON.stringify(this.session)); } catch { /* Storage may be disabled. */ }
    return result;
  }
  chat(turn, text, signal) { return this.request('/api/chat', { turn_id: turn, text }, signal); }
  cancel(turn) { return this.request('/api/cancel', { turn_id: turn }); }
  clear() { return this.request('/api/reset', {}); }
}

export class ConversationController {
  constructor({ transport, player, changed = () => {}, timeoutMs = 55000, uuid = () => crypto.randomUUID() }) {
    this.transport = transport; this.player = player; this.changed = changed; this.timeoutMs = timeoutMs; this.uuid = uuid;
    this.version = 0; this.active = null;
    this.state = { status: 'loading', configured: false, connected: false, messages: [], context: {}, error: '', model: '', providerKind: '', lastReaction: null, provider: null };
  }
  snapshot() { return structuredClone(this.state); }
  publish() { this.changed(this.snapshot()); }
  async init() {
    try {
      const info = await this.transport.init();
      Object.assign(this.state, { status: 'idle', configured: info.configured, model: info.model, providerKind: info.provider_kind, messages: info.history, context: info.context });
      if (!info.configured) this.state.error = '还没有配置 DeepSeek。可以先查看动作，配置后再开始聊天。';
    } catch (error) { this.state.status = 'error'; this.state.error = error.message; }
    this.publish();
  }
  stop(stopPlayer = true) {
    this.version++;
    const old = this.active; this.active = null;
    if (old) { old.controller.abort(); this.transport.cancel(old.turn).catch(() => {}); }
    if (stopPlayer) this.player.cancel();
    this.state.status = 'idle'; this.state.error = ''; this.publish();
  }
  async clear() {
    this.stop(); const version = this.version;
    this.state.status = 'resetting'; this.publish();
    try {
      await this.transport.clear();
      if (version !== this.version) return;
      Object.assign(this.state, { messages: [], context: {}, lastReaction: null, status: 'idle' });
    } catch (error) { this.state.status = 'error'; this.state.error = error.message; }
    this.publish();
  }
  async send(text) {
    if (this.state.status === 'loading' || this.state.status === 'resetting') return;
    if (!this.state.configured) { this.state.error = '请先在本机配置 DeepSeek 密钥。'; this.publish(); return; }
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) { this.state.error = '请输入 1–2000 字的消息。'; this.publish(); return; }
    this.stop(false);
    const version = this.version, turn = 'chat-' + this.uuid(), controller = new AbortController();
    this.active = { turn, controller };
    this.state.messages = [...this.state.messages, { role: 'user', content: text.trim() }].slice(-24);
    this.state.status = 'waiting'; this.state.error = ''; this.publish();
    this.player.beginTurn(turn, 60);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); this.transport.cancel(turn).catch(() => {}); }, this.timeoutMs);
    try {
      const result = await this.transport.chat(turn, text.trim(), controller.signal);
      if (version !== this.version) return { ignored: true };
      if (timedOut) throw new Error('回复等待超时，可以重新发送。');
      if (result.command?.turn_id !== turn) throw new Error('收到的回复不属于这次对话，请重新发送。');
      const receipt = this.player.respond(result.command);
      if (receipt.type !== 'started') this.player.cancel();
      Object.assign(this.state, { status: 'idle', connected: true, messages: result.history, context: result.context, lastReaction: receipt.type === 'started' ? result.command.gesture : null, provider: result.provider });
      return { ...result, receipt };
    } catch (error) {
      if (version !== this.version) return { ignored: true };
      this.player.cancel(); this.state.status = 'error';
      this.state.error = timedOut ? '回复等待超时，可以重新发送。' : error.name === 'AbortError' ? '这次回复已停止。' : error.message;
      return { error: this.state.error };
    } finally {
      clearTimeout(timer);
      if (version === this.version) { this.active = null; this.publish(); }
    }
  }
}
