# Linter

Scratchpiler runs a linter on every keystroke (with a 350ms debounce — it's not watching you that closely). Lint warnings appear as yellow underlines in the editor. Errors from the parser appear as red underlines. Neither prevents you from saving your content; only errors prevent compilation.

---

## Dead code

Some statements unconditionally end the current script's execution. Any code after them in the same block is unreachable — Scratch will never run it, and the linter will tell you.

**Terminators:**

| Statement | Why it terminates |
|---|---|
| `stopAll()` | Stops all scripts in the project |
| `stopThis()` | Stops the current script |
| `forever { }` | Loops forever; nothing after it can execute |
| `deleteClone()` | Destroys the clone running this script |

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

The linter recurses into if/else branches, loop bodies, and custom block bodies. Dead code in deeply nested positions is still flagged.

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

- Whether variables exist (that's a compile-time error, not a lint warning)
- Logic errors ("you're setting `[lives]` to 0 before checking it")
- Performance issues ("that `forever` loop has no `wait`")
- Type mismatches (Scratch has no types)
- Division by zero
- Whether your game design is good

The linter is not a static analysis engine. It catches the mechanical problems that are trivially detectable from the AST. The rest is your responsibility.
