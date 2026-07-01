# Inline assembly

Every language that lets you get close to the metal eventually grows a hatch for the times the abstraction isn't enough. C has `__asm__ volatile("...")`. Scratchpiler, a language whose "metal" is a JSON blob describing colored puzzle pieces, now has one too. We are not proud of this. We built it anyway.

`__asm__ volatile(...)` lets you call real Scratch opcodes directly — `motion_movesteps`, `looks_say`, `data_changevariableby` — bypassing the friendly alias layer (`move()`, `say()`, `changeVariableBy()`) entirely. Use it when the friendly name you want doesn't exist yet, or when you simply enjoy typing `sensing_touchingobject` instead of `touching()` for reasons known only to you.

---

## Syntax

```
__asm__ volatile(
    looks_say("123");
    motion_movesteps(69);
)
```

**It uses parentheses, not braces.** Every other block construct in this language — `if`, `for`, `while`, `scratchroutine`, hat blocks — uses `{ }`. This one doesn't. Yes, this is inconsistent. Yes, you will type `{` here at least once out of muscle memory, get a wall of cascading parse errors, and question your understanding of a language you wrote five minutes ago. It happened during development, too. See [Gotchas](#gotchas) below.

Each line inside is `opcode(args);` — a real Scratch opcode name (the same strings Scratch's own source uses internally: `motion_movesteps`, not `move`), a flat argument list, and a mandatory semicolon. Multiple statements chain together into the same stack, in order, exactly like normal scratchpiler code:

```
on flag {
    say("before asm")
    __asm__ volatile(
        looks_say("123");
        motion_movesteps(69);
    )
    say("after asm")
}
```

`__asm__ volatile(...)` is a **statement**. It cannot be used as an expression or a reporter. There is no `set [x] to __asm__ volatile(...)`. If you need a value back, use a variable and a `data_setvariableto`/`data_changevariableby` opcode call inside the block.

---

## Arguments are flat

An argument is either a literal (string, number, boolean) or a bare **register** — a variable name, unbracketed:

```
__asm__ volatile(
    data_changevariableby(counter, 5);
)
```

`counter` here is not a string, not a typo for `[counter]` — it's a direct reference to whatever variable named `counter` is in scope, resolved exactly the way `[counter]` would be everywhere else in the language. The `[bracket]` form also works if you'd feel safer with training wheels:

```
__asm__ volatile(
    data_changevariableby([counter], 5);
)
```

Both compile identically.

**Arguments cannot be nested opcode calls.** `looks_say(operator_join("a", "b"))` is a parse error, not a feature you haven't discovered yet. Real assembly doesn't let you nest instructions inside operands either — you compute the intermediate value first, then reference it. Same rule here: if you need `operator_join`'s result, put it in a variable first with normal scratchpiler code, then pass that variable as a register.

---

## Registers

"Register" is a deliberately loose word for anything you can reference by bare name inside an `__asm__` block:

- **Real Scratch variables and lists** — anything you created in the Scratch GUI, global or sprite-local, resolved the same way `[name]` resolves everywhere else.
- **Loop and routine-internal variables** — the iterator in an active `for [i]`/`pyfor [i]` body, or a parameter of the `scratchroutine` you're currently inside. These are ordinary hidden Scratch variables under the hood; `__asm__` sees them the same way it sees anything else in scope.

Reference something that doesn't exist and you get the same error you'd get anywhere else in the language:

```
__asm__ volatile(
    data_changevariableby(doesNotExist, 5);
)
// Compile error: Variable not found: doesNotExist
```

Autocomplete inside an opcode's argument position offers every register currently in scope. Autocomplete at the opcode-name position (right after `volatile(`, or after a `;`) offers every known opcode instead — the editor knows which of the two positions you're in and won't hand you a list of variable names where an opcode name belongs, or vice versa.

---

## Strict vs. `unsafe`

By default, only opcodes scratchpiler actually knows the shape of are allowed:

```
__asm__ volatile(
    bogus_opcode_xyz("hi");
)
// Compile error: unknown opcode `bogus_opcode_xyz`. Did you mean ...?
```

Add `unsafe` to bypass this:

```
__asm__ volatile unsafe(
    bogus_opcode_xyz("hi");
)
```

`unsafe` mode will emit a block for literally any opcode string you give it, wiring your arguments in positionally as a best-effort guess (`VALUE0`, `VALUE1`, ...). There is no correctness guarantee. Scratch's internal input/field key names have no universal naming convention across its ~500 opcodes, so unless you already know the exact key an opcode expects, the resulting block will often *look* right in the Scratch editor and then silently read `undefined` at runtime. This is the same deal as C's inline `asm` or Rust's `unsafe` block: the compiler steps aside and trusts you completely, which is either liberating or a mistake, usually both.

`unsafe` still validates register names — an undeclared variable is an error in both modes. We trust you with opcodes. We do not trust you with typos.

Typing an unrecognized opcode inside `unsafe` doesn't hard-fail the compile — it shows a live yellow lint warning as you type, and still compiles and injects when you hit the button. Strict mode's unknown-opcode check is a hard compile error either way.

| | Unknown opcode | Undeclared register |
|---|---|---|
| **strict** (default) | Compile error, with a "did you mean" suggestion | Compile error |
| **`unsafe`** | Lint warning, compiles anyway (best-effort wiring) | Compile error |

---

## Opcode coverage

The known-opcode table covers roughly 90 of Scratch's core motion/looks/sound/event/control/sensing/operator/data opcodes — the ones with call sites already wired up elsewhere in the compiler, so their input/field key names are guaranteed correct rather than guessed. It lives in `src/asm-opcodes.js`, in case you want to know exactly what's covered before reaching for `unsafe`.

**Deliberately excluded**, even in strict mode's table (and not something `unsafe` fixes, since these are structural, not a schema gap):

- **Hat/event blocks** (`event_whenflagclicked`, `event_whenkeypressed`, and friends) — these must always sit at the top of a script with no parent. Wiring one into the middle of a stack via `__asm__` doesn't crash anything, but it also doesn't do anything; it just sits there, inert, attached to a block that will never trigger it.
- **`procedures_call`** — calling a custom block requires a `mutation` object naming exactly which block and what its parameters are. That's structured metadata a flat, positional-argument opcode call has no way to express. Use the language's normal custom-block call syntax for those.
- **Extension opcodes** (pen, music, video sensing, text-to-speech, translate, ...) — not in scope at all yet, `unsafe` or not.

---

## Editor support

Hovering `__asm__` shows a syntax reminder (parens, register examples, the `unsafe` modifier) directly in the tooltip, so you don't have to come back to this file every time.

Autocomplete is context-aware: opcode names at the opcode position, in-scope registers at the argument position, same as described above. Signature help (the little parameter hint that pops up after typing `(`) works for known opcodes too, showing the real Scratch input/field names in order.

---

## Gotchas

- **Parens, not braces.** Said twice now on purpose. `__asm__ volatile { ... }` will fail with a pointed reminder that this construct doesn't work like everything else you've learned.
- **No nested calls in arguments.** Compute intermediate values into a variable first.
- **`unsafe` mode is not a universal escape hatch.** It lets you attempt any opcode; it does not guarantee the opcode does what you think, or anything at all, at runtime.
- **This is not the friendly layer.** `__asm__` opcodes are raw Scratch opcode strings (`motion_movesteps`), not the ergonomic aliases documented everywhere else (`move`). If you type `move(10)` inside an `__asm__` block expecting it to work like it does everywhere else, it will be treated as an unknown opcode, because `move` was never a real Scratch opcode to begin with — it never existed outside the friendly layer's imagination.
