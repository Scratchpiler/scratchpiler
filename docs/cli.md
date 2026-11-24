# Scratchpiler CLI

Compile, check, unpack, format, inspect, and watch local `.sdsl` projects from the terminal.

## Quick start

```sh
npx scratchpiler init my-game
cd my-game
npx scratchpiler check
npx scratchpiler build
```

Or unpack an existing `.sb3`:

```sh
npx scratchpiler unpack path/to/project.sb3 my-project
cd my-project
npx scratchpiler check
npx scratchpiler build
```

## Project layout

The CLI uses the same directory layout as `scratchpilerd`:

- `Stage.sdsl` — Stage scripts
- `<SpriteName>.sdsl` — one file per sprite (special filename characters `<>:"/\|?*` and `%` are `%XX`-encoded, e.g. `Bot%3A1.sdsl`)
- `headers/*.h` or `include/*.h` or `*.h` — shared `#include <name.h>` libraries
- `project.json` or a single `*.sb3` — base Scratch project supplying sprites, costumes, sounds, variables, and lists
- `scratchpiler.json` (optional) — manifest overriding paths and defaults:

```json
{
  "project": "base.sb3",
  "out": "dist/game.sb3",
  "opt": 1,
  "headers": ["shared"],
  "sprites": {
    "Player": "src/player.sdsl"
  }
}
```

## Commands

| Command | Purpose |
|---|---|
| `scratchpiler check [dir]` | Parse, type-check, lint, validate headers, run cross-sprite checks, and verify SLVM compilation |
| `scratchpiler build [dir]` | Compile all sprites into an `.sb3` (or `project.json`) artifact |
| `scratchpiler unpack <sb3\|json> [dir]` | Decompile an existing Scratch project into `.sdsl` files and `scratchpiler.json` |
| `scratchpiler init [dir]` | Create a starter project with `base.sb3`, `Stage.sdsl`, `Sprite1.sdsl`, and `headers/utils.h` |
| `scratchpiler fmt [paths...]` | Format `.sdsl` and `.h` files (`--check` for CI, `--stdout` for pipe) |
| `scratchpiler watch [dir]` | Watch `.sdsl` and `.h` files and rebuild automatically |
| `scratchpiler info [dir\|sb3]` | Print sprites, variables, headers, and broadcast graph (`--json` supported) |

## Useful flags

- `-O0` / `-O1` / `-O2` / `-O3` (`--opt`): SLVM optimization level (default `1`)
- `-f, --format pretty|compact|json` (or `--json`): diagnostic and build output format
- `--smells`: include code-smell hints (unused defines, magic numbers, busy-waits)
- `--deny-warnings`: treat warnings as errors (exit `1`)
- `--no-project-lint`: skip cross-sprite broadcast/race checks
- `--no-whole-program`: skip cross-sprite confinement optimization facts
- `--color auto|always|never` (`--no-color`): control ANSI colors (`NO_COLOR` is respected)
