import { compileSourceWithHeaders } from '../src/preprocess.js';
import { makeMockVM, provisionAndCompile } from './mock-vm.js';

export const SPRITE = 'Sprite1';

let harness = null;
try {
    harness = await import('slvm/testing');
} catch {
    harness = null;
}
export const haveVM = !!harness?.hasScratchVM;

export const compileWith = (backend) => (source, vm, sprite) => compileSourceWithHeaders(source, vm, sprite, { backend });

export function build(backend, source, vm = makeMockVM()) {
    const { blocks, errors } = provisionAndCompile(compileWith(backend), source, vm, SPRITE);
    const stage = vm.runtime.targets.find((t) => t.isStage);
    for (const block of Object.values(blocks)) {
        const field = block.fields?.BROADCAST_OPTION;
        if (field?.id && !stage.variables[field.id]) stage.createVariable(field.id, field.value, 'broadcast_msg');
    }
    const targets = vm.runtime.targets.map((t) => ({
        kind: t.isStage ? 'stage' : 'sprite',
        name: t.isStage ? 'Stage' : t.sprite.name,
        variables: Object.values(t.variables).map((v) => ({ id: v.id, name: v.name, type: v.type, value: v.value })),
        blocks: t.isStage ? {} : blocks,
    }));
    return { errors, compiled: { targets }, blocks, vm };
}

export const runInScratchVM = (compiled, options) => harness.runInScratchVM(compiled, options);

const isHidden = (name) => name.startsWith('_scratchpiler_internal_') || name.startsWith('__ret_');
export const visible = (obj) => Object.fromEntries(Object.entries(obj)
    .filter(([k]) => !isHidden(k))
    .map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : String(v)]));

export async function compareBackends(source, runOptions, project = {}) {
    const classic = build('classic', source, makeMockVM(project));
    const slvm = build('slvm', source, makeMockVM(project));
    const a = classic.errors.length ? null : await runInScratchVM(classic.compiled, runOptions);
    const b = slvm.errors.length ? null : await runInScratchVM(slvm.compiled, runOptions);
    const base = { classicErrors: classic.errors, slvmErrors: slvm.errors, classic: a, slvm: b };
    if (!a || !b) return { ...base, compiled: false, differences: [] };
    const differences = [];
    const canonical = (v) => JSON.stringify(v, (key, value) => (value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(Object.entries(value).sort(([k1], [k2]) => (k1 < k2 ? -1 : k1 > k2 ? 1 : 0)))
        : value));
    const check = (what, x, y) => {
        if (canonical(x) !== canonical(y)) differences.push({ what, classic: x, slvm: y });
    };
    check('variables', visible(a.vars), visible(b.vars));
    check('lists', visible(a.lists), visible(b.lists));
    check('speech', a.said, b.said);
    check('sprite state', a.sprites, b.sprites);
    return { ...base, compiled: true, differences, blocks: { classic: Object.keys(classic.blocks).length, slvm: Object.keys(slvm.blocks).length } };
}
