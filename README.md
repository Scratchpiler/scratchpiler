# scratchpiler

A text-based DSL that compiles directly into Scratch's block VM. Because sometimes you want to write a platformer without playing Tetris with puzzle pieces first.

---

## What it is

Scratchpiler lets you write Scratch programs in a real text editor (Monaco, the one from VS Code), then injects the compiled blocks directly into the running Scratch project. You can also decompile existing Scratch scripts back into scratchpiler source. It's not magic — it's just a Tampermonkey userscript doing unspeakable things to the Scratch VM.

The language maps 1:1 with Scratch's block palette. Every statement, every reporter, every hat block has a text equivalent. The goal isn't to replace Scratch; it's to give programmers a faster path to the same output.

---

## Requirements

- [Tampermonkey](https://www.tampermonkey.net/) (Chrome) or [Violentmonkey](https://violentmonkey.github.io/) (Firefox/Chrome)
- A modern browser
- A Scratch account, or at least an open project at `scratch.mit.edu/projects/*/editor`
- The ability to tolerate a DSL that uses `camelCase` for everything

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

1. Select a sprite from the dropdown in the toolbar
2. Type (or paste) your script
3. Press **Ctrl+Enter** (or click **Compile & Inject**)
4. Watch the blocks appear in Scratch

Blocks are injected into the selected sprite. Variables must already exist in Scratch — scratchpiler resolves them by name, not by wishful thinking.

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
- **Control flow** — `if/else`, `repeat`, `forever`, `while`, `repeat until`, `for` loops
- **Math & trig** — `abs`, `sqrt`, `floor`, `sin`, `cos`, `clamp`, `random`, and more (Scratch uses degrees, not radians, and so does scratchpiler)
- **String operators** — `join`, `letterOf`, `contains`, `.length()`
- **List dot-methods** — `[list].item(i)`, `[list].contains(val)`, `[list].indexOf(val)`
- **Compound assignment** — `[x] += 1`, `[x] *= 2`
- **Custom blocks** — `define myBlock(param1, param2) { ... }`
- **Hex color literals** — `#ff6600`
- **Linter** — warns about dead code and orphaned blocks before you compile
- **Decompiler** — import existing Scratch scripts back as text
- **Per-sprite persistence** — each sprite's code is saved independently to `localStorage`
- **Hover docs** — hover a function name to see its signature
- **Autocomplete** — full Monaco IntelliSense for all functions, variables, and costumes

---

## Documentation

| File | Contents |
|---|---|
| [docs/overview.md](docs/overview.md) | How the pipeline works |
| [docs/syntax.md](docs/syntax.md) | Tokens, operators, expressions |
| [docs/control-flow.md](docs/control-flow.md) | Hat blocks, loops, conditionals |
| [docs/motion.md](docs/motion.md) | Motion functions and reporters |
| [docs/looks.md](docs/looks.md) | Looks, costumes, effects |
| [docs/sound.md](docs/sound.md) | Sound functions |
| [docs/events.md](docs/events.md) | Events and broadcasting |
| [docs/sensing.md](docs/sensing.md) | Sensing, mouse, keyboard, time |
| [docs/variables-and-lists.md](docs/variables-and-lists.md) | Variables, lists, dot methods |
| [docs/math.md](docs/math.md) | Math functions and operators |
| [docs/custom-blocks.md](docs/custom-blocks.md) | Custom block definitions |
| [docs/linter.md](docs/linter.md) | Warnings and dead code detection |
| [docs/examples.md](docs/examples.md) | Full example programs |

---

## File extension

Scratchpiler source files conventionally use `.sdsl`. There is no toolchain, no build step, no `package.json`. You just have a file.
