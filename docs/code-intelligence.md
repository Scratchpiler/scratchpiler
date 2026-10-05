# Code Intelligence

Scratchpiler ships a real semantic analyzer (`src/analyzer.js`). On every edit (350ms debounce), your source is parsed once into an AST, a symbol table is built from it, and every editor feature below reads from that single shared analysis. The editor knows what your code *means*, not just what it looks like — which, depending on your code, may be more than you know.

---

## What gets tracked

The analyzer builds symbols for everything the DSL itself declares:

| Symbol | Declared by | Scope |
|---|---|---|
| Custom block | `define name(params) { }` | whole file |
| Scratchroutine | `scratchroutine name(params) { }` | whole file |
| Parameter | `define` / `scratchroutine` param list | that block's body |
| Loop variable | `for [i] from … to …`, `pyfor [item] in [list]` | that loop's body |
| Enum constant | `enum { NAME = value }` | whole file |
| Struct + fields | `struct player { x, y }` | whole file |

Scratch project variables and lists are tracked too (via the live VM index), but they *live in Scratch* — the analyzer resolves names against them with the same precedence the compiler uses: loop variable → parameter → project variable. If the analyzer and the compiler ever disagree about what a name means, that's a bug; they read from the same rulebook.

---

## Go to definition

**F12** or **Ctrl/Cmd+click** on any call, parameter, loop variable, enum constant, or struct field jumps to where it was declared. Works on:

- `myBlock(1, 2)` → its `define`
- `launch anim(5)` / `await anim(5)` / `cancel anim` → the `scratchroutine`
- `[dx]` inside a define body → the parameter in the signature
- `SPEED` → the enum entry
- `[player.x]` → the field in the `struct` declaration

## Find all references & highlight

