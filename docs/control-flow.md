# Control Flow

Scratchpiler's control structures map directly to Scratch's control blocks. No new semantics are introduced, no matter how much you wish you had access to standard asynchronous promises. What you see is what Scratch runs.

---

## Hat blocks

Hat blocks are the entry points of a script. Every script must start with one. Without a hat block, your code is orphaned, floating around in the ether, compiled but never invoked. This is a metaphor for your career if you keep writing Scratch programs.

### on flag

Runs when the green flag is clicked, starting the project. It's the beginning of the end.

```
on flag {
    say("Green flag! Very exciting.")
}
```

### on click

Runs when the sprite is clicked. For the Stage, this is `event_whenstageclicked`. This block responds to mouse clicks, which is the closest your sprite gets to interacting with its creator.

```
on click {
    sayFor("Ouch!", 1)
}
```

### on clone

Runs when this sprite starts as a clone. Clones are temporary, ephemeral beings, created to perform a short task and then be purged from memory when they call `deleteClone()`.

```
on clone {
    show()
    repeat 10 {
        move(5)
    }
    deleteClone()
}
```

### on key "..."

Runs when a key is pressed. The key name must be a string literal matching Scratch's key names.

```
on key "space" { jump() }
on key "right arrow" { changeX(5) }
on key "left arrow"  { changeX(-5) }
on key "up arrow"    { changeY(5) }
on key "down arrow"  { changeY(-5) }
on key "a"           { move(10) }
```

Common key names: `"space"`, `"enter"`, `"up arrow"`, `"down arrow"`, `"left arrow"`, `"right arrow"`, `"a"`–`"z"`, `"0"`–`"9"`.

### on receive "..."

Runs when the named broadcast message is received.

```
on receive "game over" {
    stopAll()
}
```

### on backdrop "..."

Runs when the backdrop switches to the named backdrop.

```
on backdrop "Level 2" {
    set [speed] to 8
}
```

### on timer > n

Runs when the timer exceeds a threshold value. Useful for timed events, or for reminding the player that time is slipping away. The threshold can be any expression.

```
on timer > 10 {
    say("You took too long.")
    stopAll()
}

on timer > [timeLimit] {
    broadcast("timeout")
}
```

### on loudness > n

Runs when the microphone loudness exceeds a threshold. Requires microphone permission, which the browser will request, and which the user will immediately deny out of fear that your Scratch project is a covert surveillance operation.

```
on loudness > 50 {
    say("It's loud in here.")
}
```

---

## if / else

```
if [x] > 0 {
    say("positive")
}

if [x] > 0 {
    say("positive")
} else {
    say("not positive")
}
```

There is no `else if` in scratchpiler. Nest your `if` statements inside the `else` blocks if you need a chain. Scratch doesn't have an `else if` block in its graphical palette either, so this is considered a "feature," which is marketing speak for a platform limitation we cannot bypass.

```
if [x] > 10 {
    say("big")
} else {
    if [x] > 0 {
        say("medium")
    } else {
        say("small or negative")
    }
}
```

---

## repeat

Runs the body a fixed number of times.

```
repeat 10 {
    move(10)
    turnRight(36)
}

repeat [count] {
    say("again")
}
```

---

## forever

Runs the body forever. Literally. It is an infinite loop that will consume CPU cycles until the browser tab is mercifully terminated or the heat death of the universe occurs. Any code after a `forever` block in the same scope is unreachable. The linter will tell you so, trying to save you from your own logical dead ends.

```
on flag {
    forever {
        move(5)
        bounce()
    }
    say("this never runs")  // linter warning: unreachable code
}
```

---

## repeat until

Loops until a condition becomes true. Note the parentheses around the condition — they are required because the parser demands syntactic discipline to compensate for the VM's loose runtime rules.

```
repeat until ([health] = 0) {
    move(3)
    wait(0.1)
}
```

---

## while

A `while` loop is syntactic sugar for `repeat until (not condition)`. The condition is checked at the start of each iteration. Parentheses are required.

```
while ([health] > 0) {
    move(3)
    wait(0.1)
}
```

This compiles to `control_repeat_until` with a `not` wrapper wrapped around the condition. The decompiler is smart enough to detect this pattern and reconstruct it as a `while` loop, hiding the ugly truth of the underlying blocks.

---

## for

A counted loop with an automatic iterator variable. The iterator is created as an internal Scratch variable named `_scratchpiler_internal_xxxx_varName` and is scoped to the loop. You reference it by the short name inside the body.

```
for [i] from 1 to 10 {
    set [x] to [i] * 5
    move([x])
}
```

The bounds can be variables or expressions:

```
for [i] from [start] to [end] {
    say([i])
    wait(0.1)
}

for [i] from 1 to [count] * 2 {
    move(1)
}
```

