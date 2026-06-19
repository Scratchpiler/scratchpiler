# Looks

Everything visible about a sprite that isn't its position. Costumes, speech bubbles, effects, size, and layer order.

---

## Speech bubbles

Speech bubbles appear above the sprite. They do not block script execution — `say()` is fire-and-forget.

### say(message)

Shows a speech bubble indefinitely. Pass an empty string to clear it.

```
say("Hello!")
say([playerName])
say("")            // clears the bubble
```

### sayFor(message, secs)

Shows a speech bubble for a number of seconds, then clears it. Execution waits.

```
sayFor("Watch out!", 2)
sayFor(join("Score: ", [score]), 1.5)
```

### think(message) / thinkFor(message, secs)

Same as `say`/`sayFor` but with a thought bubble. For when your sprite is being contemplative.

```
think("Hmm...")
thinkFor("Should I trust this player?", 2)
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

A hidden sprite still runs scripts, still detects collisions with other sprites (though not vice versa), and still exists. It's just invisible. Like a ghost, but with code.

---

## Graphic effects

Scratch provides seven graphic effects: `color`, `fisheye`, `whirl`, `pixelate`, `mosaic`, `brightness`, and `ghost`. These are set and changed as numeric values.

### setEffect("effect", value) / changeEffect("effect", amount)

```
setEffect("ghost", 50)       // 50% transparent
setEffect("color", 0)        // reset color rotation
changeEffect("color", 25)    // rotate hue by 25
changeEffect("whirl", 90)    // add whirl
setEffect("brightness", -20) // dim
```

### clearEffects()

Resets all graphic effects to zero.

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
