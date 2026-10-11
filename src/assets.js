// Loads the extracted original assets (see tools/extract).

export const assets = {
  manifest: null,
  sheets: [],      // cicn atlases
  pict: new Map(), // id -> HTMLImageElement
  fonts: {},       // size -> bitmap font
  text: null,
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load ' + url));
    img.src = url;
  });
}

// Art made for the Resurrection that the original does not have (see assets/added/README.md),
// loaded as extra 32x32 icons.
const ADDED_CICN = { 30000: 'added/title-n.png' };

export async function loadAssets(base, onProgress) {
  const m = await (await fetch(base + 'manifest.json')).json();
  assets.manifest = m;
  const jobs = [];
  m.cicnSheets.forEach((f, i) => jobs.push(loadImage(base + f).then((img) => { assets.sheets[i] = img; })));
  Object.entries(ADDED_CICN).forEach(([id, f], k) => {
    const sheet = m.cicnSheets.length + k;
    m.cicn[id] = [sheet, 0, 0, 32, 32, 8];
    jobs.push(loadImage(base + f).then((img) => { assets.sheets[sheet] = img; }));
  });
  for (const [id, info] of Object.entries(m.pict)) {
    jobs.push(loadImage(base + info.file).then((img) => { assets.pict.set(Number(id), img); }));
  }
  jobs.push(fetch(base + 'text.json').then((r) => r.json()).then((t) => { assets.text = t; }));
  for (const size of [9, 10]) {
    jobs.push(fetch(base + 'fonts/geneva' + size + '.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => { if (f) assets.fonts[size] = f; })
      .catch(() => {}));
  }
  let done = 0;
  await Promise.all(jobs.map((j) => j.then(() => onProgress && onProgress(++done, jobs.length))));
  return assets;
}

// Placement of a cicn in the atlases: [sheet, x, y, w, h] or undefined if no such icon.
export function cicnInfo(id) {
  return assets.manifest.cicn[String(id)];
}
