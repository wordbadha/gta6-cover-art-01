// Vice Nights cover engine: draws a multi-panel GTA-style poster onto a canvas.
// One state object drives every layout, grade and effect, so the preview the user
// sees is exactly the PNG the export writes.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

export const GRADES = {
  'vice-sunset': {
    label: 'Vice Sunset',
    skyTop: '#ff9e57', skyBottom: '#e83e8c',
    tintTop: 'rgba(255, 140, 60, 0.16)', tintBottom: 'rgba(232, 62, 140, 0.30)',
    accent: '#ffd166', sunCore: '#ffe9a3', sunEdge: '#ff6a3d',
  },
  'neon-nights': {
    label: 'Neon Nights',
    skyTop: '#ff2e88', skyBottom: '#12c2b3',
    tintTop: 'rgba(255, 46, 136, 0.22)', tintBottom: 'rgba(18, 194, 179, 0.26)',
    accent: '#7df0d4', sunCore: '#ffb3d9', sunEdge: '#ff2e88',
  },
  'palm-gold': {
    label: 'Palm Gold',
    skyTop: '#ffc46b', skyBottom: '#c96a1e',
    tintTop: 'rgba(255, 196, 107, 0.20)', tintBottom: 'rgba(150, 70, 10, 0.28)',
    accent: '#fff3c4', sunCore: '#fff8d6', sunEdge: '#f5a623',
  },
  'mono-vice': {
    label: 'Mono Vice',
    skyTop: '#8b7cf6', skyBottom: '#2b0a3d',
    tintTop: 'rgba(139, 124, 246, 0.20)', tintBottom: 'rgba(43, 10, 61, 0.34)',
    accent: '#b7a8ff', sunCore: '#e6e0ff', sunEdge: '#8b7cf6',
  },
};

// Every layout returns panels in pixels plus the title band and the sun anchor.
// `band` is the title area; `over` means the band sits on top of the panels.
export const LAYOUTS = {
  'vice-grid': {
    label: 'Vice Grid',
    panels(w, h) {
      const g = Math.max(8, Math.round(w * 0.016));
      const band = Math.round(h * 0.20);
      const top = h - band;
      const pw = (w - g * 3) / 2;
      const ph = (top - g * 3) / 2;
      return {
        panels: [
          { x: g, y: g, w: pw, h: ph },
          { x: g * 2 + pw, y: g, w: pw, h: ph },
          { x: g, y: g * 2 + ph, w: pw, h: ph },
          { x: g * 2 + pw, y: g * 2 + ph, w: pw, h: ph },
        ],
        band: { x: 0, y: top, w, h: band, over: false },
        sun: { x: w * 0.82, y: top + band * 0.38, r: Math.min(w, h) * 0.13 },
      };
    },
  },
  'sunset-split': {
    label: 'Sunset Split',
    panels(w, h) {
      const g = Math.max(8, Math.round(w * 0.016));
      const band = Math.round(h * 0.22);
      const pw = (w - g * 3) / 2;
      return {
        panels: [
          { x: g, y: g, w: pw, h: h - g * 2 },
          { x: g * 2 + pw, y: g, w: pw, h: h - g * 2 },
        ],
        band: { x: 0, y: h - band, w, h: band, over: true },
        sun: { x: w * 0.5, y: h * 0.16, r: Math.min(w, h) * 0.13 },
      };
    },
  },
  'neon-quartet': {
    label: 'Neon Quartet',
    panels(w, h) {
      const g = Math.max(8, Math.round(w * 0.014));
      const band = Math.round(h * 0.20);
      const top = h - band;
      const pw = (w - g * 5) / 4;
      const list = [];
      for (let i = 0; i < 4; i++) list.push({ x: g + i * (pw + g), y: g, w: pw, h: top - g * 2 });
      return {
        panels: list,
        band: { x: 0, y: top, w, h: band, over: false },
        sun: { x: w * 0.12, y: top + band * 0.4, r: Math.min(w, h) * 0.12 },
      };
    },
  },
  triptych: {
    label: 'Triptych',
    panels(w, h) {
      const g = Math.max(8, Math.round(w * 0.016));
      const band = Math.round(h * 0.20);
      const top = h - band;
      const heroW = Math.round((w - g * 3) * 0.58);
      const sideX = g * 2 + heroW;
      const sideW = w - sideX - g;
      const halfH = (top - g * 3) / 2;
      return {
        panels: [
          { x: g, y: g, w: heroW, h: top - g * 2 },
          { x: sideX, y: g, w: sideW, h: halfH },
          { x: sideX, y: g * 2 + halfH, w: sideW, h: halfH },
        ],
        band: { x: 0, y: top, w, h: band, over: false },
        sun: { x: w * 0.86, y: top + band * 0.38, r: Math.min(w, h) * 0.13 },
      };
    },
  },
  'poster-solo': {
    label: 'Poster Solo',
    panels(w, h) {
      const band = Math.round(h * 0.24);
      return {
        panels: [{ x: 0, y: 0, w, h }],
        band: { x: 0, y: h - band, w, h: band, over: true },
        sun: { x: w * 0.78, y: h * 0.20, r: Math.min(w, h) * 0.17 },
      };
    },
  },
};

