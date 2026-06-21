# What Do I Do With All This

A guide for people who have never written code before, or who have written Scratch blocks before but have not yet graduated to writing things that look like code. This document will walk you through every concept you need — from what a variable is to why your sprite is doing something insane — in the order you're likely to need them. It is thorough. Bring a snack.

---

## Part 1: What Is Even Happening Here

You've installed Scratchpiler. You pressed Alt+M and an overlay appeared on top of your Scratch project. There's an editor, a toolbar, a sprite list, and an output panel at the bottom. It looks like a code editor because it is a code editor. You are now a programmer. Congratulations. The pay is terrible and the feedback loops are long, but the worst-case scenario is that your cat sprite does something unexpected, not that your company loses $40 million.

### What Scratchpiler actually does

Scratch works by assembling colorful blocks together, which the Scratch runtime interprets as instructions. Scratchpiler lets you write those same instructions as text, then **compiles** them — translates them into the same block structure Scratch uses internally — and **injects** the result directly into your project. The blocks it creates are real Scratch blocks. If you open the Scratch block editor afterward, you'll see them sitting there, indistinguishable from ones you dragged in by hand.

The text you write is not magical — it maps almost exactly to the blocks you'd drag in Scratch, just faster to write and edit.

### The compile button

**Ctrl+Enter** compiles what's in the editor and injects it into the current sprite. You can also click the **Compile** button in the toolbar. If there are errors, they appear in the output panel at the bottom and as red underlines in the editor. If it succeeds, it says so, and the sprite's block stack is replaced.

This is a **replace**, not a merge. Every time you compile, the old blocks for the scripts you wrote are removed and replaced with the new ones. This means if you want to keep something, it must be in the editor. The editor is the source of truth. Scratch's block view is just a read-only preview of what you compiled last.

---

## Part 2: The Concept of a Program

A program is a list of instructions. The computer — or in our case, the Scratch runtime — reads them from top to bottom and executes them one at a time. When it reaches the end, it stops, unless you've told it to loop.

In Scratch, a "program" is a stack of blocks. In Scratchpiler, it's a block of text. Same thing, different form.

```
on flag {
    say("Hello!")
    wait(2)
    say("")
}
```

This is a complete, functional program. When the green flag is clicked:
1. The sprite says "Hello!"
2. The program waits 2 seconds
3. The sprite stops saying anything (the empty string `""` clears the speech bubble)

Each line is one instruction. They run in order. Try it — type this into the editor, press Ctrl+Enter, then click the green flag in Scratch.

### Syntax: the grammar of code

"Syntax" means the rules for how code must be written. Just like you can't put a period in the middle of a sentence and expect it to be understood, you can't write `say "Hello!"` without parentheses and expect Scratchpiler to understand it. The syntax is strict:

