import * as THREE from 'three';

const point = node => node.getWorldPosition(new THREE.Vector3());
const quaternion = node => node.getWorldQuaternion(new THREE.Quaternion());
const clamp = THREE.MathUtils.clamp;

/** Reduced garment cage with hard leg contact and damped release. */
export class SecondaryMotion {
  constructor(gltf, vrm, sourceNodes) {
    this.vrm = vrm;
    this.gltf = gltf;
    this.config = gltf.parser.json.extras?.interactionRig;
    this.nodes = new Map(sourceNodes);
    this.hips = vrm.humanoid.getRawBoneNode('hips');
    this.inverseHips = new THREE.Matrix4();
    this.clothMeshes = [];
    vrm.scene.traverse(n => {
      const mi = gltf.parser.associations.get(n)?.meshes;
      const contactNames = this.config?.cloth.contactMeshNames || ['Dress | continuous bell, hem and lining'];
      if (n.isSkinnedMesh && contactNames.includes(gltf.parser.json.meshes[mi]?.name)) this.clothMeshes.push(n);
    });
    this.cage = (this.config?.cloth.bones || []).map(b => ({ ...b, node: this.nodes.get(b.node), rest: new THREE.Vector3(...b.rest), radial: new THREE.Vector3(b.rest[0], 0, b.rest[2] - this.config.cloth.centreZ).normalize(), offset: 0 }));
    this.skinToCage = new Map(this.cage.map((b, i) => [gltf.parser.json.skins[0].joints.indexOf(this.config.cloth.bones[i].node), i]));
    const rootRest = new THREE.Vector3();
    for (let n = this.hips; n; n = n.parent) rootRest.add(n.position);
    this.contacts = [];
    for (const mesh of this.clothMeshes) {
      const p = mesh.geometry.attributes.position, ji = mesh.geometry.attributes.skinIndex, we = mesh.geometry.attributes.skinWeight;
      // Dense samples cover actual garment geometry, not just the 80 cage nodes.
      for (let i = 0; i < p.count; i += 3) {
        const indices = [ji.getX(i), ji.getY(i), ji.getZ(i), ji.getW(i)].map(j => this.skinToCage.get(j));
        const weights = [we.getX(i), we.getY(i), we.getZ(i), we.getW(i)];
        this.contacts.push({ x: p.getX(i) - rootRest.x, y: p.getY(i) - rootRest.y, z: p.getZ(i) - rootRest.z, indices, weights });
      }
    }
    this.hair = sourceNodes.filter(([i]) => /^(Hair[._]|Ahoge)/.test(gltf.parser.json.nodes[i].name)).map(([, n]) => n);
    this.lastHip = null;
    this.inertia = new THREE.Vector3();
    this.stats = { contactCorrections: 0, maxOffset: 0, maxProjection: 0 };
  }

  reset() {
    for (const b of this.cage) { b.offset = 0; b.node.position.copy(b.rest); }
    this.lastHip = null; this.inertia.set(0, 0, 0);
    this.stats = { contactCorrections: 0, maxOffset: 0, maxProjection: 0 };
  }

  capsules() {
    this.hips.updateWorldMatrix(true, true);
    this.inverseHips.copy(this.hips.matrixWorld).invert();
    const output = [];
    for (const side of ['left', 'right']) {
      const names = ['UpperLeg', 'LowerLeg', 'Foot'];
      const p = names.map(name => point(this.vrm.humanoid.getRawBoneNode(side + name)).applyMatrix4(this.inverseHips));
      for (let j = 0; j < 2; j++) output.push({ a: p[j], b: p[j + 1], radius: j === 0 ? 0.043 : 0.039, side, segment: j });
    }
    return output;
  }

