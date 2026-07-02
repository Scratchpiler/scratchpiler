Looking up some abstraction layers from the Scratch VM, we realize that the Scratch programming language is an ISA (Instruction Set Architecture) that is Turing-complete. That means, we could, in theory, write any program that can be written into Python, C++ or C in Scratch via Blocks. Similarly, Scratch blocks could be abstracted to "assembly" or, more simply, "bytecode".

The execution hardware that the Scratch ISA runs on has rather specific hardware specifications. The Scratch processor has a clock speed of $34Hz$, which implies that a singular loop will only be executed (evaluated) 34 times, without a `wait()` statement. However, Scratch appears to be able to support Massively Parallel computing. It's paralellization capabilities are best generalized with the following expression:
$$T=M\times (C+S)$$

Where:

- $T$ is the total amount of threads executed in "parallel" by the Scratch VM
- $M$ is the amount of scripts that are in a Sprite or clone ($M>0$)
- $C$ is the amount of clones in total, where $300\geq C\geq 0$
- $S$ is the amount of sprites in the project, where $S>0$

It is trivial to notice that, even though $C$ is bounded to 300, $S$ can be any arbitrarily large integer. This means that $T$ is, in consequence, unbounded.

However, the above description is rather inaccurate and fails to account for a multitude of values and usage cases. We will now derive a generic formula applicable to all Scratch projects.

First, we will need to quantify the project's state at any given tick (frame) of execution. Our variables are as follows: 
- $S$: the set of all distinct object classes in the project (this includes all Sprites and the Stage)
- $s$: a specific Sprite (or Stage) within the set $S$
- $c(s)$: The current number of living clones for Sprite $s$
- $N(s)$: The total number of active instances of Sprite $s$. Because every Sprite always has one original instance, this is defined as $N(s) = 1 + c(s)$. (Note: For the Stage, $c(\text{Stage}) = 0$, so $N(\text{Stage}) = 1$)
- $E$: The set of all distinct events triggered during the current execution frame
- $e$: A specific event within set $E$
- $h(s, e)$: The number of Hat Blocks in the code of Sprite $s$ that are designed to trigger in response to event $e$.

When an event $e$ occurs, Scratch searches every active instance in the project to see if it has a Hat Block matching $e$. If it does, a new thread is spawned.

For a single Sprite $s$ and a single event $e$, the number of threads created is the number of instances multiplied by the number of matching Hat Blocks:

$$T_{s,e} = N(s) \times h(s,e)$$

Substituting our clone definition, we get

$$T_{s,e} = (1 + c(s)) \cdot h(s, e)$$

Now, in order to find the total number of new threads spawned ($T_{spawned}$) across the project by all events in a single given frame, we sum this across all Sprites in $S$ and all events in $E$:

$$T_{spawned} = \sum_{e \in E} \sum_{s \in S} \left( (1 + c(s)) \cdot h(s, e) \right)$$

**However**, the formula above only accounts for *newly created threads*. However, Scratch's execution engine keeps threads alive across multiple frames if they hit a yielding block (like wait $n$ seconds, glide to ($x$, $y$), say for $n$ seconds, or a forever/repeat loop).

To find the absolute total number of parallel threads ($T_{total}$) running at any arbitrary moment in time $t$, we must add the persistent threads to the newly spawned threads.

Let: 
- $R$ be the set of all previously running threads from past frames that are currently yielding (aka, waiting) and have not yet reached the end of their execution lifecycle (that is, the end of their script, or a `Stop This Script` block).
- $|R|$ as the total count (cardinality) of these yielding threads.

The generalized mathematical expression for the total number of parallel execution threads in a Scratch project at any given frame is:

$$T_{total} = |R| + \sum_{e \in E} \sum_{s \in S} \left( (1 + c(s)) \cdot h(s, e) \right)$$

However, when we apply this to real-world Scratch projects, the following two points should be kept in mind:

1. Run without screen refresh (Custom Blocks): If a thread enters a custom block checked to "Run without screen refresh", it does not create a new thread. It forces the current thread to monopolize the engine's execution time, refusing to yield until the custom block finishes (or until Scratch's half-second failsafe timeout catches it).

