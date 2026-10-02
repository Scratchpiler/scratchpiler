import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createProvider } from './provider-harness.js';
import { tokenize, parse, CALL_SIGS } from '../src/compiler.js';

let complete, setProject;
before(async () => { ({ complete, setProject } = await createProvider()); });

const CAT = { name: 'Cat', costumes: ['cat-a', 'cat-b'], sounds: ['meow'] };
beforeEach(() => setProject({
    sprites: [CAT, { name: 'Dog', costumes: [], sounds: [] }],
    backdrops: ['sky'],
    globalVariables: [{ name: 'score', type: 'var' }, { name: 'xs', type: 'list' }, { name: 'p.x', type: 'var' }],
    spriteVariables: { Cat: [{ name: 'hp', type: 'var' }] },
    customBlocks: { Cat: ['jump %s %b', 'spin'] },
    active: 'Cat',
}));

const labels = text => complete(text).items.map(i => i.label);
const inserts = (text, opts) => complete(text, opts).items.map(i => i.insertText);

test('typing < pops nothing open, but a manual trigger after a comparison still completes', () => {
    assert.deepEqual(complete('if [a] <', { triggerCharacter: '<' }).items, []);
    assert.ok(complete('if [a] < ').items.length > 0);
    assert.ok(complete('if [a] > ', { triggerCharacter: '>' }).items.length > 0);
});

test('general list does not insert bare sprite, backdrop, costume or sound names', () => {
    const { items } = complete('on flag {\n  ');
    for (const name of ['Cat', 'Dog', 'sky', 'cat-a', 'cat-b', 'meow']) {
        assert.ok(!items.some(i => i.insertText === name), `${name} should only be offered inside a string`);
    }
});

test('project custom blocks complete as calls and are not duplicated by in-file defines', () => {
    assert.ok(labels('on flag {\n  ').includes('jump(arg1, arg2)'));
    assert.ok(inserts('on flag {\n  ').includes('jump(${1:arg1}, ${2:arg2})'));
    assert.ok(labels('on flag {\n  ').includes('spin()'));

    const withDefine = labels('define jump(a, b) {\n}\non flag {\n  ');
    assert.equal(withDefine.filter(l => l.startsWith('jump(')).length, 1);
});

test('member access after anything but a list or pen offers nothing', () => {
    assert.deepEqual(labels('foo.'), []);
    assert.deepEqual(labels('pen.down().'), []);
    assert.deepEqual(labels('say(abs(1).'), []);
});

test('struct fields: unknown structs fall back to project variables, comments are ignored', () => {
    assert.deepEqual(labels('say([p.'), ['p.x]']);
    assert.deepEqual(labels('say([nope.'), []);
    assert.deepEqual(labels('struct q { a, // horizontal\n  b c }\nsay([q.'), ['q.a]', 'q.b]', 'q.c]']);
    assert.deepEqual(labels('struct q {\n  a\n  b\n}\nsay([q.'), ['q.a]', 'q.b]']);
});

test('struct fields also list in plain [ completion', () => {
    const l = labels('struct q { a, // c\n b }\nset [');
    assert.ok(l.includes('q.a]') && l.includes('q.b]'));
    assert.ok(!l.some(x => x.includes('//')));
});

test('list methods include the aggregates the compiler supports', () => {
    const l = labels('[xs].');
    for (const m of ['sum()', 'min()', 'max()', 'count(value)']) assert.ok(l.includes(m), m);
});

test('string slots offer the right targets per call', () => {
    const at = text => complete(text).items.map(i => i.label);
    assert.deepEqual(at('goTo("'), ['_mouse_', '_random_', 'Cat', 'Dog']);
    assert.deepEqual(at('pointTowards("'), ['_mouse_', '_random_', 'Cat', 'Dog']);
    assert.deepEqual(at('distanceTo("'), ['_mouse_', 'Cat', 'Dog']);
    for (const fn of ['xOf', 'yOf', 'directionOf', 'sizeOf', 'costumeNumOf', 'costumeNameOf', 'volumeOf']) {
        assert.deepEqual(at(`${fn}("`), ['_stage_', 'Cat', 'Dog'], fn);
    }
    assert.ok(at('key("').includes('any'));
    assert.ok(at('on key "').includes('any'));
    assert.deepEqual(at('switchBackdrop("'), ['sky']);
});

test('variables and fields complete inside string interpolation', () => {
    assert.ok(labels('say("score: {[').includes('score]'));
    assert.ok(labels('say("score: {[').includes('hp]'));
    assert.deepEqual(labels('say("at {[p.'), ['p.x]']);
    assert.ok(labels('say("len {[xs].').includes('length()'));
    assert.deepEqual(labels('say("a {{[').length, 0, 'escaped braces are plain text');
    assert.ok(labels('say("a {play("').length === 0, 'no sounds on this sprite');
});

test('string completion range inside an interpolated nested string starts after its quote', () => {
    const { items, position } = complete('say("a {goTo("');
    assert.equal(items[0].range.startColumn, 15);
    assert.equal(items[0].range.endColumn, position.column);
});

test('argument lists spanning lines resolve their slot', () => {
    assert.deepEqual(labels('glide(1,\n  "'), ['_mouse_', '_random_', 'Cat', 'Dog']);
    assert.deepEqual(labels('say(1)\ntouching(\n  "'), ['_edge_', '_mouse_', 'Cat', 'Dog']);
    assert.deepEqual(labels('glide(1,\n  2,\n  "'), [], 'third argument has no menu');
    assert.deepEqual(labels('move(1)\n  "'), [], 'no enclosing call');
    assert.deepEqual(labels('on flag {\n  say(1)\n  "'), []);
});

test('every suggested call is a known statement, and every known call is suggested', () => {
    const items = complete('on flag {\n  ').items;
    const suggested = new Set(items.map(i => /^([A-Za-z_]\w*)\(/.exec(i.insertText)?.[1]).filter(Boolean));
    const notBuiltin = [...suggested].filter(n => !(n in CALL_SIGS) && !['jump', 'spin'].includes(n));
    assert.deepEqual(notBuiltin, []);

    const keywordForms = ['pyfor', 'scratchroutine', 'launch', 'await', 'cancel', 'isRunning', 'checkCancel'];
    const unsuggested = Object.keys(CALL_SIGS).filter(n => !suggested.has(n) && !keywordForms.includes(n));
    assert.deepEqual(unsuggested, []);
});

test('every call snippet parses cleanly', () => {
    const bad = [];
    for (const item of complete('on flag {\n  ').items) {
        if (!/^[A-Za-z_][\w.]*\(.*\)$/.test(item.insertText)) continue;
        const text = item.insertText
            .replace(/\$\{\d+\|([^,}|]+)[^}]*\}/g, '$1')
            .replace(/\$\{\d+:([^}]*)\}/g, '1')
            .replace(/\$\d+/g, '1')
            .replace('#1', '#112233');
        const parses = body => parse(tokenize(`on flag {\n${body}\n}`, { quiet: true })).errors.length === 0;
        if (!parses(text) && !parses(`say(${text})`)) bad.push(`${item.label} -> ${text}`);
    }
    assert.deepEqual(bad, []);
});
