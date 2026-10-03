import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cast } from 'slvm';
import { compileSource, tokenize, parse, lint } from '../src/compiler.js';
import { decompile } from '../src/decompiler.js';
import { loadSettings, DEFAULT_SETTINGS } from '../src/settings.js';
import { makeMockVM } from './mock-vm.js';
import { build, execute, haveVM, runInScratchVM } from './backend-harness.js';

const skip = !haveVM && 'scratch-vm is not installed';
const quote = value => JSON.stringify(String(value)).replace(/{/g, '{{').replace(/}/g, '}}');
const VALUES = ['', ' ', '0', '00', '-0', 'false', 'FALSE', 'true', 'NaN', 'Infinity', '-Infinity', 'abc', 'ABC', '1.50', '-2.5', '0x10', '1e2', '\t', 'a"b', 'a\\b', '雪🐈', '{a}', '\n'];
const OPERATORS = { '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', mod: 'mod', '<': 'lt', '>': 'gt', '=': 'eq' };

function assertGraph(blocks) {
    for (const block of Object.values(blocks)) {
        assert.equal(blocks[block.id], block);
        if (block.next) {
            assert.ok(blocks[block.next]);
            assert.equal(blocks[block.next].parent, block.id);
        }
        for (const [name, input] of Object.entries(block.inputs)) {
            assert.equal(input.name, name);
            for (const id of new Set([input.block, input.shadow].filter(Boolean))) {
                assert.ok(blocks[id], `${block.opcode}.${name}: ${id}`);
                assert.equal(blocks[id].parent, block.id);
            }
        }
        if (block.parent) assert.ok(blocks[block.parent]);
    }
}

async function run(source, project) {
    const result = await execute(source, { maxFrames: 2000 }, project);
    assert.deepEqual(result.errors, [], source);
    assertGraph(result.blocks);
    return result.runtime;
}

for (const left of VALUES) {
    test(`casts, arithmetic and comparisons with ${JSON.stringify(left)}`, { skip }, async () => {
        const commands = [];
        const expected = [];
        for (const right of VALUES) {
            for (const [symbol, operation] of Object.entries(OPERATORS)) {
                commands.push(`listAdd((${quote(left)} ${symbol} ${quote(right)}), [out])`);
                expected.push(String(cast.EVAL[operation](left, right)));
            }
            commands.push(`listAdd(contains(${quote(left)}, ${quote(right)}), [out])`);
            expected.push(String(cast.EVAL.contains(left, right)));
        }
        const runtime = await run(`on flag { ${commands.join('\n')} }`, { lists: ['out'] });
        assert.deepEqual(runtime.lists.out.map(String), expected);
    });
}

for (const value of VALUES) {
    test(`truthiness and string roundtrip with ${JSON.stringify(value)}`, { skip }, async () => {
        const result = build(`on flag { set [v] to ${quote(value)} if [v] { say("yes") } else { say("no") } say([v]) }`);
        assert.deepEqual(result.errors, []);
        const first = await runInScratchVM(result.compiled);
        assert.deepEqual(first.said, [cast.toBoolean(value) ? 'yes' : 'no', ...(value === '' ? [] : [value])]);
        const target = result.vm.runtime.targets[1];
        target.blocks._blocks = result.blocks;
        const source = decompile(result.vm, 'Sprite1');
        const second = await run(source);
        assert.deepEqual(second.said, first.said);
    });
}

const loop = (kind, variable, body) => {
    const counter = `[${variable}]`;
    if (kind === 'for') return `for ${counter} from 1 to 4 { ${body} }`;
    if (kind === 'pyfor') return `pyfor ${counter} in [L] { ${body} }`;
    const iteration = `change ${counter} by 1 ${body}`;
    const forms = {
        repeat: `repeat 4 { ${iteration} }`,
        while: `while (${counter} < 4) { ${iteration} }`,
        until: `repeat until (${counter} >= 4) { ${iteration} }`,
        do: `do { ${iteration} } while ${counter} < 4`,
        forever: `forever { ${iteration} if ${counter} >= 4 { break } }`,
    };
    return `set ${counter} to 0 ${forms[kind]}`;
};
const LOOPS = ['for', 'pyfor', 'repeat', 'while', 'until', 'do', 'forever'];
for (const outer of LOOPS) {
    for (const inner of LOOPS) {
        test(`nested ${outer}/${inner} with break and continue`, { skip }, async () => {
            const inside = loop(inner, 'j', 'if [j] = 2 { continue } if [j] = 4 { break } change [total] by [i] * 10 + [j]');
            const outside = loop(outer, 'i', `if [i] = 2 { continue } if [i] = 4 { break } ${inside}`);
            const runtime = await run(`on flag { populateList([L], [L].length() + 1, 4, true) set [total] to 0 ${outside} }`, { lists: ['L'] });
            assert.equal(Number(runtime.vars.total), 88);
        });
    }
}

