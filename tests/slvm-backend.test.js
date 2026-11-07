import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeHeader } from '../src/headers.js';
import { decompile } from '../src/decompiler.js';
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

function scratchAuthoredBumper(countId) {
    const blocks = {};
    const block = (id, opcode, rest = {}) => {
        blocks[id] = { id, opcode, next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: false, ...rest };
        return blocks[id];
    };
    const input = (parent, name, child) => {
        blocks[parent].inputs[name] = { name, block: child, shadow: blocks[child].shadow ? child : null };
        blocks[child].parent = parent;
    };
    const number = (id, value) => block(id, 'math_number', { shadow: true, fields: { NUM: { name: 'NUM', value: String(value) } } });
    const text = (id, value) => block(id, 'text', { shadow: true, fields: { TEXT: { name: 'TEXT', value } } });
    const argument = (id, opcode, name) => block(id, opcode, { fields: { VALUE: { name: 'VALUE', value: name } } });
    const change = (id, amount) => {
        block(id, 'data_changevariableby', { fields: { VARIABLE: { name: 'VARIABLE', value: 'count', id: countId, variableType: '' } } });
        input(id, 'VALUE', amount);
    };
    const mutation = { tagName: 'mutation', children: [], proccode: 'Move By %n steps %b', argumentids: '["argDist","argFast"]', warp: 'false' };

    block('def', 'procedures_definition', { topLevel: true, x: 0, y: 0 });
    block('proto', 'procedures_prototype', { shadow: true, mutation: { ...mutation, argumentnames: '["dist","fast?"]', argumentdefaults: '["","false"]' } });
    input('def', 'custom_block', 'proto');
    argument('protoDist', 'argument_reporter_string_number', 'dist').shadow = true;
    argument('protoFast', 'argument_reporter_boolean', 'fast?').shadow = true;
    input('proto', 'argDist', 'protoDist');
    input('proto', 'argFast', 'protoFast');
    block('branch', 'control_if_else', { parent: 'def' });
    blocks.def.next = 'branch';
    input('branch', 'CONDITION', argument('readFast', 'argument_reporter_boolean', 'fast?').id);
    block('double', 'operator_multiply');
    input('double', 'NUM1', argument('readDist1', 'argument_reporter_string_number', 'dist').id);
    input('double', 'NUM2', number('two', 2).id);
    change('fastChange', 'double');
    change('slowChange', argument('readDist2', 'argument_reporter_string_number', 'dist').id);
    input('branch', 'SUBSTACK', 'fastChange');
    input('branch', 'SUBSTACK2', 'slowChange');

    block('flag', 'event_whenflagclicked', { topLevel: true, x: 400, y: 0 });
    block('slowCall', 'procedures_call', { parent: 'flag', mutation });
    blocks.flag.next = 'slowCall';
    input('slowCall', 'argDist', number('three', 3).id);
    block('fastCall', 'procedures_call', { parent: 'slowCall', mutation });
    blocks.slowCall.next = 'fastCall';
    input('fastCall', 'argDist', number('four', 4).id);
    block('yes', 'operator_equals');
    input('yes', 'OPERAND1', text('one1', '1').id);
    input('yes', 'OPERAND2', text('one2', '1').id);
    input('fastCall', 'argFast', 'yes');
    return blocks;
}

async function countAfterRunning(vm, blocks) {
    const targets = vm.runtime.targets.map((t) => ({
        kind: t.isStage ? 'stage' : 'sprite',
        name: t.isStage ? 'Stage' : t.sprite.name,
        variables: Object.values(t.variables).map((v) => ({ id: v.id, name: v.name, type: v.type })),
        blocks: t.isStage ? {} : blocks,
    }));
    const { vars } = await runInScratchVM({ targets }, { runFor: 30 });
    return Number(vars.count);
}

test('slvm backend: recompiling a Scratch-made custom block keeps its signature, so inject replaces it', { skip: !haveVM && 'slvm/testing with scratch-vm is not installed' }, async () => {
    const vm = makeMockVM({ vars: ['count'] });
    const countId = Object.values(vm.runtime.targets[0].variables).find((v) => v.name === 'count').id;
    const original = scratchAuthoredBumper(countId);
    const sprite = vm.runtime.targets.find((t) => !t.isStage);
    sprite.blocks._blocks = { ...original };
    assert.equal(await countAfterRunning(vm, original), 11);

    const source = decompile(vm, SPRITE);
    for (const optimize of [0, 1]) {
        const { blocks, errors } = compileWith(source, vm, SPRITE, { optimize });
        assert.deepEqual(errors, []);
        const proto = Object.values(blocks).find((b) => b.opcode === 'procedures_prototype');
        assert.equal(proto.mutation.proccode, 'Move By %n steps %b');
        assert.equal(proto.mutation.argumentids, '["argDist","argFast"]');
        assert.equal(blocks[proto.inputs.argFast.block].opcode, 'argument_reporter_boolean');
        const definition = Object.values(blocks).find((b) => b.opcode === 'procedures_definition');
        const condition = blocks[blocks[definition.next].inputs.CONDITION.block];
        assert.equal(condition.opcode, 'argument_reporter_boolean');
        const calls = Object.values(blocks).filter((b) => b.opcode === 'procedures_call');
        assert.ok(calls.every((call) => call.mutation.proccode === 'Move By %n steps %b'));
        if (optimize === 0) {
            assert.deepEqual(calls.map((call) => Object.keys(call.inputs).sort()), [['argDist'], ['argDist', 'argFast']]);
        }
        assert.equal(await countAfterRunning(vm, blocks), 11);
    }

    const { blocks } = compileWith(source, vm, SPRITE, { optimize: 0 });
    sprite.blocks._blocks = blocks;
    assert.equal(decompile(vm, SPRITE), source);
});

test('slvm backend: an `on timer > …` threshold can be an expression', () => {
    const { errors, blocks } = build('on timer > [limit] * 2 {\n    say("late")\n}\n');
    assert.deepEqual(errors, []);
    const hat = Object.values(blocks).find((b) => b.opcode === 'event_whengreaterthan');
    assert.equal(hat.fields.WHENGREATERTHANMENU.value, 'TIMER');
    assert.equal(blocks[hat.inputs.VALUE.block].opcode, 'operator_multiply');
});
