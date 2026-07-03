# Headers & Includes

Headers are reusable code libraries stored in browser storage and shared across all your Scratch projects. Use `#include <name.h>` to splice a header into the current file at compile time.

---

## Creating and managing headers

Headers are created and edited in the **Headers panel** in the Scratchpiler UI:

1. In the activity bar (left sidebar), click the **file icon** to open the Headers panel
2. Click **+ New** to create a new header
3. Name it (letters, digits, underscore, hyphen — must end in `.h`)
4. Edit the header content in the panel's editor
5. While editing, the **Compile & Inject** button becomes **Check Header** — it validates the header without injecting into Scratch
6. Click **Check Header** to save and verify

Headers are stored in **Tampermonkey storage** (`GM_setValue`), making them persistent across browser sessions and available to all your Scratch projects. If Tampermonkey storage is unavailable, the browser falls back to `localStorage` scoped to the current domain.

---

## Header syntax and restrictions

A header may only contain **top-level declarations**:

- `define` — custom block definitions
- `scratchroutine` — broadcast-based concurrent routines
- `enum` — compile-time named constants
- `struct` — field groups that auto-create stage variables

**Not allowed:**
- Hat blocks (`on flag`, `on key`, etc.)
- Direct statements or code
- Imports of other files (headers cannot directly `#include` other headers, but see cross-header references below)

Valid header example (`mathutils.h`):

```
define square(v) returns {
    return v * v
}

define cube(v) returns {
    return v * v * v
}

enum {
    PI_APPROX = 3,
    E_APPROX = 2,
    PHI = 1
}
```

---

## Using headers

Use `#include <name.h>` on its own line to splice the header into the current file:

```
#include <mathutils.h>

on flag {
    set [result] to square(7)
    say("7 squared is {[result]}")
}
```

When compiled, `square(7)` resolves to the block defined in `mathutils.h`. The header's declarations are available as if they were typed directly in the file.

---

## Duplicate includes

If you `#include` the same header multiple times (directly or indirectly), only the first inclusion takes effect. Subsequent includes are no-ops, implementing `#pragma once` semantics.

```
#include <mathutils.h>
#include <mathutils.h>  // ignored
```

---

## Include cycles

If header A includes header B and header B includes header A, the compiler detects the cycle and reports an error. Rearrange your headers to break the cycle, or use the headers independently.

---

## Error reporting

Errors inside an included header are reported with the header name prefixed to the error location:

```
In mathutils.h on line 5: "Unknown statement: foo"
```

This helps you identify which header has the problem when multiple headers are in use.

---

## Decompiling with headers

When you decompile a sprite that uses headers, Scratchpiler attempts to collapse header-origin scripts back to the `#include` line. This works because the compiler inserts hidden workspace comment markers (`scratchpiler:include=name.h`) to track which scripts came from which header.

If those markers are missing or damaged, the scripts decompile expanded — you get the full function bodies inline rather than the tidy `#include` line.

**Note:** Enum and struct declarations compile away entirely (they produce no blocks). They don't round-trip through decompilation — if you decompile and re-import, you must re-add their declarations manually or keep them in the header.

---

## Cross-project storage and sync

Headers live in Tampermonkey storage tied to the domain — they're the same across all Scratch projects you open in the same browser. This is powerful for building a library of utility functions, but it also means:

- Changes to a header affect all projects using it
- If you edit a header, you must recompile all projects that use it for the changes to take effect
- There's no version control for headers (they're just strings in browser storage)

Treat headers like a simple package manager: create them once, use them everywhere, update sparingly.

---

## Example: Math utilities

Create a header named `mathutils.h`:

```
define square(v) returns {
    return v * v
}

define pythagoras(a, b) returns {
    return sqrt(a * a + b * b)
}

enum {
    PI = 3,
    E = 2
}
```

Then use it in your sprite:

```
#include <mathutils.h>

on flag {
    set [c] to pythagoras(3, 4)
    say("hypotenuse: {[c]}")
    
    set [area] to square([c])
    say("square of hypotenuse: {[area]}")
}
```

When compiled, both `square()` and `pythagoras()` are available, along with the `PI` and `E` constants.

---

## Best practices

1. **Name clearly** — use names like `color-utils.h`, `physics-helpers.h`, so you remember what each header contains.

2. **Avoid side effects** — headers should define reusable building blocks, not inject global state. Let each project manage its own variables.

3. **Document parameters** — add comments above function definitions explaining what parameters are and what they do, so header users don't have to reverse-engineer them.

4. **Keep headers focused** — one header per logical domain (math, physics, color, UI, etc.) is cleaner than one massive header doing everything.

5. **Version bump manually** — if you make a breaking change to a header, consider creating a new header (`mathutils-v2.h`) instead of modifying the original, to avoid breaking existing projects.

---

## Syntax summary

```
#include <name.h>         // Include a header by name (end in .h)

// Allowed in headers:
define blockName(params) { }
define blockName(params) returns { return value }
scratchroutine name(params) { }
enum { NAME = value, ... }
struct name { field1, field2, ... }

// NOT allowed in headers:
on flag { }               // hat blocks not allowed
// direct code            // statements must be in hat blocks
```
