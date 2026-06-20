# scratchpiler: A Love Letter Written With a Flamethrower

> *"I just want to write code. I don't want to drag a yellow 'move 10 steps' puzzle piece across the screen with a mouse like some kind of artisanal block sculptor with chronic wrist pain."*
> — everyone who has ever used Scratch after the age of 12

Scratchpiler is a Tampermonkey userscript that injects a Monaco editor (the thing inside VS Code, the same editor used by actual professionals for actual work) directly into Scratch's project editor, allowing you to write real text-based code and compile it into Scratch's block VM, bypassing the entire graphical block interface and every UX decision that led to it.

It's not magic. It's violence, carefully applied to Scratch's internal data structures.

---

## Why Does This Exist

Someone (the author) realized that:

1. Scratch's block VM is a perfectly capable execution engine
2. Scratch's block *editor* is a perfectly capable cause of developer suffering
3. These two facts are unrelated, and therefore something could be done about the second one without destroying the first

The conclusion was obvious: write a compiler, inject it via Tampermonkey, and obtain a real text editor inside a children's educational programming platform. For adults. To write actual programs. On a site that displays cat sprites by default.

This is what they mean when they say "programmers are creative problem-solvers."

---

## What Is scratchpiler DSL (SDSL)

It's a language that looks like someone duct-taped JavaScript, Python, and Scratch's block palette together and called it done. It has:

- `camelCase` function names, because the VM demands it and camelCase is the format of people who have accepted their fate
- `[squareBrackets]` for all variable and list references, because this is how you tell a number from a variable in Scratch's data model, and also how you signal to your future self that something deeply wrong is happening
- `{braces}` for blocks, like a normal language, except the language is injecting blocks into a children's website
- `pyfor [item] in [list] { }` — a Python-style list iterator, added because the canonical way to iterate a list in Scratch involves manually managing an index variable, and we are tired
- `// comments` — just normal comments, present because whoever designed Scratch's block editor apparently thought the concept of comments was an optional upgrade that didn't ship with the base model

---

## The Pipeline

Your text goes through the following stages:

```
Your code (text, written like a dignified person)
    ↓
Lexer (splits text into tokens, judges each one)
    ↓
Parser (builds an AST, immediately worried about what it sees)
    ↓
Linter (yellow underlines as a form of passive aggression)
    ↓
Type Checker (wait, you passed a variable where a list should go?
              the audacity)
    ↓
Code Generator (produces Scratch JSON block objects)
    ↓
Block Injector (locates the VM via a BFS traversal of the React fiber tree,
                because nothing about this is normal)
    ↓
Scratch VM (accepts the blocks, none the wiser, runs your code)
    ↓
Your sprite moves. You feel accomplished.
    ↓
You wonder why you spent 3 hours making this work when you could have
just dragged the blocks. You know why. You don't regret it.
```

---

## New Features (v1.1ish — We Lost Track)

### `pyfor`: A Gift from the Python Gods

```
pyfor [item] in [inventory] {
    if [item] = "sword" {
        say("Equipped!")
    }
}
```

No more `set [i] to 1 / repeat until [i] > [inventory].length() / set [item] to [inventory].item([i]) / change [i] by 1`. That was a lot of work for "iterate a list." We fixed it. You're welcome.

Under the hood it compiles to exactly that garbage, just generated automatically so you don't have to look at it.

### Ergonomic Aliases: For When the Real Name Is Embarrassing

We added shorter aliases for functions whose names should probably not exist in polite society:

| If you hate typing this... | Just write this |
|---|---|
| `move(10)` | `step(10)` or `forward(10)` |
| `turnLeft(90)` | `left(90)` |
| `turnRight(90)` | `right(90)` |
| `goToFront()` | `front()` |
| `goToBack()` | `back()` |
| `createClone("_myself_")` | `clone()` |
| `stopThis()` | `stopMe()` |
| `askAndWait("question?")` | `ask("question?")` |
| `broadcast("msg")` | `send("msg")` |
| `say("hello")` | `print("hello")` (for the programming-brained) |
| `listAdd(val, [list])` | `append([list], val)` (list first, like a reasonable person) |
| `listDeleteAll([list])` | `clear([list])` |

The list aliases have a saner argument order: `append([list], value)` instead of `listAdd(value, [list])`. The original order was chosen for mysterious historical reasons that have never been adequately explained. We are not investigating further.

### `[x]++` and `[x]--`: Two Characters That Should Have Existed From Day One

`[score]++` increments by 1. `[score]--` decrements by 1. They compile to `data_changevariableby`. That's it. That's the whole feature.

The amount of time that was wasted before this existed, writing `change [score] by 1` like a Victorian-era programmer laboriously dipping a quill into an inkwell, is not something we care to calculate. It's done now.

---

### List Aggregates: `.sum()`, `.min()`, `.max()`, `.count()`

