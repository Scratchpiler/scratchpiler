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

**Shift+F12** lists every use of a symbol. Just parking the cursor on one highlights all of its occurrences in the file, definition included.

## Rename (F2)

Renames a symbol and all of its uses in one edit. Bracketed uses stay bracketed (`[i]` → `[index]`), struct field renames rewrite every `[player.x]` to `[player.newName]`.

What you **can** rename: defines, scratchroutines, parameters, loop variables, enum constants, structs and their fields — anything whose name lives in your source file.

What you **cannot** rename: Scratch project variables and lists. Their names live in the Scratch project, not in your text; a text-only rename would just make your code refer to a variable that no longer matches anything, and the compile would break. Rename those in the Scratch UI. The editor will tell you this, politely, every time you try.

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

## Signature help & hover

Signature help (and hover docs) now cover *your* blocks, not just the built-ins: type `myBlock(` and the parameter list from your `define` shows up, current argument bolded.

---

## Semantic diagnostics

Warnings that require actually understanding the file (toggle: **Semantic checks** in Settings):

| Check | Example complaint |
|---|---|
| Unknown block call | `mvoe2(1, 2)` — not a built-in, define, or scratchroutine |
| Wrong argument count | `move2` takes 2 argument(s) (dx, dy) — got 1 |
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
| Orphaned broadcast | `broadcast("msg")` with no `on receive "msg"` in this file (fine if another sprite listens — the linter can only see one file) |

---

## Architecture note

`src/analyzer.js` is pure analysis (no Monaco imports): symbol table, scopes, occurrence index, diagnostics, semantic-token extraction, and a per-model cache keyed on document version + sprite + project index. `src/semantic-providers.js` is the thin Monaco adapter that registers definition/references/highlight/rename/semantic-token providers on top of it. One parse per edit feeds everything.
