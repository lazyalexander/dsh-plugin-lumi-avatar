/** Host-side connection to a Lumi frame. Each mount owns one channel and pending calls. */
export class LumiAvatarClient {
  constructor(frame, url) {
    this.frame = frame;
    this.url = new URL(url);
    if (!['http:', 'https:'].includes(this.url.protocol)) throw Error('Use an HTTP avatar URL');
    this.pending = new Map();
    this.sequence = 0;
    this.closed = false;
    this.port = null;
  }
  async connect() {
    if (this.closed || this.port) throw Error('Avatar connection is already used');
    this.url.searchParams.set('embed', '1');
    this.url.searchParams.set('host_origin', location.origin);
    const channel = new MessageChannel();
    this.port = channel.port1;
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.dispose(); reject(Error('Avatar startup timed out')); }, 120000);
      this.startup = { reject, timer };
      this.port.onmessage = event => {
        const message = event.data;
        if (message.type === 'ready' && message.version === 1) {
          clearTimeout(timer); this.startup = null; resolve(message);
        } else {
          const call = this.pending.get(message.id);
          if (!call) return;
          this.pending.delete(message.id); clearTimeout(call.timer);
          if (message.error) call.reject(Error(message.error)); else call.resolve(message.result);
        }
      };
    });
    this.onavailable = event => {
      if (this.closed || event.source !== this.frame.contentWindow || event.origin !== this.url.origin) return;
      if (event.data?.type !== 'lumi.available' || event.data.version !== 1) return;
      removeEventListener('message', this.onavailable);
      this.frame.contentWindow.postMessage({ type: 'lumi.connect', version: 1 }, this.url.origin, [channel.port2]);
    };
    addEventListener('message', this.onavailable);
    this.frame.src = this.url.href;
    return ready;
  }
  request(type, payload) {
    if (this.closed || !this.port || this.startup) return Promise.reject(Error('Avatar is not ready'));
    const id = String(++this.sequence);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(Error('Avatar command timed out')); }, 5000);
      this.pending.set(id, { resolve, reject, timer });
      this.port.postMessage({ id, type, payload });
    });
  }
  begin(turnId) { return this.request('begin', { turn_id: turnId }); }
  react(turnId, commandId, state, text = '', intensity = .55) {
    return this.request('react', {
      turn_id: turnId, command_id: commandId, text: text || '我在。',
      gesture: { name: state, intensity }, emotion: { name: state === 'idle' ? 'neutral' : state, intensity },
      // A neutral body pose must not mute a spoken reply.
      speak: typeof text === 'string' && !!text.trim(),
    });
  }
  cancel() { return this.request('cancel'); }
  dispose() {
    if (this.closed) return;
    this.closed = true;
    removeEventListener('message', this.onavailable);
    if (this.startup) { clearTimeout(this.startup.timer); this.startup.reject(Error('Avatar disposed')); this.startup = null; }
    this.port?.close();
    for (const call of this.pending.values()) { clearTimeout(call.timer); call.reject(Error('Avatar disposed')); }
    this.pending.clear();
    this.frame.src = 'about:blank';
  }
}
