import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tokenize, parse, compileSource } from '../src/compiler.js';
import { decompile } from '../src/decompiler.js';
import { makeMockVM } from './mock-vm.js';
import { execute, haveVM } from './backend-harness.js';

test('populateList / populateArray parse as the documented statement, not a custom block call', () => {
    for (const name of ['populateList', 'populateArray']) {
        const { ast, errors } = parse(tokenize(`on flag {\n    ${name}([L], 0, 3, true)\n}\n`));
        assert.deepEqual(errors, []);
        assert.equal(ast.blocks[0].body[0].type, 'PopulateListStmt');
    }
    const { errors, blocks } = compileSource('on flag {\n    populateList([L], 7, 3, true)\n}\n', makeMockVM({ lists: ['L'] }), 'Sprite1');
    assert.deepEqual(errors, []);
    assert.ok(Object.values(blocks).some((b) => b.opcode === 'data_addtolist'));
});

test('pyfor and sort decompile back to their source forms', () => {
    const vm = makeMockVM({ vars: ['x'], lists: ['stuff'] });
    const { errors, blocks } = compileSource('on flag {\n    pyfor [item] in [stuff] {\n        change [x] by 1\n    }\n    [stuff].sort("desc")\n}\n', vm, 'Sprite1');
    assert.deepEqual(errors, []);
    vm.runtime.targets[1].blocks._blocks = blocks;
    const text = decompile(vm, 'Sprite1');
    assert.match(text, /pyfor \[item\] in \[stuff\] \{/);
    assert.match(text, /\[stuff\]\.sort\("desc"\)/);
});

test('the new modifier keywords are lexed as keywords', async () => {
    const { KEYWORDS } = await import('../src/constants.js');
    for (const word of ['noinline', 'nounroll', 'warp', 'returns']) assert.ok(KEYWORDS.includes(word), word);
    const tokens = tokenize('define f() noinline { repeat 2 nounroll { } }');
    assert.deepEqual(tokens.filter(t => ['noinline', 'nounroll'].includes(t.value)).map(t => t.type), ['noinline', 'nounroll']);
});

for (const [label, promote] of [['a promoted variable', true], ['a plain variable', false]]) {
    test(`change reads ${label} after its amount has run, like Scratch`, { skip: !haveVM && 'scratch-vm is not installed' }, async () => {
        const source = `define bump() returns {\n    change [b] by 1\n    return 1\n}\n\non flag {\n    set [b] to 5\n${promote ? '    set [p] to &[b]\n' : ''}    change [b] by bump()\n    say([b])\n}\n`;
        const { runtime, errors } = await execute(source, { maxFrames: 50 }, { vars: ['b', 'p'] });
        assert.deepEqual(errors, []);
        assert.deepEqual(runtime.said, ['7']);
    });
}
