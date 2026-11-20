// Wires the Vice Nights Cover Studio: layout, grade and size pickers, caption
// editing, per-panel photo crop and position, undo and redo, PNG export, and
// the `?shot=` scenes screenshots are taken from (./shots.js).

import { SIZES, LAYOUTS, GRADES, layoutPanelCount, layoutRects, renderCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');

const SAMPLE_PHOTOS = ['boulevard', 'pier'];
const SURPRISE_TITLES = [
  ['VICE NIGHTS', 'a Leonida story'],
  ['NEON SHORE', 'midnight in Vice City'],
  ['PIER PRESSURE', 'golden hour, no filter'],
  ['NIGHT SHIFT', 'the city never sleeps'],
  ['SUNSET HEIST', 'one last job'],
  ['BOULEVARD QUEEN', 'crown optional'],
];

/** A fresh editor state: nine panel slots, the layout picks how many it uses. */
export function defaultState() {
  const panels = [];
  for (let i = 0; i < 9; i++) {
    panels.push({
      src: SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length],
      file: null,
      zoom: 1,
      ox: 0,
      oy: 0,
      flip: false,
    });
  }
  return {
    size: '1080x1080',
    layout: 'hero',
    grade: 'sunset',
    title: 'VICE NIGHTS',
    subtitle: 'a Leonida story',
    titlePos: 'bottom',
    frame: true,
    grain: true,
    vignette: true,
    halftone: false,
    selected: 0,
    panels,
  };
}

let state = defaultState();
let images = new Array(9).fill(null);
let history = [];
let historyIndex = -1;
let fontsReady = false;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads (or reloads) one panel's photo: an upload wins over its sample. */
async function loadPanelImage(i) {
  const panel = state.panels[i];
  const url = panel.file || (panel.src ? `samples/${panel.src}.jpg` : null);
  images[i] = url ? await loadImage(url).catch(() => null) : null;
}

/** Loads every panel image the current layout needs, then draws. */
async function loadAllPanelImages() {
  const count = layoutPanelCount(state.layout);
  images = new Array(9).fill(null);
  await Promise.all(Array.from({ length: count }, (_, i) => loadPanelImage(i)));
}

/** Draws the cover with the current state. Waits for the fonts once. */
export async function render() {
  if (!fontsReady) {
    try {
      await Promise.all([
        document.fonts.load('40px Anton'),
        document.fonts.load('20px Pacifico'),
        document.fonts.ready,
      ]);
    } catch {
      // Fallbacks still draw; the cover never blocks on a font.
    }
    fontsReady = true;
  }
  renderCover(canvas, state, images);
  syncPanelControls();
}

/** Pushes a snapshot onto the undo stack after a committed change. */
function pushHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(JSON.stringify(state));
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  syncUndoButtons();
}

function syncUndoButtons() {
  document.getElementById('undo').disabled = historyIndex <= 0;
  document.getElementById('redo').disabled = historyIndex >= history.length - 1;
}

/** Restores a history snapshot and redraws. */
async function restoreHistory(index) {
  historyIndex = index;
  state = JSON.parse(history[historyIndex]);
  await loadAllPanelImages();
  await render();
  syncUndoButtons();
  syncAllControls();
}

/** Applies a state patch, reloads photos if needed, redraws, records history. */
async function applyChange(patch, reloadPhotos = false) {
  Object.assign(state, patch);
  if (reloadPhotos) await loadAllPanelImages();
  await render();
  pushHistory();
}

/** Builds a row of toggle buttons for layouts, grades or sizes. */
function buildPicker(containerId, entries, current, onPick) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (const [value, label] of entries) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick';
    button.textContent = label;
    button.dataset.value = value;
    if (value === current) button.classList.add('active');
    button.addEventListener('click', () => {
      container.querySelectorAll('.pick').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      onPick(value);
    });
    container.appendChild(button);
  }
}

function buildPickers() {
  buildPicker('layoutRow', Object.entries(LAYOUTS), state.layout, (v) => {
    state.selected = 0;
    applyChange({ layout: v }, true);
  });
  buildPicker('gradeRow', Object.entries(GRADES), state.grade, (v) => applyChange({ grade: v }));
  buildPicker('sizeRow', Object.entries(SIZES).map(([k]) => [k, k.replace('x', ' × ')]), state.size, (v) => applyChange({ size: v }));
}

/** Shows the selected panel's controls and the panel strip. */
function syncPanelControls() {
  const panel = state.panels[state.selected];
  const count = layoutPanelCount(state.layout);
  document.getElementById('panelName').textContent = `Panel ${state.selected + 1} of ${count}`;
  document.getElementById('panelPhoto').value = panel.file ? 'upload' : (panel.src || '');
  document.getElementById('zoomRange').value = String(panel.zoom);
  document.getElementById('zoomValue').textContent = `${Math.round(panel.zoom * 100)}%`;
  const strip = document.getElementById('panelStrip');
  strip.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel-chip' + (i === state.selected ? ' active' : '');
    button.textContent = `${i + 1}`;
    button.addEventListener('click', async () => {
      state.selected = i;
      await render();
    });
    strip.appendChild(button);
  }
  canvas.style.aspectRatio = SIZES[state.size].join(' / ');
}

function syncAllControls() {
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  document.getElementById('titlePos').value = state.titlePos;
  for (const id of ['frameToggle', 'grainToggle', 'vignetteToggle', 'halftoneToggle']) {
    document.getElementById(id).checked = state[id.replace('Toggle', '')];
  }
  buildPickers();
  syncPanelControls();
}

