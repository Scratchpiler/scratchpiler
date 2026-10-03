import test from 'node:test';
import assert from 'node:assert/strict';

import { decompile } from '../src/decompiler.js';
import { writeComments } from '../src/metadata.js';
import { build, SPRITE } from './backend-harness.js';
import { makeMockVM } from './mock-vm.js';

const AREA = 'define area(w, h) returns {\n    return w * h\n}\n\non flag {\n    set [out] to area(6, 7)\n}';
const vars = () => makeMockVM({ vars: ['out'] });
const callsIn = ({ blocks }) => Object.values(blocks).filter(block => block.opcode === 'procedures_call').length;

test('small custom blocks are inlined by default', () => {
    const result = build(AREA, vars());
    assert.deepEqual(result.errors, []);
    assert.equal(callsIn(result), 0);
    assert.equal(result.optimizerFallback, null);
});

test('inlined calls are folded, so a constant call becomes a constant', () => {
    const { blocks } = build(AREA, vars());
    const setter = Object.values(blocks).find(block => block.opcode === 'data_setvariableto' && block.fields.VARIABLE.value === 'out');
    assert.equal(blocks[setter.inputs.VALUE.shadow].fields.TEXT.value, '42');
});

test('noinline keeps the call', () => {
    const result = build(AREA.replace('returns {', 'returns noinline {'), vars());
    assert.equal(callsIn(result), 1);
});

test('optimize: false keeps every call', () => {
    const result = build(AREA, vars(), SPRITE, { optimize: false });
    assert.equal(callsIn(result), 1);
});

test('recursive custom blocks keep their calls', () => {
    const source = 'define fact(n) returns {\n    if n < 2 {\n        return 1\n    }\n    return n * fact(n - 1)\n}\n\non flag {\n    set [out] to fact(5)\n}';
    assert.ok(callsIn(build(source, vars())) >= 2);
});

test('a block that stops its own script is never inlined', () => {
    const source = 'define quit() {\n    set [out] to 1\n    stopThis()\n}\n\non flag {\n    quit()\n    set [out] to 2\n}';
    assert.equal(callsIn(build(source, vars())), 1);
});

test('a warp block with a loop stays a call inside a script', () => {
    const source = 'define spin(n) warp {\n    repeat n {\n        change [out] by 1\n    }\n}\n\non flag {\n    spin(3)\n}';
    assert.equal(callsIn(build(source, vars())), 1);
});

test('the pulled source after inlining is the embedded source, calls and all', () => {
    const result = build(AREA, vars(), SPRITE, { embedSource: true });
    const target = result.vm.runtime.targets.find(t => !t.isStage && t.sprite.name === SPRITE);
    target.blocks._blocks = { ...result.blocks };
    writeComments(target, result.blocks, result.comments, {});
    assert.equal(decompile(result.vm, SPRITE), `${AREA}\n`);
});