**Shift+F12** lists every use of a symbol. Just parking the cursor on one highlights all of its occurrences in the file, definition included. For Scratch variables, lists and broadcast messages the list covers **every sprite** (see [Across sprites](#across-sprites)).

## Rename (F2)

Renames a symbol and all of its uses in one edit. Bracketed uses stay bracketed (`[i]` → `[index]`), struct field renames rewrite every `[player.x]` to `[player.newName]`.

What you **can** rename: defines, scratchroutines, parameters, loop variables, enum constants, structs and their fields — anything whose name lives in your source file.

Scratch variables, lists and broadcast messages can be renamed too, once the project analysis has finished. F2 renames the variable or message **in Scratch** and rewrites every use in every sprite, including sprites you haven't opened and `attributeOf("score", …)` strings. Each sprite's edit can be undone in that sprite. A `switchBackdrop("Welcome")` is not touched when you rename the message `"Welcome"`: it's a backdrop name that happens to match.

## Semantic highlighting

On top of the regular syntax colors, the analyzer colors identifiers by what they *are*:

| Token | Color | Meaning |
|---|---|---|
| Parameter | orange | `[dx]` inside its define |
| Loop variable | purple | `[i]` inside its loop |
| Define / routine call | blue | `myBlock(…)`, `launch anim(…)` |
| Enum constant | cyan | `SPEED` |
| Struct name | yellow | `player` in the declaration |
| Struct field | green | `x, y` fields and `[player.x]` uses |
| Unknown name | red underline | a name that resolves to nothing |

A `[score]` that isn't a parameter, loop variable, or project variable gets the red underline before you ever hit compile.

## Scope-aware completions

Completions know where your cursor is:

- Typing `[` inside a define offers its parameters first, then struct fields, then project variables and lists.
- Loop variables are only offered inside their loop. `[i]` will not haunt you at the top level.
- Enum constants, `define` call snippets with parameter placeholders, and `launch`/`await` snippets for your scratchroutines all appear in the general list.
- After `launch `, `await ` or `cancel ` only scratchroutines are offered (no more `launch launch anim()`), and `#include <` lists your saved headers.
- After a `define` parameter list, `returns`, `warp` and `noinline` are offered (only the ones you have not typed yet). After the header of a `repeat` or `for`, `nounroll` is offered. They are offered nowhere else.
- Compiler variables (`_scratchpiler_internal_…`, `__heap`, `__ret_…`) are never suggested.
- Nothing pops up inside `//` comments, and words from the file no longer pad the list.

**Tab chains the next step.** Accepting a snippet lands you in its first slot and immediately opens the right popup: a string slot (`play("`, `on receive "`) lists sounds or broadcasts, a `[` slot lists variables, an argument slot shows signature help. Items match on the bare name, so `goTo` finds both `goTo(x, y)` and `goTo("sprite")`. The editor remembers what you picked last and preselects it next time.

## Signature help & hover

Hovering `warp`, `noinline` or `nounroll` explains what each does. Signature help (and hover docs) now cover *your* blocks, not just the built-ins: type `myBlock(` and the parameter list from your `define` shows up, current argument bolded.

---

## Semantic diagnostics

Warnings that require actually understanding the file (toggle: **Semantic checks** in Settings):

| Check | Example complaint |
|---|---|
| Unknown block call | Unknown block `mvoe2` — did you mean `move2`? |
| Wrong argument count | `move2` takes 2 arguments, got 1 |
| Unknown scratchroutine | `launch missingRoutine(…)` |
| Unknown identifier | `SPEDE` — did you mean `SPEED`? |
| Undefined `[variable]` | not a param, loop var, struct field, or project variable |
| Shadowing | a parameter named the same as a project variable (the local wins — the linter just wants you to *know*) |
| Duplicate declarations | two defines with one name, duplicate enum entries |

## Code smells

Style opinions, delivered as blue Info squiggles (toggle: **Code smells** in Settings). None of these block compilation; all of them are right:

| Smell | Why it's flagged |
|---|---|
| Unused define / scratchroutine | declared, never called, launched, awaited, or cancelled |
| Unused parameter / loop variable | never read in its body |
| Busy-wait | `forever { if (…) { } }` with no `wait` — `wait until (…)` exists and is cheaper |
| Empty body | `forever { }`, empty `if`, empty loop |
| Dead `set` | `set [x] to 5` immediately overwritten by another `set [x]` |
| Magic number | the same non-trivial literal 3+ times — make it an `enum` constant |
| Deep nesting | control flow more than 4 levels deep — extract a define |

Messages are short on purpose: one line in the Problems panel, with the details in the hover.

---

## Across sprites

When the overlay opens, Scratchpiler reads every sprite (decompiling the ones you haven't opened, with a progress bar) and links them. After that only the sprite you edit is re-read, so the cross-sprite features cost a few milliseconds per edit even on 17,000-block projects. See [editor.md](editor.md#project-analysis).

### Broadcasts

- `broadcast("go")` shows a faint **`3 listeners`** after it, and `on receive "go"` shows **`sent from 2 places`**. Hover either for the sprite names. Message names match the way Scratch matches them, ignoring case.
- **F12** on a broadcast jumps to its receivers (a peek list if there are several); on an `on receive` it jumps to the senders. **Shift+F12** lists both.
- **F2** renames the message everywhere, in Scratch too.

### Variables and lists

- Hovering `[score]` shows whose it is and who uses it: *Written by Player (3), Stage · Read by HUD*.
- **Shift+F12** lists every read and write in every sprite. **F12** lists just the writes.
- **F2** renames it in Scratch and in every sprite.

### Symbol search

`Ctrl+T` (or `#` in the palette) searches every `define`, scratchroutine, `on …` script, enum constant and struct in the project, opened or not.

### Project checks

Toggle: **Project checks** in Settings → Checks.

| Check | Example | Severity |
|---|---|---|
| Nobody listens | Nothing receives "typo" | warning |
| Nobody sends | Never runs — nothing broadcasts "never" | warning |
| Nothing clones | Never runs — nothing clones this sprite (on `on clone`) | warning |
| Unknown sprite | No sprite named "Ghost" (in `goTo`, `touching`, `createClone`, `xOf`, `attributeOf`…) | warning |
| Unknown sprite variable | "Enemy" has no variable "hp" (in `attributeOf`) | warning |
| Green-flag ordering | May read `[level]` before the Stage sets it on green flag | warning |
| Conflicting starts | `[mode]` is also set by Player on green flag — the order decides | warning |
| Wait cycle | Never finishes — waits on "pong", which waits back | warning |
| Write-only | `[log]` is never read (the writes are faded) | hint |
| Never set | `[speed]` is never set — it keeps its saved value | hint |
| Unused | `[old]` is never used (in the Problems panel's Project group) | hint |

How they avoid crying wolf:

- **Ordering** checks only look at one-shot events: the green flag, a key, a click, a backdrop, and messages that are never broadcast from inside a loop or a custom block. A message broadcast every frame (a game loop's `"tick"`) runs its receivers in an order the project is built around, so they're left alone. Only the part of each script that runs before its first wait or loop iteration counts, which is where "who goes first" decides the outcome. Two scripts that end on the same value don't conflict.
- **Dead variable** checks skip cloud variables, compiler variables, and anything with a monitor showing on the stage (the user can see or change it). They switch off while any sprite has a syntax error, or if the project uses `__asm__`, since either can hide a use.
- A broadcast with a computed name (`broadcast(join("level", [n]))`) could be sending anything, so receivers are never called dead while one exists.

Tested against real projects: CatOS, Paper Minecraft (30 sprites, 17k blocks), a 2D physics engine and the Linux RISC-V emulator. Every finding was checked against the source, for example a `broadcastAndWait("init1a")` with no receiver, a `repeat until [Battery %] = 0` that can run before another flag script resets the battery, and debug variables that are set but never read.

---

## Architecture note

`src/analyzer.js` is pure analysis (no Monaco imports): symbol table, scopes, occurrence index (with read/write access for Scratch variables), diagnostics, semantic-token extraction, and a per-model cache keyed on document version + sprite + project index. One parse per edit feeds everything.

Project-wide analysis sits on top, in three layers:

- `src/project-facts.js` (pure) turns one sprite's analysis into facts: its scripts and custom blocks, what each one sends, receives, clones, stops, reads and writes, with source spans.
- `src/project-analysis.js` (pure) links every sprite's facts: message and variable indexes, the project checks, the event graph, symbol search, rename edits, and `slvmFacts()` for the compiler. Facts that only depend on one sprite (a script's effects through the blocks it calls, its first segment for ordering checks) are cached per script, so re-linking after an edit is a few milliseconds.
- `src/project-service.js` (browser) keeps it current: it decompiles unopened sprites in the background (time-sliced, with progress), re-reads only the sprite you edit (reusing the editor's analysis rather than parsing twice), re-decompiles sprites whose blocks change in Scratch (detected with a block fingerprint), and re-analyzes in chunks when variables are added or renamed.

`src/semantic-providers.js` is the Monaco adapter: definition, references, highlight, hover, inlay hints, rename and semantic tokens. Every sprite model has a `scratchpiler:/sprite/<name>` URI, so cross-sprite locations open the right tab. `src/event-flow.js` draws the event graph, and `src/problems-view.js` renders the Problems panel.
