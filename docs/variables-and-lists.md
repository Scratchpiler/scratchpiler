# Variables and Lists

Variables and lists must exist in the Scratch project before you compile. If you reference `[score]` and there's no variable named `score` in Scratch, you'll get a compile error. Use the **Variables** and **Lists** menus in the toolbar to create, rename, or delete variables without leaving the editor — or use `struct` declarations to auto-create groups of related variables at compile time.

---

## Variables

Variables are referenced with square brackets: `[score]`, `[playerX]`, `[lives]`.

### set

```
set [score] to 0
set [name] to "Alice"
set [x] to xPos
set [result] to abs([x] - [y])
```

The `to` keyword is optional — `set [x] 0` works but is ugly.

### change

Adds a value to the variable. Equivalent to `set [x] to [x] + n`.

```
change [score] by 1
change [health] by -10
change [x] by [speed]
```

### Compound assignment

Shorthand operators for common mutations.

```
[score] += 10       // add
[score] -= 5        // subtract
[score] *= 2        // multiply
[score] /= 4        // divide
```

`+=` compiles to `data_changevariableby`. The others compile to `data_setvariableto` with an expression.

### Showing and hiding

```
showVariable([score])
hideVariable([score])
```

These control whether the variable monitor is visible on stage. Useful for debug displays.

---

## Lists

Lists are ordered sequences of items. Indexes in Scratch are 1-based. If you're coming from Python, C++, or any civilized language, pause and breathe. If you attempt to access index 0, Scratch will return an empty string instead of throwing an IndexOutOfBoundsException. It prefers silent, confusing failures over loud complaints. A trait we wish humans shared.

### Creating list items

```
listAdd("item", [myList])               // append to the end of the list
listInsert("item", 1, [myList])         // insert at the very beginning (index 1)
listInsert("item", [index], [myList])   // insert at variable index
```

### Deleting list items

```
listDelete(1, [myList])           // delete the first item, shifting all others down
listDelete([index], [myList])     // delete by index
listDeleteAll([myList])           // clear the entire list, purging all data
```

### Replacing items

```
listReplace(1, [myList], "new value")      // overwrite the first item
listReplace([index], [myList], [newValue]) // overwrite by index
```

### Ergonomic aliases

If you find the `listAdd` / `listDelete` / `listReplace` naming convention to be the worst thing in the universe, we've added friendlier aliases. They compile to the exact same blocks — the choice between them is purely aesthetic and will not affect your program's runtime behavior or your self-esteem (one of these more than the other).

```
append([myList], "item")              // listAdd alias — add to end
push([myList], "item")                // same thing, if you prefer Python flavor
remove([myList], 1)                   // listDelete alias — remove by index
insert([myList], 1, "item")           // listInsert alias — insert at index
replace([myList], 1, "new value")     // listReplace alias — replace by index
clear([myList])                       // listDeleteAll alias — nuke the whole list
```

The argument order for the aliases is `([list], ...)` — list first, then the arguments. This is the opposite of the canonical `listAdd(item, [list])` convention, which puts the list last. This asymmetry is historical and regrettable. The aliases fix it.

### Bulk population

`populateList` fills a list with repeated copies of a value. It is the fastest way to pre-allocate a list to a known size without writing a loop yourself and pretending that counts as programming.

```
populateList([myList], value, count, clearFirst)
populateArray([myList], value, count, clearFirst)   // exact alias, pick whichever makes you feel better
```

| Argument | Type | Description |
|---|---|---|
| `[list]` | list variable | The list to fill. Must already exist in Scratch. |
| `value` | any expression | The value to put in each slot. Can be a literal, variable, or expression. |
| `count` | number or `max` | How many items to add. Pass `max` to fill 200,000 slots — the practical ceiling of Scratch's list implementation, after which performance degrades into a philosophical problem. |
| `clearFirst` | `true` / `false` | Whether to delete all existing items before filling. Pass `true` to replace the list entirely. Pass `false` to append on top of whatever is already there. A runtime expression also works; it compiles to a `control_if` wrapping the delete. |

```
// Pre-allocate a 100-slot list of zeros (clearing whatever was there before)
populateList([scores], 0, 100, true)

// Append 50 "?" placeholders without disturbing existing data
populateList([board], "?", 50, false)

// Fill to Scratch's hard limit (200,000 items) — you asked for this
populateList([buffer], 0, max, true)

// Dynamic value — each slot gets the current value of [seed] at fill time
// (all slots get the same value; this is a repeat loop, not a mapping function)
populateList([grid], [seed], 256, true)
```

**What it compiles to** (with `clearFirst = true`):

```
delete all of [myList]
repeat 100 {
    add 0 to [myList]
}
```

The `clearFirst = false` variant omits the `delete all` block entirely. No branch is generated — false is resolved at compile time.

