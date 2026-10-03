# The SLVM compiler

Every Scratchpiler compile runs through [SLVM](https://github.com/Scratchpiler/slvm), the Scratch Level Virtual Machine. The direct compiler and AST lowering have been removed. There is no backend setting; saved settings from earlier versions keep their editor preferences and ignore the retired backend preference.

```text
source → include expansion → tokenize → parse → irgen → legalize → slc → blocks → inject
```

## Source and API

Use `compileSource(source, vm, sprite)` or `compileSourceWithHeaders(source, vm, sprite)`. Both return `{ blocks, errors }`; the header version also returns include metadata. Existing callers that pass an obsolete fourth argument still use SLVM. Compilation stops on errors before injection.

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

Optimization passes such as `constfold` and `dce` remain available in SLVM, but are not enabled in Scratchpiler's default pipeline. This migration preserves evaluation and scheduling behavior while changing the compiler architecture.

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

Fixed seeds also run in `npm test`. The fixture results guard existing examples; the independent interpreter checks newly generated programs without retaining the removed compiler.

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
