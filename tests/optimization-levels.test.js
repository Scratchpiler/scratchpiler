import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';

import { OPTIMIZATION_LEVELS, DEFAULT_OPTIMIZATION_LEVEL, optimizationLevel, pipelineFor } from '../src/optimization-levels.js';
import { loadSettings, DEFAULT_SETTINGS } from '../src/settings.js';
import { decompile } from '../src/decompiler.js';
import { compileSource } from '../src/compiler.js';
import { execute, haveVM, visible } from './backend-harness.js';
import { build as compileWith } from './backend-harness.js';
import { makeMockVM } from './mock-vm.js';

const RUNTIME = { skip: !haveVM && 'scratch-vm is not installed' };
const PROJECT = { vars: ['out', 'x'] };

const SOURCE = `define f(n) returns {
    if n < 2 {
        return 1
    }
    return n * f(n - 1)
}

on flag {
    set [out] to f(5)
    repeat 10 {
        change [x] by 1
        if [x] mod 3 = 0 {
            continue
        }
        change [out] by [x]
    }
    forever {
        if not ([out] < 200) {
            stopThis()
        }
        change [out] by 7
        wait(0)
    }
}
`;

const compileAt = (source, level, vm = makeMockVM(PROJECT)) => compileWith(source, vm, 'Sprite1', { optimize: level, embedSource: false });
const opcodeCount = (result, opcode) => Object.values(result.blocks).filter(block => block.opcode === opcode).length;
const blockCount = result => Object.keys(result.blocks).length;

test('levels are named, ordered and map to SLVM pipelines', () => {
    assert.deepEqual(OPTIMIZATION_LEVELS.map(level => level.level), [0, 1, 2, 3]);
    assert.deepEqual(OPTIMIZATION_LEVELS.map(level => level.name), ['Off', 'Standard', 'Aggressive', 'Maximum']);
    assert.deepEqual([0, 1, 2, 3].map(pipelineFor), [['legalize'], ['O1'], ['O2'], ['O3']]);
    assert.equal(DEFAULT_OPTIMIZATION_LEVEL, 1);
});

test('the optimize option still accepts booleans and clamps numbers', () => {
    assert.equal(optimizationLevel(true), 1);
    assert.equal(optimizationLevel(false), 0);
    assert.equal(optimizationLevel(undefined), 1);
    assert.equal(optimizationLevel('2'), 2);
    assert.equal(optimizationLevel(9), 3);
    assert.equal(optimizationLevel(-4), 0);
    assert.equal(optimizationLevel('fast'), 1);
});

test('settings default to Standard and migrate the old on/off switch', () => {
    const load = saved => loadSettings({ getItem: () => JSON.stringify(saved) });
    assert.equal(DEFAULT_SETTINGS.optimizeLevel, 1);
    assert.equal(load({}).optimizeLevel, 1);
    assert.equal(load({ optimize: false }).optimizeLevel, 0);
    assert.equal(load({ optimize: true }).optimizeLevel, 1);
    assert.equal(load({ optimize: false, optimizeLevel: 3 }).optimizeLevel, 3);
    assert.equal(load({ optimizeLevel: '2' }).optimizeLevel, 2);
    assert.equal(load({ optimizeLevel: 12 }).optimizeLevel, 3);
    assert.ok(!Object.hasOwn(load({ optimize: false }), 'optimize'));
});

test('each level compiles to the shape it promises', () => {
    const shapes = [0, 1, 2, 3].map(level => {
        const result = compileAt(SOURCE, level);
        assert.deepEqual(result.errors, []);
        assert.equal(result.optimizerFallback, null);
        return { stops: opcodeCount(result, 'control_stop'), forever: opcodeCount(result, 'control_forever'), until: opcodeCount(result, 'control_repeat_until'), blocks: blockCount(result) };
    });
    assert.deepEqual(shapes[0], shapes[1], 'Off and Standard differ only on programs Standard can improve');
    for (const level of [2, 3]) {
        assert.equal(shapes[level].stops, 0);
        assert.equal(shapes[level].forever, 0);
        assert.equal(shapes[level].until, 1);
        assert.ok(shapes[level].blocks < shapes[1].blocks);
    }
});

test('Standard blocks are fewer than Off blocks on a program with a small returning block', () => {
    const source = 'define sq(n) returns {\n    return n * n\n}\n\non flag {\n    set [out] to sq(3) + sq(4)\n}';
    assert.ok(blockCount(compileAt(source, 1)) < blockCount(compileAt(source, 0)));
});

test('every level runs the program to the same result', RUNTIME, async () => {
    const results = [];
    for (const level of [0, 1, 2, 3]) {
        const { runtime, errors } = await execute(SOURCE, { maxFrames: 400 }, PROJECT, { optimize: level, embedSource: false });
        assert.deepEqual(errors, []);
        results.push(visible(runtime.vars));
    }
    for (const result of results.slice(1)) assert.deepEqual(result, results[0]);
    assert.equal(results[0].out, "206");
});