- Functions are called with parentheses: `say("Hello!")`, not `say "Hello!"`
- Strings (text) are wrapped in double quotes: `"Hello"`, not `Hello` or `'Hello'`
- Blocks of code are wrapped in curly braces: `{ ... }`
- Instructions go one per line (mostly — you'll develop a feel for it)

If you break these rules, you get a **parse error** — a red underline telling you exactly where Scratchpiler got confused. Read the error message. It often tells you what it expected to see versus what it found.

---

## Part 3: Variables

A variable is a named container that holds a value. You can put a number, text, or the result of a calculation into a variable, look it up later by name, and change it whenever you want.

In Scratchpiler, variables are written in square brackets: `[score]`, `[playerX]`, `[lives]`. The brackets are not optional — they tell the compiler "this is a variable, not a function call or keyword."

### Creating variables

Variables must exist in Scratch before Scratchpiler can use them. This is one of Scratch's stranger design decisions — variables live in the Scratch project, and Scratchpiler only talks to them by name. If you reference `[score]` and there's no variable named `score`, you'll get a compile error.

To create one: in the Scratchpiler toolbar, click **Variables → New global variable…**, type a name, and click OK. That's it. The variable now exists and you can use it.

"Global" means all sprites can see it. If you want a variable that only one sprite can see, click **New local variable…** instead. For now, global is fine.

### Setting and changing variables

```
set [score] to 0           // put the value 0 into score
set [name] to "Alice"      // put text into a variable
set [x] to [playerX] + 10  // put a calculation result into a variable

change [score] by 1        // add 1 to score (same as score = score + 1)
change [health] by -5      // subtract 5 from health
```

`set` replaces whatever's in the variable. `change` adds to it. You'll use both constantly.

Shorthand that does exactly the same thing:

```
[score] += 10    // same as: change [score] by 10
[score] -= 5     // same as: change [score] by -5
[score] *= 2     // same as: set [score] to [score] * 2
[score] /= 4     // same as: set [score] to [score] / 4
[score]++        // same as: change [score] by 1
[score]--        // same as: change [score] by -1
```

### Reading variables

Just use them by name anywhere you'd use a value:

```
say([score])
move([speed])
set [doubled] to [score] * 2
if [lives] = 0 { stopAll() }
```

### A real example

Create a variable called `score`. Then write:

```
on flag {
    set [score] to 0
}

on key "space" {
    [score] += 1
    say(join("Score: ", [score]))
    wait(0.5)
    say("")
}
```

Press Ctrl+Enter. Click the flag to reset the score. Press space to add to it. The sprite announces the score every time. `join()` is how you stick two pieces of text together — Scratch doesn't let you use `+` for that.

---

## Part 4: Math and Expressions

An expression is anything that produces a value — a number, a calculation, a variable reference, a function result. You can use expressions almost anywhere a value is expected.

```
set [area] to [width] * [height]
set [hypotenuse] to sqrt([a] * [a] + [b] * [b])
set [clamped] to clamp([value], 0, 100)
set [rand] to random(1, 6)
```

### Arithmetic operators

```
+   addition
-   subtraction
*   multiplication
/   division
mod remainder (e.g. 7 mod 3 = 1)
```

They follow the normal order of operations. Use parentheses to be explicit:

```
set [result] to (2 + 3) * 4    // 20, not 14
```

### Comparison operators

These produce a true/false result, used in conditions:

```
[x] > 10     // x is greater than 10
[x] < 10     // x is less than 10
[x] = 10     // x equals 10
```

Note: there is no `!=`, `<=`, or `>=`. Scratch simply doesn't have them. To check "greater than or equal," write `not ([x] < 10)`. To check "not equal," write `not ([x] = 10)`. This is aggravating in proportion to how often you need it, which is often.

### Boolean operators

```
[x] > 0 and [y] > 0    // both true
[x] > 0 or [y] > 0     // at least one true
not ([x] > 0)           // opposite
```

### Math functions

```
abs([x])          // absolute value — removes the negative sign
round([x])        // round to nearest integer
floor([x])        // round down
ceiling([x])      // round up
sqrt([x])         // square root
random(1, 10)     // random integer between 1 and 10, inclusive
clamp([v], 0, 100) // force v to stay between 0 and 100
sin([deg])        // sine — Scratch uses degrees, not radians
cos([deg])        // cosine
```

### Joining text

```
join("Score: ", [score])       // "Score: 42"
join([firstName], [lastName])  // concatenate two variables
join("x=", join([x], join(", y=", [y])))  // multiple joins, increasingly ugly
```

Scratch only joins two things at a time. To join three or more, you nest calls, and it gets unwieldy fast. This is not Scratchpiler's fault — it compiles to the same `operator_join` block that Scratch provides, and that block takes exactly two inputs.

---

## Part 5: Making Decisions

Programs would be useless if they did the same thing every time. `if` lets you run different code depending on a condition.

### Basic if

```
on flag {
    if [lives] = 0 {
        say("Game over.")
        wait(2)
        stopAll()
    }
}
```

The block inside `{ }` only runs if the condition is true. If `lives` isn't 0, the whole thing is skipped.

### if / else

```
if [score] > 100 {
    say("You win!")
} else {
    say("Keep going.")
}
```

One or the other runs — never both.

### Chains: else if / elif

```
if [score] > 90 {
    say("A")
} else if [score] > 70 {
    say("B")
} else if [score] > 50 {
    say("C")
} else {
    say("Try again")
}
```

`elif` is an alias for `else if` — both work. The chain checks conditions from top to bottom and stops at the first one that's true.

### Conditions in expressions

You can use `and`, `or`, `not` to build complex conditions:

```
if [health] > 0 and [lives] > 0 {
    // player is alive
}

if touching("_edge_") or touching("Enemy") {
    // hit something
}

if not key("space") {
    // space is not being pressed
}
```

---

## Part 6: Repeating Things

Loops run a block of code more than once. There are several types, each for a different situation.

### repeat — a fixed number of times

```
repeat 10 {
    move(5)
    turnRight(36)
}
```

This draws a circle (roughly). The number can be a variable:

```
repeat [count] {
    say("again")
    wait(0.2)
}
```

### forever — run until the project stops

```
on flag {
    forever {
        move(3)
        bounce()
    }
}
```

This is the Scratch game loop. Most movement, physics, and collision detection lives inside a `forever` block. It runs one full cycle per frame. Code after a `forever` block never runs — the linter will warn you if you put anything there.

### while — repeat while a condition is true

```
while ([health] > 0) {
    move(3)
    wait(0.1)
}
say("you died")
```

The condition is checked at the start of each iteration. If it's false the first time, the body never runs.

### repeat until — repeat until a condition becomes true

```
repeat until ([health] = 0) {
    move(3)
    wait(0.1)
}
```

The opposite phrasing of `while`. Use whichever reads more naturally for the situation.

### for — count from one number to another

```
for [i] from 1 to 10 {
    say([i])
    wait(0.2)
}
```

`[i]` is an automatically-managed counter variable. It starts at 1 and increments by 1 each iteration until it exceeds 10. Use it inside the body to know which iteration you're on.

```
for [i] from 1 to [count] {
    set [x] to [i] * 10
    move([x])
}
```

The bounds can be any expression, including variables. The counter is always an integer.

### pyfor — iterate over a list

```
pyfor [item] in [myList] {
    say([item])
    wait(0.3)
}
```

This walks every element of a list from first to last, giving you each one as `[item]`. Much cleaner than manually tracking an index. See Part 8 for more on lists.

### wait — pause before continuing

```
wait(2)       // pause for 2 seconds
wait(0.1)     // pause for a tenth of a second
wait([delay]) // pause for a variable amount of time
```

`wait(0)` — also written as `yield()` — pauses for a single frame, which is useful when you have a tight loop that might freeze Scratch if left unchecked.

---

## Part 7: Events and Hat Blocks

In Scratch, nothing happens unless something triggers it. Those triggers are called **hat blocks** — they're the rounded-top blocks at the start of every script stack. In Scratchpiler, they look like this:

```
on flag { }        // green flag clicked
on click { }       // sprite clicked
on clone { }       // started as a clone
on key "space" { } // key pressed
on receive "msg" { }  // broadcast received
```

Every separate `on ...` block is an independent script. They can all run at the same time — Scratch is multi-threaded in this limited sense. One `forever` loop running movement doesn't block another `on key "space"` handler from firing.

### Multiple hat blocks — the normal way to structure things

```
on flag {
    set [score] to 0
    set [lives] to 3
    forever {
        // main game loop — runs every frame
        if [lives] = 0 {
            broadcast("game over")
            stopThis()
        }
    }
}

on key "space" {
    // jump
    change [vy] by 10
}

on receive "game over" {
    say("Game Over")
    wait(2)
    stopAll()
}
```

Three separate scripts. They all start when the flag is clicked (or when they receive their respective messages). They run concurrently.

### Broadcasts — sending messages between scripts

`broadcast("message")` fires an event. Any `on receive "message"` script — in any sprite — will run when it fires.

```
// In any sprite or the Stage:
broadcast("enemy died")

// In the same sprite, or any other sprite:
on receive "enemy died" {
    [score] += 100
    say("+100")
    wait(0.5)
    say("")
}
```

`broadcastAndWait("message")` sends the broadcast and pauses until all receiving scripts have finished. Regular `broadcast` doesn't wait.

Broadcasts are the primary way to coordinate between sprites, since sprites can't call functions in each other directly.

---

## Part 8: Lists

A list is an ordered collection of values. Think of it as a numbered row of boxes — box 1, box 2, box 3, and so on. Each box holds one value.

Scratch calls indexes 1-based: the first item is at index 1, not 0. If you're coming from literally any other programming language, pause here, breathe, and accept it.

### Creating a list

In the Scratchpiler toolbar: **Variables → New global list…**, give it a name, OK. It now exists in your project.

### Adding items

```
listAdd("sword", [inventory])      // append to the end
listAdd("shield", [inventory])     // append again
listAdd("potion", [inventory])     // append again

// Or using the friendlier alias:
append([inventory], "sword")
push([inventory], "potion")
```

### Reading items

```
set [first] to [inventory].item(1)    // get the item at index 1
set [last]  to [inventory].item([inventory].length())  // last item
say([inventory].item(2))              // say the second item
```

`.length()` is the number of items currently in the list.

### Checking things

```
if [inventory].contains("sword") {
    say("You have a sword.")
}

set [pos] to [inventory].indexOf("shield")  // 0 if not found
```

### Deleting items

```
listDelete(1, [inventory])           // remove item at index 1
listDeleteAll([inventory])           // remove everything
clear([inventory])                   // same thing, friendlier alias
```

### Replacing items

```
listReplace(2, [inventory], "axe")   // replace item 2 with "axe"
replace([inventory], 2, "axe")       // same thing, friendlier alias
```

### Iterating over a list

```
// Method 1: pyfor (cleanest)
pyfor [item] in [inventory] {
    say([item])
    wait(0.3)
}

// Method 2: for loop with index (when you need the index)
for [i] from 1 to [inventory].length() {
    say(join(join([i], ": "), [inventory].item([i])))
    wait(0.3)
}
```

### Pre-filling a list

If you need a list of a specific size filled with a starting value:

```
populateList([grid], 0, 100, true)      // 100 zeros, cleared first
populateList([board], "empty", 64, true) // 64 "empty" strings
populateList([data], [defaultVal], max, true) // 200,000 items — good luck
```

The `max` keyword fills to Scratch's effective ceiling of 200,000 items. Requesting `max` items is a choice you are allowed to make and one you may come to regret depending on what you do next.

---

## Part 9: Custom Blocks

Custom blocks let you give a name to a sequence of instructions, then reuse that sequence by name. They are Scratch's version of functions.

The important constraint: the block **must be created in Scratch first** using "Make a Block" in the block palette. Scratchpiler writes the body of the block, but the block's existence in the project comes from Scratch.

### Defining a custom block

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
```

Once defined, you call it from anywhere in the same sprite:

```
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

### Custom blocks with parameters

Create the block in Scratch with parameters (the "Add an input" button when making a block). Name them. Then:

```
define moveWithBounce(speed) {
    move([speed])
    if touching("_edge_") {
        bounce()
        turnRight(5)
    }
}

on flag {
    forever {
        moveWithBounce(5)
        wait(0.01)
    }
}
```

The parameter name inside `define` must match what Scratch named it when you created the block. Scratchpiler matches by name, not position.

### Why use custom blocks

- **Avoid repetition.** If you're writing the same 5 lines in 3 different places, make it a block and call it 3 times.
- **Readability.** `handleCollision()` is more readable than 20 lines of collision code inline.
- **Organization.** Break big scripts into named pieces.

Custom blocks in Scratch run in the same script thread as the caller. They are not concurrent. When you call `flash()`, everything pauses until `flash` finishes, then continues.

---

## Part 10: Enums — Giving Names to Magic Numbers

You will quickly find yourself writing conditions like `if [state] = 2` and forgetting what `2` means a week later. Enums solve this:

```
enum {
    IDLE = 0,
    WALKING = 1,
    JUMPING = 2,
    DEAD = 3
}
```

Now write `if [state] = DEAD` instead of `if [state] = 3`. The enum name is substituted at compile time — it costs nothing at runtime, creates no variables, and leaves no trace in the blocks. It's purely a writing convenience.

```
on flag {
    set [state] to IDLE
}

on key "space" {
    if [state] = IDLE or [state] = WALKING {
        set [state] to JUMPING
        change [vy] by 12
    }
}
```

Values don't have to be numbers:

```
enum {
    SOUND_JUMP  = "jump",
    SOUND_LAND  = "land",
    SOUND_DEATH = "death_scream"
}

on receive "jump" {
    play(SOUND_JUMP)
}
```

Enum names are bare (no brackets). If a name collides with a reporter like `xPos` or `timer`, the enum wins and you lose access to that reporter. Choose names that are obviously constants and the collision risk becomes negligible. `ALL_CAPS` is the conventional style.

---

## Part 11: Structs — Groups of Related Variables

If you have a player with an x position, y position, health, and speed, you could name the variables `playerX`, `playerY`, `playerHP`, `playerSpeed`. Or you could use a struct:

```
struct player { x, y, hp, speed }
```

This tells Scratchpiler to auto-create `player.x`, `player.y`, `player.hp`, and `player.speed` as Scratch variables when you compile. You reference them with dot notation inside brackets:

```
set [player.x] to 0
set [player.y] to 0
set [player.hp] to 100
set [player.speed] to 5

move([player.speed])
if [player.hp] <= 0 {
    broadcast("player died")
}
```

Structs don't do anything magical beyond naming. There's no object, no methods, no encapsulation. It's just a convention that keeps variables organized under a common prefix. But that's usually enough.

---

## Part 12: Common Patterns

Real programs are built from repeating patterns. Here are the ones you'll use constantly.

### Pattern 1: The game loop

Almost every Scratch game has a central loop that runs every frame and handles movement, physics, and input:

```
on flag {
    // Initialize everything first
    set [score] to 0
    set [lives] to 3
    set [speed] to 5
    goTo(0, 0)

    forever {
        // Input
        if key("right arrow") { changeX([speed]) }
        if key("left arrow")  { changeX(-[speed]) }
        if key("up arrow")    { changeY([speed]) }
        if key("down arrow")  { changeY(-[speed]) }

        // Physics / rules
        if touching("_edge_") {
            bounce()
        }

        // End conditions
        if [lives] = 0 {
            broadcast("game over")
            stopThis()
        }
    }
}
```

### Pattern 2: State machine

A state machine is when your sprite has a "mode" — walking, jumping, dead — and behaves differently based on which mode it's in. Use a variable `[state]` and enums:

```
enum {
    IDLE   = 0,
    RUN    = 1,
    JUMP   = 2,
    DEAD   = 3
}

on flag {
    set [state] to IDLE
    set [vy] to 0
    forever {
        // Handle each state
        if [state] = IDLE {
            if key("right arrow") or key("left arrow") {
                set [state] to RUN
            }
        } else if [state] = RUN {
            if key("right arrow") { changeX(5) }
            if key("left arrow")  { changeX(-5) }
            if not key("right arrow") and not key("left arrow") {
                set [state] to IDLE
            }
            if key("space") {
                set [state] to JUMP
                set [vy] to 12
            }
        } else if [state] = JUMP {
            changeX(3)
            change [vy] by -1   // gravity
            changeY([vy])
            if [vy] < 0 and touching("_edge_") {
                set [state] to RUN
                set [vy] to 0
            }
        } else if [state] = DEAD {
            say("You died.")
            wait(2)
            stopAll()
        }
    }
}
```

The power of the state machine is that each state only handles its own logic, and transitions are explicit.

### Pattern 3: Tracking a score

```
on flag {
    set [score] to 0
    set [highScore] to [highScore]  // don't reset high score on restart
}

define addScore(points) {
    change [score] by [points]
    if [score] > [highScore] {
        set [highScore] to [score]
    }
    say(join("+", join([points], "!")))
    wait(0.5)
    say("")
}
```

Call `addScore(10)` or `addScore(100)` whenever the player earns points. The custom block handles the high score update and the visual feedback.

### Pattern 4: Timer-based events

```
on flag {
    resetTimer()
    forever {
        if timer > 30 {
            set [state] to DEAD
            broadcast("time up")
            stopThis()
        }
        set [timeLeft] to round(30 - timer)
        wait(0.1)
    }
}
```

### Pattern 5: Using a list as a data store

```
on flag {
    // Build a hand of 5 random cards (numbers 1–13)
    listDeleteAll([hand])
    repeat 5 {
        listAdd(random(1, 13), [hand])
    }

    // Show the hand
    pyfor [card] in [hand] {
        say(join("Card: ", [card]))
        wait(0.5)
    }
    say("")
}
```

### Pattern 6: Clones as entities

Clones are copies of a sprite that run their own scripts independently. This is how you make bullets, enemies, particles, or anything where you need multiple instances:

```
// In the Bullet sprite:
on flag {
    hide()  // hide the original
}

on clone {
    show()
    repeat until (touching("_edge_") or touching("Enemy")) {
        move(10)
    }
    if touching("Enemy") {
        broadcast("enemy hit")
    }
    deleteClone()
}

// In the Player sprite (or wherever bullets are fired from):
on key "space" {
    createClone("Bullet")
}
```

Each clone runs its own `on clone` script. When it hits the edge or an enemy, it deletes itself. The original is hidden and does nothing — it's just a template.

---

## Part 13: When Things Go Wrong

Things will go wrong. This is not a warning, it is a certainty.

### Red underlines (parse errors)

The editor is telling you the syntax is broken. Hover the underline to read the message. Common causes:

- **Missing `{` or `}`**: Every `if`, `on`, `forever`, `repeat`, `while`, `for`, and `define` needs curly braces around its body. Forgetting one — especially the closing one — will cascade errors for everything below it. Fix from top to bottom.
- **Wrong quotes**: Strings use double quotes `"like this"`, not single quotes `'like this'`.
- **Forgot parentheses**: `say "hello"` doesn't work. It must be `say("hello")`.
- **Used brackets on the wrong thing**: `say([score])` works because `score` is a variable. `say([move])` doesn't because `move` isn't a variable.

### "Variable not found: score" (compile errors)

You used `[score]` but no variable named `score` exists in your Scratch project. Create it first: Variables menu → New variable.

The error message tells you which variable is missing and on which line. It doesn't fix the problem for you, but it does give you enough information to fix it yourself, which is considered a public service.

### "Unknown statement: myFunction" (compile errors)

You called something Scratchpiler doesn't know about. Either:
- It's a function name you made up (check the Quick Reference for the actual name)
- It's a custom block that you forgot to create in Scratch first
- You spelled a real function name wrong (`Bounce` instead of `bounce` — the language is case-sensitive)

### Blocks appear in the wrong sprite

You compiled into the wrong sprite. Check the sprite selector in the toolbar before pressing Ctrl+Enter. The name of the active sprite is shown in the toolbar. If you injected into the background by accident, compile the correct code into the background to overwrite it, then compile the correct code into the intended sprite.

### The sprite does nothing when the flag is clicked

Possible causes:
- Your code is inside `on key "..."` or `on receive "..."` instead of `on flag`
- The compile succeeded but you haven't clicked the green flag
- The compile had errors and was never injected (check the output panel)
- The blocks were compiled into a different sprite

### The sprite does something insane

Your logic is wrong. This is different from a syntax error — the code is valid, it just doesn't do what you intended. Common culprits:
- A `forever` loop that has no `wait()` inside, causing it to run thousands of times per second and do bizarre things
- A variable that was never reset when the game restarted
- A condition that's checking the wrong thing (`=` instead of `>`, etc.)
- An event firing multiple times because multiple scripts are responding to the same broadcast

When debugging, `say([variable])` inside the loop is your most powerful tool. It shows you what the variable actually contains at that moment. The gap between what you think it contains and what it actually contains is usually where the bug is hiding.

### "Unreachable code" (linter warning)

Yellow underlines are warnings, not errors — the code will still compile. "Unreachable code" means you have statements after `forever`, `stopAll()`, `stopThis()`, or `deleteClone()`. Those statements will never run. Either remove them or move them before the terminator.

---

## Part 14: Structuring a Bigger Project

Once you have more than one sprite and more than one script, keeping track of everything gets harder. Some habits that help:

**Comment your scripts.** Use `//` for notes to yourself. The tokenizer strips them out entirely — they never become blocks.

```
on flag {
    // Initialize the player at the center
    set [player.x] to 0
    set [player.y] to 0
    set [player.hp] to 100

    forever {
        // Poll input and apply movement
        if key("right arrow") { change [player.x] by [player.speed] }
        if key("left arrow")  { change [player.x] by -[player.speed] }
    }
}
```

**Use structs for grouped data.** One `struct player { x, y, hp, speed }` is cleaner than four separately-named variables floating around.

**Use enums for modes and states.** Comparing `[state] = DEAD` is clearer than `[state] = 3`.

**Use broadcasts as "events" to coordinate sprites.** Rather than one sprite directly manipulating another's variables (which it can't do cleanly anyway), have it broadcast a message and let the other sprite react.

