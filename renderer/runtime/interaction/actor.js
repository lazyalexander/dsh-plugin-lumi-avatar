import { EMOTION_PROFILES, emotionFace } from './emotion-profiles.mjs';
import { PoseTransition } from './pose-transition.js';
import * as THREE from 'three';
import { SecondaryMotion } from './secondary-motion.js';
import { ConstrainedSkirt } from './constrained-skirt.js';
import { StandingSupport } from './standing-support.js';

const vec = a => new THREE.Vector3(...a);
const position = n => n.getWorldPosition(new THREE.Vector3());
const clamp = THREE.MathUtils.clamp;

export class MotionLimiter {
  constructor() { this.states = new Map(); }
  step(name, target, delta) {
    const state = this.states.get(name) || { value: target.clone(), speed: 0 };
    const maxSpeed = /head|neck|Eye/.test(name) ? 1.8 : /Thumb|Index|Middle|Ring|Little/.test(name) ? 5 : 3.2;
    const angle = state.value.angleTo(target), wanted = Math.min(maxSpeed, angle / 0.055);
    state.speed += clamp(wanted - state.speed, -16 * delta, 16 * delta);
    state.value.rotateTowards(target, Math.min(angle, Math.max(0, state.speed) * delta));
    this.states.set(name, state); return state.value;
  }
}

