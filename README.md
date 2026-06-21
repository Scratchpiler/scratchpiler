# scratchpiler

A text-based DSL that compiles directly into Scratch's block VM. Because sometimes you want to write a platformer without playing Tetris with puzzle pieces, or because you've finally realized that dragging colorful plastic shapes with a mouse is a slow descent into developer madness.

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

1. Select a sprite from the dropdown in the toolbar (preferably one you don't mind breaking)
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
| `Alt+Shift+F` | Format / auto-indent |
| `Esc` | Close the editor |
| `Ctrl+Space` | Trigger autocomplete |

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
- **Ergonomic aliases** — friendlier names for common operations: `print()`, `step()`, `left()`, `right()`, `front()`, `back()`, `clone()`, `ask()`, `send()`, `append()`, `push()`, `remove()`, `clear()`, and more
- **Scratchroutines** — named concurrent tasks: `scratchroutine name(params) {}`, launched with `launch`/`await`, cancelled with `cancel`, queried with `isRunning()`, and interrupted with `checkCancel()`
- **List aggregates** — `.sum()`, `.min()`, `.max()`, `.count(val)` compile to hidden pre-computation loops
- **`else if` / `elif` chaining** — flat chaining without visual nesting
- **Type checking** — linter warns when you pass a variable where a list is expected (or vice versa), before the compiler has to deal with you
- **Configurable linter** — toggle type checking, dead code detection, and orphaned block warnings independently in Settings
- **Configurable editor** — tab size, auto-save delay, theme, font size, word wrap, minimap
- **Linter** — warns about dead code and orphaned blocks before you compile
- **Decompiler** — import existing Scratch scripts back as text; recognizes compiled `pyfor`, `for`, `.sort()`, and `while` patterns
- **Per-sprite persistence** — each sprite's code is saved independently to `localStorage`
- **Hover docs** — hover a function name to see its signature and documentation
- **Autocomplete** — full Monaco IntelliSense for all functions, variables, costumes, and aliases

---

## Source Architecture

The original 7,200-line monolith of despair has been shattered into beautifully decoupled modules. Because staring at a single file until your eyes bleed is no way to live.

| Module | Purpose |
|---|---|
| `main.js` | The puppet master. Orchestrates the chaos by importing everything and tying the loose ends. |
| `compiler.js` | Parses your beautiful text into AST, runs the typechecker and linter, and finally spits out raw Scratch blocks. |
| `decompiler.js` | Performs unholy necromancy to pull blocks out of the Scratch VM and stitch them back into readable Scratchpiler text. |
| `injector.js` | Shoves the compiled AST directly into the VM's memory. It asks no questions and takes no prisoners. |
| `editor.js` | Handles the Monaco instance, state persistence, project indexing, and the overall lifecycle of the overlay. |
| `ui-dom.js` | Manipulates the DOM. Creates buttons, sidebars, context menus, and other UI atrocities so you don't have to interact with Scratch's default interface. |
| `language.js` | Tells Monaco how to highlight our DSL without crying. |
| `monaco.js` | Injects the VS Code editor into a kid's block-coding website. |
| `vm.js` | Acquires and wraps the internal Scratch VM object so we can violate its APIs. |
| `constants.js` | Constants. Because magic strings are for cowards. |
| `overlay.css` / `.html` | The injected styles and layout, cleanly extracted so we don't have to look at giant template strings anymore. |

---

## Documentation

**New? Start here:** [docs/getting-started.md](docs/getting-started.md) — a step-by-step tutorial from zero to a working program.

**Looking something up?** [docs/quick-reference.md](docs/quick-reference.md) — every function and keyword on one page.

### Full reference

| File | Contents |
|---|---|
| [docs/getting-started.md](docs/getting-started.md) | Tutorial: from zero to first program |
| [docs/quick-reference.md](docs/quick-reference.md) | All syntax and functions on one page |
| [docs/overview.md](docs/overview.md) | How the pipeline works |
| [docs/syntax.md](docs/syntax.md) | Tokens, operators, expressions |
| [docs/control-flow.md](docs/control-flow.md) | Hat blocks, loops, conditionals |
| [docs/motion.md](docs/motion.md) | Motion functions and reporters |
| [docs/looks.md](docs/looks.md) | Looks, costumes, effects |
| [docs/sound.md](docs/sound.md) | Sound functions |
| [docs/events.md](docs/events.md) | Events and broadcasting |
| [docs/scratchroutines.md](docs/scratchroutines.md) | Scratchroutines: concurrent tasks with launch, await, cancel, isRunning |
| [docs/sensing.md](docs/sensing.md) | Sensing, mouse, keyboard, time |
| [docs/variables-and-lists.md](docs/variables-and-lists.md) | Variables, lists, dot methods |
| [docs/math.md](docs/math.md) | Math functions and operators |
| [docs/custom-blocks.md](docs/custom-blocks.md) | Custom block definitions |
| [docs/linter.md](docs/linter.md) | Warnings, type checking, dead code detection, and configuring lint rules |
| [docs/examples.md](docs/examples.md) | Full example programs |

---

## File extension

Scratchpiler source files conventionally use `.sdsl`. There is no toolchain, no build step, no `package.json`. You just have a file.
