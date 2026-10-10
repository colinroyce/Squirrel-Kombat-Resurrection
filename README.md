# Squirrel Kombat Resurrection

A faithful browser recreation of **Squirrel Kombat** (Monkey Farm Software, 1999, classic Mac OS),
built from the original game's own art, sound and code.

Status: reverse-engineering and asset pipeline done for the first milestone (splash → title →
options → character select → scene select → Ed vs Speedy in the Forest). The game itself is not
built yet.

| Path | Contents |
|---|---|
| `assets/` | sprites, pictures, sounds and text extracted from the original archive |
| `docs/SPEC.md` | game behaviour recovered from the PowerPC binary (timings, physics, damage, AI, screens) |
| `tools/extract/` | the extraction pipeline (`.sit` → `assets/`) |
| `tools/re/` | disassembly / decompilation tools used to write the spec |
