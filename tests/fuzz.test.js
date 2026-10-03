import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generateProgram, DEFAULT_FEATURES } from './fuzz/generate.js';
import { runOracle } from './fuzz/oracle.js';
import { compareBackends, haveVM, visible } from './backend-harness.js';

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
    test(`fuzz seed ${seed}: classic, SLVM and the reference interpreter agree`, { skip }, async () => {
        const source = generateProgram(seed);
        const result = await compareBackends(source, { maxFrames: 2000 }, { lists: ['L'], vars: ['p', 'q'] });
        assert.deepEqual(result.classicErrors, [], source);
        assert.deepEqual(result.slvmErrors, [], source);
        assert.deepEqual(result.differences, [], source);
        const oracle = runOracle(source);
        agreesWithOracle(result.slvm, oracle);
        agreesWithOracle(result.classic, oracle);
    });
}

for (let seed = 50000; seed < 50010; seed++) {
    test(`fuzz seed ${seed} with recursion and for-loop break/continue: SLVM agrees with the reference interpreter`, { skip }, async () => {
        const source = generateProgram(seed, ALL_FEATURES);
        const result = await compareBackends(source, { maxFrames: 2000 }, { lists: ['L'], vars: ['p', 'q'] });
        assert.deepEqual(result.slvmErrors, [], source);
        agreesWithOracle(result.slvm, runOracle(source));
    });
}
