# Pointers & Heap

Scratchpiler provides dynamic memory allocation through a pointer-based heap system. This lets you build data structures that Scratch's flat variable model doesn't naturally support: linked lists, trees, dynamic arrays, and any structure where you need to store references to collections of related cells.

---

## Address-of operator: &[x]

`&[x]` takes the address of a **global scalar variable** and returns a pointer (an integer index).

```
set [x] to 42
set [px] to &[x]          // px now holds the address of x
say(*[px])                // prints 42
```

Only global stage variables can be addressed. **You cannot take the address of:**
- Sprite-local variables (they don't exist at the global scope)
- List items (they're accessed differently)
- Parameters (they're local to their block)
- Loop variables (they're internal and scoped)

When you take the address of a variable, the compiler internally "promotes" that variable to a fixed slot in a hidden stage list called `__heap`. The first 64 slots (0–63) are reserved for promoted variables; their mapping is tracked in another hidden list `__ptab` (pointer table). All subsequent reads and writes of the promoted variable transparently go through the heap instead of the original variable location.

---

## Dereference operators: *[p] and *(expr)

`*[p]` reads the value stored at the pointer address in `[p]`.  
`*(expr)` dereferences any expression that evaluates to a pointer.

```
set [px] to &[x]
say(*[px])                // reads the value at address [px]

set [addr] to &[y] + 5    // add 5 to a pointer
say(*[addr])              // read from (y + 5)
```

To **write** through a pointer, use `set *[p] to value`:

```
set [px] to &[x]
set *[px] to 99           // x is now 99
say([x])                  // prints 99
```

---

## Pointer arithmetic: [p][i]

If `[p]` holds a pointer (created by `alloc(n)` or `&[x]`), then `[p][i]` reads the value at offset `p + i`.

```
set [head] to alloc(10)   // allocate 10 cells
set *[head] to 42         // write to cell 0: [head][0]
set *([head] + 1) to 99   // write to cell 1: [head][1]

// These are equivalent:
say([head][0])            // read cell 0 via pointer indexing
say(*[head])              // read cell 0 via dereference
say(*([head] + 1))        // read cell 1
```

If `[p]` is a Scratch list (not a pointer), `[p][i]` behaves as normal list subscripting — the compiler leaves it unchanged.

---

## Memory allocation: alloc(n) and free(p)

### alloc(n)

Allocates `n` contiguous cells on the heap and returns a pointer to the first cell. The allocation is usable in expressions:

```
set [node] to alloc(2)    // allocate 2 cells, get pointer in [node]
set *[node] to 10
set *([node] + 1) to 20
```

Allocations run behind-the-scenes using a **first-fit free list** allocator. A size header is stored at `p - 1` (one cell before the returned pointer), invisible to your code. When the heap runs out of space, it grows automatically. There is no coalescing — freed blocks are not merged together, so fragmentation can accumulate.

Both `alloc` and `free` run in **warp mode** (atomically, without yielding).

### free(p)

Releases the heap cells allocated at pointer `p`. Mark the block as available for reallocation:

```
set [node] to alloc(2)
set *[node] to 10
free([node])              // release the 2 cells
```

There is **no bounds checking** on pointers. Dereferencing an invalid pointer, a freed pointer, or an out-of-bounds index will read or write to whatever happens to be there — possibly into other allocations or the promotion table. Use-after-free reads stale or reallocated data.

---

## Hidden machinery

The heap system is implemented via two hidden stage lists:

- **`__heap`**: The actual data store — one large list where all allocated and promoted blocks live.
- **`__ptab`**: The pointer table — metadata about where each promoted variable lives (used internally to find global variables by name).

These lists are visible in the Scratch editor under the Variables panel. **Do not edit them by hand.** The decompiler recognizes them and hides them from the reconstructed source, but if you modify them while scripts are running, undefined behavior will result.

---

## Round-tripping through the decompiler

When you decompile a sprite that uses pointers, the hidden allocator scripts and promotion tables are reconstructed as their original `alloc`, `free`, `&`, `*`, and `[p][i]` syntax on re-import. The `__heap` and `__ptab` lists are invisible — the decompiler uses internal metadata to restore the correct high-level code.

---

## Example: Linked List

A complete example building a three-node linked list, summing its values, then freeing all nodes:

```
on flag {
    // Address-of and dereference
    set [x] to 42
    set [px] to &[x]
    say("through the pointer: {*[px]}")
    set *[px] to 99
    say("x is now {[x]}")

    // Build a linked list 3 -> 2 -> 1 (each node is 2 cells: value, next)
    set [head] to 0
    set [i] to 0
    repeat 3 {
        change [i] by 1
        set [node] to alloc(2)
        set *[node] to [i]                    // store value
        set *([node] + 1) to [head]           // store next pointer
        set [head] to [node]                  // advance head
    }

    // Walk the list and sum the values
    set [sum] to 0
    set [node] to [head]
    while ([node] > 0) {
        change [sum] by *[node]               // add node's value
        set [node] to *([node] + 1)           // follow next pointer
    }
    say("sum = {[sum]}")

    // Free every node (grab next before freeing)
    set [node] to [head]
    while ([node] > 0) {
        set [next] to *([node] + 1)
        free([node])
        set [node] to [next]
    }
}
```

See `examples/pointers-linkedlist.sdsl` for the full working example.

---

## Caution notes

1. **No bounds checking**: Pointers are just integers indexing into a list. Reading or writing out-of-bounds silently accesses whatever is there — undefined behavior.

2. **Use-after-free**: If you `free(p)` and then later `*[p]`, you're reading from a cell that may have been reallocated to a different block. The value will be stale or corrupted.

3. **Visible implementation**: The `__heap` and `__ptab` lists are real stage lists. If you or a collaborator edit them in Scratch's UI while scripts are running, the allocator's invariants break.

4. **No garbage collection**: You must call `free(p)` manually. Forgetting to free means memory leaks — the heap grows without bound until the project runs out of list space (Scratch's effective ceiling is ~200,000 items per list).

5. **Performance**: Pointer dereference (`*[p]`) compiles to a `data_itemoflist` block, which is slower than direct variable access. Use pointers when you need dynamic structure, not as a general optimization.

---

## Syntax summary

```
&[x]              // Address of global variable x
*[p]              // Read value at pointer p
*(expr)           // Read value at pointer expression
set *[p] to v     // Write value through pointer
[p][i]            // Read at offset p + i (pointer indexing)
alloc(n)          // Allocate n cells, return pointer
free(p)           // Free cells starting at pointer p
```
