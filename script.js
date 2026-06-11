// =====================
//   STATE
// =====================
let boardSize = 3; // 3, 4, or 5
let board = [];
let currentPlayer = 'x';
let gameActive = true;
let isPlayerTurn = true;
let difficulty = 'medium';
let gameMode = 'ai';
let scores = { x: 0, o: 0, tie: 0 };
let timerInterval = null;
let timeLeft = 10;
let isDark = true;

const TIMER_DURATION = 10;

// =====================
//   COIN SYSTEM
// =====================
let coins = parseInt(localStorage.getItem('mobin_coins') || '50');
let ownedPieces = JSON.parse(localStorage.getItem('mobin_owned') || '["classic"]');
let selectedPieceX = localStorage.getItem('mobin_piece_x') || 'classic';
let selectedPieceO = localStorage.getItem('mobin_piece_o') || 'classic';

const PIECES = {
  classic:  { name: 'کلاسیک',     labelX: 'X',  labelO: 'O',  price: 0,    emoji: '✖️/⭕' },
  star:     { name: 'نازی',       labelX: '💋', labelO: '🥺', price: 30,   emoji: '💋/🥺' },
  fire:     { name: 'آتش',         labelX: '🔥', labelO: '💧', price: 50,   emoji: '🔥/💧' },
  diamond:  { name: ' و سیگما لوس',       labelX: '🎀', labelO: '🗿', price: 80,   emoji: '🎀/🗿' },
  skull:    { name: 'جمجمه',       labelX: '💀', labelO: '👻', price: 60,   emoji: '💀/👻' },
  crown:    { name: 'تاج',         labelX: '👑', labelO: '🏆', price: 100,  emoji: '👑/🏆' },
  robot:    { name: 'ربات',        labelX: '🤖', labelO: '👾', price: 70,   emoji: '🤖/👾' },
  heart:    { name: 'عشق',         labelX: '🫵', labelO: '💋', price: 45,   emoji: '🫵/💋' },
};

function saveCoins() {
  localStorage.setItem('mobin_coins', coins);
  localStorage.setItem('mobin_owned', JSON.stringify(ownedPieces));
  localStorage.setItem('mobin_piece_x', selectedPieceX);
  localStorage.setItem('mobin_piece_o', selectedPieceO);
  updateCoinDisplay();
}

function addCoins(amount) {
  coins += amount;
  saveCoins();
  showCoinPopup('+' + amount + ' 🪙');
}

function showCoinPopup(text) {
  const popup = document.createElement('div');
  popup.className = 'coin-popup';
  popup.textContent = text;
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 1500);
}

function updateCoinDisplay() {
  document.getElementById('coin-count').textContent = coins;
}

// =====================
//   SOUND ENGINE
// =====================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let customSounds = JSON.parse(localStorage.getItem('mobin_sounds') || '{}');
// customSounds: { win: base64, lose: base64, tie: base64 }

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

async function playCustomSound(type) {
  const data = customSounds[type];
  if (!data) return false;
  try {
    const ctx = getAudioCtx();
    const b64 = data.split(',')[1] || data;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const buffer = await ctx.decodeAudioData(bytes.buffer);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
    return true;
  } catch(e) { return false; }
}

async function playSound(type) {
  if (type === 'win' || type === 'lose' || type === 'tie') {
    const played = await playCustomSound(type);
    if (played) return;
  }
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'win') {
      [0, 0.15, 0.3].forEach((t, i) => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'triangle';
        o2.frequency.setValueAtTime([523, 659, 784][i], ctx.currentTime + t);
        g2.gain.setValueAtTime(0.22, ctx.currentTime + t);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
        o2.start(ctx.currentTime + t);
        o2.stop(ctx.currentTime + t + 0.25);
      });
    } else if (type === 'lose') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'tick') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'coin') {
      [0, 0.08].forEach((t, i) => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'sine';
        o2.frequency.setValueAtTime([1200, 1500][i], ctx.currentTime + t);
        g2.gain.setValueAtTime(0.15, ctx.currentTime + t);
        g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
        o2.start(ctx.currentTime + t);
        o2.stop(ctx.currentTime + t + 0.15);
      });
    }
  } catch (e) {}
}

