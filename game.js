// ─────────────────────────────────────────────
//  SPACE INVADERS  –  80s Tribute Edition
// ─────────────────────────────────────────────

// ── Audio Engine ──────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let muted = false;

function getAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep(freq, type, duration, vol = 0.3, startOffset = 0) {
  if (muted) return;
  const ctx = getAudio();
  const t = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

function shootSound() {
  if (muted) return;
  const ctx = getAudio();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  osc.start(t); osc.stop(t + 0.13);
}

function explosionSound(big = false) {
  if (muted) return;
  const ctx = getAudio();
  const t = ctx.currentTime;
  const bufLen = ctx.sampleRate * (big ? 0.6 : 0.3);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(big ? 400 : 800, t);
  src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
  gain.gain.setValueAtTime(big ? 0.6 : 0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + (big ? 0.6 : 0.3));
  src.start(t); src.stop(t + (big ? 0.7 : 0.35));
}

function enemyHitSound() {
  beep(200, 'sawtooth', 0.15, 0.25);
  beep(100, 'square', 0.1, 0.15, 0.05);
}

function ufoSound() {
  if (muted) return;
  const ctx = getAudio();
  const t = ctx.currentTime;
  for (let i = 0; i < 8; i++) {
    beep(220 + i * 55, 'sine', 0.08, 0.15, i * 0.09);
  }
}

function levelUpSound() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => beep(f, 'square', 0.15, 0.3, i * 0.12));
}

function gameOverSound() {
  const notes = [440, 349, 293, 220, 174];
  notes.forEach((f, i) => beep(f, 'sawtooth', 0.25, 0.4, i * 0.22));
}

function playerDeadSound() {
  const ctx = getAudio();
  if (muted || !ctx) return;
  [660, 550, 440, 330].forEach((f, i) => beep(f, 'square', 0.18, 0.35, i * 0.1));
}

// ── March melody (enemy step rhythm) ──────────
let marchStep = 0;
const marchFreqs = [160, 130, 110, 90];
let marchTimer = 0;
let marchInterval = 900; // ms, decreases per level

function playMarch() {
  if (muted) return;
  beep(marchFreqs[marchStep % 4], 'square', 0.06, 0.2);
  marchStep++;
}

// ── Background melody (title / intermission) ──
const MELODY = [
  // Excerpt of a classic 80s-style arcade theme
  [659,0.15],[659,0.15],[0,0.05],[659,0.15],[0,0.05],[523,0.15],[659,0.15],[0,0.05],
  [784,0.2],[0,0.2],[392,0.2],[0,0.2],
  [523,0.15],[0,0.1],[392,0.15],[0,0.1],[330,0.2],[0,0.1],
  [440,0.15],[494,0.15],[466,0.1],[440,0.2],[0,0.1],
  [392,0.13],[659,0.13],[784,0.13],[880,0.15],[698,0.13],[784,0.1],
  [659,0.2],[523,0.13],[587,0.13],[494,0.2],[0,0.1]
];
let melodyPlaying = false;
let melodyTimeout = null;

function playMelody(index = 0) {
  if (muted || !melodyPlaying) return;
  const [freq, dur] = MELODY[index % MELODY.length];
  if (freq > 0) beep(freq, 'square', dur * 0.9, 0.18);
  melodyTimeout = setTimeout(() => playMelody((index + 1) % MELODY.length), dur * 1000 + 20);
}

function startMelody() {
  melodyPlaying = true;
  clearTimeout(melodyTimeout);
  playMelody(0);
}

function stopMelody() {
  melodyPlaying = false;
  clearTimeout(melodyTimeout);
}

// ── Mute button ────────────────────────────────
document.getElementById('mute-btn').addEventListener('click', () => {
  muted = !muted;
  document.getElementById('mute-btn').textContent = muted ? '♪ UNMUTE' : '♪ MUTE';
  if (!muted && gameState === 'title') startMelody();
  if (muted) stopMelody();
});

