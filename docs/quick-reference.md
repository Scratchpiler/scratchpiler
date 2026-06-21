# Quick Reference

Everything on one page. For detailed explanations, follow the links to the relevant doc.

---

## Script structure

```
on flag { }              // green flag
on click { }             // sprite clicked
on clone { }             // started as a clone
on key "space" { }       // key pressed
on receive "msg" { }     // broadcast received
on backdrop "name" { }   // backdrop switched to
on timer > 10 { }        // timer exceeds value
on loudness > 50 { }     // microphone loudness exceeds value

define blockName(p1, p2) { }   // custom block definition
```

---

## Control flow

```
if condition { }
if condition { } else { }
if condition { } else if condition { } else { }   // elif also works
elif condition { }   // alias for else if

repeat 10 { }
forever { }
repeat until (condition) { }
while (condition) { }
for [i] from 1 to 10 { }
pyfor [item] in [list] { }   // iterate over every element of a list

wait(seconds)
wait until condition

stopAll()
stopThis()
stopOtherScripts()
createClone()
createClone("SpriteName")
deleteClone()
yield()                  // pause one tick (= wait 0)

// Aliases
clone()                  // createClone("_myself_")
stopMe()                 // stopThis()
```

---

## Scratchroutines

Broadcast-based pseudo-coroutines with parameter passing and lifecycle management.

```
// Define
scratchroutine name(param1, param2) {
    // params are readable as [param1], [param2] inside the body
    checkCancel()   // stop immediately if cancel has been requested
}

// Launch (fire and forget — equivalent to broadcast)
launch name(arg1, arg2)

// Await (block until done — equivalent to broadcastAndWait)
await name(arg1, arg2)

// Cancel (set cancel flag — routine stops at next checkCancel())
cancel name

// Query (boolean: is the routine currently running?)
if isRunning(name) { }
wait until not isRunning(name)
```

---

## Variables

```
set [x] to value
change [x] by amount
[x] += n    [x] -= n    [x] *= n    [x] /= n
[x]++       [x]--       // increment / decrement (sugar for change by 1 / -1)

showVariable([x])
hideVariable([x])
```

---

## Structs

Declare a group of related stage variables. Variables are auto-created on compile if they don't exist.

```
struct player { x, y, hp, speed }
struct enemy  { x, y, hp, type }

set [player.x] to 0
set [player.hp] to 100
if [player.hp] <= 0 { say("dead") }
```

Typing `[` in the editor shows all `struct.field]` completions. Typing `[player.` shows that struct's fields only.

---

## Lists

```
listAdd(item, [list])
listDelete(index, [list])
listDeleteAll([list])
listInsert(item, index, [list])
listReplace(index, [list], item)
showList([list])
hideList([list])

[list].length()          // number of items
[list].item(index)       // item at 1-based index
[list][i]                // shorthand for .item([i])
[list].contains(value)   // boolean
[list].indexOf(value)    // 1-based index, or 0 if absent
[list].sort()            // sort in place, ascending (Shell sort — O(n^1.5), no recursion required)
[list].sort("desc")      // sort in place, descending

// Aggregates (used in `set [x] to …` only)
set [total] to [list].sum()          // sum of all numeric items
set [lo]    to [list].min()          // minimum numeric item
set [hi]    to [list].max()          // maximum numeric item
set [n]     to [list].count(value)   // count items equal to value

// Ergonomic aliases (list first, then args — more natural argument order)
append([list], item)     // listAdd
push([list], item)       // listAdd
remove([list], index)    // listDelete
insert([list], index, item)    // listInsert
replace([list], index, item)   // listReplace
clear([list])            // listDeleteAll
```

---

## Motion

```
move(steps)
turnRight(degrees)
turnLeft(degrees)
setDirection(degrees)    // 0=up 90=right 180=down -90=left
turnTo(degrees)          // alias for setDirection()
pointTowards("target")   // "_mouse_" or sprite name
goTo(x, y)
goTo("target")
glide(secs, x, y)
glide(secs, "target")
setX(x)   setY(y)
changeX(dx)   changeY(dy)
bounce()
setRotationStyle("all around" | "left-right" | "don't rotate")
goToFront()   goToBack()
moveForward(n)   moveBackward(n)

// Reporters
xPos   yPos   direction
distanceTo("target")
```

---

## Looks

```
say(message)
sayFor(message, secs)
think(message)
thinkFor(message, secs)
switchCostume("name")
nextCostume()
switchBackdrop("name")
switchBackdropAndWait("name")
nextBackdrop()
setSize(percent)
changeSize(amount)
show()   hide()
setEffect("effect", value)    // color fisheye whirl pixelate mosaic brightness ghost
changeEffect("effect", amount)
clearEffects()

// Reporters
size   costumeNum   costumeName
```

---

## Sound

