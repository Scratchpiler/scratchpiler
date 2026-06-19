# Sensing

Reporters and functions that read the state of the world: the mouse, keyboard, other sprites, the timer, the microphone, the current time, and the existential fact of who is logged in.

---

## Collision detection

### touching("target")

Returns `true` if the sprite is touching the named sprite, the mouse pointer, or the edge. Boolean — use in conditions.

```
if touching("_edge_") { bounce() }
if touching("_mouse_") { say("You found me!") }
if touching("Enemy") { broadcast("player hit") }
```

Targets: `"_edge_"`, `"_mouse_"`, or any sprite name.

---

## Keyboard

### key("key name")

Returns `true` if the key is currently held down. Boolean.

```
if key("space") { jump() }
if key("right arrow") { changeX(5) }
```

Common key names: `"space"`, `"enter"`, `"up arrow"`, `"down arrow"`, `"left arrow"`, `"right arrow"`, `"a"`–`"z"`, `"0"`–`"9"`, any letter.

Using `key()` inside a `forever` loop gives you polling-based input. Using `on key "..." { }` hat blocks gives you event-based input. Both are valid. Polling is simpler for "is this held" logic; events are simpler for "was this just pressed" logic.

---

## Mouse

| Reporter | Type | Description |
|---|---|---|
| `mouseX` | number | Mouse X position on the stage |
| `mouseY` | number | Mouse Y position on the stage |
| `mouseDown` | boolean | `true` if mouse button is held |

```
goTo(mouseX, mouseY)
if mouseDown { say("clicking") }
```

---

## Ask and answer

### askAndWait("question")

Shows a prompt to the user and waits for them to type an answer. The answer is stored in the `answer` reporter.

```
askAndWait("What is your name?")
say(join("Hello, ", answer))
```

### answer (reporter)

Returns the last answer given to `askAndWait`. Persists until the next `askAndWait`.

```
askAndWait("Enter the password:")
if answer = "hunter2" {
    say("Access granted.")
} else {
    say("Nice try.")
}
```

---

## Timer

### timer (reporter)

Returns the number of seconds since the project started (or since the last `resetTimer()`).

```
if timer > 30 {
    broadcast("time's up")
}
say(join("Time: ", timer))
```

### resetTimer()

Resets the timer to 0, restarting the count. Useful for pacing actions before the timer ticks too high and crashes your logic.

```
on flag {
    resetTimer()
}
```

---

## Sound sensing

### loudness (reporter)

Returns the current microphone loudness from 0 to 100. Requires browser microphone permission, which the user will prompt-deny. If denied, it returns a constant 0, meaning your `on loudness > 50` hat block will never trigger. This is probably for the best, preventing your code from listening to the player sighing at their keyboard.

```
if loudness > 40 {
    say("Shh! Quiet down.")
}
```

---

## Time

### currentTime("unit")

Returns the current real-world time read from the user's local system clock.

| Unit | Returns |
|---|---|
| `"year"` | Four-digit year (e.g. 2026) |
| `"month"` | Month number (1–12) |
| `"date"` | Day of the month (1–31) |
| `"day"` | Day of the week (1=Sunday, 7=Saturday) |
| `"hour"` | Hour (0–23) |
| `"minute"` | Minute (0–59) |
| `"second"` | Second (0–59) |

```
if currentTime("hour") > 20 {
    say("It's past 8 PM. Maybe go to bed. Or don't, I'm just a sprite.")
}

say(join(currentTime("hour"), join(":", currentTime("minute"))))
```

### daysSince2000 (reporter)

Returns the number of days (including fractional parts) since January 1, 2000. Use this to calculate how long humanity has survived the Y2K bug, or to track how much time has slipped away while you dragged virtual lego blocks around.

```
say(daysSince2000)
```

### username (reporter)

Returns the Scratch username of the logged-in user, if any. Returns an empty string for logged-out users, which is most people. Useful for personalizing messages or tracking who is using your project to avoid their actual responsibilities.

```
say(join("Hello, ", username))
```

---

## Sensing other sprites

These reporters return properties of another sprite by name. They compile to Scratch's "... of [sprite]" reporter block.

| Function | Returns |
|---|---|
| `xOf("sprite")` | X position of the named sprite |
| `yOf("sprite")` | Y position of the named sprite |
| `directionOf("sprite")` | Direction of the named sprite |
| `costumeNumOf("sprite")` | Costume number of the named sprite |
| `costumeNameOf("sprite")` | Costume name of the named sprite |
| `sizeOf("sprite")` | Size percentage of the named sprite |
| `volumeOf("sprite")` | Volume percentage of the named sprite |

```
if xOf("Enemy") > xPos {
    say("The enemy is to the right.")
}

if costumeNameOf("Boss") = "dead" {
    broadcast("boss defeated")
}
```

---

## Drag mode

### setDragMode("mode")

Controls whether the sprite can be dragged by the user.

```
setDragMode("draggable")
setDragMode("not draggable")
```

Useful for drag-and-drop games or for preventing accidental dragging of UI elements.
