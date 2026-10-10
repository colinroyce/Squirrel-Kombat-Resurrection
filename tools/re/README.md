# Reverse-engineering tools

The game's behaviour is recovered from the PowerPC code (data fork of the `Squirrel Kombat`
application, a CodeWarrior PEF). Findings are written up in [`docs/SPEC.md`](../../docs/SPEC.md).

| Tool | Purpose |
|---|---|
| `pef.py` | PEF loader: sections, pattern-initialised data, loader relocations, imports |
| `disasm.py <pef> <outdir>` | capstone disassembly; names the 541 functions from CodeWarrior traceback tables; writes `functions.tsv`, `disasm.txt`, `toc.tsv` |
| `jumptables.py <pef> <disasm.txt> <out.tsv>` | finds TOC-relative `switch` jump tables (Ghidra misses them) |
| `ghidra_scripts/DecompileAll.java` | Ghidra 11 headless post-script: applies names, the r2 TOC value, `Sprite`/`Rect` types, jump-table overrides, then decompiles everything to one C file |
| `defsprites.py <disasm.txt>` | recovers the sprite templates set up by `DefSprites` (first cicn id, frame count, delay, size, speed, field overrides) and which functions spawn each |
| `callargs.py <disasm.txt> <callee> [caller]` | shows every argument at each call site, including stack arguments 9+ that the decompiler drops |
| `dd.py <pef> dbl/words/longs/str/pstr/toc <addr>` | reads data (doubles, tables, strings) at Ghidra addresses |

Address conventions: Ghidra and `docs/SPEC.md` use code at 0x10000000, data at 0x1003CAB0 and
TOC (r2) = 0x10044AB0. Comments inside `disasm.txt` show data addresses relative to 0x20000000.

Decompiling (Ghidra 11.0.3, Python 3 with capstone):

```sh
python3 disasm.py SquirrelKombat.pef re/
python3 jumptables.py SquirrelKombat.pef re/disasm.txt re/jumptables.tsv
analyzeHeadless proj sk -import SquirrelKombat.pef -scriptPath tools/re/ghidra_scripts \
  -postScript DecompileAll.java re/functions.tsv re/decomp.c 32768 tools/re/sprite_funcs.txt re/jumptables.tsv -deleteProject
```
