import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compileSource } from '../src/compiler.js';
import { build, haveVM, runInScratchVM } from './backend-harness.js';
import { makeMockVM } from './mock-vm.js';

function compileSay(expression) {
    const vm = makeMockVM();
    const { blocks, errors } = compileSource(`on flag {\n    say(${expression})\n}`, vm, 'Sprite1');
    assert.deepEqual(errors, []);
    return blocks;
}

function sayArgumentId(blocks) {
    const say = Object.values(blocks).find(b => b.opcode === 'looks_say');
    return say.inputs.MESSAGE.block;
}

for (const word of ['volume', 'timer', 'size', 'xPos', 'not', 'and', 'or', 'mod']) {
    test(`string literal "${word}" stays a text block`, () => {
        const blocks = compileSay(`"${word}"`);
        const argument = blocks[sayArgumentId(blocks)];
        assert.equal(argument.opcode, 'text');
        assert.equal(argument.fields.TEXT.value, word);
    });
}

for (const [x, expected] of [[-5, 0], [0, 0], [4, 4], [10, 10], [99, 10]]) {
    test(`clamp(xPos, 0, 10) with xPos=${x}`, { skip: !haveVM }, async () => {
        const { errors, compiled } = build(`on flag { setX(${x}) say(clamp(xPos, 0, 10)) }`);
        assert.deepEqual(errors, []);
        const runtime = await runInScratchVM(compiled);
        assert.deepEqual(runtime.said, [String(expected)]);
    });
}