// =====================
//   VOICE CONTROL
// =====================
let voiceRecognition = null;
let voiceActive = false;

const VOICE_COMMANDS_MAP = {
  // Row-Col style
  'بالا چپ': 0, 'بالا وسط': 1, 'بالا راست': 2,
  'وسط چپ': 3, 'وسط': 4, 'وسط وسط': 4, 'وسط راست': 5,
  'پایین چپ': 6, 'پایین وسط': 7, 'پایین راست': 8,
  // Numbers
  'یک': 0, 'دو': 1, 'سه': 2, 'چهار': 3, 'پنج': 4,
  'شش': 5, 'هفت': 6, 'هشت': 7, 'نه': 8,
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8,
};

function initVoice() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    document.getElementById('voice-btn').style.display = 'none';
    return;
  }
  voiceRecognition = new SpeechRec();
  voiceRecognition.lang = 'fa-IR';
  voiceRecognition.continuous = false;
  voiceRecognition.interimResults = false;

  voiceRecognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript.trim();
    showVoiceResult(transcript);
    handleVoiceCommand(transcript);
  };
  voiceRecognition.onend = () => {
    if (voiceActive) {
      document.getElementById('voice-btn').classList.remove('listening');
      voiceActive = false;
    }
  };
  voiceRecognition.onerror = () => {
    document.getElementById('voice-btn').classList.remove('listening');
    voiceActive = false;
  };
}

function toggleVoice() {
  if (!voiceRecognition) return;
  if (voiceActive) {
    voiceRecognition.stop();
    voiceActive = false;
    document.getElementById('voice-btn').classList.remove('listening');
  } else {
    voiceRecognition.start();
    voiceActive = true;
    document.getElementById('voice-btn').classList.add('listening');
  }
}

function showVoiceResult(text) {
  const el = document.getElementById('voice-result');
  el.textContent = '🎙️ "' + text + '"';
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

function handleVoiceCommand(transcript) {
  const totalCells = boardSize * boardSize;
  for (const [cmd, idx] of Object.entries(VOICE_COMMANDS_MAP)) {
    if (transcript.includes(cmd) && idx < totalCells) {
      if (board[idx] === '' && gameActive && isPlayerTurn) {
        document.querySelectorAll('.cell')[idx].click();
        return;
      }
    }
  }
  showVoiceResult('❓ نشناختم: ' + transcript);
}

// =====================
//   AI TAUNTS
// =====================
const AI_TAUNTS_WINNING = [
  '🤖 دارم می‌برمت...',
  '🤖 حریف من نیستی!',
  '🤖 آه‌ از نهادت برمیاد...',
  '🤖 پردازشم قوی‌تر از مغزته!',
  '🤖 باخت قطعی‌ته!',
];
const AI_TAUNTS_GOOD_MOVE = [
  '🤖 حرکت خوبی بود.',
  '🤖 پیش‌بینی نمی‌کردم اینو...',
  '🤖 ممنون، بهتر شدی!',
  '🤖 هوشمندانه بود.',
];
const AI_TAUNTS_AFTER_WIN = [
  '🤖 این دفعه شانسی بردی!',
  '🤖 بار بعد نمی‌ذارم!',
  '🤖 باشه، یه بار به تو...',
  '🤖 حقت بود 😤',
];
const AI_TAUNTS_MOVE = [
  '🤖 محاسبه کردم...',
  '🤖 این بهترین حرکته!',
  '🤖 ۱۰۰۰ حالت بررسی کردم!',
  '🤖 ببین چی شد!',
];

let lastTauntTime = 0;
function showAITaunt(tauntArr) {
  if (gameMode !== 'ai') return;
  const now = Date.now();
  if (now - lastTauntTime < 2000) return;
  lastTauntTime = now;
  const taunt = tauntArr[Math.floor(Math.random() * tauntArr.length)];
  const el = document.getElementById('ai-taunt');
  el.textContent = taunt;
  el.style.opacity = '1';
  el.style.transform = 'translateY(0)';
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-8px)';
  }, 2500);
}

// =====================
//   CONFETTI
// =====================
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const pieces = [];
  const colors = ['#1EE6FF', '#66FF0E', '#FFE300', '#F50055', '#fff', '#ff9900'];
  for (let i = 0; i < 120; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5, h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 4 + 2,
      vr: (Math.random() - 0.5) * 6
    });
  }
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    });
    frame++;
    if (frame < 120) requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
  }
  draw();
}