**`max`** is the literal identifier `max`, not a string and not a function call. Writing `"max"` will add the string `"max"` to your list 200,000 times, which is technically correct behavior and also terrible.

### Showing and hiding

```
showList([myList])
hideList([myList])
```

These control the visual rendering of the list monitor on the stage. Hiding lists is a good way to keep your database private from players who might want to tamper with their high score or inventory.

---

## List dot methods

These are the "nice" way to read from lists. They're syntactic sugar over Scratch's list reporter blocks.

### .length() / .len()

Returns the number of items in the list.

```
set [count] to [myList].length()
repeat [myList].len() {
    // iterate
}
```

Also works on strings — returns the character count.

```
set [len] to "hello".length()   // 5
```

### .item(index)

Returns the item at a 1-based index.

```
set [first] to [myList].item(1)
set [last]  to [myList].item([myList].length())
set [mid]   to [myList].item(floor([myList].length() / 2))
```

### .contains(value)

Returns `true` if the list contains the value.

```
if [inventory].contains("sword") {
    say("You have a sword.")
}
```

Also works on strings:

```
if "hello world".contains("world") {
    say("found it")
}
```

### .indexOf(value) / .itemNumber(value)

Returns the 1-based index of the first occurrence of the value, or 0 if not found.

```
set [pos] to [myList].indexOf("target")
if [pos] > 0 {
    say(join("Found at index ", [pos]))
}
```

### .sort()

Sorts a list **in place**, ascending, using Shell sort with the Knuth gap sequence (1, 4, 13, 40, …). This is O(n^(3/2)) — not the fastest sort ever devised by humanity, but it runs entirely inside Scratch's block execution model without recursion, which is worth something. Bragging rights, at minimum.

```
[scores].sort()
```

Pass `"desc"` for descending order:

```
[scores].sort("desc")
```

`.sort()` is a **statement**, not an expression. It sorts the list and returns nothing — because returning a sorted copy would require allocating a new list, and Scratch's list API would like to have a word with you about that. Write it on its own line.

```
// ✓ correct — standalone statement
[leaderboard].sort()
say([leaderboard].item(1))   // now displays the top score

// ✗ wrong — sort() cannot be used inside an expression
set [top] to [leaderboard].sort()   // parse error: "is a statement"
```

**Temp variables**: the sort creates four hidden internal variables (`_scratchpiler_internal_xxxx_gap`, `_i`, `_j`, `_tmp`) in the sprite. They disappear from your mental model the moment you stop looking at the variable monitor. The decompiler knows about them and will reconstruct `.sort()` cleanly on re-import.

**Numeric vs string sorting**: Scratch stores everything as strings internally. If your list contains numeric strings (`"3"`, `"14"`, `"9"`), the sort compares them **lexicographically**, meaning `"14" < "3"` because `"1" < "3"`. To sort numbers correctly, make sure all values are actual numbers (Scratch treats numeric-looking strings as numbers in comparisons) — in practice this usually works, but mixing `"10"` with `"9.5"` can produce surprising results. Don't say we didn't warn you.

---

### .sum(), .min(), .max(), .count(val)

Aggregate methods compute a single value from a list. They are **expression-level** (used in `set [x] to` statements) but pre-compile to a hidden loop that iterates the list before the `set`:

```
set [total] to [scores].sum()
set [lowest] to [scores].min()
set [highest] to [scores].max()
set [nPassed] to [scores].count(1)   // how many items equal 1
```

**What they compile to** (using `.sum()` as an example):

```
set [_internal_ctr] to 1
set [_internal_tmp] to 0
repeat until ([_internal_ctr] > [scores].length()) {
    set [_internal_item] to [scores].item([_internal_ctr])
    change [_internal_tmp] by [_internal_item]
    change [_internal_ctr] by 1
}
set [total] to [_internal_tmp]
```

The internal variables are hidden from your code and cleaned up by the decompiler.

**Supported only at the `set` statement level** — `set [x] to [list].sum()` works; `move([list].sum() * 2)` does not (the aggregate would need to be computed first; assign it to a variable and then use that variable).

