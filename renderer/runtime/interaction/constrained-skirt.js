import * as THREE from 'three';
import { SecondaryMotion } from './secondary-motion.js';

/** Position-based cage experiment. Full body geometry remains visible.
 * Structural/shear constraints follow Mueller et al. (2006), not donor assets.
 * This is a reduced cage, not a self-colliding triangle cloth solver.
 */
export class ConstrainedSkirt extends SecondaryMotion {
  constructor(gltf, vrm, nodes) {
    super(gltf, vrm, nodes);
    this.particles = this.cage.map(b => ({ p: b.rest.clone(), v: new THREE.Vector3(), w: b.row ? 1 : 0 }));
    this.edges = [];
    const n = this.config.cloth.sectors, rows = this.cage.length / n;
    const edge = (a, b, stiffness) => this.edges.push({ a, b, length: this.cage[a].rest.distanceTo(this.cage[b].rest), stiffness });
    for (let r = 0; r < rows; r++) for (let s = 0; s < n; s++) {
      const a = r * n + s;
      edge(a, r * n + (s + 1) % n, .8);
      if (r + 1 < rows) {
        edge(a, a + n, .95);
        edge(a, (r + 1) * n + (s + 1) % n, .35);
        edge(a, (r + 1) * n + (s + n - 1) % n, .35);
      }
      if (r + 2 < rows) edge(a, a + n * 2, .12);
    }
    this.initialized = false;
    this.previousCapsules = null;
    this.previousHips = null;
    this.contactProfile = this.config.cloth.contactProfile || {};
    this.solverContacts = this.contacts.filter((_, i) => i % (this.contactProfile.sampleStride || 3) === 0);
    this.contactResiduals = this.solverContacts.map(v => {
      const local = new THREE.Vector3(v.x, v.y, v.z);
      let sum = 0, weight = 0;
      for (let k = 0; k < 4; k++) {
        const bone = this.cage[v.indices[k]];
        if (bone) { local.addScaledVector(bone.rest, -v.weights[k]); sum += v.weights[k]; weight += this.particles[v.indices[k]].w * v.weights[k] ** 2; }
      }
      return { local, world: new THREE.Vector3(), missing: 1-sum, weight };
    });
  }

  reset() {
    super.reset();
    this.initialized = false;
    this.previousCapsules = null;
    this.previousHips = null;
    for (const p of this.particles) p.v.set(0, 0, 0);
  }

