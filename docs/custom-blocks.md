# Custom Blocks

Custom blocks are Scratch's version of functions. They take parameters and execute a body. They do not return values — Scratch has no return mechanism. If you need to "return" something, store it in a variable and read it afterward. This is Scratch's architectural gift to you.

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

Parameter names inside the body are referenced as variables with brackets: `[direction]`, `[speed]`, etc. These are Scratch's "argument" reporter blocks.

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

This is the accepted pattern. It works. It is not elegant.

---

## Recursion

Scratch custom blocks technically support recursion but it is not recommended for deep recursion since Scratch has no call stack overflow protection and will simply freeze. Shallow recursion (a few levels) works fine. Deep recursion turns your project into a loading spinner that spins forever.

---

## Scope

Custom block bodies run with access to all variables of the sprite. There is no local variable scope in Scratch — everything is global to the sprite. Parameters are special block-argument reporters that live only within the block's execution context, but all regular `[variables]` are shared.
