# Events

Events in scratchpiler cover broadcasting — the pub/sub system Scratch uses to coordinate between sprites. Hat blocks that respond to events are covered in [control-flow.md](control-flow.md).

---

## Broadcasting

Broadcasts are named messages that any sprite can send and any sprite can listen for. They're how Scratch scripts talk to each other, given that sprites can't call each other's custom blocks directly. Character-building constraint.

### broadcast("message")

Sends a broadcast message and immediately continues. All `on receive` scripts in the project start running, but this script doesn't wait for them.

```
broadcast("game over")
broadcast("level up")
broadcast([messageVar])
```

### broadcastAndWait("message")

Sends a broadcast and waits until all triggered `on receive` scripts have finished before continuing.

```
broadcastAndWait("play intro")
say("The intro just finished.")
```

---

## Receiving

Use an `on receive` hat block to respond to a broadcast:

```
on receive "game over" {
    stopAll()
}

on receive "level up" {
    change [level] by 1
    switchBackdrop(join("level", [level]))
}
```

---

## Broadcast names

Broadcast messages are strings. They must already exist as broadcast variables in the Scratch project, OR scratchpiler will auto-create them when compiling (it calls `resolveBroadcast`, which creates a new ID if the message doesn't exist). Either way, the string literal in your source is what appears in Scratch.

---

## Coordinating multiple sprites

A common pattern: one sprite acts as a "controller" that broadcasts events, and other sprites respond.

```
// In the Player sprite
on flag {
    forever {
        if touching("Enemy") {
            broadcast("player hit")
            wait(1)   // brief invincibility window
        }
    }
}

// In the HUD sprite
on receive "player hit" {
    change [lives] by -1
    if [lives] = 0 {
        broadcast("game over")
    }
}
```

`broadcastAndWait` is useful when the sender needs to know that all receivers have finished — for example, waiting for an animation to complete before advancing a cutscene.