The iterator increments by 1 each iteration. There is no step parameter. If you need to count by 2, multiply inside the body.

The loop compiles to:
```
set [_scratchpiler_internal_xxxx_i] to start
repeat until ([_scratchpiler_internal_xxxx_i] > end) {
    // body
    change [_scratchpiler_internal_xxxx_i] by 1
}
```

---

## pyfor

A Python-style list iterator. `pyfor [item] in [list] { }` walks every element of a list from first to last, binding each element to the iterator variable. This is the idiomatic way to loop over all items in a list without manual index math.

```
pyfor [fruit] in [basket] {
    say([fruit])
    wait(0.3)
}
```

The iterator variable is readable inside the body. It receives a copy of the item — modifying it does not modify the list. If you need to overwrite items, use `listReplace` (or `replace()`) with an explicit index.

```
// Process all scores without manual indexing
pyfor [score] in [scores] {
    if [score] > [highScore] {
        set [highScore] to [score]
    }
}
```

The iterator variable name (`[fruit]`, `[score]`) is created as a hidden internal Scratch variable. The list (`[basket]`, `[scores]`) must already exist as a Scratch list — it cannot be a variable. If you pass a variable where a list is expected, the type checker will warn you before you compile.

The compiled output is:
```
set [_scratchpiler_internal_xxxx_pyfor_ctr] to 1
repeat until ([_scratchpiler_internal_xxxx_pyfor_ctr] > [list].length()) {
    set [_scratchpiler_internal_xxxx_item] to [list].item([ctr])
    // body
    change [_scratchpiler_internal_xxxx_pyfor_ctr] by 1
}
```

The decompiler recognizes this pattern and reconstructs it cleanly as `pyfor [item] in [list] { }` on re-import.

---

## wait

Pauses the script for a number of seconds.

```
wait(2)
wait(0.5)
wait([delay])
```

---

## wait until

Pauses the script until a condition becomes true.

```
wait until [health] = 0
wait until touching("edge")
wait until key("space")
```

---

## Stopping

```
stopAll()            // stop all scripts in the project
stopThis()           // stop this script only
stopOtherScripts()   // stop other scripts in this sprite

// Ergonomic aliases
stopMe()             // alias for stopThis()
```

Any code after `stopAll()`, `stopThis()`, or `stopMe()` is unreachable. The linter will warn you. `stopOtherScripts()` is not a terminator — the current script continues running after it, leaving it alone in a silent room after it has silenced its peers.

---

## Clones

```
createClone()             // clone this sprite
createClone("Sprite2")    // clone another sprite
clone()                   // alias for createClone() — same thing, fewer characters

deleteClone()             // delete this clone (from within on clone { })
```

`deleteClone()` is a terminator — code after it is unreachable. Once a clone deletes itself, it is garbage collected, and its existence is completely erased from browser memory. Do not put code after this unless you enjoy writing statements that will never feel the warmth of execution.

---

## yield

Not a Scratch block — scratchpiler sugar that compiles to `wait(0)`. Yields execution for one tick, allowing other scripts to run. Useful in tight loops that would otherwise freeze Scratch's single-threaded web-worker runtime and prompt the browser to ask if you want to kill the page.

```
forever {
    // expensive work here (e.g. searching a 10,000 item list)
    yield()    // let other scripts breathe before the VM suffocates
}
```

---

## Increment and Decrement

`[var]++` and `[var]--` are statement-level increment/decrement operators. They compile to `change [var] by 1` and `change [var] by -1` respectively. They are not expressions — you cannot use them inside another expression.

```
on flag {
    set [counter] to 0
    repeat 10 {
        [counter]++
    }
    // [counter] is now 10
}
```

---

## else if / elif

`else if` and its alias `elif` can be chained without the visual staircase of nested blocks. They compile to a series of `control_if_else` blocks.

```
on flag {
    if [score] > 90 {
        say("A grade")
    } else if [score] > 70 {
        say("B grade")
    } elif [score] > 50 {
        say("C grade")
    } else {
        say("Study harder")
    }
}
```

`elif` is an alias for `else if` and can be used interchangeably.

---

## match / switch

A multi-branch comparison block. `match` and `switch` are aliases for each other.

```
match [score] {
    case 100 {
        say("perfect")
    }
    case 90, 95 {
        say("A")
    }
    default {
        say("F")
    }
}
```

The subject (`[score]`) is compared against each case using Scratch's loose `=` equality (like Scratch's "=" comparison block). Cases can list multiple comma-separated values — the body runs if the subject matches any of them. A `default` clause is optional and runs if no cases match.

Compilation: Each case desugars to a chain of `if ... else if ... else` blocks with a hidden temporary variable tracking which branch was taken.

Decompilation: On re-import from Scratch, the `if ... else if` chains are reconstructed back to the original `match` syntax, preserving readability.

