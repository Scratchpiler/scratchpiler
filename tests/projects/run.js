import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { decompile } from '../../src/decompiler.js';
import { compileSource } from '../../src/compiler.js';
import { makeMockVM } from '../mock-vm.js';

const directory = process.argv[2] ?? '/tmp/scratchpiler-projects';
const results = [];
const normalized = source => source.replace(/^\s*\/\/ unsupported hat:[^\n]*\n/gm, '').replace(/\n{3,}/g, '\n\n').trim();
for (const entry of JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'))) {
    const project = JSON.parse(fs.readFileSync(path.join(directory, `${entry.id}.json`), 'utf8'));
    const vm = makeMockVM({ sprites: project.targets.filter(t => !t.isStage).map(t => t.name) });
    project.targets.forEach((source, index) => {
        const target = vm.runtime.targets[index];
        target.sprite.costumes = source.costumes;
        target.sprite.sounds = source.sounds;
        target.comments = source.comments;
        for (const [id, [name, value]] of Object.entries(source.variables)) {
            target.createVariable(id, name, '');
            target.variables[id].value = value;
        }
        for (const [id, [name, value]] of Object.entries(source.lists)) {
            target.createVariable(id, name, 'list');
            target.variables[id].value = value;
        }
        for (const [id, name] of Object.entries(source.broadcasts ?? {})) target.createVariable(id, name, 'broadcast_msg');
        target.blocks._blocks = source.blocks;
    });
    const provisioned = [];
    for (const target of vm.runtime.targets) {
        for (const block of Object.values(target.blocks._blocks)) {
            if (!block || Array.isArray(block)) continue;
            for (const [field, type] of [['VARIABLE', ''], ['LIST', 'list']]) {
                const reference = block.fields?.[field];
                if (!reference) continue;
                const [name, id] = reference;
                if (!target.variables[id] && !vm.runtime.targets[0].variables[id]) {
                    target.createVariable(id, name, type);
                    provisioned.push({ target: target.sprite.name, name, type, id });
                }
            }
        }
    }
    const report = { ...entry, provisioned, targets: [] };
    for (const target of vm.runtime.targets) {
        const name = target.isStage ? '__stage__' : target.sprite.name;
        const start = performance.now();
        let source = '';
        let result;
        let roundtrip = null;
        const originalBlocks = Object.keys(target.blocks._blocks).length;
        try {
            source = decompile(vm, name);
            result = compileSource(source, vm, name);
            if (!result.errors.length) {
                for (const block of Object.values(result.blocks)) {
                    for (const input of Object.values(block.inputs)) {
                        for (const id of [input.block, input.shadow].filter(Boolean)) {
                            if (!result.blocks[id] || result.blocks[id].parent !== block.id) throw new Error(`Invalid input ${block.opcode}.${input.name}`);
                        }
                    }
                    if (block.next && result.blocks[block.next]?.parent !== block.id) throw new Error(`Invalid next on ${block.opcode}`);
                }
                const saved = target.blocks._blocks;
                try {
                    target.blocks._blocks = result.blocks;
                    const first = decompile(vm, name);
                    const second = compileSource(first, vm, name);
                    if (second.errors.length) throw new Error(`Roundtrip errors: ${JSON.stringify(second.errors)}`);
                    target.blocks._blocks = second.blocks;
                    const again = decompile(vm, name);
                    roundtrip = normalized(first) === normalized(again);
                    if (!roundtrip) {
                        fs.writeFileSync(path.join(directory, `${entry.id}-${vm.runtime.targets.indexOf(target)}-first.sdsl`), first);
                        fs.writeFileSync(path.join(directory, `${entry.id}-${vm.runtime.targets.indexOf(target)}-again.sdsl`), again);
                        throw new Error('Decompiler roundtrip did not stabilize');
                    }
                } finally {
                    target.blocks._blocks = saved;
                }
            }
        } catch (error) {
            result = { errors: [{ message: error.message }], blocks: {}, exception: error.stack };
        }
        const file = `${entry.id}-${vm.runtime.targets.indexOf(target)}.sdsl`;
        fs.writeFileSync(path.join(directory, file), source);
        report.targets.push({ name, originalBlocks, roundtrip,
            emittedBlocks: Object.keys(result.blocks).length, sourceBytes: source.length,
            unsupported: [...source.matchAll(/unsupported[^\n]*/g)].map(m => m[0]),
            errors: result.errors, exception: result.exception, elapsedMs: performance.now() - start });
    }
    results.push(report);
    console.log(JSON.stringify({ title: entry.title, blocks: entry.blocks,
        compiled: report.targets.filter(t => !t.errors.length).length, failed: report.targets.filter(t => t.errors.length).length,
        exceptions: report.targets.filter(t => t.exception).length, roundtrips: report.targets.filter(t => t.roundtrip).length,
        unsupported: report.targets.reduce((sum,t) => sum + t.unsupported.length, 0) }));
}
fs.writeFileSync(path.join(directory, 'results.json'), JSON.stringify(results, null, 2) + '\n');
process.exitCode = results.some(p => p.targets.some(t => t.errors.length || t.exception)) ? 1 : 0;