**Keep each sprite's logic in its own scripts.** A player sprite shouldn't be managing enemy AI. Each sprite handles its own behavior; messages tell it when to change.

---

## Part 15: The Things You'll Hit Eventually

### Scratch variables are strings, not numbers

Scratch stores everything as strings internally and converts to numbers when arithmetic is applied. Usually this is invisible. Occasionally it bites you: `join("Time: ", [seconds])` might display `"Time: 3.000000000001"` if floating-point math accumulated rounding errors. Use `round([seconds])` before joining if you need clean display values.

### 1-based indexing

Lists in Scratch start at index 1. The first item is `[list].item(1)`. Index 0 returns an empty string without any error — a silent, confusing failure that has torpedoed many a `for [i] from 0 to` loop written by people accustomed to civilized languages. Start your indices at 1.

### Scratch has no return values for custom blocks

Custom blocks can't return values. You can't write `set [result] to myBlock()`. If your custom block produces a value you need, put it into a variable and read it after the call:

```
define computeDistance() {
    set [result] to sqrt([dx] * [dx] + [dy] * [dy])
}

computeDistance()
say([result])
```

It's inelegant. It is what it is.

### `forever` inside `on clone` is the right pattern for clones

Clones that need to do something every frame should have a `forever` loop in their `on clone` script. When the clone deletes itself, the loop stops. When the original sprite hides itself (as is conventional), its own scripts can run an empty forever loop or nothing at all.

### Compile replaces blocks, but not variables

Compiling doesn't reset your variables to their initial values. If you've been testing and `[lives]` is 0 from the last run, clicking the flag won't reset it unless your `on flag` script sets it explicitly. Always initialize variables in `on flag`.

---

## Quick Summary of the Whole Language

You now know enough to build real things. The full reference is in the other docs, but here's the mental model:

- **on flag / on key / on click / on receive** — entry points that start scripts
- **say / move / goTo / setX / setY** — do things
- **set / change** — store values in variables
- **if / else if / else** — make decisions
- **repeat / forever / while / for / pyfor** — repeat things
- **broadcast / broadcastAndWait** — coordinate between scripts and sprites
- **listAdd / listDelete / listReplace** etc. — manage lists
- **define** — make reusable named procedures
- **struct** — group related variables under a prefix
- **enum** — give names to constant values
- **wait / yield** — let time pass and other scripts breathe

Build something small. Break it. Read the error message. Fix it. Build something slightly bigger. Repeat. The curve is steep only at the beginning, and you're already past the steepest part.
