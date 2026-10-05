# The SLVM compiler

Every Scratchpiler compile runs through [SLVM](https://github.com/Scratchpiler/slvm), the Scratch Level Virtual Machine. The direct compiler and AST lowering have been removed. There is no backend setting; saved settings from earlier versions keep their editor preferences and ignore the retired backend preference.

```text
source → include expansion → tokenize → parse → irgen → legalize → slc → blocks → inject
```

## Source and API

Use `compileSource(source, vm, sprite)` or `compileSourceWithHeaders(source, vm, sprite)`. Both return `{ blocks, comments, errors }`; the header version also returns include metadata. An optional fourth argument takes `{ embedSource }`. `comments` is a list of `{ blockId, text }` that the injector attaches to the emitted blocks; see [comment-metadata.md](comment-metadata.md). Compilation does not depend on them. Compilation stops on errors before injection.

The frontend, source syntax, Monaco providers, headers and injector keep their existing interfaces. `src/compiler.js` handles tokenization, parsing, diagnostics and pointer helper insertion. `src/irgen.js` resolves source constructs into structured IR. `src/slvm-backend.js` connects that IR to the live project and emits Scratch blocks through SLVM.

## Runtime behavior

- Recursive returning calls keep values that must survive another call on a hidden stack.
- `break` and `continue` work in `for`, `pyfor`, `repeat`, `forever`, `while`, `until` and `do … while`. A `continue` runs the loop increment or condition recheck; a `break` skips it.
- `populateList` computes its value once per item after any requested clear, including values containing ternaries or returning calls.
- Variable reporters work in costume, sound and other menu inputs.
- A list used as a value emits Scratch's list reporter and follows Scratch's item joining rules.
- Scratchroutine arguments follow their declared parameter order.
- Hidden loop and temporary variables belong to the sprite, so clones have independent copies.
- Existing custom blocks are imported as external procedure signatures; calls use their real argument IDs.
- Pointer operations retain the `__heap` / `__ptab` layout. Failed compilation restores heap preparation and promotions.

## Pipeline and performance

Motion, looks, sound, pen and sensing use `sb` operations described by `ASM_OPCODES` and `SLVM_OPCODE_SCHEMA`. Variables, lists, arithmetic, calls and control flow use core IR operations. Syntax sugar is expanded during IR generation; returns, breaks and continues remain explicit until legalization.

The legalization pipeline runs `lower-ret`, `lower-break`, `rotate-cond`, `materialize-bool` and `spill`. It verifies after each pass, then `slc` verifies legal IR before emitting blocks. Values are materialized only when their uses or intervening effects require storage. Compiler variables retain recognizable names for the decompiler.

## Optimization

Compilation runs SLVM's `O1` pipeline by default: `inline`, `constfold`, `unroll`, `constfold`, `dce`, then the legalization passes. Pass `{ optimize: false }` to `compileSource` (or turn off Settings → Optimizations → Optimize compiled code) to run legalization alone.

- **Inlining** replaces a call to a small, non-recursive custom block with the block's body. A call such as `area(6, 7)` becomes `6 * 7`, which `constfold` then reduces to `42`. The definition stays in the project. A block is left as a call when it is recursive, has more than 24 operations, stops its own script, contains `forever`, has an early `return` that cannot be folded into an `if`/`else`, or is a `warp` block with loops being inlined into a script. The call is also left alone inside a loop condition. See [SLVM's inliner](../../slvm/docs/optimizations.md#1-inlining-returning-procs-then-folding--o1) for the full rules.
- **Unrolling** replaces a loop that has a constant trip count with copies of its body: `repeat 3 { … }`, or `for [i] from 1 to 4 { … }` with literal integer bounds, where each `[i]` becomes that iteration's number. It only happens inside `warp` and returning custom blocks, because a warp loop never yields. A loop in a script or in a plain custom block yields every iteration, so other scripts can run in between; removing those yields could be observed, and the compiler never does it. A loop stays when it has more than 16 trips, would grow past 40 operations, contains `break` or `continue`, or is marked `nounroll`. See [SLVM's unroller](../../slvm/docs/optimizations.md#1b-unrolling-counted-loops).
- **`noinline`** on a definition always keeps its calls (see [custom-blocks.md](custom-blocks.md#noinline)). The compiler's own helpers behind `clamp()`, `alloc()` and `free()` are always `noinline`, so they decompile back to the builtin.
- **Evaluation and scheduling are preserved.** Warp atomicity, argument evaluation order and Scratch's casts all survive inlining; the differential fuzzer and the real-VM tests check this.
- **Whole-program optimization** — see below.
- **Fallback.** If an optimized compile fails SLVM's own verification, the compiler retries without optimization and records the reason in `optimizerFallback` on the result. The fuzzer and tests assert it is always `null`, so a fallback means a compiler bug.

Inlining and unrolling change what Pull code from Scratch shows when no embedded source is available: an inlined body appears in its caller, and an unrolled loop appears as repeated statements, because blocks cannot be un-inlined or rolled back up. With source embedding on, an unedited script still comes back exactly as you wrote it. See [comment-metadata.md](comment-metadata.md).

### Whole-program optimization

SLVM sees one sprite at a time, so on its own it can never prove that a loop in a script is private: some other sprite might read the loop's variables between iterations. The editor's [project analysis](code-intelligence.md#across-sprites) can, and it hands SLVM two facts (`compileSource(…, { projectFacts })`, built by `slvmFacts()` in `src/project-analysis.js`):

- **confined variables**: variables and lists that only one script (plus the custom blocks only it calls) ever reads or writes, anywhere in the project, `attributeOf` included. A global counts only if that script can't run in several clones at once. Cloud variables never count. Hidden loop variables are confined when the code that owns them runs in one thread.
- **uninterrupted scripts and blocks**: code that no other script can stop or restart: nothing else broadcasts its message (and no broadcast uses a computed name), switches to its backdrop, or runs `stop all`, `stop other scripts in sprite` or `delete this clone` around it. A custom block qualifies when exactly one such script calls it.

With those, a constant loop in an uninterrupted script whose body only touches confined state (no motion, looks, sound, pen, waits, broadcasts or custom block calls) is unrolled like a loop in a `warp` block. No other script can see the difference in values; what changes is that the loop finishes in one scheduler step instead of one per iteration. A confined variable also never needs a spill temp around a yield, because nothing else can change it.

The facts are only used when they describe exactly what's in Scratch: the compiled text must match the analyzed text, and every other sprite's code must be unchanged since it was injected or decompiled. Otherwise the compile goes ahead without them and Output says why. Turn it off with Settings → Optimizations → Whole-program optimizations.

On the fuzzer's programs it removes about 1.4% of blocks. Real projects gain where they have small constant loops in scripts over private state; the CatOS, Paper Minecraft, physics-engine and Linux-emulator projects used for testing compiled to the same block counts, because their loops either draw or touch shared variables, which is exactly when unrolling would be visible.

## Restrictions

- An `on timer > …` or `on loudness > …` threshold must fit a reporter tree. Custom-block calls and ternaries in that threshold produce a source diagnostic.
- An `__asm__` reporter with a variable or list field used as a statement is unsupported, except for the supported `data_*` statement operations.
- SLVM diagnoses values with multiple uses across recursion and stack values inside loop conditions. Concurrent calls into a yielding procedure can still overwrite shared compiler temporaries; see [SLVM's spill limits](../../slvm/docs/ir.md#tree-safety-and-spill). Returning source procedures use warp mode, and scratchroutine parameters remain shared Stage variables.

The Names and arguments check flags unknown names and functions. Unknown bare expression names retain empty-slot behavior.

## Verification

Run `npm test` in Scratchpiler and SLVM. Install SLVM's development dependencies to enable the real headless Scratch VM tests.

`tests/slvm-backend.test.js` compiles every example through the public API and checks its runtime state against `tests/fixtures/example-results.json`. Those fixed results were captured from the previous default compiler before its removal, then corrected for the distance reporter opcode fix, using a seeded random generator, a virtual clock and 150 frames. Checks cover variables, lists, speech and sprite state. Separate tests cover recursive returns, loop exits, external procedures and expression thresholds.

The roundtrip and Blockly XML suites check recompilation, decompiler stability, named inputs and typed variable fields. Header tests cover expansion, diagnostics and include reconstruction.

`tests/fuzz/oracle.js` interprets source independently, using Scratch casting rules and the documented pointer allocator. The generated programs exercise control flow, lists, calls, recursion and pointers. The fuzzer compares SLVM output running in Scratch VM with this interpreter and exits unsuccessfully on compilation failures, runtime failures or mismatches:

```sh
node tests/fuzz/run.js --count 500 --out /tmp/scratchpiler-fuzz
node tests/fuzz/run.js --from 50000 --count 500 --feature recursion --feature breakInFor --feature continueInFor --feature pointers
```

`--project-facts` compiles each program with facts from the project analysis, so the fuzzer also covers unrolling inside scripts:

```sh
node tests/fuzz/run.js --count 2000 --project-facts --feature warpLoops --feature recursion --feature pointers
```

`tests/project-compile.test.js` checks which loops unroll (and which must not) with real analysis facts, and runs the result in scratch-vm.

Fixed seeds also run in `npm test`, and they assert that no program needed the optimizer fallback. The fixture results guard existing examples; the independent interpreter checks newly generated programs without retaining the removed compiler.

## Migration regressions

The expanded tests cover Scratch casts, Unicode and escaped strings, scientific notation, nested loop exits, recursive clamp arguments, malformed syntax, heap rollback, scalar/list name collisions, source diagnostics and browser settings migration. SLVM adds unusual literal matrices for both legalization and `constfold` / `dce`, verifier checks for duplicate declarations, and boolean slots in assembly and external procedures.

The bundled UI is initialized in jsdom with both old backend preferences. Settings controls and bundled compilation are exercised. This checks DOM setup and JavaScript behavior; it does not replace interactive testing of Monaco and Scratch's renderer in a browser.

Public project testing is reproducible:

```sh
node tests/projects/download.js /tmp/scratchpiler-projects
node tests/projects/run.js /tmp/scratchpiler-projects
```

The default corpus is Paper Minecraft, Appel and Massive Multiplayer Platformer by griffpatch. The runner records project attribution, block counts, missing variable references, compilation times and diagnostics. It verifies block wiring and stable compile/decompile round trips for every target. Downloaded project data stays outside the repository. Detached blocks appear as unsupported hat comments and are excluded from executable output. Missing variable IDs in the original project are provisioned in the test VM and listed in the report. These are structural tests; they do not claim full interactive game equivalence, asset rendering, audio or cloud multiplayer verification.

See [the migration verification report](verification.md) for measured results, exact seed ranges and the fixes discovered during testing.
