import { soundEngine } from './audio';
import { particleEngine } from './particles';

export class GameEngine {
  constructor(canvas, updateUI) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.updateUI = updateUI;
    this._uiDirty = true; // Throttle UI updates
    
    // Game State
    this.state = 'IDLE'; // 'IDLE' | 'PLAYING' | 'GAMEOVER'
    this.distance = 0;
    this.stars = 0;
    this.blueCrystals = 0;
    this.purpleCrystals = 0;
    this.tricksLanded = 0;
    this.bestDistance = parseInt(localStorage.getItem('zen_slide_best') || '0', 10);

    // Camera & World Position
    this.cameraX = 0;
    this.cameraY = 0;

    // Load Background Image and pre-blur it
    this.bgImage = new Image();
    this.blurredBg = null;
    this.bgImage.onload = () => {
      this.blurredBg = document.createElement('canvas');
      this.blurredBg.width = this.bgImage.width;
      this.blurredBg.height = this.bgImage.height;
      const bCtx = this.blurredBg.getContext('2d');
      bCtx.filter = 'blur(1px)'; // Apply blur once
      // To prevent edge bleeding, we can draw it slightly scaled
      bCtx.drawImage(this.bgImage, -4, -4, this.bgImage.width + 8, this.bgImage.height + 8);
      bCtx.filter = 'none';
    };
    this.bgImage.src = '/bg.png';

    // Load Raccoon Character Sprite
    this.charImg = new Image();
    this.charImgLoaded = false;
    this.charImg.onload = () => { this.charImgLoaded = true; };
    this.charImg.src = '/character.webp';

    // Player Object
    this.player = {
      x: 80,
      y: 0,
      vx: 3.8, 
      vy: 0,
      radius: 18,
      angle: 0,
      airRotation: 0,
      isGrounded: false,
      isJumping: false,
      isTucking: false,
      flipDegrees: 0,
      isSkating: false,
      skateTimer: 0,
      isDriving: false,
      carTimer: 0,
      canDoubleJump: true,
      nitroTimer: 0
    };

    // Load Spaceship Boss SVG and pre-rasterize to offscreen canvas
    this.shipImg = new Image();
    this.spaceshipCanvas = null;
    this.shipImg.onload = () => {
      const offscreen = document.createElement('canvas');
      const w = 188; // Scaled up 50% (125 * 1.5)
      const h = 156; // Scaled up 50% (104 * 1.5)
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d');
      offCtx.drawImage(this.shipImg, 0, 0, w, h);
      this.spaceshipCanvas = offscreen;
    };
    this.shipImg.src = '/obstacles/spaceship.svg';

    // Spaceship Boss Entity State
    this.ship = {
      active: false,
      x: 0,
      y: 0,
      baseY: 0,
      state: 'idle', // 'idle' | 'entering' | 'aiming' | 'firing' | 'leaving'
      timer: 0,
      shootTimer: 0,
      shotsLeft: 3
    };

    // Rocket (Missile) State
    this.rocket = {
      active: false,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      targetX: 0,
      targetY: 0,
      t: 0,
      rot: 0
    };
    this.rocketsList = [];
    this.level2Spawned = false;
    this.lastShipSpawnDistance = 0;
    this.gameTime = 0;

    this.platformsList = [];
    this.lastPlatformX = 600;

    // World Entities
    this.starsList = [];
    this.rocksList = [];
    this.rampsList = [];
    this.gemsList = [];
    this.gapsList = [];
    this.skateboardsList = [];
    this.carsList = [];
    this.robotEnemiesList = [];
    this.lastGeneratedX = 600;

    // Input Keys
    this.keys = {
      jump: false,
      tuck: false
    };

    this.resize();
    window.addEventListener('resize', this.onResize);
    this.initEvents();
    
    this.loop = this.loop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  onResize = () => {
    this.resize();
  }

  cleanup() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerCancel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    cancelAnimationFrame(this.animationFrameId);
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
    this.onPointerUp = () => { this.keys.jump = false; };
    this.onPointerCancel = () => { this.keys.jump = false; };
    
