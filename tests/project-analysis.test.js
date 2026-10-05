import test from 'node:test';
import assert from 'node:assert/strict';

import { setScratchIndex } from '../src/scratch-index.js';
import {
    createProject, setProjectIndex, setProjectFile, linkedProject, diagnosticsFor, projectSymbolAt,
    messageSites, variableSites, renameEdits, eventGraph, projectSymbols, slvmFacts, describeVariable, varKey, STAGE,
} from '../src/project-analysis.js';

const variable = (name, type = 'variable') => ({ name, id: `id-${name}`, type });

function projectOf(files, { globals = [], locals = {}, monitored } = {}) {
    const index = {
        sprites: Object.keys(files).filter(n => n !== STAGE).map(name => ({ name, costumes: [], sounds: [] })),
        stage: { backdrops: [], sounds: [] },
        globalVariables: globals.map(g => Array.isArray(g) ? variable(...g) : variable(g)),
        spriteVariables: Object.fromEntries(Object.keys(files).filter(n => n !== STAGE).map(n => [n, (locals[n] || []).map(l => Array.isArray(l) ? variable(...l) : variable(l))])),
        customBlocks: {},
    };
    setScratchIndex(index);
    const project = createProject();
    setProjectIndex(project, index);
    for (const [name, text] of Object.entries({ [STAGE]: '', ...files })) setProjectFile(project, name, text, index);
    return linkedProject(project, monitored ? { monitored } : {});
}

const messages = (linked, sprite) => diagnosticsFor(linked, sprite).map(d => `${d.line}:${d.col} ${d.message}`);

test('broadcasts are linked across sprites, ignoring case like Scratch does', () => {
    const linked = projectOf({
        Player: 'on flag {\n    broadcast("Start Game")\n    broadcast("typo")\n}',
        Enemy: 'on receive "start game" {\n    say("go")\n}\n\non receive "never" {\n    say("no")\n}',
    });
    assert.deepEqual(messages(linked, 'Player'), ['3:15 Nothing receives "typo"']);
    assert.deepEqual(messages(linked, 'Enemy'), ['5:12 Never runs — nothing broadcasts "never"']);
    const { senders, receivers } = messageSites(linked, 'START GAME');
    assert.deepEqual(senders.map(s => s.sprite), ['Player']);
    assert.deepEqual(receivers.map(r => r.sprite), ['Enemy']);
});

test('a computed broadcast keeps receivers from being called dead', () => {
    const linked = projectOf({ Player: 'on flag {\n    broadcast(join("lev", "el"))\n}\n\non receive "level" {\n    say(1)\n}' });
    assert.deepEqual(messages(linked, 'Player'), []);
});

test('clone hats, sprite names and attributeOf are checked against the project', () => {
    const linked = projectOf({
        Player: 'on flag {\n    createClone("Enemy")\n    goTo("Ghost")\n    say(attributeOf("hp", "Enemy"))\n    say(attributeOf("x position", "Enemy"))\n}\n\non clone {\n    say(1)\n}',
        Enemy: 'on clone {\n    say([hp])\n}',
    }, { locals: { Enemy: ['hp'] } });
    assert.deepEqual(messages(linked, 'Player').sort(), [
        '3:10 No sprite named "Ghost"',
        '4:21 `[hp]` is never set — it keeps its saved value',
        '8:4 Never runs — nothing clones this sprite',
    ]);
    assert.deepEqual(messages(linked, 'Enemy'), ['2:9 `[hp]` is never set — it keeps its saved value']);
    assert.deepEqual(describeVariable(linked, varKey('Enemy', 'variable', 'hp')), { writes: null, reads: 'Player, Enemy' });
});

test('dead variables: never used, never read, never set; monitors and cloud variables are exempt', () => {
    const linked = projectOf({
        Player: 'on flag {\n    set [written] to 1\n    say([constant])\n    listAdd(1, [log])\n}',
    }, { globals: ['written', 'constant', 'unused', 'shown', '☁ cloud', ['log', 'list']], monitored: new Set([varKey(STAGE, 'variable', 'shown')]) });
    assert.deepEqual(messages(linked, 'Player'), [
        '2:9 `[written]` is never read',
        '3:9 `[constant]` is never set — it keeps its saved value',
        '4:16 `[log]` is never read',
    ]);
    assert.deepEqual(linked.diagnostics.project.map(p => p.message), ['`[unused]` is never used']);
});

test('green-flag ordering: a read before another script sets it, and conflicting final values', () => {
    const linked = projectOf({
        Player: 'on flag {\n    goTo([startX], 0)\n    set [mode] to "a"\n}',
        Stage2: 'on flag {\n    set [startX] to 10\n    set [mode] to "b"\n}',
        Same1: 'on flag {\n    set [volume] to 250\n    set [volume] to 300\n}',
        Same2: 'on flag {\n    set [volume] to 250\n    set [volume] to 300\n}',
    }, { globals: ['startX', 'mode', 'volume'] });
    assert.deepEqual(messages(linked, 'Player').filter(m => !m.includes('never read')), [
        '2:10 May read `[startX]` before Stage2 sets it on green flag',
        '3:9 `[mode]` is also set by Stage2 on green flag — the order decides',
    ]);
    assert.ok([...messages(linked, 'Same1'), ...messages(linked, 'Same2')].every(m => !m.includes('order decides')), 'scripts that end on the same value do not conflict');
});

