import test from 'node:test';
import assert from 'node:assert/strict';

import { compileSource, tokenize } from '../src/compiler.js';
import { decompile } from '../src/decompiler.js';
import { makeMockVM } from './mock-vm.js';

const SPRITE = 'Sprite1';

function decompileBlocks(blocks) {
    const vm = makeMockVM();
    vm.runtime.targets[1].blocks._blocks = blocks;
    return decompile(vm, SPRITE);
}

const block = (opcode, extra = {}) => ({ opcode, next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: false, ...extra });

test('block comments are skipped by the tokenizer and kept as COMMENT tokens on request', () => {
    const types = source => tokenize(source).map(token => token.type);
    assert.deepEqual(types('1 /* a\nb */ + 2'), types('1 + 2'));
    assert.deepEqual(tokenize('1 /* x */', { comments: true }).filter(token => token.type === 'COMMENT').map(token => token.value), ['/* x */']);
});

test('an argument reporter outside its custom block keeps its name and gets a trailing comment', () => {
    const source = decompileBlocks({
        hat: block('event_whenflagclicked', { next: 'say', topLevel: true }),
        say: block('looks_say', { parent: 'hat', inputs: { MESSAGE: [3, 'arg', [10, 'Hello']] } }),
        arg: block('argument_reporter_boolean', { parent: 'say', fields: { VALUE: ['is compiled?', null] } }),
    });
    assert.match(source, /\[is compiled\?\] \/\* decompiler: unknown argument \*\//);
    const result = compileSource(source, makeMockVM(), SPRITE);
    assert.deepEqual(result.errors, []);
    const reporters = Object.values(result.blocks).filter(candidate => candidate.opcode.startsWith('argument_reporter'));
    assert.deepEqual(reporters.map(reporter => reporter.fields.VALUE.value), ['is compiled?']);
    assert.deepEqual(compileSource(source.replace(' /* decompiler: unknown argument */', ''), makeMockVM(), SPRITE).errors.map(error => error.message), ['Variable not found: is compiled?']);
});

test('an unknown reporter becomes an empty string followed by a comment', () => {
    const source = decompileBlocks({
        hat: block('event_whenflagclicked', { next: 'say', topLevel: true }),
        say: block('looks_say', { parent: 'hat', inputs: { MESSAGE: [3, 'mystery', [10, 'Hello']] } }),
        mystery: block('ext_mystery', { parent: 'say' }),
    });
    assert.match(source, /"" \/\* decompiler: unknown ext_mystery \*\//);
});