test('code compiled at every level pulls back into source that compiles again', () => {
    for (const level of [0, 1, 2, 3]) {
        const vm = makeMockVM(PROJECT);
        const result = compileAt(SOURCE, level, vm);
        vm.runtime.targets[1].blocks._blocks = result.blocks;
        const pulled = decompile(vm, 'Sprite1');
        const again = compileSource(pulled, vm, 'Sprite1');
        assert.deepEqual(again.errors, [], `level ${level}:\n${pulled}`);
    }
});

test('the whole-program facts only apply when optimization is on', () => {
    const source = 'on flag {\n    set [out] to 0\n    repeat 3 {\n        change [out] by 2\n    }\n}';
    const facts = { text: source, confined: [{ owner: 'Sprite1', kind: 'variable', name: 'out' }], singleThreadProcs: new Set(), uninterruptedScripts: new Set(['1:4']), uninterruptedProcs: new Set() };
    const withFacts = level => compileWith(source, makeMockVM(PROJECT), 'Sprite1', { optimize: level, projectFacts: facts });
    assert.equal(withFacts(0).usedProjectFacts, false);
    assert.equal(withFacts(2).usedProjectFacts, true);
});

const bundle = await build({
    entryPoints: [new URL('../src/main.js', import.meta.url).pathname], bundle: true, write: false,
    format: 'iife', globalName: 'ScratchpilerTest', loader: { '.css': 'text', '.html': 'text' },
});

async function openOverlay(saved) {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => { if (error.type !== 'css-parsing') errors.push(error.message); });
    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        url: 'https://scratch.mit.edu/projects/1/editor/', runScripts: 'outside-only', virtualConsole,
    });
    const { window } = dom;
    window.unsafeWindow = window;
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    window.URL.createObjectURL = () => 'blob:test';
    if (saved) window.localStorage.setItem('scratchpiler-settings', JSON.stringify(saved));
    window.eval(bundle.outputFiles[0].text);
    await new Promise(resolve => setImmediate(resolve));
    return { window, errors, saved: () => JSON.parse(window.localStorage.getItem('scratchpiler-settings')) };
}

test('the compile dropdown has a level slider that follows and updates the setting', async () => {
    const { window, errors, saved } = await openOverlay({ optimize: false });
    try {
        const $ = id => window.document.getElementById(id);
        assert.equal($('sp-setting-optimize-level').value, '0');
        assert.deepEqual([...$('sp-setting-optimize-level').options].map(option => option.textContent), ['Off', 'Standard', 'Aggressive', 'Maximum']);
        assert.equal($('sp-setting-optimize-project').disabled, true);

        $('sp-run-more').click();
        const slider = $('sp-menu').querySelector('.sp-slider input[type=range]');
        assert.ok(slider, 'the menu has a slider');
        assert.equal(slider.value, '0');
        assert.equal($('sp-menu').querySelector('.sp-slider-head b').textContent, 'Off');

        slider.value = '2';
        slider.dispatchEvent(new window.Event('input', { bubbles: true }));
        assert.equal($('sp-menu').querySelector('.sp-slider-head b').textContent, 'Aggressive');
        assert.match($('sp-menu').querySelector('.sp-slider p').textContent, /early returns/);
        assert.equal(saved().optimizeLevel, 2);
        assert.equal($('sp-setting-optimize-level').value, '2');
        assert.equal($('sp-setting-optimize-project').disabled, false);
        assert.ok($('sp-menu').classList.contains('sp-on'), 'dragging the slider keeps the menu open');

        $('sp-setting-optimize-level').value = '3';
        $('sp-setting-optimize-level').dispatchEvent(new window.Event('change', { bubbles: true }));
        assert.equal(saved().optimizeLevel, 3);
        assert.ok(!Object.hasOwn(saved(), 'optimize'));
        assert.deepEqual(errors, []);
    } finally {
        window.close();
    }
});

test('the slider starts at the saved level when the menu is opened again', async () => {
    const { window, errors } = await openOverlay({ optimizeLevel: 3 });
    try {
        const $ = id => window.document.getElementById(id);
        $('sp-run-more').click();
        assert.equal($('sp-menu').querySelector('.sp-slider input[type=range]').value, '3');
        assert.equal($('sp-menu').querySelector('.sp-slider-head b').textContent, 'Maximum');
        assert.deepEqual([...$('sp-menu').querySelectorAll('.sp-slider-stops span')].map(span => span.textContent), ['Off', 'Standard', 'Aggressive', 'Maximum']);
        assert.deepEqual(errors, []);
    } finally {
        window.close();
    }
});
