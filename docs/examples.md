# Examples

Full example programs demonstrating scratchpiler features. Paste any `.sdsl` file from the `examples/` folder directly into the editor. To avoid making the Scratch VM question its own reality, compile them sprite-by-sprite, making sure you select the correct sprite from the dropdown before injecting.

## Example files

| File | Demonstrates |
|---|---|
| `hello-world.sdsl` | First script, `say`, `wait`, minimal block generation |
| `bounce-loop.sdsl` | `forever`, `move`, `bounce`, trapping threads |
| `chase-mouse.sdsl` | `glide`, `mouseX`/`mouseY`, `sayFor`, following input |
| `counter.sdsl` | Variables, `set`, `change`, `on key`, handling mutable state |
| `custom-blocks.sdsl` | `define`, custom block calls, parameter passing |
| `platformer-move.sdsl` | Multiple hat blocks, arrow key movement, concurrent event handlers |
| `for-loop-spiral.sdsl` | `for` loop, growing step sizes, arithmetic transformations |
| `trig-circle.sdsl` | `sin`/`cos`, circular motion, fighting degree limits |
| `list-inventory.sdsl` | List operations, dot methods, `.contains`, `.indexOf` |
| `list-sort.sdsl` | `.sort()`, `.sort("desc")`, leaderboard construction, Shell sort in the wild |
| `clones-burst.sdsl` | Clone creation, `on clone`, data passing, thread explosion |
| `ask-quiz.sdsl` | `askAndWait`, `answer`, `contains`, prompting for input |
| `graphic-effects.sdsl` | All seven graphic effects, visual distortion |
| `broadcast-game.sdsl` | `broadcast`, `broadcastAndWait`, game state machine patterns |
| `timer-countdown.sdsl` | `timer`, `resetTimer`, `on timer >`, dealing with real-world time |
| `math-functions.sdsl` | `abs`, `round`, `clamp`, `random`, `mod`, compound assignment |
| `string-ops.sdsl` | `join`, `letterOf`, `.length()`, string reversal without utility libraries |
| `platformer-full.sdsl` | Full movement system with gravity, lives, score, broadcasts |
| `sensing-radar.sdsl` | `distanceTo`, `xOf`, `yOf`, `directionOf`, `costumeNameOf` |
| `fork-bomb.sdsl` | Exponential cloning, crashing the VM, `changeEffect` |
| `spaghetti-goto.sdsl` | Broadcast abuse, simulating `GOTO` statements |
| `bogosort.sdsl` | Terrible time complexity, `while`, list mutation |
| `unsafe-asm.sdsl` | Fake segmentation faults, `__asm__ volatile unsafe` |
| `pointers-linkedlist.sdsl` | `&[x]`, `*[p]`, `alloc`, `free`, building and walking a linked list |
| `include-demo.sdsl` | `#include <name.h>`, header storage, cross-project code reuse |
| `control-flow-sugar.sdsl` | `elif`, `do..while`, `break`, `continue`, syntactic sugar control flow |
| `return-functions.sdsl` | `define name() returns`, custom blocks that return values |
| `operator-sugar.sdsl` | `+=`, `-=`, `*=`, `/=`, `++`, `--`, compound assignment operators |

---

## Hello World

The minimum viable Scratch program, expressing a standard greeting before returning to its default state of silent execution.

```
on flag {
    say("Hello, World!")
    wait(2)
    say("") // Closes the speech bubble to spare the user's view
}
```

See `examples/hello-world.sdsl`.

---

## Platformer movement

Arrow-key controlled movement. Five independent threads (hat blocks) running concurrently. A classic Scratch pattern that avoids a complex centralized state machine, instead relying on the browser's thread scheduler to not drop inputs.

```
on flag {
    forever {
        if touching("edge") {
            bounce() // Reflects direction when hitting the boundaries of the stage
        }
    }
}

on key "right arrow" { changeX(5) }
on key "left arrow"  { changeX(-5) }
on key "up arrow"    { changeY(5) }
on key "down arrow"  { changeY(-5) }
```

> [!TIP]
> This event-driven pattern is simple but can feel sluggish due to Scratch's repeat-delay handling. For a smoother, professional feel, use a polling loop (checking `key()` status inside a `forever` block) as shown in `examples/platformer-full.sdsl`. Your users will thank you, assuming they exist.