for (const [expression, expected] of [
    ['clamp(1e200, 0, 10)', 10], ['clamp(-1e200, 0, 10)', 0],
    ['clamp("abc", -1, 1)', 0], ['clamp(5, 10, 2)', 10],
    ['clamp("Infinity", 0, 10)', 10], ['clamp("-Infinity", 0, 10)', 0],
    ['clamp(1e-200, 0, 1)', 1e-200],
]) {
    test(`clamp preserves numeric bounds: ${expression}`, { skip }, async () => {
        const runtime = await run(`on flag { say(${expression}) }`);
        assert.deepEqual(runtime.said, [String(expected)]);
    });
}

test('clamp evaluates arguments once, from left to right', { skip }, async () => {
    const runtime = await run(`define tick(n) returns { change [count] by 1 listAdd(n, [out]) return n }
        on flag { set [count] to 0 say(clamp(tick(7), tick(0), tick(10))) }`, { lists: ['out'] });
    assert.equal(Number(runtime.vars.count), 3);
    assert.deepEqual(runtime.lists.out.map(String), ['7', '0', '10']);
    assert.deepEqual(runtime.said, ['7']);
});

test('clamp composes with recursive calls and keeps the spill stack balanced', { skip }, async () => {
    const runtime = await run(`define f(n) returns { change [count] by 1 if n < 1 { return 1 }
        return clamp(f(n - 1), f(n - 1), f(n - 1)) }
        on flag { set [count] to 0 say(f(3)) }`);
    assert.equal(Number(runtime.vars.count), 40);
    assert.deepEqual(runtime.said, ['1']);
    assert.ok(Object.entries(runtime.lists).filter(([name]) => name.includes('slvm_stack')).every(([, list]) => list.length === 0));
});

for (const ending of ['stopThis()', 'stopAll()', 'return', 'forever { wait(0) }']) {
    test(`unreachable statements after ${ending} do not crash the compiler`, () => {
        const source = `on flag { ${ending}\n say("unreachable") }`;
        const result = compileSource(source, makeMockVM(), 'Sprite1');
        assert.deepEqual(result.errors, []);
        assert.ok(!Object.values(result.blocks).some(b => b.opcode === 'looks_say'));
    });
}

for (const ending of ['break', 'continue', 'return 1']) {
    test(`unreachable statements after ${ending} in a procedure loop are discarded`, () => {
        const result = build(`define f() returns { repeat 2 { ${ending} say("unreachable") } return 2 } on flag { say(f()) }`);
        assert.deepEqual(result.errors, []);
        assert.ok(!Object.values(result.blocks).some(b => b.fields?.TEXT?.value === 'unreachable'));
    });
}

for (const source of [
    'define f(a, a) {}', 'define f() {} define f() {}',
    'scratchroutine r(a, a) {}', 'scratchroutine r() {} scratchroutine r() {}',
    'on flag { break }', 'on flag { continue }', 'on flag { return 1 }',
    'define f() { return 1 }', 'define f() {} on flag { say(f()) }',
    'on timer > (true ? 1 : 2) {}',
    'define f() returns { return 1 } on timer > f() {}',
]) {
    test(`invalid program returns diagnostics: ${source}`, () => {
        const vm = makeMockVM();
        const before = structuredClone(vm.runtime.targets.map(t => t.variables));
        const result = compileSource(source, vm, 'Sprite1');
        assert.ok(result.errors.length, source);
        assert.deepEqual(result.blocks, {});
        assert.deepEqual(vm.runtime.targets.map(t => t.variables), before);
    });
}

