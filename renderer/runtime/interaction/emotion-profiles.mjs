import data from './emotion-profiles.json' with { type: 'json' };
const freeze = object => { for (const value of Object.values(object)) if (value && typeof value === 'object') freeze(value); return Object.freeze(object); };
export const EMOTION_PROFILES = freeze(data);
export const SAMPLE_STATES = Object.freeze(['explain', 'cute', 'joy', 'laugh', 'serious', 'surprise', 'idle']);
export const FACE_KEYS = Object.freeze([...new Set(Object.values(data).flatMap(p => [...Object.keys(p.face), ...Object.keys(p.facePulse || {})])), 'blinkLeft']);

/** Face depends only on emotion, never on the selected body clip. */
export function emotionFace(name, intensity, phase = 0) {
  const values = Object.fromEntries(FACE_KEYS.map(key => [key, 0]));
  const profile = Object.hasOwn(data, name) ? data[name] : null;
  const amount = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0;
  if (profile) for (const [key, gain] of Object.entries(profile.face)) values[key] = gain * amount;
  if (profile?.facePulse) {
    const pulse = Math.max(0, 1 - phase / profile.pulseSeconds);
    for (const [key, gain] of Object.entries(profile.facePulse)) values[key] += gain * amount * pulse;
  }
  // One short wink, not a continuously twitching eyelid.
  if (name === 'cute') values.blinkLeft = amount * .65 * Math.max(0, 1 - Math.abs(phase - 1.25) / .24);
  return values;
}