export function layoutPanelCount(layout) {
  return LAYOUTS[layout].panels(100, 100).panels.length;
}

/** A small deterministic hash, so grain and placeholders are stable per cover. */
export function hashSeed(text) {
  let s = 2166136261;
  for (let i = 0; i < text.length; i++) {
    s ^= text.charCodeAt(i);
    s = Math.imul(s, 16777619);
  }
  return s >>> 0;
}

/** Mulberry32: tiny seeded PRNG, used only for film grain. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fitTitle(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  while (size > 16 && ctx.measureText(text).width > maxWidth) {
    size = Math.floor(size * 0.94);
    ctx.font = `${size}px Anton, 'Arial Narrow', sans-serif`;
  }
  return size;
}

function drawPhotoInPanel(ctx, img, rect, zoom, ox, oy) {
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const dw = img.naturalWidth * base * zoom;
  const dh = img.naturalHeight * base * zoom;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawEmptyPanel(ctx, rect, grade, index) {
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, grade.skyTop);
  g.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  for (let x = -rect.h; x < rect.w; x += 26) {
    ctx.beginPath();
    ctx.moveTo(rect.x + x, rect.y + rect.h);
    ctx.lineTo(rect.x + x + rect.h, rect.y);
    ctx.lineTo(rect.x + x + rect.h + 12, rect.y);
    ctx.lineTo(rect.x + x + 12, rect.y + rect.h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = Math.max(18, Math.min(44, rect.w * 0.14));
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.fillText(`ADD PHOTO ${index + 1}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function drawSunDisc(ctx, sun, grade, size01) {
  const r = Math.max(4, sun.r * (0.4 + size01 * 0.9));
  const glow = ctx.createRadialGradient(sun.x, sun.y, r * 0.2, sun.x, sun.y, r * 2.1);
  glow.addColorStop(0, grade.sunEdge + '55');
  glow.addColorStop(1, grade.sunEdge + '00');
  ctx.fillStyle = glow;
  ctx.fillRect(sun.x - r * 2.1, sun.y - r * 2.1, r * 4.2, r * 4.2);
  const disc = ctx.createRadialGradient(sun.x, sun.y - r * 0.25, r * 0.1, sun.x, sun.y, r);
  disc.addColorStop(0, grade.sunCore);
  disc.addColorStop(0.65, grade.sunEdge);
  disc.addColorStop(1, grade.sunEdge);
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, r, 0, Math.PI * 2);
  ctx.fill();
  // A pale inner ring keeps the disc reading as a sun, not a flat spot.
  ctx.strokeStyle = grade.sunCore;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawTitleBlock(ctx, band, title, subtitle, grade, w) {
  const pad = Math.max(16, w * 0.03);
  const cx = band.x + pad;
  const textW = band.w - pad * 2;
  const main = (title || 'VICE NIGHTS').trim().toUpperCase();
  const sub = (subtitle || '').trim();
  const titleSize = fitTitle(ctx, main, textW, Math.round(band.h * 0.52));
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const titleY = band.y + band.h * 0.52 + titleSize * 0.12;
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = Math.max(4, titleSize * 0.12);
  ctx.shadowOffsetY = Math.max(2, titleSize * 0.05);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(main, cx, titleY);
  ctx.restore();
  // Accent underline bar under the title.
  const barW = Math.min(textW, ctx.measureText(main).width);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(cx, titleY + Math.max(6, band.h * 0.05), Math.max(24, barW * 0.5), Math.max(3, band.h * 0.035));
  if (sub) {
    const subSize = Math.max(13, Math.round(band.h * 0.17));
    ctx.font = `${subSize}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(2, subSize * 0.18)}px`; } catch { /* older canvas */ }
    ctx.fillStyle = grade.accent;
    ctx.fillText(sub.toUpperCase(), cx, band.y + band.h * 0.92);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

