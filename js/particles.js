/* ==========================================================================
   PARTICLE ENGINE FOR ZEN SLIDE
   Snow spray, juicy star sparkle explosions, and landing impacts
   ========================================================================== */

class ParticleEngine {
  constructor() {
    this.particles = [];
  }

  // Snow dust spray behind character snowboard/skis
  addSnowSpray(x, y, vx, vy) {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        size: Math.random() * 3 + 1.5,
        speedX: -vx * 0.4 + (Math.random() - 0.5) * 2,
        speedY: -1 - Math.random() * 2,
        opacity: Math.random() * 0.7 + 0.3,
        decay: Math.random() * 0.04 + 0.02,
        color: '#e2e8f0'
      });
    }
  }

  // Juicy Golden Star Burst Explosion
  addStarBurst(x, y) {
    const starColors = ['#fbbf24', '#fef08a', '#f59e0b', '#ffffff', '#fde047'];
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.4);
      const speed = Math.random() * 4 + 1.5;
      const color = starColors[Math.floor(Math.random() * starColors.length)];

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

  // Trick Landed / Gem Collected Burst
  addTrickBurst(x, y) {
    const gemColors = ['#38bdf8', '#7dd3fc', '#bae6fd', '#ffffff', '#0284c7'];
    const particleCount = 14;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 2;
      const color = gemColors[Math.floor(Math.random() * gemColors.length)];

      this.particles.push({
        x,
        y,
        size: Math.random() * 3.5 + 1.5,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        opacity: 1,
        decay: Math.random() * 0.04 + 0.015,
        color,
        gravity: 0.06
      });
    }
  }

  updateAndDraw(ctx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.gravity) p.speedY += p.gravity;
      p.opacity -= p.decay;

      if (p.opacity <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}

window.particleEngine = new ParticleEngine();
