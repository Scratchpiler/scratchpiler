# scratchpiler

<p align="center">
  <img src="resources/Scratchpiler 2.PNG" alt="Scratchpiler" width="180" />
</p>

<p align="center">
  <a href="https://github.com/Scratchpiler/scratchpiler/actions/workflows/release.yml"><img src="https://github.com/Scratchpiler/scratchpiler/actions/workflows/release.yml/badge.svg" alt="Release Userscript" /></a>
  <a href="https://github.com/Scratchpiler/scratchpiler/releases/latest"><img src="https://img.shields.io/github/v/release/Scratchpiler/scratchpiler?label=latest" alt="Latest Release" /></a>
  <img src="https://img.shields.io/endpoint?url=https://github.com/Scratchpiler/scratchpiler/releases/download/latest/loc.json" alt="Lines of Code" />
  <img src="https://img.shields.io/badge/license-ISC-lightgrey" alt="License: ISC" />
</p>

A text-based DSL that compiles directly into Scratch's block VM. Because sometimes you want to write a platformer without playing Tetris with puzzle pieces, or because you've finally realized that Scratch is a turing-complete ISA waiting to be compiled against.


Every compile uses SLVM IR for verification, inlining of small custom blocks and legalization before Scratch block emission. See [the compiler documentation](docs/slvm-backend.md) for the pipeline and verification.

---

## What it is

Scratchpiler lets you write Scratch programs in a real text editor (Monaco, the one from VS Code), then injects the compiled blocks directly into the running Scratch project. You can also decompile existing Scratch scripts back into scratchpiler source. It's not magic — it's just a Tampermonkey userscript doing unspeakable, borderline-sacrilegious things to the Scratch VM's internal block registry.

The language maps 1:1 with Scratch's block palette. Every statement, every reporter, every hat block has a text equivalent. The goal isn't to replace Scratch; it's to give programmers a faster path to the same output, shielding them from the blinding glare of Scratch's default aesthetic while they contemplate their life choices.

---

## Requirements