  update(delta) {
    const localCapsules = this.capsules(), matrix = this.hips.matrixWorld;
    const caps = localCapsules.map(c => ({ ...c, a: c.a.clone().applyMatrix4(matrix), b: c.b.clone().applyMatrix4(matrix) }));
    const targets = this.cage.map(b => b.rest.clone().applyMatrix4(matrix));
    if (this.previousHips && delta > 0) {
      // The stiff underskirt transports most root motion. Leave a bounded
      // inertial residual rather than letting a rapid turn invert the cage.
      const transport = matrix.clone().multiply(this.previousHips.clone().invert());
      const rotation = new THREE.Quaternion().setFromRotationMatrix(transport);
      const carriedRotation = new THREE.Quaternion().slerp(rotation, .9);
      for (const particle of this.particles) {
        particle.p.lerp(particle.p.clone().applyMatrix4(transport), .9);
        particle.v.applyQuaternion(carriedRotation);
      }
    }
    this.previousHips = matrix.clone();
    if (!this.initialized) {
      this.particles.forEach((p, i) => { p.p.copy(targets[i]); p.v.set(0, 0, 0); });
      this.initialized = true;
    }
    const duration = Math.min(Math.max(delta, 0), 1 / 30);
    const steps = Math.max(1, Math.ceil(duration * 120)), dt = duration / steps;
    const oldCaps = this.previousCapsules || caps;
    let corrections = 0;
    const axis = new THREE.Vector3(), normal = new THREE.Vector3(), point = new THREE.Vector3(), shift = new THREE.Vector3();
    const hipCentre = new THREE.Vector3().setFromMatrixPosition(matrix);
    const outward = new THREE.Vector3(), centre = new THREE.Vector3();
    const linear = new THREE.Matrix3().setFromMatrix4(matrix);
    // Rest residuals and inverse constraint masses are immutable. Reuse their
    // storage instead of allocating a matrix and several vectors per sample.
    for (const r of this.contactResiduals) r.world.copy(r.local).applyMatrix3(linear).addScaledVector(hipCentre, r.missing);
    for (let sub = 0; sub < steps; sub++) {
      const colliders = caps.map((c, i) => ({ radius: c.radius + (this.contactProfile.margin ?? .012), a: oldCaps[i].a.clone().lerp(c.a, (sub + 1) / steps), b: oldCaps[i].b.clone().lerp(c.b, (sub + 1) / steps) }));
      // Both closest-point and radial escape contacts lie inside this cylinder.
      // Reject distant skirt samples before the four expensive capsule tests;
      // retain exactly the same samples, iterations and contact resolution.
      const contactMinY = Math.min(...colliders.flatMap(c => [c.a.y-c.radius,c.b.y-c.radius]));
      const contactMaxY = Math.max(...colliders.flatMap(c => [c.a.y+c.radius,c.b.y+c.radius]));
      const contactRadiusSq = Math.max(...colliders.flatMap(c => [c.a,c.b].map(p => Math.hypot(p.x-hipCentre.x,p.z-hipCentre.z)+c.radius))) ** 2;
      const old = this.particles.map(p => p.p.clone());
      this.particles.forEach((p, i) => {
        if (!p.w) { p.p.copy(targets[i]); return; }
        // A weak silhouette spring represents the structured petticoat.
        p.v.addScaledVector(targets[i].clone().sub(p.p), dt * 35);
        p.v.y -= 1.2 * dt;
        p.v.multiplyScalar(Math.exp(-dt * 8));
        p.p.addScaledVector(p.v, dt);
      });
      for (let iteration = 0; iteration < (this.contactProfile.iterations || 10); iteration++) {
        for (const e of this.edges) {
          const a = this.particles[e.a], b = this.particles[e.b], sum = a.w + b.w;
          if (!sum) continue;
          shift.copy(b.p).sub(a.p); const distance = shift.length();
          if (distance < 1e-8) continue;
          shift.multiplyScalar((distance - e.length) / distance * e.stiffness / sum);
          a.p.addScaledVector(shift, a.w); b.p.addScaledVector(shift, -b.w);
        }
        // Distance constraints alone accept a reflected/folded cage. Keep the
        // painted sectors in their angular neighbourhood and each vertical
        // strip below its parent; allow local lift, radial contact and sway.
        const sectors = this.config.cloth.sectors, centreZ = this.config.cloth.centreZ;
        const local = this.particles.map(p => p.p.clone().applyMatrix4(this.inverseHips));
        for (let i = sectors; i < this.particles.length; i++) {
          const p = local[i], b = this.cage[i];
          const rx = this.config.cloth.radii[b.row][0], rz = this.config.cloth.radii[b.row][1];
          const angle = Math.atan2(p.x / rx, (p.z - centreZ) / rz);
          const restAngle = b.sector * Math.PI * 2 / sectors;
          const drift = Math.atan2(Math.sin(angle - restAngle), Math.cos(angle - restAngle));
          const limit = .35; // 20 degrees: preserve modest material shear.
          const limited = restAngle + THREE.MathUtils.clamp(drift, -limit, limit);
          const radius = Math.max(.60, Math.hypot(p.x / rx, (p.z - centreZ) / rz));
          p.x = Math.sin(limited) * radius * rx;
          p.z = centreZ + Math.cos(limited) * radius * rz;
          // Allow compression and a small local fold over the knee.
          p.y = Math.min(p.y, local[i - sectors].y + .045);
          this.particles[i].p.copy(p).applyMatrix4(matrix);
        }
        for (let index = 0; index < this.solverContacts.length; index++) {
          const v = this.solverContacts[index], residual = this.contactResiduals[index]; point.copy(residual.world);
          const weight = residual.weight;
          for (let k = 0; k < 4; k++) {
            const p = this.particles[v.indices[k]];
            if (p) point.addScaledVector(p.p, v.weights[k]);
          }
          if (weight < .025) continue;
          if (this.broadPhase !== false && (point.y < contactMinY || point.y > contactMaxY || (point.x-hipCentre.x)**2+(point.z-hipCentre.z)**2 > contactRadiusSq)) continue;
          for (const c of colliders) {
            axis.copy(c.b).sub(c.a);
            const t = THREE.MathUtils.clamp(shift.copy(point).sub(c.a).dot(axis) / Math.max(axis.lengthSq(), 1e-10), 0, 1);
            normal.copy(point).sub(c.a).addScaledVector(axis, -t);
            const distance = normal.length();
            let correction = 0;
            if (distance < c.radius && distance > 1e-8) {
              correction = Math.min(.008, c.radius - distance);
              normal.multiplyScalar(correction / distance);
            } else normal.set(0, 0, 0);
            // A closest-point push alone can settle on the INSIDE of a leg
            // after a crossing. Keep the skirt's radial envelope outside the
            // leg at this height, while length constraints permit lifting.
            outward.copy(point).sub(hipCentre); outward.y = 0; outward.normalize();
            const heightT = THREE.MathUtils.clamp((point.y - c.a.y) / (c.b.y - c.a.y || 1e-9), 0, 1);
            centre.copy(c.a).lerp(c.b, heightT);
            const dy = point.y - centre.y;
            shift.copy(centre).sub(hipCentre); shift.y = 0;
            const along = shift.dot(outward), transverse = Math.max(0, shift.lengthSq() - along * along);
            const crossSection = c.radius * c.radius - dy * dy - transverse;
            if (along > 0 && crossSection > 0) {
              const radialDistance = shift.copy(point).sub(hipCentre).dot(outward);
              const escape = along + Math.sqrt(crossSection) - radialDistance;
              if (escape > correction) {
                correction = Math.min(.018, escape);
                normal.copy(outward).multiplyScalar(correction);
              }
            }
            if (correction <= 0) continue;
            for (let k = 0; k < 4; k++) {
              const p = this.particles[v.indices[k]];
              if (p?.w) p.p.addScaledVector(normal, v.weights[k] / weight * .65);
            }
            corrections++;
          }
        }
        this.particles.forEach(p => { if (p.w && p.p.y < .035) p.p.y = .035; });
      }
      if (dt > 0) this.particles.forEach((p, i) => p.v.copy(p.p).sub(old[i]).divideScalar(dt).clampLength(0, 1.5));
    }
    this.previousCapsules = caps;
    let maxOffset = 0, maxStretchRatio = 1;
    this.cage.forEach((b, i) => {
      b.node.position.copy(this.particles[i].p).applyMatrix4(this.inverseHips);
      maxOffset = Math.max(maxOffset, b.node.position.distanceTo(b.rest));
    });
    for (const e of this.edges) maxStretchRatio = Math.max(maxStretchRatio, this.particles[e.a].p.distanceTo(this.particles[e.b].p) / e.length);
    for (const item of this.config.elbows) {
      const node = this.nodes.get(item.node), upper = this.vrm.humanoid.getRawBoneNode(item.side + 'UpperArm'), lower = this.vrm.humanoid.getRawBoneNode(item.side + 'LowerArm');
      const desired = upper.getWorldQuaternion(new THREE.Quaternion()).slerp(lower.getWorldQuaternion(new THREE.Quaternion()), .5);
      node.quaternion.copy(node.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired));
    }
    const identity = new THREE.Quaternion();
    for (const node of this.hair) {
      const profile = this.config.hairMotion;
      const limit = profile ? (node.name === 'Ahoge' ? .28 : node.name.startsWith('Hair.root') || node.name === 'Hair.back' ? .22 : .48) : node.name === 'Ahoge' ? .40 : .62;
      const angle = node.quaternion.angleTo(identity);
      if (angle > limit) node.quaternion.slerp(identity, 1 - limit / angle);
    }
    this.stats = { contactCorrections: corrections, maxOffset, maxStretchRatio, solver: 'PBD cage, no self collision', substeps: steps };
    this.vrm.scene.updateMatrixWorld(true);
  }
}
