import test from 'node:test';
import assert from 'node:assert/strict';

import { build, execute, haveVM } from './backend-harness.js';
import { makeMockVM } from './mock-vm.js';

const vars = () => makeMockVM({ vars: ['out', 'x'], lists: ['L'] });
const opcodes = ({ blocks }, opcode) => Object.values(blocks).filter(block => block.opcode === opcode).length;
const loops = result => ({ repeat: opcodes(result, 'control_repeat'), until: opcodes(result, 'control_repeat_until') });
const calls = result => opcodes(result, 'procedures_call');
const sets = result => opcodes(result, 'data_setvariableto');

const RUNTIME = { skip: !haveVM && 'scratch-vm is not installed' };

const countedLoop = 'define w() warp {\n    for [i] from 1 to 30 {\n        change [out] by 2\n    }\n}\n\non flag {\n    w()\n}';
const listLoop = 'define w() warp {\n    for [i] from 0 to [L].length() - 1 {\n        change [out] by 2\n    }\n}\n\non flag {\n    w()\n}';

test('a for loop that ignores its iterator and has a literal or list-length bound becomes a repeat', () => {
    for (const source of [countedLoop, listLoop]) {
        const result = build(source, vars());
        assert.deepEqual(result.errors, []);
        assert.equal(result.optimizerFallback, null);
        assert.deepEqual(loops(result), { repeat: 1, until: 0 });
    }
});

test('the iterator, a variable bound, or a bound the body can change keeps the for loop', () => {
    const wrap = body => `define w() warp {\n${body}\n}\n\non flag {\n    w()\n}`;
    assert.deepEqual(loops(build(wrap('    for [i] from 1 to 30 {\n        change [out] by [i]\n    }'), vars())), { repeat: 0, until: 1 });
    assert.deepEqual(loops(build(wrap('    for [i] from 1 to [x] {\n        change [out] by 2\n    }'), vars())), { repeat: 0, until: 1 });
    assert.deepEqual(loops(build(wrap('    for [i] from 0 to [L].length() - 1 {\n        listAdd(1, [L])\n    }'), vars())), { repeat: 0, until: 1 });
});

test('optimize: false keeps the for loop', () => {
    assert.deepEqual(loops(build(countedLoop, vars(), undefined, { optimize: false })), { repeat: 0, until: 1 });
});

test('a call to a custom block that only computes is dropped when its result is unused', () => {
    const used = 'define sq(n) noinline returns {\n    return n * n\n}\n\non flag {\n    set [x] to sq(3)\n    set [x] to 1\n}';
    const result = build(used, vars());
    assert.deepEqual(result.errors, []);
    assert.equal(calls(result), 0);
    const writes = 'define bump() noinline returns {\n    change [out] by 1\n    return 1\n}\n\non flag {\n    set [x] to bump()\n    set [x] to 1\n}';
    assert.equal(calls(build(writes, vars())), 1, 'a call that writes stays');
});

test('stores nobody can see are dropped and known values are forwarded', () => {
    const result = build('on flag {\n    set [x] to 1\n    set [x] to 2\n    set [out] to 0\n    change [out] by 5\n    change [out] by 6\n}', vars());
    assert.deepEqual(result.errors, []);
    assert.equal(sets(result), 2);
    assert.equal(opcodes(result, 'data_changevariableby'), 0);
});

test('the optimized programs compute what the source says', RUNTIME, async () => {
    const source = [
        'define sq(n) noinline returns {',
        '    return n * n',
        '}',
        '',
        'define w() warp {',
        '    for [i] from 1 to 30 {',
        '        change [out] by 2',
        '    }',
        '    for [j] from 0 to [L].length() - 1 {',
        '        change [out] by 100',
        '    }',
        '    for [k] from 5 to 4 {',
        '        change [out] by 100000',
        '    }',
        '}',
        '',
        'on flag {',
        '    listAdd(7, [L])',
        '    listAdd(8, [L])',
        '    listAdd(9, [L])',
        '    set [out] to 0',
        '    set [x] to sq(3)',
        '    set [x] to 1',
        '    w()',
        '    set [out] to 0 + [out]',
        '    change [out] by [x]',
        '    say([out])',
        '}',
    ].join('\n');
    for (const optimize of [true, false]) {
        const { runtime, errors } = await execute(source, { maxFrames: 50 }, { vars: ['out', 'x'], lists: ['L'] }, { optimize });
        assert.deepEqual(errors, []);
        assert.deepEqual(runtime.said, ['361'], `optimize: ${optimize}`);
    }
});
