import { EMOTION_PROFILES } from './emotion-profiles.mjs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from './vendor/three-vrm-animation.module.js';

const smooth = x => { x = THREE.MathUtils.clamp(x, 0, 1); return x * x * (3 - 2 * x); };

/** Retarget published clips once; sample normalized bone rotations, not world-space hand targets. */
export class MotionLibrary {
  static async load(vrm) {
    const library = new MotionLibrary(); library.clips = new Map();
    const loader = new GLTFLoader(); loader.register(p => new VRMAnimationLoaderPlugin(p));
    const names = Object.keys(vrm.humanoid.humanBones);
    for (const name of ['idle', 'happy', 'sad', 'guilty', 'laugh', 'wave', 'listen', 'anger', 'cute', 'surprise']) {
      const gltf = await loader.loadAsync(new URL(`./motions/${name}.vrma`, import.meta.url).href);
      const animation = gltf.userData.vrmAnimations?.[0];
      if (!animation || animation.restHipsPosition.y <= 0) throw Error(`Invalid motion rest height: ${name}`);
      const clip = createVRMAnimationClip(animation, vrm), tracks = new Map();
      for (const bone of names) {
        const node = vrm.humanoid.getNormalizedBoneNode(bone);
        const track = clip.tracks.find(t => t.name === node.name + '.quaternion' || t.name === node.uuid + '.quaternion');
        if (track) tracks.set(bone, track.createInterpolant());
      }
      if (tracks.size < 45) throw Error(`Incomplete body/finger motion: ${name} (${tracks.size})`);
      library.clips.set(name, { duration: clip.duration, tracks });
    }
    return library;
  }
  pose(name, time) {
    const clip = this.clips.get(name), t = THREE.MathUtils.clamp(time, 0, clip.duration);
    return new Map([...clip.tracks].map(([bone, sample]) => [bone, new THREE.Quaternion().fromArray(sample.evaluate(t))]));
  }
  sample(time, state) {
    const reference = this.pose('idle', 4.0), idle = this.clips.get('idle');
    const period = idle.duration - 0.7, t = ((time % period) + period) % period;
    const moving = this.pose('idle', t);
    if (t < 0.7) {
      const tail = this.pose('idle', period + t), blend = smooth(t / 0.7);
      for (const [bone, q] of moving) q.copy(tail.get(bone)).slerp(new THREE.Quaternion().fromArray(idle.tracks.get(bone).evaluate(t)), blend);
    }
    // Keep the source's small breathing detail around one quiet standing pose.
    for (const [bone, q] of reference) q.slerp(moving.get(bone), 0.12);
    for (const [side, sign] of [['left', 1], ['right', -1]]) reference.get(side + 'UpperArm').multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -sign * 0.27));
    const profiles = {
      smile: { source: 'happy', seconds: 4.8, gain: 0.36 },
      explain: { source: 'wave', seconds: 5.4, gain: 0.24, oneHand: true },
      serious: { source: 'listen', seconds: 5.4, gain: 0.16 },
      anxious: { source: 'happy', seconds: 4.8, gain: 0.36 },
      embarrassed: { source: 'guilty', seconds: 5.6, gain: 0.72 },
      happy: { seconds: 5.6, gain: 0.78 }, sad: { seconds: 6.4, gain: 0.36 },
      guilty: { seconds: 6.0, gain: 0.90 }, laugh: { seconds: 4.8, gain: 0.52 },
      wave: { seconds: 4.6, gain: 0.84 }, listen: { seconds: 3.5, gain: 0.22 },
    };
    const emotion = EMOTION_PROFILES[state.gesture];
    const profile = emotion ? { ...emotion.body, seconds: emotion.seconds } : profiles[state.gesture];
    if (profile && state.amount > 0) {
      const source = profile.source || state.gesture, clip = this.clips.get(source);
      const phase = state.state === 'waiting' ? 1.8 : state.phase;
      // Source windows keep a single readable reaction at its original pace.
      const start = profile.start ?? 0;
      const end = Math.min(profile.end ?? clip.duration, clip.duration);
      const progress = THREE.MathUtils.clamp(phase / profile.seconds, 0, 1);
      const action = this.pose(source, start + progress * (end - start));
      for (const [bone, rotation] of reference) {
        if (profile.oneHand && !bone.startsWith('right')) continue;
        const finger = /Thumb|Index|Middle|Ring|Little/.test(bone);
        const gain = finger ? (profile.fingerGain ?? profile.gain) : profile.gain;
        const weight = THREE.MathUtils.clamp(state.amount * gain, 0, 1);
        rotation.slerp(action.get(bone), weight);
      }
    }
    // Root and legs belong to the standing-support layer, never the clip mask.
    for (const [bone, q] of reference) if (/^(hips|leftUpperLeg|leftLowerLeg|leftFoot|rightUpperLeg|rightLowerLeg|rightFoot)$/.test(bone)) q.identity();
    for (const [bone, maximum] of [['spine', 0.10], ['chest', 0.17], ['neck', 0.10], ['head', 0.25]]) {
      const q = reference.get(bone), angle = new THREE.Quaternion().angleTo(q);
      if (angle > maximum) q.slerp(new THREE.Quaternion(), 1 - maximum / angle);
    }
    // Pose accents distinguish a pleased response, sadness, apology and laughter.
    const a = state.amount, p = state.phase;
    const accents = emotion && state.gesture !== 'laugh' ? emotion.accent : {
      smile: { head: 0.025, chest: -0.012 },
      explain: { head: 0.03 * Math.sin(p * 2.2), chest: 0.015 },
      serious: { head: 0.035 * Math.sin(p * 1.8), chest: 0.012 },
      anxious: { head: 0.04, chest: 0.035 },
      embarrassed: { head: 0.19, chest: 0.07 },
      happy: { head: -0.025, chest: -0.025 },
      sad: { head: 0.24, chest: 0.07 },
      guilty: { head: 0.24, chest: 0.11 },
      laugh: { head: 0.025 + 0.018 * Math.sin(p * 9), chest: 0.035 + 0.014 * Math.sin(p * 9) },
    }[state.gesture];
    if (accents) for (const [bone, value] of Object.entries(accents)) reference.get(bone).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a * value));
    const tilt = emotion ? emotion.tilt : { smile: 0.055, embarrassed: -0.045, anxious: 0.025 * Math.sin(p * 7) }[state.gesture];
    if (tilt) reference.get('head').multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a * tilt));
    return reference;
  }
  metadata() { return Object.fromEntries([...this.clips].map(([name, clip]) => [name, { seconds: clip.duration, boneTracks: clip.tracks.size }])); }
}
