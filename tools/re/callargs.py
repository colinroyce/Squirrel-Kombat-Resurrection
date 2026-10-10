"""List the argument set-up at each call site of a function.

For every `bl` to the named callee, walks back to the previous call (or the
start of the function) and prints how r3..r10 and the stack argument slots
(0x38(r1), 0x3c(r1), ...) were last set. Constant loads are folded (li, lis/ori);
everything else is shown as the instruction text.

usage: python callargs.py <disasm.txt> <callee> [caller-filter]
"""
import re
import sys

INS = re.compile(r'^([0-9a-f]{8}): (\S+)\s*(.*?)\s*(;.*)?$')


def main():
    path, callee = sys.argv[1], sys.argv[2]
    filt = sys.argv[3] if len(sys.argv) > 3 else None
    cur, body = None, []
    funcs = []
    for line in open(path):
        if line.startswith('==== '):
            if cur:
                funcs.append((cur, body))
            cur, body = line.split()[1], []
            continue
        m = INS.match(line.rstrip('\n'))
        if m:
            body.append((m.group(1), m.group(2), m.group(3), m.group(4) or ''))
    if cur:
        funcs.append((cur, body))
    want = re.compile(r';\s*\.s?%s$' % re.escape(callee))
    for name, body in funcs:
        if filt and filt not in name:
            continue
        start = 0
        for i, (addr, op, args, cmt) in enumerate(body):
            if op != 'bl':
                continue
            if want.search(cmt):
                regs = {}
                for a2, op2, args2, c2 in body[start:i]:
                    a = [x.strip() for x in args2.split(',')]
                    if not a or not a[0]:
                        continue
                    if op2 == 'li':
                        regs[a[0]] = a[1]
                    elif op2 == 'lis':
                        regs[a[0]] = '(%s<<16)' % a[1]
                    elif op2 in ('stw', 'sth') and '(r1)' in args2:
                        m = re.match(r'(0x[0-9a-f]+|\d+)\(r1\)', a[1])
                        if m and 0x38 <= int(m.group(1), 0) < 0x60:
                            regs['sp+' + m.group(1)] = '%s' % regs.get(a[0], a[0])
                    elif op2 not in ('cmpwi', 'cmpw', 'b', 'beq', 'bne', 'blt', 'bgt', 'ble', 'bge', 'stw', 'sth', 'stb', 'mtctr', 'bdnz'):
                        regs[a[0]] = '%s %s' % (op2, args2)
                out = []
                for r in ['r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10']:
                    out.append('%s=%s' % (r, regs.get(r, '?')))
                for k in sorted(k for k in regs if k.startswith('sp+')):
                    out.append('%s=%s' % (k, regs[k]))
                print('%s %s: %s' % (addr, name, ' | '.join(out)))
            start = i + 1


if __name__ == '__main__':
    main()
