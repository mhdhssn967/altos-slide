/* ==========================================================================
   WEB AUDIO SYNTHESIZER & BGM ENGINE FOR ZEN SLIDE
   Serene Ambient Soundscape, Background Music & Dynamic Sound Effects
   ========================================================================== */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;

    // Background Music Audio Element (gamebg.mp3)
    this.bgm = new Audio('/gamebg.mp3');
    this.bgm.loop = true;
    this.bgm.volume = 0.5;

    // Custom sound effect audio elements
    this.powerAudio = new Audio('/sounds/power.mp3');
    this.powerAudio.preload = 'auto';

    this.missileAudio = new Audio('/sounds/missile.mp3');
    this.missileAudio.preload = 'auto';

    this.explosionAudio = new Audio('/sounds/explosion.mp3');
    this.explosionAudio.preload = 'auto';
  }

  playAudioFile(audioObj, volume = 0.7) {
    if (!this.enabled || !audioObj) return;
    this.ensureContext();
    try {
      const soundClone = audioObj.cloneNode();
      soundClone.volume = volume;
      soundClone.play().catch(() => {});
    } catch (e) {
      try {
        audioObj.currentTime = 0;
        audioObj.volume = volume;
        audioObj.play().catch(() => {});
      } catch (err) {}
    }
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.initialized = true;
      }
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.bgm) {
      this.bgm.pause();
    } else if (this.enabled && this.bgm) {
      this.playBGM();
    }
    return this.enabled;
  }

  playBGM() {
    if (!this.enabled || !this.bgm) return;
    this.ensureContext();
    this.bgm.play().catch((e) => {
      console.warn('BGM autoplay blocked until user gesture', e);
    });
  }

  pauseBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }

  // Jump Whoosh Sound
  playJump() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Double Jump Sci-Fi Nitro Thrust Sound
  playDoubleJump() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // 1. High-energy rising synth sweep (double jump chime)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);

    // 2. Nitro Plasma Whoosh (filtered noise / low-mid punch)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(580, now);
    osc2.frequency.exponentialRampToValueAtTime(140, now + 0.18);
    gain2.gain.setValueAtTime(0.22, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.18);
  }

  // Star Collection Chime
  playStar() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1046.5, now); // C6
    osc.frequency.exponentialRampToValueAtTime(1567.98, now + 0.12); // G6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  // Backflip Trick Landed Chime
  playBackflip() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0, noteTime);
      gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.3);
    });
  }

  // Crash / Wipeout Sound
  playCrash() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Power-up Collected Sound (Skateboard / Car)
  playPower() {
    this.playAudioFile(this.powerAudio, 0.8);
  }

  // Missile Launch Sound (Played when missile is fired)
  playMissileLaunch() {
    this.playAudioFile(this.missileAudio, 0.75);
  }

  // Missile Impact / Explosion Sound (Played on missile hit)
  playExplosion() {
    this.playAudioFile(this.explosionAudio, 0.9);
  }
}

export const soundEngine = new SoundEngine();
