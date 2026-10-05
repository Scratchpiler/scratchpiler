import { decompileAsync } from "./decompiler.js";
import { scratchIndex } from "./scratch-index.js";
import {
    createProject, setProjectFile, setProjectIndex, removeProjectFile, linkedProject, slvmFacts,
    spriteNamesOf, varKey, isFileCurrent, messageCounts, STAGE,
} from "./project-analysis.js";

const project = createProject();
const decompiled = new Map();
const listeners = new Set();
let vm = null;
let sourceOf = () => null;
let indexSignature = null;
let linkOptions = { monitored: new Set() };
let run = null;
let progress = { running: false, done: 0, total: 0, label: '' };
let changeTimer = null;

const nextTask = () => globalThis.scheduler?.yield?.() ?? new Promise(resolve => setTimeout(resolve));

export function configureProjectService({ getSource }) {
    sourceOf = getSource;
}

export const onProjectChange = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
const notify = () => listeners.forEach(listener => listener());

export const projectProgress = () => progress;

export function projectAnalysis() {
    if (!project.index || progress.running && !run?.firstPassDone) return null;
    return linkedProject(project, linkOptions);
}

let stableCounts = null;
let stableCountsFrom = null;
let stableCountsSignature = '';

export function stableMessageCounts() {
    const linked = projectAnalysis();
    if (!linked || linked === stableCountsFrom) return stableCounts;
    stableCountsFrom = linked;
    if ([...linked.files.values()].some(file => file.hasParseErrors) && stableCounts) return stableCounts;
    const counts = messageCounts(linked);
    const signature = JSON.stringify([...counts]);
    if (signature !== stableCountsSignature) {
        stableCountsSignature = signature;
        stableCounts = counts;
    }
    return stableCounts;
}

export function decompiledSource(sprite) {
    return decompiled.get(sprite)?.text ?? null;
}

function fingerprint(target) {
    let hash = 0x811c9dc5;
    const mix = text => {
        for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    };
    for (const [id, block] of Object.entries(target.blocks._blocks)) {
        mix(id);
        mix(JSON.stringify(block) ?? '');
    }
    for (const comment of Object.values(target.comments ?? {})) mix(comment.text ?? '');
    return hash >>> 0;
}

function targetFor(sprite) {
    return vm?.runtime.targets.find(t => sprite === STAGE ? t.isStage : !t.isStage && t.isOriginal !== false && t.sprite.name === sprite);
}

function signatureOf(index) {
    const vars = list => (list || []).map(v => `${v.type}:${v.name}`).sort().join(',');
    return JSON.stringify([
        index.sprites.map(s => s.name),
        vars(index.globalVariables),
        Object.entries(index.spriteVariables).map(([s, list]) => `${s}=${vars(list)}`).sort(),
    ]);
}

function monitoredKeys() {
    const keys = new Set();
    const monitors = vm?.runtime._monitorState;
    if (!monitors?.forEach) return keys;
    monitors.forEach(record => {
        const get = name => record.get ? record.get(name) : record[name];
        if (!get('visible')) return;
        const params = get('params');
        const name = params?.get ? (params.get('VARIABLE') ?? params.get('LIST')) : (params?.VARIABLE ?? params?.LIST);
        if (!name) return;
        const kind = get('opcode') === 'data_listcontents' ? 'list' : 'variable';
        keys.add(varKey(get('spriteName') || STAGE, kind, name));
    });
    return keys;
}

function syncIndex() {
    const signature = signatureOf(scratchIndex);
    if (signature === indexSignature) return false;
    indexSignature = signature;
    setProjectIndex(project, scratchIndex);
    for (const sprite of [...project.files.keys()]) if (!spriteNamesOf(scratchIndex).includes(sprite)) removeProjectFile(project, sprite);
    return true;
}

function refreshOptions() {
    const monitored = monitoredKeys();
    const same = monitored.size === linkOptions.monitored.size && [...monitored].every(k => linkOptions.monitored.has(k));
    if (!same) linkOptions = { monitored };
}