// ── Starfield ──────────────────────────────────
const sfCanvas = document.getElementById('starfield');
sfCanvas.width = window.innerWidth;
sfCanvas.height = window.innerHeight;
const sfCtx = sfCanvas.getContext('2d');
const STARS = Array.from({length: 200}, () => ({
  x: Math.random() * sfCanvas.width,
  y: Math.random() * sfCanvas.height,
  r: Math.random() * 1.5 + 0.3,
  sp: Math.random() * 0.4 + 0.1,
  bright: Math.random()
}));

function drawStarfield() {
  sfCtx.fillStyle = '#000';
  sfCtx.fillRect(0, 0, sfCanvas.width, sfCanvas.height);
  STARS.forEach(s => {
    s.y += s.sp;
    if (s.y > sfCanvas.height) { s.y = 0; s.x = Math.random() * sfCanvas.width; }
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() * 0.001 + s.bright * 10));
    sfCtx.fillStyle = `rgba(255,255,255,${alpha})`;
    sfCtx.beginPath();
    sfCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    sfCtx.fill();
  });
  requestAnimationFrame(drawStarfield);
}
drawStarfield();

// ── Canvas & context ───────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;   // 800
const H = canvas.height;  // 560
const overlay = document.getElementById('overlay');

// ── Level config ───────────────────────────────
const LEVELS = [
  // {rows, cols, speedMult, bulletFreq, ufoFreq, enemyBullets, shields, alienColors}
  { rows:3, cols:8,  speedMult:1.0, bulletFreq:0.002, ufoFreq:0.0008, enemyBullets:1, shields:4, desc:"ROOKIE"      },
  { rows:3, cols:9,  speedMult:1.2, bulletFreq:0.003, ufoFreq:0.001,  enemyBullets:1, shields:4, desc:"CADET"       },
  { rows:4, cols:9,  speedMult:1.4, bulletFreq:0.004, ufoFreq:0.0012, enemyBullets:2, shields:3, desc:"SOLDIER"     },
  { rows:4, cols:10, speedMult:1.6, bulletFreq:0.005, ufoFreq:0.0015, enemyBullets:2, shields:3, desc:"SERGEANT"    },
  { rows:4, cols:10, speedMult:1.9, bulletFreq:0.006, ufoFreq:0.0018, enemyBullets:3, shields:2, desc:"LIEUTENANT"  },
  { rows:5, cols:10, speedMult:2.2, bulletFreq:0.007, ufoFreq:0.002,  enemyBullets:3, shields:2, desc:"CAPTAIN"     },
  { rows:5, cols:11, speedMult:2.5, bulletFreq:0.008, ufoFreq:0.0022, enemyBullets:4, shields:2, desc:"MAJOR"       },
  { rows:5, cols:11, speedMult:2.9, bulletFreq:0.010, ufoFreq:0.0025, enemyBullets:4, shields:1, desc:"COLONEL"     },
  { rows:5, cols:11, speedMult:3.3, bulletFreq:0.012, ufoFreq:0.003,  enemyBullets:5, shields:1, desc:"GENERAL"     },
  { rows:5, cols:11, speedMult:4.0, bulletFreq:0.015, ufoFreq:0.004,  enemyBullets:6, shields:0, desc:"COMMANDER"   },
  // Bonus levels 11+
  { rows:5, cols:11, speedMult:5.0, bulletFreq:0.018, ufoFreq:0.005,  enemyBullets:6, shields:0, desc:"OVERLORD"    },
  { rows:5, cols:11, speedMult:6.5, bulletFreq:0.022, ufoFreq:0.006,  enemyBullets:6, shields:0, desc:"GOD MODE"    },
];

