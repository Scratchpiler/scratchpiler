# Overview

## How it works

Scratchpiler is a pipeline. Source text goes in, Scratch VM blocks come out. There is no intermediate file format, no separate build step, and no reason to look at the generated output unless something went wrong (which it won't, probably).

```
Source text
    │
    ▼
Tokenizer          splits text into tokens: numbers, strings, [variables], keywords
    │
    ▼
Parser             builds an Abstract Syntax Tree (AST)
    │
    ▼
Linter             checks the AST for dead code and other bad ideas
    │
    ▼
Compiler           walks the AST, generates Scratch sb3 block objects
    │
    ▼
Injector           writes blocks directly into the live Scratch VM
    │
    ▼
Scratch            the blocks appear, the sprite does what you told it
```

The decompiler runs this backwards: it reads the live VM block graph and reconstructs scratchpiler source text. It won't recover comments (they don't survive compilation) but it will faithfully reproduce structure, including for-loops that were originally compiled from scratchpiler source.

---

## The editor

The overlay is a full Monaco editor instance — the same editor engine that powers VS Code. This means:

- Syntax highlighting (keywords in blue, strings in orange, variables in yellow, math functions in green)
- Inline error squiggles (red for errors, yellow for linter warnings)
- Autocomplete with `Ctrl+Space` — functions, reporters, variable names, costume names, and sprite names are all indexed from the live project
- Signature help — type `(` after a function name to see its parameter list
- Hover docs — hover any function name to read its signature
- Format document — `Alt+Shift+F` re-indents your code

---

## Sprite selection

The dropdown in the toolbar lists all sprites and the Stage. Scratchpiler operates on one sprite at a time. Scripts compiled for "Cat" go into Cat's block pool; they won't appear in "Sprite2" unless you switch the dropdown and compile again.

Each sprite's editor content is saved separately to `localStorage` under `scratchpiler-content-<spriteName>`. Switching sprites in the dropdown automatically saves the current editor content and loads the code for the new sprite. Your work persists across page reloads.

---

## Compiling

Press **Ctrl+Enter** or click **Compile & Inject**. The compiler:

1. Tokenizes and parses the source
2. Resolves variable and list names against the live Scratch project (they must already exist)
3. Generates Scratch sb3 block objects with fresh UIDs
4. Deletes any blocks that were previously injected by scratchpiler for this sprite
5. Injects the new blocks into the target sprite's block pool
6. Triggers a workspace refresh so Scratch renders them

If there are parse or compile errors, nothing is injected. Error squiggles appear in the editor and the status bar reports the count. Fix the errors, then compile again.

---

## Decompiling (importing)

Click **Import** to decompile the selected sprite's current Scratch scripts back into scratchpiler text. The decompiler handles all standard Scratch opcodes; anything it doesn't recognise becomes an inline comment (`// unsupported: opcode_name`). For-loops that were originally compiled from scratchpiler are reconstructed faithfully as `for [i] from ... to ... { }`.

Importing overwrites the current editor content. There is no undo for this action, which is a known limitation and a mild moral failing.

---

## Variables and lists

Scratchpiler does **not** create variables for you (except for `for`-loop iterators, which it manages internally). If your script uses `[score]`, a variable named `score` must already exist in the Scratch project for the active sprite or as a global. Use the **Variables** menu in the toolbar to create them without leaving the editor.

---

## Custom blocks

Custom blocks work the same way — they must already be defined in Scratch's block palette for the active sprite before you can call them. The `define` syntax lets you compile the implementation; `CallStmt` resolves the prototype by name against the live VM.