test('heap preparation and promoted values roll back on compilation failure', () => {
    const vm = makeMockVM({ vars: ['x'] });
    const stage = vm.runtime.targets[0];
    stage.createVariable('heap', '__heap', 'list');
    stage.createVariable('ptab', '__ptab', 'list');
    stage.variables.heap.value = [23];
    stage.variables.ptab.value = [];
    const before = structuredClone(stage.variables);
    const result = compileSource('on flag { say(&[x]) missingProcedure() }', vm, 'Sprite1');
    assert.ok(result.errors.length);
    assert.deepEqual(stage.variables, before);
});

test('taking the address of a sprite scalar that shadows a global is rejected', () => {
    const vm = makeMockVM({ vars: ['x'] });
    vm.runtime.targets[1].createVariable('local-x', 'x', '');
    const before = structuredClone(vm.runtime.targets.map(t => t.variables));
    const result = compileSource('on flag { say(&[x]) }', vm, 'Sprite1');
    assert.match(result.errors[0].message, /sprite-local/);
    assert.deepEqual(vm.runtime.targets.map(t => t.variables), before);
});

test('a scalar and list with the same name keep distinct IDs', { skip }, async () => {
    const vm = makeMockVM({ vars: ['idx'], lists: ['idx'] });
    const result = build('on flag { set [idx] to 7 listAdd([idx], [idx]) say([idx].item(1)) say([idx]) }', vm);
    assert.deepEqual(result.errors, []);
    const runtime = await runInScratchVM(result.compiled);
    assert.deepEqual(runtime.said, ['7', '7']);
    assert.deepEqual(runtime.lists.idx.map(String), ['7']);
    const fields = Object.values(result.blocks).flatMap(b => Object.entries(b.fields).filter(([k]) => ['VARIABLE', 'LIST'].includes(k)));
    const scalar = fields.find(([k]) => k === 'VARIABLE')[1].id;
    assert.ok(fields.filter(([k]) => k === 'LIST').every(([, f]) => f.id !== scalar));
});

for (const owner of ['sprite', 'stage']) {
    test(`compiler variables belong to the ${owner} target`, () => {
        const vm = makeMockVM();
        const result = build('on flag { for [i] from 1 to 2 { say([i]) } }', vm, owner === 'stage' ? '__stage__' : 'Sprite1');
        assert.deepEqual(result.errors, []);
        const hidden = target => Object.values(target.variables).filter(v => v.name.startsWith('_scratchpiler_internal_'));
        assert.ok(hidden(vm.runtime.targets[owner === 'stage' ? 0 : 1]).length);
        assert.equal(hidden(vm.runtime.targets[owner === 'stage' ? 1 : 0]).length, 0);
        assertGraph(result.blocks);
    });
}

test('old backend preferences cannot select the removed compiler', () => {
    for (const backend of ['classic', 'slvm', 'unknown']) {
        const settings = loadSettings({ getItem: () => JSON.stringify({ backend, fontSize: '19', wrap: false }) });
        assert.equal(settings.fontSize, '19');
        assert.equal(settings.wrap, false);
        assert.ok(!Object.hasOwn(settings, 'backend'));
        const result = compileSource('on flag { for [i] from 1 to 2 { break } }', makeMockVM(), 'Sprite1', { backend });
        assert.deepEqual(result.errors, []);
    }
    assert.deepEqual(loadSettings({ getItem: () => '{' }), DEFAULT_SETTINGS);
    assert.deepEqual(loadSettings({ getItem: () => null }), DEFAULT_SETTINGS);
    assert.deepEqual(loadSettings({ getItem() { throw new Error('storage denied'); } }), DEFAULT_SETTINGS);
    const html = fs.readFileSync(new URL('../src/overlay.html', import.meta.url), 'utf8');
    assert.doesNotMatch(html, /sp-setting-backend|SLVM \(experimental\)|<h3>Compiler<\/h3>/);
});

test('malformed syntax always makes progress and produces diagnostics', () => {
    const sources = ['on', 'define', 'struct X { 1 ? }', 'on flag { say(', 'on flag { if (', 'define f(', 'on flag { say("open', 'on flag { set [open'];
    for (const source of sources) {
        const result = compileSource(source, makeMockVM(), 'Sprite1');
        assert.ok(result.errors.length, source);
    }
    let seed = 91823;
    const next = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
    const base = 'on flag { repeat 3 { if 1 < 2 { say("x") } else { wait(0) } } }';
    const chars = '{}(),[]?:;"012abc/\\';
    for (let i = 0; i < 2000; i++) {
        const at = next() % base.length;
        const source = base.slice(0, at) + chars[next() % chars.length] + base.slice(at + 1);
        const result = compileSource(source, makeMockVM(), 'Sprite1');
        assert.ok(Array.isArray(result.errors), source);
        if (!result.errors.length) assertGraph(result.blocks);
    }
    assert.deepEqual(parse(tokenize('struct X { 1 }')).errors.map(e => e.message), ['Expected a struct field name']);
});

