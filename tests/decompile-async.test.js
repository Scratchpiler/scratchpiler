import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileSource } from '../src/compiler.js';
import { decompile, decompileAsync } from '../src/decompiler.js';
import { makeMockVM, provisionAndCompile } from './mock-vm.js';

const SPRITE = 'Sprite1';
const examplesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'examples');

function vmFromExample(name) {
    const vm = makeMockVM();
    const result = provisionAndCompile(compileSource, fs.readFileSync(path.join(examplesDir, name), 'utf8'), vm, SPRITE);
    assert.deepEqual(result.errors, []);
    vm.runtime.targets[1].blocks._blocks = result.blocks;
    return vm;
}

const scriptCount = vm => Object.values(vm.runtime.targets[1].blocks._blocks).filter(b => b.topLevel && !b.shadow).length;

test('decompileAsync returns exactly what decompile returns', async () => {
    const vm = vmFromExample('platformer-full.sdsl');
    assert.equal(await decompileAsync(vm, SPRITE), decompile(vm, SPRITE));
});

test('a zero-length slice yields between scripts and reports progress', async () => {
    const vm = vmFromExample('platformer-full.sdsl');
    const progress = [];
    await decompileAsync(vm, SPRITE, { sliceMs: 0, onProgress: fraction => progress.push(fraction) });
    assert.ok(scriptCount(vm) > 1);
    assert.ok(progress.length >= scriptCount(vm));
    assert.deepEqual(progress, [...progress].sort((a, b) => a - b));
    assert.ok(progress.every(fraction => fraction >= 0 && fraction < 1));
});

test('a sync decompile of another sprite in between does not change the result', async () => {
    const first = vmFromExample('platformer-full.sdsl');
    const other = vmFromExample('ask-quiz.sdsl');
    const expected = decompile(first, SPRITE);
    let interleaved = 0;
    const text = await decompileAsync(first, SPRITE, {
        sliceMs: 0,
        onProgress: () => { interleaved++; decompile(other, SPRITE); },
    });
    assert.ok(interleaved > 0);
    assert.equal(text, expected);
});

test('an aborted run rejects instead of finishing', async () => {
    const vm = vmFromExample('platformer-full.sdsl');
    const controller = new AbortController();
    await assert.rejects(
        decompileAsync(vm, SPRITE, { sliceMs: 0, signal: controller.signal, onProgress: () => controller.abort() }),
        { name: 'AbortError' },
    );
});

test('timers get to run while a sprite is being decompiled', async () => {
    const vm = vmFromExample('platformer-full.sdsl');
    let ticks = 0;
    const timer = setInterval(() => ticks++, 0);
    await decompileAsync(vm, SPRITE, { sliceMs: 0 });
    clearInterval(timer);
    assert.ok(ticks > 0);
});