    this.onKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.keys.jump = true;
        if (this.state === 'PLAYING') this.handleJumpStart();
      }
      if (e.code === 'ArrowDown') {
        this.keys.tuck = true;
      }
    };
    
    this.onKeyUp = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.keys.jump = false;
      }
      if (e.code === 'ArrowDown') {
        this.keys.tuck = false;
      }
    };

    this.onPointerDown = (e) => {
      if (e.target.closest('button')) return;
      if (this.state !== 'PLAYING') return;
      soundEngine.ensureContext();
      this.keys.jump = true;
      this.handleJumpStart();
    };

    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerCancel);
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  startGame() {
    this.state = 'PLAYING';
    this.distance = 0;
    this.stars = 0;
    this.blueCrystals = 0;
    this.purpleCrystals = 0;
    this.tricksLanded = 0;
    this.lastGeneratedX = 600;

    soundEngine.playBGM();

    this.player.x = 80;
    this.player.y = this.getTerrainHeight(80) - 20;
    this.player.vx = 3.8;
    this.player.vy = 0;
    this.player.angle = 0;
    this.player.airRotation = 0;
    this.player.isGrounded = true;
    this.player.flipDegrees = 0;
    this.player.isSkating = false;
    this.player.skateTimer = 0;
    this.player.isDriving = false;
    this.player.carTimer = 0;
    this.player.canDoubleJump = true;
    this.player.nitroTimer = 0;

    this.starsList = [];
    this.rocksList = [];
    this.rampsList = [];
    this.gemsList = [];
    this.gapsList = [];
    this.skateboardsList = [];
    this.carsList = [];
    this.robotEnemiesList = [];
    this.platformsList = [];
    this.lastPlatformX = 600;
    this.player.currentSurface = null;
    
    // Reset Spaceship Boss & Missiles
    this.ship = {
      active: false,
      x: 0,
      y: 0,
      baseY: 0,
      state: 'idle',
      timer: 0,
      shootTimer: 0,
      shotsLeft: 3
    };

    this.rocket = {
      active: false,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      targetX: 0,
      targetY: 0,
      t: 0,
      rot: 0
    };
    this.rocketsList = [];
    this.level2Spawned = false;
    this.lastShipSpawnDistance = 0;
    this.gameTime = 0;

    this.generateWorldAhead(1800);
    
    this.updateUI({ state: 'PLAYING', distance: this.distance, stars: this.stars, blueCrystals: this.blueCrystals, purpleCrystals: this.purpleCrystals, bestDistance: this.bestDistance });
  }

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

  isOverGap(x) {
    // Gaps are disabled, fast-path return
    const gaps = this.gapsList;
    for (let i = 0, len = gaps.length; i < len; i++) {
      const gap = gaps[i];
      if (x >= gap.startX && x <= gap.endX) return true;
    }
    return false;
  }

  handleJumpStart() {
    const p = this.player;
    if (p.isGrounded) {
      p.isGrounded = false;
      p.canDoubleJump = true;
      p.vy = -12.0; 
      p.airRotation = 0;
      p.flipDegrees = 0;
      p.currentSurface = null;
      soundEngine.playJump();
    } else if (p.canDoubleJump) {
      // Mid-air Double Jump with Blue Nitro Boost!
      p.canDoubleJump = false;
      p.vy = -10.5; // Upward rocket thrust
      p.nitroTimer = 10; // Continuous thrust stream duration (frames)
      soundEngine.playDoubleJump();

      const mode = p.isDriving ? 'car' : (p.isSkating ? 'skateboard' : 'feet');
      particleEngine.addNitroThrust(p.x, p.y, mode, p.angle, true);
    }
  }

  generateWorldAhead(targetX) {
    while (this.lastGeneratedX < targetX) {
      this.lastGeneratedX += 380 + Math.random() * 260;
      const x = this.lastGeneratedX;
      const groundY = this.getTerrainHeight(x);

      const lastRock = this.rocksList[this.rocksList.length - 1];
      const distFromLastRock = lastRock ? (x - lastRock.x) : 9999;

      const shouldSpawnRock = false; // Obstacles removed
      const shouldSpawnGap = false; // Gaps removed by request
      const playerNeedsPowerup = !this.player.isSkating && !this.player.isDriving;
      const shouldSpawnSkateboard = !shouldSpawnGap && playerNeedsPowerup && (Math.random() < 0.08);
      const shouldSpawnCar = !shouldSpawnGap && !shouldSpawnSkateboard && playerNeedsPowerup && (Math.random() < 0.05);
      const shouldSpawnRobot = !shouldSpawnGap && !shouldSpawnSkateboard && !shouldSpawnCar && (Math.random() < 0.15);

      if (shouldSpawnGap) {
        const gapWidth = 250 + Math.random() * 200;
        this.gapsList.push({
          startX: x,
          endX: x + gapWidth
        });
        this.lastGeneratedX += gapWidth + 300; // Leave safe space after gap
      } else if (shouldSpawnSkateboard) {
        this.skateboardsList.push({
          x: x,
          y: this.getTerrainHeight(x) - 15,
          radius: 35,
          collected: false
        });
        this.lastGeneratedX += 300;
      } else if (shouldSpawnCar) {
        this.carsList.push({
          x: x,
          y: this.getTerrainHeight(x) - 15,
          radius: 48,
          collected: false
        });
        this.lastGeneratedX += 350;
      } else if (shouldSpawnRobot) {
        this.robotEnemiesList.push({
          id: `robot_gnd_${Math.floor(x)}`,
          x: x,
          y: this.getTerrainHeight(x) - 15,
          type: Math.random() < 0.5 ? 1 : 2,
          radius: 35,
          defeated: false
        });
        this.lastGeneratedX += 280;
      } else if (Math.random() < 0.15) {
        const gemX = x;
        this.gemsList.push({
          x: gemX,
          y: this.getTerrainHeight(gemX) - 150,
          collected: false
        });
        this.lastGeneratedX += 150;
      } else {
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
      }
      
      // Generate Floating Neon Sky Platforms (Randomized layouts with gaps & 3 tiers)
      if (this.lastGeneratedX > this.lastPlatformX + 950) {
        this.lastPlatformX = this.lastGeneratedX + 150 + Math.random() * 200;
        const patternRoll = Math.random();

        // Helper to add floating platform
        const addPlat = (tier, startX, len) => {
          const heightOffset = tier === 1 ? 200 : (tier === 2 ? 380 : 560);
          const endX = startX + len;
          const thrusters = [];
          for (let tx = startX + 50; tx <= endX - 50; tx += 120) {
            thrusters.push(tx);
          }
          const plat = {
            id: `plat_${tier}_${Math.floor(startX)}`,
            tier,
            startX,
            endX,
            heightOffset,
            thrusters
          };
          this.platformsList.push(plat);

          // Spawn collectible crystals on top
          for (let sx = startX + 60; sx < endX - 50; sx += 65) {
            if (tier === 3 && Math.random() < 0.65) {
              this.gemsList.push({
                x: sx,
                y: this.getTerrainHeight(sx) - heightOffset - 38,
                collected: false
              });
            } else if (tier === 2 && Math.random() < 0.4) {
              this.gemsList.push({
                x: sx,
                y: this.getTerrainHeight(sx) - heightOffset - 38,
                collected: false
              });
            } else if (Math.random() < 0.6) {
              this.starsList.push({
                x: sx,
                y: this.getTerrainHeight(sx) - heightOffset - 35,
                collected: false
              });
            }
          }

          // Randomly spawn 1 or 2 Robot Enemies on platform
          if (len > 750 && Math.random() < 0.85) {
            const enemyCount = len > 1400 ? (Math.random() < 0.6 ? 2 : 1) : 1;
            for (let e = 0; e < enemyCount; e++) {
              const offset = enemyCount === 1 
                ? 320 + Math.random() * (len - 600)
                : (e === 0 ? 300 + Math.random() * (len * 0.35 - 200) : len * 0.55 + Math.random() * (len * 0.35 - 150));
              const rx = startX + offset;
              const ry = this.getTerrainHeight(rx) - heightOffset;
              this.robotEnemiesList.push({
                id: `robot_${Math.floor(rx)}`,
                x: rx,
                y: ry,
                type: Math.random() < 0.5 ? 1 : 2,
                radius: 35,
                defeated: false
              });
            }
          }
        };

        if (patternRoll < 0.22) {
          // Pattern A: Long Lower Skyrail (Tier 1) - ~2x-3x length
          const pLen = 1400 + Math.random() * 800;
          addPlat(1, this.lastPlatformX, pLen);
          this.lastPlatformX += pLen;
        } else if (patternRoll < 0.45) {
          // Pattern B: Long High/Top Skyrail (Tier 2 or Tier 3) - ~3x length
          const tier = Math.random() < 0.45 ? 2 : 3;
          const pLen = (tier === 3 ? 2200 : 1600) + Math.random() * 800;
          addPlat(tier, this.lastPlatformX, pLen);
          this.lastPlatformX += pLen;
        } else if (patternRoll < 0.72) {
          // Pattern C: Stepped Duo with Gap (Tier 1 -> Gap -> Long Tier 2/3 Top Rail)
          const p1Len = 1100 + Math.random() * 500;
          addPlat(1, this.lastPlatformX, p1Len);

          const gap = 140 + Math.random() * 60; // Jumpable gap
          const p2Start = this.lastPlatformX + p1Len + gap;
          const p2Tier = Math.random() < 0.5 ? 2 : 3;
          const p2Len = 1800 + Math.random() * 800;
          addPlat(p2Tier, p2Start, p2Len);
          this.lastPlatformX = p2Start + p2Len;
        } else if (patternRoll < 0.88) {
          // Pattern D: Dual Stacked Skyway with Horizontal Stagger & Triple-Length Top Rail
          const p1Len = 1400 + Math.random() * 600;
          addPlat(1, this.lastPlatformX, p1Len);

          const offset = 260 + Math.random() * 180;
          const p2Tier = Math.random() < 0.5 ? 2 : 3;
          const p2Len = 2000 + Math.random() * 900;
          addPlat(p2Tier, this.lastPlatformX + offset, p2Len);
          this.lastPlatformX += Math.max(p1Len, offset + p2Len);
        } else {
          // Pattern E: Stratosphere Mega-Expressway (Tier 3 Top Rail 3x+ Length)
          const pLen = 2600 + Math.random() * 1000;
          addPlat(3, this.lastPlatformX, pLen);
          this.lastPlatformX += pLen;
        }
      }
    }
  }

  updatePhysics() {
    if (this.state === 'GAMEOVER') return;
    if (this.state === 'CRASHING') {
      this.player.vx = 0; // stop horizontal slide while crashing
    }

    if (this.state !== 'PLAYING' && this.state !== 'CRASHING') return;

    const p = this.player;

    // Speed progression: starts relaxed & controlled, scales smoothly with distance up to a fixed maximum threshold
    const baseRunningSpeed = 4.2;
    const baseTuckingSpeed = 5.6;
    const maxSpeedIncrease = 2.8; // Maximum bonus threshold
    const speedIncrease = Math.min(maxSpeedIncrease, this.distance * 0.00035);

    let speedMultiplier = 1.0;
    if (p.isSkating) speedMultiplier = 1.15;
    if (p.isDriving) speedMultiplier = 1.25;

    const baseSpeed = p.isTucking ? baseTuckingSpeed : baseRunningSpeed;
    const maxSpeed = (baseSpeed + speedIncrease) * speedMultiplier;

    const slope = this.getSlope(p.x);
    const slopeAngle = this.getSlopeAngle(p.x);

    if (p.isGrounded) {
      if (p.currentSurface && p.currentSurface !== 'GROUND') {
        const plat = p.currentSurface;
        if (p.x >= plat.startX && p.x <= plat.endX) {
          p.y = this.getTerrainHeight(p.x) - plat.heightOffset - p.radius;
          p.angle = slopeAngle;
          if (this.state !== 'CRASHING') {
            p.vx = maxSpeed;
            p.x += p.vx;
          } else {
            p.vx = 0;
          }

          if (Math.abs(p.vx) > 4) {
            particleEngine.addSnowSpray(p.x - 10, p.y + 10, p.vx, p.vy);
          }
        } else {
          // Rode off the platform!
          p.isGrounded = false;
          p.vy = slope * p.vx;
          p.airRotation = p.angle;
          p.flipDegrees = 0;
          p.currentSurface = null;
        }
      } else {
        p.y = this.getTerrainHeight(p.x) - p.radius;
        p.angle = slopeAngle;

        // Constant speed always (unless crashing)
        if (this.state !== 'CRASHING') {
          p.vx = maxSpeed;
          p.x += p.vx;
        } else {
          p.vx = 0;
        }

        if (Math.abs(p.vx) > 4) {
          particleEngine.addSnowSpray(p.x - 10, p.y + 10, p.vx, p.vy);
        }

        if (this.isOverGap(p.x)) {
          p.isGrounded = false;
          p.vy = slope * p.vx;
          p.airRotation = p.angle;
          p.flipDegrees = 0;
        } else {
          const nextGroundY = this.getTerrainHeight(p.x + p.vx) - p.radius;
          if (p.y < nextGroundY - 8) {
            p.isGrounded = false;
            p.vy = slope * p.vx;
            p.airRotation = p.angle;
            p.flipDegrees = 0;
          }
        }
      }
    } else {
      if (this.state !== 'CRASHING') {
        p.x += p.vx;
      } else {
        p.vx = 0;
      }
      p.vy += 0.28; 
      p.y += p.vy;

      // Death by falling below terrain abyss
      if (p.y > this.getTerrainHeight(p.x) + 500) {
        this.triggerCrash();
        return;
      }

      // In mid-air, maintain natural upright aerodynamic glide along trajectory (no backflip spinning)
      let targetAngle = Math.atan2(p.vy, p.vx);
      if (targetAngle > 0.35) targetAngle = 0.35;
      if (targetAngle < -0.35) targetAngle = -0.35;
      
      let diff = targetAngle - p.airRotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      p.airRotation += diff * 0.1;
      p.angle = p.airRotation;

      let landed = false;
      // Check candidate platforms from highest elevation (Tier 3 -> Tier 2 -> Tier 1)
      const candidatePlatforms = this.platformsList.filter(plat => p.x >= plat.startX && p.x <= plat.endX);
      candidatePlatforms.sort((a, b) => b.heightOffset - a.heightOffset);

      for (let i = 0; i < candidatePlatforms.length; i++) {
        const plat = candidatePlatforms[i];
        const platSurfaceY = this.getTerrainHeight(p.x) - plat.heightOffset - p.radius;

        // Land on platform if descending towards/crossing surface
        if (p.vy >= 0 && p.y >= platSurfaceY - 6 && p.y <= platSurfaceY + 35) {
          p.y = platSurfaceY;
          p.isGrounded = true;
          p.canDoubleJump = true;
          p.nitroTimer = 0;
          p.currentSurface = plat;
          p.vy = 0;
          p.angle = slopeAngle;
          p.airRotation = slopeAngle;
          landed = true;
          break;
        }
      }

      if (!landed && !this.isOverGap(p.x)) {
        const groundY = this.getTerrainHeight(p.x) - p.radius;
        if (p.y >= groundY) {
          p.y = groundY;

          // Clean, safe landing on feet (no crash)
          p.isGrounded = true;
          p.canDoubleJump = true;
          p.nitroTimer = 0;
          p.currentSurface = 'GROUND';
          p.vy = 0;
          p.angle = slopeAngle;
          p.airRotation = slopeAngle;
        }
      }
    }

    this.distance = Math.max(this.distance, Math.floor((p.x - 80) / 10));

    this.generateWorldAhead(p.x + 2800);

    // Prune entities far behind the camera occasionally to avoid GC lag every frame
    if (!this.frameCount) this.frameCount = 0;
    this.frameCount++;
    if (this.frameCount % 60 === 0) {
      const pruneX = this.cameraX - 600;
      this.platformsList = this.platformsList.filter(plat => plat.endX > pruneX);
      this.starsList = this.starsList.filter(s => s.x > pruneX || !s.collected);
      this.gemsList = this.gemsList.filter(g => g.x > pruneX || !g.collected);
      this.skateboardsList = this.skateboardsList.filter(b => b.x > pruneX || !b.collected);
      this.carsList = this.carsList.filter(c => c.x > pruneX || !c.collected);
      this.robotEnemiesList = this.robotEnemiesList.filter(e => e.x > pruneX || !e.defeated);
      this.rocksList = this.rocksList.filter(r => r.x > pruneX);
      this.rampsList = this.rampsList.filter(r => r.x > pruneX);
      this.gapsList = this.gapsList.filter(g => g.endX > pruneX);
    }

    // Collision with Robot Enemies on platforms
    this.robotEnemiesList.forEach((robot) => {
      if (!robot.defeated && Math.hypot(p.x - robot.x, p.y - robot.y) < p.radius + robot.radius + 6) {
        robot.defeated = true;
        soundEngine.playExplosion();
        particleEngine.addExplosion(robot.x, robot.y);

        if (p.isDriving) {
          // Car destroys obstacle and is immune
        } else if (p.isSkating) {
          p.isSkating = false;
          p.skateTimer = 0;
          p.vy = -8;
        } else {
          this.triggerCrash();
        }
      }
    });

    this.starsList.forEach((star) => {
      if (!star.collected && Math.hypot(p.x - star.x, p.y - star.y) < 35) {
        star.collected = true;
        this.blueCrystals++;
        this.stars = this.blueCrystals;
        soundEngine.playStar();
        particleEngine.addStarBurst(star.x, star.y);
        this._uiDirty = true;
      }
    });

    this.gemsList.forEach((gem) => {
      if (!gem.collected && Math.hypot(p.x - gem.x, p.y - gem.y) < 36) {
        gem.collected = true;
        this.purpleCrystals++;
        this.updateUI({ blueCrystals: this.blueCrystals, purpleCrystals: this.purpleCrystals });
        soundEngine.playStar();
        particleEngine.addTrickBurst(gem.x, gem.y);
        this._uiDirty = true;
      }
    });

    this.rampsList.forEach((ramp) => {
      if (!ramp.used && Math.hypot(p.x - ramp.x, (p.y + p.radius) - ramp.y) < 30) {
        ramp.used = true;
        p.isGrounded = false;
        p.vy = -18.5; 
        p.airRotation = p.angle;
        p.flipDegrees = 0;
        soundEngine.playJump();
        particleEngine.addTrickBurst(ramp.x, ramp.y);
      }
    });

    this.rocksList.forEach((rock) => {
      if (Math.hypot(p.x - rock.x, (p.y + p.radius) - rock.y) < p.radius + rock.radius - 4) {
        if (p.isDriving) {
          soundEngine.playExplosion();
          particleEngine.addExplosion(rock.x, rock.y);
          rock.x = -9999;
        } else if (p.isSkating) {
          p.isSkating = false;
          p.skateTimer = 0;
          p.vy = -8;
          soundEngine.playExplosion();
          particleEngine.addExplosion(rock.x, rock.y);
          rock.x = -9999;
        } else {
          this.triggerCrash();
        }
      }
    });

    if (p.skateTimer > 0) {
      p.skateTimer--;
      if (p.skateTimer <= 0) {
        p.isSkating = false;
        p.vy = -12.0;
        p.isGrounded = false;
        p.canDoubleJump = true;
        soundEngine.playJump();
        particleEngine.addSkateboardBurst(p.x, p.y);
      }
    }

    if (p.carTimer > 0) {
      p.carTimer--;
      if (p.carTimer <= 0) {
        p.isDriving = false;
        p.vy = -12.0;
        p.isGrounded = false;
        p.canDoubleJump = true;
        soundEngine.playJump();
        particleEngine.addCarBurst(p.x, p.y);
      }
    }

    this.skateboardsList.forEach((board) => {
      if (!board.collected && Math.hypot(p.x - board.x, p.y - board.y) < p.radius + board.radius) {
        board.collected = true;
        p.isSkating = true;
        p.skateTimer = 60 * 15; // 15s
        p.vx = Math.min(maxSpeed + 0.6, p.vx + 0.8);
        soundEngine.playPower();
        particleEngine.addSkateboardBurst(board.x, board.y);
      }
    });

    this.carsList.forEach((car) => {
      if (!car.collected && Math.hypot(p.x - car.x, p.y - car.y) < p.radius + car.radius) {
        car.collected = true;
        p.isDriving = true;
        p.carTimer = 60 * 15; // 15s
        p.vx = Math.min(maxSpeed + 1.0, p.vx + 1.2);
        soundEngine.playPower();
        particleEngine.addCarBurst(car.x, car.y);
      }
    });



    if (this.state === 'GAMEOVER') return;

    this.gameTime += 0.0166;
    this.updateSpaceshipAndMissiles();

    if (this.state === 'CRASHING') {
      // Cinematic pan to center the player
      this.cameraX += (p.x - this.width * 0.5 - this.cameraX) * 0.015;
      this.cameraY += (p.y - this.height * 0.7 - this.cameraY) * 0.015;
    } else {
      this.cameraX += (p.x - this.width * 0.03 - this.cameraX) * 0.08;
      this.cameraY += (p.y - this.height * 1.05 - this.cameraY) * 0.08;
    }
    
    // Throttle UI updates: only push when values actually change
    if (this._uiDirty) {
      this._uiDirty = false;
      this.updateUI({ state: this.state, distance: this.distance, stars: this.stars, blueCrystals: this.blueCrystals, purpleCrystals: this.purpleCrystals, bestDistance: this.bestDistance });
    }
  }

  triggerCrash() {
    if (this.state === 'GAMEOVER' || this.state === 'CRASHING') return;
    this.state = 'CRASHING';
    soundEngine.playCrash();
    soundEngine.pauseBGM();

    let newRecord = false;
    if (this.distance > this.bestDistance) {
      this.bestDistance = this.distance;
      localStorage.setItem('zen_slide_best', this.bestDistance.toString());
      newRecord = true;
    }
    
    // Notify React so Character3D can play the fall animation
    this.updateUI({ state: 'CRASHING' });

    setTimeout(() => {
      this.state = 'GAMEOVER';
      this.updateUI({ state: 'GAMEOVER', distance: this.distance, stars: this.stars, blueCrystals: this.blueCrystals, purpleCrystals: this.purpleCrystals, bestDistance: this.bestDistance, tricksLanded: this.tricksLanded, newRecord });
    }, 5000);
  }

  render() {
    const zoom = 0.68;
    const viewW = this.width / zoom;
    const viewH = this.height / zoom;

    this.ctx.save();
    this.ctx.scale(zoom, zoom);

    // Cache the sky gradient — only recreate on resize
    if (!this._skyGrad || this._skyGradH !== viewH) {
      this._skyGrad = this.ctx.createLinearGradient(0, 0, 0, viewH);
      this._skyGrad.addColorStop(0, '#38bdf8');
      this._skyGrad.addColorStop(0.6, '#bae6fd');
      this._skyGrad.addColorStop(1, '#f0f9ff');
      this._skyGradH = viewH;
    }
    this.ctx.fillStyle = this._skyGrad;
    this.ctx.fillRect(0, 0, viewW, viewH);

    // Draw Panning Background Image
    const imgToDraw = this.blurredBg || this.bgImage;
    if (imgToDraw && imgToDraw.width > 0) {
      const parallaxRatio = 0.05; // Very slow pan
      const scale = viewH / imgToDraw.height;
      const scaledW = imgToDraw.width * scale;
      
      const offsetX = (this.cameraX * parallaxRatio) % scaledW;
      
      for (let x = -offsetX; x < viewW; x += scaledW) {
        this.ctx.drawImage(imgToDraw, x, 0, scaledW, viewH);
      }
    }

    // Sun removed for Cyberpunk theme

    this.drawPlatforms(viewW, viewH);
    this.drawMainTerrain(viewW, viewH);
    this.drawEntities(viewW);

    // Draw Spaceship Boss Laser & Hull
    if (this.ship && this.ship.active) {
      this.drawAimingLaser(this.player);
      this.drawSpaceship();
    }

    // Draw Active Missiles
    this.drawRockets();

    if (this.state === 'PLAYING' || this.state === 'GAMEOVER' || this.state === 'CRASHING') {
      this.drawPlayer();
    }

    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);
    particleEngine.updateAndDraw(this.ctx);
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

  drawLushTrees(parallaxRatio, color, viewW, viewH) {
    const offsetX = this.cameraX * parallaxRatio;
    for (let x = -50; x < viewW + 100; x += 85) {
      const worldX = Math.floor((x + offsetX) / 85) * 85;
      const groundY = this.getTerrainHeight(worldX) - (this.cameraY * 0.3);
      const screenX = worldX - offsetX;
      
      // Trunk
      this.ctx.fillStyle = '#78350f';
      this.ctx.fillRect(screenX - 4, groundY - 10, 8, 50);
      
      // Bushy Leaves (Kerala style lush)
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(screenX, groundY - 25, 22, 0, Math.PI * 2);
      this.ctx.arc(screenX - 16, groundY - 5, 20, 0, Math.PI * 2);
      this.ctx.arc(screenX + 16, groundY - 5, 20, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawMainTerrain(viewW, viewH) {
    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);
    
    // Lock terrain rendering to a strict world grid (step = 15) to prevent vertices from shifting or "shivering"
    const step = 15;
    const startX = Math.floor(this.cameraX / step) * step - (step * 4);
    const endX = startX + viewW + (step * 8);
    
    this.ctx.beginPath();
    this.ctx.moveTo(startX, viewH + this.cameraY + 400); // Start at bottom left
    
    let wasInGap = this.isOverGap(startX);
    if (!wasInGap) this.ctx.lineTo(startX, this.getTerrainHeight(startX));

    for (let x = startX; x <= endX; x += step) {
      const inGap = this.isOverGap(x);
      if (inGap && !wasInGap) {
        // Drop down vertically into cliff
        this.ctx.lineTo(x - 15, viewH + this.cameraY + 400);
      } else if (!inGap && wasInGap) {
        // Rise up vertically from cliff
        this.ctx.lineTo(x, viewH + this.cameraY + 400);
        this.ctx.lineTo(x, this.getTerrainHeight(x));
      } else if (!inGap) {
        this.ctx.lineTo(x, this.getTerrainHeight(x));
      }
      wasInGap = inGap;
    }
    this.ctx.lineTo(endX, viewH + this.cameraY + 400);
    this.ctx.closePath();
    
    // Fill the cross-section — cache gradient
    if (!this._earthGrad || this._earthGradH !== viewH) {
      this._earthGrad = this.ctx.createLinearGradient(0, viewH * 0.4, 0, viewH * 1.2);
      this._earthGrad.addColorStop(0, '#1e1b4b');
      this._earthGrad.addColorStop(0.5, '#0f172a');
      this._earthGrad.addColorStop(1, '#020617');
      this._earthGradH = viewH;
    }
    this.ctx.fillStyle = this._earthGrad;
    this.ctx.fill();

    // Draw neon rail — faux glow via thick translucent + thin bright, NO shadowBlur
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Outer glow layer (wide, translucent pink)
    this.ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
    this.ctx.lineWidth = 12;
    this.ctx.stroke();

    // Main neon rail
    this.ctx.strokeStyle = '#ec4899';
    this.ctx.lineWidth = 5;
    this.ctx.stroke();

    // White hot core
    this.ctx.strokeStyle = '#fbcfe8';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();


    this.ctx.restore();
  }

  drawEntities(viewW) {
    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);
    
    const camLeft = this.cameraX - 100;
    const camRight = this.cameraX + viewW + 100;

    // 1. Draw Floating Blue Crystals (Standard Collectibles)
    const starsList = this.starsList;
    for (let i = 0, len = starsList.length; i < len; i++) {
      const star = starsList[i];
      if (!star.collected && star.x > camLeft && star.x < camRight) {
        this.drawBlueCrystal(star.x, star.y);
      }
    }

    // 2. Draw Special Purple Crystals (Larger Shards)
    const gemsList = this.gemsList;
    for (let i = 0, len = gemsList.length; i < len; i++) {
      const gem = gemsList[i];
      if (!gem.collected && gem.x > camLeft && gem.x < camRight) {
        this.drawPurpleCrystal(gem.x, gem.y);
      }
    }
    this.rocksList.forEach((rock) => {
      if (rock.x > this.cameraX - 100 && rock.x < this.cameraX + viewW + 100) {
        this.ctx.save();
        this.ctx.translate(rock.x, rock.y);
        
        // Boulder Base
        this.ctx.beginPath();
        this.ctx.arc(0, 0, rock.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#57534e';
        this.ctx.fill();
        
        // Mossy Top
        this.ctx.beginPath();
        this.ctx.arc(0, -rock.radius * 0.2, rock.radius * 0.8, Math.PI, 0);
        this.ctx.fillStyle = '#22c55e';
        this.ctx.fill();

        this.ctx.lineWidth = 2.5;
        this.ctx.strokeStyle = '#44403c';
        this.ctx.stroke();
        
        this.ctx.restore();
      }
    });
    
    // Skateboards are rendered in 3D via SkateboardsOnTrack Component
    this.ctx.restore();
  }

  drawBlueCrystal(x, y) {
    const bob = Math.sin(this.gameTime * 4.5 + x * 0.04) * 4;
    const pulse = 0.85 + Math.sin(this.gameTime * 6 + x * 0.08) * 0.15;
    const cy = y + bob;

    this.ctx.save();
    this.ctx.translate(x, cy);

    // Cyan glowing aura
    this.ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 15 * pulse, 0, Math.PI * 2);
    this.ctx.fill();

    // Crystal Shard (Blue / Cyan)
    // Left facet (deeper cyan/blue)
    this.ctx.fillStyle = '#0284c7';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -12);
    this.ctx.lineTo(-7, 0);
    this.ctx.lineTo(0, 12);
    this.ctx.closePath();
    this.ctx.fill();

    // Right facet (bright cyan)
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -12);
    this.ctx.lineTo(7, 0);
    this.ctx.lineTo(0, 12);
    this.ctx.closePath();
    this.ctx.fill();

    // Top highlight facet
    this.ctx.fillStyle = '#7dd3fc';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -12);
    this.ctx.lineTo(3.5, 0);
    this.ctx.lineTo(0, 2);
    this.ctx.closePath();
    this.ctx.fill();

    // Center specular line
    this.ctx.strokeStyle = '#e0f2fe';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -12);
    this.ctx.lineTo(0, 12);
    this.ctx.stroke();

    // Outer crystal rim outline
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -12);
    this.ctx.lineTo(7, 0);
    this.ctx.lineTo(0, 12);
    this.ctx.lineTo(-7, 0);
    this.ctx.closePath();
    this.ctx.stroke();

    // Sparkle glint on apex
    if (Math.sin(this.gameTime * 10 + x) > 0.5) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(-1, -8, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawPurpleCrystal(x, y) {
    const bob = Math.sin(this.gameTime * 3.8 + x * 0.03) * 5;
    const pulse = 0.85 + Math.sin(this.gameTime * 5 + x * 0.06) * 0.15;
    const cy = y + bob;

    this.ctx.save();
    this.ctx.translate(x, cy);

    // Amethyst glowing outer halo
    this.ctx.fillStyle = 'rgba(217, 70, 239, 0.4)';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 22 * pulse, 0, Math.PI * 2);
    this.ctx.fill();

    // Special Purple Crystal Shard (~1.5x bigger, ~19px wide, ~34px tall)
    // Left facet (deep royal purple)
    this.ctx.fillStyle = '#7e22ce';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -17);
    this.ctx.lineTo(-10, -1);
    this.ctx.lineTo(0, 17);
    this.ctx.closePath();
    this.ctx.fill();

    // Right facet (bright neon magenta / amethyst)
    this.ctx.fillStyle = '#d946ef';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -17);
    this.ctx.lineTo(10, -1);
    this.ctx.lineTo(0, 17);
    this.ctx.closePath();
    this.ctx.fill();

    // Upper facet highlight
    this.ctx.fillStyle = '#f0abfc';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -17);
    this.ctx.lineTo(5, -1);
    this.ctx.lineTo(0, 4);
    this.ctx.closePath();
    this.ctx.fill();

    // Center specular line
    this.ctx.strokeStyle = '#fdf4ff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -17);
    this.ctx.lineTo(0, 17);
    this.ctx.stroke();

    // Outer neon outline
    this.ctx.strokeStyle = '#f472b6';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -17);
    this.ctx.lineTo(10, -1);
    this.ctx.lineTo(0, 17);
    this.ctx.lineTo(-10, -1);
    this.ctx.closePath();
    this.ctx.stroke();

    // Sparkle glint on apex
    if (Math.sin(this.gameTime * 8 + x) > 0.3) {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(-2, -11, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawPlayer() {
    // 2D Character disabled in favor of 3D GLB character
  }

  drawRaccoonTail(p) {
    const time = Date.now() * 0.007;
    const numSteps = 24; 
    const startX = -6;  
    const startY = -20;
    const totalLength = 36; 
    const stripeColors = [
      '#231f1d', '#231f1d', '#b5aaa0', '#b5aaa0', '#231f1d', '#231f1d',
      '#b5aaa0', '#b5aaa0', '#231f1d', '#231f1d', '#b5aaa0', '#b5aaa0'
    ];
    for (let i = numSteps; i >= 0; i--) {
      const t = i / numSteps;
      const wave = Math.sin(time + t * 3.5) * (3.5 + p.vx * 0.5) * Math.sqrt(t);
      const px = startX - (t * totalLength);
      const py = startY - (t * 8) + wave;
      const radius = 3.0 + Math.sin(Math.pow(t, 0.7) * Math.PI) * 4.8;
      const stripeIdx = Math.floor(t * stripeColors.length);
      const color = stripeColors[Math.min(stripeIdx, stripeColors.length - 1)];
      this.ctx.beginPath();
      this.ctx.arc(px, py, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }
  }

  spawnSpaceship(viewW, viewH) {
    this.ship.active = true;
    this.ship.state = 'entering';
    this.ship.relX = viewW + 180;
    this.ship.relY = viewH * 0.58; // Bottom 50%
    this.ship.x = this.cameraX + this.ship.relX;
    this.ship.y = this.cameraY + this.ship.relY;
    this.ship.shotsLeft = 3;
    this.ship.timer = 0;
    this.ship.shootTimer = 180;
  }

  updateSpaceshipAndMissiles() {
    const zoom = 0.68;
    const viewW = this.width / zoom;
    const viewH = this.height / zoom;

    // 1. Check Level Spawning Triggers
    const currentLevel = this.distance < 1000 ? 1 : (this.distance < 2500 ? 2 : 3);
    if (this.state === 'PLAYING' && !this.ship.active) {
      if (currentLevel === 2) {
        if (!this.level2Spawned) {
          this.level2Spawned = true;
          this.lastShipSpawnDistance = this.distance;
          this.spawnSpaceship(viewW, viewH);
        } else if (this.distance - this.lastShipSpawnDistance >= 1500) {
          this.lastShipSpawnDistance = this.distance;
          this.spawnSpaceship(viewW, viewH);
        }
      } else if (currentLevel === 3) {
        if (this.distance - this.lastShipSpawnDistance >= 800) {
          this.lastShipSpawnDistance = this.distance;
          this.spawnSpaceship(viewW, viewH);
        }
      }
    }

    // 2. Spaceship State Machine & Autonomous Behavior
    if (this.ship.active) {
      const s = this.ship;
      const targetRelX = viewW * 0.85;
      const targetRelY = viewH * 0.58;

      if (s.state === 'entering') {
        s.relX -= 6;
        if (s.relX <= targetRelX) {
          s.relX = targetRelX;
          s.state = 'aiming';
          s.shootTimer = 180; // ~3.0s delay for 1st shot
        }
      } else if (s.state === 'aiming') {
        s.relX = targetRelX;
        s.shootTimer--;
        if (s.shootTimer <= 0) {
          const spawnX = s.x - 45;
          const spawnY = s.y + 10;
          // Snapshot player world position at trigger time
          const targetX = this.player.x;
          const targetY = this.player.y;

          const angle = Math.atan2(targetY - spawnY, targetX - spawnX);
          const speed = 2.2; // Smooth, slow missile flight speed

          const newRocket = {
            active: true,
            x: spawnX,
            y: spawnY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            rot: angle,
            life: 450
          };

          this.rocketsList.push(newRocket);
          soundEngine.playMissileLaunch();
          s.shotsLeft--;
          s.state = 'firing';
          s.timer = 60; // 1s Cooldown
        }
      } else if (s.state === 'firing') {
        s.relX = targetRelX;
        s.timer--;
        if (s.timer <= 0) {
          if (s.shotsLeft > 0) {
            s.state = 'aiming';
            s.shootTimer = 90; // Faster delay ~1.5s for follow-up shots
          } else {
            s.state = 'leaving';
          }
        }
      } else if (s.state === 'leaving') {
        s.relX += 8;
        if (s.relX > viewW + 300) {
          s.active = false;
          s.state = 'idle';
        }
      }

      // Spaceship world coordinates
      s.x = this.cameraX + s.relX;
      s.y = this.cameraY + targetRelY;
    }

    // 3. Rocket Movement, Trails & Collision in World Space
    for (let i = this.rocketsList.length - 1; i >= 0; i--) {
      const r = this.rocketsList[i];
      if (!r.active) {
        this.rocketsList.splice(i, 1);
        continue;
      }

      r.x += r.vx;
      r.y += r.vy;
      r.life--;

      // Visual exhaust particles in world coordinates
      particleEngine.addRocketExhaust(r.x, r.y, r.rot);

      // Player Collision Check (Full body hitbox covering head, chest, legs, and vehicles)
      const p = this.player;
      const charWidth = p.isDriving ? 34 : (p.isSkating ? 24 : 20);
      const charTop = p.y - (p.isDriving ? 28 : 40);
      const charBottom = p.y + 18;
      const charLeft = p.x - charWidth;
      const charRight = p.x + charWidth;

      const rocketLeft = r.x - 22;
      const rocketRight = r.x + 22;
      const rocketTop = r.y - 12;
      const rocketBottom = r.y + 12;

      const isColliding = (charLeft <= rocketRight && charRight >= rocketLeft && charTop <= rocketBottom && charBottom >= rocketTop)
        || (Math.hypot(p.x - r.x, (p.y - 12) - r.y) < 34);

      if (isColliding) {
        r.active = false;
        particleEngine.addExplosion(r.x, r.y);
        soundEngine.playExplosion();

        if (p.isDriving) {
          // Immune to missiles
        } else if (p.isSkating) {
          p.isSkating = false;
          p.skateTimer = 0;
          p.vy = -8;
        } else {
          this.triggerCrash();
        }

        this.rocketsList.splice(i, 1);
        continue;
      }

      // Target Reach or Ground Impact Check
      const groundY = this.getTerrainHeight(r.x);
      if (r.y >= groundY || r.life <= 0 || r.x < this.cameraX - 400) {
        r.active = false;
        particleEngine.addExplosion(r.x, Math.min(r.y, groundY));
        soundEngine.playExplosion();
        this.rocketsList.splice(i, 1);
        continue;
      }
    }
  }

  drawAimingLaser(player) {
    if (!this.ship.active || this.ship.state !== 'aiming') return;

    const shipX = this.ship.x - 45;
    const shipY = this.ship.y + 10;
    const p = player || this.player;
    const playerX = p.x;
    const playerY = p.y;

    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

    const pulse = 0.55 + Math.sin(this.gameTime * 14) * 0.45;
    this.ctx.setLineDash([12, 8]);
    this.ctx.lineDashOffset = -this.gameTime * 45;

    // Glowing outer red laser
    this.ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 * pulse})`;
    this.ctx.lineWidth = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(shipX, shipY);
    this.ctx.lineTo(playerX, playerY);
    this.ctx.stroke();

    // Bright inner red/white laser line
    this.ctx.strokeStyle = `rgba(255, 75, 75, ${0.95 * pulse})`;
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(shipX, shipY);
    this.ctx.lineTo(playerX, playerY);
    this.ctx.stroke();

    // Pulsing target lock reticle on the player
    this.drawTargetReticle(playerX, playerY, pulse);

    this.ctx.restore();
  }

  drawTargetReticle(x, y, pulse) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(this.gameTime * 3);

    const radius = 24 + Math.sin(this.gameTime * 10) * 3;
    this.ctx.strokeStyle = `rgba(239, 68, 68, ${0.85 * pulse})`;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([]);

    // Reticle circle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    // 4 Crosshair ticks
    const tickLen = 7;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      this.ctx.beginPath();
      this.ctx.moveTo(Math.cos(angle) * (radius - tickLen), Math.sin(angle) * (radius - tickLen));
      this.ctx.lineTo(Math.cos(angle) * (radius + tickLen), Math.sin(angle) * (radius + tickLen));
      this.ctx.stroke();
    }

    // Center warning target dot
    this.ctx.fillStyle = `rgba(255, 30, 30, ${pulse})`;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawSpaceship() {
    if (!this.ship.active) return;

    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);
    this.ctx.translate(this.ship.x, this.ship.y);

    // Thruster engine glow / flame (scaled for 1.5x hull)
    const plume = 1.0 + Math.sin(this.gameTime * 25) * 0.25;
    this.ctx.fillStyle = 'rgba(6, 182, 212, 0.45)';
    this.ctx.beginPath();
    this.ctx.arc(68, 3, 26 * plume, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(217, 70, 239, 0.7)';
    this.ctx.beginPath();
    this.ctx.arc(68, 3, 15 * plume, 0, Math.PI * 2);
    this.ctx.fill();

    // 2D SVG canvas replaced with 3D Red Tail GLB model in Three.js Canvas
    // (Thrusters and aiming strobe continue to provide atmospheric glow)

    // Red warning targeting strobe when aiming
    if (this.ship.state === 'aiming') {
      const flash = Math.sin(this.gameTime * 22) > 0;
      this.ctx.fillStyle = flash ? '#ef4444' : '#f87171';
      this.ctx.beginPath();
      this.ctx.arc(-64, 8, 6.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Translucent warning aura
      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      this.ctx.beginPath();
      this.ctx.arc(-64, 8, 14, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawRockets() {
    if (!this.rocketsList || this.rocketsList.length === 0) return;

    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

    for (let i = 0; i < this.rocketsList.length; i++) {
      const r = this.rocketsList[i];
      if (r.active) {
        this.drawRocket(r);
      }
    }

    this.ctx.restore();
  }

  drawRocket(r) {
    this.ctx.save();
    this.ctx.translate(r.x, r.y);
    this.ctx.rotate(r.rot);

    // Rear Thruster Fire
    const thrusterScale = 1.0 + Math.sin(this.gameTime * 35) * 0.3;
    this.ctx.beginPath();
    this.ctx.moveTo(-16, -4);
    this.ctx.lineTo(-28 * thrusterScale, 0);
    this.ctx.lineTo(-16, 4);
    this.ctx.closePath();
    this.ctx.fillStyle = '#f97316';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(-16, -2);
    this.ctx.lineTo(-22 * thrusterScale, 0);
    this.ctx.lineTo(-16, 2);
    this.ctx.closePath();
    this.ctx.fillStyle = '#fef08a';
    this.ctx.fill();

    // Tail Fins
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.moveTo(-12, -6);
    this.ctx.lineTo(-18, -12);
    this.ctx.lineTo(-6, -6);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(-12, 6);
    this.ctx.lineTo(-18, 12);
    this.ctx.lineTo(-6, 6);
    this.ctx.closePath();
    this.ctx.fill();

    // Missile Body
    this.ctx.fillStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.roundRect(-16, -6, 26, 12, 3);
    this.ctx.fill();
    this.ctx.strokeStyle = '#475569';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Neon cyan power stripe
    this.ctx.fillStyle = '#06b6d4';
    this.ctx.fillRect(-10, -1.5, 14, 3);

    // Warhead Nose (Hot Neon Red/Orange)
    this.ctx.fillStyle = '#ef4444';
    this.ctx.beginPath();
    this.ctx.moveTo(10, -6);
    this.ctx.lineTo(22, 0);
    this.ctx.lineTo(10, 6);
    this.ctx.closePath();
    this.ctx.fill();

    // Glowing warhead beacon
    this.ctx.fillStyle = '#fde047';
    this.ctx.beginPath();
    this.ctx.arc(13, 0, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawPlatforms(viewW, viewH) {
    if (!this.platformsList || this.platformsList.length === 0) return;

    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

    const camLeft = this.cameraX - 150;
    const camRight = this.cameraX + viewW + 150;

    for (let i = 0; i < this.platformsList.length; i++) {
      const plat = this.platformsList[i];
      if (plat.endX < camLeft || plat.startX > camRight) continue;

      let neonColor = '#06b6d4';
      let neonGlow = 'rgba(6, 182, 212, 0.4)';
      let coreColor = '#e0f2fe';

      if (plat.tier === 2) {
        neonColor = '#facc15';
        neonGlow = 'rgba(250, 204, 21, 0.4)';
        coreColor = '#fef9c3';
      } else if (plat.tier === 3) {
        neonColor = '#d946ef';
        neonGlow = 'rgba(217, 70, 239, 0.45)';
        coreColor = '#fdf4ff';
      }

      const step = 15;
      const startX = plat.startX;
      const endX = plat.endX;
      const deckThick = 12;

      // 1. Draw Floating Anti-Gravity Thruster Pods & Energy Flares underneath
      if (plat.thrusters) {
        plat.thrusters.forEach((tx) => {
          if (tx < camLeft - 40 || tx > camRight + 40) return;

          const ty = this.getTerrainHeight(tx) - plat.heightOffset;
          const flarePulse = 0.75 + Math.sin(this.gameTime * 22 + tx * 0.04) * 0.25;

          // Downward Anti-Gravity Thruster Plasma Flare
          this.ctx.fillStyle = neonGlow;
          this.ctx.beginPath();
          this.ctx.moveTo(tx - 6, ty + deckThick);
          this.ctx.lineTo(tx + 6, ty + deckThick);
          this.ctx.lineTo(tx + 11, ty + deckThick + (20 * flarePulse));
          this.ctx.lineTo(tx - 11, ty + deckThick + (20 * flarePulse));
          this.ctx.closePath();
          this.ctx.fill();

          // Bright Core Plasma Cone
          this.ctx.fillStyle = coreColor;
          this.ctx.beginPath();
          this.ctx.moveTo(tx - 3, ty + deckThick);
          this.ctx.lineTo(tx + 3, ty + deckThick);
          this.ctx.lineTo(tx + 5, ty + deckThick + (9 * flarePulse));
          this.ctx.lineTo(tx - 5, ty + deckThick + (9 * flarePulse));
          this.ctx.closePath();
          this.ctx.fill();

          // Metallic Thruster Nozzle Mount
          this.ctx.fillStyle = '#1e293b';
          this.ctx.fillRect(tx - 7, ty + deckThick - 2, 14, 5);
          this.ctx.fillStyle = '#475569';
          this.ctx.fillRect(tx - 5, ty + deckThick + 1, 10, 2);
        });
      }

      // 2. Draw Sleek Floating Platform Deck Body
      this.ctx.beginPath();
      // Top curve
      this.ctx.moveTo(startX, this.getTerrainHeight(startX) - plat.heightOffset);
      for (let x = startX + step; x <= endX; x += step) {
        this.ctx.lineTo(x, this.getTerrainHeight(x) - plat.heightOffset);
      }
      this.ctx.lineTo(endX, this.getTerrainHeight(endX) - plat.heightOffset);

      // Bottom curve
      this.ctx.lineTo(endX, this.getTerrainHeight(endX) - plat.heightOffset + deckThick);
      for (let x = endX - step; x >= startX; x -= step) {
        this.ctx.lineTo(x, this.getTerrainHeight(x) - plat.heightOffset + deckThick);
      }
      this.ctx.lineTo(startX, this.getTerrainHeight(startX) - plat.heightOffset + deckThick);
      this.ctx.closePath();

      // Deck Dark Hull Fill
      this.ctx.fillStyle = '#090d16';
      this.ctx.fill();

      // Deck Under-rim bevel stroke
      this.ctx.strokeStyle = '#1e293b';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      // 3. Draw Top Glowing Neon Sky Rail (Wide Glow + Bright Neon + White-Hot Core)
      this.ctx.beginPath();
      this.ctx.moveTo(startX, this.getTerrainHeight(startX) - plat.heightOffset);
      for (let x = startX + step; x <= endX; x += step) {
        this.ctx.lineTo(x, this.getTerrainHeight(x) - plat.heightOffset);
      }
      this.ctx.lineTo(endX, this.getTerrainHeight(endX) - plat.heightOffset);

      // Wide Translucent Neon Glow
      this.ctx.strokeStyle = neonGlow;
      this.ctx.lineWidth = 10;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();

      // Bright Main Neon Line
      this.ctx.strokeStyle = neonColor;
      this.ctx.lineWidth = 4;
      this.ctx.stroke();

      // White-Hot Energy Core
      this.ctx.strokeStyle = coreColor;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      // 4. Edge Terminal Beacons at start & end of floating platform
      const startY = this.getTerrainHeight(startX) - plat.heightOffset;
      const endY = this.getTerrainHeight(endX) - plat.heightOffset;
      const beaconPulse = 0.7 + Math.sin(this.gameTime * 12 + i) * 0.3;

      // Start Terminal Node
      this.ctx.fillStyle = neonGlow;
      this.ctx.beginPath();
      this.ctx.arc(startX, startY, 9 * beaconPulse, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = neonColor;
      this.ctx.beginPath();
      this.ctx.arc(startX, startY, 4, 0, Math.PI * 2);
      this.ctx.fill();

      // End Terminal Node
      this.ctx.fillStyle = neonGlow;
      this.ctx.beginPath();
      this.ctx.arc(endX, endY, 9 * beaconPulse, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = neonColor;
      this.ctx.beginPath();
      this.ctx.arc(endX, endY, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  loop() {
    this._uiDirty = true;
    this.updatePhysics();
    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }
}