for (const expression of ['(2 + 3) * 4', '10 - (4 - 1)', '24 / (2 * 3)', '("1" = "1")', 'not ((1 < 2) or (2 > 3))', 'join("a\\\\b", join("1", "2"))', 'join("line\\n", join("{x}", "end"))']) {
    test(`decompiler preserves expression semantics: ${expression}`, { skip }, async () => {
        const original = build(`on flag { say(${expression.replace('{x}', '{{x}}')}) }`);
        assert.deepEqual(original.errors, []);
        original.vm.runtime.targets[1].blocks._blocks = original.blocks;
        const first = await runInScratchVM(original.compiled);
        const source = decompile(original.vm, 'Sprite1');
        const second = await run(source);
        assert.deepEqual(second.said, first.said, source);
    });
}

for (const command of ['switchCostume([menu])', 'switchBackdrop([menu])', 'switchBackdropAndWait([menu])', 'play([menu])', 'playUntilDone([menu])', 'goTo([menu])', 'glide(1, [menu])', 'pointTowards([menu])', 'createClone([menu])', 'say(distanceTo([menu]))', 'say(key([menu]))', 'say(touching([menu]))']) {
    test(`decompiler preserves a reporter in a menu: ${command}`, () => {
        const result = build(`on flag { ${command} }`);
        assert.deepEqual(result.errors, []);
        result.vm.runtime.targets[1].blocks._blocks = result.blocks;
        const source = decompile(result.vm, 'Sprite1');
        assert.match(source, /\[menu\]/);
        const again = build(source);
        assert.deepEqual(again.errors, []);
        assertGraph(again.blocks);
    });
}

test('native custom blocks with shared prefixes and punctuation in parameters remain distinct', { skip }, async () => {
    const original = build('define first(n) warp { say(n) } define second(n) warp { say(n) } on flag { first(1) second(2) }');
    assert.deepEqual(original.errors, []);
    const names = new Map([['first %s', 'Angle to %s x'], ['second %s', 'Angle from %s y']]);
    for (const block of Object.values(original.blocks)) {
        if (block.mutation?.proccode) block.mutation.proccode = names.get(block.mutation.proccode) ?? block.mutation.proccode;
        if (block.opcode === 'procedures_prototype') block.mutation.argumentnames = '["load? now"]';
        if (block.opcode === 'argument_reporter_string_number') block.fields.VALUE.value = 'load? now';
    }
    original.vm.runtime.targets[1].blocks._blocks = original.blocks;
    const source = decompile(original.vm, 'Sprite1');
    assert.match(source, /Angle_to_x/);
    assert.match(source, /Angle_from_y/);
    assert.match(source, /\[load\? now\]/);
    assert.match(source, /warp/);
    const runtime = await run(source);
    assert.deepEqual(runtime.said, ['1', '2']);
});

test('distance and glide use Scratch VM opcodes and menu schemas', () => {
    const result = build('on flag { say(distanceTo("_mouse_")) glide(0, "_mouse_") }');
    assert.deepEqual(result.errors, []);
    const blocks = Object.values(result.blocks);
    assert.ok(blocks.some(b => b.opcode === 'sensing_distanceto'));
    assert.ok(blocks.some(b => b.opcode === 'sensing_distancetomenu'));
    assert.ok(blocks.some(b => b.opcode === 'motion_glideto'));
    assert.ok(blocks.some(b => b.opcode === 'motion_glideto_menu'));
});

for (const clear of ['true >= 0', 'false < 1', 'true = 1', 'false or true']) {
    test(`populateList accepts boolean expressions beginning with a literal: ${clear}`, { skip }, async () => {
        const runtime = await run(`on flag { listAdd("old", [L]) populateList([L], "new", 1, ${clear}) }`, { lists: ['L'] });
        assert.deepEqual(runtime.lists.L, ['new']);
    });
}

