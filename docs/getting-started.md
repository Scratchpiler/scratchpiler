# Getting Started

This tutorial walks through scratchpiler from scratch (pun acknowledged with a heavy sigh, moving on). By the end of this, you'll have written, compiled, and executed a real program inside the Scratch runtime environment, assuming you don't give up beforehand. Prior Scratch experience helps; prior programming experience helps more; a high tolerance for debugging browser local storage helps most.

---

## Step 1 — Open the editor

Navigate to any Scratch project in the editor (`scratch.mit.edu/projects/*/editor`). Press **Alt+M** to summon the compiler overlay. It will drape itself over Scratch's interface like a dark, silent shroud.

If nothing happens, check that Tampermonkey is active, the script is enabled, and your browser hasn't silently blocked our userscript. If it's still nothing, the Scratch project may not have loaded yet — give the browser a moment to process the massive heap of scripts it's carrying.

If the "Open Scratchpiler" button simply is not there, verify that your URL is something along the lines of `scratch.mit.edu/projects/*/editor`, and refresh the page. This is a known limitation of Tampermonkey when interacting/injecting into SPAs (Single Page Applications) like Scratch's.

---

## Step 2 — Pick a sprite

Use the dropdown in the toolbar to select which sprite you are writing code for. Every sprite has its own independent, isolated editor workspace. Code compiled for "Cat" stays in Cat, forever trapped in its own logical cage. Cross-sprite access is forbidden by design.

Start with the default sprite (usually the Orange Cat, who has seen too much) if you don't have a preference.

---

## Step 3 — Your first script

Type this into the editor:

```
on flag {
    say("Hello from scratchpiler!")
    wait(2)
    say("")
}
```

Press **Ctrl+Enter** to compile and inject. Switch back to Scratch, click the green flag, and the sprite will speak. It has no mouth, but it will speak.

If you see a red underline, there's a parse error — hover it to read the message, correct your syntax, and try again. The parser is uncompromising. It does not accept partial efforts.

---

## Step 4 — Variables

Variables must be created in Scratch before scratchpiler can use them. Scratchpiler does not create variables on its own; it merely references what already exists. Think of them as entities that must be summoned (created) in the Scratch editor before we can possess them in text.