test('messages broadcast every frame are not treated as one-shot triggers', () => {
    const linked = projectOf({
        Loop: 'on flag {\n    forever {\n        broadcast("tick")\n    }\n}',
        A: 'on receive "tick" {\n    set [x] to [y]\n}',
        B: 'on receive "tick" {\n    set [y] to 1\n    set [x] to 2\n}',
    }, { globals: ['x', 'y'] });
    assert.deepEqual([...messages(linked, 'A'), ...messages(linked, 'B')].filter(m => /May read|order decides/.test(m)), []);
});

test('broadcast-and-wait cycles are reported where they wait', () => {
    const linked = projectOf({
        A: 'on receive "ping" {\n    broadcastAndWait("pong")\n}',
        B: 'on receive "pong" {\n    broadcastAndWait("ping")\n}\n\non receive "self" {\n    broadcastAndWait("self")\n}\n\non flag {\n    broadcast("ping")\n    broadcast("self")\n}',
    });
    assert.deepEqual(messages(linked, 'A'), ['2:22 Never finishes — waits on "pong", which waits back']);
    assert.ok(messages(linked, 'B').includes('6:22 Never finishes — restarts its own script'));
});

test('positions resolve to project symbols, and rename edits cover every sprite', () => {
    const linked = projectOf({
        Player: 'on flag {\n    set [score] to 0\n    broadcast("win")\n}',
        HUD: 'on receive "win" {\n    say([score])\n    say(attributeOf("score", "_stage_"))\n}',
    }, { globals: ['score'] });
    assert.deepEqual(projectSymbolAt(linked, 'Player', 2, 11), { kind: 'variable', key: varKey(STAGE, 'variable', 'score'), span: { line: 2, col: 9, endLine: 2, endCol: 16 } });
    assert.equal(projectSymbolAt(linked, 'HUD', 1, 14).name, 'win');
    assert.equal(variableSites(linked, varKey(STAGE, 'variable', 'score')).length, 3);
    const edits = renameEdits(linked, { kind: 'variable', key: varKey(STAGE, 'variable', 'score') }, 'points');
    assert.deepEqual(edits.get('HUD').map(e => e.text), ['[points]', '"points"']);
    assert.deepEqual(renameEdits(linked, { kind: 'message', name: 'win' }, 'a "b" {c}').get('Player').map(e => e.text), ['"a \\"b\\" {{c}}"']);
});

test('the event graph links senders, messages, receivers and clones', () => {
    const linked = projectOf({
        Player: 'on flag {\n    broadcastAndWait("go")\n    createClone("Enemy")\n}',
        Enemy: 'on receive "go" {\n    say(1)\n}\n\non clone {\n    say(2)\n}',
    });
    const { scripts, messages: nodes, edges } = eventGraph(linked);
    assert.equal(scripts.length, 3);
    assert.deepEqual(nodes.map(m => m.name), ['go']);
    assert.deepEqual(edges.map(e => e.kind).sort(), ['clone', 'receive', 'wait']);
    assert.deepEqual(projectSymbols(linked).map(s => `${s.sprite} ${s.label}`), ['Player when flag clicked', 'Enemy when I receive "go"', 'Enemy when I start as a clone']);
});

test('compiler facts: confinement per thread, clones share globals, restarts and stops interrupt', () => {
    const linked = projectOf({
        Solo: 'on flag {\n    repeat 3 {\n        change [mine] by 1\n        change [own] by 1\n    }\n}\n\non receive "go" {\n    say(1)\n}',
        Clones: 'on flag {\n    createClone("_myself_")\n}\n\non clone {\n    change [shared] by 1\n    change [local] by 1\n}',
        Sender: 'on key "a" {\n    broadcast("go")\n}',
    }, { globals: ['mine', 'shared'], locals: { Solo: ['own'], Clones: ['local'] } });
    const solo = slvmFacts(linked, 'Solo');
    assert.deepEqual(solo.confined.map(v => v.name).sort(), ['mine', 'own']);
    assert.ok(solo.uninterruptedScripts.has('1:4'));
    assert.ok(!solo.uninterruptedScripts.has('8:4'), 'another script broadcasts "go"');
    assert.deepEqual(slvmFacts(linked, 'Clones').confined.map(v => v.name), ['local']);
    const stopped = projectOf({ Solo: 'on flag {\n    say(1)\n}', Other: 'on key "x" {\n    stopAll()\n}' });
    assert.equal(slvmFacts(stopped, 'Solo').uninterruptedScripts.size, 0);
});
