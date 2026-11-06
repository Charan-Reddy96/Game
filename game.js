/**
 * FLAPPY BIRD - Core Game Engine
 * Highly customizable and modular.
 */

// --- CONFIGURATION & GAME TUNING ---
const CONFIG = {
  // Physics
  gravity: 784,           // Downward acceleration (px/s^2) - Reduced by 20% from 980
  jumpForce: -295,        // Upward impulse on flap (px/s) - Softened for smoother control
  maxFallSpeed: 400,      // Terminal falling velocity (px/s)
  rotationSpeed: 6,       // How quickly bird rotates downwards

  // Pipes
  pipeSpeed: 112,         // Horizontal speed (px/s) - Reduced by 20% from 140
  pipeSpawnInterval: 2.0, // Seconds between new pipe pairs (keeps fair horizontal gap)
  pipeGap: 142,           // Vertical opening space between pipes
  pipeWidth: 60,          // Width of each pipe
  minPipeHeight: 60,      // Minimum pipe length from top/bottom
  pipeRimHeight: 24,      // Collar/rim height
  pipeRimOverlap: 4,      // How much the rim extends past pipe width

  // Player Character (Gutam)
  birdX: 90,              // Fixed X position of player
  birdRadius: 17,         // Hitbox radius
  birdWingSpeed: 7,       // Bounce animation speed
  playerWidth: 38,        // Render width of Gutam's head
  playerHeight: 52,       // Render height of Gutam's head

  // Environment
  groundHeight: 85,       // Height of moving floor
  bgSpeed: 24,            // Parallax photo background speed (px/s)
  cloudsSpeed: 16,        // Speed of distant clouds
  citySpeed: 36,          // Speed of background hills/skyline
};

// --- PROGRESSIVE LEVEL SYSTEM ---
const LEVELS = [
  { level: 1, minScore: 0,  pipeGap: 175, pipeSpeed: 105, spawnInterval: 2.1, name: "LEVEL 1 - EASY BREEZE" },
  { level: 2, minScore: 8,  pipeGap: 165, pipeSpeed: 112, spawnInterval: 2.0, name: "LEVEL 2 - CANYON FLIGHT" },
  { level: 3, minScore: 20, pipeGap: 156, pipeSpeed: 120, spawnInterval: 1.9, name: "LEVEL 3 - RIVER RAPIDS" },
  { level: 4, minScore: 35, pipeGap: 148, pipeSpeed: 128, spawnInterval: 1.8, name: "LEVEL 4 - GUTAM MASTER" },
  { level: 5, minScore: 55, pipeGap: 142, pipeSpeed: 135, spawnInterval: 1.7, name: "LEVEL 5 - LEGENDARY" },
];

// --- GAME STATE ---
const GameState = {
  START: 'START',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER'
};

class FlappyBirdGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // DOM Elements
    this.scoreDisplay = document.getElementById('score-display');
    this.startScreen = document.getElementById('start-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.finalScoreEl = document.getElementById('final-score');
    this.bestScoreEl = document.getElementById('best-score');
    this.medalEl = document.getElementById('medal');
    this.newHighScoreBadge = document.getElementById('new-high-score-badge');
    this.restartBtn = document.getElementById('restart-btn');
    this.muteBtn = document.getElementById('mute-btn');
    this.levelBadge = document.getElementById('level-badge');
    this.levelToast = document.getElementById('level-up-toast');
    this.levelToastDesc = document.getElementById('level-toast-desc');
    this.finalLevelEl = document.getElementById('final-level');

    // State Variables
    this.state = GameState.START;
    this.lastTime = 0;
    this.score = 0;
    this.bestScore = parseInt(localStorage.getItem('flappy_bird_best') || '0', 10);
    this.gameOverTimer = 0; // Cooldown timer before accepting restart taps
    this.currentLevel = 1;
    this.levelToastTimeout = null;

    // Audio
    this.audio = window.soundManager;

    // Player Avatar Image
    this.playerImg = new Image();
    this.playerImg.src = 'gutam_player_bordered.png';

    // Photo Background Image
    this.bgImg = new Image();
    this.bgImg.src = 'background.jpg';
    this.bgScroll = 0;

    // Visual Effects
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.flashAlpha = 0;
    this.particles = [];
    this.scorePopups = [];

    // Background Scroll Offsets
    this.groundScroll = 0;
    this.cityScroll = 0;
    this.cloudsScroll = 0;

    // Clouds Data
    this.clouds = [
      { x: 30, y: 50, scale: 0.9 },
      { x: 190, y: 90, scale: 0.7 },
      { x: 320, y: 40, scale: 1.1 }
    ];

    // Game Entities
    this.bird = {
      x: CONFIG.birdX,
      y: this.canvas.height / 2 - 20,
      vy: 0,
      angle: 0,
      wingFrame: 0,
      wingDir: 1,
      targetAngle: 0,
      hoverOffset: 0,
      dead: false
    };

    this.pipes = [];
    this.timeSinceLastPipe = 0;

    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleTap = this.handleTap.bind(this);
    this.loop = this.loop.bind(this);

    this.init();
  }

  init() {
    // Event Listeners
    window.addEventListener('keydown', this.handleKeyDown);
    this.canvas.parentElement.addEventListener('pointerdown', this.handleTap);
    this.restartBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.resetGame();
      this.state = GameState.PLAYING;
      this.syncUI();
      this.flap();
    });

    this.muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const muted = this.audio.toggleMute();
      this.muteBtn.textContent = muted ? '🔇' : '🔊';
    });

    this.applyLevel(1, false);
    this.syncUI();
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  resetGame() {
    this.state = GameState.START;
    this.score = 0;
    this.scoreDisplay.textContent = '0';
    this.pipes = [];
    this.particles = [];
    this.scorePopups = [];
    this.timeSinceLastPipe = 0;
    this.shakeDuration = 0;
    this.flashAlpha = 0;
    this.gameOverTimer = 0;

    // Reset Level & Gap
    this.currentLevel = 1;
    this.applyLevel(1, false);
    if (this.audio && this.audio.stopVoice) this.audio.stopVoice();
    if (this.levelToastTimeout) clearTimeout(this.levelToastTimeout);
    this.levelToast.classList.add('hidden');

    this.bird.x = CONFIG.birdX;
    this.bird.y = this.canvas.height / 2 - 20;
    this.bird.vy = 0;
    this.bird.angle = 0;
    this.bird.targetAngle = 0;
    this.bird.dead = false;

    this.syncUI();
  }

  getLevelForScore(score) {
    let matched = LEVELS[0];
    for (const lvl of LEVELS) {
      if (score >= lvl.minScore) {
        matched = lvl;
      }
    }
    return matched;
  }

  applyLevel(levelNum, showToast = true) {
    const lvlConfig = LEVELS.find(l => l.level === levelNum) || LEVELS[0];
    this.currentLevel = lvlConfig.level;
    if (this.levelBadge) {
      this.levelBadge.textContent = `LVL ${this.currentLevel}`;
    }

    CONFIG.pipeGap = lvlConfig.pipeGap;
    CONFIG.pipeSpeed = lvlConfig.pipeSpeed;
    CONFIG.pipeSpawnInterval = lvlConfig.spawnInterval;

    if (showToast && this.levelToast && this.levelToastDesc) {
      this.levelBadge.classList.add('level-pop');
      setTimeout(() => this.levelBadge.classList.remove('level-pop'), 250);

      this.levelToastDesc.textContent = lvlConfig.name;
      this.levelToast.classList.remove('hidden');

      if (this.levelToastTimeout) clearTimeout(this.levelToastTimeout);
      this.levelToastTimeout = setTimeout(() => {
        this.levelToast.classList.add('hidden');
      }, 2300);

      this.audio.playLevelUp();

      // Celebration burst of confetti stars
      const confColors = ['#ffd32a', '#ff4757', '#2ed573', '#1e90ff', '#ffffff', '#ffa502'];
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 140;
        this.particles.push({
          x: this.canvas.width / 2,
          y: 95,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 4,
          alpha: 1,
          color: confColors[Math.floor(Math.random() * confColors.length)]
        });
      }
    }
  }

  syncUI() {
    this.startScreen.classList.toggle('hidden', this.state !== GameState.START);
    this.pauseScreen.classList.toggle('hidden', this.state !== GameState.PAUSED);
    this.gameoverScreen.classList.toggle('hidden', this.state !== GameState.GAMEOVER);

    // Score & Level display visibility
    if (this.state === GameState.START || this.state === GameState.GAMEOVER) {
      this.scoreDisplay.style.opacity = '0';
      if (this.levelBadge) this.levelBadge.style.opacity = '0';
    } else {
      this.scoreDisplay.style.opacity = '1';
      if (this.levelBadge) this.levelBadge.style.opacity = '1';
    }

    if (this.state === GameState.GAMEOVER) {
      this.finalScoreEl.textContent = this.score;
      this.bestScoreEl.textContent = this.bestScore;
      if (this.finalLevelEl) {
        this.finalLevelEl.textContent = this.currentLevel;
      }

      // Check for new best
      const isNewBest = this.score > this.bestScore;
      if (isNewBest) {
        this.bestScore = this.score;
        localStorage.setItem('flappy_bird_best', this.bestScore.toString());
        this.bestScoreEl.textContent = this.bestScore;
        this.newHighScoreBadge.classList.remove('hidden');
      } else {
        this.newHighScoreBadge.classList.add('hidden');
      }

      // Medals
      this.medalEl.className = '';
      if (this.score >= 40) {
        this.medalEl.className = 'medal-platinum';
        this.medalEl.textContent = '💎';
      } else if (this.score >= 25) {
        this.medalEl.className = 'medal-gold';
        this.medalEl.textContent = '🥇';
      } else if (this.score >= 10) {
        this.medalEl.className = 'medal-silver';
        this.medalEl.textContent = '🥈';
      } else if (this.score >= 5) {
        this.medalEl.className = 'medal-bronze';
        this.medalEl.textContent = '🥉';
      } else {
        this.medalEl.className = 'medal-none';
        this.medalEl.textContent = '•';
      }
    }
  }

  handleKeyDown(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      this.handleAction();
    } else if (e.code === 'KeyP' || e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      this.togglePause();
    } else if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      const muted = this.audio.toggleMute();
      this.muteBtn.textContent = muted ? '🔇' : '🔊';
    } else if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
      if (this.state === GameState.GAMEOVER) {
        this.resetGame();
        this.state = GameState.PLAYING;
        this.syncUI();
        this.flap();
      }
    }
  }

  handleTap(e) {
    // Avoid triggering when tapping controls like mute
    if (e.target.closest('#hud') || e.target.closest('#restart-btn')) return;
    this.handleAction();
  }

  handleAction() {
    if (this.state === GameState.START) {
      this.state = GameState.PLAYING;
      this.syncUI();
      this.flap();
    } else if (this.state === GameState.PLAYING) {
      this.flap();
    } else if (this.state === GameState.PAUSED) {
      this.togglePause();
    } else if (this.state === GameState.GAMEOVER && this.gameOverTimer >= 0.4) {
      this.resetGame();
      this.state = GameState.PLAYING;
      this.syncUI();
      this.flap();
    }
  }

  togglePause() {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      if (this.audio.pauseVoice) this.audio.pauseVoice();
      this.syncUI();
    } else if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      if (this.audio.resumeVoice) this.audio.resumeVoice();
      this.lastTime = performance.now();
      this.syncUI();
    }
  }

  flap() {
    if (this.bird.dead) return;
    this.bird.vy = CONFIG.jumpForce;
    this.bird.targetAngle = -0.42; // ~ -24 degrees
    this.bird.angle = -0.42;
    this.audio.playFlap();

    // Spawn teeth & smile emojis on flap
    const teethEmojis = ['🦷', '😁', '😬', '🦷', '✨'];
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: this.bird.x - 14 + (Math.random() * 6),
        y: this.bird.y + (Math.random() - 0.5) * 14,
        vx: -35 - Math.random() * 35,
        vy: (Math.random() - 0.5) * 45,
        emoji: teethEmojis[Math.floor(Math.random() * teethEmojis.length)],
        size: 16 + Math.random() * 6,
        rotation: (Math.random() - 0.5) * 1.5,
        vRot: (Math.random() - 0.5) * 8,
        alpha: 1.0
      });
    }
  }

  spawnPipe() {
    const playHeight = this.canvas.height - CONFIG.groundHeight;
    const gap = CONFIG.pipeGap;
    const minH = CONFIG.minPipeHeight;
    const maxTop = playHeight - gap - minH;

    // Random top pipe height within bounds
    const topHeight = Math.floor(minH + Math.random() * (maxTop - minH));
    const bottomY = topHeight + gap;
    const bottomHeight = playHeight - bottomY;

    this.pipes.push({
      x: this.canvas.width + 10,
      topHeight: topHeight,
      bottomY: bottomY,
      bottomHeight: bottomHeight,
      width: CONFIG.pipeWidth,
      passed: false
    });
  }

  triggerScreenShake(duration = 0.25, intensity = 6) {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  die() {
    if (this.bird.dead) return;
    this.bird.dead = true;
    this.state = GameState.GAMEOVER;
    this.gameOverTimer = 0;
    this.flashAlpha = 0.85;
    this.triggerScreenShake(0.3, 8);
    this.audio.playHit();
    setTimeout(() => this.audio.playDie(), 120);

    // Burst of teeth, stars and collision emojis
    const hitEmojis = ['🦷', '😬', '✨', '⭐', '💥'];
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 130;
      this.particles.push({
        x: this.bird.x,
        y: this.bird.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        emoji: hitEmojis[Math.floor(Math.random() * hitEmojis.length)],
        size: 16 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 10,
        alpha: 1.0
      });
    }

    this.syncUI();
  }

  // --- UPDATE LOGIC ---
  update(dt) {
    // Screen shake update
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
    }

    // Flash fade
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.5);
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.rotation !== undefined && p.vRot) {
        p.rotation += p.vRot * dt;
      }
      p.alpha -= dt * 1.5;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Score Popups
    for (let i = this.scorePopups.length - 1; i >= 0; i--) {
      const sp = this.scorePopups[i];
      sp.y -= 40 * dt;
      sp.alpha -= dt * 1.2;
      if (sp.alpha <= 0) {
        this.scorePopups.splice(i, 1);
      }
    }

    // Background scrolling
    if (this.state !== GameState.GAMEOVER && this.state !== GameState.PAUSED) {
      this.groundScroll = (this.groundScroll + CONFIG.pipeSpeed * dt) % 24;
      this.bgScroll = (this.bgScroll + CONFIG.bgSpeed * dt) % 780;
      this.cityScroll = (this.cityScroll + CONFIG.citySpeed * dt) % 400;
      this.cloudsScroll = (this.cloudsScroll + CONFIG.cloudsSpeed * dt) % 400;
    }

    // START SCREEN STATE
    if (this.state === GameState.START) {
      this.bird.hoverOffset = Math.sin(performance.now() / 250) * 8;
      this.bird.y = (this.canvas.height / 2 - 40) + this.bird.hoverOffset;
      this.bird.angle = 0;
      this.bird.wingFrame += dt * CONFIG.birdWingSpeed;
      return;
    }

    // GAMEOVER STATE (Bird falls to floor if not yet there)
    if (this.state === GameState.GAMEOVER) {
      this.gameOverTimer += dt;
      const playHeight = this.canvas.height - CONFIG.groundHeight;
      if (this.bird.y < playHeight - CONFIG.birdRadius) {
        this.bird.vy += CONFIG.gravity * dt * 1.4;
        this.bird.y += this.bird.vy * dt;
        this.bird.angle = Math.min(Math.PI / 2, this.bird.angle + dt * 10);
      } else {
        this.bird.y = playHeight - CONFIG.birdRadius;
      }
      return;
    }

    // PLAYING STATE
    if (this.state === GameState.PLAYING) {
      // 1. Bird Physics
      this.bird.vy += CONFIG.gravity * dt;
      if (this.bird.vy > CONFIG.maxFallSpeed) {
        this.bird.vy = CONFIG.maxFallSpeed;
      }
      this.bird.y += this.bird.vy * dt;

      // Rotation smoothing
      if (this.bird.vy > 120) {
        this.bird.angle = Math.min(Math.PI / 2, this.bird.angle + dt * CONFIG.rotationSpeed);
      } else {
        this.bird.angle = this.bird.targetAngle;
      }

      // Wing flap animation
      this.bird.wingFrame += dt * CONFIG.birdWingSpeed;

      // 2. Ceiling & Ground Collisions
      const playHeight = this.canvas.height - CONFIG.groundHeight;
      if (this.bird.y - CONFIG.birdRadius <= 0) {
        this.bird.y = CONFIG.birdRadius;
        this.bird.vy = 0;
      }

      if (this.bird.y + CONFIG.birdRadius >= playHeight) {
        this.bird.y = playHeight - CONFIG.birdRadius;
        this.die();
        return;
      }

      // 3. Pipe Spawning & Movement
      this.timeSinceLastPipe += dt;
      if (this.timeSinceLastPipe >= CONFIG.pipeSpawnInterval) {
        this.spawnPipe();
        this.timeSinceLastPipe = 0;
      }

      for (let i = this.pipes.length - 1; i >= 0; i--) {
        const pipe = this.pipes[i];
        pipe.x -= CONFIG.pipeSpeed * dt;

        // Score detection
        if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
          pipe.passed = true;
          this.score++;
          this.scoreDisplay.textContent = this.score;
          this.scoreDisplay.classList.add('score-pop');
          setTimeout(() => this.scoreDisplay.classList.remove('score-pop'), 120);
          this.audio.playScore();

          // Spawn floating +1 popup
          this.scorePopups.push({
            x: this.bird.x + 10,
            y: this.bird.y - 20,
            alpha: 1,
            text: '+1'
          });

          // Check for Level Up Progression
          const nextLvl = this.getLevelForScore(this.score);
          if (nextLvl.level !== this.currentLevel) {
            this.applyLevel(nextLvl.level, true);
          }
        }

        // Remove off-screen pipes
        if (pipe.x + pipe.width < -20) {
          this.pipes.splice(i, 1);
          continue;
        }

        // Collision Check (Forgiving circle vs rectangle)
        if (this.checkCollisionWithPipe(pipe)) {
          this.die();
          return;
        }
      }
    }
  }

  // Circular bird vs AABB pipe collision with padding
  checkCollisionWithPipe(pipe) {
    const pad = 4; // forgiving hitbox padding
    const bx = this.bird.x;
    const by = this.bird.y;
    const r = CONFIG.birdRadius - pad;

    // Top pipe box
    const topBox = {
      x: pipe.x + pad,
      y: 0,
      w: pipe.width - pad * 2,
      h: pipe.topHeight
    };

    // Bottom pipe box
    const botBox = {
      x: pipe.x + pad,
      y: pipe.bottomY,
      w: pipe.width - pad * 2,
      h: pipe.bottomHeight
    };

    return this.circleRectCollision(bx, by, r, topBox) || 
           this.circleRectCollision(bx, by, r, botBox);
  }

  circleRectCollision(cx, cy, radius, rect) {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (radius * radius);
  }

  // --- RENDERING ---
  draw() {
    this.ctx.save();

    // Apply Screen Shake
    if (this.shakeDuration > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.ctx.translate(offsetX, offsetY);
    }

    // 1. Photo Background
    this.drawBackground();

    // 2. Pipes
    this.drawPipes();

    // 3. Ground
    this.drawGround();

    // 4. Player (Gutam)
    this.drawBird();

    // 5. Particles & Popups
    this.drawParticles();
    this.drawScorePopups();

    // 6. Flash screen on death
    if (this.flashAlpha > 0) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.ctx.restore();
  }

  drawBackground() {
    if (this.bgImg && this.bgImg.complete && this.bgImg.naturalWidth > 0) {
      const bgW = 780; // Seamless panoramic loop width
      const bgH = this.canvas.height;
      const x = -(this.bgScroll % bgW);

      this.ctx.drawImage(this.bgImg, x, 0, bgW, bgH);
      if (x + bgW < this.canvas.width) {
        this.ctx.drawImage(this.bgImg, x + bgW, 0, bgW, bgH);
      }

      // Soft vignette tint to enhance pipe readability and contrast
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.drawSky();
    }
  }

  drawSky() {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height - CONFIG.groundHeight);
    grad.addColorStop(0, '#4ec0ca');
    grad.addColorStop(0.7, '#88d7df');
    grad.addColorStop(1, '#d8f0f3');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawClouds() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    this.clouds.forEach(c => {
      const currentX = (c.x - this.cloudsScroll * c.scale + 600) % (this.canvas.width + 120) - 60;
      this.drawCloudShape(currentX, c.y, c.scale);
    });
  }

  drawCloudShape(x, y, scale) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 18, 0, Math.PI * 2);
    this.ctx.arc(16, -8, 22, 0, Math.PI * 2);
    this.ctx.arc(36, 0, 16, 0, Math.PI * 2);
    this.ctx.arc(20, 10, 18, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawCityline() {
    const groundY = this.canvas.height - CONFIG.groundHeight;
    this.ctx.fillStyle = '#9fe0b5';

    // Distant soft green trees/hills silhouette
    this.ctx.beginPath();
    const hillStep = 50;
    const offset = this.cityScroll % (hillStep * 2);
    for (let x = -hillStep * 2; x <= this.canvas.width + hillStep * 2; x += hillStep) {
      const hillX = x - offset;
      this.ctx.arc(hillX, groundY, 40, Math.PI, 0, false);
    }
    this.ctx.lineTo(this.canvas.width, groundY);
    this.ctx.lineTo(0, groundY);
    this.ctx.closePath();
    this.ctx.fill();

    // Bush details
    this.ctx.fillStyle = '#73bf2e';
    this.ctx.beginPath();
    for (let x = -hillStep; x <= this.canvas.width + hillStep; x += 36) {
      const bushX = x - (this.cityScroll * 1.3 % 36);
      this.ctx.arc(bushX, groundY, 18, Math.PI, 0, false);
    }
    this.ctx.lineTo(this.canvas.width, groundY);
    this.ctx.lineTo(0, groundY);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawPipes() {
    this.pipes.forEach(pipe => {
      this.drawSinglePipe(pipe.x, 0, pipe.width, pipe.topHeight, true);
      this.drawSinglePipe(pipe.x, pipe.bottomY, pipe.width, pipe.bottomHeight, false);
    });
  }

  drawSinglePipe(x, y, w, h, isTop) {
    if (h <= 0) return;
    this.ctx.save();

    const rimHeight = CONFIG.pipeRimHeight;
    const rimOverlap = CONFIG.pipeRimOverlap;
    const rimY = isTop ? y + h - rimHeight : y;
    const bodyY = isTop ? y : y + rimHeight;
    const bodyH = Math.max(0, h - rimHeight);

    // Pipe Body Gradient
    const bodyGrad = this.ctx.createLinearGradient(x, 0, x + w, 0);
    bodyGrad.addColorStop(0, '#558022');
    bodyGrad.addColorStop(0.18, '#8de539');
    bodyGrad.addColorStop(0.45, '#73bf2e');
    bodyGrad.addColorStop(0.85, '#558022');
    bodyGrad.addColorStop(1, '#2f5114');

    this.ctx.fillStyle = bodyGrad;
    this.ctx.fillRect(x, bodyY, w, bodyH);

    // Pipe Body Outline
    this.ctx.strokeStyle = '#2d4b14';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(x, bodyY, w, bodyH);

    // Pipe Rim / Collar
    const rimX = x - rimOverlap;
    const rimW = w + rimOverlap * 2;
    const rimGrad = this.ctx.createLinearGradient(rimX, 0, rimX + rimW, 0);
    rimGrad.addColorStop(0, '#558022');
    rimGrad.addColorStop(0.18, '#9cf345');
    rimGrad.addColorStop(0.45, '#73bf2e');
    rimGrad.addColorStop(0.85, '#558022');
    rimGrad.addColorStop(1, '#243e0f');

    this.ctx.fillStyle = rimGrad;
    this.ctx.fillRect(rimX, rimY, rimW, rimHeight);
    this.ctx.strokeRect(rimX, rimY, rimW, rimHeight);

    // Highlight line
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    this.ctx.fillRect(rimX + 6, rimY + 2, 4, rimHeight - 4);
    this.ctx.fillRect(x + 6, bodyY, 4, bodyH);

    this.ctx.restore();
  }

  drawGround() {
    const gh = CONFIG.groundHeight;
    const gy = this.canvas.height - gh;

    // Grass Top Layer
    this.ctx.fillStyle = '#73bf2e';
    this.ctx.fillRect(0, gy, this.canvas.width, 14);

    // Grass border
    this.ctx.strokeStyle = '#4e7b1f';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, gy);
    this.ctx.lineTo(this.canvas.width, gy);
    this.ctx.stroke();

    // Light grass border highlight
    this.ctx.fillStyle = '#9ce63c';
    this.ctx.fillRect(0, gy + 1, this.canvas.width, 3);

    // Dirt Layer
    this.ctx.fillStyle = '#ded895';
    this.ctx.fillRect(0, gy + 14, this.canvas.width, gh - 14);

    // Moving Dirt Pattern (diagonal stripes)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(0, gy + 14, this.canvas.width, gh - 14);
    this.ctx.clip();

    this.ctx.strokeStyle = '#c5b86e';
    this.ctx.lineWidth = 3;
    const stripeSpacing = 18;
    const offset = this.groundScroll % stripeSpacing;

    for (let x = -stripeSpacing * 2; x < this.canvas.width + stripeSpacing * 2; x += stripeSpacing) {
      const sx = x - offset;
      this.ctx.beginPath();
      this.ctx.moveTo(sx, gy + 14);
      this.ctx.lineTo(sx - 12, this.canvas.height);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawBird() {
    this.ctx.save();
    this.ctx.translate(this.bird.x, this.bird.y);
    this.ctx.rotate(this.bird.angle);

    // Dynamic bounce/squish on flight
    const bounce = Math.sin(this.bird.wingFrame) * 0.05;
    this.ctx.scale(1 - bounce * 0.5, 1 + bounce);

    // Draw Gutam's Head Avatar
    if (this.playerImg && this.playerImg.complete && this.playerImg.naturalWidth > 0) {
      const pw = CONFIG.playerWidth || 38;
      const ph = CONFIG.playerHeight || 52;
      this.ctx.drawImage(this.playerImg, -pw / 2, -ph / 2, pw, ph);
    } else {
      // Fallback
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, CONFIG.birdRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.emoji) {
        this.ctx.translate(p.x, p.y);
        if (p.rotation) {
          this.ctx.rotate(p.rotation);
        }
        const fontSize = Math.round(p.size || 18);
        this.ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(p.emoji, 0, 0);
      } else {
        this.ctx.fillStyle = p.color || '#ffd32a';
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  drawScorePopups() {
    this.scorePopups.forEach(sp => {
      this.ctx.save();
      this.ctx.font = 'bold 16px "Press Start 2P", monospace';
      this.ctx.fillStyle = `rgba(255, 230, 0, ${sp.alpha})`;
      this.ctx.strokeStyle = `rgba(0, 0, 0, ${sp.alpha})`;
      this.ctx.lineWidth = 3;
      this.ctx.strokeText(sp.text, sp.x, sp.y);
      this.ctx.fillText(sp.text, sp.x, sp.y);
      this.ctx.restore();
    });
  }

  // --- MAIN LOOP ---
  loop(timestamp) {
    // Delta time in seconds with sanity clamping
    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    if (dt > 0.1) dt = 0.1; // clamp to prevent tunneling on lag

    if (this.state !== GameState.PAUSED) {
      this.update(dt);
    }
    this.draw();

    requestAnimationFrame(this.loop);
  }
}

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new FlappyBirdGame();
});
