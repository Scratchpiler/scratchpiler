import test from 'node:test';
import assert from 'node:assert/strict';

import { compileSource } from '../src/compiler.js';
import { compileSourceWithHeaders } from '../src/preprocess.js';
import { decompile } from '../src/decompiler.js';
import { writeHeader, deleteHeader } from '../src/headers.js';
import { formatComment, parseComment, scriptHash, writeComments, removeStaleComments, readComments } from '../src/metadata.js';
import { makeMockVM, provisionAndCompile } from './mock-vm.js';

const SPRITE = 'Sprite1';

function injected(source, { embedSource = false, compile = compileSourceWithHeaders, vars = [] } = {}) {
    const vm = makeMockVM({ vars });
    const result = provisionAndCompile((src, machine, sprite) => compile(src, machine, sprite, { embedSource }), source, vm, SPRITE);
    assert.deepEqual(result.errors, []);
    const target = vm.runtime.targets.find(t => !t.isStage && t.sprite.name === SPRITE);
    target.blocks._blocks = { ...result.blocks };
    writeComments(target, result.blocks, result.comments, {});
    return { vm, target, result };
}

const pull = ({ vm }) => decompile(vm, SPRITE);
const commentTexts = ({ target }) => Object.values(target.comments).map(comment => comment.text);

const SCRIPT = `// Walks right, then stops.
on flag {
   set [x]   to 5   // odd spacing, kept
   repeat 3 {
        change [x] by 1
   }
}`;
const HELPER = `// Helper with a doc comment.
define bump(amount) {
    change [x] by amount
}`;
const FORMATTED_BY_HAND = `${SCRIPT}\n\n${HELPER}`;

test('comment format: every entry survives a round trip', () => {
    const meta = { include: 'math.h', noinline: true, nounroll: true, origin: 'sort', src: { hash: 'abc123', text: 'on flag {\n\n    scratchpiler:noinline\n}' } };
    assert.deepEqual(parseComment(formatComment(meta)), meta);
    assert.deepEqual(parseComment(formatComment({ decls: 'enum { A = 1 }\n\nenum { B = 2 }' })), { decls: 'enum { A = 1 }\n\nenum { B = 2 }' });
});

test('comment format: unknown keys and ordinary comments are ignored', () => {
    assert.equal(parseComment('remember to fix this'), null);
    assert.deepEqual(parseComment('scratchpiler:future=1\nscratchpiler:noinline\nscratchpiler:origin=bogus'), { noinline: true });
    assert.deepEqual(parseComment('scratchpiler:include=../evil'), {});
});

test('comment format: the old header marker still parses', () => {
    assert.deepEqual(parseComment('scratchpiler:include=math-utils.h'), { include: 'math-utils.h' });
});

test('script hash ignores ids and positions but notices edits', () => {
    const source = 'on flag {\n    set [x] to 5\n}';
    const first = injected(source);
    const second = injected(source);
    const [a, b] = [first, second].map(({ result }) => Object.values(result.blocks).find(block => block.topLevel));
    assert.notEqual(a.id, b.id);
    assert.equal(scriptHash(a.id, first.result.blocks), scriptHash(b.id, second.result.blocks));
    b.x += 500;
    assert.equal(scriptHash(a.id, first.result.blocks), scriptHash(b.id, second.result.blocks));
    const literal = Object.values(second.result.blocks).find(block => block.fields?.TEXT?.value === '5' || block.fields?.NUM?.value === '5');
    Object.values(literal.fields)[0].value = '6';
    assert.notEqual(scriptHash(a.id, first.result.blocks), scriptHash(b.id, second.result.blocks));
});

test('embedded source comes back verbatim, comments and spacing included', () => {
    const project = injected(FORMATTED_BY_HAND, { embedSource: true });
    assert.equal(pull(project), `${HELPER}\n\n${SCRIPT}\n`);
});

test('without embedding the pull is canonical and comments are gone', () => {
    const project = injected(FORMATTED_BY_HAND);
    assert.ok(commentTexts(project).every(text => !text.includes('scratchpiler:src')));
    const text = pull(project);
    assert.doesNotMatch(text, /odd spacing/);
    assert.match(text, /set \[x\] to "?5"?/);
});

