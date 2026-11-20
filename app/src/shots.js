// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the app in the browser with photos loaded. The query
// picks the layout, grade, size, caption and sample photos; window.__shotReady
// is set once the scene has painted, so a headless browser can wait on it.

/**
 * Reads a scene from the query string and applies it through the editor's
 * scene API, then marks the shot ready.
 */
export async function runShot(shot, query, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photos = (query.get('photos') || 'boulevard,pier').split(',').map((s) => s.trim()).filter(Boolean);
  const patch = {};
  if (query.get('layout')) patch.layout = query.get('layout');
  if (query.get('grade')) patch.grade = query.get('grade');
  if (query.get('size')) patch.size = query.get('size');
  if (query.get('title') !== null) patch.title = query.get('title');
  if (query.get('subtitle') !== null) patch.subtitle = query.get('subtitle');
  if (query.get('titlePos')) patch.titlePos = query.get('titlePos');
  patch.frame = query.get('frame') !== '0';
  patch.grain = query.get('grain') !== '0';
  patch.vignette = query.get('vignette') !== '0';
  patch.halftone = query.get('halftone') === '1';
  await api.applyScene({ patch, photos });
  // Two frames so the canvas paint and the web fonts have landed.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
