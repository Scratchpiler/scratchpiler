import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileSource } from '../src/compiler.js';
import { decompile } from '../src/decompiler.js';
import { isCompilerVariable } from '../src/variables.js';
import { makeMockVM, provisionAndCompile } from './mock-vm.js';

const SPRITE = 'Sprite1';
const examplesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'examples');
const SKIPPED = new Set(['unsafe-asm.sdsl', 'include-demo.sdsl']);

function pulled(source, options = {}, vm = makeMockVM({ vars: ['x', 'out'], lists: ['stuff'] })) {
    const result = provisionAndCompile((src, machine, sprite) => compileSource(src, machine, sprite, options), source, vm, SPRITE);
    assert.deepEqual(result.errors, []);
    vm.runtime.targets[1].blocks._blocks = result.blocks;
    return decompile(vm, SPRITE);
}

const LEAK = /_scratchpiler_internal_|__ret_|__heap|__ptab|__alloc|__sroutine/;
const KNOWN_TEMPORARY = /_scratchpiler_internal_slvm_spill\d+/;

for (const optimize of [true, false]) {
    for (const file of fs.readdirSync(examplesDir).filter(name => name.endsWith('.sdsl') && !SKIPPED.has(name)).sort()) {
        test(`no compiler names in the pulled source of ${file} (optimize: ${optimize})`, () => {
            const text = pulled(fs.readFileSync(path.join(examplesDir, file), 'utf8'), { optimize }, makeMockVM());
            const leaks = text.split('\n').filter(line => LEAK.test(line) && !KNOWN_TEMPORARY.test(line));
            assert.deepEqual(leaks, []);
        });
    }
}

test('a for loop body names its iterator, including assignments to it', () => {
    const text = pulled('on flag {\n    for [i] from 1 to 3 {\n        change [x] by [i]\n        set [i] to [i] + 1\n    }\n}', { optimize: false });
    assert.match(text, /for \[i\] from "?1"? to "?3"? \{/);
    assert.match(text, /change \[x\] by \[i\]/);
    assert.match(text, /set \[i\] to \(\[i\] \+ 1\)/);
    assert.doesNotMatch(text, LEAK);
});

test('nested loops each name their own iterator', () => {
    const text = pulled('on flag {\n    for [i] from 1 to 2 {\n        for [j] from 1 to 2 {\n            change [x] by [i] * [j]\n        }\n    }\n}', { optimize: false });
    assert.match(text, /for \[i\] from/);
    assert.match(text, /for \[j\] from/);
    assert.match(text, /\(\[i\] \* \[j\]\)/);
    assert.doesNotMatch(text, LEAK);
});

test('a loop variable does not leak past its loop', () => {
    const text = pulled('on flag {\n    for [i] from 1 to 2 {\n        change [x] by [i]\n    }\n    set [out] to [x]\n}', { optimize: false });
    assert.match(text, /set \[out\] to \[x\]/);
});

test('a pyfor body names its item', () => {
    const text = pulled('on flag {\n    pyfor [item] in [stuff] {\n        change [x] by [item]\n    }\n}', { optimize: false });
    assert.match(text, /pyfor \[item\] in \[stuff\] \{\n\s+change \[x\] by \[item\]/);
});

test('a returning call comes back as a call, not a statement plus a return-variable read', () => {
    const source = 'define square(n) returns {\n    return n * n\n}\n\non flag {\n    set [out] to square(4)\n    say(square(3) + 1)\n}';
    const text = pulled(source, { optimize: false });
    assert.match(text, /set \[out\] to square\(/);
    assert.match(text, /say\(\(square\(.*\) \+ 1\)\)/);
    assert.doesNotMatch(text, /__ret_/);
});

test('recursion keeps its recursive call inside the return', () => {
    const text = pulled('define fact(n) returns {\n    if n < 2 {\n        return 1\n    }\n    return n * fact(n - 1)\n}\n\non flag {\n    set [out] to fact(5)\n}', { optimize: false });
    assert.match(text, /return \(\[n\] \* fact\(/);
    assert.doesNotMatch(text, /__ret_/);
});

test('a returning call is only folded into the statement right after it', () => {
    const source = 'define bump() returns {\n    change [x] by 1\n    return [x]\n}\n\non flag {\n    set [out] to bump()\n    say("between")\n    set [out] to bump()\n}';
    const text = pulled(source, { optimize: false });
    const order = text.slice(text.indexOf('on flag')).match(/bump\(\)|say\("between"\)/g);
    assert.deepEqual(order, ['bump()', 'say("between")', 'bump()']);
});

test('pulled source with folded calls compiles again', () => {
    const source = 'define square(n) returns {\n    return n * n\n}\n\non flag {\n    set [out] to square(4) + square(3)\n}';
    const text = pulled(source, { optimize: false });
    assert.deepEqual(provisionAndCompile(compileSource, text, makeMockVM(), SPRITE).errors, []);
});

test('the clamp helper decompiles to clamp and its define is not emitted', () => {
    const text = pulled('on flag {\n    set [out] to clamp([x], 0, 100)\n}', { optimize: false });
    assert.match(text, /clamp\(\[x\], "?0"?, "?100"?\)/);
    assert.doesNotMatch(text, /define/);
});

test('alloc and free helpers decompile to alloc and free, with no define', () => {
    const text = pulled('on flag {\n    set [out] to alloc(2)\n    free([out])\n}', { optimize: false });
    assert.match(text, /alloc\(/);
    assert.match(text, /free\(/);
    assert.doesNotMatch(text, /define/);
});

test('compiler variables are hidden in every list', () => {
    for (const name of ['__heap', '__ret_f', '_scratchpiler_internal_ab12_i', '_scratchpiler_internal_slvm_spill0']) assert.equal(isCompilerVariable(name), true, name);
    for (const name of ['score', '_private', 'scratchpiler_internal']) assert.equal(isCompilerVariable(name), false, name);
});
