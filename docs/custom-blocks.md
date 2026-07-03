# Custom Blocks

Custom blocks are Scratch's approximation of functions. They take parameters and execute a body. They do not return values — Scratch has no return mechanism. If you need to "return" something, you must store it in a global variable and read it afterward. This is Scratch's architectural gift to you, transforming every function call into a high-stakes game of global variable roulette.

---

## Defining a custom block

```
define blockName(param1, param2) {
    // body
}
```

The block name is the identifier after `define`. Parameters are comma-separated names inside the parentheses. A block with no parameters uses empty parens.

```
define jump() {
    changeY(50)
    wait(0.1)
    changeY(-50)
}

define shoot(direction, speed) {
    setDirection([direction])
    move([speed])
}

define setHealthBar(value, maxValue) {
    set [healthRatio] to [value] / [maxValue]
    set [barWidth] to [healthRatio] * 200
}
```

Parameter names inside the body are referenced as variables with brackets: `[direction]`, `[speed]`, etc. These are Scratch's "argument" reporter blocks. They look like variables, but they are read-only. Attempting to write to them will result in compilation failure and a reminder that parameters are not variables.

---

## Calling a custom block

Custom block calls look like function calls.

```
jump()
shoot(90, 10)
setHealthBar([health], [maxHealth])
```

The call is resolved against the live Scratch VM — the prototype must already exist in Scratch's block palette for the active sprite. If you try to call a block that doesn't exist, you'll get a compile error: `Custom block not found: blockName`.

**Workflow for new custom blocks:**

1. Create the block in Scratch's block editor (the usual way — click "Make a Block")
2. Switch to scratchpiler
3. Write the `define` body and any calls
4. Compile

You only need to create the block header in Scratch. Scratchpiler compiles the implementation.

---

## Parameters

Parameters in scratchpiler are positional. When you call `shoot(90, 10)`, the first argument goes to the first parameter, the second to the second. Scratch stores these as block-argument inputs referenced by generated IDs, which scratchpiler resolves by matching argument positions.

Parameters can receive any expression:

```
shoot(direction + 90, [speed] * 1.5)
setHealthBar(clamp([hp], 0, [maxHp]), [maxHp])
```

---

## Warp mode

Scratch custom blocks can run in "run without screen refresh" (warp) mode. Scratchpiler reads this setting from the existing prototype block in Scratch — it preserves whatever warp setting was used when the block was created. To change it, edit the block in Scratch's block editor.

---

## No return values

Scratch does not support returning values from custom blocks. If your block needs to produce a result, use a dedicated variable as an output channel:

```
define clampHealth(value) {
    set [_clampResult] to clamp([value], 0, [maxHealth])
}

// Caller:
clampHealth([rawHealth])
set [health] to [_clampResult]
```

This is the standard, community-accepted pattern. It works. It is not elegant. It is the architectural equivalent of using a global bucket to carry water from room to room because your house lacks plumbing.

---

## Return values

Custom blocks can now return a value by adding a `returns` clause to the definition.

```
define rectArea(w, h) returns {
    return w * h
}

define greet(name) returns {
    return join("hello, ", name)
}

on flag {
    set [area] to rectArea(6, 7)
    say("area = {[area]}")
    say("{greet("world")}")
}
```

The `returns` keyword after the parameter list declares that this block produces a value. Inside the body, use `return <expr>` to set the result and exit. A bare `return` with no expression just exits without setting a value (defaults to empty string).

**Calling a `returns` block:** A block declared with `returns` can be called inside any expression, not just as a statement. The result is captured and usable immediately.

```
if rectArea(3, 4) + rectArea(2, 5) = 22 {
    say("arithmetic checks out")
}
```

**Behind the scenes:** The result is stored in a hidden global variable named `__ret_<blockname>`. The call itself runs in warp mode ("run without screen refresh"), making the call → read atomic and fast. Recursion is fully supported because the result is captured immediately after each call returns, preventing outer callers' values from being clobbered.

**Example: factorial with recursion**

```
define fact(n) returns {
    if n < 2 {
        return 1
    }
    return n * fact(n - 1)
}

on flag {
    say("5! = {fact(5)}")  // says "5! = 120"
}
```

**Compiler warning:** If a block is declared with `returns` but contains no `return <value>` statement, the compiler warns that the block may return empty string unintentionally.

---

## Recursion

Scratch custom blocks technically support recursion, but it is not recommended for anything deep. Because Scratch has no call stack overflow protection, it will simply freeze, locking up the thread and turning your project into a loading spinner that spins until you kill the tab. Shallow recursion (a few levels) works fine; deep recursion is a great way to stress-test your browser's crash reporter.

---

## Scope

Custom block bodies run with access to all variables of the sprite. There is no local variable scope in Scratch — everything is global to the sprite. Parameters are special block-argument reporters that live only within the block's execution context, but all regular `[variables]` are shared. If you modify `[score]` inside a custom block, it changes for the entire sprite, ensuring that side-effects are plentiful and tracking down state mutation bugs is a nightmare. Enjoy.
