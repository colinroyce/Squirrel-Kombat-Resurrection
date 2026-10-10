"""Build the web game's assets from the original Squirrel Kombat (1999) archive.

usage:
  python3 -I tools/extract/extract.py --sit Squirrel_Kombat.sit --deark path/to/deark [--out assets]
  python3 -I tools/extract/extract.py --rsrc "Squirrel Kombat.rsrc" [--extras-dir dir] [--out assets]

With --sit, the archive is unpacked with a deark build that includes the StuffIt Arsenic
decompressor (see tools/extract/deark/README.md). Everything else is decoded here:

  assets/cicn/sheet-N.png  all 'cicn' icons packed into atlases (RGBA, alpha = icon mask)
  assets/pict/<id>.png     every bitmap 'PICT', matched to the Mac 8-bit system palette
  assets/snd/<id>.wav      every 'snd ' as PCM WAV at its original sample rate
  assets/text.json         STR# lists and the Extras' TEXT documents
  assets/manifest.json     index of all of the above plus the system palette
"""
import argparse
import glob
import json
import os
import struct
import subprocess
import sys
import tempfile
import wave
import zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cicn  # noqa: E402
import macres  # noqa: E402
import pict  # noqa: E402
import qdpal  # noqa: E402
import snd  # noqa: E402

SHEET = 1024


def write_png(path, w, h, data, channels):
    """Minimal PNG writer (no third-party dependencies)."""
    color_type = 6 if channels == 4 else 2
    raw = b''.join(b'\x00' + data[y * w * channels:(y + 1) * w * channels] for y in range(h))

    def chunk(tag, body):
        return struct.pack('>I', len(body)) + tag + body + struct.pack('>I', zlib.crc32(tag + body) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, color_type, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as fh:
        fh.write(png)


def unpack_sit(sit, deark, workdir):
    subprocess.run([deark, '-od', workdir, '-maxfiles', '20000', '-opt', 'macrsrc=raw', sit], check=True,
                   stdout=subprocess.DEVNULL)
    files = sorted(os.listdir(workdir))
    app = [f for f in files if f.endswith('Squirrel Kombat_Squirrel Kombat.rsrc')]
    if not app:
        raise SystemExit('game resource fork not found in %s' % workdir)
    extras = [os.path.join(workdir, f) for f in files if '_Extras_' in f and f.endswith('.rsrc')]
    return os.path.join(workdir, app[0]), extras


def pack_icons(icons, outdir):
    """Shelf-pack icons (sorted by id) into SHEET x SHEET RGBA atlases."""
    os.makedirs(outdir, exist_ok=True)
    placements, sheets = {}, []
    cur, x, y, row_h = None, 0, 0, 0

    def new_sheet():
        sheets.append(bytearray(SHEET * SHEET * 4))
        return len(sheets) - 1

    cur = new_sheet()
    for rid in sorted(icons):
        w, h, depth, rgba = icons[rid]
        if x + w > SHEET:
            x, y, row_h = 0, y + row_h, 0
        if y + h > SHEET:
            cur, x, y, row_h = new_sheet(), 0, 0, 0
        buf = sheets[cur]
        for yy in range(h):
            o = ((y + yy) * SHEET + x) * 4
            buf[o:o + w * 4] = rgba[yy * w * 4:(yy + 1) * w * 4]
        placements[rid] = [cur, x, y, w, h, depth]
        x += w
        row_h = max(row_h, h)
    files = []
    for i, buf in enumerate(sheets):
        name = 'sheet-%d.png' % i
        write_png(os.path.join(outdir, name), SHEET, SHEET, bytes(buf), 4)
        files.append('cicn/' + name)
    return files, placements


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sit')
    ap.add_argument('--deark')
    ap.add_argument('--rsrc')
    ap.add_argument('--extras', nargs='*', default=[])
    ap.add_argument('--out', default='assets')
    a = ap.parse_args()

    if a.sit:
        work = tempfile.mkdtemp(prefix='sk-sit-')
        rsrc_path, extras = unpack_sit(a.sit, a.deark, work)
    else:
        rsrc_path, extras = a.rsrc, a.extras
    res = macres.read_resource_fork(open(rsrc_path, 'rb').read())
    out = a.out
    os.makedirs(out, exist_ok=True)
    manifest = {'source': 'Squirrel Kombat (1999, Monkey Farm Software)', 'palette': qdpal.CLUT}

    # icons
    icons = {}
    for rid, (_name, blob) in res['cicn'].items():
        icons[rid] = cicn.decode(blob)
    sheets, placements = pack_icons(icons, os.path.join(out, 'cicn'))
    manifest['cicnSheets'] = sheets
    manifest['cicn'] = {str(k): v for k, v in sorted(placements.items())}  # [sheet, x, y, w, h, depth]

    # pictures
    os.makedirs(os.path.join(out, 'pict'), exist_ok=True)
    manifest['pict'], skipped = {}, []
    for rid, (_name, blob) in sorted(res['PICT'].items()):
        try:
            w, h, rgb = pict.decode(blob)
        except ValueError as e:
            skipped.append('%d (%s)' % (rid, e))
            continue
        write_png(os.path.join(out, 'pict', '%d.png' % rid), w, h, rgb, 3)
        manifest['pict'][str(rid)] = {'file': 'pict/%d.png' % rid, 'w': w, 'h': h}

    # sounds
    os.makedirs(os.path.join(out, 'snd'), exist_ok=True)
    manifest['snd'] = {}
    for rid, (name, blob) in sorted(res['snd '].items()):
        s = snd.decode(blob)
        path = os.path.join(out, 'snd', '%d.wav' % rid)
        with wave.open(path, 'wb') as wf:
            wf.setnchannels(s['channels'])
            wf.setsampwidth(s['bits'] // 8)
            wf.setframerate(int(round(s['rate'])))
            wf.writeframes(s['data'])
        frames = len(s['data']) // (s['channels'] * s['bits'] // 8)
        manifest['snd'][str(rid)] = {'file': 'snd/%d.wav' % rid, 'name': name, 'rate': s['rate'],
                                     'channels': s['channels'], 'bits': s['bits'],
                                     'seconds': round(frames / s['rate'], 3)}

    # text
    text = {'STR#': {str(k): macres.str_list(v[1]) for k, v in sorted(res.get('STR#', {}).items())}}
    for path in extras:
        r = macres.read_resource_fork(open(path, 'rb').read())
        for rid, (_n, blob) in r.get('TEXT', {}).items():
            key = os.path.basename(path).split('_Extras_')[-1].replace('.rsrc', '')
            text.setdefault('extras', {})[key] = blob.decode('mac_roman').replace('\r', '\n')
    with open(os.path.join(out, 'text.json'), 'w') as fh:
        json.dump(text, fh, indent=1, ensure_ascii=False)
    manifest['text'] = 'text.json'
    manifest['skippedPict'] = skipped

    with open(os.path.join(out, 'manifest.json'), 'w') as fh:
        json.dump(manifest, fh, separators=(',', ':'))
    print('cicn %d in %d sheets, pict %d (skipped %s), snd %d' % (
        len(placements), len(sheets), len(manifest['pict']), ', '.join(skipped) or 'none', len(manifest['snd'])))


if __name__ == '__main__':
    main()
