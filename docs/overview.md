# Overview

## What scratchpiler actually is

Scratchpiler is a text-based language that compiles into Scratch's internal block format and injects the result directly into the running VM. You write code in a real editor with autocomplete, syntax highlighting, and inline error checking. The blocks appear in Scratch. That's the whole trick.

It doesn't replace Scratch — it's a faster path to the same destination. Every statement in scratchpiler corresponds to exactly one Scratch block category. There's no magic. If Scratch can't do something, scratchpiler can't either, and no amount of creative syntax will change that. The constraint lives upstream.

---

## How the pipeline works

```
Source text
    │
    ▼
Tokenizer       Breaks text into a flat list of tokens — numbers, strings,
                [variables], operators, keywords. Comments are discarded here.
                They were never going to make it.
    │
    ▼
Parser          Reads the token list and builds an Abstract Syntax Tree (AST).
                This is where syntax errors are caught. If you wrote `forever`
                without a `{`, this is the step that notices.
    │
    ▼
Linter          Walks the AST looking for structural problems: dead code after
                terminators, orphaned blocks floating outside hat blocks.
                Reports warnings — doesn't block compilation.
    │
    ▼
Compiler        Traverses the AST and emits Scratch sb3 block objects. Each
                node becomes one or more blocks with freshly generated UIDs,
                wired together with next/parent/input references exactly as
                Scratch's internal format requires.
    │
    ▼
Injector        Deletes any blocks previously injected by scratchpiler for
                this sprite, then writes the new blocks into the live VM's
                block pool. Triggers a workspace refresh.
    │
    ▼
Scratch         The blocks appear. The sprite does what you told it.
                Hopefully.
```

---

## The decompiler

The decompiler runs the pipeline backwards. It reads the live VM's block graph for the selected sprite and reconstructs scratchpiler source text. This is useful for:

- Importing blocks you created manually in Scratch and editing them as text
- Round-tripping — compile, modify in Scratch, import back
- Understanding what scratchpiler actually generated from a given script

The decompiler is opinionated. It produces canonical, consistently indented source. It won't recover comments (they don't survive compilation — they're stripped in step one and that data is gone). For-loops that were originally compiled from scratchpiler source are detected by their internal variable naming pattern and reconstructed faithfully as `for [i] from ... to ... { }`.

Anything the decompiler doesn't recognise — an opcode it hasn't been taught — becomes an inline comment: `// unsupported: opcode_name`. If you see this, the opcode exists in the VM but has no scratchpiler equivalent yet.

---

## The editor

The overlay runs a full Monaco editor instance — the same engine that powers VS Code. It is, in fact, doing exactly what VS Code does: providing a language-aware editing surface over a custom language definition. Scratchpiler ships a Monarch tokenizer, completion provider, signature help provider, hover provider, and document formatter. Monaco does the rest.

What this buys you:

- **Syntax highlighting** — keywords in blue, strings in orange, variables in yellow, math functions in green. The color scheme is Tomorrow Night Blue, which is pleasant and non-negotiable.
- **Error squiggles** — red for parse/compile errors, yellow for linter warnings. They appear 350ms after you stop typing. Hover them to read the message.
- **Autocomplete** — press `Ctrl+Space` or just type. The completion list includes all built-in functions, all reporters, all variables and lists in the active sprite, all costume names, all sound names, all sprite names, and all custom block names. It's indexed live from the Scratch project.
- **Signature help** — type `(` after any function name to see its parameter list in a floating widget. Press `,` to advance to the next parameter. The widget stays open until you close the parens or press Escape.
- **Hover docs** — hover any function name to see its signature and parameter descriptions without having to navigate away.
- **Format document** — `Alt+Shift+F` re-indents the entire file. The formatter is indent-tracking: it increases indent after `{` and decreases before `}`. It won't restructure your code, just clean up the whitespace.

---

## Sprite selection

The dropdown in the toolbar lists all sprites and the Stage. Scratchpiler operates on one sprite at a time. Compiled blocks go into exactly the sprite that's selected — no cross-contamination.

Each sprite's editor content is saved independently to `localStorage` with the key `scratchpiler-content-<spriteName>`. Switching sprites in the dropdown automatically saves the current content and loads whatever was last saved for the new sprite. Reloading the page preserves your work. Clearing browser storage does not.

---

## Compile and inject

Press **Ctrl+Enter** or **Ctrl+S** (or click the button). The compiler:

1. Parses and validates the source — if there are errors, nothing is injected
2. Looks up every variable and list name against the live Scratch project to get its internal ID
3. Generates fresh block objects with new UIDs for everything
4. Deletes the blocks from the previous scratchpiler compile for this sprite (it tracks them by ID)
5. Injects the new blocks into the target sprite's block pool
6. Triggers a workspace refresh so Scratch re-renders the block canvas

Step 4 is the atomicity guarantee: each compile replaces the previous one rather than accumulating. If you compile three times, you have one set of blocks, not three. Old blocks don't linger.

Step 2 is the most common source of errors. Variables must exist in Scratch before you reference them. If they don't, you get a compile error — not a runtime one — which is better than mysteriously getting `0` everywhere.

---

## Variables and lists

Scratchpiler cannot create arbitrary variables. It creates exactly one kind automatically: for-loop iterator variables, which it manages internally using a naming scheme that ensures no collisions (`_scratchpiler_internal_xxxx_name`). Everything else — your game's `[score]`, your `[playerX]`, your `[inventory]` list — must already exist in the Scratch project.

The toolbar's **Variables** and **Lists** menus let you create global or local variables without leaving the editor. Use them. The alternative is switching back to Scratch, finding the variable panel, clicking "Make a Variable", typing the name, clicking OK, switching back to scratchpiler, and trying to remember where you were. One of these options is faster.

---

## Custom blocks

Same story as variables. The block definition must exist in Scratch's block palette before you can call it in scratchpiler. Scratchpiler compiles the *implementation* (the `define` body); it resolves the *prototype* (parameter names and IDs) from the live VM.

The workflow: create the block in Scratch ("Make a Block"), then write its body in scratchpiler. You never have to drag blocks around to build the implementation — that's the point.
