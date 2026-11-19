// Wires the Vice Nights editor: photos, caption, layout, size, grade, light and
// texture, panel crop and position, and the PNG export. A `?shot=` query sets up
// a fixed scene for a screenshot instead (see shots.js).
import { drawCover, SIZES, GRADES, LAYOUTS, layoutPanelCount, panelAt } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const statusEl = document.getElementById('status');
const panelLabel = document.getElementById('panelLabel');
const slotsEl = document.getElementById('photoSlots');

const state = {
  title: 'Vice Nights',
  subtitle: 'Neon Shore · Launch Week',
  layout: 'vice-grid',
  size: 'square',
  grade: 'vice-sunset',
  sunOn: true,
  sunSize: 70,
  vignette: 45,
  grain: 30,
  photos: [],
  panels: [],
  selected: 0,
  _w: 1080,
  _h: 1080,
};

function freshPanels(layout, keep) {
  const count = layoutPanelCount(layout);
  const next = [];
  for (let i = 0; i < count; i++) {
    const old = keep && keep[i];
    next.push({
      photo: old ? old.photo : -1,
      zoom: old ? old.zoom : 1,
      ox: old ? old.ox : 0,
      oy: old ? old.oy : 0,
    });
  }
  return next;
}

state.panels = freshPanels(state.layout, null);

function applySize() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  state._w = size.w;
  state._h = size.h;
}

function redraw() {
  applySize();
  drawCover(canvas, state);
  renderSlots();
  syncPanelControls();
}

function renderSlots() {
  slotsEl.innerHTML = '';
  state.photos.forEach((img, i) => {
    const used = [];
    state.panels.forEach((p, pi) => { if (p.photo === i) used.push(pi + 1); });
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'slot' + (used.length ? ' in-panel' : '');
    btn.title = used.length ? `In panel ${used.join(', ')} — click to put in the selected panel` : 'Click to put in the selected panel';
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = img.dataset.name || `Photo ${i + 1}`;
    const tag = document.createElement('span');
    tag.className = 'slot-tag';
    tag.textContent = used.length ? `P${used.join(',')}` : `Photo ${i + 1}`;
    btn.append(thumb, tag);
    btn.addEventListener('click', () => {
      state.panels[state.selected].photo = i;
      redraw();
    });
    slotsEl.append(btn);
  });
}

function syncPanelControls() {
  if (state.selected < 0 || !state.panels[state.selected]) {
    panelLabel.textContent = 'No panel selected — click a panel on the cover';
    document.getElementById('zoom').value = 100;
    document.getElementById('zoomVal').textContent = 100;
    document.getElementById('offsetX').value = 0;
    document.getElementById('offsetY').value = 0;
    return;
  }
  const count = state.panels.length;
  panelLabel.textContent = `Panel ${state.selected + 1} of ${count}`;
  const slot = state.panels[state.selected];
  document.getElementById('zoom').value = Math.round((slot.zoom || 1) * 100);
  document.getElementById('zoomVal').textContent = Math.round((slot.zoom || 1) * 100);
  document.getElementById('offsetX').value = Math.round((slot.ox || 0) * 100);
  document.getElementById('offsetY').value = Math.round((slot.oy || 0) * 100);
}

function setLayout(name) {
  if (!LAYOUTS[name]) return;
  state.layout = name;
  state.panels = freshPanels(name, state.panels);
  state.selected = 0;
  document.querySelectorAll('#layoutRow button').forEach((b) => {
    b.classList.toggle('on', b.dataset.layout === name);
  });
  redraw();
}

function setSize(name) {
  if (!SIZES[name]) return;
  state.size = name;
  document.querySelectorAll('#sizeRow button').forEach((b) => {
    b.classList.toggle('on', b.dataset.size === name);
  });
  redraw();
}

function setGrade(name) {
  if (!GRADES[name]) return;
  state.grade = name;
  document.querySelectorAll('#gradeRow button').forEach((b) => {
    b.classList.toggle('on', b.dataset.grade === name);
  });
  redraw();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { img.dataset.name = name || url; resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhoto(img) {
  state.photos.push(img);
  // First photo fills every empty panel; later photos wait to be placed.
  if (state.photos.length === 1) {
    state.panels.forEach((p) => { p.photo = 0; });
  }
  redraw();
}

document.getElementById('photoFiles').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  for (const file of files) {
    try {
      const img = await loadImage(URL.createObjectURL(file), file.name);
      await addPhoto(img);
      statusEl.textContent = `Loaded ${state.photos.length} photo${state.photos.length === 1 ? '' : 's'}.`;
    } catch {
      statusEl.textContent = `Could not read ${file.name}.`;
    }
  }
  e.target.value = '';
});

document.getElementById('samplePier').addEventListener('click', async () => {
  try {
    await addPhoto(await loadImage('samples/pier.jpg', 'Pier sample'));
    statusEl.textContent = 'Pier sample loaded — click a panel, then a photo, to place it.';
  } catch { statusEl.textContent = 'Sample photo failed to load.'; }
});

document.getElementById('sampleBoulevard').addEventListener('click', async () => {
  try {
    await addPhoto(await loadImage('samples/boulevard.jpg', 'Boulevard sample'));
    statusEl.textContent = 'Boulevard sample loaded — click a panel, then a photo, to place it.';
  } catch { statusEl.textContent = 'Sample photo failed to load.'; }
});

