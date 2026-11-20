// The cover engine: draws a GTA-style multi-panel poster cover onto a 2D canvas
// from a state object and a list of loaded panel images. No network, no library:
// every effect is plain canvas work, so the app runs offline from its own files.

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const LAYOUTS = {
  hero: 'Hero + Three',
  grid4: 'Four Panel',
  bleed: 'Full Bleed',
  tilt: 'Tilted Snapshots',
  nine: 'Nine Grid',
  duo: 'Split Duo',
};

export const GRADES = {
  sunset: 'Vice Sunset',
  neon: 'Neon Nights',
  gold: 'Golden Hour',
  noir: 'Mono Noir',
  ocean: 'Ocean Drive',
};

/** Panel slot count each layout draws (panel indices 0..n-1, in order). */
export function layoutPanelCount(layout) {
  if (layout === 'bleed') return 1;
  if (layout === 'tilt') return 3;
  if (layout === 'duo') return 2;
  if (layout === 'nine') return 9;
  return 4;
}

/**
 * Rects for a layout in cover space (fractions of w and h), plus a rotation
 * in radians for the tilted layout. Gutters are white poster gaps.
 */
export function layoutRects(layout, w, h) {
  const g = Math.round(Math.min(w, h) * 0.014);
  const rect = (x, y, rw, rh, rot = 0) => ({ x, y, w: rw, h: rh, rot });
  if (layout === 'hero') {
    const split = Math.round(w * 0.62);
    return [
      rect(0, 0, split - g, h),
      rect(split, 0, w - split, Math.round(h / 3) - g),
      rect(split, Math.round(h / 3), w - split, Math.round(h / 3) - g),
      rect(split, Math.round((2 * h) / 3), w - split, h - Math.round((2 * h) / 3)),
    ];
  }
  if (layout === 'grid4') {
    const hw = Math.round(w / 2);
    const hh = Math.round(h / 2);
    return [
      rect(0, 0, hw - g, hh - g),
      rect(hw, 0, w - hw, hh - g),
      rect(0, hh, hw - g, h - hh),
      rect(hw, hh, w - hw, h - hh),
    ];
  }
  if (layout === 'bleed') return [rect(0, 0, w, h)];
  if (layout === 'tilt') {
    const pw = Math.round(w * 0.56);
    const ph = Math.round(h * 0.58);
    return [
      rect(Math.round(w * 0.04), Math.round(h * 0.05), pw, ph, -0.1),
      rect(Math.round(w * 0.42), Math.round(h * 0.1), pw, ph, 0.07),
      rect(Math.round(w * 0.22), Math.round(h * 0.38), pw, ph, -0.03),
    ];
  }
  if (layout === 'nine') {
    const cw = Math.round(w / 3);
    const ch = Math.round(h / 3);
    const out = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        out.push(rect(col * cw, row * ch, cw - g, ch - g));
      }
    }
    return out;
  }
  // duo: two tall halves, title band rides across the foot.
  const hw = Math.round(w / 2);
  return [rect(0, 0, hw - g, h), rect(hw, 0, w - hw, h)];
}

/** Grade palettes: washes and title colours per grade. */
export const GRADE_STYLE = {
  sunset: {
    wash: ['rgba(255,140,60,0.50)', 'rgba(255,40,120,0.55)'],
    washMode: 'soft-light',
    tint: 'rgba(255,170,80,0.10)',
    title: '#ffffff',
    accent: '#ffb347',
    bg: '#2b1038',
  },
  neon: {
    wash: ['rgba(0,229,255,0.50)', 'rgba(255,0,128,0.55)'],
    washMode: 'soft-light',
    tint: 'rgba(255,0,160,0.08)',
    title: '#ffffff',
    accent: '#00e5ff',
    bg: '#0b1026',
  },
  gold: {
    wash: ['rgba(255,205,90,0.50)', 'rgba(190,95,0,0.50)'],
    washMode: 'soft-light',
    tint: 'rgba(255,190,80,0.12)',
    title: '#fff7e0',
    accent: '#ffd166',
    bg: '#33220a',
  },
  noir: {
    wash: ['rgba(0,0,0,0.35)', 'rgba(255,255,255,0.30)'],
    washMode: 'overlay',
    tint: 'rgba(255,255,255,0.05)',
    title: '#ffffff',
    accent: '#e8e8e8',
    bg: '#111111',
  },
  ocean: {
    wash: ['rgba(0,190,255,0.50)', 'rgba(0,60,150,0.55)'],
    washMode: 'soft-light',
    tint: 'rgba(0,170,255,0.10)',
    title: '#ffffff',
    accent: '#7fe7ff',
    bg: '#061e33',
  },
};

