import { uid } from "./compiler.js";
import { INTERNAL_VARIABLE_PREFIX } from "./constants.js";

export const CLOUD_PREFIX = '☁ ';
const SCRATCH_TYPE = { var: '', list: 'list' };

export const isCompilerVariable = name => name.startsWith('__') || name.startsWith(INTERNAL_VARIABLE_PREFIX);

export function stageOf(vm) {
    return vm.runtime.targets.find(t => t.isStage);
}

export function targetForSprite(vm, spriteName) {
    if (spriteName === '__stage__') return stageOf(vm);
    return vm.runtime.targets.find(t => t.isOriginal !== false && !t.isStage && t.sprite.name === spriteName);
}

function describe(variable, target) {
    return {
        id: variable.id,
        name: variable.name,
        kind: variable.type === 'list' ? 'list' : 'var',
        value: variable.value,
        isCloud: !!variable.isCloud,
        targetId: target.id,
        scope: target.isStage ? 'global' : 'local',
    };
}

function variablesOf(target) {
    return Object.values(target.variables)
        .filter(v => v.type === '' || v.type === 'list')
        .map(v => describe(v, target));
}

export function variablesInScope(vm, spriteName) {
    const stage = stageOf(vm);
    const target = targetForSprite(vm, spriteName);
    return {
        local: target && !target.isStage ? variablesOf(target) : [],
        global: stage ? variablesOf(stage) : [],
    };
}

export function findVariable(vm, targetId, variableId) {
    const target = vm.runtime.getTargetById(targetId);
    const variable = target?.variables[variableId];
    return variable ? { target, variable } : null;
}

function nameTaken(vm, target, name, kind) {
    const type = SCRATCH_TYPE[kind];
    if (target.isStage) return vm.runtime.getAllVarNamesOfType(type).includes(name);
    const stage = stageOf(vm);
    return [target, stage].some(t => Object.values(t.variables).some(v => v.type === type && v.name === name));
}

export function refreshScratchWorkspace(vm) {
    try { vm.emitWorkspaceUpdate(); } catch (e) { console.warn('[scratchpiler] workspace refresh failed', e); }
}

export function createVariable(vm, spriteName, rawName, { kind, global }) {
    const name = rawName.trim().replace(/[[\]]/g, '');
    const noun = kind === 'list' ? 'list' : 'variable';
    if (!name) return { error: `A ${noun} needs a name` };
    const target = global || spriteName === '__stage__' ? stageOf(vm) : targetForSprite(vm, spriteName);
    if (!target) return { error: 'That sprite no longer exists in Scratch' };
    if (nameTaken(vm, target, name, kind)) return { error: `A ${noun} named [${name}] already exists` };
    target.createVariable(uid(), name, SCRATCH_TYPE[kind]);
    refreshScratchWorkspace(vm);
    return { name, global: target.isStage };
}

function normalizeCloudName(name, isCloud) {
    if (!isCloud) return name;
    if (name.startsWith(CLOUD_PREFIX)) return name;
    if (name.startsWith('☁')) return CLOUD_PREFIX + name.slice(1).trimStart();
    return CLOUD_PREFIX + name;
}

export function renameVariable(vm, targetId, variableId, rawName) {
    const found = findVariable(vm, targetId, variableId);
    if (!found) return { error: 'That variable no longer exists in Scratch' };
    const { target, variable } = found;
    const kind = variable.type === 'list' ? 'list' : 'var';
    const noun = kind === 'list' ? 'list' : 'variable';
    const newName = normalizeCloudName(rawName.trim().replace(/[[\]]/g, ''), variable.isCloud);
    const oldName = variable.name;
    if (newName === oldName) return { unchanged: true };
    if (!newName.replace(CLOUD_PREFIX, '').trim()) return { error: `A ${noun} needs a name` };
    if (nameTaken(vm, target, newName, kind)) return { error: `Couldn’t rename: a ${noun} named [${newName}] already exists` };

    if (typeof target.renameVariable === 'function') {
        target.renameVariable(variableId, newName);
    } else {
        variable.name = newName;
    }
    for (const t of vm.runtime.targets) {
        for (const block of Object.values(t.blocks._blocks || {})) {
            for (const field of Object.values(block.fields || {})) {
                if (field.id === variableId) field.value = newName;
            }
        }
    }
    refreshScratchWorkspace(vm);
    return { oldName, newName, scope: target.isStage ? 'global' : 'local', spriteName: target.isStage ? '__stage__' : target.sprite.name };
}

export function setVariableValue(vm, targetId, variableId, value) {
    if (typeof vm.setVariableValue === 'function' && vm.setVariableValue(targetId, variableId, value)) return true;
    const found = findVariable(vm, targetId, variableId);
    if (!found) return false;
    found.variable.value = value;
    return true;
}

export function deleteVariable(vm, targetId, variableId) {
    const found = findVariable(vm, targetId, variableId);
    if (!found) return null;
    const { target, variable } = found;
    const snapshot = { id: variable.id, name: variable.name, type: variable.type, isCloud: variable.isCloud, value: Array.isArray(variable.value) ? [...variable.value] : variable.value };
    if (typeof target.deleteVariable === 'function') target.deleteVariable(variableId);
    else delete target.variables[variableId];
    refreshScratchWorkspace(vm);
    return {
        name: snapshot.name,
        kind: snapshot.type === 'list' ? 'list' : 'var',
        restore() {
            target.createVariable(snapshot.id, snapshot.name, snapshot.type, snapshot.isCloud);
            target.variables[snapshot.id].value = snapshot.value;
            refreshScratchWorkspace(vm);
        },
    };
}

export function projectRunState(vm) {
    const stage = stageOf(vm);
    const pausedFlag = stage && Object.values(stage.variables).find(v => v.name === '__dbg_at__');
    if (pausedFlag && pausedFlag.value == 1) return 'paused';
    return vm.runtime.threads.length > 0 ? 'running' : 'stopped';
}