for (const ending of ['return', 'stopThis()', 'cancel r\n checkCancel()', 'deleteClone()']) {
    test(`scratchroutine lifecycle count is balanced after ${ending}`, { skip }, async () => {
        const runtime = await run(`scratchroutine r() { ${ending}\n } on flag { await r() say(isRunning("r")) }`);
        assert.deepEqual(runtime.said, ['false']);
        assert.equal(Number(runtime.vars.__sroutine_r_count), 0);
    });
}

test('separately compiled scratchroutine calls use declared parameter order', { skip }, async () => {
    const vm = makeMockVM();
    const first = build('scratchroutine r(z, a) { say(join([z], [a])) }', vm);
    assert.deepEqual(first.errors, []);
    vm.runtime.targets[1].blocks._blocks = first.blocks;
    const second = build('on flag { await r(5, 9) }', vm);
    assert.deepEqual(second.errors, []);
    second.compiled.targets[1].blocks = { ...first.blocks, ...second.blocks };
    const runtime = await runInScratchVM(second.compiled);
    assert.deepEqual(runtime.said, ['59']);
});

test('procedure parameters cannot be written even when a global has the same name', () => {
    const vm = makeMockVM({ vars: ['n'] });
    const result = compileSource('define f(n) { set [n] to 3 }', vm, 'Sprite1');
    assert.match(result.errors[0].message, /read-only/);
});

for (const ending of ['say(join([z], [a]))', 'cancel my_r\n checkCancel()', 'return']) {
    test(`scratchroutine parameters and exits survive decompilation: ${ending}`, { skip }, async () => {
        const first = build(`scratchroutine my_r(z, a) { change [z] by 1 ${ending}\n } on flag { await my_r(5, 9) say(isRunning("my_r")) }`);
        assert.deepEqual(first.errors, []);
        const expected = await runInScratchVM(first.compiled);
        first.vm.runtime.targets[1].blocks._blocks = first.blocks;
        const source = decompile(first.vm, 'Sprite1');
        assert.match(source, /scratchroutine my_r\(z, a\)/);
        const second = build(source);
        assert.deepEqual(second.errors, [], source);
        const actual = await runInScratchVM(second.compiled);
        assert.deepEqual(actual.said, expected.said);
        assert.equal(Number(actual.vars.__sroutine_my_r_count), 0);
    });
}

for (const param of ['count', 'cancelled']) {
    test(`scratchroutine lifecycle names are reserved: ${param}`, () => {
        const result = compileSource(`scratchroutine r(${param}) { say([${param}]) }`, makeMockVM(), 'Sprite1');
        assert.match(result.errors[0].message, /reserved/);
    });
}

test('deleteClone preserves following statements on original sprites and stops clones', { skip }, async () => {
    const runtime = await run('on flag { createClone() deleteClone() say("original") } on clone { say("clone") deleteClone() say("unreachable") }');
    assert.deepEqual(runtime.said.sort(), ['clone', 'original']);
});

test('native parameters are renamed when a scalar has the same name', { skip }, async () => {
    const first = build('define f(n) { set [actual] to 7 say(n) } on flag { f(3) }', makeMockVM({ vars: ['n', 'actual'] }), 'Sprite1', { optimize: false });
    assert.deepEqual(first.errors, []);
    const variable = Object.values(first.vm.runtime.targets[0].variables).find(variable => variable.name === 'n');
    const set = Object.values(first.blocks).find(block => block.opcode === 'data_setvariableto' && block.fields.VARIABLE.value === 'actual');
    set.fields.VARIABLE = { ...set.fields.VARIABLE, value: 'n', id: variable.id };
    const expected = await runInScratchVM(first.compiled);
    first.vm.runtime.targets[1].blocks._blocks = first.blocks;
    const source = decompile(first.vm, 'Sprite1');
    assert.match(source, /define f\(n_2\)/);
    const actual = await run(source, { vars: ['n'] });
    assert.deepEqual(actual.said, expected.said);
    assert.equal(Number(actual.vars.n), 7);
});

for (const [source, unreachable] of [
    ['on flag { forever { if true { break } } say("reachable") }', false],
    ['on flag { forever { repeat 1 { break } } say("unreachable") }', true],
    ['on flag { deleteClone() say("reachable") }', false],
]) {
    test(`linter respects conditional termination: ${source}`, () => {
        const parsed = parse(tokenize(source));
        assert.deepEqual(parsed.errors, []);
        assert.equal(lint(parsed.ast).some(diagnostic => diagnostic.message.includes('Unreachable')), unreachable);
    });
}
