# Syntax

Scratchpiler's syntax is deliberately, mercifully boring. If you've used JavaScript, Python, or any language where a statement is a word followed by parentheses, you already know most of it. The main difference is that variables are written in brackets, serving as a constant visual reminder that you are coding in a sandbox.

---

## Tokens

### Numbers

Plain decimal numbers. Negative numbers are written with a leading `-` (which the parser handles as unary minus at compile time, not as part of the token, because parsing negative literals natively was deemed a luxury we could not afford).

```
10
3.14
-5
0.01
```

### Strings

Double-quoted. No escape sequences are supported. No `\n`, no `\t`, no hex escapes. This is a Scratch limitation, not a scratchpiler limitation, and there is absolutely nothing either of us can do about it. If you want a newline, you must accept that Scratch believes in flat, single-line thoughts. Much like its target audience.

```
"Hello, World!"
"space"
"left arrow"
```

### Variables

Names surrounded by square brackets. Case-sensitive. Must match a variable or list that exists in the Scratch project. If you write `[Score]` but Scratch only knows `[score]`, the compiler will error out and refuse to generate blocks. It will not try to guess your intent; it is a machine.

```
[score]
[playerX]
[inventory]
```

### Hex color literals

Six-digit hex colors with a `#` prefix. These generate Scratch `colour_picker` blocks and are most useful with the pen extension.

```
#ff6600
#00aaff
#ffffff
```

### Comments

Line comments only, starting with `//`. Comments are stripped during tokenization and do not appear in compiled output. They will not survive compilation. Tragic. Like tears in the rain, or variables you forgot to create in the editor.

```
// This is a comment. It will not survive compilation.
move(10)  // This comment also disappears. It had so much to say.
```

---

## Operators

### Arithmetic

```
[x] + [y]
[x] - [y]
[x] * [y]
[x] / [y]
[x] mod [y]    // remainder (Scratch's "mod" block)
```

### Comparison

```
[x] < 10       // less than
[x] > 10       // greater than
[x] = "hello"  // equal (works for both numbers and strings)
[x] != [y]     // not equal (desugars to `not ([x] = [y])`)
[x] <= [y]     // less than or equal (desugars to `not ([x] > [y])`)
[x] >= [y]     // greater than or equal (desugars to `not ([x] < [y])`)
```

Note: `!=`, `<=`, and `>=` are syntactic sugar that desugar to their `not(...)` equivalents. While Scratch only has `<`, `>`, and `=` natively, scratchpiler converts the convenience operators for you at compile time.

**Chained comparisons** like `a < b < c` work and compile to `(a < b) and (b < c)`. The middle operand is evaluated twice — there's no optimization.

### Boolean literals

```
true           // boolean true (compiles to "1" = "1" in boolean slots, or 1 in numeric slots)
false          // boolean false (compiles to "1" = "0" in boolean slots, or 0 in numeric slots)
```

In boolean contexts (inside `if`, `while`, `not(...)`), `true` and `false` compile to simple equality checks. In numeric or string contexts, they compile to the literals `1` and `0` respectively.

### Ternary conditional

```
cond ? valueIfTrue : valueIfFalse
```

The ternary operator compiles to an internal if/else with a temporary variable. The temp variable is named `_scratchpiler_internal_*_tern*` and is hidden from view. When decompiled, ternaries are parenthesized:

```
// Source
set [x] to ([health] > 0) ? "alive" : "dead"

// Decompiled (with internal temp variable visible)
set [x] to [_scratchpiler_internal_1_tern]
```

### String interpolation

```
"score is {[score]}, double {[score] * 2}"
```

Expressions inside `{...}` within a double-quoted string are interpolated. The result is a nested `join(...)` call. To include a literal brace, use `{{` for `{` and `}}` for `}`.

```
"Health: {[hp]}"              // becomes: join("Health: ", [hp])
"Current: {{[x]}} = {[x]}"    // becomes: join("Current: {", [x], "} = ", [x])
```

An empty `{}` is an error. A bare `!` outside of `!=` is also an error (suggesting you meant `not`).

### Boolean

```
cond1 and cond2
cond1 or cond2
not cond
```

Logical operators. Remember, `and` and `or` have short-circuiting behavior in modern languages, but Scratch evaluates everything because it doesn't believe in efficiency or protecting you from division-by-zero inside condition branches.

### Compound assignment

Shorthand for changing a variable in place. These desugar to `set`/`change` statements.

```
[score] += 10      // same as: change [score] by 10
[score] -= 5       // same as: set [score] to [score] - 5
[score] *= 2       // same as: set [score] to [score] * 2
[score] /= 4       // same as: set [score] to [score] / 4
```

`+=` compiles directly to `data_changevariableby`, which is a single block. The others compile to `data_setvariableto` containing an arithmetic expression tree. This means `[score] *= 2` generates two blocks, bloating your script size and accelerating the heat death of your browser's CPU. You're welcome.

### Operator precedence

From highest to lowest:

| Level | Operators |
|---|---|
| 6 (highest) | unary `-`, `not` |
| 5 | `*`, `/`, `mod` |
| 4 | `+`, `-` |
| 3 | `<`, `>`, `=` |
| 2 | `and` |
| 1 (lowest) | `or` |

Use parentheses `(...)` to override precedence. Scratch does not have implicit precedence in its block model — every expression is a tree, and scratchpiler builds that tree for you at compile time.

---

## Statements

A statement is either a keyword call, a function call, or a `set`/`change` variable form.

**Function-call form** (most statements):

```
move(10)
say("hi")
wait(0.5)
```

**Space-form** (variables only, for readability):

```
set [score] to 0
change [score] by 1
```

Both forms compile to the same blocks. The space-form is syntactic sugar preserved from Scratch's natural language style, because some habits die hard.

---

## Block bodies

Curly braces delimit a body. Indentation is not significant — the braces are. The formatter (`Alt+Shift+F`) will fix your indentation for you if you're feeling lazy.

```
on flag {
    forever {
        move(10)
        bounce()
    }
}
```

**One exception:** `__asm__ volatile(...)` uses parentheses, not braces. It's the one construct in this entire language that ignores the rule you just read. See [asm.md](asm.md) before you find out the hard way.

---

## Script structure

A script is a sequence of **hat blocks** at the top level. A hat block is either an `on <event> { ... }` form or a `define name(params) { ... }` custom block definition.

```
on flag {
    // runs when green flag is clicked
}

on key "space" {
    // runs when space is pressed
}

define jump(height) {
    // custom block
}
```

Statements written outside a hat block are **orphaned** and will trigger a linter warning. They compile successfully (assuming they're syntactically valid), but Scratch has nowhere to attach them and they'll float in the workspace like debris. See [linter.md](linter.md).

---

## Case sensitivity

All function names and keywords are camelCase and case-sensitive. `Move(10)` is not valid. `move(10)` is. Variable names (`[score]` vs `[Score]`) must match exactly how they were named in Scratch.
