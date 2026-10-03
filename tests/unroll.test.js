import test from 'node:test';
import assert from 'node:assert/strict';

import { decompile } from '../src/decompiler.js';
import { writeComments } from '../src/metadata.js';
import { build, execute, haveVM, SPRITE } from './backend-harness.js';
import { makeMockVM } from './mock-vm.js';

const vars = () => makeMockVM({ vars: ['out'] });
const opcodes = ({ blocks }, opcode) => Object.values(blocks).filter(block => block.opcode === opcode).length;
const loops = result => opcodes(result, 'control_repeat') + opcodes(result, 'control_repeat_until');

const WARP_REPEAT = 'define w(x) warp {\n    repeat 3 {\n        change [out] by x\n    }\n}\n\non flag {\n    w(2)\n}';

test('a constant repeat inside a warp block is unrolled', () => {
    const result = build(WARP_REPEAT, vars());
    assert.deepEqual(result.errors, []);
    assert.equal(loops(result), 0);
    assert.equal(opcodes(result, 'data_changevariableby'), 3);
    assert.equal(result.optimizerFallback, null);
});

test('returning blocks are warp, so their constant loops unroll too', () => {
    const source = 'define total(x) returns {\n    for [i] from 1 to 3 {\n        change [out] by [i]\n    }\n    return [out] + x\n}\n\non flag {\n    set [out] to total(1)\n}';
    assert.equal(loops(build(source, vars())), 0);
});

test('optimize: false keeps every loop', () => {
    assert.equal(loops(build(WARP_REPEAT, vars(), SPRITE, { optimize: false })), 1);
});

test('nounroll keeps the loop', () => {
    assert.equal(loops(build(WARP_REPEAT.replace('repeat 3 {', 'repeat 3 nounroll {'), vars())), 1);
});

test('loops in scripts and in plain custom blocks are never unrolled', () => {
    const script = 'on flag {\n    repeat 3 {\n        change [out] by 1\n    }\n}';
    const plain = 'define p(x) noinline {\n    repeat 3 {\n        change [out] by x\n    }\n}\n\non flag {\n    p(2)\n}';
    assert.equal(loops(build(script, vars())), 1);
    assert.equal(loops(build(plain, vars())), 1);
});

test('a loop with break or continue, too many trips, or a variable count stays a loop', () => {
    const inWarp = body => `define w(x) warp {\n${body}\n}\n\non flag {\n    w(1)\n}`;
    assert.equal(loops(build(inWarp('    repeat 3 {\n        change [out] by 1\n        if [out] > 1 {\n            break\n        }\n    }'), vars())), 1);
    assert.equal(loops(build(inWarp('    repeat 3 {\n        change [out] by 1\n        continue\n    }'), vars())), 1);
    assert.equal(loops(build(inWarp('    repeat 17 {\n        change [out] by 1\n    }'), vars())), 1);
    assert.equal(loops(build(inWarp('    repeat x {\n        change [out] by 1\n    }'), vars())), 1);
});

test('a for loop with variable bounds stays a loop', () => {
    assert.equal(loops(build('define w(x) warp {\n    for [i] from 1 to x {\n        change [out] by [i]\n    }\n}\n\non flag {\n    w(3)\n}', vars())), 1);
});

const RUNTIME = { skip: !haveVM && 'scratch-vm is not installed' };

test('unrolled loops compute what the loops did', RUNTIME, async () => {
    const source = 'define w(x) warp {\n    repeat 3 {\n        change [out] by x\n    }\n    for [i] from 1 to 3 {\n        change [out] by [i] * 10\n    }\n    for [j] from 4 to 2 {\n        change [out] by 1000\n    }\n}\n\non flag {\n    set [out] to 0\n    w(2)\n    say([out])\n}';
    for (const optimize of [true, false]) {
        const { runtime, errors } = await execute(source, { maxFrames: 50 }, { vars: ['out'] }, { optimize });
        assert.deepEqual(errors, []);
        assert.deepEqual(runtime.said, ['66'], `optimize: ${optimize}`);
    }
});

test('unrolling an inlined call still computes the right value', RUNTIME, async () => {
    const source = 'define tri(n) returns {\n    set [out] to 0\n    for [i] from 1 to 4 {\n        change [out] by [i] + n\n    }\n    return [out]\n}\n\non flag {\n    say(tri(1))\n    say(tri(2))\n}';
    const { runtime, errors } = await execute(source, { maxFrames: 50 }, { vars: ['out'] });
    assert.deepEqual(errors, []);
    assert.deepEqual(runtime.said, ['14', '18']);
});

test('the pulled source after unrolling is the embedded source, loop and all', () => {
    const result = build(WARP_REPEAT, vars(), SPRITE, { embedSource: true });
    const target = result.vm.runtime.targets.find(t => !t.isStage && t.sprite.name === SPRITE);
    target.blocks._blocks = { ...result.blocks };
    writeComments(target, result.blocks, result.comments, {});
    assert.equal(decompile(result.vm, SPRITE), `${WARP_REPEAT}\n`);
});
