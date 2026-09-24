import { SoundEngine } from './audio.js';
import { stageConfig, generatePath } from './game.js';
import { HapticsAdapter } from './haptics.js';
import { DEFAULT_DATA, loadData, saveData } from './storage.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const app = $('#app');
const board = $('#board');
const overlay = $('#overlay');
const screens = $$('.screen');

let data = loadData();
let run = null;
let phaseTimer = 0;
let sessionStarted = 0;
let toastTimer = 0;

const sound = new SoundEngine(() => data.settings.sound);
const haptics = new HapticsAdapter(() => data.settings.haptics);

function icon(name) {
  return `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function show(screenName) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === `${screenName}-screen`));
  if (screenName === 'home') renderHome();
  if (screenName === 'stats') renderStats();
  if (screenName === 'settings') renderSettings();
}

function persist() {
  saveData(data);
}

function renderHome() {
  $('#home-best').textContent = data.highestStage;
}

function renderLives() {
  const lives = $('#lives');
  lives.innerHTML = [0, 1, 2].map(index =>
    `<svg class="heart ${index >= run.lives ? 'lost' : ''}" aria-hidden="true"><use href="#i-heart"/></svg>`
  ).join('');
  lives.setAttribute('aria-label', `${run.lives} von 3 Leben`);
}

function renderSettings() {
  $$('.toggle-row').forEach(button => {
    const active = data.settings[button.dataset.setting];
    button.classList.toggle('on', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function renderStats() {
  const accuracy = data.stats.attempts ? Math.round(data.stats.correct / data.stats.attempts * 100) : 0;
  const items = [
    { label: 'HÖCHSTE STAGE', value: data.highestStage, note: 'Weiteste Stage, die du in einem Versuch erreicht hast', featured: true },
    { label: 'GESCHAFFTE STAGES', value: data.stats.stagesCleared, note: 'Summe aller abgeschlossenen Stages über alle Versuche' },
    { label: 'VERSUCHE', value: data.stats.runs, note: 'Gestartete Spielrunden' },
    { label: 'BESTE SERIE', value: data.stats.bestStreak, note: 'Stages ohne Fehler nacheinander' },
    { label: 'RICHTIGE FELDER', value: data.stats.correct, note: 'Korrekte Eingaben insgesamt' },
    { label: 'GENAUIGKEIT', value: `${accuracy} %`, note: 'Anteil korrekter Eingaben' },
    { label: 'SPIELZEIT', value: `${Math.floor(data.stats.totalSeconds / 60)} Min.`, note: 'Zeit in aktiven Versuchen' }
  ];
  $('#stats-grid').innerHTML = items.map(item =>
    `<article class="stat-card ${item.featured ? 'featured' : ''}"><span>${item.label}</span><b>${item.value}</b><small>${item.note}</small></article>`
  ).join('');
}

function updateSoundButton() {
  const button = $('#sound-quick');
  button.innerHTML = icon(data.settings.sound ? 'volume' : 'muted');
  button.setAttribute('aria-label', data.settings.sound ? 'Ton ausschalten' : 'Ton einschalten');
}

function startRun() {
  data.stats.runs++;
  persist();
  run = {
    stage: 1,
    lives: 3,
    streak: 0,
    seed: (Date.now() ^ Math.random() * 2 ** 31) >>> 0,
    path: null,
    input: 0,
    phase: 'idle',
    mistakes: 0
  };
  sessionStarted = Date.now();
  updateSoundButton();
  show('game');
  startStage(true);
}

function startStage(createNewPath) {
  clearTimeout(phaseTimer);
  app.classList.remove('game-success', 'game-error', 'game-over');
  const config = stageConfig(run.stage);
  if (createNewPath || !run.path) {
    run.seed = (run.seed + 0x9e3779b9) >>> 0;
    run.path = generatePath(config, run.seed);
  }
  run.config = config;
  run.input = 0;
  run.phase = 'show';
  $('#stage-value').textContent = run.stage;
  $('#streak-value').textContent = run.streak;
  $('#phase-title').textContent = 'MERKEN';
  $('#phase-copy').textContent = config.recovery ? 'Eine kurze Erholung – ganz ohne Eile' : 'Präge dir die Reihenfolge ein';
  $('#phase-pill').style.color = 'var(--purple)';
  renderLives();
  renderBoard();
  updateProgress();
  phaseTimer = setTimeout(hidePath, config.reveal);
}

function renderBoard() {
  const { cols, rows } = run.config;
  const pathPositions = new Map(run.path.map((point, index) => [`${point.x},${point.y}`, index]));
  board.style.setProperty('--cols', cols);
  board.style.setProperty('--rows', rows);
  board.innerHTML = '';
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement('button');
      const pathIndex = pathPositions.get(`${x},${y}`);
      cell.className = 'cell';
      cell.dataset.x = x;
      cell.dataset.y = y;
      cell.disabled = run.phase !== 'input';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `Feld ${x + 1}, ${y + 1}`);
      if (run.phase === 'show' && pathIndex !== undefined) {
        cell.classList.add('path');
        if (pathIndex === 0) cell.classList.add('start');
        cell.dataset.order = pathIndex + 1;
        cell.style.setProperty('--order', pathIndex);
        cell.style.setProperty('--reverse-order', run.path.length - pathIndex);
      }
      board.append(cell);
    }
  }
}

function hidePath() {
  if (!run || run.phase !== 'show') return;
  run.phase = 'transition';
  board.querySelectorAll('.path').forEach(cell => cell.classList.add('hiding'));
  phaseTimer = setTimeout(beginInput, 360 + run.path.length * 34);
}

function beginInput() {
  run.phase = 'input';
  renderBoard();
  $('#phase-title').textContent = 'JETZT DU';
  $('#phase-copy').textContent = 'Tippe den Pfad in derselben Reihenfolge';
  $('#phase-pill').style.color = 'var(--mint)';
  if (!data.tutorialDone) cellAt(run.path[0])?.classList.add('hint');
}

function cellAt(point) {
  return board.querySelector(`[data-x="${point.x}"][data-y="${point.y}"]`);
}

function updateProgress() {
  $('#progress-label').textContent = `PFAD ${run.input} VON ${run.path.length}`;
  $('#progress-bar').style.width = `${run.input / run.path.length * 100}%`;
}

async function tapCell(cell) {
  if (run.phase !== 'input') return;
  const wanted = run.path[run.input];
  const correct = Number(cell.dataset.x) === wanted.x && Number(cell.dataset.y) === wanted.y;
  data.stats.attempts++;

  if (correct) {
    data.stats.correct++;
    cell.classList.remove('hint');
    cell.classList.add('correct');
    run.input++;
    sound.play('correct');
    haptics.trigger('light');
    updateProgress();
    if (run.input === run.path.length) await stageWon();
  } else {
    run.phase = 'locked';
    run.lives--;
    run.streak = 0;
    run.mistakes++;
    cell.classList.add('wrong');
    app.classList.add('game-error');
    sound.play('error');
    haptics.trigger('error');
    const activeHearts = $$('#lives .heart:not(.lost)');
    activeHearts.at(-1)?.classList.add('breaking');
    await wait(190);
    sound.play('lifeLost');
    await wait(360);
    app.classList.remove('game-error');
    handleMiss();
  }
  persist();
}

function handleMiss() {
  if (run.lives <= 0) {
    gameOver();
    return;
  }
  dialog({
    icon: 'retry',
    kicker: 'NOCH EIN VERSUCH',
    title: 'Fast geschafft',
    copy: 'Du siehst jetzt genau denselben Pfad. Nutze, was du schon weißt.',
    score: `${run.lives} ${run.lives === 1 ? 'Leben' : 'Leben'} übrig`,
    primary: 'PFAD NOCHMAL',
    action: () => startStage(false),
    secondary: 'Versuch beenden',
    secondaryAction: gameOver
  });
}

async function stageWon() {
  run.phase = 'locked';
  run.streak++;
  data.stats.stagesCleared++;
  data.stats.bestStreak = Math.max(data.stats.bestStreak, run.streak);
  data.highestStage = Math.max(data.highestStage, run.stage + 1);
  data.highScore = Math.max(data.highScore, run.stage * 100 + run.streak * 25);
  data.tutorialDone = true;
  persist();
  app.classList.add('game-success');
  haptics.trigger('success');
  particles(run.mistakes === 0 ? 28 : 18);
  sound.play(run.mistakes === 0 ? 'perfect' : 'stage');
  await wait(650);
  app.classList.remove('game-success');
  dialog({
    icon: run.mistakes === 0 ? 'spark' : 'check',
    kicker: run.mistakes === 0 ? 'PERFEKT' : 'STAGE GESCHAFFT',
    title: run.mistakes === 0 ? 'Makellos!' : 'Sehr gut!',
    copy: run.mistakes === 0 ? 'Kein Fehler. Deine Serie wächst weiter.' : 'Du hast den Pfad gemeistert.',
    score: `SERIE ${run.streak} · +${100 + run.streak * 25} PUNKTE`,
    primary: 'WEITER',
    action: () => {
      run.stage++;
      run.path = null;
      run.mistakes = 0;
      startStage(true);
    }
  });
}

function finishSession() {
  if (!sessionStarted) return;
  data.stats.totalSeconds += Math.round((Date.now() - sessionStarted) / 1000);
  sessionStarted = 0;
  persist();
}

async function gameOver() {
  clearTimeout(phaseTimer);
  finishSession();
  app.classList.add('game-over');
  sound.play('gameOver');
  await wait(520);
  dialog({
    icon: 'trophy',
    kicker: 'VERSUCH BEENDET',
    title: `Stage ${run.stage}`,
    copy: `Dein Rekord liegt bei Stage ${data.highestStage}. Du kannst sofort neu starten.`,
    score: `BESTE SERIE INSGESAMT: ${data.stats.bestStreak}`,
    primary: 'NEUER VERSUCH',
    action: startRun,
    secondary: 'Zum Start',
    secondaryAction: () => {
      app.classList.remove('game-over');
      show('home');
    }
  });
}

function dialog(options) {
  $('#dialog-icon').innerHTML = icon(options.icon);
  $('#dialog-kicker').textContent = options.kicker;
  $('#dialog-title').textContent = options.title;
  $('#dialog-copy').textContent = options.copy;
  $('#dialog-score').textContent = options.score || '';
  const primary = $('#dialog-primary');
  const secondary = $('#dialog-secondary');
  primary.textContent = options.primary;
  primary.onclick = () => closeDialog(options.action);
  secondary.hidden = !options.secondary;
  secondary.textContent = options.secondary || '';
  secondary.onclick = () => closeDialog(options.secondaryAction);
  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => primary.focus());
}

function closeDialog(action) {
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden', 'true');
  action?.();
}

function particles(amount) {
  if (!data.settings.motion) return;
  const container = $('#particles');
  for (let index = 0; index < amount; index++) {
    const particle = document.createElement('i');
    particle.className = 'particle';
    particle.style.left = `${46 + Math.random() * 8}%`;
    particle.style.top = '48%';
    particle.style.background = index % 3 ? 'var(--mint)' : 'var(--purple)';
    particle.style.setProperty('--dx', `${(Math.random() - .5) * 290}px`);
    particle.style.setProperty('--dy', `${(Math.random() - .82) * 330}px`);
    particle.style.setProperty('--turn', `${(Math.random() - .5) * 520}deg`);
    container.append(particle);
    setTimeout(() => particle.remove(), 950);
  }
}

function toast(message) {
  clearTimeout(toastTimer);
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  toastTimer = setTimeout(() => element.classList.remove('show'), 1600);
}

board.addEventListener('click', event => {
  const cell = event.target.closest('.cell');
  if (cell) tapCell(cell);
});

// This pointer event is deliberately separate: iOS requires AudioContext creation
// synchronously inside the first direct user gesture.
$('#play-button').addEventListener('pointerdown', () => sound.unlock());
$('#play-button').addEventListener('click', () => {
  sound.resume();
  sound.play('button');
  startRun();
});

$('#pause-button').addEventListener('click', () => {
  const wasShowing = run.phase === 'show' || run.phase === 'transition';
  if (wasShowing) {
    clearTimeout(phaseTimer);
    run.phase = 'paused';
  }
  dialog({
    icon: 'pause',
    kicker: 'PAUSE',
    title: 'Kurz durchatmen',
    copy: wasShowing ? 'Zur Sicherheit zeigen wir dir den Pfad danach noch einmal.' : 'Der aktuelle Pfad bleibt erhalten.',
    primary: 'WEITERSPIELEN',
    action: () => { if (wasShowing) startStage(false); },
    secondary: 'Zum Start',
    secondaryAction: () => {
      clearTimeout(phaseTimer);
      finishSession();
      show('home');
    }
  });
});

$('#sound-quick').addEventListener('click', () => {
  data.settings.sound = !data.settings.sound;
  persist();
  updateSoundButton();
  if (data.settings.sound) {
    sound.unlock();
    sound.play('button');
  }
  toast(data.settings.sound ? 'Ton eingeschaltet' : 'Ton ausgeschaltet');
});

$$('[data-open]').forEach(button => button.addEventListener('click', () => show(button.dataset.open)));
$$('[data-back]').forEach(button => button.addEventListener('click', () => show('home')));

$$('.toggle-row').forEach(button => button.addEventListener('click', () => {
  const setting = button.dataset.setting;
  data.settings[setting] = !data.settings[setting];
  persist();
  renderSettings();
  if (setting === 'sound' && data.settings.sound) sound.unlock();
  sound.play('button');
}));

$('#reset-progress').addEventListener('click', () => dialog({
  icon: 'warning',
  kicker: 'GEFAHRENAKTION',
  title: 'Fortschritt löschen?',
  copy: 'Rekord, gesamte Statistik und Einstellungen werden dauerhaft auf diesem Gerät gelöscht.',
  primary: 'ENDGÜLTIG LÖSCHEN',
  action: () => {
    data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    persist();
    renderSettings();
    toast('Lokaler Fortschritt gelöscht');
  },
  secondary: 'Abbrechen',
  secondaryAction: () => {}
}));

document.addEventListener('pointerdown', event => {
  if (event.target.closest('button') && event.target.id !== 'play-button') sound.play('button');
}, { passive: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && run && (run.phase === 'show' || run.phase === 'transition')) {
    clearTimeout(phaseTimer);
    run.phase = 'paused';
    dialog({
      icon: 'shield',
      kicker: 'AUTOMATISCH PAUSIERT',
      title: 'Pfad geschützt',
      copy: 'Nach deiner Rückkehr zeigen wir den Pfad für einen fairen Neustart erneut.',
      primary: 'PFAD ANZEIGEN',
      action: () => startStage(false)
    });
  }
  if (!document.hidden) sound.resume();
});

window.addEventListener('pageshow', () => sound.resume());
window.addEventListener('beforeunload', finishSession);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

renderHome();
updateSoundButton();