function drawGrain(ctx, w, h, amount01, seed) {
  if (amount01 <= 0) return;
  const rand = mulberry32(seed);
  const count = Math.min(6500, Math.round((w * h / 900) * amount01));
  ctx.save();
  for (let i = 0; i < count; i++) {
    const light = rand() > 0.5;
    ctx.fillStyle = light ? `rgba(255,255,255,${0.05 + rand() * 0.09})` : `rgba(0,0,0,${0.05 + rand() * 0.10})`;
    const s = rand() > 0.85 ? 2 : 1;
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
  ctx.restore();
}

function drawVignette(ctx, w, h, amount01) {
  if (amount01 <= 0) return;
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${0.55 * amount01})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Draws the whole cover for `state` onto `canvas` (sized to the chosen export size). */
export function drawCover(canvas, state) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] ?? GRADES['vice-sunset'];
  const geo = LAYOUTS[state.layout].panels(w, h);
  const photos = state.photos ?? [];
  const panels = state.panels ?? [];

  // Backdrop sky.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.skyTop);
  sky.addColorStop(1, grade.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Sun behind the panels where the band is separate; over them where it overlays.
  if (state.sunOn && !geo.band.over) drawSunDisc(ctx, geo.sun, grade, state.sunSize / 100);

  // Panels: photo (or placeholder), grade wash, white frame.
  geo.panels.forEach((rect, i) => {
    const slot = panels[i] ?? { photo: -1, zoom: 1, ox: 0, oy: 0 };
    const img = slot.photo >= 0 ? photos[slot.photo] : null;
    if (img) {
      drawPhotoInPanel(ctx, img, rect, slot.zoom || 1, slot.ox || 0, slot.oy || 0);
    } else {
      drawEmptyPanel(ctx, rect, grade, i);
    }
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    wash.addColorStop(0, grade.tintTop);
    wash.addColorStop(1, grade.tintBottom);
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    const frame = Math.max(3, Math.round(w * 0.004));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = frame;
    ctx.strokeRect(rect.x + frame / 2, rect.y + frame / 2, rect.w - frame, rect.h - frame);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rect.x + frame + 1, rect.y + frame + 1, rect.w - frame * 2 - 2, rect.h - frame * 2 - 2);
    if (state.selected === i) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = Math.max(3, frame);
      ctx.setLineDash([14, 8]);
      ctx.strokeRect(rect.x + frame, rect.y + frame, rect.w - frame * 2, rect.h - frame * 2);
      ctx.setLineDash([]);
    }
  });

  // Sun over the panels for overlay layouts.
  if (state.sunOn && geo.band.over) drawSunDisc(ctx, geo.sun, grade, state.sunSize / 100);

  // Scrim under the title where the band overlays the photo.
  if (geo.band.over) {
    const scrim = ctx.createLinearGradient(0, geo.band.y - geo.band.h * 0.5, 0, h);
    scrim.addColorStop(0, 'rgba(10, 4, 18, 0)');
    scrim.addColorStop(1, 'rgba(10, 4, 18, 0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(geo.band.x, geo.band.y - geo.band.h * 0.5, geo.band.w, geo.band.h * 1.5);
  }

  drawVignette(ctx, w, h, state.vignette / 100);
  drawGrain(ctx, w, h, state.grain / 100, hashSeed(`${state.title}|${state.layout}|${state.grade}`));
  drawTitleBlock(ctx, geo.band, state.title, state.subtitle, grade, w);

  // Thin dark edge so the cover reads as a poster even on white pages.
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
}

/** Returns the index of the panel at canvas point (x, y), or -1. */
export function panelAt(state, x, y) {
  const canvas = { w: state._w, h: state._h };
  if (!canvas.w) return -1;
  const geo = LAYOUTS[state.layout].panels(canvas.w, canvas.h);
  for (let i = 0; i < geo.panels.length; i++) {
    const r = geo.panels[i];
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}
