/**
 * Web Audio API Sound Synthesizer
 * Provides crisp 8-bit / arcade sound effects without external audio files.
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;

    // Custom Tap Voice Dialogue Audio
    this.voiceAudio = new Audio('tap_sound.ogg');
    this.voiceAudio.volume = 0.85;
    this.voiceAudio.preload = 'auto';
    this._wasPlayingBeforePause = false;

    this.initUserInteraction();
  }

  initUserInteraction() {
    const unlockAudio = () => {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      if (this.voiceAudio) {
        this.voiceAudio.load();
      }
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('mousedown', unlockAudio);
    };

    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('mousedown', unlockAudio);
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.voiceAudio) {
      this.voiceAudio.muted = this.isMuted;
    }
    return this.isMuted;
  }

  stopVoice() {
    if (this.voiceAudio) {
      try {
        this.voiceAudio.pause();
        this.voiceAudio.currentTime = 0;
      } catch (e) {}
    }
  }

  pauseVoice() {
    if (this.voiceAudio && !this.voiceAudio.paused) {
      this.voiceAudio.pause();
      this._wasPlayingBeforePause = true;
    }
  }

  resumeVoice() {
    if (this.voiceAudio && this._wasPlayingBeforePause && !this.isMuted) {
      this.voiceAudio.play().catch(() => {});
      this._wasPlayingBeforePause = false;
    }
  }

  /**
   * Sound: Wing Flap / Tap Screen
   * Plays the custom voice dialogue smoothly on tap, mixed with crisp jump whoosh.
   */
  playFlap() {
    if (this.isMuted) return;

    // 1. Play Voice Dialogue on Tap
    if (this.voiceAudio) {
      try {
        if (this.voiceAudio.paused || this.voiceAudio.ended) {
          this.voiceAudio.currentTime = 0;
          const p = this.voiceAudio.play();
          if (p !== undefined) p.catch(() => {});
        }
      } catch (e) {
        console.warn('Voice play error:', e);
      }
    }

    // 2. Mix in crisp jump chirp
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.11);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  /**
   * Sound: Point Scored (two-tone coin chime)
   */
  playScore() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      
      // Note 1: B5 (987.77 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(988, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Note 2: E6 (1318.5 Hz)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1319, now + 0.08);
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.28);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  /**
   * Sound: Level Up Victory Fanfare
   */
  playLevelUp() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6 triumphant fanfare
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.09;
        const dur = 0.22;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.22, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      });
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  /**
   * Sound: Collision / Hit pipe (sharp thud / burst)
   */
  playHit() {
    this.stopVoice();
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }

  /**
   * Sound: Falling / Game over ground smack
   */
  playDie() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.35);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn("Audio play error", e);
    }
  }
}

window.soundManager = new SoundManager();

