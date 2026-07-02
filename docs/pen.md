# Pen

Draws permanent-ish trails and stamps onto the Stage's canvas layer, underneath every sprite. Requires the Pen extension to be added to the project in the Scratch editor first — scratchpiler happily compiles `penDown()` either way, but nothing will actually draw until Scratch itself knows the pen blocks exist.

Every pen command below also has a `pen.` namespaced form — `penDown()` and `pen.down()` compile to the exact same thing, so use whichever reads better:

```
pen.down()
pen.setColor(#ff0000)
pen.setSize(5)
pen.stamp()
pen.up()
```

| Flat form | `pen.` form |
| --- | --- |
| `penDown()` | `pen.down()` |
| `penUp()` | `pen.up()` |
| `penClear()` | `pen.clear()` |
| `stamp()` | `pen.stamp()` |
| `setPenColor(color)` | `pen.setColor(color)` |
| `setPenSize(size)` | `pen.setSize(size)` |
| `changePenSize(amount)` | `pen.changeSize(amount)` |
| `setPenColorParam("param", value)` | `pen.setColorParam("param", value)` |
| `changePenColorParam("param", amount)` | `pen.changeColorParam("param", amount)` |

---

## Drawing state

Pen marks only appear while the pen is down. A sprite that never calls `penDown()` can wander the Stage all day and leave nothing behind.

### penDown() / penUp()

`penDown()` starts drawing a trail wherever the sprite moves. `penUp()` stops it. Moving with the pen down draws a line from the sprite's previous position to its new one — teleporting via `goTo()` still draws a straight line between the two points, same as dragging in the real Scratch editor.

```
on flag {
    penDown()
    repeat 4 {
        move(100)
        turnRight(90)
    }
    penUp()
}
```

Short aliases: `down()` / `up()`.

---

## Clearing and stamping

### penClear()

Erases every pen mark and stamp from the entire Stage — not just this sprite's trail. This is a stage-wide operation, same as clicking the eraser in Scratch's pen menu.

```
penClear()   // wipes the canvas clean, for anyone drawing on it
```

### stamp()

Stamps a copy of the sprite's current costume onto the canvas, at its current position, size, and rotation. Unlike drawing a line, a stamp is a full image — useful for particle effects, tile painting, or leaving footprints.

```
on flag {
    forever {
        stamp()
        move(20)
        wait(0.2)
    }
}
```

---

## Pen color and size

### setPenColor(color)

Sets the pen's drawing color. Takes a `#rrggbb` hex literal (see [Hex color literals](math.md#hex-color-literals)), or any string/expression as a fallback.

```
setPenColor(#ff0000)     // red
setPenColor(#00aaff)
```

### setPenSize(size) / changePenSize(amount)

Sets or adjusts the thickness of the pen's line, in pixels.

```
setPenSize(5)
changePenSize(1)     // gets a little thicker each call
```

---

## Pen color parameters

Finer control than `setPenColor()` — adjusts one channel of the pen's color independently: `"color"` (hue), `"saturation"`, `"brightness"`, or `"transparency"`. Each is a 0–100 scale (with `"color"` wrapping around like a hue wheel).

### setPenColorParam("param", value) / changePenColorParam("param", amount)

```
setPenColorParam("color", 0)          // reset hue
changePenColorParam("color", 10)      // cycle hue by 10 per call, rainbow trail
setPenColorParam("transparency", 50)  // half-opacity strokes
```
