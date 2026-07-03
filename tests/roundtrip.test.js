// Round-trip corpus test: for every examples/*.sdsl —
//   compile → inject into mock target → decompile → recompile → decompile
// and assert the two decompilations are textually identical (fixpoint).
// Text fixpoint sidesteps block-uid nondeterminism while still proving the
// decompiler emits source the compiler accepts and reproduces stably.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileSource } from '../src/compiler.js';
import { decompile } from '../src/decompiler.js';
import { makeMockVM, provisionAndCompile } from './mock-vm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const examplesDir = path.join(__dirname, '..', 'examples');
const SPRITE = 'Sprite1';

// Examples intentionally excluded from round-trip (with reason).
const SKIP = {
    'unsafe-asm.sdsl': 'uses nonexistent opcodes on purpose (compile is expected to warn/fail)',
    'include-demo.sdsl': 'needs a stored header + include markers (covered by headers.test.js)',
};

// Known failures awaiting in-flight features — remove entries as features land.
const KNOWN_FAIL = {
};

function loadInto(vm, spriteName, blocks) {
    const target = vm.runtime.targets.find(t => !t.isStage && t.sprite.name === spriteName);
    target.blocks._blocks = { ...target.blocks._blocks, ...blocks };
}

const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.sdsl')).sort();
assert.ok(files.length > 0, 'examples directory should contain .sdsl files');

for (const file of files) {
    test(`roundtrip: ${file}`, { skip: SKIP[file], todo: KNOWN_FAIL[file] }, (t) => {
        if (KNOWN_FAIL[file]) { t.skip(KNOWN_FAIL[file]); return; }
        const source = fs.readFileSync(path.join(examplesDir, file), 'utf-8');

        // 1. compile original
        const vm1 = makeMockVM();
        const r1 = provisionAndCompile(compileSource, source, vm1, SPRITE);
        assert.deepEqual(r1.errors, [], `compile errors in ${file}`);
        loadInto(vm1, SPRITE, r1.blocks);

        // 2. decompile
        const text1 = decompile(vm1, SPRITE);
        assert.ok(text1 && !text1.startsWith('// Error'), `decompile failed for ${file}`);

        // 3. recompile decompiled text
        const vm2 = makeMockVM();
        const r2 = provisionAndCompile(compileSource, text1, vm2, SPRITE);
        assert.deepEqual(r2.errors, [], `recompile errors for ${file}\n--- decompiled ---\n${text1}`);
        loadInto(vm2, SPRITE, r2.blocks);

        // 4. decompile again — must be a fixpoint
        const text2 = decompile(vm2, SPRITE);
        assert.equal(text2, text1, `decompile fixpoint mismatch for ${file}`);
    });
}