**min/max on empty lists**: returns the empty string `""` (Scratch's value for `list.item(1)` on an empty list). Guard with an `if [list].length() > 0 { }` if needed.

---

## Subscript syntax

`[list][index]` is shorthand for `[list].item(index)`. Both the list and the index must be variable references (`[...]`), and they must be on the same line (the parser can't distinguish line-spanning subscripts from unrelated adjacent variables).

```
set [val] to [myList][i]       // equivalent to [myList].item([i])
```

---

## Managing variables from the toolbar

The **Variables** and **Lists** menus in the toolbar expose the full variable panel without leaving the editor:

| Action | How |
|---|---|
| Create new variable | Variables → New variable… (prompts for name; creates on stage or active sprite) |
| Create new list | Lists → New list… |
| Rename | Hover a variable in the sprite panel, click ⋮, choose Rename |
| Delete | Hover a variable in the sprite panel, click ⋮, choose Delete |
| Bulk-initialize a list | Hover a list in the sprite panel, click ⋮, choose Initialize from CSV |

**Initialize from CSV** accepts a comma-separated string (`1, 2, 3, hello, world`) and replaces the list's contents immediately. Useful for seeding data without writing setup code.

---

## Structs

A `struct` is a compile-time directive that declares a group of related Scratch variables under a shared name prefix.

```
struct player { x, y, hp }
```

When you compile, scratchpiler checks whether `player.x`, `player.y`, and `player.hp` exist as Scratch variables on the stage. Any that are missing are created automatically. The struct itself generates no blocks — it is purely a declaration.

Fields are accessed as ordinary variables with dot notation inside brackets:

```
set [player.x] to 0
set [player.y] to 0
set [player.hp] to 100

change [player.x] by [player.speed]
if [player.hp] <= 0 {
    say("You died.")
}
```

Multiple structs in the same file:

```
struct player { x, y, hp, speed }
struct enemy  { x, y, hp, type }
```

**Autocomplete**: in the editor, typing `[player.` shows field completions. Typing `[` alone shows all `struct.field]` completions across all structs in the current file — one tab-complete fills the entire reference.

**Scope**: struct variables are always created on the stage (global). There is no per-sprite struct support.

**No nesting**: structs are flat lists of field names. `struct a { b { c } }` is not valid.

---

## Enums

An `enum` is a compile-time declaration that gives names to constant values. Unlike struct fields, enum entries do not create Scratch variables — they are substituted directly into the compiled blocks as inline literals. There is no runtime cost, no monitor, and no trace of them in the project once compiled. They simply cease to exist as named things at that point, which is either elegant or unsettling depending on your perspective.

```
enum {
    STATE_IDLE = 0,
    STATE_WALK = 1,
    STATE_DEAD = 2,
    MAX_HP     = 100,
    GAME_TITLE = "My Game"
}
```

Enum entries are referenced **without brackets** — no `[square]`, just the bare name:

```
on flag {
    set [state] to STATE_IDLE
    set [hp] to MAX_HP
    say(GAME_TITLE)
}

on receive "update" {
    if [hp] = 0 {
        set [state] to STATE_DEAD
    }
    if [state] = STATE_WALK {
        change [x] by [speed]
    }
}
```

### Syntax

```
enum {
    NAME = value,   // number or string literal
    NAME,           // no value — defaults to 0
    NAME = "text"   // string constant
}
```

`enums` (plural) is accepted as an alias. Neither variant generates blocks. Both are otherwise identical.

### Values

Values must be **number or string literals** written directly in the declaration. Expressions, variables, and other enum names are not valid on the right-hand side — this is macro substitution, not a runtime lookup.

```
enum {
    A = 10,         // ✓
    B = "hello",    // ✓
    C,              // ✓ — defaults to 0
    D = A + 1,      // ✗ — parse error: expressions not allowed
    E = [score]     // ✗ — parse error: variables not allowed
}
```

### Where enum names can appear

Anywhere an expression is valid: `set`, `change`, `if`, `say`, arithmetic, comparisons, list operations, function arguments, `for` ranges — all of it.

```
for [i] from 0 to MAX_HP {
    listAdd([i], [damage])
}
populateList([grid], STATE_IDLE, 256, true)
if [state] > STATE_WALK {
    say("running or dead")
}
```

### No namespace

Enum entries live in a flat global namespace shared with reporter names and function calls. If you name an enum entry `xPos`, you will shadow the built-in reporter and deserve what happens next. Pick names that are obviously constants — `ALL_CAPS_WITH_UNDERSCORES` is the conventional choice and also the most effective way to signal that you are a person who has been burned by this before.

### Multiple enum blocks

Multiple `enum` blocks in the same file are allowed and merged into a single constant table. Later declarations overwrite earlier ones if names collide.

```
enum { RED = 1, GREEN = 2 }
enum { BLUE = 3 }
// RED, GREEN, and BLUE are all available
```

---

## Variable scope

Variables are either **global** (available to all sprites) or **local** (available to one sprite). Scratchpiler searches the active sprite first, then the Stage (global). If you have a local `[score]` and a global `[score]`, the local one wins.

Create global variables from the **Variables → New global variable…** menu in the toolbar.

---

## For-loop iterators

`for [i] from ... to ... { }` creates a temporary internal variable named `_scratchpiler_internal_xxxx_i`. This variable exists in Scratch and is visible in variable monitors if you look for it. Don't try to use it directly — the name contains random characters by design. Just use `[i]` inside the loop body.

```
for [i] from 1 to 5 {
    say([i])
    wait(0.3)
}
// [i] is no longer in scope here (and trying to use it would resolve to
// the internal variable with a garbled name, which is not what you want)
```
