// Fixed scenes for screenshots: ?shot=cover shows the cover alone at its export
// size, ?shot=editor shows the page with photos loaded. `photo` names one sample
// per panel (comma separated), `caption` the title, `subtitle` the subtitle,
// `layout`, `size` and `grade` pick the cover. window.__shotReady is set once
// the fonts are in and the scene has painted twice.
export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photos = (query.get('photo') ?? 'pier').split(',').map((s) => s.trim()).filter(Boolean);
  await setup({
    shot,
    layout: query.get('layout') ?? 'vice-grid',
    size: query.get('size') ?? 'square',
    grade: query.get('grade') ?? 'vice-sunset',
    title: query.get('caption') ?? 'Vice Nights',
    subtitle: query.get('subtitle') ?? 'Neon Shore · Launch Week',
    photos,
  });
  if (document.fonts) {
    try { await document.fonts.load('40px Anton'); await document.fonts.ready; } catch { /* fall back to system sans */ }
  }
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; resolve(); }));
  });
}
