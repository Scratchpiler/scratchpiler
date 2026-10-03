import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';
import { makeMockVM } from './mock-vm.js';

const bundle = await build({
    entryPoints: [new URL('../src/main.js', import.meta.url).pathname], bundle: true, write: false,
    format: 'iife', globalName: 'ScratchpilerTest', loader: { '.css': 'text', '.html': 'text' },
});

for (const backend of ['classic', 'slvm']) {
    test(`bundled UI initializes and compiles with a saved ${backend} preference`, async () => {
        const errors = [];
        const virtualConsole = new VirtualConsole();
        virtualConsole.on('jsdomError', error => { if (error.type !== 'css-parsing') errors.push(error.message); });
        const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
            url: 'https://scratch.mit.edu/projects/1/editor/', runScripts: 'outside-only', virtualConsole,
        });
        const { window } = dom;
        try {
            window.unsafeWindow = window;
            window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
            window.URL.createObjectURL = () => 'blob:test';
            window.localStorage.setItem('scratchpiler-settings', JSON.stringify({ backend, fontSize: '19', wrap: false }));
            window.eval(bundle.outputFiles[0].text);
            await new Promise(resolve => setImmediate(resolve));
            assert.deepEqual(errors, []);
            assert.ok(window.document.getElementById('scratchpiler-overlay'));
            assert.equal(window.document.getElementById('sp-setting-backend'), null);
            window.document.getElementById('sp-fontsize-up').click();
            assert.equal(window.document.getElementById('sp-setting-fontsize').textContent, '20');
            const settings = JSON.parse(window.localStorage.getItem('scratchpiler-settings'));
            assert.equal(settings.wrap, false);
            assert.ok(!Object.hasOwn(settings, 'backend'));
            const result = window.ScratchpilerTest.compileSource('on flag { for [i] from 1 to 2 { continue } }', makeMockVM(), 'Sprite1');
            assert.equal(result.errors.length, 0);
            assert.ok(Object.keys(result.blocks).length);
            assert.deepEqual(errors, []);
        } finally {
            window.close();
        }
    });
}
