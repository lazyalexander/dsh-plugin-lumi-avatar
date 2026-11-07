import { EMOTION_PROFILES } from './emotion-profiles.mjs';
import { TextSpeech } from './text-speech.mjs';

export const CAPABILITIES = Object.freeze({
  smile: { seconds: 4.8 }, explain: { seconds: 5.4 }, serious: { seconds: 5.4 },
  anxious: { seconds: 4.8 }, embarrassed: { seconds: 5.6 },
  happy: { seconds: 5.6 }, sad: { seconds: 6.4 }, guilty: { seconds: 6.0 },
  laugh: { seconds: 4.8 }, nod: { seconds: 2.8 }, wave: { seconds: 4.6 },
  listen: { seconds: 3.5 }, talk: { seconds: 4.0 }, idle: { seconds: 1.6 },
  ...Object.fromEntries(Object.entries(EMOTION_PROFILES).map(([name, p]) => [name, { seconds: p.seconds }])),
});
const EMOTIONS = new Set([...Object.keys(EMOTION_PROFILES), 'neutral', 'happy', 'amused', 'curious', 'sad', 'guilty', 'serious', 'anxious', 'embarrassed']);
const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * x * (10 + x * (-15 + x * 6)); };

/** Accept bounded response commands; timing and cancellation belong to the app. */
export class AvatarDirector {
  constructor() { this.turn = null; this.active = null; this.events = []; this.seen = new Set(); this.waitingUntil = null; this.expired = false; this.mood = null; this.speech = new TextSpeech(); }
  emit(type, now, extra = {}) { const event = { type, time: now, turn_id: this.turn, ...extra }; this.events.push(event); if (this.events.length > 2048) this.events.splice(0, 1024); return event; }
  beginTurn(turn, now, waitSeconds = 8) {
    if (typeof turn !== 'string' || !turn || turn.length > 100) throw Error('Invalid turn identifier');
    if (this.active) this.emit('cancelled', now, { command_id: this.active.command.command_id, reason: 'new_turn' });
    this.active = null; this.mood = null; this.speech.cancel(); this.turn = turn; this.waitingUntil = now + Math.min(65, Math.max(1, Number.isFinite(waitSeconds) ? waitSeconds : 8)); this.expired = false;
    return this.emit('waiting', now);
  }
  submit(command, now) {
    const reject = reason => this.emit('rejected', now, { command_id: command?.command_id, reason });
    if (!command || typeof command !== 'object' || this.turn === null || typeof command.turn_id !== 'string' || command.turn_id !== this.turn) return reject('stale_turn');
    if (typeof command.command_id !== 'string' || !command.command_id || command.command_id.length > 100) return reject('invalid_command_id');
    const key = command.turn_id + '/' + command.command_id;
    if (this.seen.has(key)) return this.emit('duplicate', now, { command_id: command.command_id });
    if (this.expired) return reject('expired_turn');
    if (typeof command.text !== 'string' || !command.text.trim() || command.text.length > 2000) return reject('empty_or_invalid_reply');
    const gesture = command.gesture, emotion = command.emotion;
    if (!gesture || !Object.hasOwn(CAPABILITIES, gesture.name)) return reject('unsupported_gesture');
    if (!emotion || !EMOTIONS.has(emotion.name)) return reject('unsupported_emotion');
    for (const value of [gesture.intensity, emotion.intensity]) if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return reject('invalid_intensity');
    const hold = command.mood_hold_seconds ?? 0;
    if (typeof hold !== 'number' || !Number.isFinite(hold) || hold < 0 || hold > 30) return reject('invalid_mood_hold');
    if (command.speak !== undefined && typeof command.speak !== 'boolean') return reject('invalid_speech_flag');
    if (this.active) this.emit('cancelled', now, { command_id: this.active.command.command_id, reason: 'replacement' });
    this.seen.add(key);
    // Bound memory over long sessions without allowing an unbounded action queue.
    if (this.seen.size > 512) this.seen.delete(this.seen.values().next().value);
    this.waitingUntil = null;
    const bounded = { turn_id: command.turn_id, command_id: command.command_id, text: command.text.trim(), gesture: { name: gesture.name, intensity: gesture.intensity }, emotion: { name: emotion.name, intensity: emotion.intensity } };
    this.active = { command: bounded, start: now, duration: CAPABILITIES[gesture.name].seconds };
    if (command.speak !== false) this.speech.start(command.text, now, gesture.name); else this.speech.cancel();
    this.mood = hold ? { name: emotion.name, intensity: emotion.intensity * 0.6, until: now + this.active.duration + hold } : null;
    return this.emit('started', now, { command_id: command.command_id, gesture: gesture.name });
  }
  cancel(now, reason = 'cancelled') {
    if (this.active) this.emit('cancelled', now, { command_id: this.active.command.command_id, reason });
    this.active = null; this.waitingUntil = null; this.mood = null; this.speech.cancel();
  }
  sample(now) {
    const speech = this.speech.sample(now);
    if (this.waitingUntil !== null && now >= this.waitingUntil) { this.waitingUntil = null; this.expired = true; this.emit('timeout', now); }
    if (this.active && now >= this.active.start + this.active.duration) {
      this.emit('completed', now, { command_id: this.active.command.command_id }); this.active = null;
    }
    if (!this.active) {
      const mood = this.mood && now < this.mood.until ? this.mood : null;
      return { gesture: this.waitingUntil === null ? 'idle' : 'listen', amount: this.waitingUntil === null ? 0 : 0.35, phase: now, emotion: mood?.name || 'neutral', emotionIntensity: mood ? mood.intensity * ease((mood.until - now) / 4) : 0, state: this.waitingUntil === null ? 'idle' : 'waiting', speech };
    }
    const { command, start, duration } = this.active, phase = Math.max(0, now - start);
    const timing = EMOTION_PROFILES[command.gesture.name]?.timing;
    const attack = timing?.attack ?? 0.32, release = timing?.release ?? 0.65;
    const envelope = ease(phase / attack) * (1 - ease((phase - duration + release) / release));
    return { gesture: command.gesture.name, amount: envelope * command.gesture.intensity, phase, emotion: command.emotion.name, emotionIntensity: envelope * command.emotion.intensity, state: 'acting', command_id: command.command_id, speech };
  }
}
