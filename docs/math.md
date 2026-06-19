# Math

Mathematical functions, operators, and string utilities. All math function names are colored green in the editor to help you tell them apart from control-flow keywords and motion functions, as though color-coding your functions makes them less likely to produce NaN.

---

## Arithmetic operators

These are infix operators, not function calls.

```
[x] + [y]
[x] - [y]
[x] * [y]
[x] / [y]
[x] mod [y]    // remainder; Scratch's "mod" block
```

Division by zero returns `Infinity` in Scratch. `mod` with a zero divisor returns `NaN`. These are Scratch runtime behaviors that scratchpiler inherits.

---

## Rounding and flooring

| Function | Description |
|---|---|
| `round(n)` | Round to nearest integer |
| `floor(n)` | Round down |
| `ceiling(n)` | Round up |
| `ceil(n)` | Alias for `ceiling(n)` |
| `abs(n)` | Absolute value |

```
round(3.7)      // 4
floor(3.9)      // 3
ceiling(3.1)    // 4
abs(-5)         // 5
abs([x] - [y])  // distance between two 1D points
```

---

## Roots and powers

| Function | Description |
|---|---|
| `sqrt(n)` | Square root |
| `exp(n)` | e raised to the power of n (eⁿ) |
| `pow10(n)` | 10 raised to the power of n (10ⁿ) |
| `ln(n)` | Natural logarithm (base e) |
| `log(n)` | Base-10 logarithm |

```
sqrt(16)    // 4
sqrt(2)     // 1.4142...
exp(1)      // 2.71828... (e)
pow10(3)    // 1000
ln(exp(5))  // 5 (approximately)
```

---

## Trigonometry

**Scratch uses degrees, not radians.** This is non-negotiable. All trig functions take and return degrees. If your code expects radians, multiply by `180 / pi` before calling and by `pi / 180` after — where `pi ≈ 3.14159` is a variable you define yourself because Scratch doesn't have a `pi` constant. Welcome to Scratch math.

| Function | Description |
|---|---|
| `sin(degrees)` | Sine |
| `cos(degrees)` | Cosine |
| `tan(degrees)` | Tangent |
| `asin(n)` | Arcsine → degrees |
| `acos(n)` | Arccosine → degrees |
| `atan(n)` | Arctangent → degrees |

```
sin(90)     // 1
cos(0)      // 1
tan(45)     // 1 (approximately — floating point)
asin(1)     // 90
acos(1)     // 0
atan(1)     // 45
```

Circular motion example:

```
on flag {
    set [angle] to 0
    forever {
        setX(cos([angle]) * 100)
        setY(sin([angle]) * 100)
        change [angle] by 2
    }
}
```

---

## Random

### random(min, max)

Returns a random integer between min and max, inclusive. If either argument is a decimal, returns a random decimal. This is Scratch's behavior, not a design decision.

```
random(1, 6)            // roll a die
random(1, 10)           // random 1–10
random(-180, 180)       // random direction
random([min], [max])    // from variables
```

---

## Clamping

### clamp(value, min, max)

Constrains a value to a range. There is no native Scratch clamp block — this is implemented using the identity `max(a,b) = (a+b+abs(a-b))/2` twice. It generates a lot of blocks. Worth it.

```
clamp([health], 0, 100)      // health can't go below 0 or above 100
clamp([x], -240, 240)        // keep on stage
clamp([volume], 0, 100)      // reasonable volume
```

---

## String operators

### join(str1, str2)

Concatenates two strings. Scratch's join block takes exactly two arguments. Chain calls to join more.

```
join("Hello, ", "World!")              // "Hello, World!"
join("Score: ", [score])               // "Score: 42"
join(join([first], " "), [last])       // first + " " + last
```

### letterOf(index, string)

Returns the character at a 1-based index.

```
letterOf(1, "hello")    // "h"
letterOf(3, "hello")    // "l"
letterOf([i], [word])   // programmatic indexing
```

### contains(string, substring)

Returns `true` if the string contains the substring.

```
contains("hello world", "world")    // true
contains([text], "error")           // check for error keyword
```

### string .length()

The dot method on any expression returns its length.

```
"hello".length()        // 5
[name].length()         // length of the variable's string value
answer.length()         // how long the user's response was
```

---

## Hex color literals

`#rrggbb` hex literals generate Scratch `colour_picker` blocks. These are most useful with the pen extension (not yet implemented in scratchpiler) or anywhere Scratch expects a color value.

```
#ff0000    // red
#00ff00    // green
#0000ff    // blue
#ff6600    // Scratch orange (fitting)
```

---

## No bitwise operators

Scratch has no bitwise operators. You cannot XOR, AND-mask, or bit-shift in Scratch. If you need bitwise operations, reconsider your approach, and if reconsidering doesn't help, implement them with `mod` and division and a lot of patience.