```
set [total] to [scores].sum()
set [winner] to [scores].max()
```

Previously, computing the sum of a list required a `pyfor` loop, a temporary variable, a change statement, and the quiet, creeping awareness that you were spending more time managing loop boilerplate than actually writing the thing you wanted to write.

`[list].sum()` compiles to exactly that `pyfor` loop. It generates three hidden internal variables (`_scratchpiler_internal_xxxx_agg_ctr`, `_scratchpiler_internal_xxxx_agg_item`, `_scratchpiler_internal_xxxx_agg_tmp`), builds the loop, then sets your output variable, all before your eyes. Or rather, completely invisibly, because that is the point.

`.min()` and `.max()` on an empty list return `""`, which is Scratch's way of saying "I tried." Guard with a length check if you care about this edge case. We're not your guardian.

---

### Scratchroutines: Kotlin Coroutines, But Make It Scratch

Someone looked at Scratch's broadcast system and said "this is basically cooperative multitasking with extra steps." They were right. The extra steps are the problem. Scratchroutines are the solution.

```
scratchroutine orbit(radius) {
    set [angle] to 0
    forever {
        setX(([radius]) * sin([angle]))
        setY(([radius]) * cos([angle]))
        change [angle] by 5
        checkCancel()
        wait(0.05)
    }
}

on flag {
    launch orbit(80)   // fire and forget
    wait(3)
    cancel orbit       // politely request that it stop
}
```

This compiles to a broadcast-based pseudo-coroutine. The broadcast is named `__sroutine_orbit`. The radius parameter is stored in a global variable named `__sroutine_orbit_radius`. There is a cancel flag named `__sroutine_orbit_cancelled`. There is a running counter named `__sroutine_orbit_count`. None of these are visible to you in the editor. They are all visible to you in Scratch's variable monitor, where they sit in the list looking extremely suspicious.

**The lifecycle, honestly described:**

`launch orbit(80)` sets `__sroutine_orbit_radius` to 80 and then broadcasts `"__sroutine_orbit"` without waiting. The routine picks up the value and begins running. If you `launch orbit(40)` immediately after, it will overwrite `__sroutine_orbit_radius` to 40 while the first instance is still reading it. This is a data race. Scratch doesn't have locks. You'll be fine, probably.

`await orbit(80)` does the same but uses `broadcastAndWait`, blocking until the routine finishes. If the routine is a `forever` loop, `await` will block forever. Do not `await` a `forever` loop.

`cancel orbit` sets `__sroutine_orbit_cancelled` to 1 and does nothing else. The routine continues running until it hits a `checkCancel()` call, which compiles to `if [__sroutine_orbit_cancelled] = 1 { stopThis() }`. No `checkCancel()` calls in the body means `cancel` is a strongly-worded suggestion that the routine is free to ignore indefinitely.

`isRunning(orbit)` compiles to `[__sroutine_orbit_count] > 0`. The count is incremented when the routine starts and decremented when it finishes. Multiple concurrent instances of the same routine each increment and decrement the same counter. This means `isRunning` returns true as long as any instance is running, not just the one you launched. This is Scratch's fault for not having a better primitive, not ours.

**What gets created on the Stage, globally, for every scratchroutine you define:**

| Thing | Name | What it does |
|---|---|---|
| Broadcast | `__sroutine_name` | Triggers the routine |
| Variable | `__sroutine_name_cancelled` | Cancel flag |
| Variable | `__sroutine_name_count` | How many instances are running |
| Variable | `__sroutine_name_param` | One per parameter |

No lists. We considered using a global list to track running routines. We decided against it because `listDelete(indexOf(...))` requires a block chain long enough to give anyone a migraine, and we had already given ourselves enough migraines for one session.

### Type Checking: The Linter Knows What You Did

The linter now understands the difference between lists and variables. If you try to call `listAdd` on a variable, it will tell you. If you try to `pyfor` over a variable, it will tell you. If you try to use `.item()` on a variable that is definitely not a list, the linter will produce a yellow underline and a message that is perhaps more informative than your code deserves.

This is opt-out via the Settings panel. Maybe you enjoy chaos. We don't judge. Actually we do. That's the whole point of the type checker.

### Settings: Finally, Actual Settings

The Settings panel (gear icon, sidebar) now has:

- **Tab size** — 2, 4, or 8 spaces. 2 if you want to fit more code on the screen. 8 if you are a BSD kernel developer and this is your normal.
- **Auto-save delay** — instant, 500ms, 1 second, 2 seconds. The code is being saved to `localStorage`, not uploaded to a server, so "instant" is fine unless your laptop is held together with thermal paste and prayer.
- **Lint rules** — toggle type checking, unreachable code warnings, and orphaned block warnings independently. Some people want to write dead code in peace. We respect that. We still judge it.