```
play("name")
playUntilDone("name")
stopSounds()
setVolume(percent)
changeVolume(amount)
setSoundEffect("PITCH" | "PAN LEFT/RIGHT", value)
changeSoundEffect("PITCH" | "PAN LEFT/RIGHT", amount)
clearSoundEffects()

// Reporter
volume
```

---

## Events

```
broadcast("message")
broadcastAndWait("message")
```

---

## Sensing

```
touching("_edge_" | "_mouse_" | "SpriteName")  // boolean
key("key name")                                 // boolean
askAndWait("question")
answer       mouseDown      mouseX    mouseY
timer        loudness       size
costumeNum   costumeName    volume
username     daysSince2000
resetTimer()
currentTime("year" | "month" | "date" | "day" | "hour" | "minute" | "second")
distanceTo("target")
xOf("sprite")   yOf("sprite")   directionOf("sprite")
costumeNumOf("sprite")   costumeNameOf("sprite")
sizeOf("sprite")         volumeOf("sprite")
setDragMode("draggable" | "not draggable")
```

---

## Math functions

```
abs(n)       round(n)     floor(n)    ceiling(n)    ceil(n)
sqrt(n)      exp(n)       pow10(n)    ln(n)         log(n)
sin(deg)     cos(deg)     tan(deg)
asin(n)      acos(n)      atan(n)
random(min, max)
clamp(value, min, max)
```

---

## String / operator functions

```
join(str1, str2)
letterOf(index, string)       // 1-based
contains(string, substring)   // boolean
"string".length()
[var].length()
```

---

## Ergonomic aliases

Short, friendlier names for commonly-used functions. These compile to exactly the same blocks as their canonical counterparts.

```
// Motion
step(n)          → move(n)
forward(n)       → move(n)
left(degrees)    → turnLeft(degrees)
right(degrees)   → turnRight(degrees)
front()          → goToFront()
back()           → goToBack()
turnTo(degrees)  → setDirection(degrees)

// Looks / output
print(msg)       → say(msg)
println(msg)     → say(msg)

// Control
clone()          → createClone("_myself_")
stopMe()         → stopThis()

// Events
send("msg")         → broadcast("msg")
sendAndWait("msg")  → broadcastAndWait("msg")

// Sensing
ask("question")     → askAndWait("question")

// Lists (list-first argument order)
append([list], val)            → listAdd(val, [list])
push([list], val)              → listAdd(val, [list])
remove([list], idx)            → listDelete(idx, [list])
insert([list], idx, val)       → listInsert(val, idx, [list])
replace([list], idx, val)      → listReplace(idx, [list], val)
clear([list])                  → listDeleteAll([list])
```

---

## Debugging

```
breakpoint   // pause execution here; open the debug bar
```

When a `breakpoint` is hit at runtime, Scratchpiler's **debug bar** slides in at the bottom of the overlay. Click **Resume ▶** to continue execution. You can hit multiple breakpoints in sequence — each one pauses and waits.

Compiles to four blocks: sets `[__dbg_at__]` to `1`, sets `[__dbg_resume__]` to `0`, waits until `[__dbg_resume__] = 1`, then clears `[__dbg_at__]`. The overlay polls `__dbg_at__` every 100ms to detect the pause.

---

## Operators

```
+  -  *  /  mod           // arithmetic
<  >  =                   // comparison (no <=, >=, !=)
and  or  not              // boolean
```

---

## Literals

```
42          3.14          -5          // numbers
"hello"                               // strings (double quotes only)
[varName]                             // variable reference
#ff6600                               // hex color
```

---

## Comments

```
// Everything after // is stripped by the tokenizer, never to be seen by the VM.
```

---

## Key names (for `on key` and `key()`)

`"space"` `"enter"` `"up arrow"` `"down arrow"` `"left arrow"` `"right arrow"`  
`"a"` through `"z"` &nbsp;&nbsp; `"0"` through `"9"`

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Alt+M` | Open / close scratchpiler overlay |
| `Ctrl+Enter` | Compile & inject (the moment of truth) |
| `Ctrl+S` | Compile & inject (for standard editor muscle memory) |
| `Alt+Shift+F` | Format / auto-indent (hiding structural chaos with spacing) |
| `Ctrl+Space` | Trigger autocomplete (request assistance from Monaco) |
| `Esc` | Close overlay |

When paused at a `breakpoint`, click the **Resume ▶** button in the debug bar to continue. The bar disappears once execution resumes.

---

## Tips for Survival

- **Save Often**: Chrome likes to discard inactive tab states. If your browser crashes because you ran an unyielded `forever` loop, unsaved code is gone.
- **Warp Mode Speed**: Custom blocks default to their Scratch palette settings. If you need speed, edit the prototype in Scratch's graphical editor to "run without screen refresh."
- **Decompiler Opacity**: Opcode comments like `// unsupported` mean you're using extensions or blocks scratchpiler has not cataloged. Dragging them around in Scratch is your only recourse.
- **Keep it Simple**: Trying to implement a 3D raycaster in a Tampermonkey-injected DSL is a path to enlightenment or madness. Usually the latter.