export function updateSpriteSource(sprite, text, analysis = null) {
    if (!project.index) return false;
    if (syncIndex() && !progress.running) analyzeProject();
    refreshOptions();
    const changed = setProjectFile(project, sprite, text, scratchIndex, analysis);
    if (changed) notify();
    return changed;
}

async function sourceFor(sprite, current) {
    const own = sourceOf(sprite);
    if (own !== null) return own;
    const target = targetFor(sprite);
    if (!target) return '';
    const print = fingerprint(target);
    const cached = decompiled.get(sprite);
    if (cached && cached.fingerprint === print) return cached.text;
    const text = await decompileAsync(vm, sprite, {
        onProgress: fraction => setProgress({ running: true, total: spriteNamesOf(scratchIndex).length, done: current + fraction * 0.9, label: sprite }),
        signal: run.controller.signal,
    });
    decompiled.set(sprite, { text, fingerprint: print });
    return text;
}

function setProgress(next) {
    progress = next;
    notify();
}

export function analyzeProject(machine) {
    vm = machine ?? vm;
    if (!vm) return Promise.resolve();
    run?.controller.abort();
    const controller = new AbortController();
    const thisRun = run = { controller, firstPassDone: !!project.index };
    if (!project.index) project.index = scratchIndex;
    indexSignature = null;
    syncIndex();
    refreshOptions();
    const sprites = spriteNamesOf(scratchIndex);
    const work = (async () => {
        if (!thisRun.firstPassDone) setProgress({ running: true, done: 0, total: sprites.length, label: '' });
        for (const [i, sprite] of sprites.entries()) {
            const text = await sourceFor(sprite, i);
            if (controller.signal.aborted) return;
            if (project.files.get(sprite)?.text === text && isFileCurrent(project, sprite)) continue;
            setProgress({ running: true, done: i, total: sprites.length, label: sprite });
            setProjectFile(project, sprite, text, scratchIndex);
            await nextTask();
            if (controller.signal.aborted) return;
        }
        thisRun.firstPassDone = true;
        setProgress({ running: false, done: sprites.length, total: sprites.length, label: '' });
        if (syncIndex()) analyzeProject();
    })();
    return work.catch(error => {
        if (controller.signal.aborted) return;
        console.warn('[scratchpiler] project analysis failed', error);
        thisRun.firstPassDone = true;
        setProgress({ running: false, done: 0, total: 0, label: '', error: error.message });
    });
}

export function projectChangedInScratch() {
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
        if (!vm || progress.running) return;
        const stale = spriteNamesOf(scratchIndex).some(sprite => {
            if (sourceOf(sprite) !== null) return false;
            const target = targetFor(sprite);
            return target && decompiled.get(sprite)?.fingerprint !== fingerprint(target);
        });
        if (stale || syncIndex()) analyzeProject();
        else if (project.index) { refreshOptions(); notify(); }
    }, 1200);
}

export function forgetDecompiledSources() {
    decompiled.clear();
    run?.controller.abort();
    project.files.clear();
    project.linked = null;
    project.index = null;
    progress = { running: false, done: 0, total: 0, label: '' };
    notify();
}

export function projectFactsFor(sprite, matchesScratch) {
    if (progress.running || !project.index) return { facts: null, reason: 'the project analysis is still running' };
    const linked = projectAnalysis();
    for (const file of linked.files.values()) {
        if (file.sprite === sprite || decompiled.get(file.sprite)?.text === file.text || matchesScratch(file.sprite, file.text)) continue;
        return { facts: null, reason: `${file.sprite === STAGE ? 'the Stage' : file.sprite} has changes that aren't in Scratch yet` };
    }
    const facts = slvmFacts(linked, sprite);
    return facts ? { facts } : { facts: null, reason: linked.anyAsm ? 'the project uses __asm__' : 'some code has errors' };
}