document.getElementById('fillAll').addEventListener('click', () => {
  if (!state.photos.length) { statusEl.textContent = 'Add a photo first.'; return; }
  state.panels.forEach((p) => { p.photo = 0; });
  redraw();
  statusEl.textContent = 'Every panel now shows the first photo.';
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });

document.querySelectorAll('#layoutRow button').forEach((b) => {
  b.addEventListener('click', () => setLayout(b.dataset.layout));
});
document.querySelectorAll('#sizeRow button').forEach((b) => {
  b.addEventListener('click', () => setSize(b.dataset.size));
});
document.querySelectorAll('#gradeRow button').forEach((b) => {
  b.addEventListener('click', () => setGrade(b.dataset.grade));
});

function bindRange(id, valId, fn) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    document.getElementById(valId).textContent = el.value;
    fn(Number(el.value));
    redraw();
  });
}
bindRange('sunSize', 'sunSizeVal', (v) => { state.sunSize = v; });
bindRange('vignette', 'vignetteVal', (v) => { state.vignette = v; });
bindRange('grain', 'grainVal', (v) => { state.grain = v; });
bindRange('zoom', 'zoomVal', (v) => {
  if (state.selected < 0 || !state.panels[state.selected]) return;
  state.panels[state.selected].zoom = v / 100;
});
document.getElementById('offsetX').addEventListener('input', (e) => {
  if (state.selected < 0 || !state.panels[state.selected]) return;
  state.panels[state.selected].ox = Number(e.target.value) / 100;
  redraw();
});
document.getElementById('offsetY').addEventListener('input', (e) => {
  if (state.selected < 0 || !state.panels[state.selected]) return;
  state.panels[state.selected].oy = Number(e.target.value) / 100;
  redraw();
});
document.getElementById('sunOn').addEventListener('change', (e) => {
  state.sunOn = e.target.checked;
  redraw();
});

// Surprise me: a random layout and grade, so one click restyles the whole cover.
document.getElementById('surprise').addEventListener('click', () => {
  const layouts = Object.keys(LAYOUTS);
  const grades = Object.keys(GRADES);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  setLayout(pick(layouts));
  setGrade(pick(grades));
  statusEl.textContent = `Surprise: ${LAYOUTS[state.layout].label} in ${GRADES[state.grade].label}.`;
});

// Drag to move the photo in a panel, scroll to zoom it. Click selects a panel.
let dragging = null;
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const idx = panelAt(state, p.x, p.y);
  if (idx === -1) return;
  state.selected = idx;
  dragging = { idx, x: p.x, y: p.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
  syncPanelControls();
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const geo = LAYOUTS[state.layout].panels(canvas.width, canvas.height);
  const rect = geo.panels[dragging.idx];
  const slot = state.panels[dragging.idx];
  slot.ox = Math.max(-0.4, Math.min(0.4, slot.ox + (p.x - dragging.x) / rect.w));
  slot.oy = Math.max(-0.4, Math.min(0.4, slot.oy + (p.y - dragging.y) / rect.h));
  if (Math.abs(p.x - dragging.x) + Math.abs(p.y - dragging.y) > 2) dragging.moved = true;
  dragging.x = p.x;
  dragging.y = p.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const idx = panelAt(state, p.x, p.y);
  if (idx === -1) return;
  state.selected = idx;
  const slot = state.panels[idx];
  slot.zoom = Math.max(1, Math.min(2.6, slot.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

document.getElementById('exportBtn').addEventListener('click', () => {
  const size = SIZES[state.size];
  canvas.toBlob((blob) => {
    if (!blob) { statusEl.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-nights-${state.size}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusEl.textContent = `Saved vice-nights-${state.size}-${size.w}x${size.h}.png (${Math.round(blob.size / 1024)} KB).`;
  }, 'image/png');
});

// Screenshot scenes: ?shot=cover|editor&layout=&size=&grade=&photo=&caption=&subtitle=
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async (config) => {
    if (config.layout) setLayout(config.layout);
    if (config.size) setSize(config.size);
    if (config.grade) setGrade(config.grade);
    if (config.title !== undefined) { state.title = config.title; titleInput.value = config.title; }
    if (config.subtitle !== undefined) { state.subtitle = config.subtitle; subtitleInput.value = config.subtitle; }
    const names = config.photos && config.photos.length ? config.photos : ['pier'];
    for (const name of names) {
      const img = await loadImage(`samples/${name}.jpg`, `${name} sample`);
      state.photos.push(img);
    }
    // Alternate the two samples across panels so multi-panel layouts read at once.
    state.panels.forEach((p, i) => { p.photo = i % Math.max(1, state.photos.length); });
    // A cover shot shows the exported art, never the editor's selection outline.
    if (config.shot === 'cover') state.selected = -1;
    redraw();
  });
} else {
  // Warm start: the Pier sample is already in, so the first paint is a real cover.
  loadImage('samples/pier.jpg', 'Pier sample')
    .then((img) => { state.photos.push(img); state.panels.forEach((p) => { p.photo = 0; }); redraw(); })
    .catch(() => redraw());
  if (document.fonts && document.fonts.ready) {
    document.fonts.load('40px Anton').then(() => redraw()).catch(() => {});
    document.fonts.ready.then(() => redraw()).catch(() => {});
  }
}
