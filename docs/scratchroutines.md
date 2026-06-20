# Scratchroutines

Scratch already supports concurrency. Multiple scripts can run "simultaneously" — the VM interleaves them tick by tick, with each script advancing until it hits a blocking operation (a `wait`, a `broadcastAndWait`, a `forever` body) before handing control to the next script. This is not true parallelism. It is the illusion of parallelism, maintained through careful scheduling and the fact that JavaScript is single-threaded.

Broadcasts are the mechanism Scratch provides for triggering multiple scripts from one event. You broadcast a message; any script with a matching `on receive "..."` hat starts running. If you use `broadcastAndWait`, the caller blocks until all receivers finish. If you use `broadcast`, the caller continues immediately while receivers run concurrently.

Scratchroutines are named wrappers around this mechanism. They add:

- **Parameter passing** — arguments are transferred via hidden global variables before the broadcast fires
- **Cancellation** — a cancel flag variable per routine; the body checks it with `checkCancel()`
- **Lifecycle tracking** — a count variable per routine; incremented on start, decremented on finish

They are called Scratchroutines because "coroutine" implies symmetrical cooperative scheduling, and what Scratch has is closer to "fire a broadcast and hope for the best." The name is aspirational.

---

## Defining a scratchroutine

```
scratchroutine name(param1, param2) {
    // body
}
```

The definition is top-level — it sits at the same level as `on flag {}` and `define myBlock() {}`, not inside another block. Parameters are optional:

```
scratchroutine heartbeat() {
    forever {
        change [bpm_counter] by 1
        wait(1)
        checkCancel()
    }
}
```

**What gets compiled:**

- An `on receive "__sroutine_name"` hat block
- A preamble: `set [__sroutine_name_cancelled] to 0` and `change [__sroutine_name_count] by 1`
- The body, with each parameter name resolved to its hidden global variable
- A postamble: `change [__sroutine_name_count] by -1`

All infrastructure variables are created automatically on the Stage (global scope). You do not need to create them in Scratch first.

---

## Parameters

Parameters are declared in parentheses after the name and are usable inside the body as `[paramName]`:

```
scratchroutine moveSprite(dx, dy) {
    changeX([dx])
    changeY([dy])
}
```

Internally, `[dx]` resolves to `__sroutine_moveSprite_dx` (a global variable). You never interact with the internal name directly. The decompiler knows about it and will reconstruct the original param name on re-import.

**Argument passing is positional.** Parameters are matched to the global vars by alphabetical sort of the variable names, not by name. If you define `scratchroutine foo(a, b)`, then `launch foo(1, 2)` will set `__sroutine_foo_a` to 1 and `__sroutine_foo_b` to 2. The sort is stable across compiles because variable names are deterministic.

---

## launch — fire and forget

```
launch name(arg1, arg2)
launch name()          // no-argument form
```

Sets each parameter variable to its corresponding argument, then broadcasts `"__sroutine_name"` without waiting. The caller continues immediately; the scratchroutine runs concurrently.

This is equivalent to:

```
set [__sroutine_name_param1] to arg1
set [__sroutine_name_param2] to arg2
broadcast("__sroutine_name")
```

Use `launch` when you want to start a background task and continue the current script without waiting.

---

## await — block until done

```
await name(arg1, arg2)
await name()
```

Sets parameters, then uses `broadcastAndWait`. The caller blocks until all instances of the scratchroutine that were started by this `await` have finished.

Use `await` when the current script depends on the scratchroutine completing before it can proceed:

```
on flag {
    await loadLevel(1)
    say("Level loaded — starting game")
}
```

**Caveat**: `broadcastAndWait` in Scratch blocks until all receivers of that message complete — including any instances started by *other* senders that happen to still be running. If two scripts both `await` the same scratchroutine, the second await will complete only after both instances finish, not just the one it launched. This is a property of `broadcastAndWait`, not a scratchroutine-specific behavior.

---

## cancel — request cancellation

```
cancel name
```

Sets `__sroutine_name_cancelled` to 1. This does not stop the scratchroutine. It sets a flag that the running instance can check.

The running instance only stops if it calls `checkCancel()` inside its body. Without `checkCancel()` calls, `cancel` has no effect.

Use `cancel` from any other script:

```
on key "escape" {
    cancel orbit
}
```

---

## checkCancel — yield to cancellation

Used **inside a scratchroutine body only**. Compiles to:

```
if [__sroutine_name_cancelled] = 1 {
    stopThis()
}
```

Call it at appropriate points in the body to make the scratchroutine responsive to cancel requests:

```
scratchroutine longSearch(target) {
    for [i] from 1 to [haystack].length() {
        if [haystack].item([i]) = [target] {
            set [found_at] to [i]
            stopThis()
        }
        checkCancel()   // yield to cancel after each item check
    }
    set [found_at] to -1
}
```

**Rules:**
- `checkCancel()` outside a scratchroutine body is a compile error
- The cancel flag is reset to 0 at the start of each invocation, so stale cancellations from a previous run do not carry over

