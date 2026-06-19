# Syntax

Scratchpiler's syntax is deliberately boring. If you've used JavaScript, Python, or any language where a statement is a word followed by parentheses, you already know most of it. The main difference is that variables are written in brackets.

---

## Tokens

### Numbers

Plain decimal numbers. Negative numbers are written with a leading `-` (which the parser handles as unary minus, not as part of the token).

```
10
3.14
-5
0.01
```

### Strings

Double-quoted. No escape sequences are supported. This is a Scratch limitation, not a scratchpiler limitation, and there is nothing either of us can do about it.

```
"Hello, World!"
"space"
"left arrow"
```

### Variables

Names surrounded by square brackets. Case-sensitive. Must match a variable or list that exists in the Scratch project.

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

Line comments only, starting with `//`. Comments are stripped during tokenization and do not appear in compiled output.

```
// This is a comment. It will not survive compilation.
move(10)  // This comment also disappears. Tragic.
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

Scratch has three comparison operators. All three produce boolean values.

```
[x] < 10       // less than
[x] > 10       // greater than
[x] = "hello"  // equal (works for both numbers and strings)
```

Note: there is no `!=`, `<=`, or `>=`. To check "not equal", use `not ([x] = [y])`. To check "greater than or equal to", use `[x] > [y] - 1` and question your life choices.

### Boolean

```
cond1 and cond2
cond1 or cond2
not cond
```

### Compound assignment

Shorthand for changing a variable in place. These desugar to `set`/`change` statements.

```
[score] += 10      // same as: change [score] by 10
[score] -= 5       // same as: set [score] to [score] - 5
[score] *= 2       // same as: set [score] to [score] * 2
[score] /= 4       // same as: set [score] to [score] / 4
```

`+=` compiles directly to `data_changevariableby`. The others compile to `data_setvariableto` with an expression.

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
