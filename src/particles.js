/* ==========================================================================
   PARTICLE ENGINE FOR ZEN SLIDE
   Snow spray, juicy star sparkle explosions, and landing impacts
   ========================================================================== */

class ParticleEngine {
  constructor() {
    this.particles = [];
    this.maxParticles = 300; // Cap to prevent runaway growth
  }

  // Dirt/grass dust spray behind character
  addSnowSpray(x, y, vx, vy) {
    if (this.particles.length >= this.maxParticles) return;
    const dirtColors = ['#a16207', '#854d0e', '#4ade80'];
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        size: Math.random() * 3 + 1.5,
        speedX: -vx * 0.4 + (Math.random() - 0.5) * 2,
        speedY: -1 - Math.random() * 2,
        opacity: Math.random() * 0.7 + 0.3,
        decay: Math.random() * 0.04 + 0.02,
        color: dirtColors[Math.floor(Math.random() * dirtColors.length)]
      });
    }
  }

  // Luminous Blue Crystal Sparkle Burst
  addStarBurst(x, y) {
    const crystalColors = ['#00f0ff', '#38bdf8', '#7dd3fc', '#bae6fd', '#ffffff', '#0284c7'];
    const particleCount = 14;

    for (let i = 0; i < particleCount; i++) {
      if (this.particles.length >= this.maxParticles) return;
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.4);
      const speed = Math.random() * 4 + 1.5;
      const color = crystalColors[Math.floor(Math.random() * crystalColors.length)];

      this.particles.push({
        x,
        y,
        size: Math.random() * 3.5 + 1.5,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity: 1,
        decay: Math.random() * 0.05 + 0.02,
        color,
        gravity: 0.08
      });
    }
  }

  // Radiant Purple Crystal Shard Burst
  addTrickBurst(x, y) {
    const purpleColors = ['#d946ef', '#c084fc', '#e879f9', '#f0abfc', '#ffffff', '#a855f7'];
    const particleCount = 16;
    
    for (let i = 0; i < particleCount; i++) {
      if (this.particles.length >= this.maxParticles) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5.0 + 2;
      const color = purpleColors[Math.floor(Math.random() * purpleColors.length)];

      this.particles.push({
        x,
        y,
        size: Math.random() * 4.0 + 2.0,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity: 1,
        decay: Math.random() * 0.04 + 0.015,
        color,
        gravity: 0.06
      });
    }
  }

  // Spectacular Skateboard Pickup Neon Shockwave Burst
  addSkateboardBurst(x, y) {
    const colors = ['#00f0ff', '#38bdf8', '#67e8f9', '#ffffff', '#fde047', '#0284c7'];
    const count = 28;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) return;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = Math.random() * 6.5 + 2.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        size: Math.random() * 4.5 + 2.0,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity: 1,
        decay: Math.random() * 0.035 + 0.018,
        color,
        gravity: 0.06
      });
    }
  }

  // Explosive Car Pickup Radiant Crimson Shockwave Burst
  addCarBurst(x, y) {
    const colors = ['#ff0055', '#ff2d55', '#f43f5e', '#fb7185', '#ffffff', '#fde047', '#f97316'];
    const count = 34;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) return;
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = Math.random() * 7.5 + 3.0;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        size: Math.random() * 5.0 + 2.5,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity: 1,
        decay: Math.random() * 0.035 + 0.018,
        color,
        gravity: 0.07
      });
    }
  }

  // Rocket exhaust smoke & neon flame trail
  addRocketExhaust(x, y, angle) {
    const colors = ['#ef4444', '#f97316', '#fbbf24', '#ec4899', '#ffffff'];
    const backAngle = angle + Math.PI;
    for (let i = 0; i < 2; i++) {
      if (this.particles.length >= this.maxParticles) return;
      const spread = (Math.random() - 0.5) * 0.6;
      const speed = Math.random() * 3.5 + 2.0;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        size: Math.random() * 3.5 + 2.0,
        speedX: Math.cos(backAngle + spread) * speed,
        speedY: Math.sin(backAngle + spread) * speed,
        opacity: 0.9,
        decay: Math.random() * 0.06 + 0.03,
        color,
        gravity: 0.02
      });
    }
  }

  // Fiery missile impact explosion
  addExplosion(x, y) {
    const fireColors = ['#ef4444', '#f97316', '#fbbf24', '#fde047', '#ffffff', '#ec4899'];
    const count = 22;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) return;
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4);
      const speed = Math.random() * 6.5 + 2.0;
      const color = fireColors[Math.floor(Math.random() * fireColors.length)];

      this.particles.push({
        x,
        y,
        size: Math.random() * 5.0 + 2.5,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity: 1,
        decay: Math.random() * 0.04 + 0.02,
        color,
        gravity: 0.08
      });
    }
  }

  // Blue Nitro Jet Thrust effect (for Double Jump)
  addNitroThrust(x, y, mode = 'feet', angle = 0, isInitialBurst = false) {
    const nitroColors = ['#00f0ff', '#38bdf8', '#60a5fa', '#93c5fd', '#ffffff', '#0284c7'];
    
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // Vectors relative to character rotation
    const downX = -sin;
    const downY = cos;
    const backX = -cos;
    const backY = -sin;

    let nozzlePositions = [];

    if (mode === 'car') {
      // Dual rear underbody exhaust nozzles
      nozzlePositions = [
        { x: x + backX * 22 + downX * 12, y: y + backY * 22 + downY * 12 },
        { x: x + backX * 10 + downX * 14, y: y + backY * 10 + downY * 14 }
      ];
    } else if (mode === 'skateboard') {
      // Front and rear skateboard trucks
      nozzlePositions = [
        { x: x + backX * 14 + downX * 15, y: y + backY * 14 + downY * 15 },
        { x: x - backX * 14 + downX * 15, y: y - backY * 14 + downY * 15 }
      ];
    } else {
      // Left and right feet
      nozzlePositions = [
        { x: x - 6 + downX * 16, y: y + downY * 16 },
        { x: x + 6 + downX * 16, y: y + downY * 16 }
      ];
    }

    const particleCountPerNozzle = isInitialBurst ? 8 : 3;

    nozzlePositions.forEach((pos) => {
      for (let i = 0; i < particleCountPerNozzle; i++) {
        if (this.particles.length >= this.maxParticles) return;

        const spread = (Math.random() - 0.5) * 0.7;
        const thrustSpeed = (isInitialBurst ? 5.5 : 3.8) + Math.random() * 3.0;
        const color = nitroColors[Math.floor(Math.random() * nitroColors.length)];

        // Direct blast downwards and slightly backwards
        const thrustDirX = downX * 0.85 + backX * 0.45;
        const thrustDirY = downY * 0.85 + backY * 0.45;

        // Apply spread angle
        const speedX = (thrustDirX * Math.cos(spread) - thrustDirY * Math.sin(spread)) * thrustSpeed;
        const speedY = (thrustDirX * Math.sin(spread) + thrustDirY * Math.cos(spread)) * thrustSpeed;

        this.particles.push({
          x: pos.x + (Math.random() - 0.5) * 4,
          y: pos.y + (Math.random() - 0.5) * 4,
          size: Math.random() * (isInitialBurst ? 4.5 : 3.0) + 1.6,
          speedX,
          speedY,
          opacity: 0.95,
          decay: isInitialBurst ? (Math.random() * 0.05 + 0.03) : (Math.random() * 0.06 + 0.04),
          color,
          gravity: 0.04
        });
      }
    });

    // Ring shockwave on initial burst
    if (isInitialBurst) {
      const shockCount = 10;
      for (let s = 0; s < shockCount; s++) {
        if (this.particles.length >= this.maxParticles) return;
        const rad = (s / shockCount) * Math.PI * 2;
        const sSpeed = Math.random() * 3.5 + 2.0;
        this.particles.push({
          x,
          y: y + downY * 14,
          size: Math.random() * 3.0 + 1.5,
          speedX: Math.cos(rad) * sSpeed,
          speedY: Math.sin(rad) * sSpeed + 1.5,
          opacity: 0.85,
          decay: Math.random() * 0.07 + 0.04,
          color: '#38bdf8',
          gravity: 0.03
        });
      }
    }
  }

  updateAndDraw(ctx) {
    const len = this.particles.length;
    if (len === 0) return;

    // Batch: set shadow once for the whole pass (disabled for perf)
    // Using globalAlpha for fade instead of expensive shadowBlur
    let writeIdx = 0;

    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.gravity) p.speedY += p.gravity;
      p.opacity -= p.decay;

      if (p.opacity <= 0) {
        // Dead particle — skip it (compact in place)
        continue;
      }

      // Keep alive particles packed at the front
      this.particles[writeIdx++] = p;

      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Trim dead particles from the end in one shot
    this.particles.length = writeIdx;

    ctx.globalAlpha = 1;
  }
}

export const particleEngine = new ParticleEngine();
