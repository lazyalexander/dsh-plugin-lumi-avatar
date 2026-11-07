import { EMOTION_PROFILES, SAMPLE_STATES } from './emotion-profiles.mjs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import { AvatarDirector } from './director.mjs';
import { AvatarActor } from './actor.js';
import { MotionLibrary } from './motion-library.js';
import { connectChat } from './chat-ui.js';
import { connectAvatarEmbed } from './embed-bridge.mjs';
import { MotionCapture } from './capture-ui.js';

const stage = document.querySelector('#stage'), renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace; stage.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#fafafa');
const floor = new THREE.Mesh(new THREE.CircleGeometry(0.30, 64), new THREE.MeshBasicMaterial({ color: 0xe7eaf0, transparent: true, opacity: 0.65, depthWrite: false }));
floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.001, 0.025); scene.add(floor);
for (const sign of [-1, 1]) {
  const contact = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: 0x7f8798, transparent: true, opacity: 0.14, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.scale.set(0.035, 0.073, 1); contact.position.set(sign * 0.06765, 0.0001, 0.045); scene.add(contact);
}
scene.add(new THREE.HemisphereLight(0xffffff, 0xc5ceda, 0.65));
const light = new THREE.DirectionalLight(0xffffff, 0.85); light.position.set(-2, 3, 4); scene.add(light);
const loader = new GLTFLoader(); loader.register(p => new VRMLoaderPlugin(p));
let gltf, vrm, motions, actor, director, nodes, rawRest, camera, kind = 'full', angle = 0, elevation = 'gentle', clock = 0, wall, sequence = 0;
let manual = new URLSearchParams(location.search).has('manual');
let capture;
const embedded = new URLSearchParams(location.search).has('embed');
if (embedded) {
  document.documentElement.classList.add('embedded');
  const css = document.createElement('style');
  css.textContent = 'aside{display:none!important}#stage{inset:0!important;width:100%!important;height:100%!important}';
  document.head.append(css);
}
const source = new URLSearchParams(location.search).get('model') || '/assets/Lumi.vrm';
const status = document.querySelector('#status');
const render = () => {
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
};
function view(nextKind = kind, nextAngle = angle, nextElevation = elevation) {
  kind = nextKind; angle = nextAngle; elevation = nextElevation === 'level' ? 'level' : 'gentle';
  const width = stage.clientWidth, height = stage.clientHeight; renderer.setSize(width, height);
  const centre = new THREE.Vector3(0, kind === 'full' ? 0.86 : kind === 'face' ? 1.43 : 1.25, 0.02);
  let span = kind === 'full' ? 1.92 : kind === 'face' ? 0.49 : 0.91;
  if (kind === 'feet') { centre.set(0, 0.14, 0.025); span = 0.42; }
  if (kind === 'hand') { centre.copy(vrm.humanoid.getRawBoneNode('rightMiddleIntermediate').getWorldPosition(new THREE.Vector3())); span = 0.18; }
  if (kind === 'apron') { centre.set(0, 0.66, 0.13); span = 0.56; }
  if (kind === 'full' && (embedded || angle !== 0)) {
    const bounds = new THREE.Box3().setFromObject(vrm.scene, true);
    const right = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    let extent = 0;
    for (const x of [bounds.min.x, bounds.max.x]) for (const z of [bounds.min.z, bounds.max.z]) extent = Math.max(extent, Math.abs(new THREE.Vector3(x, centre.y, z).sub(centre).dot(right)));
    span = Math.max(span, extent * 2.12 * height / width);
  }
  const horizontal = span * width / height;
  camera = new THREE.OrthographicCamera(-horizontal / 2, horizontal / 2, span / 2, -span / 2, 0.01, 100);
  const pitchDegrees = elevation === 'level' ? 0 : 8;
  camera.position.copy(centre).add(new THREE.Vector3(Math.sin(angle) * 5, Math.tan(pitchDegrees * Math.PI / 180) * 5, Math.cos(angle) * 5)); camera.lookAt(centre); render();
  document.querySelector('#level')?.setAttribute('aria-pressed', String(elevation === 'level'));
  document.querySelector('#gentle')?.setAttribute('aria-pressed', String(elevation === 'gentle'));
  return { kind, angle, elevation, pitchDegrees, position: camera.position.toArray(), centre: centre.toArray(), height: span, width: horizontal };
}
function reset() {
  for (const [i, node] of nodes) { const rest = rawRest.get(i); node.position.copy(rest.position); node.quaternion.copy(rest.rotation); }
  vrm.humanoid.resetNormalizedPose(); vrm.expressionManager.resetValues(); vrm.update(0); vrm.springBoneManager?.reset();
  actor = new AvatarActor(gltf, vrm, nodes, motions); director = new AvatarDirector(); clock = 0;
  actor.capture = capture;
  for (let i = -300; i <= 0; i++) actor.update(i / 60, 1 / 60, director.sample(i / 60));
  actor.secondary.reset(); actor.update(0, 1 / 60, director.sample(0));
  return actor.snapshot();
}
const replies = { joy: '哇，居然成功了！这真是个惊喜。', surprise: '诶？怎么突然变成这样了？让我确认一下。', anger: '这样不公平，我觉得应该认真说清楚。', delight: '这样慢慢聊着，就觉得很舒服呢。', cute: '嘿嘿，今天也想要一点点夸奖呀。', smile: '你回来啦，见到你真好。', explain: '我慢慢说，我们先从第一步开始。', serious: '这件事要认真说清楚，我会把事实和猜测分开。', anxious: '哎呀，怎么还差一点点！快一点，再快一点。', embarrassed: '唔，是我说错了，对不起。我这次记清楚了。', happy: '真好，听到这个我很开心。', sad: '有点难过，想安静一会儿。', guilty: '对不起，我会认真改好的。', laugh: '噗，怎么会这样啦，真的被你逗笑了。', nod: '嗯，我在听。', wave: '嗨，见到你真好。', listen: '我在，继续说吧。', talk: '让我想想，慢慢和你说。', idle: '好呀。' };
const sceneLabels = { ...Object.fromEntries(Object.entries(EMOTION_PROFILES).map(([k, p]) => [k, p.label])), idle: '安静待机', smile: '微笑', explain: '平静说明', serious: '严肃说明', anxious: '着急', embarrassed: '不好意思', happy: '开心', sad: '哀', guilty: '愧疚', laugh: '大笑', nod: '轻轻点头', wave: '挥手', listen: '倾听', talk: '说话' };
function trigger(name, intensity = 0.65) {
  const turn = `local-${++sequence}`;
  director.beginTurn(turn, clock);
  const emotion = Object.hasOwn(EMOTION_PROFILES, name) ? name : ({ laugh: 'amused', smile: 'happy', wave: 'happy' })[name] || (['happy', 'sad', 'guilty', 'serious', 'anxious', 'embarrassed'].includes(name) ? name : 'neutral');
  const command = { turn_id: turn, command_id: turn + '-response', text: replies[name] || '我在听。', emotion: { name: emotion, intensity }, gesture: { name, intensity }, speak: !['idle', 'listen'].includes(name) };
  const receipt = director.submit(command, clock);
  document.querySelector('#previewNote').textContent = command.text;
  status.textContent = sceneLabels[name] || '和你聊天';
  return { command, receipt };
}
function step(time, draw = true) {
  if (time < clock) throw Error('Use reset before seeking backwards');
  while (clock + 1e-8 < time) { clock = Math.min(time, clock + 1 / 60); actor.update(clock, 1 / 60, director.sample(clock)); }
  const state = actor.snapshot();
  status.textContent = state.state === 'waiting' ? '正在听你说' : state.speech?.active && state.gesture === 'idle' ? '和你说话' : sceneLabels[state.gesture];
  document.querySelectorAll('[data-gesture]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.gesture === state.gesture)));
  if (draw) render(); return state;
}
try {
  gltf = await loader.loadAsync(source); vrm = gltf.userData.vrm; if (!vrm) throw Error('No VRM');
  // This one-actor stage always draws its character. Re-skinning every vertex
  // on the CPU for a fresh culling sphere was more expensive than drawing it.
  vrm.scene.traverse(n => { if (n.isSkinnedMesh) n.frustumCulled = false; });
  vrm.lookAt.autoUpdate = false; scene.add(vrm.scene);
  nodes = await Promise.all(gltf.parser.json.skins[0].joints.map(async i => [i, await gltf.parser.getDependency('node', i)]));
  rawRest = new Map(nodes.map(([i, n]) => [i, { position: n.position.clone(), rotation: n.quaternion.clone() }]));
  motions = await MotionLibrary.load(vrm);
  reset(); view('full', 0, embedded ? 'level' : 'gentle'); status.textContent = '安静待机';
  window.lumi = {
    trigger, reset() { const result = reset(); render(); return result; }, step, view,
    manual(value = true) { manual = value; wall = undefined; },
    beginTurn(turn, waitSeconds = 8) { return director.beginTurn(turn, clock, waitSeconds); },
    cancel() { return director.cancel(clock); },
    respond(command) {
      const receipt = director.submit(command, clock);
      if (receipt.type === 'started' || (receipt.type === 'rejected' && !['stale_turn', 'expired_turn'].includes(receipt.reason) && typeof command?.text === 'string' && command.text.trim() && command.text.length <= 2000)) document.querySelector('#reply')?.replaceChildren(document.createTextNode(command.text));
      return receipt;
    },
    events() { return structuredClone(director.events); },
    snapshot() { return actor.snapshot(); },
    probe() { return actor.secondary.probe(); },
    support() { return actor.support.probe(); },
    metadata() { const chat = window.lumiChat?.snapshot(); const live = chat?.connected && chat?.providerKind === 'deepseek'; return { source, skinJoints: nodes.length, faceMorphs: actor.faceMeshes[0].morphTargetInfluences.length, localDemo: !live, providerConnected: !!live, movementMode: 'standing with small right-foot taps', emotionalStates: SAMPLE_STATES, mouthMode: 'text-paced; no audio', cameraElevation: elevation, motions: motions.metadata(), garmentCage: actor.secondary.cage.length, limits: { bodyRadiansPerSecond: 3.2, headRadiansPerSecond: 1.8, fingerRadiansPerSecond: 5 } }; },
  };
  if (embedded) connectAvatarEmbed(window.lumi);
  else capture = new MotionCapture(window.lumi);
  actor.capture = capture;
  window.lumi.capture = capture;
  window.ready = true;
} catch (error) { window.failure = String(error.stack || error); status.textContent = window.failure; console.error(error); }
document.querySelectorAll('[data-gesture]').forEach(button => button.onclick = () => {
  const name = button.dataset.gesture;
  trigger(name);
});
document.querySelector('#full').onclick = () => view('full'); document.querySelector('#upper').onclick = () => view('upper');
document.querySelector('#level').onclick = () => view(kind, angle, 'level'); document.querySelector('#gentle').onclick = () => view(kind, angle, 'gentle');
if (window.ready && !embedded) void connectChat(window.lumi);
if (window.ready && embedded) window.chatReady = true;
addEventListener('resize', () => vrm && view());
function animate() {
  // RAF's timestamp can predate a long model reset in the same browser turn.
  // Read execution time here so resuming cannot consume time before resume.
  const now = performance.now();
  requestAnimationFrame(animate); if (!vrm || !actor || manual) return;
  const delta = wall === undefined ? 0 : Math.max(0, (now - wall) / 1000); wall = now;
  // Sample the current pose once per displayed frame. Re-running expensive
  // cloth for missed display frames creates a catch-up spiral under load.
  // Physics has its own bounded step; animation keeps the source wall time.
  clock += delta; actor.update(clock, delta, director.sample(clock));
  step(clock);
}
document.addEventListener('visibilitychange', () => { wall = undefined; });
requestAnimationFrame(animate);