2. "When I Start as a Clone" blocks: If the event $e$ is "clone created", the math slightly changes for that specific event. The original Sprite does not respond to it, so the multiplier for that specific hat block is strictly $1$ (applied only to the newly birthed clone), not $1 + c(s)$.

---

The above formulae shows that Scratch projects are indeed capable of parallel execution and even Single Instruction, Mutliple Data (or, if leveraging the Broadcast blocks, Multiple Instruction, Multiple Data). However, the vast majority of Scratch projects do not tap into the execution capabilitties of the execution engine. And we as the compiler should, at a bare minimum, attempt to optimize our user's DSL code.

---

## Where Scratch as an ISA falls short, and what our DSL does about it

Having established Scratch's execution model (its "hardware"), we now turn to its "instruction set" — the block palette itself — and catalog where it is deficient as a target for writing real programs. Scratchpiler exists to compile a more expressive source language down into this restricted ISA, in much the same spirit as a C compiler targeting a RISC machine: the source language gets abstractions the hardware doesn't have, and the compiler is responsible for lowering them faithfully (or at least loudly failing when it can't).

### No procedures with return values

Scratch's "My Blocks" (custom blocks) are call-by-value procedures with no return channel. There is no `procedures_return` opcode. Any custom block that needs to produce a result must smuggle it out through a variable that survives past the call.

Scratchpiler's `define name(params) { ... }` blocks compile to `procedures_definition`/`procedures_prototype`/`procedures_call`, matching Scratch's own shape, but "returning" a value is implemented as an implicit global output-variable convention (see `docs/custom-blocks.md`). This is a leaky abstraction by necessity — there is no way to lower a return statement into an opcode that does not exist — but it at least gives the DSL author `return`-shaped syntax instead of hand-rolled plumbing.

A related consequence: recursion works (a `procedures_call` block can appear inside its own definition), but nothing in the Scratch VM guards the call stack. Scratchpiler does not currently insert a recursion-depth check either, so a source-level infinite recursion bug degrades from "stack overflow exception" (the diagnosable C++ failure mode) to "tab freezes" (the undiagnosable Scratch failure mode). This is arguably the single biggest gap between the DSL's ergonomics and the guarantees a real language would give you.

### No local scope

Every variable in Scratch is either global-to-the-project or local-to-a-sprite; there is no block-level or call-frame-level scoping. A custom block's body sees every variable the sprite can see. This means two calls to the same custom block, or two different custom blocks that happen to reuse a variable name, can clobber each other's state with no compiler diagnostic — Scratch has no notion of shadowing to even detect the collision.

Scratchpiler's `struct` and `enum` sugar partially route around this rather than solving it: a `struct player { x, y, hp }` lowers to flat globals like `player.x`, `player.y`, `player.hp` at compile time (zero runtime cost, since it's pure name-mangling), and `enum` values are inlined as constant literals rather than allocated as variables at all. Both are compile-time-only constructs that never touch the VM's variable table for the enum case, which sidesteps scope pollution for constants but does nothing for genuine per-call locals.

### Impoverished control flow and expressions

Scratch has `if`, `if/else`, `repeat`, `repeat until`, and `forever` — no `else if`, no general `while`, no C-style `for`, no operator precedence beyond what you physically nest blocks into, and no `!=`/`<=`/`>=` (only `=`, `<`, `>`, each requiring a `not(...)` wrapper to negate). Scratchpiler's grammar (`docs/syntax.md`) adds a conventional expression parser with precedence, `elif` chains, `while(cond)` (lowered to `repeat until (not cond)`), `for i from a to b`, and `pyfor item in list`. It also adds compound assignment (`+=`, `-=`, `++`, `--`), none of which exist as Scratch primitives — each expands to a `data_setvariableto`/`data_changevariableby` pair at compile time.

Notably, `and`/`or` in the DSL do **not** short-circuit, because Scratch's `operator_and`/`operator_or` blocks evaluate both operands unconditionally regardless of how the DSL surfaces them syntactically — an ISA constraint the compiler cannot lower around, only document.

