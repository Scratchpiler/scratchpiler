# Variables and Lists

Scratchpiler does not create variables. Variables and lists must exist in the Scratch project before you compile. If you reference `[score]` and there's no variable named `score` in Scratch, you'll get a compile error. Create variables using the **Variables** menu in the toolbar or directly in Scratch's variable panel.

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
