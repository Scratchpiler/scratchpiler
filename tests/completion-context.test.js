import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completionContext } from '../src/completion-context.js';

const ctx = prefix => completionContext(prefix);

test('line comments, including after code and quotes inside', () => {
    assert.equal(ctx('// hello').kind, 'comment');
    assert.equal(ctx('say("a") // "x').kind, 'comment');
    assert.equal(ctx('say("//") ').kind, 'general');
});

test('string slots resolve by callee and argument index', () => {
    assert.deepEqual(ctx('play("'), { kind: 'string', quoteCol: 6, slot: 'sounds' });
    assert.equal(ctx('goTo("').slot, 'targets');
    assert.equal(ctx('glide(2, "').slot, 'targets');
    assert.equal(ctx('glide("').slot, null);
    assert.equal(ctx('setEffect("co').slot, 'effects');
    assert.equal(ctx('if touching("').slot, 'touchTargets');
    assert.equal(ctx('say(join("a", "').slot, null);
    assert.equal(ctx('on receive "').slot, 'broadcasts');
    assert.equal(ctx('on key "sp').slot, 'keys');
    assert.equal(ctx('[list].sort("').slot, 'sortDirections');
    assert.equal(ctx('pen.setColorParam("').slot, 'penParams');
});

test('nested calls do not leak the outer callee', () => {
    assert.equal(ctx('broadcast(join(1, 2), "').slot, null);
    assert.equal(ctx('say(abs(1)) play("').slot, 'sounds');
});

test('closed strings are not string context', () => {
    assert.equal(ctx('play("boing") ').kind, 'general');
});

test('bracket contexts', () => {
    assert.equal(ctx('set [').kind, 'varName');
    assert.equal(ctx('set [sco').kind, 'varName');
    assert.deepEqual(ctx('say([player.'), { kind: 'structField', struct: 'player' });
    assert.equal(ctx('say([player.x').kind, 'structField');
    assert.equal(ctx('[score].').kind, 'listMethod');
    assert.equal(ctx('[score].le').kind, 'listMethod');
    assert.equal(ctx('[score]').kind, 'general');
});

test('dot namespaces', () => {
    assert.equal(ctx('pen.').kind, 'penMethod');
    assert.equal(ctx('pen.se').kind, 'penMethod');
    assert.equal(ctx('foo.').kind, 'general');
});

test('include and scratchroutine statements', () => {
    assert.equal(ctx('#include <').kind, 'include');
    assert.equal(ctx('#include <my-ut').kind, 'include');
    assert.deepEqual(ctx('launch '), { kind: 'routine', withCall: true });
    assert.deepEqual(ctx('await an'), { kind: 'routine', withCall: true });
    assert.deepEqual(ctx('cancel '), { kind: 'routine', withCall: false });
    assert.deepEqual(ctx('if isRunning('), { kind: 'routine', withCall: false });
    assert.equal(ctx('launch').kind, 'general');
});

test('hat and operator hints', () => {
    assert.equal(ctx('on ').onCol, 1);
    assert.equal(ctx('    on fl').onCol, 5);
    assert.equal(ctx('if [a] <').afterLt, true);
    assert.equal(ctx('if [a] < m').afterLt, true);
    assert.equal(ctx('move(').afterLt, false);
});

test('garbage input never throws', () => {
    assert.equal(ctx('@@ $ `').kind, 'general');
    assert.equal(ctx('').kind, 'general');
});
