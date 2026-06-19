# Sound

Audio playback and volume control. Sound names must match sounds that exist in the sprite's sound library. Scratchpiler cannot add sounds to a project — it can only play the ones already there.

---

## Playback

### play("sound")

Starts playing a sound and immediately continues execution. The sound plays in the background.

```
play("Meow")
play("pop")
play([soundName])
```

### playUntilDone("sound")

Plays a sound and waits for it to finish before continuing. Useful for sequential audio.

```
playUntilDone("intro music")
say("The intro has concluded.")
```

### stopSounds()

Stops all currently playing sounds for this sprite.

```
stopSounds()
```

---

## Volume

Volume is a percentage from 0 to 100. It starts at 100.

### setVolume(percent)

```
setVolume(100)    // full volume
setVolume(50)     // half volume
setVolume(0)      // silent (but still running)
```

### changeVolume(amount)

```
changeVolume(-10)    // quieter
changeVolume(10)     // louder
```

### volume (reporter)

```
if volume < 50 {
    changeVolume(10)
}
say(volume)
```

---

## Sound effects

Scratch provides two sound effects: `PITCH` (shifts the pitch up or down in semitone-ish units) and `PAN LEFT/RIGHT` (stereo panning, -100 to 100). These are separate from the graphic effects in the Looks category — they're in Sound.

### setSoundEffect("effect", value)

```
setSoundEffect("PITCH", 100)          // pitch up
setSoundEffect("PITCH", -100)         // pitch down
setSoundEffect("PAN LEFT/RIGHT", -50) // pan slightly left
setSoundEffect("PAN LEFT/RIGHT", 0)   // center
```

### changeSoundEffect("effect", amount)

```
changeSoundEffect("PITCH", 10)
changeSoundEffect("PAN LEFT/RIGHT", 5)
```

### clearSoundEffects()

Resets both sound effects to zero.

```
clearSoundEffects()
```

---

## Notes on audio in Scratch

Scratch's audio engine runs asynchronously in the browser. `play()` does not block. `playUntilDone()` blocks. If you call `play()` in a tight loop, you will produce what audio engineers call "a crime" and what users call "why is this website screaming at me".

```
// Bad
forever {
    play("Meow")   // a new Meow starts every frame
}

// Good
forever {
    play("Meow")
    wait(0.8)      // wait approximately as long as the sound
}
```
