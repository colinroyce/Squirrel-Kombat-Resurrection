"""Recover the sprite templates set up by DefSprites.

Walks the DefSprites disassembly, tracks simple register values (li, addi rN,r2,X,
mr) and records every InitSprite(template, type, nframes, delay, w, h, speed) call
plus the field stores that follow it. Then finds which functions reference each
template (addi rN, r2, off) so templates can be named after their spawners.

usage: python defsprites.py <disasm.txt>
"""
import re
import sys
from collections import defaultdict

TOC = 0x10044AB0
FIELDS = {0x00: 'image', 0x02: 'nframes', 0x04: 'frame', 0x0a: 'rect.top', 0x0c: 'rect.left',
          0x1e: 'type', 0x22: 'proc', 0x24: 'vy', 0x26: 'vx', 0x28: 'info0', 0x2a: 'info1',
          0x2c: 'info2', 0x2e: 'info3', 0x30: 'info4', 0x32: 'info5', 0x34: 'info6',
          0x36: 'info7', 0x38: 'info8', 0x3a: 'info9', 0x3c: 'num', 0x3e: 'action1',
          0x40: 'action2', 0x42: 'speed', 0x46: 'doDraw', 0x50: 'dir', 0x52: 'world',
          0x56: 'animCtr', 0x58: 'animDelay', 0x60: 'f60'}

INS = re.compile(r'^([0-9a-f]{8}): (\S+)\s*(.*?)\s*(;.*)?$')


def parse_funcs(path):
    funcs = {}
    cur = None
    for line in open(path):
        if line.startswith('==== '):
            cur = line.split()[1]
            funcs[cur] = []
            continue
        m = INS.match(line.rstrip('\n'))
        if m and cur:
            funcs[cur].append((int(m.group(1), 16), m.group(2), m.group(3), m.group(4) or ''))
    return funcs


def imm(s):
    return int(s, 0)


def main():
    funcs = parse_funcs(sys.argv[1])
    body = funcs['.sDefSprites']
    regs = {}
    templates = []
    last = None
    for addr, op, args, cmt in body:
        a = [x.strip() for x in args.split(',')] if args else []
        if op == 'li':
            regs[a[0]] = imm(a[1])
        elif op == 'addi' and a[1] == 'r2':
            regs[a[0]] = ('T', TOC + imm(a[2]))
        elif op == 'addi' and isinstance(regs.get(a[1]), tuple):
            regs[a[0]] = ('T', regs[a[1]][1] + imm(a[2]))
        elif op == 'mr':
            regs[a[0]] = regs.get(a[1])
        elif op == 'bl' and 'InitSprite' in cmt:
            t = regs.get('r3')
            tv = t[1] if isinstance(t, tuple) else t
            last = dict(addr=tv, type=regs.get('r4'), nframes=regs.get('r5'), delay=regs.get('r6'),
                        w=regs.get('r7'), h=regs.get('r8'), speed=regs.get('r9'), sets={})
            templates.append(last)
        elif op == 'bl':
            regs = {k: v for k, v in regs.items() if k in ('r%d' % i for i in range(13, 32))}
        elif op in ('sth', 'stw') and last is not None:
            m = re.match(r'(-?0x[0-9a-f]+|-?\d+)\((r\d+)\)', a[1])
            if m:
                off, base = imm(m.group(1)), m.group(2)
                bv = regs.get(base)
                if isinstance(bv, tuple):
                    ta = bv[1] + off
                    # find which template this lands in
                    for t in templates:
                        if isinstance(t["addr"], int) and t["addr"] <= ta < t["addr"] + 100:
                            fo = ta - t['addr']
                            t['sets'][FIELDS.get(fo, hex(fo))] = regs.get(a[0])
                            break
                    else:
                        last.setdefault('other', []).append((hex(ta), regs.get(a[0])))
        elif op in ('lha', 'lhz', 'lwz', 'add', 'subf', 'mullw', 'rlwinm', 'extsh', 'slwi', 'addi', 'mulli'):
            if a:
                regs.pop(a[0], None)
    users = defaultdict(set)
    taddrs = [t["addr"] for t in templates if isinstance(t["addr"], int)]
    for name, ins in funcs.items():
        if name == '.sDefSprites':
            continue
        for addr, op, args, cmt in ins:
            if op in ('addi', 'lwz', 'lha', 'lhz', 'sth', 'stw') and 'r2' in args:
                m = re.search(r'r2, (-?0x[0-9a-f]+|-?\d+)$', args) or re.search(r'(-?0x[0-9a-f]+|-?\d+)\(r2\)', args)
                if not m:
                    continue
                ea = TOC + imm(m.group(1))
                for ta in taddrs:
                    if ta <= ea < ta + 100:
                        users[ta].add(name.lstrip('.').lstrip('s') if name.startswith('.s') else name.lstrip('.'))
    for t in templates:
        def h(v):
            return '%d' % v if isinstance(v, int) else str(v)
        print('%08x type=%-5s nfr=%-3s delay=%-2s %sx%s speed=%-3s %s | %s' % (
            t['addr'] if isinstance(t['addr'], int) else 0, h(t['type']), h(t['nframes']), h(t['delay']), h(t['w']), h(t['h']), h(t['speed']),
            ' '.join('%s=%s' % (k, h(v)) for k, v in t['sets'].items()),
            ','.join(sorted(users.get(t['addr'], [])))))


if __name__ == '__main__':
    main()