1. Click **Variables** in the scratchpiler toolbar → **New global variable…** (or summon it via Scratch's sidebar if you enjoy clicking)
2. Name it `score`
3. Click OK

Now write:

```
on flag {
    set [score] to 0
    say("Score reset!")
    wait(1)
    say("")
}

on key "space" {
    [score] += 1
    say(join("Score: ", [score]))
    wait(0.5)
    say("")
}
```

Compile. Click the flag, then press space a few times. The score increases.

Notice:
- Variables are always written in square brackets: `[score]`, signifying their containment within the Scratch memory pool.
- `join()` concatenates two strings. Scratch does not have a `+` operator for strings. It treats strings and numbers as interchangeable and confusing, so `join()` is your only shield against implicit conversion errors.
- `[score] += 1` is syntactic sugar for `change [score] by 1`, compiled down to Scratch's native changer block.

---

## Step 5 — Loops and conditions

```
on flag {
    set [score] to 0
    forever {
        if key("right arrow") {
            changeX(3)
        }
        if key("left arrow") {
            changeX(-3)
        }
        if touching("_edge_") {
            [score] += 1
            bounce()
        }
    }
}
```

This script runs a polling loop: every frame, it checks which keys are held and whether the sprite has collided with the edge of its tiny world. The `forever` block loops until the project stops — code after it in the same script is unreachable. The linter will flag any statements after `forever` as dead code, which is a polite way of telling you that you are wasting your time.

---

## Step 6 — Multiple hat blocks

A sprite can have multiple hat blocks. They run independently — each one is its own thread.

```
on flag {
    set [score] to 0
    forever {
        move(3)
        bounce()
    }
}

on key "space" {
    [score] += 1
    sayFor(join("Score: ", [score]), 0.5)
}

on click {
    turnRight(45)
}
```

Three hat blocks, three threads. The `forever` loop runs continuously while the key and click handlers fire on demand.

---

## Step 7 — The for loop

The `for` loop is scratchpiler's most powerful control structure. It creates an automatic iterator variable.

```
on flag {
    for [i] from 1 to 10 {
        say([i])
        wait(0.2)
    }
    say("Done!")
    wait(1)
    say("")
}
```

The bounds can be expressions, not just literals:

```
on flag {
    set [n] to 5
    for [i] from 1 to [n] * 2 {
        move([i] * 2)
        turnRight(30)
        wait(0.05)
    }
}
```

---

## Step 8 — Custom blocks

Custom blocks let you name and reuse sequences. The block must be created in Scratch first (via "Make a Block" in the block palette), then you write its implementation in scratchpiler.

Create a block named `flash` with no parameters in Scratch, then:

```
define flash() {
    setEffect("ghost", 80)
    wait(0.1)
    clearEffects()
    wait(0.1)
    setEffect("ghost", 80)
    wait(0.1)
    clearEffects()
}

on flag {
    forever {
        if touching("_edge_") {
            flash()
        }
        move(5)
        bounce()
    }
}
```

Create a block named `spiral` with parameter `steps`, then:

```
define spiral(steps) {
    move([steps])
    turnRight(91)
}

on flag {
    for [i] from 1 to 100 {
        spiral([i])
    }
}
```

---

## Step 9 — Lists

Lists are ordered sequences of values. Create a list named `items` in Scratch (Variables → New global list), then:

```
on flag {
    listDeleteAll([items])
    listAdd("sword", [items])
    listAdd("shield", [items])
    listAdd("potion", [items])

    // Read items
    for [i] from 1 to [items].length() {
        say([items].item([i]))
        wait(0.5)
    }
    say("")

    // Check membership
    if [items].contains("sword") {
        say("You have a sword.")
        wait(1)
        say("")
    }
}
```

---

## Step 10 — Sensing other things

```
on flag {
    forever {
        // Check distance to mouse
        if distanceTo("_mouse_") < 50 {
            say("Too close!")
        } else {
            say("")
        }

        // Show time
        set [hour] to currentTime("hour")
        set [min] to currentTime("minute")
        wait(1)
    }
}
```

---

## What to read next

Now that you've seen the basics, use the reference docs to look up specifics:

| You want to... | Read |
|---|---|
| Learn all control structures | [control-flow.md](control-flow.md) |
| Move sprites around | [motion.md](motion.md) |
| Change how sprites look | [looks.md](looks.md) |
| Play sounds | [sound.md](sound.md) |
| Coordinate between sprites | [events.md](events.md) |
| Read mouse, keyboard, time | [sensing.md](sensing.md) |
| Work with variables and lists | [variables-and-lists.md](variables-and-lists.md) |
| Do math and string operations | [math.md](math.md) |
| Define reusable procedures | [custom-blocks.md](custom-blocks.md) |
| Understand linter warnings | [linter.md](linter.md) |
| See complete working programs | [examples.md](examples.md) |
| Look something up fast | [quick-reference.md](quick-reference.md) |

---

## Common mistakes

**"Variable not found"** — You referenced `[score]` but no variable named `score` exists in Scratch. Create it first. Scratchpiler cannot summon memory from the void; it can only point to existing registries.

**"Unknown statement"** — You typed a function name that scratchpiler doesn't recognise (or spelled a known one wrong). Check [quick-reference.md](quick-reference.md) for the exact name, or accept that computers are literal-minded and lack empathy for your typos.

**Blocks don't appear after compile** — Check the sprite dropdown. You may have compiled into the wrong sprite, injecting your logic into a random obstacle or a decorative cloud where it will float, inert and useless.

**Red squiggles everywhere** — Look at the first error. Parser errors cascade: one missing `{` can make everything after it look like syntactical garbage. Fix from top to bottom, much like sorting out your life.

**Linter says "unreachable code"** — You put statements after `stopAll()`, `forever {}`, `stopThis()`, or `deleteClone()`. These blocks terminate execution. Placing code after them is a monument to optimism, but the runtime will ignore it. Remove or move them.
