/* ==========================================================================
   ZEN SLIDE - CORE GAME ENGINE
   Procedural Snow Slopes, Moon Gravity Jump, Ice Stones & Super Launch Ramps
   ========================================================================== */

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // DOM HUD & Modals
    this.distVal = document.getElementById('dist-val');
    this.starsVal = document.getElementById('stars-val');
    this.trickBanner = document.getElementById('trick-banner');
    this.trickText = document.getElementById('trick-text');
    this.startModal = document.getElementById('start-modal');
    this.gameoverModal = document.getElementById('gameover-modal');
    this.startBtn = document.getElementById('start-btn');
    this.restartBtn = document.getElementById('restart-btn');

    // Results
    this.finalDist = document.getElementById('final-dist');
    this.finalStars = document.getElementById('final-stars');
    this.finalTricks = document.getElementById('final-tricks');
    this.finalBest = document.getElementById('final-best');
    this.newBestBadge = document.getElementById('new-best-badge');

    // Game State
    this.state = 'IDLE'; // 'IDLE' | 'PLAYING' | 'GAMEOVER'
    this.distance = 0;
    this.stars = 0;
    this.tricksLanded = 0;
    this.bestDistance = parseInt(localStorage.getItem('zen_slide_best') || '0', 10);

    // Camera & World Position
    this.cameraX = 0;
    this.cameraY = 0;

    // Load Raccoon Character Sprite
    this.charImg = new Image();
    this.charImgLoaded = false;
    this.charImg.onload = () => { this.charImgLoaded = true; };
    this.charImg.src = 'character.webp';

    // Player Object
    this.player = {
      x: 80,
      y: 0,
      vx: 3.8, // Relaxed pleasant sliding speed
      vy: 0,
      radius: 18,
      angle: 0,
      airRotation: 0,
      isGrounded: false,
      isJumping: false,
      isTucking: false,
      flipDegrees: 0
    };

    // World Entities (Stars, Ice Stones, Super Ramps, Gems)
    this.starsList = [];
    this.rocksList = [];
    this.rampsList = [];
    this.gemsList = [];
    this.lastGeneratedX = 600;

    // Input Keys
    this.keys = {
      jump: false,
      tuck: false
    };

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.initEvents();
    this.loop();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  initEvents() {
    this.startBtn.addEventListener('click', () => {
      window.soundEngine.ensureContext();
      this.startModal.classList.add('hidden');
      this.startGame();
    });

    this.restartBtn.addEventListener('click', () => {
      window.soundEngine.ensureContext();
      this.gameoverModal.classList.add('hidden');
      this.startGame();
    });

    // Touch Anywhere On Canvas to Jump & Flip
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.state !== 'PLAYING') return;
      window.soundEngine.ensureContext();
      this.keys.jump = true;
      this.handleJumpStart();
    });

    window.addEventListener('pointerup', () => {
      this.keys.jump = false;
    });

    window.addEventListener('pointercancel', () => {
      this.keys.jump = false;
    });

    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.keys.jump = true;
        if (this.state === 'PLAYING') this.handleJumpStart();
      }
      if (e.code === 'ArrowDown') {
        this.keys.tuck = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.keys.jump = false;
      }
      if (e.code === 'ArrowDown') {
        this.keys.tuck = false;
      }
    });
  }

  startGame() {
    this.state = 'PLAYING';
    this.distance = 0;
    this.stars = 0;
    this.tricksLanded = 0;
    this.lastGeneratedX = 600;

    window.soundEngine.playBGM();

    this.player.x = 80;
    this.player.y = this.getTerrainHeight(80) - 20;
    this.player.vx = 3.8;
    this.player.vy = 0;
    this.player.angle = 0;
    this.player.airRotation = 0;
    this.player.isGrounded = true;
    this.player.flipDegrees = 0;

    this.starsList = [];
    this.rocksList = [];
    this.rampsList = [];
    this.gemsList = [];
    this.generateWorldAhead(1800);

    this.distVal.innerHTML = `0<small>m</small>`;
    this.starsVal.textContent = `⭐ 0`;
  }

  // Terrain height formula using smooth sine noise
  getTerrainHeight(x) {
    const baseHeight = this.height * 0.65;
    return (
      baseHeight +
      Math.sin(x * 0.0018) * 100 +
      Math.sin(x * 0.005) * 35 +
      Math.sin(x * 0.012) * 10
    );
  }

  getSlope(x) {
    const delta = 4;
    const y1 = this.getTerrainHeight(x - delta);
    const y2 = this.getTerrainHeight(x + delta);
    return (y2 - y1) / (delta * 2);
  }

  getSlopeAngle(x) {
    return Math.atan(this.getSlope(x));
  }

  handleJumpStart() {
    if (this.player.isGrounded) {
      this.player.isGrounded = false;
      this.player.vy = -11.5; // Perfectly tuned jump launch
      this.player.airRotation = 0;
      this.player.flipDegrees = 0;
      window.soundEngine.playJump();
    }
  }

  generateWorldAhead(targetX) {
    while (this.lastGeneratedX < targetX) {
      // Base spacing between obstacles
      this.lastGeneratedX += 380 + Math.random() * 260;
      const x = this.lastGeneratedX;
      const groundY = this.getTerrainHeight(x);

      // Check distance from last spawned rock
      const lastRock = this.rocksList[this.rocksList.length - 1];
      const distFromLastRock = lastRock ? (x - lastRock.x) : 9999;

      // Force stars if last rock was too close (< 750px)
      const shouldSpawnRock = (distFromLastRock >= 750) && (Math.random() < 0.4);

      if (!shouldSpawnRock) {
        // Spawn sequential line of stars
        const starCount = 4 + Math.floor(Math.random() * 3);
        for (let s = 0; s < starCount; s++) {
          const starX = x + s * 45;
          const starGroundY = this.getTerrainHeight(starX);
          this.starsList.push({
            x: starX,
            y: starGroundY - 45,
            collected: false
          });
        }
      } else {
        // Spawn Double-Sized Crystalline Ice Stone Obstacle (Radius 42!)
        this.rocksList.push({
          x: x,
          y: groundY - 12,
          radius: 42
        });

        // High Altitude Gems placed floating in the sky above hills!
        if (Math.random() > 0.5) {
          const gemX = x + 80;
          this.gemsList.push({
            x: gemX,
            y: this.getTerrainHeight(gemX) - 150,
            collected: false
          });
        }

        // Extra spacing boost after spawning a stone so landing is always clean
        this.lastGeneratedX += 300;
      }
    }
  }

  updatePhysics() {
    if (this.state !== 'PLAYING') return;

    const p = this.player;

    // Controlled Speed settings
    p.isTucking = this.keys.tuck;
    const maxSpeed = p.isTucking ? 7.5 : 5.5;
    const minSpeed = 3.5;

    const slope = this.getSlope(p.x);
    const slopeAngle = this.getSlopeAngle(p.x);

    if (p.isGrounded) {
      // Ground movement & slope physics
      p.y = this.getTerrainHeight(p.x) - p.radius;
      p.angle = slopeAngle;

      // Gentle slope acceleration / deceleration
      const accel = slope * 0.08 + (p.isTucking ? 0.04 : 0.005);
      p.vx = Math.max(minSpeed, Math.min(maxSpeed, p.vx + accel));

      p.x += p.vx;

      // Snow spray particle effect when sliding
      if (Math.abs(p.vx) > 4) {
        window.particleEngine.addSnowSpray(p.x - 10, p.y + 10, p.vx, p.vy);
      }

      // Check if terrain drops beneath player (hill crest flight)
      const nextGroundY = this.getTerrainHeight(p.x + p.vx) - p.radius;
      if (p.y < nextGroundY - 8) {
        p.isGrounded = false;
        p.vy = slope * p.vx;
        p.airRotation = p.angle;
        p.flipDegrees = 0;
      }
    } else {
      // Air physics with Low Moon Gravity & Backflip Rotation
      p.x += p.vx;
      p.vy += 0.22; // Floaty Low Moon Gravity!
      p.y += p.vy;

      // Rotate backward if holding JUMP key or touching screen in air
      if (this.keys.jump) {
        p.airRotation -= 0.09;
        p.flipDegrees += Math.abs(0.09 * (180 / Math.PI));
      } else {
        // Slowly align angle to velocity vector via shortest path
        const targetAngle = Math.atan2(p.vy, p.vx);
        let diff = targetAngle - p.airRotation;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        p.airRotation += diff * 0.08;
      }

      p.angle = p.airRotation;

      // Check landing collision with terrain
      const groundY = this.getTerrainHeight(p.x) - p.radius;
      if (p.y >= groundY) {
        p.y = groundY;

        // Calculate landing alignment angle difference
        let angleDiff = Math.abs((p.angle - slopeAngle) % (Math.PI * 2));
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        if (angleDiff > Math.PI * 0.45) {
          // Crash / Wipeout landing!
          this.triggerCrash();
          return;
        }

        // Clean landing!
        p.isGrounded = true;
        p.vy = 0;

        // Check if landed a backflip trick!
        if (p.flipDegrees >= 270) {
          const flips = Math.floor(p.flipDegrees / 270);
          this.tricksLanded += flips;
          this.showTrickBanner(`BACKFLIP x${flips} +${flips * 500}m`);
          this.distance += flips * 500;
          window.soundEngine.playBackflip();
          window.particleEngine.addTrickBurst(p.x, p.y);
          p.vx = Math.min(maxSpeed + 1.5, p.vx + 1.5);
        }
      }
    }

    // Distance update
    this.distance = Math.max(this.distance, Math.floor((p.x - 80) / 10));
    this.distVal.innerHTML = `${this.distance}<small>m</small>`;

    // Generate upcoming world terrain
    this.generateWorldAhead(p.x + 1400);

    // Collision check with Stars
    this.starsList.forEach((star) => {
      if (!star.collected && Math.hypot(p.x - star.x, p.y - star.y) < 35) {
        star.collected = true;
        this.stars++;
        this.starsVal.textContent = `⭐ ${this.stars}`;
        window.soundEngine.playStar();
        window.particleEngine.addStarBurst(star.x, star.y);
      }
    });

    // Collision check with High-Altitude Gems (💎)
    this.gemsList.forEach((gem) => {
      if (!gem.collected && Math.hypot(p.x - gem.x, p.y - gem.y) < 36) {
        gem.collected = true;
        this.distance += 250;
        this.showTrickBanner(`ICE GEM! +250m 💎`);
        window.soundEngine.playStar();
        window.particleEngine.addTrickBurst(gem.x, gem.y);
      }
    });

    // Collision check with Super Launch Ramps (⚡)
    this.rampsList.forEach((ramp) => {
      if (!ramp.used && Math.hypot(p.x - ramp.x, (p.y + p.radius) - ramp.y) < 30) {
        ramp.used = true;
        p.isGrounded = false;
        p.vy = -17.5; // Mega High Jump launch into upper sky!
        p.airRotation = p.angle;
        p.flipDegrees = 0;
        this.showTrickBanner(`SUPER LAUNCH! 🚀`);
        window.soundEngine.playJump();
        window.particleEngine.addTrickBurst(ramp.x, ramp.y);
      }
    });

    // Collision check with Crystalline Ice Stones
    this.rocksList.forEach((rock) => {
      if (Math.hypot(p.x - rock.x, (p.y + p.radius) - rock.y) < p.radius + rock.radius - 4) {
        this.triggerCrash();
      }
    });

    // Position character at 18% of screen width
    this.cameraX += (p.x - this.width * 0.18 - this.cameraX) * 0.08;
    this.cameraY += (p.y - this.height * 0.55 - this.cameraY) * 0.08;
  }

  showTrickBanner(text) {
    this.trickText.textContent = text;
    this.trickBanner.classList.remove('hidden');
    setTimeout(() => {
      this.trickBanner.classList.add('hidden');
    }, 1800);
  }

  triggerCrash() {
    this.state = 'GAMEOVER';
    window.soundEngine.playCrash();
    window.soundEngine.pauseBGM();

    this.finalDist.textContent = `${this.distance}m`;
    this.finalStars.textContent = this.stars;
    this.finalTricks.textContent = this.tricksLanded;

    if (this.distance > this.bestDistance) {
      this.bestDistance = this.distance;
      localStorage.setItem('zen_slide_best', this.bestDistance.toString());
      this.newBestBadge.classList.remove('hidden');
    } else {
      this.newBestBadge.classList.add('hidden');
    }

    this.finalBest.textContent = `${this.bestDistance}m`;
    this.gameoverModal.classList.remove('hidden');
  }

  // ==========================================================================
  // PARALLAX VECTOR CANVAS RENDERER (Alto's Adventure Inspired)
  // ==========================================================================
  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const zoom = 0.68; // Panoramic Zoom Out (Alto's Adventure style)
    const viewW = this.width / zoom;
    const viewH = this.height / zoom;

    this.ctx.save();
    this.ctx.scale(zoom, zoom);

    // 1. Dynamic Twilight Sky Gradient
    const skyGrad = this.ctx.createLinearGradient(0, 0, 0, viewH);
    skyGrad.addColorStop(0, '#0b0f19');
    skyGrad.addColorStop(0.5, '#1e1b4b');
    skyGrad.addColorStop(1, '#312e81');
    this.ctx.fillStyle = skyGrad;
    this.ctx.fillRect(0, 0, viewW, viewH);

    // 2. Glowing Moon
    this.ctx.beginPath();
    this.ctx.arc(viewW * 0.82, viewH * 0.22, 50, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.shadowBlur = 40;
    this.ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    // 3. Parallax Layer 1: Distant Silhouette Mountain Range
    this.drawDistantMountains(0.15, '#1e1b4b', viewW, viewH);

    // 4. Parallax Layer 2: Mid-ground Trees & Hills
    this.drawPineTrees(0.4, '#151b2e', viewW, viewH);

    // 5. Main Foreground Terrain Slopes
    this.drawMainTerrain(viewW, viewH);

    // 6. Draw Entities (Stars, Ice Stones, Super Launch Ramps, High Sky Gems)
    this.drawEntities(viewW);

    // 7. Draw Player Character & Board
    if (this.state === 'PLAYING') {
      this.drawPlayer();
    }

    // 8. Update Particles (Applying Camera Translation)
    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);
    window.particleEngine.updateAndDraw(this.ctx);
    this.ctx.restore();

    this.ctx.restore();
  }

  drawDistantMountains(parallaxRatio, color, viewW, viewH) {
    const offsetX = this.cameraX * parallaxRatio;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(0, viewH);

    for (let x = 0; x <= viewW + 100; x += 50) {
      const worldX = x + offsetX;
      const mountainY = viewH * 0.5 + Math.sin(worldX * 0.001) * 140 + Math.sin(worldX * 0.003) * 60;
      this.ctx.lineTo(x, mountainY);
    }

    this.ctx.lineTo(viewW, viewH);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawPineTrees(parallaxRatio, color, viewW, viewH) {
    const offsetX = this.cameraX * parallaxRatio;
    this.ctx.fillStyle = color;

    for (let x = -50; x < viewW + 100; x += 80) {
      const worldX = Math.floor((x + offsetX) / 80) * 80;
      const groundY = this.getTerrainHeight(worldX) - (this.cameraY * 0.3);
      const screenX = worldX - offsetX;

      this.ctx.beginPath();
      this.ctx.moveTo(screenX, groundY);
      this.ctx.lineTo(screenX - 16, groundY + 50);
      this.ctx.lineTo(screenX + 16, groundY + 50);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  drawMainTerrain(viewW, viewH) {
    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

    const startX = Math.floor(this.cameraX / 10) * 10 - 40;
    const endX = startX + viewW + 80;

    // Terrain Path
    this.ctx.beginPath();
    this.ctx.moveTo(startX, this.getTerrainHeight(startX));

    for (let x = startX; x <= endX; x += 15) {
      this.ctx.lineTo(x, this.getTerrainHeight(x));
    }

    this.ctx.lineTo(endX, viewH + this.cameraY + 400);
    this.ctx.lineTo(startX, viewH + this.cameraY + 400);
    this.ctx.closePath();

    // Snow Gradient Fill
    const snowGrad = this.ctx.createLinearGradient(0, viewH * 0.4, 0, viewH * 1.2);
    snowGrad.addColorStop(0, '#f8fafc');
    snowGrad.addColorStop(0.3, '#e2e8f0');
    snowGrad.addColorStop(1, '#0f172a');

    this.ctx.fillStyle = snowGrad;
    this.ctx.fill();

    // Top Snow Edge Stroke
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawEntities(viewW) {
    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

    // Draw Collectible Stars (Large & Glowing)
    this.starsList.forEach((star) => {
      if (!star.collected && star.x > this.cameraX - 100 && star.x < this.cameraX + viewW + 100) {
        this.ctx.font = '32px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#fbbf24';
        this.ctx.fillText('⭐', star.x, star.y);
        this.ctx.shadowBlur = 0;
      }
    });

    // Draw High-Altitude Rare Gems (💎)
    this.gemsList.forEach((gem) => {
      if (!gem.collected && gem.x > this.cameraX - 100 && gem.x < this.cameraX + viewW + 100) {
        this.ctx.font = '30px Outfit';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowBlur = 22;
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.fillText('💎', gem.x, gem.y);
        this.ctx.shadowBlur = 0;
      }
    });

    // Draw Crystalline Ice Stones (Double Sized Frost Crystals)
    this.rocksList.forEach((rock) => {
      if (rock.x > this.cameraX - 100 && rock.x < this.cameraX + viewW + 100) {
        this.ctx.save();
        this.ctx.translate(rock.x, rock.y - 6);

        // Cyan Frost Aura around Double-Sized Ice Stone
        this.ctx.beginPath();
        this.ctx.arc(0, 0, rock.radius + 10, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        this.ctx.shadowBlur = 24;
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.fill();

        // Double-Sized Crystalline Ice Polygon
        this.ctx.beginPath();
        const numPoints = 7;
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2 - Math.PI / 2;
          const rad = rock.radius * (i % 2 === 0 ? 1 : 0.84);
          const px = Math.cos(angle) * rad;
          const py = Math.sin(angle) * rad;
          if (i === 0) this.ctx.moveTo(px, py);
          else this.ctx.lineTo(px, py);
        }
        this.ctx.closePath();

        // Ice Gradient Fill (Cyan Glacier Blue)
        const iceGrad = this.ctx.createLinearGradient(-rock.radius, -rock.radius, rock.radius, rock.radius);
        iceGrad.addColorStop(0, '#e0f2fe');
        iceGrad.addColorStop(0.35, '#38bdf8');
        iceGrad.addColorStop(1, '#0284c7');
        this.ctx.fillStyle = iceGrad;
        this.ctx.fill();

        // Specular Ice Glint Lines
        this.ctx.beginPath();
        this.ctx.moveTo(-rock.radius * 0.4, -rock.radius * 0.6);
        this.ctx.lineTo(0, -rock.radius * 0.85);
        this.ctx.lineTo(rock.radius * 0.4, -rock.radius * 0.3);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Crystalline Border Outline
        this.ctx.strokeStyle = '#bae6fd';
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        this.ctx.restore();
      }
    });

    this.ctx.restore();
  }

  drawPlayer() {
    const p = this.player;
    this.ctx.save();
    this.ctx.translate(p.x - this.cameraX, p.y - this.cameraY);
    this.ctx.rotate(p.angle);

    // 1. Draw Seamless Animated Bushy Raccoon Tail attached directly to waist
    this.drawRaccoonTail(p);

    // 2. Draw Enlarged Raccoon Character Sprite (105px x 64px)
    if (this.charImgLoaded) {
      const drawWidth = 105;
      const drawHeight = 64;
      // Position character so snowboard aligns cleanly with slope surface
      this.ctx.drawImage(this.charImg, -46, -50, drawWidth, drawHeight);
    } else {
      // Fallback if loading
      this.ctx.beginPath();
      this.ctx.roundRect(-25, 8, 50, 8, 4);
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawRaccoonTail(p) {
    const time = Date.now() * 0.007;
    const numSteps = 24; // High density for smooth continuous tail texture
    const startX = -6;  // Directly attached inside raccoon's coat hip!
    const startY = -20;
    const totalLength = 36; // Refined smaller tail length

    // 6 distinct raccoon stripe bands along the tail length
    const stripeColors = [
      '#231f1d', '#231f1d',
      '#b5aaa0', '#b5aaa0',
      '#231f1d', '#231f1d',
      '#b5aaa0', '#b5aaa0',
      '#231f1d', '#231f1d',
      '#b5aaa0', '#b5aaa0'
    ];

    // Render continuous overlapping circles to form a refined smaller tail
    for (let i = numSteps; i >= 0; i--) {
      const t = i / numSteps; // 0 (attachment base) to 1 (bushy tip)

      // Dynamic wind wave physics
      const wave = Math.sin(time + t * 3.5) * (3.5 + p.vx * 0.5) * Math.sqrt(t);
      const px = startX - (t * totalLength);
      const py = startY - (t * 8) + wave;

      // Refined smaller tail profile (max thickness ~7.8px)
      const radius = 3.0 + Math.sin(Math.pow(t, 0.7) * Math.PI) * 4.8;

      // Color mapping according to position along the tail length
      const stripeIdx = Math.floor(t * stripeColors.length);
      const color = stripeColors[Math.min(stripeIdx, stripeColors.length - 1)];

      this.ctx.beginPath();
      this.ctx.arc(px, py, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }
  }

  loop() {
    this.updatePhysics();
    this.render();
    requestAnimationFrame(() => this.loop());
  }
}

// Instantiate Game Engine on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new GameEngine();
});
