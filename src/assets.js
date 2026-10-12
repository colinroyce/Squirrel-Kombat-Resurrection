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
// ... and as extra pictures (PICT).
const ADDED_PICT = { 30001: 'added/cheats-button.png' };

// Brightened copies of icons, as [new id, source id]: every red raised by 0x44, with outlines
// and see-through white unchanged. The title's RESURREKTION line uses them so it reads as new.
const BRIGHT_CICN = [1120, 1122, 1123, 1124, 1125, 1126, 1129, 1130, 1134, 30000].map((id) => [id + 40000, id]);

function brightenCicn(m) {
  for (const [id, from] of BRIGHT_CICN) {
    const [s, x, y, w, h, depth] = m.cicn[from];
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(assets.sheets[s], x, y, w, h, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > 0 && d[i + 1] === 0 && d[i + 2] === 0) d[i] = Math.min(255, d[i] + 0x44);
    }
    ctx.putImageData(img, 0, 0);
    assets.sheets.push(c);
    m.cicn[id] = [assets.sheets.length - 1, 0, 0, w, h, depth];
  }
}

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
  for (const [id, f] of Object.entries(ADDED_PICT)) {
    jobs.push(loadImage(base + f).then((img) => { assets.pict.set(Number(id), img); }));
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
  brightenCicn(m);
  return assets;
}

// Placement of a cicn in the atlases: [sheet, x, y, w, h] or undefined if no such icon.
export function cicnInfo(id) {
  return assets.manifest.cicn[String(id)];
}