// Alien pixel art (3 types × 2 frames)
const ALIEN_ART = {
  // type 0 – crab
  0: [
    [0,1,0,0,0,0,0,1,0,0,
     0,0,1,0,0,0,1,0,0,0,
     0,1,1,1,1,1,1,1,0,0,
     1,1,0,1,1,1,0,1,1,0,
     1,1,1,1,1,1,1,1,1,0,
     0,1,1,1,1,1,1,1,0,0,
     0,1,0,0,0,0,0,1,0,0,
     0,0,1,0,0,0,1,0,0,0],
    [0,1,0,0,0,0,0,1,0,0,
     1,0,1,0,0,0,1,0,1,0,
     1,1,1,1,1,1,1,1,1,0,
     1,0,1,1,1,1,1,0,1,0,
     1,1,1,1,1,1,1,1,1,0,
     0,0,1,0,0,0,1,0,0,0,
     0,1,0,1,0,1,0,1,0,0,
     1,0,0,0,0,0,0,0,1,0],
  ],
  // type 1 – squid
  1: [
    [0,0,0,1,1,1,1,0,0,0,
     0,1,1,1,1,1,1,1,1,0,
     1,1,1,1,1,1,1,1,1,1,
     1,1,0,1,1,1,1,0,1,1,
     1,1,1,1,1,1,1,1,1,1,
     0,0,1,0,0,0,0,1,0,0,
     0,1,0,1,0,0,1,0,1,0,
     1,0,1,0,0,0,0,1,0,1],
    [0,0,0,1,1,1,1,0,0,0,
     0,1,1,1,1,1,1,1,1,0,
     1,1,1,1,1,1,1,1,1,1,
     1,1,0,1,1,1,1,0,1,1,
     1,1,1,1,1,1,1,1,1,1,
     0,1,1,0,0,0,0,1,1,0,
     1,1,0,0,0,0,0,0,1,1,
     0,1,0,0,0,0,0,0,1,0],
  ],
  // type 2 – bug
  2: [
    [0,0,1,0,0,0,0,1,0,0,
     0,0,0,1,0,0,1,0,0,0,
     0,0,1,1,1,1,1,1,0,0,
     0,1,1,0,1,1,0,1,1,0,
     1,1,1,1,1,1,1,1,1,1,
     1,0,1,1,1,1,1,1,0,1,
     1,0,1,0,0,0,0,1,0,1,
     0,0,0,1,1,1,1,0,0,0],
    [0,0,1,0,0,0,0,1,0,0,
     1,0,0,1,0,0,1,0,0,1,
     1,0,1,1,1,1,1,1,0,1,
     1,1,1,0,1,1,0,1,1,1,
     0,1,1,1,1,1,1,1,1,0,
     0,0,1,1,1,1,1,1,0,0,
     0,1,0,0,0,0,0,0,1,0,
     0,0,1,0,0,0,0,1,0,0],
  ]
};

const PX = 3; // pixels per dot in alien art (10×8 grid × 3 = 30×24)
const AW = 10 * PX; // alien width  = 30
const AH = 8  * PX; // alien height = 24

// Alien color palettes per level
const LEVEL_COLORS = [
  ['#0f0','#0f0','#0f0'],
  ['#0ff','#0ff','#0ff'],
  ['#ff0','#f80','#f80'],
  ['#f0f','#f0f','#f0f'],
  ['#f00','#f00','#fa0'],
  ['#0ff','#f0f','#ff0'],
  ['#fa0','#0ff','#f0f'],
  ['#f00','#fa0','#0f0'],
  ['#fff','#0ff','#f0f'],
  ['#f00','#ff0','#0ff'],
  ['#f0f','#ff0','#0ff'],
  ['#fff','#fff','#fff'],
];

// ── Game state ─────────────────────────────────
let gameState = 'title'; // title | playing | paused | dead | levelup | gameover | victory
let score = 0;
let hiScore = parseInt(localStorage.getItem('si_hi') || '0');
let lives = 3;
let level = 1;
let frame = 0;
let animFrame = 0;
let lastMarch = 0;

// Player
const PLAYER_W = 40, PLAYER_H = 16;
let player = { x: W / 2 - PLAYER_W / 2, y: H - 40, vx: 0, alive: true, flashTimer: 0 };
const PLAYER_SPEED = 5;

// Bullets
let playerBullets = [];
let enemyBullets = [];
const PB_SPEED = 10;
const EB_SPEED = 5;
let shootCooldown = 0;

// Aliens
let aliens = [];
let alienDir = 1;
let alienDX = 0;
let alienDY = 0;
let alienSpeedX = 1.0;
let alienDrop = 16;
let alienFrame = 0;
let alienFrameTimer = 0;

// UFO
let ufo = null; // { x, dir, active }
let ufoTimer = 0;

