import test from 'node:test';
import assert from 'node:assert/strict';

import { build, execute, haveVM, projectFactsFor, SPRITE } from './backend-harness.js';
import { makeMockVM } from './mock-vm.js';

const PROJECT = { vars: ['out', 'seen'] };
const RUNTIME = { skip: !haveVM && 'scratch-vm is not installed' };

const factsFor = source => projectFactsFor(source, PROJECT);

const loops = ({ blocks }) => Object.values(blocks).filter(b => b.opcode === 'control_repeat' || b.opcode === 'control_repeat_until').length;
const compile = (source, facts = factsFor(source)) => build(source, makeMockVM(PROJECT), SPRITE, { projectFacts: facts });

const PRIVATE_LOOP = 'on flag {\n    set [out] to 0\n    repeat 3 {\n        change [out] by 2\n    }\n    for [i] from 1 to 3 {\n        change [out] by [i] * 10\n    }\n    say([out])\n}';

test('a script loop over state no other script touches is unrolled with project facts', () => {
    const facts = factsFor(PRIVATE_LOOP);
    assert.deepEqual(facts.confined.map(v => v.name), ['out']);
    assert.ok(facts.uninterruptedScripts.has('1:4'));
    const result = build(PRIVATE_LOOP, makeMockVM(PROJECT), SPRITE, { projectFacts: facts });
    assert.deepEqual(result.errors, []);
    assert.equal(result.usedProjectFacts, true);
    assert.equal(loops(result), 0);
    assert.equal(loops(build(PRIVATE_LOOP, makeMockVM(PROJECT))), 2);
});

test('the unrolled script computes what the loops did', RUNTIME, async () => {
    for (const projectFacts of [factsFor(PRIVATE_LOOP), null]) {
        const { runtime, errors } = await execute(PRIVATE_LOOP, { maxFrames: 50 }, PROJECT, { projectFacts });
        assert.deepEqual(errors, []);
        assert.deepEqual(runtime.said, ['66']);
    }
});

test('a loop whose variable another script reads keeps its yields', () => {
    const source = `${PRIVATE_LOOP}\n\non receive "peek" {\n    set [seen] to [out]\n}`;
    assert.equal(loops(compile(source)), 2);
});

test('a script that another script can restart keeps its yields', () => {
    const source = 'on receive "go" {\n    repeat 3 {\n        change [out] by 1\n    }\n}\n\non flag {\n    broadcast("go")\n}';
    const facts = factsFor(source);
    assert.ok(!facts.uninterruptedScripts.has('1:4'));
    assert.equal(loops(compile(source, facts)), 1);
});

test('stop all anywhere else keeps every script loop', () => {
    const source = `${PRIVATE_LOOP}\n\non key "space" {\n    stopAll()\n}`;
    assert.equal(loops(compile(source)), 2);
});

test('facts for different text are ignored', () => {
    const facts = factsFor(PRIVATE_LOOP);
    const edited = PRIVATE_LOOP.replace('by 2', 'by 3');
    const result = build(edited, makeMockVM(PROJECT), SPRITE, { projectFacts: facts });
    assert.equal(result.usedProjectFacts, false);
    assert.equal(loops(result), 2);
});

test('a loop in a block only one script calls unrolls inside that script', () => {
    const source = 'define fill() noinline {\n    repeat 4 {\n        change [out] by 1\n    }\n}\n\non flag {\n    set [out] to 0\n    fill()\n    say([out])\n}';
    const facts = factsFor(source);
    assert.ok(facts.uninterruptedProcs.has('fill'));
    assert.equal(loops(compile(source, facts)), 0);
});
