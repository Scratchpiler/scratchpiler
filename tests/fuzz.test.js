import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateProgram, DEFAULT_FEATURES } from './fuzz/generate.js';
import { runOracle } from './fuzz/oracle.js';
import { execute, haveVM, visible } from './backend-harness.js';

const ALL_FEATURES = Object.fromEntries(Object.keys(DEFAULT_FEATURES).map((k) => [k, true]));
const skip = !haveVM && 'slvm/testing with scratch-vm is not installed';

function agreesWithOracle(vm, oracle) {
    const vars = visible(vm.vars);
    for (const name of new Set([...Object.keys(vars), ...Object.keys(oracle.vars)])) {
        assert.equal(vars[name], oracle.vars[name] ?? '0', `[${name}]`);
    }
    assert.deepEqual(visible(vm.lists).L ?? [], oracle.lists.L ?? [], '[L]');
    assert.deepEqual(vm.said, oracle.said, 'speech');
}

for (let seed = 0; seed < 15; seed++) {
    test(`fuzz seed ${seed}: SLVM and the reference interpreter agree`, { skip }, async () => {
        const source = generateProgram(seed);
        const result = await execute(source, { maxFrames: 2000 }, { lists: ['L'], vars: ['p', 'q'] });
        assert.deepEqual(result.errors, [], source);
        assert.equal(result.optimizerFallback, null, source);
        const oracle = runOracle(source, { initialVars: { p: 0, q: 0 }, initialLists: { L: [] } });
        agreesWithOracle(result.runtime, oracle);
    });
}

for (let seed = 50000; seed < 50010; seed++) {
    test(`fuzz seed ${seed} with recursion and for-loop break/continue: SLVM agrees with the reference interpreter`, { skip }, async () => {
        const source = generateProgram(seed, ALL_FEATURES);
        const result = await execute(source, { maxFrames: 2000 }, { lists: ['L'], vars: ['p', 'q'] });
        assert.deepEqual(result.errors, [], source);
        assert.equal(result.optimizerFallback, null, source);
        agreesWithOracle(result.runtime, runOracle(source, { initialVars: { p: 0, q: 0 }, initialLists: { L: [] } }));
    });
}

for (let seed = 70000; seed < 70012; seed++) {
    test(`fuzz seed ${seed} with loops inside warp procs: SLVM agrees with the reference interpreter`, { skip }, async () => {
        const source = generateProgram(seed, { ...DEFAULT_FEATURES, warpLoops: true });
        const result = await execute(source, { maxFrames: 2000 }, { lists: ['L'], vars: ['p', 'q'] });
        assert.deepEqual(result.errors, [], source);
        assert.equal(result.optimizerFallback, null, source);
        agreesWithOracle(result.runtime, runOracle(source, { initialVars: { p: 0, q: 0 }, initialLists: { L: [] } }));
    });
}

for (const seed of [106652, 107609]) {
    test(`pointer-subscript fuzz regression ${seed} agrees with the reference interpreter`, { skip }, async () => {
        const features = { ...ALL_FEATURES, weirdLiterals: false };
        const source = generateProgram(seed, features);
        const result = await execute(source, { maxFrames: 2000 }, { lists: ['L'], vars: ['p', 'q'] });
        assert.deepEqual(result.errors, [], source);
        assert.equal(result.optimizerFallback, null, source);
        agreesWithOracle(result.runtime, runOracle(source, { initialVars: { p: 0, q: 0 }, initialLists: { L: [] } }));
    });
}

for (const seed of [...Array.from({ length: 100 }, (_, i) => 200000 + i), 200103, 200604]) {
    test(`adversarial fuzz seed ${seed}: unusual literals agree with the reference interpreter`, { skip }, async () => {
        const source = generateProgram(seed, ALL_FEATURES);
        const result = await execute(source, { maxFrames: 2000 }, { lists: ['L'], vars: ['p', 'q'] });
        assert.deepEqual(result.errors, [], source);
        assert.equal(result.optimizerFallback, null, source);
        agreesWithOracle(result.runtime, runOracle(source, { initialVars: { p: 0, q: 0 }, initialLists: { L: [] } }));
    });
}
