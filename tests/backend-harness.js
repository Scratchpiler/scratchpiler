import { compileSourceWithHeaders } from '../src/preprocess.js';
import { makeMockVM, provisionAndCompile } from './mock-vm.js';
import { runInScratchVM as run, hasScratchVM } from 'slvm/testing';

export const SPRITE = 'Sprite1';
export const haveVM = hasScratchVM;
export const compileWith = compileSourceWithHeaders;

export function build(source, vm = makeMockVM(), sprite = SPRITE) {
    const { blocks, errors } = provisionAndCompile(compileWith, source, vm, sprite);
    const targets = vm.runtime.targets.map((t) => ({
        kind: t.isStage ? 'stage' : 'sprite',
        name: t.isStage ? 'Stage' : t.sprite.name,
        variables: Object.values(t.variables).map((v) => ({ id: v.id, name: v.name, type: v.type, value: v.value })),
        blocks: (sprite === '__stage__' ? t.isStage : !t.isStage && t.sprite.name === sprite) ? blocks : {},
    }));
    return { errors, compiled: { targets }, blocks, vm };
}

export const runInScratchVM = run;

const isHidden = (name) => name.startsWith('_scratchpiler_internal_') || name.startsWith('__ret_');
export const visible = (obj) => Object.fromEntries(Object.entries(obj)
    .filter(([k]) => !isHidden(k))
    .map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : String(v)]));

export async function execute(source, runOptions, project = {}) {
    const result = build(source, makeMockVM(project));
    return { ...result, runtime: result.errors.length ? null : await runInScratchVM(result.compiled, runOptions) };
}
