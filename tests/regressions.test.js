import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tokenize, parse, compileSource } from '../src/compiler.js';
import { makeMockVM } from './mock-vm.js';

test('populateList / populateArray parse as the documented statement, not a custom block call', () => {
    for (const name of ['populateList', 'populateArray']) {
        const { ast, errors } = parse(tokenize(`on flag {\n    ${name}([L], 0, 3, true)\n}\n`));
        assert.deepEqual(errors, []);
        assert.equal(ast.blocks[0].body[0].type, 'PopulateListStmt');
    }
    for (const backend of ['classic', 'slvm']) {
        const { errors, blocks } = compileSource('on flag {\n    populateList([L], 7, 3, true)\n}\n', makeMockVM({ lists: ['L'] }), 'Sprite1', { backend });
        assert.deepEqual(errors, [], backend);
        assert.ok(Object.values(blocks).some((b) => b.opcode === 'data_addtolist'), backend);
    }
});
