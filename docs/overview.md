# Overview

## What scratchpiler actually is

Scratchpiler is a text-based language that compiles into Scratch's internal block format and injects the result directly into the running VM. You write code in a real editor with autocomplete, syntax highlighting, and inline error checking. The blocks appear in Scratch. That's the whole trick. It is essentially an anesthesia system for the developer forced to build complex logic inside a toy box.

It doesn't replace Scratch — it's a faster path to the same destination. Every statement in scratchpiler corresponds to exactly one Scratch block category. There's no magic. If Scratch can't do something, scratchpiler can't either, and no amount of creative syntax or crying in front of your monitor will change that. The constraints live upstream, immutable and indifferent to your suffering.

---

## How the pipeline works

```
Source text (your hopes and dreams, written in ASCII)
    │
    ▼
Tokenizer       Breaks text into a flat list of tokens — numbers, strings,
                [variables], operators, keywords. Comments are discarded here.
                They were never going to make it to production anyway.
    │
    ▼
Parser          Reads the token list and builds an Abstract Syntax Tree (AST).
                This is where syntax errors are caught. If you wrote `forever`
                without a `{`, this is the step that notices and mocks you.
    │
    ▼
Linter          Walks the AST looking for structural problems: dead code after
                terminators, orphaned blocks floating outside hat blocks.
                Reports warnings — doesn't block compilation. It warns, but it
                won't stop you from doing something foolish. Just like life.
    │
    ▼
IR generation   Resolves source names and expands syntax sugar into structured
                SLVM IR. Returns and loop exits stay explicit operations.
    │
    ▼
SLVM            Verifies and legalizes the IR, preserving values across calls
                when needed. The slc emitter creates Scratch block objects,
                wired with next/parent/input references. Every compile uses
                this pipeline. See slvm-backend.md.
    │
    ▼
Injector        Deletes any blocks previously injected by scratchpiler for
                this sprite, then writes the new blocks into the live VM's
                block pool. Triggers a workspace refresh. It is a merciless
                purge of the old stack.
    │
    ▼
Scratch         The blocks appear. The sprite does what you told it.
                Or it crashes the tab. Hopefully the former.
```

---

## The decompiler

The decompiler runs the pipeline backwards. It reads the live VM's block graph for the selected sprite and reconstructs scratchpiler source text. It is an archaeological tool, dig-sites and all, useful for:

- Importing blocks you created manually in Scratch (in moments of weakness) and editing them as text
- Round-tripping — compile, modify in Scratch, import back, and pretend it was text all along
- Understanding what scratchpiler actually generated, should you need to debug the compiler's sanity

The decompiler is opinionated, much like the developer who wrote it. It produces canonical, consistently indented source. Comments are stripped in step one, so the decompiler cannot recover them from blocks. It can get them back another way: when source embedding is on, each script carries its original text in a Scratch comment, and the decompiler uses that text when the script's blocks still match (see [comment-metadata.md](comment-metadata.md)). For-loops, `pyfor` loops and `.sort()` calls that were compiled from scratchpiler source are recognized by an origin marker in a comment, or failing that by their internal variable naming pattern (the ugly `_scratchpiler_internal_xxxx` variables), and reconstructed as `for [i] from ... to ... { }` before they can scar your eyes. Inside the loop body the iterator keeps its short name, and a returning call such as `fact(n - 1)` comes back as a call rather than a statement followed by a read of the hidden `__ret_fact` variable. The compiler's own `clamp`, `alloc` and `free` helpers come back as the builtins they were. Optimization is the one thing the decompiler cannot undo: a custom block that was inlined shows up expanded in its callers unless embedded source restores the original.

`decompile(vm, sprite)` returns the text in one go (tests and scripts use it). The editor uses `decompileAsync(vm, sprite, { sliceMs, onProgress, signal })`, which produces identical output but hands control back to the page after each slice of about 8 ms, between scripts. Both run the same generator, and the decompiler's per-run state is saved and restored on every resume, so a sync `decompile` of another sprite can safely run in the middle of an async one.

Anything the decompiler doesn't recognise — an opcode it hasn't been taught — becomes an inline comment: `// unsupported: opcode_name`. If you see this, the opcode exists in the VM but has no scratchpiler equivalent yet. You have hit the boundaries of our mapped world. Good luck.

---

## The editor

The overlay runs a full Monaco editor instance — the same engine that powers VS Code. It is, in fact, doing exactly what VS Code does: providing a language-aware editing surface over a custom language definition. Scratchpiler ships a Monarch tokenizer, completion provider, signature help provider, hover provider, and document formatter. Monaco does the rest, consuming your RAM in exchange for autocomplete.

What this buys you:

- **Syntax highlighting** — keywords in violet, strings in green, numbers in cyan, and `[variables]` in orange, the same orange Scratch uses for variable blocks, so your brain doesn't have to switch contexts. There is a light theme in Settings. We can't stop you. We can only hope you seek professional guidance.
- **Error squiggles** — red for parse/compile errors, yellow for linter warnings. They appear 350ms after you stop typing, a brief delay to let you appreciate your mistake before highlighting it. Hover them to read the message.
- **Autocomplete** — press `Ctrl+Space` or just type. The completion list includes all built-in functions, all reporters, all variables and lists in the active sprite, all costume names, all sound names, all sprite names, and all custom block names. It's indexed live from the Scratch project, whispering the names of your assets back to you.
- **Signature help** — type `(` after any function name to see its parameter list in a floating widget. Press `,` to advance to the next parameter. The widget stays open until you close the parens or press Escape, clinging to life like a desperate pop-up.
- **Hover docs** — hover any function name to see its signature and parameter descriptions without having to navigate away.
- **Format document** — `Alt+Shift+F` re-indents the entire file. The formatter is indent-tracking: it increases indent after `{` and decreases before `}`. It won't restructure your bad architectural choices, just clean up the whitespace so they look professional.

---

## Sprite selection

The Explorer on the left lists the Stage and every sprite. Clicking one opens it in a tab. Scratchpiler compiles one sprite at a time: blocks go into exactly the sprite whose tab is active, the one named in the top bar. No cross-contamination.

Each sprite's code is saved independently to `localStorage` with the key `scratchpiler-content-<spriteName>`. Each open tab also keeps its own undo history, cursor and scroll position, so hopping between sprites doesn't erase your Ctrl+Z. Reloading the page preserves your code (not the undo history; we're not miracle workers). Clearing browser storage deletes your code forever, serving as a reminder that nothing in this browser tab is permanent, least of all your creations.

A sprite you've never opened here has no saved code, so it's decompiled from Scratch the first time you open it. The top bar's sync indicator then compares what you're editing with what was last injected (or pulled), and tells you when they've drifted apart. The full tour of the UI lives in [editor.md](editor.md).

---

## Compile and inject

Press **Ctrl+Enter** or **Ctrl+S** (or click the button). The compiler:

1. Parses and validates the source — if there are errors, nothing is injected. We refuse to feed broken ASTs to the VM.
2. Looks up every variable and list name against the live Scratch project to get its internal ID.
3. Generates fresh block objects with new UIDs for everything.
4. Deletes the blocks from the previous scratchpiler compile for this sprite. It tracks them by ID and purges them with extreme prejudice.
5. Injects the new blocks into the target sprite's block pool.
6. Triggers a workspace refresh so Scratch re-renders the block canvas, flashing the screen briefly as your new blocks are born.

Step 4 is the atomicity guarantee: each compile replaces the previous one rather than accumulating. If you compile three times, you have one set of blocks, not three. Old blocks don't linger. They die so new ones may live.

Step 2 is the most common source of errors. Variables must exist in Scratch before you reference them. If they don't, you get a compile error — not a runtime one — which is better than mysteriously getting `0` everywhere and wondering if your math or your life is broken.

---

## Variables and lists

Scratchpiler creates variables automatically in two cases: for-loop iterator variables (internal, with collision-avoiding names like `_scratchpiler_internal_xxxx_i`), and struct fields (see below). Everything else — your game's `[score]`, your `[playerX]`, your `[inventory]` list — must already exist in the Scratch project.

The Explorer and the Variables panel give you full CRUD over Scratch's variables without leaving the editor: create global or local variables with the **+** buttons, and rename, edit, or delete them in the Variables panel (`Ctrl+Shift+V`). Right-click any variable or list for the same actions.

---

## Structs

`struct name { field1, field2, … }` is a compile-time declaration. On compile, scratchpiler walks every struct in the file and creates any missing stage variables named `name.field`. No blocks are generated — the struct is invisible to Scratch; only its variables survive.

```
struct player { x, y, hp, speed }
// After compile: player.x, player.y, player.hp, player.speed exist on stage
set [player.x] to 0
set [player.hp] to 100
```

The editor's autocomplete knows about structs: typing `[` shows all `struct.field]` completions from every struct declared in the file. Typing `[player.` narrows the list to that struct's fields only. Completions update live as you edit struct declarations.

---

## Debugging

The `breakpoint` keyword pauses a sprite's script at runtime and slides an amber debug bar in under the top bar.

```
on flag {
    set [player.x] to 0
    breakpoint
    forever { ... }
}
```

When execution hits `breakpoint`, the bar says **Paused at a breakpoint** and offers a **Resume** button (or **F8**). The Variables panel opens by itself, showing every value frozen at the moment it stopped, which is the whole point of stopping. Resuming releases the pause and the script continues from where it stopped. Multiple breakpoints in one script work in sequence — each pause waits for its own resume.

Under the hood, `breakpoint` compiles to four blocks: `set [__dbg_at__] to 1` → `set [__dbg_resume__] to 0` → `wait until [__dbg_resume__] = 1` → `set [__dbg_at__] to 0`. The overlay polls `__dbg_at__` at 100ms to detect a live pause. The `__dbg_at__` and `__dbg_resume__` variables are created automatically on first compile.

---

## Inline assembly

`__asm__ volatile(...)` skips the friendly alias layer and calls real Scratch opcodes by their actual internal names — `motion_movesteps` instead of `move(10)`. It exists for the same reason C has inline asm: sometimes the abstraction is in the way, or the friendly name you want hasn't been written yet.

```
__asm__ volatile(
    looks_say("123");
    motion_movesteps(69);
)
```

Note the parentheses — the one construct in this language that doesn't use `{ }` for its body, a design decision made with full awareness that everyone (including us) would type braces there at least once anyway. Add `unsafe` (`__asm__ volatile unsafe(...)`) to allow opcodes outside the known-schema table, at the cost of any guarantee the resulting block does anything sensible at runtime. See [asm.md](asm.md) for the full, deliberately verbose writeup.

---

## Custom blocks

Same story as variables. The block definition must exist in Scratch's block palette before you can call it in scratchpiler. Scratchpiler compiles the *implementation* (the `define` body); it resolves the *prototype* (parameter names and IDs) from the live VM.

The workflow: create the block in Scratch ("Make a Block"), then write its body in scratchpiler. You never have to drag blocks around to build the implementation — that's the point. We handle the labor; Scratch gets the credit. Such is the way of things.
