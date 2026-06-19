# Looks

Everything visible about a sprite that isn't its position. Costumes, speech bubbles, graphical mutations, size, and layer ordering. It's about presentation — making things look functional even when the underlying math is a disaster.

---

## Speech bubbles

Speech bubbles appear above the sprite, offering a crude form of user feedback. They do not block script execution — calling `say()` is a fire-and-forget operation, meaning your sprite will scream into the void while the rest of the script continues without pause.

### say(message)

Shows a speech bubble indefinitely. Pass an empty string to clear it.

```
say("Hello!")
say([playerName])
say("")            // clears the bubble, returning the sprite to silence
```

### sayFor(message, secs)

Shows a speech bubble for a number of seconds, then clears it. Unlike `say()`, this blocks execution, pausing the thread for the duration. Useful when you want to force the player to read your dialog boxes while freezing all action.

```
sayFor("Watch out!", 2)
sayFor(join("Score: ", [score]), 1.5)
```

### think(message) / thinkFor(message, secs)

Same as `say`/`sayFor` but with a cloud-shaped thought bubble. For when your sprite is being contemplative, or realizing the limits of its own virtual universe.

```
think("Hmm...")
thinkFor("Should I trust this player? They've crashed this project twice already.", 2)
```

---

## Costumes

### switchCostume("name")

Switches to a named costume. The name must exactly match a costume in the sprite.

```
switchCostume("idle")
switchCostume("run-1")
switchCostume([currentCostume])
```

### nextCostume()

Advances to the next costume in the list, wrapping around. The classic animation technique.

```
on flag {
    forever {
        nextCostume()
        wait(0.1)
    }
}
```

---

## Backdrops

### switchBackdrop("name")

Switches the Stage's backdrop. Can be called from any sprite.

```
switchBackdrop("level1")
switchBackdrop("game over")
```

### switchBackdropAndWait("name")

Switches the backdrop and waits for any `on backdrop` scripts to finish before continuing.

```
switchBackdropAndWait("cutscene")
say("That was a cutscene.")
```

### nextBackdrop()

Advances to the next backdrop in the list.

```
nextBackdrop()
```

---

## Size

### setSize(percent)

Sets the sprite's size as a percentage of its original size. 100 is normal.

```
setSize(200)    // double size
setSize(50)     // half size
setSize([scale] * 100)
```

### changeSize(amount)

Changes the size by a relative percentage.

```
changeSize(10)     // grow by 10%
changeSize(-10)    // shrink by 10%
```

---

## Visibility

```
show()
hide()
```

A hidden sprite still runs scripts, still detects collisions with other sprites (though visible sprites won't detect colliding with it), and still exists in the VM's active registry. It's just invisible. Like your contributions to the team project. It is gone from sight, but not from memory.

---

## Graphic effects

Scratch provides exactly seven graphic effects: `color` (hue shift), `fisheye` (pinch/distort), `whirl` (twist), `pixelate` (resolution reduction), `mosaic` (cloning visual grid), `brightness` (luminance offset), and `ghost` (opacity). These are set and changed as numeric values.

### setEffect("effect", value) / changeEffect("effect", amount)

```
setEffect("ghost", 50)       // 50% transparent, halfway to non-existence
setEffect("color", 0)        // reset color rotation
changeEffect("color", 25)    // rotate hue by 25, cycling through the rainbow
changeEffect("whirl", 90)    // add a whirl effect to distort reality
setEffect("brightness", -100)// plunge your sprite into absolute darkness
```

### clearEffects()

Resets all graphic effects to zero, restoring the sprite to its default, unaltered state.

```
clearEffects()
```

---

## Reporters

| Reporter | Type | Description |
|---|---|---|
| `size` | number | Current size as a percentage |
| `costumeNum` | number | Current costume index (1-based) |
| `costumeName` | string | Current costume name |

```
if costumeNum = 1 {
    switchCostume("run-1")
}
say(costumeName)
```