// =====================
//   TIMER
// =====================
function startTimer() {
  clearTimer();
  timeLeft = TIMER_DURATION;
  updateTimerUI();
  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 3) playSound('tick');
    updateTimerUI();
    if (timeLeft <= 0) { clearTimer(); handleTimeout(); }
  }, 1000);
}

function clearTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function updateTimerUI() {
  document.getElementById('timer-display').textContent = timeLeft;
  const pct = (timeLeft / TIMER_DURATION) * 100;
  const bar = document.getElementById('timer-bar');
  bar.style.width = pct + '%';
  bar.style.background = timeLeft <= 3 ? '#F50055' : timeLeft <= 6 ? '#FFE300' : '#1EE6FF';
}

function handleTimeout() {
  if (!gameActive) return;
  const empty = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  if (!empty.length) return;
  const idx = empty[Math.floor(Math.random() * empty.length)];
  makeMove(idx, currentPlayer);
  playSound('click');
  if (checkWin(currentPlayer)) { endGame(currentPlayer === 'x' ? 'win' : 'lose'); return; }
  if (!board.includes('')) { endGame('tie'); return; }
  switchPlayer();
  if (gameMode === 'ai' && currentPlayer === 'o') {
    clearTimer();
    setTimeout(() => robotMove(), 500);
  } else { updateStatus(); startTimer(); }
}