// Shields
let shields = [];

// Explosions / particles
let particles = [];

// Flash effects
let flashTimer = 0;
let flashColor = '#fff';

// ── Keys ──────────────────────────────────────
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyP' && gameState === 'playing') { gameState = 'paused'; showPause(); }
  else if (e.code === 'KeyP' && gameState === 'paused') { gameState = 'playing'; hidePause(); }
  if ((e.code === 'Space' || e.code === 'Enter') && gameState === 'title') startGame();
  if ((e.code === 'Space' || e.code === 'Enter') && gameState === 'gameover') showTitle();
  if ((e.code === 'Space' || e.code === 'Enter') && gameState === 'victory') showTitle();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// ── Overlay helpers ────────────────────────────
function showOverlay(html) { overlay.innerHTML = html; overlay.style.display = 'flex'; }
function hideOverlay()     { overlay.style.display = 'none'; }

function showTitle() {
  gameState = 'title';
  startMelody();
  showOverlay(`
    <h1>SPACE INVADERS</h1>
    <h2>— 80s TRIBUTE EDITION —</h2>
    <div style="margin:16px 0;font-size:9px;color:#0f0;text-shadow:0 0 6px #0f0;line-height:2.2">
      <div>▸ 10+ LEVELS OF INCREASING TERROR</div>
      <div>▸ PROCEDURAL SOUND ENGINE</div>
      <div>▸ RETRO PIXEL ALIENS</div>
      <div>▸ UFO BONUS SHIPS</div>
    </div>
    <div style="font-size:9px;color:#f0f;text-shadow:0 0 6px #f0f;margin:6px 0">SCORE TABLE</div>
    <div class="score-board">▸ CRAB  = 10 PTS</div>
    <div class="score-board">▸ SQUID = 20 PTS</div>
    <div class="score-board">▸ BUG   = 30 PTS</div>
    <div class="score-board">▸ UFO   = 50–300 PTS</div>
    <p class="blink">PRESS SPACE / ENTER TO START</p>
    <p style="margin-top:16px;font-size:8px;color:#444">← → MOVE &nbsp; SPACE FIRE &nbsp; P PAUSE</p>
  `);
}

function showPause() {
  showOverlay(`<h2 style="color:#ff0;text-shadow:0 0 12px #ff0">PAUSED</h2><p class="blink" style="margin-top:16px">PRESS P TO RESUME</p>`);
}
function hidePause() { hideOverlay(); }

function showLevelUp() {
  gameState = 'levelup';
  levelUpSound();
  showOverlay(`
    <h2>LEVEL ${level} CLEAR!</h2>
    <p style="color:#ff0;text-shadow:0 0 8px #ff0;font-size:14px;margin:14px 0">RANK: ${LEVELS[Math.min(level-1, LEVELS.length-1)].desc}</p>
    <p style="font-size:10px;color:#0f0;margin:6px 0">SCORE: ${score}</p>
    <p class="blink">PRESS SPACE TO CONTINUE</p>
  `);
  document.addEventListener('keydown', onLevelContinue, {once:true});
}

function onLevelContinue(e) {
  if (e.code === 'Space' || e.code === 'Enter') {
    level++;
    hideOverlay();
    initLevel();
  } else {
    document.addEventListener('keydown', onLevelContinue, {once:true});
  }
}

function showGameOver() {
  gameState = 'gameover';
  gameOverSound();
  stopMelody();
  if (score > hiScore) {
    hiScore = score;
    localStorage.setItem('si_hi', hiScore);
  }
  updateHUD();
  setTimeout(() => {
    showOverlay(`
      <h1 style="font-size:22px;color:#f00;text-shadow:0 0 14px #f00">GAME OVER</h1>
      <p style="font-size:12px;color:#ff0;text-shadow:0 0 8px #ff0;margin:16px 0">FINAL SCORE: ${score}</p>
      <p style="font-size:10px;color:#0ff;margin:4px 0">HI-SCORE: ${hiScore}</p>
      <p class="blink" style="margin-top:20px">PRESS SPACE TO PLAY AGAIN</p>
    `);
  }, 2000);
}

