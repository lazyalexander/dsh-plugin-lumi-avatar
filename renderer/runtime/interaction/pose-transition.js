const smooth = value => value * value * value * (10 + value * (-15 + value * 6));

/** Blend a new target from the pose visible at the moment of interruption. */
export class PoseTransition {
  constructor() {
    this.key = null;
    this.origins = new Map();
    this.elapsed = 0;
    this.seconds = .75;
  }
  begin(key, pose, seconds) {
    if (key === this.key) return;
    this.key = key;
    this.origins = new Map([...pose].map(([name, rotation]) => [name, rotation.clone()]));
    this.elapsed = 0;
    this.seconds = seconds;
  }
  advance(delta) {
    this.elapsed = Math.min(this.seconds, this.elapsed + delta);
  }
  blend(name, target) {
    const origin = this.origins.get(name);
    if (!origin || this.elapsed >= this.seconds) return target;
    return origin.clone().slerp(target, smooth(this.elapsed / this.seconds));
  }
}