See `examples/platformer-move.sdsl`.

---

## Counter with display

Uses a variable `[score]` (create it in Scratch first).

```
on flag {
    set [score] to 0
    showVariable([score])
}

on key "space" {
    [score] += 1
}
```

---

## Bouncing sprite

The simplest animation loop.

```
on flag {
    setRotationStyle("left-right")
    forever {
        move(10)
        bounce()
    }
}
```

See `examples/bounce-loop.sdsl`.

---

## Mouse chaser

Continuously glides toward the mouse pointer.

```
on flag {
    forever {
        glide(0.1, mouseX, mouseY)
    }
}

on click {
    sayFor("Ouch!", 1)
}
```

See `examples/chase-mouse.sdsl`.

---

## Custom block with parameters

Defines a `zigzag` block and calls it in a loop.

```
define zigzag(steps) {
    move([steps])
    turnRight(90)
    move([steps])
    turnLeft(90)
}

on flag {
    repeat 5 {
        zigzag(20)
    }
}
```

See `examples/custom-blocks.sdsl`.

---

## For-loop with math

Draw a circle by moving to calculated positions.

```
on flag {
    set [cx] to 0
    set [cy] to 0
    set [r] to 100
    for [i] from 0 to 359 {
        setX([cx] + cos([i]) * [r])
        setY([cy] + sin([i]) * [r])
        wait(0)
    }
}
```

---

## Score and lives system

A minimal game-state setup. Requires variables `[score]`, `[lives]`, `[gameActive]`.

```
on flag {
    set [score] to 0
    set [lives] to 3
    set [gameActive] to 1
    resetTimer()
}

on receive "enemy hit" {
    [score] += 10
}

on receive "player hit" {
    [lives] -= 1
    if [lives] = 0 {
        set [gameActive] to 0
        broadcast("game over")
    }
}

on receive "game over" {
    say(join("Final score: ", [score]))
    wait(2)
    stopAll()
}
```

---

## Timed event

Run different logic based on elapsed time.

```
on flag {
    resetTimer()
    forever {
        if timer > 30 {
            broadcast("overtime")
            stopThis()
        }
        wait(1)
        [score] -= 1    // score drains over time
    }
}
```

Alternatively, use the hat form:

```
on timer > 30 {
    broadcast("overtime")
}
```

---

## List as a queue

Demonstrates list operations. Requires a list `[queue]`.

```
on flag {
    listDeleteAll([queue])
    listAdd("alpha", [queue])
    listAdd("beta", [queue])
    listAdd("gamma", [queue])
}

on key "space" {
    if [queue].length() > 0 {
        say([queue].item(1))
        listDelete(1, [queue])
        wait(1)
        say("")
    } else {
        say("Queue empty.")
        wait(1)
        say("")
    }
}
```

---

## Animation with costume cycling

A simple sprite animation loop. Assumes costumes named `walk-1` through `walk-4`.

```
define playAnimation(frameCount, delay) {
    repeat [frameCount] {
        nextCostume()
        wait([delay])
    }
}

on flag {
    switchCostume("walk-1")
    forever {
        playAnimation(4, 0.1)
    }
}
```

---

## Compound assignment in action

```
on flag {
    set [x] to 100
    set [y] to 50

    [x] += 10     // x = 110
    [y] -= 5      // y = 45
    [x] *= 2      // x = 220
    [y] /= 9      // y = 5

    say(join(join([x], ", "), [y]))
    wait(2)
    say("")
}
```

---

## Sensing another sprite

```
on flag {
    forever {
        if distanceTo("Enemy") < 30 {
            sayFor(join("Enemy at: ", join(xOf("Enemy"), join(", ", yOf("Enemy")))), 1)
        }
        wait(0.1)
    }
}
```

---

## Rotation style and direction

```
on flag {
    setRotationStyle("left-right")
    forever {
        if key("right arrow") {
            setDirection(90)
            changeX(3)
        }
        if key("left arrow") {
            setDirection(-90)
            changeX(-3)
        }
    }
}
```

The sprite image flips left/right but the movement code uses explicit `setDirection` so it always moves correctly regardless of visual orientation.

---

## Sorting a leaderboard

