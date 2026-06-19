# Control Flow

Scratchpiler's control structures map directly to Scratch's control blocks. No new semantics are introduced. What you see is what Scratch runs.

---

## Hat blocks

Hat blocks are the entry points of a script. Every script must start with one. Without a hat block, your code is orphaned and Scratch will never run it. This is a metaphor.

### on flag

Runs when the green flag is clicked.

```
on flag {
    say("Green flag! Very exciting.")
}
```

### on click

Runs when the sprite is clicked. For the Stage, this is `event_whenstageclicked`.

```
on click {
    sayFor("Ouch!", 1)
}
```

### on clone

Runs when this sprite starts as a clone.

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

Runs when the timer exceeds a threshold value. Useful for timed events. The threshold can be any expression.

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

Runs when the microphone loudness exceeds a threshold. Requires microphone permission, which the user will probably deny.

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

There is no `else if`. Nest your ifs if you need a chain. Scratch doesn't have an `else if` block either, so this is a feature, not an oversight.

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

Runs the body forever. Any code after a `forever` block in the same scope is unreachable and the linter will tell you so.

```
on flag {
    forever {
        move(5)
        bounce()
    }
    say("this never runs")  // linter warning: unreachable
}
```

---

## repeat until

Loops until a condition becomes true. Note the parentheses around the condition — they're required.

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

This compiles to `control_repeat_until` with a `not` wrapper on the condition. The decompiler reconstructs it as `while`.

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
```

Any code after `stopAll()` or `stopThis()` is unreachable. The linter will warn you. `stopOtherScripts()` is not a terminator — the current script continues running after it.

---

## Clones

```
createClone()             // clone this sprite
createClone("Sprite2")    // clone another sprite

deleteClone()             // delete this clone (from within on clone { })
```

`deleteClone()` is a terminator — code after it is unreachable.

---

## yield

Not a Scratch block — scratchpiler sugar that compiles to `wait(0)`. Yields execution for one tick, allowing other scripts to run. Useful in tight loops that would otherwise freeze Scratch.

```
forever {
    // expensive work here
    yield()    // let other scripts breathe
}
```
