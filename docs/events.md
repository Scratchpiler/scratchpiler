# Events

Events in scratchpiler cover broadcasting — the pub/sub system Scratch uses to coordinate between sprites. Because Scratch lacks standard module imports, public APIs, or direct method invocation between objects, sprites must scream messages into a global ether and hope someone is listening. It is a character-building architectural constraint.

Hat blocks that respond to events are covered in [control-flow.md](control-flow.md).

---

## Broadcasting

Broadcasts are named string messages. They represent the only way Scratch scripts can communicate across sprite boundaries.

### broadcast("message")

Sends a broadcast message and immediately continues execution. All matching `on receive` scripts in the project start running asynchronously. The sender does not wait for them, nor does it care if they crash, freeze, or succeed. It is the programming equivalent of launching a missile and walking away.

```
broadcast("game over")
broadcast("level up")
broadcast([messageVar])
```

### broadcastAndWait("message")

Sends a broadcast and halts the current thread until all triggered `on receive` scripts across all sprites have finished executing.

```
broadcastAndWait("play intro")
say("The intro just finished. Finally.")
```

> [!WARNING]
> **The Deadlock Trap**: If a receiver of your broadcast calls another `broadcastAndWait` back to the sender, or enters an infinite loop, your sending script will remain blocked forever. Scratch does not have a watchdog timer or deadlock detection. It will wait in silent, patient agony.

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

Broadcast messages are case-insensitive strings. Scratchpiler automatically resolves broadcast names at compile time. If a message name does not exist in the project, scratchpiler will dynamically register it in the Scratch VM's internal list, sparing you the manual labor of clicking Scratch's UI to create it.

---

## Clones and Broadcasting

When a broadcast is sent, **every single clone** of a sprite that listens to that broadcast will execute the receiver block.

```
// If you have 50 clones of "Enemy", and you send:
broadcast("alert")

// All 50 clones will execute this concurrently:
on receive "alert" {
    pointTowards("Player")
    move(5)
}
```

If you are not careful, this will cause what is technically known as a "performance nightmare" and what users call "my computer is heating up." If you need only the original sprite to respond, you must track clone identity using a local "isClone" variable.

---

## Coordinating multiple sprites

A common pattern is having a Stage or a master "Controller" sprite broadcast signals to coordinate gameplay phases, while the individual sprites act as disposable actors waiting for their cues.

```
// In the Stage script:
on flag {
    broadcastAndWait("setup")
    broadcast("start game")
}

// In a Sprite script:
on receive "setup" {
    goTo(0, 0)
    hide()
}

on receive "start game" {
    show()
    forever {
        move(3)
        bounce()
    }
}
```

If you use `broadcast` instead of `broadcastAndWait` during setup, your sprite might start moving before its setup coordinates have been initialized, leading to a brief, chaotic race condition that makes your game look like it was written by an amateur. Which, given the platform, is a distinct possibility.