test('an edit made in Scratch invalidates only that script', () => {
    const project = injected(FORMATTED_BY_HAND, { embedSource: true });
    const edited = Object.values(project.target.blocks._blocks)
        .find(block => block.opcode === 'data_changevariableby' && block.inputs.VALUE.block !== null && project.target.blocks._blocks[block.inputs.VALUE.shadow]?.fields?.NUM?.value === '1');
    project.target.blocks._blocks[edited.inputs.VALUE.shadow].fields.NUM.value = '2';
    const text = pull(project);
    assert.doesNotMatch(text, /Walks right, then stops/);
    assert.match(text, /change \[x\] by 2/);
    assert.match(text, /\/\/ Helper with a doc comment\.\ndefine bump\(amount\) \{/);
});

test('enum declarations ride along and the pulled source recompiles', () => {
    const source = 'enum { RED = 1, GREEN = 2 }\n\non flag {\n    set [color] to GREEN\n}';
    const project = injected(source, { embedSource: true });
    const text = pull(project);
    assert.match(text, /^enum \{ RED = 1, GREEN = 2 \}\n\non flag \{\n    set \[color\] to GREEN\n\}\n$/);
    assert.deepEqual(provisionAndCompile(compileSource, text, makeMockVM(), SPRITE).errors, []);
});

test('scripts that come from headers are not embedded', () => {
    writeHeader('meta-test.h', 'define fromHeader() {\n    change [x] by 1\n}\n');
    try {
        const source = '#include <meta-test.h>\n\non flag {\n    fromHeader()\n}';
        const project = injected(source, { embedSource: true, vars: ['x'] });
        const sources = commentTexts(project).filter(text => text.includes('scratchpiler:src'));
        assert.equal(sources.length, 1);
        assert.doesNotMatch(sources[0], /fromHeader\(\) \{/);
    } finally {
        deleteHeader('meta-test.h');
    }
});

test('noinline and nounroll round trip through comments', () => {
    const source = [
        'define plain(a) noinline {\n    change [x] by a\n}',
        'define scheduled(a) warp noinline {\n    change [x] by a\n}',
        'define value(a) returns noinline {\n    return a\n}',
        'on flag {\n    repeat 3 nounroll {\n        change [x] by 1\n    }\n    for [i] from 1 to 3 nounroll {\n        change [x] by [i]\n    }\n}',
    ].join('\n\n');
    const text = pull(injected(source));
    assert.match(text, /define plain\(a\) noinline \{/);
    assert.match(text, /define scheduled\(a\) warp noinline \{/);
    assert.match(text, /define value\(a\) returns noinline \{/);
    assert.match(text, /repeat 3 nounroll \{/);
    assert.match(text, /for \[i\] from "?1"? to "?3"? nounroll \{/);
});

test('hints are absent when the source does not ask for them', () => {
    const text = pull(injected('define plain(a) {\n    change [x] by a\n}\n\non flag {\n    repeat 3 {\n        change [x] by 1\n    }\n}'));
    assert.doesNotMatch(text, /noinline|nounroll/);
});

function renameHiddenVariables(blocks) {
    const names = new Map();
    for (const block of Object.values(blocks)) {
        const field = block.fields?.VARIABLE;
        if (!field?.value.startsWith('_scratchpiler_internal_')) continue;
        if (!names.has(field.value)) names.set(field.value, `Gib${names.size}x`);
        field.value = names.get(field.value);
    }
}

const ORIGIN_CASES = {
    for: ['on flag {\n    for [i] from 1 to 3 {\n        change [x] by [i]\n    }\n}', /for \[Gib\d+x\] from "?1"? to "?3"? \{/],
    pyfor: ['on flag {\n    pyfor [item] in [stuff] {\n        change [x] by [item]\n    }\n}', /pyfor \[Gib\d+x\] in \[stuff\] \{/],
    sort: ['on flag {\n    [stuff].sort()\n}', /\[stuff\]\.sort\(\)/],
};

for (const [origin, [source, expected]] of Object.entries(ORIGIN_CASES)) {
    test(`${origin}: the origin marker survives renamed hidden variables`, () => {
        const project = injected(source);
        assert.ok(commentTexts(project).includes(`scratchpiler:origin=${origin}`));
        renameHiddenVariables(project.target.blocks._blocks);
        assert.match(pull(project), expected);
    });

    test(`${origin}: renamed hidden variables are not recognised without the marker`, () => {
        const project = injected(source);
        renameHiddenVariables(project.target.blocks._blocks);
        project.target.comments = {};
        assert.doesNotMatch(pull(project), expected);
    });
}

test('writeComments merges a header marker into the compiler comment for the same block', () => {
    const project = injected('define shared() noinline {\n    change [x] by 1\n}');
    const definition = Object.values(project.target.blocks._blocks).find(block => block.opcode === 'procedures_definition');
    project.target.comments = {};
    writeComments(project.target, project.target.blocks._blocks, project.result.comments, { [definition.id]: 'shared.h' });
    const comments = Object.values(project.target.comments);
    assert.equal(comments.length, 1);
    assert.deepEqual(parseComment(comments[0].text), { include: 'shared.h', noinline: true });
    assert.equal(project.target.blocks._blocks[definition.id].comment, comments[0].id);
});

test('stale comments go, other comments stay', () => {
    const project = injected('define shared() noinline {\n    change [x] by 1\n}', { embedSource: true });
    const { target } = project;
    target.comments.mine = { id: 'mine', blockId: null, text: 'a note from the user' };
    target.comments.orphan = { id: 'orphan', blockId: 'gone', text: 'scratchpiler:noinline' };
    const definition = Object.values(target.blocks._blocks).find(block => block.opcode === 'procedures_definition');
    removeStaleComments(target, new Set([definition.id]));
    assert.deepEqual(Object.keys(target.comments), ['mine']);
});

test('readComments finds the declarations comment and per-block metadata', () => {
    const project = injected('enum { A = 1 }\n\ndefine shared() noinline {\n    change [x] by A\n}', { embedSource: true });
    const { byBlock, decls } = readComments(project.target);
    assert.equal(decls, 'enum { A = 1 }');
    assert.equal([...byBlock.values()].filter(meta => meta.noinline).length, 1);
});
