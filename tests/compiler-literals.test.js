import { test } from 'node:test';
import assert from 'node:assert/strict';

import { compileSource } from '../src/compiler.js';
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

function evaluate(blocks, id, env) {
    const b = blocks[id];
    const input = name => evaluate(blocks, b.inputs[name].block, env);
    switch (b.opcode) {
        case 'math_number':
        case 'text': return Number(b.fields.NUM?.value ?? b.fields.TEXT.value);
        case 'motion_xposition': return env.xPos;
        case 'operator_add': return input('NUM1') + input('NUM2');
        case 'operator_subtract': return input('NUM1') - input('NUM2');
        case 'operator_divide': return input('NUM1') / input('NUM2');
        case 'operator_mathop':
            assert.equal(b.fields.OPERATOR.value, 'abs');
            return Math.abs(input('NUM'));
        default: throw new Error(`unexpected opcode ${b.opcode}`);
    }
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
    test(`clamp(xPos, 0, 10) with xPos=${x}`, () => {
        const blocks = compileSay('clamp(xPos, 0, 10)');
        assert.equal(evaluate(blocks, sayArgumentId(blocks), { xPos: x }), expected);
    });
}