- [Tampermonkey](https://www.tampermonkey.net/) (Chrome) or [Violentmonkey](https://violentmonkey.github.io/) (Firefox/Chrome) to run our payload.
- A modern browser capable of rendering the Monaco editor before it exhausts your system memory.
- A Scratch account, or at least an open project at `scratch.mit.edu/projects/*/editor` where you can summon your creation.
- The ability to tolerate a DSL that uses `camelCase` for everything, because the Scratch VM's internals demand it and it lacks any concept of self-respect.

---

## Installation

1. Open Tampermonkey → Dashboard → **+** (new script)
2. Paste the contents of `scratchpiler.user.js`
3. Save
4. Navigate to a Scratch project editor

The script activates automatically on `scratch.mit.edu/projects/*/editor/*`.

---

## Opening the editor

Press **Alt+M** to toggle the scratchpiler overlay. That's it. Press it again to close.

You will be greeted by a dark editor that looks suspiciously like VS Code. This is intentional.

---

## Quick start

```
on flag {
    say("Hello, World!")
    wait(2)
    say("")
}
```

1. Select a sprite in the Explorer on the left (preferably one you don't mind breaking)
2. Type (or paste) your script
3. Press **Ctrl+Enter** (or click **Compile & Inject**)
4. Watch the blocks appear in Scratch like digital weeds.

Blocks are injected into the selected sprite. Variables must already exist in Scratch — scratchpiler resolves them by name, not by wishful thinking or hoping Scratch will figure out your intent. It won't. It doesn't care.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Alt+M` | Open / close the editor |
| `Ctrl+Enter` | Compile & inject |
| `Ctrl+S` | Compile & inject (for the muscle-memory crowd) |
| `Ctrl+Shift+Enter` | Compile & inject minified (same as `Shift+Click` on the button) |
| `Ctrl+K` | Command palette: sprites, headers, blocks, variables and commands |
| `Ctrl+P` | Go to sprite or header |
| `Ctrl+Shift+V` | Show / hide the Variables panel |
| `Ctrl+Shift+F` | Find and replace across every sprite and header |
| `Ctrl+B` / `Ctrl+J` | Show / hide the sidebar / the bottom panel |
| `Alt+Shift+P` | Pull the current sprite's code back from Scratch |
| `Alt+Shift+F` | Format / auto-indent |
| `F8` | Resume from a `breakpoint` |
| `Ctrl+/` | Keyboard shortcuts (outside the editor; inside it, it toggles a comment) |
| `Esc` | Close the editor |
| `Ctrl+Space` | Trigger autocomplete |
| `Shift+Shift` | Search Nowhere. You'll see. |

---

## Features

- **Full Scratch block coverage** — motion, looks, sound, events, control, sensing, variables, lists
- **Control flow** — `if/else`, `repeat`, `forever`, `while`, `repeat until`, `for` loops, and `pyfor [item] in [list]` (Python-style list iteration)
- **Math & trig** — `abs`, `sqrt`, `floor`, `sin`, `cos`, `clamp`, `random`, and more (Scratch uses degrees, not radians, and so does scratchpiler)
- **String operators** — `join`, `letterOf`, `contains`, `.length()`
- **List dot-methods** — `[list].item(i)`, `[list].contains(val)`, `[list].indexOf(val)`, `[list].sort()`
- **Compound assignment** — `[x] += 1`, `[x] *= 2`, `[x]++`, `[x]--`
- **Custom blocks** — `define myBlock(param1, param2) { ... }`
- **Hex color literals** — `#ff6600`
- **Pen extension** — `penDown()`, `penUp()`, `penClear()`, `stamp()`, `setPenColor(#hex)`, `setPenSize()`, `changePenSize()`, `setPenColorParam()`, `changePenColorParam()`
- **Ergonomic aliases** — friendlier names for common operations: `print()`, `step()`, `left()`, `right()`, `front()`, `back()`, `clone()`, `ask()`, `send()`, `append()`, `push()`, `remove()`, `clear()`, and more
- **Scratchroutines** — named concurrent tasks: `scratchroutine name(params) {}`, launched with `launch`/`await`, cancelled with `cancel`, queried with `isRunning()`, and interrupted with `checkCancel()`
- **Inline assembly** — `__asm__ volatile(...)` calls raw Scratch opcodes directly, bypassing the friendly alias layer entirely, plus an `unsafe` mode for opcodes we haven't taught the compiler about yet
- **List aggregates** — `.sum()`, `.min()`, `.max()`, `.count(val)` compile to hidden pre-computation loops
- **`else if` / `elif` chaining** — flat chaining without visual nesting
- **Type checking** — linter warns when you pass a variable where a list is expected (or vice versa), before the compiler has to deal with you
- **Configurable linter** — toggle type checking, dead code detection, and orphaned block warnings independently in Settings
- **Configurable editor** — tab size, auto-save delay, theme, font size, word wrap, minimap
- **Variables panel** — a live view of every variable and list in the current sprite, docked on the right. Values update while the project runs, freeze at a `breakpoint`, and can be edited in place. Renaming a variable also renames every `[reference]` in your code
- **Command palette** — `Ctrl+K` jumps to any sprite, header, custom block, script or variable, and runs any command
- **Shortcut hints** — hover (or Tab to) any button and its tooltip shows the keyboard shortcut, so you can stop clicking things
- **Tabs that remember** — each open sprite and header keeps its own undo history, cursor and scroll position
- **Find and replace everywhere** — searches every sprite (opened or not) and every header, previews each replacement, and can undo a Replace All
- **Linter** — warns about dead code and orphaned blocks before you compile
- **Decompiler** — import existing Scratch scripts back as text; recognizes compiled `pyfor`, `for`, `.sort()`, and `while` patterns
- **Per-sprite persistence** — each sprite's code is saved independently to `localStorage`
- **Hover docs** — hover a function name to see its signature and documentation, including your own `define`s and scratchroutines
- **Autocomplete** — full Monaco IntelliSense for all functions, variables, costumes, and aliases — scope-aware, so parameters and loop variables are only offered where they actually exist
- **Code intelligence** — a real semantic analyzer: go-to-definition (F12), find-all-references, rename (F2), semantic highlighting, unknown-name/arity/shadowing diagnostics, and code-smell hints (unused blocks, busy-waits, magic numbers)
- **Project-wide analysis** — reads every sprite in the background (with a progress bar): broadcasts link to their receivers (`3 listeners` hints, F12, Shift+F12), variables and messages rename across all sprites and in Scratch, `Ctrl+T` finds any script or block, an event flow map shows how scripts start each other, and checks catch broadcasts nobody receives, unused variables and green-flag ordering races. The compiler uses it too, to unroll loops in scripts that no other script can observe

---

## Source Architecture

The original 7,200-line monolith of despair has been shattered into beautifully decoupled modules. Because staring at a single file until your eyes bleed is no way to live. Now the compiled artifact is 14,000 lines and counting.

| Module | Purpose |
|---|---|
| `main.js` | The puppet master. Orchestrates the chaos by importing everything and tying the loose ends. |
| `compiler.js` | Parses your beautiful text into AST, runs the typechecker and linter, and finally spits out raw Scratch blocks. |
| `asm-opcodes.js` | The `__asm__` schema table — every opcode scratchpiler will vouch for, and exactly what arguments it expects. Everything else is `unsafe`'s problem. |
| `decompiler.js` | Performs unholy necromancy to pull blocks out of the Scratch VM and stitch them back into readable Scratchpiler text. |
| `injector.js` | Shoves the compiled AST directly into the VM's memory. It asks no questions and takes no prisoners. |
| `editor.js` | Handles the Monaco instance, state persistence, project indexing, and the overall lifecycle of the overlay. |
| `ui-dom.js` | Manipulates the DOM. Builds the overlay, toasts, menus, the bottom panel and resize handles, and hosts Search Nowhere. |
| `explorer.js` | The left sidebar: sprites with real costume thumbnails, the selected sprite's variables, lists, blocks, costumes and sounds, plus the Headers list. |
| `variables.js` | Thin, honest wrappers around the Scratch VM's variable API: create, rename, set, delete (with undo), and whether the project is running or paused. |
| `variables-panel.js` | The docked Variables panel. Watches values live and lets you edit them without touching a single orange block. |
| `search-panel.js` | Find and replace across every sprite and header, sharing one matcher so what you find is exactly what gets replaced. |
| `palette.js` | The `Ctrl+K` command palette. |
| `language.js` | Tells Monaco how to highlight our DSL without crying. |
| `analyzer.js` | The semantic analyzer. Builds a symbol table and occurrence index from the AST, then judges your code twice: once for correctness (unknown names, wrong arity, shadowing) and once for taste (magic numbers, busy-waits, blocks you defined and then ghosted). |
| `semantic-providers.js` | The thin Monaco adapter over `analyzer.js` — go-to-definition, rename, find-references, and semantic highlighting. |
| `monaco.js` | Injects the VS Code editor into a kid's block-coding website. |
| `vm.js` | Acquires and wraps the internal Scratch VM object so we can violate its APIs. |
| `constants.js` | Constants. Because magic strings are for cowards. |
| `overlay.css` / `.html` | The injected styles and layout, cleanly extracted so we don't have to look at giant template strings anymore. |

---

## Documentation

**New? Start here:** [docs/getting-started.md](docs/getting-started.md) — a step-by-step tutorial from zero to a working program.

**Looking something up?** [docs/quick-reference.md](docs/quick-reference.md) — every function and keyword on one page.

**Lost in the UI?** [docs/editor.md](docs/editor.md) — a tour of every panel, button and shortcut.

### Full reference

| File | Contents |
|---|---|
| [docs/getting-started.md](docs/getting-started.md) | Tutorial: from zero to first program |
| [docs/quick-reference.md](docs/quick-reference.md) | All syntax and functions on one page |
| [docs/editor.md](docs/editor.md) | The editor itself: explorer, tabs, Variables panel, command palette, find and replace, shortcuts |
| [docs/overview.md](docs/overview.md) | How the pipeline works |
| [docs/slvm-backend.md](docs/slvm-backend.md) | The SLVM compiler pipeline, runtime behavior, limitations and verification |
| [docs/comment-metadata.md](docs/comment-metadata.md) | Source embedding, `noinline`/`nounroll` hints and loop markers kept in Scratch comments |
| [docs/syntax.md](docs/syntax.md) | Tokens, operators, expressions |
| [docs/control-flow.md](docs/control-flow.md) | Hat blocks, loops, conditionals |
| [docs/motion.md](docs/motion.md) | Motion functions and reporters |
| [docs/looks.md](docs/looks.md) | Looks, costumes, effects |
| [docs/pen.md](docs/pen.md) | Pen: drawing, stamping, color and size |
| [docs/sound.md](docs/sound.md) | Sound functions |
| [docs/events.md](docs/events.md) | Events and broadcasting |
| [docs/scratchroutines.md](docs/scratchroutines.md) | Scratchroutines: concurrent tasks with launch, await, cancel, isRunning |
| [docs/asm.md](docs/asm.md) | Inline assembly: `__asm__ volatile(...)`, registers, strict vs. `unsafe`, opcode coverage |
| [docs/sensing.md](docs/sensing.md) | Sensing, mouse, keyboard, time |
| [docs/variables-and-lists.md](docs/variables-and-lists.md) | Variables, lists, dot methods |
| [docs/math.md](docs/math.md) | Math functions and operators |
| [docs/custom-blocks.md](docs/custom-blocks.md) | Custom block definitions |
| [docs/linter.md](docs/linter.md) | Warnings, type checking, dead code detection, and configuring lint rules |
| [docs/code-intelligence.md](docs/code-intelligence.md) | Semantic analyzer: go-to-definition, rename, semantic highlighting, diagnostics, code smells |
| [docs/examples.md](docs/examples.md) | Full example programs |

---

## File extension

Scratchpiler source files conventionally use `.sdsl`. There is no toolchain, no build step, no `package.json`. You just have a file.
