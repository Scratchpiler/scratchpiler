# Comment metadata

Scratch comments can sit on any block and they are saved inside the project. Scratchpiler uses them to carry a few facts that blocks cannot: the source text a script was compiled from, hints for the optimizer, and which loops were `for`, `pyfor` or `sort` before they were lowered into plain blocks.

Every comment Scratchpiler writes starts with `scratchpiler:`. You can see them in the Scratch editor, minimized, next to the scripts they describe.

**Nothing in a comment changes what a script does.** Delete every one of them and the project runs exactly the same. You lose hints and round-trip fidelity, and nothing else.

---

## Format

One entry per line. Unknown entries are ignored, so a project made by a newer Scratchpiler still opens in an older one.

| Line | On | Meaning |
|---|---|---|
| `scratchpiler:include=name.h` | a script | The script came from a header. Pulling code collapses it to `#include <name.h>`. |
| `scratchpiler:noinline` | a `define` | `define f() noinline { }` in the source. |
| `scratchpiler:nounroll` | a loop | `repeat 4 nounroll { }` or `for [i] from 1 to 4 nounroll { }` in the source. |
| `scratchpiler:origin=for` (`pyfor`, `sort`) | the first block of a lowered loop or sort | Tells the decompiler what the blocks after it used to be. |
| `scratchpiler:src=<hash>` | a script | The lines after this one are the script's source text. |
| `scratchpiler:decls` | nothing (a workspace comment) | The lines after this one are the file's `enum` and `struct` declarations. |

`src` and `decls` run to the end of the comment. A block has one comment, so a script that came from a header and also has `noinline` carries both lines in the same comment.

---

## Source embedding

With **Embed source in comments** on (Settings → Round trip, on by default), each `define` and `on …` script gets a comment holding its original text. That includes the `//` comments directly above it, your spacing, and anything else you typed.

**Pull code from Scratch** then gives that text back verbatim instead of decompiling the blocks. The comment also stores a hash of the script's blocks. Pull recomputes it, and the text is used only if it still matches:

- If you changed the script in Scratch (a different number, a rearranged block, a renamed variable), the hash no longer matches and that script is decompiled from its blocks as usual.
- Other scripts in the sprite are checked on their own, so one edit does not cost you the formatting of the rest.
- The hash ignores block ids, positions and variable ids, so it survives saving and reloading the project.

What is **not** embedded:

- scripts that came from a header (they collapse to `#include` instead);
- `scratchroutine` definitions and top-level statements outside any hat;
- the compiler's own `alloc` and `free` helpers.

Those are decompiled from blocks as before. `enum` and `struct` declarations produce no blocks, so they travel in one `decls` comment and are written back above the scripts whenever at least one script is restored from its embedded source.

**Minified injects never embed source.** Shift+click on Compile (or `Ctrl+Shift+Enter`) renames every variable to gibberish. Embedding the source would put the real names back in the project, so a minified inject also removes embedded source left by an earlier normal inject of the same sprite.

---

## Hints

`noinline` and `nounroll` are accepted, written to comments and restored by Pull. Both are passed into SLVM. The inliner reads `noinline` and keeps every call to that block (see [custom-blocks.md](custom-blocks.md#noinline)). The unroller reads `nounroll` and keeps that loop (see [control-flow.md](control-flow.md#repeat)).

Inlining and unrolling change what a pull shows without embedded source. The decompiler cannot undo them, so a small block that was inlined appears expanded in its callers, and an unrolled loop appears as repeated statements. Source embedding avoids this: the embedded text still says `area(6, 7)`, and it is used while the script's blocks match its hash.

---

## Loop origin markers

A `for`, `pyfor` or `sort` becomes ordinary blocks with hidden `_scratchpiler_internal_…` variables. The decompiler used to find them by those variable names alone. Now the first block of each carries an `origin` marker, so the decompiler still recognizes them when the names are gone, for example after a minified inject.

---

## Cleaning up

Every inject removes `scratchpiler:` comments whose block was replaced or deleted, and any comment attached to no block. Comments you wrote yourself, which don't start with `scratchpiler:`, are never touched.