/** Draws one photo cover-fit into a rect, with zoom, offset and flip. */
export function drawPanelPhoto(ctx, img, r, panel) {
  if (!img) return;
  const zoom = panel.zoom || 1;
  const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const dx = r.x + (r.w - pw) / 2 + (panel.ox || 0) * r.w;
  const dy = r.y + (r.h - ph) / 2 + (panel.oy || 0) * r.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  if (panel.flip) {
    ctx.translate(r.x + r.w / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-(r.x + r.w / 2), 0);
  }
  ctx.drawImage(img, dx, dy, pw, ph);
  ctx.restore();
}

/** Applies a grade's colour wash over one panel rect. */
export function gradePanel(ctx, r, grade) {
  const style = GRADE_STYLE[grade] || GRADE_STYLE.sunset;
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  if (grade === 'noir') {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = '#808080';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.globalCompositeOperation = 'source-over';
  }
  const wash = ctx.createLinearGradient(r.x, r.y, r.x + r.w * 0.25, r.y + r.h);
  wash.addColorStop(0, style.wash[0]);
  wash.addColorStop(1, style.wash[1]);
  ctx.globalCompositeOperation = style.washMode;
  ctx.fillStyle = wash;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = style.tint;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

let noiseCanvas = null;
/** A small tiled noise pattern for the film-grain effect. */
export function grainPattern(ctx) {
  if (noiseCanvas) return ctx.createPattern(noiseCanvas, 'repeat');
  noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 140;
  noiseCanvas.height = 140;
  const nctx = noiseCanvas.getContext('2d');
  const data = nctx.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  return ctx.createPattern(noiseCanvas, 'repeat');
}

/** Fits a one-line title into a width, returning the font size to use. */
export function fitTitleSize(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `${size}px ${family}`;
  while (size > 14 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${size}px ${family}`;
  }
  return size;
}

/** Draws the title block: Anton title, Pacifico subtitle, badge pill. */
export function drawTitleBlock(ctx, w, h, state) {
  const style = GRADE_STYLE[state.grade] || GRADE_STYLE.sunset;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const bandH = Math.round(h * (state.titlePos === 'top' ? 0.3 : 0.34));
  const bandY = state.titlePos === 'top' ? 0 : h - bandH;
  const cx = w / 2;

  // A dark band behind the lettering so it reads over any photo.
  const band = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
  if (state.titlePos === 'top') {
    band.addColorStop(0, 'rgba(10,6,20,0.72)');
    band.addColorStop(1, 'rgba(10,6,20,0)');
  } else {
    band.addColorStop(0, 'rgba(10,6,20,0)');
    band.addColorStop(1, 'rgba(10,6,20,0.78)');
  }
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);

  if (state.halftone) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = style.accent;
    const step = Math.max(10, Math.round(w / 90));
    for (let y = bandY + step / 2; y < bandY + bandH; y += step) {
      for (let x = step / 2; x < w; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1.5, step * 0.16), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (title) {
    const maxW = w * 0.92;
    const size = fitTitleSize(ctx, title, maxW, Math.round(h * 0.115), 'Anton, sans-serif');
    const ty = state.titlePos === 'top'
      ? bandY + bandH * 0.42
      : bandY + bandH * 0.52;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.16;
    ctx.shadowOffsetY = size * 0.03;
    ctx.lineWidth = Math.max(2, size * 0.055);
    ctx.strokeStyle = 'rgba(20,8,30,0.85)';
    ctx.strokeText(title, cx, ty);
    const grad = ctx.createLinearGradient(cx - maxW / 2, ty, cx + maxW / 2, ty);
    grad.addColorStop(0, style.accent);
    grad.addColorStop(0.5, style.title);
    grad.addColorStop(1, style.accent);
    ctx.fillStyle = grad;
    ctx.fillText(title, cx, ty);
    ctx.restore();
  }
  if (subtitle) {
    const sy = state.titlePos === 'top'
      ? bandY + bandH * 0.82
      : bandY + bandH * 0.86;
    const ssize = Math.round(h * 0.038);
    ctx.font = `${ssize}px Pacifico, cursive`;
    ctx.fillStyle = style.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = ssize * 0.25;
    ctx.fillText(subtitle, cx, sy);
    ctx.shadowBlur = 0;
  }
}

/** Draws the small star badge pill in the top corner. */
export function drawBadge(ctx, w, h, state) {
  const style = GRADE_STYLE[state.grade] || GRADE_STYLE.sunset;
  const label = '★ VICE NIGHTS';
  const fs = Math.max(13, Math.round(h * 0.021));
  ctx.font = `bold ${fs}px system-ui, sans-serif`;
  const tw = ctx.measureText(label).width;
  const pad = Math.round(fs * 0.9);
  const bw = tw + pad * 2;
  const bh = fs * 2.1;
  const bx = Math.round(w * 0.035);
  const by = Math.round(h * 0.035);
  ctx.save();
  ctx.fillStyle = 'rgba(12,8,22,0.78)';
  ctx.strokeStyle = style.accent;
  ctx.lineWidth = Math.max(1.5, fs * 0.08);
  roundRect(ctx, bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = style.accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Renders a full cover. `state` carries size, layout, grade, title, subtitle,
 * titlePos, frame, grain, vignette, halftone and panels (each {img, zoom, ox,
 * oy, flip}). `images` maps panel index to a loaded HTMLImageElement or null.
 */
export function renderCover(canvas, state, images) {
  const [w, h] = SIZES[state.size] || SIZES['1080x1080'];
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  const style = GRADE_STYLE[state.grade] || GRADE_STYLE.sunset;

  ctx.fillStyle = state.layout === 'tilt' ? style.bg : '#f5f0ea';
  ctx.fillRect(0, 0, w, h);

  const rects = layoutRects(state.layout, w, h);
  const count = layoutPanelCount(state.layout);
  for (let i = 0; i < count; i++) {
    const r = rects[i];
    const panel = state.panels[i] || {};
    ctx.save();
    if (r.rot) {
      ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
      ctx.rotate(r.rot);
      ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    }
    if (state.layout === 'tilt') {
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.round(w * 0.02);
      ctx.shadowOffsetY = Math.round(w * 0.008);
      ctx.fillStyle = '#ffffff';
      const pad = Math.round(w * 0.012);
      ctx.fillRect(r.x - pad, r.y - pad, r.w + pad * 2, r.h + pad * 2);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
    drawPanelPhoto(ctx, images[i] || null, r, panel);
    if (!images[i]) {
      ctx.fillStyle = '#241a33';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `bold ${Math.max(14, Math.round(h * 0.02))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', r.x + r.w / 2, r.y + r.h / 2);
    } else {
      gradePanel(ctx, r, state.grade);
    }
    ctx.restore();
  }

  drawTitleBlock(ctx, w, h, state);
  drawBadge(ctx, w, h, state);

  if (state.vignette) {
    const vg = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.frame) {
    const bw = Math.max(4, Math.round(Math.min(w, h) * 0.012));
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = bw;
    ctx.strokeRect(bw / 2, bw / 2, w - bw, h - bw);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = Math.max(1, bw / 4);
    ctx.strokeRect(bw * 1.8, bw * 1.8, w - bw * 3.6, h - bw * 3.6);
  }
  return canvas;
}