Builds a list of scores, sorts it descending, and announces the top three. Uses `.sort("desc")` — three words that would have taken approximately forty Scratch blocks to achieve unassisted.

Requires a list named `scores` and a variable named `i` in the active sprite.

```
on flag {
    listDeleteAll([scores])
    listAdd(42, [scores])
    listAdd(7,  [scores])
    listAdd(99, [scores])
    listAdd(23, [scores])
    listAdd(55, [scores])

    [scores].sort("desc")   // 99, 55, 42, 23, 7

    say("Top 3:")
    wait(1)
    for [i] from 1 to 3 {
        sayFor(join("#", join([i], join(": ", [scores].item([i])))), 1.5)
    }
}
```

The sort operates in place, so `[scores]` is modified directly. There's no copy — it's mutating the original list because it lives on the edge. The decompiler will reconstruct this as `[scores].sort("desc")` on re-import, so you won't come back later to find forty mystery blocks where your one tidy line used to be.

See `examples/list-sort.sdsl`.

---

## Fork Bomb

A literal fork bomb in Scratch. Scratch caps clones at 300 to prevent exactly this, but the VM still sweats trying to process it.

```
on flag {
    say("Initiating clone cascade...")
    wait(1)
    clone()
}

on clone {
    changeEffect("color", 25)
    changeEffect("ghost", 2)
    changeX(random(-20, 20))
    changeY(random(-20, 20))
    turnRight(random(-45, 45))
    
    // The delay prevents an instantaneous crash
    wait(0.1) 
    
    clone()
    clone()
}
```

See `examples/fork-bomb.sdsl`.

---

## Spaghetti GOTO with Broadcasts

Emulating GOTO statements using broadcasts. A masterful display of the worst possible way to count to 10 by splitting a simple loop across five different event handlers.

```
on flag {
    set [i] to 0
    broadcast("loop_start")
}

on receive "loop_start" {
    if [i] < 10 {
        broadcast("do_work")
    } else {
        broadcast("done")
    }
}

on receive "do_work" {
    sayFor(join("Counting: ", [i]), 0.5)
    broadcast("increment")
}

on receive "increment" {
    [i] += 1
    broadcast("loop_start")
}

on receive "done" {
    say("We successfully counted to 10 using 5 different threads.")
}
```

See `examples/spaghetti-goto.sdsl`.

---

## BogoSort

BogoSort implementation in Scratchpiler. Shuffles the list randomly until it's sorted. O(N * N!) time complexity. Perfect for a 30 FPS VM.

```
on flag {
    listDeleteAll([data])
    listAdd(5, [data])
    listAdd(2, [data])
    listAdd(9, [data])
    listAdd(1, [data])
    listAdd(7, [data])
    
    set [sorted] to 0
    set [attempts] to 0
    
    while ([sorted] = 0) {
        [attempts] += 1
        
        // Randomly swap two elements
        set [idx1] to random(1, [data].length())
        set [idx2] to random(1, [data].length())
        
        set [temp] to [data].item([idx1])
        listReplace([idx1], [data], [data].item([idx2]))
        listReplace([idx2], [data], [temp])
        
        // Check if sorted
        set [sorted] to 1
        set [len_minus_one] to [data].length() - 1
        for [i] from 1 to [len_minus_one] {
            if [data].item([i]) > [data].item([i] + 1) {
                set [sorted] to 0
            }
        }
        
        if [attempts] mod 100 = 0 {
            say(join("Attempts: ", [attempts]))
            yield()
        }
    }
}
```

See `examples/bogosort.sdsl`.

---

## Unsafe Assembly (Fake Segfault)

Emulating a segmentation fault in Scratch. Scratch doesn't have pointers, memory addresses, or a heap. But with `unsafe` inline assembly, we can pretend it does by forcing the compiler to emit non-existent opcodes until the VM throws its hands up.

```
on flag {
    set [ptr] to "0x00000000"
    
    say("Dereferencing null pointer...")
    wait(1)
    
    __asm__ volatile unsafe(
        memory_read_address([ptr]);
        vm_trigger_segfault("SIGSEGV");
        system_format_drive("C:");
    )
    
    say("If you can read this, reality is broken.")
}
```

See `examples/unsafe-asm.sdsl`.
