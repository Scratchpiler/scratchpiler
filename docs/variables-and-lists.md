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

Lists are ordered sequences. Indexes in Scratch are 1-based. If you're coming from Python, pause and breathe.

### Creating list items

```
listAdd("item", [myList])               // append
listInsert("item", 1, [myList])         // insert at position
listInsert("item", [index], [myList])   // insert at variable index
```

### Deleting list items

```
listDelete(1, [myList])           // delete first item
listDelete([index], [myList])     // delete by index
listDeleteAll([myList])           // clear the entire list
```

### Replacing items

```
listReplace(1, [myList], "new value")
listReplace([index], [myList], [newValue])
```

### Showing and hiding

```
showList([myList])
hideList([myList])
```

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
