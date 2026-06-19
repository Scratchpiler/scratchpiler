# Linter

Scratchpiler runs a linter on every keystroke (with a 350ms debounce — it's not watching you that closely, though it is silently judging). Lint warnings appear as yellow underlines in the editor. Errors from the parser appear as red underlines. Neither prevents you from saving your content; only errors prevent compilation, keeping broken ASTs from polluting the VM.

---

## Dead code

Some statements unconditionally end the current script's execution. Any code after them in the same block is unreachable — Scratch will never run it, and the linter will tell you. Dead code, much like dead dreams, will simply sit there, a silent monument to your developer hubris.

**Terminators:**

| Statement | Why it terminates |
|---|---|
| `stopAll()` | Stops all scripts in the project |
| `stopThis()` | Stops the current script |
| `forever { }` | Loops forever; nothing after it in this scope can execute |
| `deleteClone()` | Destroys the clone running this script, erasing it from browser memory |

```
on flag {
    move(10)
    stopAll()
    say("This will never run.")   // ⚠ Warning: unreachable code
}

on flag {
    forever {
        move(5)
        bounce()
    }
    say("Likewise unreachable.")  // ⚠ Warning: unreachable code
}
```

Dead code inside nested blocks is detected too:

```
on flag {
    repeat 10 {
        if [done] = 1 {
            stopThis()
            move(5)   // ⚠ Warning: unreachable code
        }
    }
}
```

`stopOtherScripts()` is **not** a terminator — it stops other scripts, but the current script continues running. This is intentional, not an oversight.

---

## Orphaned blocks

A statement or block that appears at the top level of the script (outside any hat block) is orphaned. Scratch cannot attach it to anything. It will compile and inject, but it will float loose in the workspace with no trigger, doing nothing.

```
move(10)         // ⚠ Warning: orphaned statement — not inside any hat block

{                // ⚠ Warning: orphaned block — bare { } at top level
    say("hi")
}

on flag {
    say("This one is fine.")
}
```

Orphaned blocks are a warning, not an error. They inject successfully and appear as floating block stacks in Scratch — useful occasionally for drafting, but not for production scripts.

---

## Recursion into nested blocks

The linter recurses into if/else branches, loop bodies, and custom block bodies. Dead code in deeply nested positions is still flagged. No matter how deep you bury your unreachable logic, the linter will find it and point it out, like an unwanted relative at a family gathering.

```
on flag {
    forever {
        if [health] = 0 {
            stopAll()
            say("unreachable")   // ⚠ Warning: unreachable code
        }
    }
}
```

---

## What the linter does not check

- Whether variables exist (that's a compile-time error, not a lint warning. The compiler will deal with you then.)
- Logic errors ("you're setting `[lives]` to 0 before checking if it's less than 1. Classic.")
- Performance issues ("that `forever` loop has no `wait` and is currently melting the client's GPU.")
- Type mismatches (Scratch has no types, treating numbers, strings, and booleans as one chaotic family.)
- Division by zero (Scratch handles this by returning `Infinity`. We encourage you to use this to calculate your chances of landing a real software engineering job after building your resume on Scratch.)
- Whether your game design is actually fun or good (you are on your own here; the machine has no taste.)

The linter is not a sophisticated static analysis engine. It catches the mechanical problems that are trivially detectable from the AST. The rest of the bugs are yours to keep.