  update(delta) {
    if (!this.config) return;
    const dt = Math.min(Math.max(delta, 0), 1 / 30), capsules = this.capsules();
    for (const item of this.config.elbows) {
      const node = this.nodes.get(item.node);
      const upper = this.vrm.humanoid.getRawBoneNode(item.side + 'UpperArm');
      const lower = this.vrm.humanoid.getRawBoneNode(item.side + 'LowerArm');
      const desired = quaternion(upper).slerp(quaternion(lower), 0.5);
      node.quaternion.copy(quaternion(node.parent).invert().multiply(desired));
    }
    const hipPosition = point(this.hips);
    const velocity = this.lastHip && dt > 0 ? hipPosition.clone().sub(this.lastHip).divideScalar(dt).applyQuaternion(quaternion(this.hips).invert()) : new THREE.Vector3();
    this.lastHip = hipPosition;
    const inertiaTarget = velocity.multiplyScalar(-0.018).clampLength(0, 0.012); inertiaTarget.y = 0;
    this.inertia.lerp(inertiaTarget, 1 - Math.exp(-dt * 7));
    const required = new Float64Array(this.cage.length);
    for (let i = 0; i < this.cage.length; i++) {
      const node = this.cage[i]; if (node.row === 0) continue;
      const dir = node.radial, baseRadius = Math.hypot(node.rest.x, node.rest.z - this.config.cloth.centreZ);
      for (const c of capsules) {
        const t = clamp((node.rest.y - c.a.y) / ((c.b.y - c.a.y) || 1e-9), 0, 1);
        const x = THREE.MathUtils.lerp(c.a.x, c.b.x, t), y = THREE.MathUtils.lerp(c.a.y, c.b.y, t), z = THREE.MathUtils.lerp(c.a.z, c.b.z, t) - this.config.cloth.centreZ;
        const verticalBand = 0.105;
        const dy = Math.max(0, Math.abs(y - node.rest.y) - verticalBand);
        const radius = c.radius + this.config.cloth.clearanceMetres + 0.025;
        if (dy >= radius) continue;
        const projected = x * dir.x + z * dir.z;
        const perpendicular = x * x + z * z - projected * projected;
        const sphereRadiusSq = radius * radius - dy * dy;
        if (projected < 0 || perpendicular > sphereRadiusSq) continue;
        required[i] = Math.max(required[i], projected + Math.sqrt(Math.max(0, sphereRadiusSq - perpendicular)) - baseRadius);
      }
    }
    const n = this.config.cloth.sectors;
    for (let i = 0; i < this.cage.length; i++) {
      const node = this.cage[i]; if (node.row === 0) { node.offset = 0; continue; }
      const previous = node.row * n + (node.sector + n - 1) % n, next = node.row * n + (node.sector + 1) % n;
      const target = Math.max(required[i], required[previous] * 0.45, required[next] * 0.45, 0);
      node.offset = Math.min(0.45, Math.max(target, node.offset * Math.exp(-dt * 8)));
    }
    // Refine against the real skinned surface. Corrections are distributed
    // through its existing four cage weights; no legs or cloth are hidden.
    let corrections = 0, maxProjection = 0;
    for (let iteration = 0; iteration < 3; iteration++) {
      for (const v of this.contacts) {
        let x = v.x, y = v.y, z = v.z;
        for (let k = 0; k < 4; k++) {
          const b = this.cage[v.indices[k]]; if (!b) continue;
          x += b.radial.x * b.offset * v.weights[k]; z += b.radial.z * b.offset * v.weights[k];
        }
        const radiusFromCentre = Math.hypot(x, z - this.config.cloth.centreZ);
        if (radiusFromCentre < 1e-5) continue;
        const ex = x / radiusFromCentre, ez = (z - this.config.cloth.centreZ) / radiusFromCentre;
        let displacement = 0;
        for (const c of capsules) {
          const bx = c.b.x - c.a.x, by = c.b.y - c.a.y, bz = c.b.z - c.a.z;
          const t = clamp(((x - c.a.x) * bx + (y - c.a.y) * by + (z - c.a.z) * bz) / (bx * bx + by * by + bz * bz), 0, 1);
          const dx = x - c.a.x - bx * t, dy = y - c.a.y - by * t, dz = z - c.a.z - bz * t;
          const r = c.radius + this.config.cloth.clearanceMetres;
          const distanceSq = dx * dx + dy * dy + dz * dz;
          if (distanceSq >= r * r) continue;
          const along = dx * ex + dz * ez;
          displacement = Math.max(displacement, -along + Math.sqrt(Math.max(0, along * along - distanceSq + r * r)));
        }
        if (displacement < 0.0002) continue;
        const sum = v.weights.reduce((s, w, k) => s + (this.cage[v.indices[k]]?.row > 0 ? w * w : 0), 0);
        if (sum < 0.025) continue; // Nearly anchored waist samples must not amplify corrections.
        displacement = Math.min(displacement + 0.001, 0.025);
        for (let k = 0; k < 4; k++) {
          const b = this.cage[v.indices[k]]; if (!b || b.row === 0) continue;
          const alignment = Math.max(0.5, b.radial.x * ex + b.radial.z * ez);
          b.offset = Math.min(0.45, b.offset + Math.min(0.012, displacement * v.weights[k] / sum / alignment * 0.65));
        }
        corrections++; maxProjection = Math.max(maxProjection, displacement);
      }
    }
    // Spread large local bulges into neighbours without inflating the whole skirt.
    const smooth = this.cage.map(b => b.offset);
    for (const b of this.cage) {
      if (!b.row) continue;
      const prev = b.row * n + (b.sector + n - 1) % n, next = b.row * n + (b.sector + 1) % n;
      b.offset = Math.max(b.offset, smooth[prev] * .65, smooth[next] * .65);
    }
    // Radial-only escape fails when a lifted knee reaches the upper skirt.
    // Resolve remaining contacts in three dimensions so fabric can lift over
    // the knee instead of expanding metres sideways. Waist anchors stay fixed.
    const local = this.cage.map(() => new THREE.Vector3());
    for (let iteration = 0; iteration < 8; iteration++) for (const v of this.contacts) {
      const p = new THREE.Vector3(v.x, v.y, v.z);
      for (let k = 0; k < 4; k++) {
        const j = v.indices[k], b = this.cage[j]; if (!b) continue;
        p.addScaledVector(b.radial, b.offset * v.weights[k]).addScaledVector(local[j], v.weights[k]);
      }
      for (const c of capsules) {
        const axis = c.b.clone().sub(c.a), t = clamp(p.clone().sub(c.a).dot(axis) / axis.lengthSq(), 0, 1);
        const normal = p.clone().sub(c.a.clone().addScaledVector(axis, t));
        const distance = normal.length(), radius = c.radius + this.config.cloth.clearanceMetres + .003;
        if (distance >= radius || distance < 1e-7) continue;
        normal.divideScalar(distance);
        const sum = v.weights.reduce((s,w,k) => s + (this.cage[v.indices[k]]?.row > 0 ? w*w : 0),0);
        if (sum < .005) continue;
        for (let k = 0; k < 4; k++) {
          const j = v.indices[k], b = this.cage[j]; if (!b?.row) continue;
          local[j].addScaledVector(normal, Math.min(.015, (radius-distance)*v.weights[k]/sum*.65)).clampLength(0,.20);
        }
      }
    }
    for (const [i, b] of this.cage.entries()) {
      b.node.position.copy(b.rest).addScaledVector(b.radial, b.offset).add(local[i]);
      if (b.row) b.node.position.addScaledVector(this.inertia, b.row / 4);
      this.stats.maxOffset = Math.max(this.stats.maxOffset, b.offset);
    }
    this.stats.contactCorrections = corrections;
    this.stats.maxProjection = maxProjection;
    // Preserve the hairstyle while bounding the inherited spring rig's swing.
    const identity = new THREE.Quaternion();
    for (const node of this.hair) {
      const angle = node.quaternion.angleTo(identity), limit = node.name === 'Ahoge' ? 0.40 : 0.62;
      if (angle > limit) node.quaternion.slerp(identity, 1 - limit / angle);
    }
    this.vrm.scene.updateMatrixWorld(true);
  }

  probe() {
    const capsules = this.capsules(), p = new THREE.Vector3();
    let sampled = 0, contacts = 0, maximumDepth = 0;
    for (const mesh of this.clothMeshes) for (let i = 0; i < mesh.geometry.attributes.position.count; i += 3) {
      mesh.getVertexPosition(i, p); mesh.localToWorld(p); p.applyMatrix4(this.inverseHips); sampled++;
      let depth = 0;
      for (const c of capsules) {
        const direction = c.b.clone().sub(c.a);
        const t = clamp(p.clone().sub(c.a).dot(direction) / direction.lengthSq(), 0, 1);
        const distance = p.distanceTo(c.a.clone().addScaledVector(direction, t));
        depth = Math.max(depth, c.radius - distance);
      }
      if (depth > 0.001) { contacts++; maximumDepth = Math.max(maximumDepth, depth); }
    }
    return { sampledGarmentVertices: sampled, capsuleIntersections: contacts, maximumDepthMetres: maximumDepth, cage: this.config ? { ...this.stats } : null, definition: 'Dense garment vertices against leg capsule proxies, 1 mm reporting tolerance; not an exhaustive triangle/self-collision proof' };
  }
}
