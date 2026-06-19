# Examples

Full example programs demonstrating scratchpiler features. The `examples/` folder in this repository contains `.sdsl` files you can paste directly into the editor.

---

## Hello World

The minimum viable Scratch program.

```
on flag {
    say("Hello, World!")
    wait(2)
    say("")
}
```

See `examples/hello-world.sdsl`.

---

## Platformer movement

Arrow-key controlled movement. Four hat blocks, one per direction. Classic pattern — no state machine needed.

```
on flag {
    forever {
        if touching("edge") {
            bounce()
        }
    }
}

on key "right arrow" { changeX(5) }
on key "left arrow"  { changeX(-5) }
on key "up arrow"    { changeY(5) }
on key "down arrow"  { changeY(-5) }
```

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