---

## do..while

A loop that always runs the body at least once, then tests a condition at the end.

```
set [tries] to 0
do {
    change [tries] by 1
    askAndWait("password?")
} while ([tries] < 3)
```

The body executes unconditionally. Then, if the condition is true, the loop repeats. If false, execution exits. This ensures the body always runs at least once, unlike a `while` loop that checks the condition first.

Compilation: Desugars to a hidden flag variable plus a `repeat until (not condition)` loop that wraps the body. The decompiler recognizes this pattern and reconstructs it as `do..while`.

---

## break

Exit the innermost enclosing loop immediately.

```
set [n] to 0
forever {
    change [n] by 1
    if [n] > 10 {
        break
    }
}
say("n = {[n]}")  // runs after break exits the loop
```

Supported inside: `forever`, `repeat N`, `while`, `repeat until`, and `do..while`.

**Not supported inside:** `for` and `pyfor` loops (compile error).

**Not supported outside any loop:** compile error.

Compilation: Desugars to a hidden flag variable set to 1, and a `repeat until` wrapper that detects the flag and exits. The decompiler reconstructs it as a bare `break` statement.

---

## continue

Skip to the next iteration of the innermost enclosing loop.

```
set [total] to 0
repeat 10 {
    change [n] by 1
    if ([n] mod 2) = 1 {
        continue  // skip to next iteration if n is odd
    }
    change [total] by [n]  // only runs if n is even
}
```

Supported inside: `forever`, `repeat N`, `while`, `repeat until`, and `do..while`.

**Not supported inside:** `for` and `pyfor` loops (compile error).

**Not supported outside any loop:** compile error.

Compilation: Desugars to a hidden flag variable, which the enclosing loop's generated code checks before executing the body's trailing increment. The decompiler recognizes this pattern and reconstructs it as a bare `continue` statement.

---

## Scratchroutines

Scratchroutines are named concurrent tasks that compile to broadcast-based pseudo-coroutines. They support parameters, cancellation, and lifecycle queries.

The concept: Scratch already supports concurrent execution through broadcasts — multiple hat blocks can react to the same broadcast simultaneously. Scratchroutines exploit this mechanism while adding a layer of parameter passing (via hidden global variables) and lifecycle tracking (via a hidden count variable per routine).

### Defining a scratchroutine

```
scratchroutine bounce(speed) {
    repeat until (touching("_edge_")) {
        move([speed])
        checkCancel()
    }
    bounce()
}
```

This compiles to an `on receive "__sroutine_bounce"` hat block with:
- A reset of the cancel flag (`__sroutine_bounce_cancelled`)
- An increment of the running counter (`__sroutine_bounce_count`)
- Your body (with `[speed]` resolved to the hidden global `__sroutine_bounce_speed`)
- A decrement of the counter when done

Parameters are passed via hidden global variables and mapped inside the body automatically.

### launch — fire and forget

Sets parameter variables, then broadcasts the routine without waiting.

```
launch bounce(5)
```

Equivalent to `broadcast("__sroutine_bounce")` after setting the param var.

### await — block until done

Sets parameter variables, then broadcasts and waits.

```
await bounce(5)
// this line runs only after the bounce routine finishes
say("done bouncing")
```

Equivalent to `broadcastAndWait("__sroutine_bounce")`.

### cancel — request cancellation

Sets a cancel flag. The routine only stops if it calls `checkCancel()` inside its body.

```
cancel bounce
```

This sets `__sroutine_bounce_cancelled` to 1. The running instance of bounce will stop at its next `checkCancel()` call.

### checkCancel — yield to cancel requests

Inside a scratchroutine body, polls the cancel flag and calls `stopThis()` if cancelled. Outside a scratchroutine, this is a compile error.

```
scratchroutine longTask() {
    repeat 1000 {
        // expensive work
        checkCancel()   // stop here if someone called cancel longTask
    }
}
```

### isRunning — query lifecycle

A boolean expression that is true while the routine's count is greater than 0.

```
if isRunning(bounce) {
    say("still bouncing")
}

wait until not isRunning(bounce)
say("finally stopped")
```

Note: because Scratch broadcasts are asynchronous, `isRunning` may be true briefly after a `launch` before the receiver script has started. Use `await` if you need to know exactly when it finishes.

### Full example

```
scratchroutine orbit(radius) {
    set [angle] to 0
    repeat until ([angle] > 360) {
        setX(([radius]) * sin([angle]))
        setY(([radius]) * cos([angle]))
        change [angle] by 5
        checkCancel()
        wait(0.05)
    }
}

on flag {
    launch orbit(80)
    wait(3)
    cancel orbit
    wait until not isRunning(orbit)
    say("orbit stopped")
}
```
