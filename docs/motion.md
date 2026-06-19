# Motion

All motion blocks operate on the currently selected sprite. Calling motion blocks in a Stage script is technically possible and produces no visible effect, which is Scratch's way of accepting your input gracefully.

---

## Basic movement

### move(steps)

Moves the sprite forward in its current direction.

```
move(10)
move(-5)   // move backwards
move([speed])
```

### turnRight(degrees) / turnLeft(degrees)

Rotates the sprite clockwise or counter-clockwise.

```
turnRight(15)
turnLeft(90)
turnRight([angle])
```

### setDirection(degrees)

Points the sprite in an absolute direction. Scratch uses a compass-style system: 0° is up, 90° is right, 180° is down, -90° is left. This is different from every other coordinate system you've used, and there's nothing to be done about it.

```
setDirection(90)    // point right
setDirection(0)     // point up
setDirection(-90)   // point left
setDirection(180)   // point down
```

### pointTowards(target)

Points the sprite toward another sprite or the mouse pointer.

```
pointTowards("_mouse_")
pointTowards("Enemy")
pointTowards([targetName])
```

### bounce()

If the sprite is touching the edge, bounce (reflect direction). Equivalent to Scratch's "if on edge, bounce".

```
forever {
    move(5)
    bounce()
}
```

---

## Positioning

### goTo(x, y) / goTo("target")

Teleports the sprite to a position or to another sprite/pointer.

```
goTo(0, 0)           // center of stage
goTo(mouseX, mouseY) // where the mouse is right now
goTo("_mouse_")      // snap to mouse pointer
goTo("OtherSprite")  // snap to another sprite
```

### glide(secs, x, y) / glide(secs, "target")

Smoothly moves to a position over a number of seconds.

```
glide(1, 0, 0)           // glide to center in 1 second
glide(0.5, mouseX, mouseY)  // glide to current mouse position
glide(2, "Enemy")        // glide to the "Enemy" sprite
glide(0.1, "_mouse_")    // follow the mouse (use in a loop for continuous tracking)
```

### setX(x) / setY(y)

Sets one coordinate without changing the other.

```
setX(100)
setY(-50)
setX([playerX])
```

### changeX(dx) / changeY(dy)

Moves the sprite by a relative amount.

```
changeX(5)     // move right 5 pixels
changeY(-5)    // move down 5 pixels (negative Y is down in Scratch)
changeX([speed])
```

---

## Rotation style

### setRotationStyle(style)

Controls how the sprite visually rotates. Does not affect `direction`.

```
setRotationStyle("all around")    // sprite image rotates freely
setRotationStyle("left-right")    // sprite flips horizontally only
setRotationStyle("don't rotate")  // sprite image stays fixed regardless of direction
```

---

## Layers

### goToFront() / goToBack()

Sends the sprite to the very front or very back of the rendering layer stack.

```
goToFront()
goToBack()
```

### moveForward(layers) / moveBackward(layers)

Moves the sprite forward or backward a number of layers.

```
moveForward(1)
moveBackward(3)
```

---

## Reporters

These return values and can be used in expressions.

| Reporter | Type | Description |
|---|---|---|
| `xPos` | number | Current X position (-240 to 240) |
| `yPos` | number | Current Y position (-180 to 180) |
| `direction` | number | Current direction in degrees |

```
set [savedX] to xPos
if xPos > 200 {
    setX(-200)    // wrap around
}
```

---

## distanceTo(target)

Returns the distance in pixels to another sprite or the mouse.

```
if distanceTo("Enemy") < 20 {
    say("Too close!")
}
```