// =====================
//   BOARD BUILDER
// =====================
function buildBoard() {
  board = new Array(boardSize * boardSize).fill('');
  const boardEl = document.querySelector('.game-board');
  boardEl.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${boardSize}, 1fr)`;

  // Remove old cells (keep the svg)
  const oldCells = boardEl.querySelectorAll('.cell');
  oldCells.forEach(c => c.remove());

  // Adjust cell height based on board size
  const cellH = boardSize === 3 ? 88 : boardSize === 4 ? 72 : 58;
  const fontSize = boardSize === 3 ? '2.8em' : boardSize === 4 ? '2.2em' : '1.8em';

  for (let i = 0; i < boardSize * boardSize; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('data-index', i);
    cell.style.height = cellH + 'px';
    cell.style.fontSize = fontSize;
    cell.addEventListener('click', handleClick);
    boardEl.insertBefore(cell, document.getElementById('win-line-svg'));
  }

  updateWinningCombinations();
}

let winningCombinations = [];

function updateWinningCombinations() {
  winningCombinations = [];
  const n = boardSize;
  // Rows
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) row.push(r * n + c);
    winningCombinations.push(row);
  }
  // Cols
  for (let c = 0; c < n; c++) {
    const col = [];
    for (let r = 0; r < n; r++) col.push(r * n + c);
    winningCombinations.push(col);
  }
  // Diag main
  const d1 = [];
  for (let i = 0; i < n; i++) d1.push(i * n + i);
  winningCombinations.push(d1);
  // Diag anti
  const d2 = [];
  for (let i = 0; i < n; i++) d2.push(i * n + (n - 1 - i));
  winningCombinations.push(d2);
}

// =====================
//   INIT
// =====================
getDeviceInfo();
init();

function init() {
  buildBoard();
  updateStatus();
  startTimer();
  updateCoinDisplay();
  initVoice();
  setupSoundUpload();

  // Difficulty
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.dataset.diff;
      restartGame();
    });
  });

  // Mode
  document.getElementById('mode-toggle').addEventListener('change', () => {
    const modeToggle = document.getElementById('mode-toggle');
    gameMode = modeToggle.checked ? 'pvp' : 'ai';
    document.getElementById('mode-label').textContent = gameMode === 'pvp' ? 'دو نفره' : 'تک نفره';
    document.getElementById('diff-group').style.opacity = gameMode === 'pvp' ? '0.3' : '1';
    document.getElementById('diff-group').style.pointerEvents = gameMode === 'pvp' ? 'none' : 'auto';
    restartGame();
  });

  // Theme - FIX: use correct logic
  document.getElementById('theme-toggle').addEventListener('change', function() {
    isDark = !this.checked;
    document.body.classList.toggle('light-mode', this.checked);
  });

  // Board size
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      boardSize = parseInt(btn.dataset.size);
      restartGame();
    });
  });

  // Play again
  document.getElementById('play-again').addEventListener('click', restartGame);

  // Voice
  document.getElementById('voice-btn').addEventListener('click', toggleVoice);

  // Shop
  document.getElementById('shop-btn').addEventListener('click', openShop);
  document.getElementById('shop-close').addEventListener('click', closeShop);

  renderShop();
}

function setupSoundUpload() {
  ['win', 'lose', 'tie'].forEach(type => {
    const input = document.getElementById('sound-' + type);
    if (!input) return;
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        customSounds[type] = ev.target.result;
        localStorage.setItem('mobin_sounds', JSON.stringify(customSounds));
        const nameId = 'name-' + type;
        const label = document.getElementById(nameId);
        if (label) label.textContent = file.name;
        showCoinPopup('✅ صدا ذخیره شد!');
      };
      reader.readAsDataURL(file);
    });
  });
}

// =====================
//   GAME LOGIC
// =====================
function handleClick(event) {
  if (!gameActive || !isPlayerTurn) return;
  const cell = event.target;
  const index = parseInt(cell.getAttribute('data-index'));
  if (board[index]) return;

  clearTimer();
  playSound('click');

  if (gameMode === 'pvp') {
    makeMove(index, currentPlayer);
    if (checkWin(currentPlayer)) { endGame(currentPlayer === 'x' ? 'win' : 'lose_pvp'); return; }
    if (!board.includes('')) { endGame('tie'); return; }
    switchPlayer();
    updateStatus();
    startTimer();
    return;
  }

  isPlayerTurn = false;
  makeMove(index, currentPlayer);
  if (checkWin(currentPlayer)) { endGame('win'); return; }
  if (!board.includes('')) { endGame('tie'); return; }
  switchPlayer();

  // Check if AI is in danger → taunt
  const empty = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  let playerWinThreat = false;
  for (let i of empty) { board[i] = 'x'; if (checkWin('x')) playerWinThreat = true; board[i] = ''; }
  if (playerWinThreat) showAITaunt(AI_TAUNTS_GOOD_MOVE);
  else if (Math.random() < 0.3) showAITaunt(AI_TAUNTS_MOVE);

  setTimeout(() => { robotMove(); isPlayerTurn = true; }, 400);
  updateStatus();
}

function getCellLabel(player) {
  const piece = player === 'x' ? PIECES[selectedPieceX] : PIECES[selectedPieceO];
  return player === 'x' ? piece.labelX : piece.labelO;
}

function makeMove(index, player) {
  board[index] = player;
  const cell = document.querySelectorAll('.cell')[index];
  const label = getCellLabel(player);
  if (label === 'X' || label === 'O') {
    cell.classList.add(player);
  } else {
    cell.classList.add('emoji-piece');
    cell.classList.add(player + '-emoji');
    cell.setAttribute('data-symbol', label);
  }
}

function switchPlayer() {
  currentPlayer = currentPlayer === 'x' ? 'o' : 'x';
}

function robotMove() {
  const move = findBestMove();
  makeMove(move, 'o');
  playSound('click');

  // Taunt after AI move
  const empty2 = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  let aiWinThreat = false;
  for (let i of empty2) { board[i] = 'o'; if (checkWin('o')) aiWinThreat = true; board[i] = ''; }
  if (aiWinThreat) showAITaunt(AI_TAUNTS_WINNING);
  else if (Math.random() < 0.25) showAITaunt(AI_TAUNTS_MOVE);

  if (checkWin('o')) { endGame('lose'); return; }
  if (!board.includes('')) { endGame('tie'); return; }
  switchPlayer();
  updateStatus();
  startTimer();
}

// =====================
//   AI (MINIMAX)
// =====================
function findBestMove() {
  const empty = board.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  if (difficulty === 'easy') {
    if (Math.random() < 0.7) return empty[Math.floor(Math.random() * empty.length)];
  }
  if (difficulty === 'medium') {
    for (let i of empty) { board[i] = 'o'; if (checkWin('o')) { board[i] = ''; return i; } board[i] = ''; }
    for (let i of empty) { board[i] = 'x'; if (checkWin('x')) { board[i] = ''; return i; } board[i] = ''; }
    return empty[Math.floor(Math.random() * empty.length)];
  }
  // hard
  const maxDepth = boardSize === 3 ? 9 : boardSize === 4 ? 4 : 3;
  let best = -Infinity, bestMove = empty[0];
  for (let i of empty) {
    board[i] = 'o';
    const score = minimax(board, 0, false, -Infinity, Infinity, maxDepth);
    board[i] = '';
    if (score > best) { best = score; bestMove = i; }
  }
  return bestMove;
}

function minimax(b, depth, isMax, alpha, beta, maxDepth) {
  if (checkWin('o')) return 10 - depth;
  if (checkWin('x')) return depth - 10;
  const empty = b.map((v, i) => v === '' ? i : null).filter(v => v !== null);
  if (!empty.length || depth >= maxDepth) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i of empty) {
      b[i] = 'o';
      best = Math.max(best, minimax(b, depth + 1, false, alpha, beta, maxDepth));
      b[i] = '';
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (let i of empty) {
      b[i] = 'x';
      best = Math.min(best, minimax(b, depth + 1, true, alpha, beta, maxDepth));
      b[i] = '';
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function checkWin(player) {
  return winningCombinations.some(c => c.every(i => board[i] === player));
}

// =====================
//   WIN LINE
// =====================
function drawWinLine(player) {
  const combo = winningCombinations.find(c => c.every(i => board[i] === player));
  if (!combo) return;
  const cellEls = document.querySelectorAll('.cell');
  const first = cellEls[combo[0]].getBoundingClientRect();
  const last = cellEls[combo[combo.length - 1]].getBoundingClientRect();
  const boardEl = document.querySelector('.game-board').getBoundingClientRect();
  const x1 = first.left + first.width / 2 - boardEl.left;
  const y1 = first.top + first.height / 2 - boardEl.top;
  const x2 = last.left + last.width / 2 - boardEl.left;
  const y2 = last.top + last.height / 2 - boardEl.top;
  const winLine = document.getElementById('win-line');
  winLine.setAttribute('x1', x1); winLine.setAttribute('y1', y1);
  winLine.setAttribute('x2', x2); winLine.setAttribute('y2', y2);
  winLine.parentElement.style.display = 'block';
  winLine.style.strokeDasharray = '300';
  winLine.style.strokeDashoffset = '300';
  winLine.style.stroke = player === 'x' ? '#1EE6FF' : '#F50055';
  setTimeout(() => { winLine.style.strokeDashoffset = '0'; }, 50);
}

// =====================
//   END GAME
// =====================
function endGame(type) {
  gameActive = false;
  clearTimer();
  const resultDiv = document.getElementById('result');
  const status = document.querySelector('.status');
  resultDiv.style.display = 'block';
  status.style.display = 'none';
  resultDiv.classList.remove('win', 'lose', 'tie');

  if (type === 'win') {
    resultDiv.textContent = 'برنده شدی عشقم مبین فدات 🎉';
    resultDiv.classList.add('win');
    scores.x++;
    playSound('win');
    launchConfetti();
    drawWinLine('x');
    addCoins(10);
    showAITaunt(AI_TAUNTS_AFTER_WIN);
  } else if (type === 'lose') {
    resultDiv.textContent = 'باختی عشقم خاک تو سرت 😐';
    resultDiv.classList.add('lose');
    scores.o++;
    playSound('lose');
    drawWinLine('o');
    addCoins(2);
  } else if (type === 'lose_pvp') {
    resultDiv.textContent = `بازیکن ${currentPlayer === 'x' ? 'X 🔵' : 'O 🔴'} برنده شد! 🎉`;
    resultDiv.classList.add('win');
    currentPlayer === 'x' ? scores.x++ : scores.o++;
    playSound('win');
    launchConfetti();
    drawWinLine(currentPlayer);
    addCoins(5);
  } else {
    resultDiv.textContent = 'مساوی شد! نه بردی نه باختی 😑';
    resultDiv.classList.add('tie');
    scores.tie++;
    playSound('tie');
    addCoins(3);
  }

  updateScores();
  document.getElementById('play-again').style.display = 'inline-block';
  document.querySelector('.support').style.display = 'inline-block';
  animateWinningCells(type === 'win' ? 'x' : type === 'lose' ? 'o' : type === 'lose_pvp' ? currentPlayer : null);
}

function animateWinningCells(player) {
  if (!player) return;
  const combo = winningCombinations.find(c => c.every(i => board[i] === player));
  if (combo) combo.forEach(index => document.querySelectorAll('.cell')[index].classList.add('animate-win'));
}

function updateScores() {
  document.getElementById('score-x').textContent = scores.x;
  document.getElementById('score-o').textContent = scores.o;
  document.getElementById('score-tie').textContent = scores.tie;
}

function restartGame() {
  buildBoard();
  currentPlayer = 'x';
  gameActive = true;
  isPlayerTurn = true;
  const status = document.querySelector('.status');
  const resultDiv = document.getElementById('result');
  status.style.display = 'block';
  resultDiv.style.display = 'none';
  resultDiv.classList.remove('win', 'lose', 'tie');
  document.getElementById('play-again').style.display = 'none';
  document.querySelector('.support').style.display = 'none';
  document.getElementById('win-line-svg').style.display = 'none';
  updateStatus();
  startTimer();
}

function updateStatus() {
  const status = document.querySelector('.status');
  const name = gameMode === 'pvp'
    ? (currentPlayer === 'x' ? 'بازیکن ۱' : 'بازیکن ۲')
    : (currentPlayer === 'x' ? 'تو' : 'هوش مصنوعی');
  status.innerHTML = currentPlayer === 'x'
    ? `نوبت <span class="player-x">${name}</span> است`
    : `نوبت <span class="player-o">${name}</span> است`;
}

// =====================
//   SHOP
// =====================
function openShop() {
  document.getElementById("shop-coin-count").textContent = coins;
  renderShop();
  document.getElementById('shop-overlay').style.display = 'flex';
}
function closeShop() {
  document.getElementById('shop-overlay').style.display = 'none';
}

function renderShop() {
  const grid = document.getElementById('shop-grid');
  grid.innerHTML = '';
  Object.entries(PIECES).forEach(([id, piece]) => {
    const owned = ownedPieces.includes(id);
    const isActiveX = selectedPieceX === id;
    const isActiveO = selectedPieceO === id;
    const card = document.createElement('div');
    card.className = 'shop-card' + (owned ? ' owned' : '');
    card.innerHTML = `
      <div class="shop-emoji">${piece.emoji}</div>
      <div class="shop-name">${piece.name}</div>
      <div class="shop-price">${owned ? '✅ دارم' : '🪙 ' + piece.price}</div>
      ${owned ? `
        <button class="shop-equip-btn ${isActiveX ? 'equipped' : ''}" onclick="equipPiece('${id}','x')">
          ${isActiveX ? '✓ X' : 'بزن X'}
        </button>
        <button class="shop-equip-btn ${isActiveO ? 'equipped' : ''}" onclick="equipPiece('${id}','o')">
          ${isActiveO ? '✓ O' : 'بزن O'}
        </button>
      ` : `<button class="shop-buy-btn" onclick="buyPiece('${id}')">خرید</button>`}
    `;
    grid.appendChild(card);
  });
}

function buyPiece(id) {
  const piece = PIECES[id];
  if (ownedPieces.includes(id)) return;
  if (coins < piece.price) {
    showCoinPopup('❌ سکه کافی نداری!');
    return;
  }
  coins -= piece.price;
  ownedPieces.push(id);
  playSound('coin');
  saveCoins();
  renderShop();
  showCoinPopup('🎉 خریدی! ' + piece.name);
}

function equipPiece(id, player) {
  if (!ownedPieces.includes(id)) return;
  if (player === 'x') selectedPieceX = id;
  else selectedPieceO = id;
  saveCoins();
  renderShop();
  restartGame();
}

// =====================
//   SUPPORT LINK
// =====================
function getDeviceInfo() {
  const supportButton = document.querySelector('.support');
  fetch('https://api.ipify.org?format=json')
    .then(r => r.json())
    .then(d => { supportButton.href = `mailto:mobin.2009@gmail.com?subject=${encodeURIComponent(`MOBIN GAME - ${navigator.userAgent} - ${d.ip}`)}`; })
    .catch(() => { supportButton.href = 'mailto:mobin.2009@gmail.com'; });
}
