# The SLVM backend

Scratchpiler has two compilers. The **classic** backend is the one it has always had: `compile()` in `src/compiler.js` turns your syntax tree straight into Scratch blocks. The **SLVM** backend goes through [SLVM](https://github.com/Scratchpiler/slvm), the Scratch Level Virtual Machine. Your code becomes a small intermediate representation (IR) first. That IR is checked, legalized and only then turned into blocks.

It is **experimental** and **off by default**. To turn it on: Settings (`Ctrl+,`) → **Compiler** → **Backend** → **SLVM (experimental)**. The setting applies the next time you compile.

---

## Why you might want it

| | Classic | SLVM |
|---|---|---|
| `return fib(n - 1) + fib(n - 2)` | **wrong**: `fib(10)` gives `5`. Each call site has one hidden variable for its result, and the recursive call overwrites the outer one's | `fib(10)` gives `55`. A result that has to survive a recursive call is kept on a hidden stack list |
| Hidden variables for call results | one per call site, always | only where the next call would overwrite a result before it is read |
| `break` / `continue` inside `for`, `pyfor`, `do … while` | error (`continue` in `do … while` works) | works: the increment, or the `while` re-check, still runs after `continue` |
| `populateList(...)` value with `?:` or a returning call | the value is computed **once, before the list is cleared**, while a plain value is computed once per item after the clear | always computed once per item, after the clear |
| `switchCostume([name])`, `playSound([s])` and other menus with a variable | the variable is ignored and the menu is left empty | the variable is placed in the menu slot, the way Scratch's editor allows |
| `[myList]` used as a value | a `data_variable` block pointing at the list | Scratch's real list reporter (items joined by spaces, or with nothing between them if every item is one character) |
| `launch r(a, b)` | arguments are matched to parameters alphabetically by name | arguments are matched in the order the routine declares them |
| hidden loop and temp variables | created on the stage (shared by every sprite and clone) | created on the sprite, so each clone has its own |
| `on timer > [limit] * 2` | works | works (the threshold becomes a reporter inside the hat) |
| calling a custom block that only exists as blocks in the sprite | works (looks up the prototype) | works (the same lookup, through an `extern` proc in the IR) |
| pointers: `&[x]`, `*p`, `alloc`/`free` | works | works, with an identical heap layout |

Everything else is meant to behave **exactly** like the classic backend. That is tested two ways: every example program, and thousands of randomly generated programs, run under both backends in a real headless scratch-vm and checked against a reference interpreter (see [Testing](#testing) and [Fuzzing](#fuzzing)).

## What it can't do yet

Reported as errors that name the backend:

- **A custom-block call or a ternary inside an `on timer > …` threshold.** A hat can only hold a single reporter.
- **An `__asm__` reporter opcode with a variable or list field used as a statement** (other than the `data_*` statement opcodes, which work).

Unknown bare names (`say(foo)` where `foo` is not a variable, parameter, enum or reporter) and unknown functions leave the slot empty, exactly like classic. The Names and arguments check in the editor flags them.

---

## How it works

```
source ─► tokenize ─► parse ─► irgen ─► SLVM: legalize ─► slc ─► blocks ─► inject
                               (src/irgen.js)               (slvm)
```

1. **irgen** (`src/irgen.js`) walks the same syntax tree the classic backend uses and builds an SLVM module: one `stage` target and one `sprite` target, with variable declarations, `proc`s for `define` blocks and `script`s for hats.
   - **Data, control and arithmetic** become core IR ops (`var.set`, `list.add`, `if`, `until`, `add`, `call`, `ret`, …), which SLVM understands and can optimize.
   - **Everything else** (motion, looks, sound, pen, sensing) becomes an `sb` op: a Scratch opcode with named inputs. `slc` lays those out using the same `ASM_OPCODES` table that `__asm__` uses, plus a few extra entries in `SLVM_OPCODE_SCHEMA`.
   - **Sugar** is expanded the way `compile()` expands it: `for`, `pyfor`, `.sort()`, `.sum()`/`.min()`/`.max()`/`.count()`, `populate`, `match`, `do … while`, ternaries, scratchroutines, `breakpoint`. The algorithms are the same, and the hidden variables use the same `_scratchpiler_internal_<4 chars>_…` names, so the decompiler re-sugars them.
   - **`return`, `break` and `continue` stay as IR ops.** SLVM lowers them itself, instead of `lower.js` doing it on the syntax tree.
   - **A round value in a boolean slot** (`if [flag] { }`) becomes a `truthy` op. Its block form is the reporter itself, placed directly in the slot, exactly as the classic backend does.
2. **`legalize`** (SLVM) lowers returns, `break`/`continue`, loop conditions that call custom blocks, and boolean literals. It then decides which values need a hidden variable at all (see SLVM's `docs/ir.md`, "Tree-safety and spill").
3. **slc** (SLVM) emits blocks in scratch-vm's in-memory format: the same format the classic backend produces and the injector consumes. Variable and broadcast ids are looked up in the live project; anything new is created on the stage or the sprite before injection.

The glue is `src/slvm-backend.js` (`compileWithSLVM`), which connects irgen to the live VM and runs the SLVM pipeline. `compileSource(source, vm, sprite, { backend: 'slvm' })` selects it; the default is `'classic'`.

SLVM is an npm dependency (`"slvm": "file:../slvm"` while both repositories sit side by side). esbuild bundles it into `scratchpiler.user.js` like any other import.

---

## Testing

`tests/slvm-backend.test.js`:

- **Every example compiles and behaves the same.** Each example (including `pointers-linkedlist`, `include-demo` with its header, and `unsafe-asm`) is compiled by both backends into a mock project. Both results are loaded into a real headless **scratch-vm** (via `slvm/testing`) and run from the green flag for 150 frames, on a virtual clock and with a seeded `Math.random`. Visible variables, lists, speech bubbles and sprite state must be identical.
- **Decompiler round trip.** SLVM output for every example decompiles to source that the classic backend compiles without errors. `unsafe-asm` is excluded, because its opcodes don't exist.
- **Targeted cases:** recursion (`fib(10) = 55`), `continue`/`break` in `for` and `do … while`, a round reporter in a boolean slot, an existing custom block called without its definition, and an expression threshold on `on timer >`.

The VM-based tests skip themselves when `slvm/testing` or its scratch-vm dev dependency isn't installed.

One thing the VM tests found: the classic backend gives a new broadcast message an id but never creates its `broadcast_msg` variable. In the browser, Blockly creates it when the block is rendered. A headless VM has no Blockly, so the test harness creates any missing broadcast variables for both backends, and the SLVM backend creates them itself.

## Fuzzing

`tests/fuzz/` is a differential fuzzer with three independent judges:

- `generate.js` writes random, always-terminating Scratchpiler programs from a seed:
  - nested `if`/`else`, `repeat`, `for`, `while` (sometimes with custom-block calls in the condition), `do … while`, `match`, `break`/`continue`, ternaries;
  - arithmetic, string and boolean expressions;
  - list statements, `pyfor`, `.sort()`, `.sum()`/`.min()`/`.max()`/`.count()`, `populateList`, `.indexOf()`;
  - returning custom blocks used inside expressions, and a plain custom block.

  Feature flags add recursion (well-founded: base case at `x < 1`, depth capped by `mod 5`), `break`/`continue` in `for`, and pointers (`&`, `*`, `alloc`/`free`). Classic gets the first two wrong or rejects them.
- `oracle.js` is a reference interpreter for Scratchpiler source. It evaluates the syntax tree directly with Scratch's casting rules (from `slvm`'s `cast.js`), with no blocks involved. For pointers it models `__heap`/`__ptab` and runs Scratchpiler's real allocator source (`PTR_HELPERS_SRC`). Its `.sort()` is a port of the same shell sort, so ties between items that compare equal land in the same order.
- `run.js` compiles every program with both backends, runs both in scratch-vm and compares all three results.

```
node tests/fuzz/run.js --count 500 --out /tmp/fuzz
node tests/fuzz/run.js --from 50000 --count 500 --feature recursion --feature breakInFor --feature continueInFor --feature pointers
```

`tests/fuzz.test.js` runs 25 fixed seeds as part of `npm test`, in about a second.

To check that the oracle can actually catch a bug, I temporarily made its `mod` compute division instead; 23 of 40 programs were then flagged under both backends.

### Results

| Batch | Programs | SLVM ≠ oracle | Classic ≠ oracle | Classic can't compile | Blocks, classic → SLVM |
|---|---|---|---|---|---|
| default features, before list sugar was added | 3,000 | **0** | 0 | 0 | 848,291 → 815,403 (−3.9%) |
| default features (incl. list sugar, calls in loop conditions) | 3,300 | **0** | 24 | 0 | 1,300,332 → 1,267,741 (−2.5%) |
| + recursion, `for` break/continue | 2,000 | **0** | 132 | 542 | 446,164 → 430,419 (−3.5%) |
| everything, incl. pointers | 2,100 | **0** | 97 | 400 | 923,039 → 900,457 (−2.4%) |
| **total** | **10,400** | **0** | 253 | 942 | |

Every one of the 253 classic failures has one of two causes, checked by pattern for each saved program:

- **226 × recursion.** Every one is a custom block that calls itself twice in one expression (`f(x - 1) + f(x - 2)`). `lower.js` gives each call site a single hidden variable for its result, so the inner call overwrites the outer one's.
- **44 × `populateList`** whose value contains a ternary or a returning call. `lower.js` hoists that expression in front of the statement, so it is evaluated once, before the list is cleared. A plain value is evaluated once per item, after the clear. (17 programs have both causes.)
- **942 × compile errors**, all "`break`/`continue` is only supported inside `forever`/`repeat`/`while`/`until`/`do` loops (not `for`/`pyfor`)".

The fuzzer also found a bug that affected **both** backends: `populateList` / `populateArray` were missing from the keyword list in `src/constants.js`, so `populateList([L], 0, 3, true)` was parsed as a call to an unknown custom block and always failed with "Custom block not found: populateList". The documented feature never worked. It is fixed, and `tests/regressions.test.js` covers it.
