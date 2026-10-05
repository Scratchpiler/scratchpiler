import { compileSourceWithHeaders } from '../src/preprocess.js';
import { reindex } from '../src/vm.js';
import { scratchIndex } from '../src/scratch-index.js';
import { createProject, setProjectIndex, setProjectFile, linkedProject, slvmFacts, spriteNamesOf } from '../src/project-analysis.js';
import { makeMockVM, provisionAndCompile } from './mock-vm.js';
import { runInScratchVM as run, hasScratchVM } from 'slvm/testing';

export const SPRITE = 'Sprite1';
export const haveVM = hasScratchVM;
export const compileWith = compileSourceWithHeaders;

export function build(source, vm = makeMockVM(), sprite = SPRITE, options = {}) {
    const { blocks, errors, comments, optimizerFallback, usedProjectFacts } = provisionAndCompile((src, machine, name) => compileWith(src, machine, name, options), source, vm, sprite);
    const targets = vm.runtime.targets.map((t) => ({
        kind: t.isStage ? 'stage' : 'sprite',
        name: t.isStage ? 'Stage' : t.sprite.name,
        variables: Object.values(t.variables).map((v) => ({ id: v.id, name: v.name, type: v.type, value: v.value })),
        blocks: (sprite === '__stage__' ? t.isStage : !t.isStage && t.sprite.name === sprite) ? blocks : {},
    }));
    return { errors, compiled: { targets }, blocks, comments, vm, optimizerFallback, usedProjectFacts };
}

export const runInScratchVM = run;

const isHidden = (name) => name.startsWith('_scratchpiler_internal_') || name.startsWith('__ret_');
export const visible = (obj) => Object.fromEntries(Object.entries(obj)
    .filter(([k]) => !isHidden(k))
    .map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : String(v)]));

export async function execute(source, runOptions, project = {}, compileOptions = {}) {
    const result = build(source, makeMockVM(project), SPRITE, compileOptions);
    return { ...result, runtime: result.errors.length ? null : await runInScratchVM(result.compiled, runOptions) };
}

export function projectFactsFor(source, project = {}, sprite = SPRITE) {
    reindex(makeMockVM(project));
    const analysis = createProject();
    setProjectIndex(analysis, scratchIndex);
    for (const name of spriteNamesOf(scratchIndex)) setProjectFile(analysis, name, name === sprite ? source : '', scratchIndex);
    return slvmFacts(linkedProject(analysis), sprite);
}