function showVictory() {
  gameState = 'victory';
  stopMelody();
  if (score > hiScore) {
    hiScore = score;
    localStorage.setItem('si_hi', hiScore);
  }
  updateHUD();
  // Victory fanfare
  const notes = [523,659,784,1047,1318,1568,2093];
  notes.forEach((f,i) => beep(f, 'square', 0.2, 0.35, i*0.15));
  showOverlay(`
    <h1 style="font-size:18px">EARTH IS SAVED!</h1>
    <p style="color:#ff0;text-shadow:0 0 8px #ff0;font-size:12px;margin:16px 0">RANK: COSMIC HERO</p>
    <p style="font-size:10px;color:#0ff;margin:4px 0">FINAL SCORE: ${score}</p>
    <p style="font-size:10px;color:#0f0;margin:4px 0">HI-SCORE: ${hiScore}</p>
    <p class="blink" style="margin-top:20px">PRESS SPACE TO PLAY AGAIN</p>
  `);
}

// ── HUD ────────────────────────────────────────
function updateHUD() {
  document.getElementById('score-val').textContent = score;
  document.getElementById('level-val').textContent = level;
  document.getElementById('hi-val').textContent = Math.max(score, hiScore);
  document.getElementById('lives-val').textContent = '♥'.repeat(Math.max(0, lives));
}

// ── Shield builder ─────────────────────────────
function buildShield(cx, y) {
  // 4×3 block shield, each cell 8×8 px
  const cells = [];
  const template = [
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1],
    [1,1,0,0,0,0,1,1],
  ];
  const BW = 8, BH = 8;
  for (let r = 0; r < template.length; r++) {
    for (let c = 0; c < template[r].length; c++) {
      if (template[r][c]) {
        cells.push({ x: cx - 32 + c * BW, y: y + r * BH, hp: 3 });
      }
    }
  }
  return cells;
}

// ── Init / start ───────────────────────────────
function startGame() {
  score = 0;
  lives = 3;
  level = 1;
  stopMelody();
  hideOverlay();
  initLevel();
}

function initLevel() {
  gameState = 'playing';
  playerBullets = [];
  enemyBullets = [];
  particles = [];
  ufo = null;
  marchStep = 0;
  flashTimer = 0;
  animFrame = 0;

  const cfg = LEVELS[Math.min(level - 1, LEVELS.length - 1)];

  // March speed based on level
  marchInterval = Math.max(120, 900 - (level - 1) * 70);

  // Alien speed
  alienSpeedX = 0.6 + (level - 1) * 0.15;
  if (alienSpeedX > 4) alienSpeedX = 4;
  alienDir = 1;
  alienDX = 0;
  alienDY = 0;

  // Build alien grid
  aliens = [];
  const COLS = cfg.cols, ROWS = cfg.rows;
  const spacingX = Math.floor((W - 80) / COLS);
  const spacingY = 44;
  const startX = 40;
  const startY = 60;

  for (let r = 0; r < ROWS; r++) {
    const type = r === 0 ? 2 : (r <= 1 ? 1 : 0);
    const pts  = type === 2 ? 30 : (type === 1 ? 20 : 10);
    const colors = LEVEL_COLORS[Math.min(level-1, LEVEL_COLORS.length-1)];
    for (let c = 0; c < COLS; c++) {
      aliens.push({
        x: startX + c * spacingX,
        y: startY + r * spacingY,
        type, pts, alive: true,
        color: colors[type],
        exploding: 0
      });
    }
  }

  // Shields
  shields = [];
  if (cfg.shields > 0) {
    const gap = W / (cfg.shields + 1);
    for (let i = 0; i < cfg.shields; i++) {
      buildShield(gap * (i + 1), H - 110).forEach(c => shields.push(c));
    }
  }

  // Player
  player.x = W / 2 - PLAYER_W / 2;
  player.alive = true;
  player.flashTimer = 0;
  shootCooldown = 0;

  updateHUD();
}

