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
Compiler        Traverses the AST and emits Scratch sb3 block objects. Each
                node becomes one or more blocks with freshly generated UIDs,
                wired together with next/parent/input references exactly as
                Scratch's internal format requires. A labyrinth of JSON objects
                holding references to other JSON objects.
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

The decompiler is opinionated, much like the developer who wrote it. It produces canonical, consistently indented source. It won't recover comments. They don't survive compilation — they're stripped in step one and that data is gone, dissolved into the ether. For-loops that were originally compiled from scratchpiler source are detected by their internal variable naming pattern (the ugly `_scratchpiler_internal_xxxx` variables) and reconstructed faithfully as `for [i] from ... to ... { }` before they can scar your eyes.

Anything the decompiler doesn't recognise — an opcode it hasn't been taught — becomes an inline comment: `// unsupported: opcode_name`. If you see this, the opcode exists in the VM but has no scratchpiler equivalent yet. You have hit the boundaries of our mapped world. Good luck.

---

## The editor

The overlay runs a full Monaco editor instance — the same engine that powers VS Code. It is, in fact, doing exactly what VS Code does: providing a language-aware editing surface over a custom language definition. Scratchpiler ships a Monarch tokenizer, completion provider, signature help provider, hover provider, and document formatter. Monaco does the rest, consuming your RAM in exchange for autocomplete.

What this buys you:

- **Syntax highlighting** — keywords in blue, strings in orange, variables in yellow, math functions in green. The color scheme is Tomorrow Night Blue, which is pleasant and non-negotiable. If you want a light theme, we cannot help you, and you should probably seek professional guidance.
- **Error squiggles** — red for parse/compile errors, yellow for linter warnings. They appear 350ms after you stop typing, a brief delay to let you appreciate your mistake before highlighting it. Hover them to read the message.
- **Autocomplete** — press `Ctrl+Space` or just type. The completion list includes all built-in functions, all reporters, all variables and lists in the active sprite, all costume names, all sound names, all sprite names, and all custom block names. It's indexed live from the Scratch project, whispering the names of your assets back to you.
- **Signature help** — type `(` after any function name to see its parameter list in a floating widget. Press `,` to advance to the next parameter. The widget stays open until you close the parens or press Escape, clinging to life like a desperate pop-up.
- **Hover docs** — hover any function name to see its signature and parameter descriptions without having to navigate away.
- **Format document** — `Alt+Shift+F` re-indents the entire file. The formatter is indent-tracking: it increases indent after `{` and decreases before `}`. It won't restructure your bad architectural choices, just clean up the whitespace so they look professional.

---

## Sprite selection

The dropdown in the toolbar lists all sprites and the Stage. Scratchpiler operates on one sprite at a time. Compiled blocks go into exactly the sprite that's selected — no cross-contamination.

Each sprite's editor content is saved independently to `localStorage` with the key `scratchpiler-content-<spriteName>`. Switching sprites in the dropdown automatically saves the current content and loads whatever was last saved for the new sprite. Reloading the page preserves your work. Clearing browser storage deletes your code forever, serving as a reminder that nothing in this browser tab is permanent, least of all your creations.

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

The toolbar's **Variables** and **Lists** menus give you full CRUD over the variable panel without leaving the editor: create global or local variables, rename them, delete them, or bulk-initialize a list from a comma-separated string. Right-clicking (hovering and clicking ⋮) any variable or list in the sprite panel exposes these actions inline.

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

The `breakpoint` keyword pauses a sprite's script at runtime and activates a debug bar at the bottom of the overlay.

```
on flag {
    set [player.x] to 0
    breakpoint
    forever { ... }
}
```

When execution hits `breakpoint`, the debug bar slides in: **"⏸ Paused at breakpoint"** with a **Resume ▶** button. Clicking Resume releases the pause and the script continues from where it stopped. Multiple breakpoints in one script work in sequence — each pause waits for its own resume.

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
