# Sound

Audio playback and volume control. Sound names must match sounds that exist in the sprite's sound library. Scratchpiler cannot synthesize audio or add new sounds to a project — it can only play the ones already registered in the project assets. If you try to play a non-existent sound, Scratch will fail silently, preserving your acoustic sanity at the expense of your script logic.

---

## Playback

### play("sound")

Starts playing a sound and immediately continues execution. The sound plays in the background, overlapping with any other sounds currently playing.

```
play("Meow")
play("pop")
play([soundName])
```

### playUntilDone("sound")

Plays a sound and waits for it to finish before continuing. Useful for sequential audio or cutscenes, but it will block your script thread completely until the audio finishes playing. If you pass a 10-minute audio track, prepare for a long wait.

```
playUntilDone("intro music")
say("The intro has concluded. Finally.")
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

Scratch's audio engine runs asynchronously in the browser. `play()` does not block. `playUntilDone()` blocks, halting your script thread until the sound wave has completed its passage.

If you call `play()` in a tight loop without yields or waits, you will produce what audio engineers call "a crime" and what users call "why is this website screaming at me." The browser will attempt to initialize 60 sound instances per second, resulting in a cacophony of sound that may crash your browser's audio driver or summon neighbors to your door. A fitting end.

```
// Bad
forever {
    play("Meow")   // a new Meow starts 30-60 times a second. Do not do this.
}

// Good
forever {
    play("Meow")
    wait(0.8)      // wait approximately as long as the sound to avoid sound stack bloat
}
```