export class AvatarActor {
  constructor(gltf, vrm, nodes, motions) {
    this.gltf = gltf; this.vrm = vrm; this.nodes = nodes; this.motions = motions;
    this.names = Object.keys(vrm.humanoid.humanBones);
    this.motion = new MotionLimiter(); this.transition = new PoseTransition(); this.expressionValues = new Map();
    vrm.humanoid.resetNormalizedPose(); vrm.update(0); vrm.scene.updateMatrixWorld(true);
    this.restHips = this.bone('hips').position.clone();
    this.support = new StandingSupport(vrm, gltf);
    const Cloth = gltf.parser.json.extras?.interactionRig?.cloth?.constrainedSkirtVersion === 3 ? ConstrainedSkirt : SecondaryMotion;
    this.secondary = new Cloth(gltf, vrm, nodes);
    this.faceMeshes = [];
    vrm.scene.traverse(n => { const mi = gltf.parser.associations.get(n)?.meshes; if (n.isMesh && gltf.parser.json.meshes[mi]?.name === 'Face | expression controls') this.faceMeshes.push(n); });
    this.lastState = null;
  }
  bone(name) { return this.vrm.humanoid.getNormalizedBoneNode(name); }
  fitApologyHands(amount, halfSpacing = 0.035) {
    // Source wrists do not meet after retargeting to Lumi's longer forearms.
    // Fit the contact in front of the bodice while retaining source hand twist.
    this.vrm.scene.updateMatrixWorld(true);
    const chest = position(this.bone('chest'));
    for (const [side, sign] of [['left', 1], ['right', -1]]) {
      const upper = this.bone(side + 'UpperArm'), lower = this.bone(side + 'LowerArm'), hand = this.bone(side + 'Hand');
      const start = position(upper), elbow = position(lower), wrist = position(hand);
      const rotation = hand.getWorldQuaternion(new THREE.Quaternion());
      const target = wrist.clone().lerp(chest.clone().add(vec([sign * halfSpacing, -0.095, 0.245])), amount);
      const a = start.distanceTo(elbow), b = elbow.distanceTo(wrist), direction = target.clone().sub(start);
      const distance = clamp(direction.length(), Math.abs(a - b) + 1e-6, a + b - 1e-6); direction.normalize();
      const along = (a * a - b * b + distance * distance) / (2 * distance);
      const pole = elbow.clone().sub(start); pole.addScaledVector(direction, -pole.dot(direction)).normalize();
      const knee = start.clone().addScaledVector(direction, along).addScaledVector(pole, Math.sqrt(Math.max(0, a * a - along * along)));
      this.support.aim(upper, lower, knee); this.support.aim(lower, hand, target); this.support.setWorldRotation(hand, rotation);
    }
  }
  update(time, delta, state) {
    const dt = Math.min(Math.max(delta, 0), 1 / 30), vrm = this.vrm;
    const responseDelta = Math.min(Math.max(delta, 0), 0.1);
    const transitionKey = state.command_id || state.gesture;
    if (this.transition.key !== transitionKey) {
      this.transition.begin(transitionKey, new Map(this.names.map(name => [name, this.bone(name).quaternion])), EMOTION_PROFILES[state.gesture]?.transition?.body ?? .75);
    }
    vrm.humanoid.resetNormalizedPose(); this.bone('hips').position.copy(this.restHips);
    const amount = state.amount, phase = state.phase, laugh = ['laugh', 'amused'].includes(state.emotion) ? state.emotionIntensity : 0;
    const nod = state.gesture === 'nod' ? amount : 0;
    const talk = state.gesture === 'talk' ? amount : 0;
    const pose = this.motions.sample(time, state);
    for (const [name, rotation] of pose) this.bone(name).quaternion.copy(rotation);
    if (state.gesture === 'guilty' || state.gesture === 'embarrassed') this.fitApologyHands(state.gesture === 'embarrassed' ? Math.min(1, amount * 1.35) : amount, state.gesture === 'embarrassed' ? 0.060 : 0.035);
    // Head nods remain a small additive response; body and fingers come from clips.
    if (nod) this.bone('head').quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(vec([1, 0, 0]), nod * 0.11 * Math.sin(phase * 5.3)));
    const recorded = this.capture?.sample(time);
    if (recorded) for (const [name, rotation] of recorded) this.bone(name)?.quaternion.copy(rotation);
    this.transition.advance(responseDelta);
    for (const name of this.names) {
      const target = this.transition.blend(name, this.bone(name).quaternion.clone());
      this.bone(name).quaternion.copy(this.motion.step(name, target, responseDelta));
    }
    this.support.solve(time, state);
    vrm.expressionManager.resetValues();
    const blinkPhase = (time + 1.3) % 4.7, blink = Math.max(0, 1 - Math.abs(blinkPhase - 2.35) / 0.10);
    const faceAmount = state.emotionIntensity;
    const cheerful = state.emotion === 'happy' ? faceAmount : 0;
    const sad = state.emotion === 'sad' ? faceAmount : 0;
    const guilty = state.emotion === 'guilty' ? faceAmount : 0;
    const embarrassed = state.emotion === 'embarrassed' ? faceAmount : 0;
    const serious = state.emotion === 'serious' ? faceAmount : 0;
    const anxious = state.emotion === 'anxious' ? faceAmount : 0;
    const happy = laugh * 0.90 + cheerful * 0.65 + embarrassed * 0.16;
    const laughMouth = laugh * (0.34 + 0.12 * (0.5 + 0.5 * Math.sin(phase * 9)));
    const speech = state.speech?.weights || {};
    const mouth = { aa: Math.max(laughMouth, speech.aa || 0, talk * (0.10 + 0.15 * Math.sin(phase * 8) ** 2)), ih: speech.ih || 0, ou: speech.ou || 0, ee: speech.ee || 0, oh: speech.oh || 0 };
    const mouthScale = Math.min(1, 0.60 / Math.max(0.001, Object.values(mouth).reduce((a, b) => a + b, 0)));
    const desired = {
      ...emotionFace('neutral', 0),
      happy: Math.min(1, happy), SmileEyes: laugh * 0.78 + cheerful * 0.18,
      ...Object.fromEntries(Object.entries(mouth).map(([name, value]) => [name, value * mouthScale])),
      blink: blink * (1 - laugh * 0.9),
      // Existing Sour shapes: worried brows, lowered mouth corners, heavy lids.
      // The preset alone was too weak to counter the model's neutral smile.
      SourMMD_25: sad * 0.85 + guilty * 0.82 + embarrassed * 0.48 + anxious * 0.52,
      SourMMD_19: sad * 0.90 + guilty * 0.95 + serious * 0.18,
      SourMMD_09: sad * 0.16 + guilty * 0.22 + embarrassed * 0.12,
      SourMMD_22: serious * 0.65,
      SourMMD_08: anxious * 0.18,
    };
    if (Object.hasOwn(EMOTION_PROFILES, state.emotion)) {
      const facial = emotionFace(state.emotion, faceAmount, phase);
      for (const key of Object.keys(mouth)) {
        desired[key] = Math.max(desired[key], facial[key] || 0);
        delete facial[key];
      }
      Object.assign(desired, facial);
    }
    const combinedMouth = Object.keys(mouth).reduce((sum, key) => sum + desired[key], 0);
    if (combinedMouth > .60) for (const key of Object.keys(mouth)) desired[key] *= .60 / combinedMouth;
    // Do not stack a full automatic blink on a wink or laughing eyelids.
    desired.blink *= 1 - (desired.blinkLeft || 0);
    for (const side of ['left', 'right']) this.bone(side + 'Eye').rotation.x += sad * 0.035 + guilty * 0.09 + embarrassed * 0.055;
    for (const [name, value] of Object.entries(desired)) {
      const old = this.expressionValues.get(name) || 0, speed = name === 'blink' ? 14 : name in mouth ? 5.0 : 1 / (EMOTION_PROFILES[state.emotion]?.transition?.face ?? .35);
      const next = old + clamp(value - old, -speed * responseDelta, speed * responseDelta);
      this.expressionValues.set(name, next); vrm.expressionManager.setValue(name, next);
    }
    vrm.update(dt); this.secondary.update(dt);
    // Conversation reactions should not make long hair fly out like a dance.
    for (const node of this.secondary.hair) {
      const limit = node.name === 'Ahoge' ? 0.16 : /root|back/.test(node.name) ? 0.08 : 0.18;
      const angle = node.quaternion.angleTo(new THREE.Quaternion());
      if (angle > limit) node.quaternion.slerp(new THREE.Quaternion(), 1 - limit / angle);
    }
    vrm.scene.updateMatrixWorld(true);
    this.lastState = { ...state, time };
  }
  snapshot() {
    const joints = this.nodes.map(([index, n]) => ({ node: index, name: this.gltf.parser.json.nodes[index].name, translation: n.position.toArray(), rotation: n.quaternion.toArray(), scale: n.scale.toArray() }));
    const weights = Array.from(this.faceMeshes[0].morphTargetInfluences);
    const locations = Object.fromEntries(['hips', 'head', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot'].map(name => [name, position(this.vrm.humanoid.getRawBoneNode(name)).toArray()]));
    return { ...this.lastState, joints, weights, expressions: Object.fromEntries(this.expressionValues), locations, faceNode: this.gltf.parser.json.nodes.findIndex(n => n.name === 'Face | expression controls') };
  }
}