// ── Draw helpers ───────────────────────────────
function drawPixelAlien(alien, frame) {
  const art = ALIEN_ART[alien.type][frame % 2];
  const pw = PX, ph = PX;
  ctx.fillStyle = alien.color;
  ctx.shadowColor = alien.color;
  ctx.shadowBlur = 6;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 10; col++) {
      if (art[row * 10 + col]) {
        ctx.fillRect(alien.x + col * pw, alien.y + row * ph, pw - 1, ph - 1);
      }
    }
  }
  ctx.shadowBlur = 0;
}

function drawPlayer() {
  if (!player.alive) return;
  if (player.flashTimer > 0 && Math.floor(player.flashTimer / 4) % 2 === 0) return;

  const x = player.x, y = player.y;
  const color = '#0f0';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  // Body
  ctx.fillRect(x + 5, y + 8, 30, 8);
  // Cockpit
  ctx.fillRect(x + 14, y + 3, 12, 8);
  ctx.fillRect(x + 17, y,     6,  6);
  // Cannon
  ctx.fillRect(x + 18, y - 4, 4, 6);
  // Left wing
  ctx.fillRect(x,      y + 10, 10, 4);
  // Right wing
  ctx.fillRect(x + 30, y + 10, 10, 4);

  ctx.shadowBlur = 0;
}

function drawUFO() {
  if (!ufo) return;
  const x = ufo.x, y = 30;
  ctx.fillStyle = '#f00';
  ctx.shadowColor = '#f00';
  ctx.shadowBlur = 12;
  // Body
  ctx.fillRect(x + 6, y + 6, 44, 10);
  // Dome
  ctx.fillRect(x + 14, y, 28, 8);
  ctx.fillRect(x + 18, y - 4, 20, 6);
  // Bottom detail
  ctx.fillStyle = '#fa0';
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 8 + i * 9, y + 13, 6, 4);
  ctx.shadowBlur = 0;
}

function drawShields() {
  shields.forEach(cell => {
    if (cell.hp <= 0) return;
    const alpha = cell.hp / 3;
    ctx.fillStyle = `rgba(0,200,100,${alpha})`;
    ctx.shadowColor = '#0f0';
    ctx.shadowBlur = 3;
    ctx.fillRect(cell.x, cell.y, 7, 7);
  });
  ctx.shadowBlur = 0;
}

function drawBullets() {
  playerBullets.forEach(b => {
    ctx.fillStyle = '#ff0';
    ctx.shadowColor = '#ff0';
    ctx.shadowBlur = 8;
    ctx.fillRect(b.x - 1, b.y, 3, 10);
  });
  enemyBullets.forEach(b => {
    ctx.fillStyle = '#f0f';
    ctx.shadowColor = '#f0f';
    ctx.shadowBlur = 8;
    // zigzag bullet
    const zz = Math.sin(b.y * 0.3) * 2;
    ctx.fillRect(b.x + zz - 1, b.y, 3, 8);
  });
  ctx.shadowBlur = 0;
}

function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
  });
  ctx.globalAlpha = 1;
}

function spawnParticles(x, y, color, count = 12, big = false) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * (big ? 5 : 3) + 1;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: Math.random() * (big ? 5 : 3) + 1,
      color,
      life: 30 + Math.random() * 20,
      maxLife: 50
    });
  }
}

function drawFlash() {
  if (flashTimer > 0) {
    ctx.fillStyle = flashColor;
    ctx.globalAlpha = flashTimer / 20 * 0.3;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    flashTimer--;
  }
}

function drawGround() {
  ctx.fillStyle = '#0f0';
  ctx.shadowColor = '#0f0';
  ctx.shadowBlur = 4;
  ctx.fillRect(0, H - 16, W, 2);
  ctx.shadowBlur = 0;
}

function drawHUDCanvas() {
  // Level name banner
  const cfg = LEVELS[Math.min(level-1, LEVELS.length-1)];
  ctx.font = '9px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#333';
  ctx.fillText(cfg.desc, W / 2, H - 4);
  ctx.textAlign = 'left';
}

