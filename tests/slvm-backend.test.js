import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeHeader } from '../src/headers.js';
import { makeMockVM, provisionAndCompile } from './mock-vm.js';
import { SPRITE, haveVM, compileWith, build, visible, runInScratchVM } from './backend-harness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.join(__dirname, '..', 'examples');
const FRAMES = 150;
const expectations = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'example-results.json'), 'utf8'));

const NOT_DECOMPILABLE = new Set(['unsafe-asm.sdsl']);
writeHeader('mathutils.h', 'define square(v) returns {\n    return v * v\n}\n');

const files = fs.readdirSync(examplesDir).filter((f) => f.endsWith('.sdsl')).sort();
const read = (file) => fs.readFileSync(path.join(examplesDir, file), 'utf-8');


for (const file of files) {
    test(`slvm backend: ${file} compiles`, () => {
        assert.deepEqual(build(read(file)).errors, []);
    });

    test(`slvm: ${file} preserves recorded runtime behavior`, { skip: !haveVM && 'scratch-vm is not installed' }, async () => {
        const result = build(read(file));
        assert.deepEqual(result.errors, []);
        const runtime = await runInScratchVM(result.compiled, { runFor: FRAMES });
        assert.deepEqual({ vars: visible(runtime.vars), lists: visible(runtime.lists), said: runtime.said, sprites: runtime.sprites }, expectations[file]);
    });
}

const FIB = `define fib(n) returns {
    if n < 2 {
        return n
    }
    return fib(n - 1) + fib(n - 2)
}

on flag {
    set [result] to fib(10)
}
`;

test('slvm backend: recursive returning calls keep each frame\'s value', { skip: !haveVM && 'slvm/testing with scratch-vm is not installed' }, async () => {
    const { errors, compiled } = build(FIB);
    assert.deepEqual(errors, []);
    const { vars } = await runInScratchVM(compiled, { runFor: 30 });
    assert.equal(Number(vars.result), 55);
});

test('slvm backend: a round reporter in a boolean slot is placed directly, using Scratch truthiness', () => {
    const { errors, blocks } = build('on flag {\n    if [flag] {\n        say("on")\n    }\n}\n');
    assert.deepEqual(errors, []);
    const ifBlock = Object.values(blocks).find((b) => b.opcode === 'control_if');
    assert.equal(blocks[ifBlock.inputs.CONDITION.block].opcode, 'data_variable');
});

const LOOPS = `on flag {
    set [total] to 0
    for [i] from 1 to 10 {
        if [i] mod 2 = 0 {
            continue
        }
        if [i] > 7 {
            break
        }
        change [total] by [i]
    }
    set [n] to 0
    do {
        change [n] by 1
        if [n] < 3 {
            continue
        }
        change [total] by 100
    } while [n] < 5
}
`;

test('slvm backend: continue and break inside for and do-while', { skip: !haveVM && 'slvm/testing with scratch-vm is not installed' }, async () => {
    const { errors, compiled } = build(LOOPS);
    assert.deepEqual(errors, []);
    const { vars } = await runInScratchVM(compiled, { runFor: 60 });
    assert.equal(Number(vars.total), 1 + 3 + 5 + 7 + 300);
    assert.equal(Number(vars.n), 5);
});

test('slvm backend: output decompiles to source the compiler accepts', async () => {
    const { decompile } = await import('../src/decompiler.js');
    for (const file of files) {
        if (NOT_DECOMPILABLE.has(file)) continue;
        const vm = makeMockVM();
        const { blocks, errors } = provisionAndCompile(compileWith, read(file), vm, SPRITE);
        assert.deepEqual(errors, [], file);
        const target = vm.runtime.targets.find((t) => !t.isStage);
        target.blocks._blocks = { ...target.blocks._blocks, ...blocks };
        const text = decompile(vm, SPRITE);
        assert.doesNotMatch(text, /\/\/ Error|unsupported:/, `${file}:\n${text}`);
        const again = provisionAndCompile(compileWith, text, makeMockVM(), SPRITE);
        assert.deepEqual(again.errors, [], `${file} decompiled to:\n${text}`);
    }
});

test('slvm backend: calls a custom block that only exists as blocks in the project', { skip: !haveVM && 'slvm/testing with scratch-vm is not installed' }, async () => {
    const vm = makeMockVM();
    const existing = provisionAndCompile(compileWith, 'define bump(n) {\n    change [count] by n\n}\n', vm, SPRITE);
    assert.deepEqual(existing.errors, []);
    const sprite = vm.runtime.targets.find((t) => !t.isStage);
    sprite.blocks._blocks = { ...existing.blocks };
    const { blocks, errors } = provisionAndCompile(compileWith, 'on flag {\n    bump(3)\n    bump(4)\n}\n', vm, SPRITE);
    assert.deepEqual(errors, []);
    const calls = Object.values(blocks).filter((b) => b.opcode === 'procedures_call');
    const proto = Object.values(existing.blocks).find((b) => b.opcode === 'procedures_prototype');
    assert.equal(calls.length, 2);
    for (const call of calls) {
        assert.equal(call.mutation.proccode, proto.mutation.proccode);
        assert.deepEqual(Object.keys(call.inputs), JSON.parse(proto.mutation.argumentids));
    }
    assert.ok(!Object.values(blocks).some((b) => b.opcode === 'procedures_definition'));
    const targets = vm.runtime.targets.map((t) => ({
        kind: t.isStage ? 'stage' : 'sprite',
        name: t.isStage ? 'Stage' : t.sprite.name,
        variables: Object.values(t.variables).map((v) => ({ id: v.id, name: v.name, type: v.type })),
        blocks: t.isStage ? {} : { ...existing.blocks, ...blocks },
    }));
    const { vars } = await runInScratchVM({ targets }, { runFor: 30 });
    assert.equal(Number(vars.count), 7);
});

test('slvm backend: an `on timer > …` threshold can be an expression', () => {
    const { errors, blocks } = build('on timer > [limit] * 2 {\n    say("late")\n}\n');
    assert.deepEqual(errors, []);
    const hat = Object.values(blocks).find((b) => b.opcode === 'event_whengreaterthan');
    assert.equal(hat.fields.WHENGREATERTHANMENU.value, 'TIMER');
    assert.equal(blocks[hat.inputs.VALUE.block].opcode, 'operator_multiply');
});
