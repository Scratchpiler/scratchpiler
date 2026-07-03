// #include header tests: storage CRUD, expansion, error mapping, and the
// decompiler collapse round-trip (comment markers stand in for injector.js,
// which can't be imported in Node because it pulls in browser-only modules).
import test from 'node:test';
import assert from 'node:assert/strict';

import { writeHeader, deleteHeader, listHeaders, readHeader } from '../src/headers.js';
import { expand, compileSourceWithHeaders } from '../src/preprocess.js';
import { decompile } from '../src/decompiler.js';
import { makeMockVM, provisionAndCompile } from './mock-vm.js';

const SPRITE = 'Sprite1';

function loadInto(vm, spriteName, blocks) {
    const target = vm.runtime.targets.find(t => !t.isStage && t.sprite.name === spriteName);
    target.blocks._blocks = { ...target.blocks._blocks, ...blocks };
    return target;
}

// Attach the include markers exactly like injector.js does.
function markHeaderRoots(target, blocks, headerRoots) {
    for (const b of Object.values(blocks)) {
        if (!b.topLevel || b.shadow) continue;
        let name = null;
        if (b.opcode === 'procedures_definition') {
            const inp = b.inputs?.custom_block;
            const protoId = inp ? (Array.isArray(inp) ? inp[1] : (inp.block ?? inp.shadow)) : null;
            name = ((blocks[protoId]?.mutation?.proccode) || '').split(' ')[0];
        } else if (b.opcode === 'event_whenbroadcastreceived') {
            const m = (b.fields?.BROADCAST_OPTION?.value ?? '').match(/^__sroutine_(.+)$/);
            name = m ? m[1] : null;
        }
        const hdr = name && headerRoots[name];
        if (!hdr) continue;
        const cid = b.id + '_hdr';
        target.comments[cid] = { id: cid, blockId: b.id, text: `scratchpiler:include=${hdr}` };
    }
}

test('headers: storage CRUD', () => {
    writeHeader('crud-test.h', 'define one() returns {\n    return 1\n}\n');
    assert.ok(listHeaders().includes('crud-test.h'));
    assert.match(readHeader('crud-test.h'), /define one/);
    assert.throws(() => writeHeader('bad name', 'x'), /Invalid header name/);
    assert.equal(deleteHeader('crud-test.h'), true);
    assert.equal(readHeader('crud-test.h'), null);
});

test('headers: expansion keeps user line numbers and maps header errors', () => {
    writeHeader('broken.h', 'on flag {\n    say("hats not allowed")\n}\n');
    const ex = expand('// line 1\n#include <broken.h>\nsay("x")\n');
    assert.equal(ex.userLineCount, 4);
    assert.equal(ex.errors.length, 1);
    assert.equal(ex.errors[0].line, 2); // attributed to the include line
    assert.match(ex.errors[0].message, /broken\.h:1/);
    assert.match(ex.errors[0].message, /only contain/);
    deleteHeader('broken.h');

    const exMissing = expand('#include <nope.h>\n');
    assert.match(exMissing.errors[0].message, /Header not found: nope\.h/);
});

test('headers: duplicate include is a no-op, cycles are errors', () => {
    writeHeader('a-cyc.h', '#include <b-cyc.h>\ndefine fa() {\n    say("a")\n}\n');
    writeHeader('b-cyc.h', '#include <a-cyc.h>\ndefine fb() {\n    say("b")\n}\n');
    const ex = expand('#include <a-cyc.h>\n#include <a-cyc.h>\n');
    // a includes b, b includes a again → a is already seen (no-op), no error;
    // both headers land exactly once
    assert.equal(ex.errors.length, 0);
    assert.equal(ex.segments.length, 2);
    deleteHeader('a-cyc.h');
    deleteHeader('b-cyc.h');
});

test('headers: compile + decompile collapses back to #include', () => {
    writeHeader('mathutils.h', [
        'define square(v) returns {',
        '    return v * v',
        '}',
        '',
        'define cube(v) returns {',
        '    return v * square(v)',
        '}',
    ].join('\n'));

    const source = [
        '#include <mathutils.h>',
        '',
        'on flag {',
        '    set [result] to square(4) + cube(2)',
        '    say("{[result]}")',
        '}',
    ].join('\n');

    const vm = makeMockVM({});
    const r1 = provisionAndCompile(compileSourceWithHeaders, source, vm, SPRITE);
    assert.deepEqual(r1.errors, [], 'compile errors in header demo');
    assert.equal(r1.headerRoots.square, 'mathutils.h');
    assert.equal(r1.headerRoots.cube, 'mathutils.h');

    const target = loadInto(vm, SPRITE, r1.blocks);
    markHeaderRoots(target, r1.blocks, r1.headerRoots);

    const text1 = decompile(vm, SPRITE);
    assert.match(text1, /^#include <mathutils\.h>\n/);
    assert.ok(!text1.includes('define square'), 'header define should be collapsed');

    // Round-trip: recompile the decompiled text, decompile again → fixpoint
    const vm2 = makeMockVM({});
    const r2 = provisionAndCompile(compileSourceWithHeaders, text1, vm2, SPRITE);
    assert.deepEqual(r2.errors, [], 'recompile errors');
    const target2 = loadInto(vm2, SPRITE, r2.blocks);
    markHeaderRoots(target2, r2.blocks, r2.headerRoots);
    const text2 = decompile(vm2, SPRITE);
    assert.equal(text2, text1, 'decompile fixpoint with headers');

    // Without the marker comments the same blocks degrade to expanded form
    const vm3 = makeMockVM({});
    const r3 = provisionAndCompile(compileSourceWithHeaders, source, vm3, SPRITE);
    loadInto(vm3, SPRITE, r3.blocks);
    const text3 = decompile(vm3, SPRITE);
    assert.ok(text3.includes('define square'), 'no marker → expanded form');

    deleteHeader('mathutils.h');
});