// ── Collision helpers ──────────────────────────
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ── Update logic ───────────────────────────────
function updatePlayer(dt) {
  if (!player.alive) return;
  if (player.flashTimer > 0) { player.flashTimer--; return; }

  if (keys['ArrowLeft'])  player.x -= PLAYER_SPEED;
  if (keys['ArrowRight']) player.x += PLAYER_SPEED;
  player.x = Math.max(0, Math.min(W - PLAYER_W, player.x));

  if (shootCooldown > 0) shootCooldown--;
  if ((keys['Space'] || keys['KeyZ']) && shootCooldown <= 0 && playerBullets.length < 3) {
    playerBullets.push({ x: player.x + PLAYER_W / 2, y: player.y });
    shootSound();
    shootCooldown = 10;
  }
}

function updateBullets() {
  playerBullets = playerBullets.filter(b => b.y > -10);
  playerBullets.forEach(b => b.y -= PB_SPEED);

  enemyBullets = enemyBullets.filter(b => b.y < H);
  enemyBullets.forEach(b => b.y += EB_SPEED + (level - 1) * 0.3);
}

function updateAliens() {
  const alive = aliens.filter(a => a.alive);
  if (alive.length === 0) return;

  const cfg = LEVELS[Math.min(level - 1, LEVELS.length - 1)];

  // March speed increases as fewer aliens remain
  const speedBoost = 1 + (1 - alive.length / (LEVELS[Math.min(level-1,LEVELS.length-1)].rows * LEVELS[Math.min(level-1,LEVELS.length-1)].cols)) * 3;
  const currentSpeed = alienSpeedX * alienDir * speedBoost;

  // Check boundaries
  const minX = Math.min(...alive.map(a => a.x));
  const maxX = Math.max(...alive.map(a => a.x + AW));

  if ((alienDir === 1 && maxX >= W - 10) || (alienDir === -1 && minX <= 10)) {
    alienDir *= -1;
    aliens.forEach(a => { if (a.alive) a.y += alienDrop; });
    // March sound on direction change
    marchInterval = Math.max(80, marchInterval - 5);
  } else {
    aliens.forEach(a => { if (a.alive) a.x += currentSpeed; });
  }

  // March timer
  const now = Date.now();
  if (now - lastMarch > marchInterval) {
    lastMarch = now;
    playMarch();
    alienFrame = (alienFrame + 1) % 2;
  }

  // Enemy shoots
  const shooters = alive.filter(a => a.alive);
  if (shooters.length > 0) {
    for (let i = 0; i < cfg.enemyBullets; i++) {
      if (Math.random() < cfg.bulletFreq) {
        const shooter = shooters[Math.floor(Math.random() * shooters.length)];
        enemyBullets.push({
          x: shooter.x + AW / 2,
          y: shooter.y + AH
        });
      }
    }
  }

  // UFO spawn
  if (!ufo && Math.random() < cfg.ufoFreq) {
    ufo = { x: -70, dir: 1 };
    ufoSound();
  }

  // Check if aliens reach ground
  const lowestAlien = Math.max(...alive.map(a => a.y + AH));
  if (lowestAlien >= H - 40) {
    loseLife(true);
  }
}

function updateUFO() {
  if (!ufo) return;
  ufo.x += 2.5 * ufo.dir;
  if (ufo.x > W + 70 || ufo.x < -70) ufo = null;
}

function updateParticles() {
  particles = particles.filter(p => p.life > 0);
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
  });
}