---

## isRunning — query the lifecycle

A boolean expression that returns true while at least one instance of the scratchroutine is executing:

```
if isRunning(bounce) {
    say("still going")
}

wait until not isRunning(bounce)
```

Internally, `isRunning(name)` compiles to `[__sroutine_name_count] > 0`.

**Argument syntax**: pass the routine name as an identifier (not a string). `isRunning(bounce)` — not `isRunning("bounce")`.

---

## Lifecycle

The full lifecycle of a scratchroutine invocation:

```
launch name(args)
│
├─ [set parameter vars]
└─ broadcast("__sroutine_name")
                │
                └─ on receive "__sroutine_name" {
                       set [__sroutine_name_cancelled] to 0   // ← reset cancel flag
                       change [__sroutine_name_count] by 1    // ← mark as running
                       [body]
                       change [__sroutine_name_count] by -1   // ← mark as done
                   }
```

Queries:
- `isRunning(name)` → `[count] > 0` → true between the first `change count by 1` and the final `change count by -1`
- `cancel name` → sets `[cancelled] to 1` → the body stops at its next `checkCancel()` call

After the postamble runs (`change count by -1`), `isRunning(name)` returns false.

---

## Use cases

### Background animation

```
scratchroutine bobAnimation() {
    set [bob_origin_y] to yPos
    forever {
        setY([bob_origin_y] + (sin([bob_phase]) * 10))
        change [bob_phase] by 5
        checkCancel()
        wait(0.033)
    }
}

on flag {
    set [bob_phase] to 0
    launch bobAnimation()
}

on click {
    cancel bobAnimation
}
```

### Parallel data processing

```
scratchroutine processChunk(start, end) {
    for [i] from [start] to [end] {
        // process [rawData].item([i])
        checkCancel()
    }
}

on flag {
    // Process two halves concurrently
    launch processChunk(1, 50)
    await  processChunk(51, 100)
    // await ensures the second half finishes before continuing
    // but the first half (launched) may still be running
    wait until not isRunning(processChunk)
    say("all done")
}
```

### State machine transitions

```
scratchroutine transitionToMenu() {
    setEffect("ghost", 0)
    repeat 10 {
        changeEffect("ghost", 10)
        wait(0.05)
    }
    switchBackdrop("menu")
    repeat 10 {
        changeEffect("ghost", -10)
        wait(0.05)
    }
    clearEffects()
}

on key "escape" {
    cancel transitionToMenu   // abort if already running
    await transitionToMenu()  // start fresh and wait
    say("Now in menu")
}
```

### Timeout pattern

```
scratchroutine timedAction(seconds) {
    wait([seconds])
    set [timed_out] to 1
}

on flag {
    set [timed_out] to 0
    launch timedAction(5)
    wait until [result_ready] = 1 or [timed_out] = 1
    if [timed_out] = 1 {
        say("Timed out")
    } else {
        cancel timedAction
        say("Done in time")
    }
}
```

---

## Limitations

**Parameters are global.** All parameter variables are created on the Stage, meaning they are accessible from any sprite. Multiple concurrent invocations of the same scratchroutine will overwrite each other's parameters. Do not launch the same scratchroutine concurrently with different arguments and expect each instance to see its own argument values — they will all see the last values written.

**No return values.** Scratchroutines cannot return a value. Use a shared variable as an output if needed.

**Cancellation is cooperative.** `cancel name` is a request, not a command. The body must contain `checkCancel()` calls to act on it. A scratchroutine with no `checkCancel()` cannot be stopped by `cancel` — you'd need `stopAll()` or `stopOtherScripts()` for that.

**`broadcastAndWait` semantics.** `await` blocks until *all* receivers of the broadcast message complete, not just the one instance started by this `await`. If the scratchroutine is already running from a previous `launch`, the `await` will block until that instance also finishes.

**Scratch's concurrency model.** Scratch interleaves scripts tick by tick. A scratchroutine that never yields (no `wait`, no blocking call, no `checkCancel()`) will monopolize the VM and freeze other scripts until it finishes. Put a `wait(0)` or `yield()` inside tight loops if other scripts need to breathe.

---

## Internal variable names

For the curious or the deeply, irreversibly determined to look at the variable monitor:

| Purpose | Variable name |
|---|---|
| Broadcast trigger | `__sroutine_<name>` (broadcast message) |
| Parameter | `__sroutine_<name>_<param>` |
| Cancel flag | `__sroutine_<name>_cancelled` |
| Running counter | `__sroutine_<name>_count` |

These variables are created on the Stage automatically when the scratchroutine compiles. They are hidden from SDSL source — `[__sroutine_bounce_cancelled]` does not appear in autocomplete, and the decompiler suppresses set/change blocks for these names. They do appear in Scratch's variable monitor if you look for them.

Do not rename or delete them from the Scratch UI. The compiler will recreate them on the next compile anyway.
