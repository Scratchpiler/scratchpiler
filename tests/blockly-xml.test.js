// Scratch's Blockly workspace is loaded from XML built out of each input's
// `name` (not its key) and each variable field's `variableType`. An unnamed
// input is silently dropped; an untyped list field aborts loading the rest of
// the workspace.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileSource } from '../src/compiler.js';
import { makeMockVM, provisionAndCompile } from './mock-vm.js';

const examplesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'examples');
const SKIP = new Set(['unsafe-asm.sdsl', 'include-demo.sdsl']);

for (const file of fs.readdirSync(examplesDir).filter(f => f.endsWith('.sdsl') && !SKIP.has(f)).sort()) {
    test(`every input is named after its key: ${file}`, () => {
        const source = fs.readFileSync(path.join(examplesDir, file), 'utf-8');
        const { blocks, errors } = provisionAndCompile(compileSource, source, makeMockVM(), 'Sprite1');
        assert.deepEqual(errors, []);
        const misnamed = Object.values(blocks).flatMap(b =>
            Object.entries(b.inputs || {}).filter(([key, input]) => input.name !== key).map(([key, input]) => `${b.opcode}.${key} named "${input.name}"`));
        assert.deepEqual(misnamed, []);
    });
}

const FIELD_TYPES = { VARIABLE: '', LIST: 'list', BROADCAST_OPTION: 'broadcast_msg' };

test('variable, list and broadcast fields declare their variable type', () => {
    const source = [
        'on flag {',
        '    set [score] to 1',
        '    append([highScores], [score])',
        '    broadcast("go")',
        '}',
        'on receive "go" { say([score]) }',
    ].join('\n');
    const { blocks, errors } = provisionAndCompile(compileSource, source, makeMockVM(), 'Sprite1');
    assert.deepEqual(errors, []);
    const fields = Object.values(blocks).flatMap(b => Object.entries(b.fields || {}).filter(([key]) => key in FIELD_TYPES).map(([key, f]) => [key, f]));
    assert.ok(fields.some(([key]) => key === 'LIST'), 'expected a LIST field in the sample');
    for (const [key, field] of fields) assert.equal(field.variableType, FIELD_TYPES[key], `${key} field "${field.value}"`);
});