function checkCollisions() {
  const cfg = LEVELS[Math.min(level-1, LEVELS.length-1)];

  // Player bullets vs aliens
  playerBullets.forEach((b, bi) => {
    aliens.forEach(alien => {
      if (!alien.alive) return;
      if (rectsOverlap(b.x - 1, b.y, 3, 10, alien.x, alien.y, AW, AH)) {
        alien.alive = false;
        playerBullets.splice(bi, 1);
        score += alien.pts * level;
        spawnParticles(alien.x + AW/2, alien.y + AH/2, alien.color, 16);
        enemyHitSound();
        flashTimer = 5; flashColor = alien.color;
        updateHUD();
      }
    });
  });

  // Player bullets vs UFO
  if (ufo) {
    playerBullets.forEach((b, bi) => {
      if (rectsOverlap(b.x-1, b.y, 3, 10, ufo.x, 22, 56, 22)) {
        const bonus = (Math.floor(Math.random() * 6) + 1) * 50;
        score += bonus * level;
        spawnParticles(ufo.x + 28, 33, '#f00', 20, true);
        explosionSound(true);
        showBonusText(ufo.x + 20, 33, `+${bonus*level}`);
        ufo = null;
        playerBullets.splice(bi, 1);
        flashTimer = 10; flashColor = '#f00';
        updateHUD();
      }
    });
  }

  // Player bullets vs shields
  playerBullets.forEach((b, bi) => {
    shields.forEach(cell => {
      if (cell.hp <= 0) return;
      if (rectsOverlap(b.x-1, b.y, 3, 10, cell.x, cell.y, 8, 8)) {
        cell.hp--;
        playerBullets.splice(bi, 1);
        spawnParticles(cell.x + 4, cell.y + 4, '#0f0', 6);
      }
    });
  });

  // Enemy bullets vs shields
  enemyBullets.forEach((b, bi) => {
    shields.forEach(cell => {
      if (cell.hp <= 0) return;
      if (rectsOverlap(b.x-1, b.y, 3, 8, cell.x, cell.y, 8, 8)) {
        cell.hp--;
        enemyBullets.splice(bi, 1);
      }
    });
  });

  // Enemy bullets vs player
  if (player.alive && player.flashTimer === 0) {
    enemyBullets.forEach((b, bi) => {
      if (rectsOverlap(b.x-1, b.y, 3, 8, player.x, player.y, PLAYER_W, PLAYER_H)) {
        enemyBullets.splice(bi, 1);
        loseLife(false);
      }
    });
  }
}

// Bonus text floaters
let bonusTexts = [];
function showBonusText(x, y, text) {
  bonusTexts.push({ x, y, text, life: 60 });
}
function updateBonusTexts() {
  bonusTexts = bonusTexts.filter(t => t.life > 0);
  bonusTexts.forEach(t => { t.y -= 0.8; t.life--; });
}
function drawBonusTexts() {
  bonusTexts.forEach(t => {
    ctx.globalAlpha = t.life / 60;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#ff0';
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y);
    ctx.textAlign = 'left';
  });
  ctx.globalAlpha = 1;
}

// ── Lose life ──────────────────────────────────
function loseLife(instant) {
  spawnParticles(player.x + PLAYER_W/2, player.y + PLAYER_H/2, '#0f0', 24, true);
  playerDeadSound();
  flashTimer = 15; flashColor = '#fff';
  lives--;
  updateHUD();
  if (lives <= 0) {
    player.alive = false;
    setTimeout(showGameOver, 1500);
    gameState = 'dead';
  } else {
    if (instant) {
      player.x = W/2 - PLAYER_W/2;
      player.flashTimer = 120;
      enemyBullets = [];
    } else {
      player.flashTimer = 120;
      enemyBullets = [];
    }
  }
}

// ── Check level complete ───────────────────────
function checkLevelComplete() {
  if (aliens.every(a => !a.alive)) {
    if (level >= LEVELS.length) {
      setTimeout(showVictory, 800);
      gameState = 'dead';
    } else {
      setTimeout(showLevelUp, 800);
      gameState = 'dead';
    }
  }
}

// ── Main game loop ─────────────────────────────
let lastTime = 0;
function gameLoop(ts) {
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (gameState === 'playing') {
    updatePlayer(dt);
    updateBullets();
    updateAliens();
    updateUFO();
    checkCollisions();
    checkLevelComplete();
    updateParticles();
    updateBonusTexts();
  }

  // Draw
  drawGround();
  drawShields();

  aliens.forEach(a => { if (a.alive) drawPixelAlien(a, alienFrame); });

  drawUFO();
  drawPlayer();
  drawBullets();
  drawParticles();
  drawBonusTexts();
  drawFlash();
  drawHUDCanvas();

  // Scanlines overlay
  ctx.fillStyle = 'rgba(0,0,0,0.04)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 2);

  requestAnimationFrame(gameLoop);
}

// ── Bootstrap ──────────────────────────────────
function bootstrap() {
  updateHUD();
  showTitle();
  requestAnimationFrame(gameLoop);
}

bootstrap();
