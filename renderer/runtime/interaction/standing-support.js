import * as THREE from 'three';

const position = node => node.getWorldPosition(new THREE.Vector3());
const orientation = node => node.getWorldQuaternion(new THREE.Quaternion());

/** Standing conversation support. Feet retain their model-space rest contacts;
 * pelvis height and two-bone IK preserve knee flexion instead of playing the
 * source character's legs without its root translation. This is not walking IK.
 */
export class StandingSupport {
  constructor(vrm, gltf) {
    this.vrm = vrm; this.hips = this.bone('hips'); this.restHips = this.hips.position.clone();
    this.feet = ['left', 'right'].map(side => {
      const foot = this.bone(side + 'Foot');
      return { side, anchor: position(foot), rotation: orientation(foot), lift: 0, target: position(foot) };
    });
    this.soles = [];
    vrm.scene.traverse(mesh => {
      const index = gltf.parser.associations.get(mesh)?.meshes;
      const name = gltf.parser.json.meshes[index]?.name;
      if (!mesh.isSkinnedMesh || !/^Mary Jane\.[LR]$/.test(name || '')) return;
      const points = [], vertices = mesh.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) if (vertices.getY(i) < 0.004) points.push(i);
      this.soles.push({ mesh, points, side: name.endsWith('.L') ? 'left' : 'right' });
    });
  }
  bone(name) { return this.vrm.humanoid.getNormalizedBoneNode(name); }
  setWorldRotation(node, rotation) {
    node.quaternion.copy(orientation(node.parent).invert().multiply(rotation)); node.updateWorldMatrix(true, true);
  }
  aim(node, child, target) {
    const start = position(node), current = position(child).sub(start).normalize();
    const desired = target.clone().sub(start).normalize();
    this.setWorldRotation(node, new THREE.Quaternion().setFromUnitVectors(current, desired).multiply(orientation(node)));
  }
  solve(time, state) {
    const dt = this.lastTime === undefined ? 1 / 60 : THREE.MathUtils.clamp(time - this.lastTime, 0, 1 / 30); this.lastTime = time;
    const anxious = state.gesture === 'anxious' ? state.amount : 0;
    // Two small right-foot taps, with a planted supporting foot. Cancellation
    // returns the lifted foot at a bounded speed instead of snapping it down.
    const pulse = start => { const t = (state.phase - start) / 0.72; return t > 0 && t < 1 ? Math.sin(Math.PI * t) ** 2 : 0; };
    const wantedLift = 0.04 * anxious * (pulse(0.9) + pulse(2.05));
    const laugh = state.gesture === 'laugh' ? state.amount : 0;
    // A few millimetres of breathing/knee compliance; no lateral root travel.
    this.hips.position.copy(this.restHips);
    this.hips.position.y -= 0.007 + 0.0008 * Math.sin(time * 1.45) + laugh * 0.003;
    this.hips.quaternion.identity(); this.vrm.scene.updateMatrixWorld(true);
    for (const record of this.feet) {
      const { side, anchor, rotation } = record;
      const wanted = side === 'right' ? wantedLift : 0;
      record.lift += THREE.MathUtils.clamp(wanted - record.lift, -0.24 * dt, 0.18 * dt);
      const target = record.target.copy(anchor); target.y += record.lift;
      const upper = this.bone(side + 'UpperLeg'), lower = this.bone(side + 'LowerLeg'), foot = this.bone(side + 'Foot');
      const start = position(upper), a = start.distanceTo(position(lower)), b = position(lower).distanceTo(position(foot));
      const direction = target.clone().sub(start), distance = THREE.MathUtils.clamp(direction.length(), Math.abs(a - b) + 1e-6, a + b - 1e-6);
      direction.normalize();
      const along = (a * a - b * b + distance * distance) / (2 * distance);
      // Knees point forward and remain on their own side of the centre line.
      const forward = new THREE.Vector3(0, 0, 1).addScaledVector(direction, -direction.z).normalize();
      const knee = start.clone().addScaledVector(direction, along).addScaledVector(forward, Math.sqrt(Math.max(0, a * a - along * along)));
      this.aim(upper, lower, knee); this.aim(lower, foot, target); this.setWorldRotation(foot, rotation);
    }
  }
  probe() {
    const soles = this.soles.map(({ mesh, points, side }) => {
      const p = new THREE.Vector3(), heights = points.map(i => { mesh.getVertexPosition(i, p); mesh.localToWorld(p); return p.y; });
      return { side, minimum: Math.min(...heights), maximum: Math.max(...heights) };
    });
    const feet = this.feet.map(({ side, anchor, rotation, target, lift }) => {
      const foot = this.vrm.humanoid.getRawBoneNode(side + 'Foot');
      return { side, anchor: anchor.toArray(), position: position(foot).toArray(), driftMetres: position(foot).distanceTo(anchor), targetErrorMetres: position(foot).distanceTo(target), plannedLiftMetres: lift, tiltRadians: orientation(foot).angleTo(rotation), knee: position(this.vrm.humanoid.getRawBoneNode(side + 'LowerLeg')).toArray() };
    });
    return { feet, soles, mode: 'standing support with bounded right-foot taps; not locomotion' };
  }
}