---

## The Decompiler

The decompiler converts existing Scratch block scripts back into SDSL. It knows about:

- `while` loops (reconstructed from `repeat until (not condition)`)
- `for [i] from ... to ... { }` (reconstructed from the internal counter variable pattern)
- `pyfor [item] in [list] { }` (reconstructed from the `_pyfor_ctr` variable pattern)
- `[list].sort()` (reconstructed from a 3-block Shell sort sequence)
- Custom block definitions
- Everything else Scratch can throw at it, producing `// unsupported opcode` comments for anything too exotic or extension-specific

The decompiler is deterministic — recompiling a decompiled script produces byte-identical blocks to the original. This is important for exactly one reason: peace of mind. You don't need it to be byte-identical. But it is.

---

## Frequently Asked Questions

**Q: Why is everything in camelCase?**
A: Because Scratch's variable names are case-sensitive and you'll be mixing DSL keywords with Scratch identifiers and the style decision was made before anyone could object.

**Q: Why `[squareBrackets]` for variables?**
A: Scratch's original block editor uses a grey rounded-rectangle pill shape for variable references. Square brackets are the closest ASCII approximation to a grey pill that doesn't require a special character. This is the story. We're sticking to it.

**Q: Can I use this for a production project?**
A: Define "production." If you mean "a Scratch project that will be played by real users on scratch.mit.edu," then yes, absolutely. If you mean a production web application, you have taken a profoundly wrong turn somewhere and we cannot help you retrace your steps.

**Q: Will Scratch ban me for using this?**
A: Scratchpiler only modifies the local VM state in your browser. It does not submit API requests to Scratch's servers on your behalf, does not modify saved projects, and does not interact with the Scratch backend in any way. Whether saving a Scratch project that contains scratchpiler-compiled blocks violates any terms of service is a legal question we are not qualified to answer and are actively avoiding.

**Q: I lost my code when the tab crashed.**
A: Scratchpiler auto-saves your code to `localStorage` every time you edit. Check the **Fixes** panel in the sidebar — there's a "Clear Local Code Cache" button that confirms the data was there. You can also check `localStorage.getItem('scratchpiler-content-SpriteName')` in the console. If it's gone, the browser truly discarded it. This is the browser's fault. Please direct your anger at Chrome's memory management policies rather than at us.

**Q: Can I use this for a platformer? A fighting game? A 3D raycaster?**
A: Yes. People have. The decompiler will probably reconstruct it correctly. The linter will probably not understand what you're doing. The `_scratchpiler_internal` variables will accumulate in your sprite's variable list until it looks like the aftermath of a naming convention disaster. This is the experience. This is scratchpiler.

---

## Technical Notes for the Uncomfortably Curious

### How the Block Injection Works

Scratch's VM maintains a `targets` array — one entry per sprite and one for the Stage. Each target has a `blocks` object, which is a flat dictionary mapping block IDs (random alphanumeric strings) to block descriptor objects.

Scratchpiler locates the VM by traversing React's fiber tree (the internal representation of the rendered component tree) starting from `document.getElementById('root')`, looking for a fiber node whose `memoizedState` contains a reference to the `ScratchBlocks` VM. Once found, blocks are injected directly into `target.blocks`. The VM picks them up immediately without requiring a page reload, project save, or any kind of official API.

This is the unspeakable thing mentioned in the README.

### How the Decompiler Works

The decompiler walks the block chain starting from hat blocks, recursively processing inputs and substacks. It detects compiled patterns (for-loops, while-loops, sort, pyfor) by checking the shapes of block sequences against known signatures — specifically the internal variable names, which contain identifiable substrings like `_pyfor_ctr` and `_gap`.

If the block sequence doesn't match any known pattern, it falls through to a generic `decompStmt` handler that covers all standard opcodes.

### The `forScope` Pattern

During code generation, `for` and `pyfor` loops register their iterator variable(s) in a `forScope` dictionary that maps user-visible names (like `i` or `item`) to the internal Scratch variable object. Any expression that references `[i]` inside the loop body is resolved via `forScope` first, before falling through to the sprite's actual variable list. After the loop, the entries are removed.

This is why you can write `[i]` inside a `pyfor` body without pre-declaring an `[i]` variable in Scratch — the variable is created at compile time and is ephemeral from the user's perspective, even though it persists in the VM (you can see it in the variable monitor if you squint).

---

## Acknowledgements

Built because someone got tired of dragging blocks and had a weekend.

Runs on Scratch because Scratch was built to be extended even if Scratch didn't know that at the time.

Powered by Monaco Editor, which is doing the same job here as it does in VS Code, except instead of TypeScript in a real project, it's editing a custom DSL for a children's website. This is not Monaco's fault. Monaco has done nothing wrong.

Filed under: "tools that shouldn't exist but are very glad they do."