/** Exports the cover at full size as a PNG download. */
export async function exportCover() {
  if (!fontsReady) await render();
  const offscreen = document.createElement('canvas');
  renderCover(offscreen, state, images);
  const [w, h] = SIZES[state.size];
  offscreen.toBlob((blob) => {
    if (!blob) {
      statusEl.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-nights-${w}x${h}.png`;
    a.click();
    statusEl.textContent = `Saved vice-nights-${w}x${h}.png`;
  }, 'image/png');
}

/** Picks a random layout, grade and title for a one-click cover. */
async function surpriseMe() {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  const [title, subtitle] = SURPRISE_TITLES[Math.floor(Math.random() * SURPRISE_TITLES.length)];
  const patch = {
    layout: layouts[Math.floor(Math.random() * layouts.length)],
    grade: grades[Math.floor(Math.random() * grades.length)],
    title,
    subtitle,
    selected: 0,
  };
  patch.panels = state.panels.map((p, i) => ({
    ...p,
    src: SAMPLE_PHOTOS[(i + Math.floor(Math.random() * 2)) % SAMPLE_PHOTOS.length],
    file: null,
    zoom: 1,
    ox: 0,
    oy: 0,
  }));
  await applyChange(patch, true);
  statusEl.textContent = `Surprise: ${patch.title} — ${LAYOUTS[patch.layout]}, ${GRADES[patch.grade]}`;
}

/** Canvas hit-testing: which panel rect holds a pointer position. */
function panelAt(clientX, clientY) {
  const box = canvas.getBoundingClientRect();
  const x = ((clientX - box.left) / box.width) * canvas.width;
  const y = ((clientY - box.top) / box.height) * canvas.height;
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

let dragPanel = -1;
let dragLast = null;
let wheelTimer = null;

canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit < 0) return;
  dragPanel = hit;
  state.selected = hit;
  dragLast = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  render();
});

canvas.addEventListener('pointermove', (e) => {
  if (dragPanel < 0 || !dragLast) return;
  const box = canvas.getBoundingClientRect();
  const panel = state.panels[dragPanel];
  const rects = layoutRects(state.layout, canvas.width, canvas.height);
  const r = rects[dragPanel];
  panel.ox += ((e.clientX - dragLast.x) / box.width) * (canvas.width / r.w);
  panel.oy += ((e.clientY - dragLast.y) / box.height) * (canvas.height / r.h);
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy));
  dragLast = { x: e.clientX, y: e.clientY };
  renderCover(canvas, state, images);
});

canvas.addEventListener('pointerup', () => {
  if (dragPanel >= 0) pushHistory();
  dragPanel = -1;
  dragLast = null;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const hit = panelAt(e.clientX, e.clientY);
  if (hit < 0) return;
  state.selected = hit;
  const panel = state.panels[hit];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
  renderCover(canvas, state, images);
  syncPanelControls();
  clearTimeout(wheelTimer);
  wheelTimer = setTimeout(pushHistory, 400);
}, { passive: false });

/** Scene API for ?shot= screenshots: loads samples, applies a scene, draws. */
const shotApi = {
  async loadSample(name) {
    return loadImage(`samples/${name}.jpg`);
  },
  async applyScene(scene) {
    Object.assign(state, scene.patch || {});
    if (scene.photos) {
      state.panels = state.panels.map((p, i) => ({
        ...p,
        src: scene.photos[i % scene.photos.length] || null,
        file: null,
        zoom: 1,
        ox: 0,
        oy: 0,
      }));
    }
    await loadAllPanelImages();
    await render();
    syncAllControls();
  },
};

titleInput.addEventListener('input', () => {
  state.title = titleInput.value;
  renderCover(canvas, state, images);
});
titleInput.addEventListener('change', pushHistory);
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  renderCover(canvas, state, images);
});
subtitleInput.addEventListener('change', pushHistory);
document.getElementById('titlePos').addEventListener('change', (e) => applyChange({ titlePos: e.target.value }));

for (const [id, key] of [['frameToggle', 'frame'], ['grainToggle', 'grain'], ['vignetteToggle', 'vignette'], ['halftoneToggle', 'halftone']]) {
  document.getElementById(id).addEventListener('change', (e) => applyChange({ [key]: e.target.checked }));
}

document.getElementById('panelPhoto').addEventListener('change', async (e) => {
  const value = e.target.value;
  const panel = state.panels[state.selected];
  if (value === 'upload') {
    document.getElementById('photoFile').click();
    return;
  }
  panel.src = value || null;
  panel.file = null;
  await loadPanelImage(state.selected);
  await render();
  pushHistory();
});

document.getElementById('photoFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const panel = state.panels[state.selected];
  panel.file = URL.createObjectURL(file);
  panel.src = null;
  await loadPanelImage(state.selected);
  await render();
  pushHistory();
  statusEl.textContent = `Loaded ${file.name} into panel ${state.selected + 1}`;
});

document.getElementById('zoomRange').addEventListener('input', (e) => {
  const panel = state.panels[state.selected];
  panel.zoom = Number(e.target.value);
  renderCover(canvas, state, images);
  syncPanelControls();
});
document.getElementById('zoomRange').addEventListener('change', pushHistory);

document.getElementById('flipBtn').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  panel.flip = !panel.flip;
  render();
  pushHistory();
});

document.getElementById('centerBtn').addEventListener('click', () => {
  const panel = state.panels[state.selected];
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  render();
  pushHistory();
});

document.getElementById('export').addEventListener('click', exportCover);
document.getElementById('surprise').addEventListener('click', surpriseMe);
document.getElementById('undo').addEventListener('click', () => {
  if (historyIndex > 0) restoreHistory(historyIndex - 1);
});
document.getElementById('redo').addEventListener('click', () => {
  if (historyIndex < history.length - 1) restoreHistory(historyIndex + 1);
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), shotApi);
} else {
  buildPickers();
  syncAllControls();
  loadAllPanelImages().then(render).then(pushHistory);
}
