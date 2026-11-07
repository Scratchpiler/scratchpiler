const GLOW_EVENTS = new Set(['SCRIPT_GLOW_ON', 'SCRIPT_GLOW_OFF', 'BLOCK_GLOW_ON', 'BLOCK_GLOW_OFF', 'VISUAL_REPORT']);

let vm = null;
let isCovered = () => false;
let pending = null;

export function attachScratchView(machine, covered) {
    if (vm === machine) return;
    vm = machine;
    isCovered = covered;
    pending = null;
    const emit = vm.emit;
    vm.emit = function (name, ...args) {
        if (pending && GLOW_EVENTS.has(name)) return false;
        return emit.call(this, name, ...args);
    };
}

export function showInScratch(machine, target, { changed = false } = {}) {
    if (!machine || !target) return;
    if (machine === vm && isCovered()) {
        pending = { targetId: target.id, stale: changed || !!pending?.stale };
        return;
    }
    apply(machine, target, changed);
}

export function scratchBlocksChanged(machine) {
    if (machine === vm && pending) pending.stale = true;
    else showInScratch(machine, machine?.editingTarget, { changed: true });
}

export function flushScratchView() {
    if (!vm || !pending || isCovered()) return;
    const { targetId, stale } = pending;
    pending = null;
    const target = vm.runtime.getTargetById(targetId);
    if (target) apply(vm, target, stale);
    if (Array.isArray(vm.runtime._scriptGlowsPreviousFrame)) vm.runtime._scriptGlowsPreviousFrame = [];
}

export function forgetScratchView() {
    pending = null;
}

function apply(machine, target, changed) {
    try {
        if (machine.editingTarget?.id !== target.id) machine.setEditingTarget(target.id);
        else if (changed) machine.emitWorkspaceUpdate();
    } catch (e) {
        console.warn('[scratchpiler] workspace refresh failed', e);
    }
}
