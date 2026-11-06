/** Serialize playback ownership so late acknowledgements cannot revive an older turn. */
export class AvatarPlayback {
  constructor(client, changed, failed, { now = () => performance.now() } = {}) {
    this.client = client;
    this.now = now;
    this.deadline = 0;
    this.changed = changed;
    this.failed = failed;
    this.version = 0;
    this.closed = false;
    this.timer = null;
  }
  next() {
    this.version++;
    clearTimeout(this.timer);
    return this.version;
  }
  async wait() {
    const version = this.next();
    try {
      await this.client.begin('dsh-' + crypto.randomUUID());
      if (this.current(version)) this.changed({ status: 'listening', state: 'idle' });
    } catch (error) { this.report(version, error); }
  }
  async rest() {
    const version = this.next();
    try {
      await this.client.cancel();
      if (this.current(version)) this.changed({ status: 'idle', state: 'idle' });
    } catch (error) { this.report(version, error); }
  }
  async play(reply) {
    const version = this.next();
    const turn = 'dsh-' + crypto.randomUUID();
    const command = 'reply-' + reply.id;
    try {
      await this.client.begin(turn);
      if (!this.current(version)) return;
      const receipt = await this.client.react(turn, command, reply.reaction.state, reply.text.slice(0, 2000), reply.reaction.intensity);
      if (!this.current(version)) return;
      if (receipt.type !== 'started') throw Error('Avatar rejected the current reply');
      this.deadline = this.now() + 30000;
      this.changed({ status: 'playing', state: reply.reaction.state, reply: reply.id, selected: reply.selected });
      this.poll(version);
    } catch (error) { this.report(version, error); }
  }
  poll(version) {
    this.timer = setTimeout(async () => {
      if (!this.current(version)) return;
      try {
        // The renderer normally ends speech within 24.15 seconds. A wall-clock
        // ceiling also stops a stalled renderer from keeping the mouth alive.
        if (this.now() >= this.deadline) {
          await this.client.cancel();
          if (this.current(version)) this.changed({ status: 'idle', state: 'idle' });
          return;
        }
        const snapshot = await this.client.request('snapshot');
        if (!this.current(version)) return;
        if (snapshot.speechActive || snapshot.state === 'acting') this.poll(version);
        else this.changed({ status: 'idle', state: 'idle' });
      } catch (error) { this.report(version, error); }
    }, 250);
  }
  current(version) { return !this.closed && version === this.version; }
  report(version, error) {
    if (!this.current(version)) return;
    this.failed(error);
    this.changed({ status: 'error', state: 'idle' });
    this.client.cancel().catch(() => {});
  }
  dispose() {
    if (this.closed) return;
    this.closed = true;
    this.next();
    this.client.dispose();
  }
}