### Weak strings, weak lists, silent failure modes

Scratch conflates strings and numbers (there is no type system, and `"5" + "3"` isn't even expressible — there is no string-concatenation operator, only `join`). List index `0` on an empty slot returns `""` instead of raising an error, and lists degrade badly somewhere in the neighborhood of 200,000 items. Missing sound/costume assets fail silently rather than throwing. None of this is fixable from a compiler sitting on top of the VM — Scratchpiler instead adds richer surface syntax (`.length()`, `.contains()`, `.indexOf()`, `.sort()`, `.sum()/.min()/.max()/.count()`, `letterOf`) so the DSL author isn't hand-assembling these primitives out of loops, while the underlying `data_*` block semantics (and their failure modes) still leak through unchanged.

### Broadcasts as the only cross-object communication primitive

Scratch has no direct method calls between sprites, no public API surface, no imports — the only way one object can cause code in another to run is to broadcast a message into a project-wide, stringly-typed namespace and hope nothing else happens to be listening for the same string. Every sprite is effectively receiving on a shared radio frequency.

Scratchpiler's `Scratchroutine` (`launch`/`await`/`cancel`/`isRunning`/`checkCancel`) is task-like sugar over exactly this mechanism: it is still `event_whenbroadcastreceived`/`event_broadcast` underneath, coordinated through hidden global flag variables. This gives cooperative-task ergonomics without adding any real concurrency primitive — there is no lock, no mutex, no atomic compare-and-swap available in the ISA, so two `Scratchroutine`s racing on the same shared variable is a data race the DSL can produce but not prevent. This maps directly onto the $T_{total}$ derivation above: the compiler can make it *easy* to spawn many broadcast-driven threads, but every one of them still shares the single global mutable state space that formula operates over.

### Compilation as live-VM mutation, not artifact generation

Unlike a conventional compiler that emits a static output file, `compile(ast, vm, spriteName)` in `src/compiler.js` mutates the **already-running** `vm.runtime.targets` object directly — it writes into `target.blocks._blocks` and then `src/injector.js` forces the Scratch workspace to redraw via `vm.setEditingTarget`/`emitWorkspaceUpdate`. This is closer to a JIT patching live bytecode than to `gcc` producing an ELF binary. One practical consequence worth flagging: newly generated `procedures_prototype` blocks default to `warp: 'false'` (non-warp) in `compiler.js`, and warp status is only *preserved* when overwriting an existing block, not inferred from context — so whether a given custom block "runs without screen refresh" (§54 above) is left to the user to toggle by hand in Scratch's native block editor after compilation, not something Scratchpiler currently decides on the source's behalf despite having enough information (e.g. absence of yielding calls in the body) to do so safely in many cases. This is a natural candidate for a future optimization pass: statically prove a compiled procedure body never yields, and set `warp: 'true'` automatically.

### Diagnostics: comments and breakpoints

Scratch offers no debugger, no stack trace, no line numbers, no error console — a divide-by-zero or an unbound-list-access just produces a wrong number silently. Scratchpiler's `breakpoint` keyword compiles to a poll-based pause/resume gadget, which is the closest thing to a debugger primitive the ISA can support without VM-level changes. Source comments (`//`) are stripped at tokenization and do not survive into the compiled blocks — there is currently no mechanism (e.g. a Scratch comment block attached to the generated opcode) to round-trip DSL comments back into the visual editor, which means a user who "ejects" from the DSL back into raw block editing loses all authorial context.

### Summary

None of the above are bugs in Scratchpiler — they are honest reflections of what the underlying ISA can and cannot express. The project's value is in exactly the same place a compiler's value always is: it does not expand the instruction set, it makes the instruction set tolerable to author against. Where the ISA has a real gap (no return values, no locals, no locking), the DSL's best move is syntactic sugar plus documentation of the leak, not a false promise of a fix — and the observations above should be read as a running list of where that sugar is doing real work versus where it is still just a coat of paint over the same $T_{total}$ concurrency model derived earlier.