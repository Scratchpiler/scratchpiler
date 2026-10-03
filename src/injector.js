import { updateStatus } from "./editor.js";
import { injectedBlockIds, persistInjectedIds, restoreInjectedIds } from "./inject-state.js";
import { writeComments, removeStaleComments } from "./metadata.js";

export { formatSource } from "./format.js";

// [M] Block Injector

function headerOf(block, blockMap, headerRoots) {
    if (block.opcode === 'procedures_definition') {
        const input = block.inputs?.custom_block;
        const protoId = input ? (Array.isArray(input) ? input[1] : (input.block ?? input.shadow)) : null;
        const name = ((blockMap[protoId]?.mutation?.proccode) || '').split(' ')[0];
        return headerRoots[name] || null;
    }
    if (block.opcode === 'event_whenbroadcastreceived') {
        const match = (block.fields?.BROADCAST_OPTION?.value ?? '').match(/^__sroutine_(.+)$/);
        return match ? (headerRoots[match[1]] || null) : null;
    }
    return null;
}

export function injectBlocks(blockMap, vm, spriteName, headerRoots = {}, comments = []) {
    const target = spriteName === '__stage__'
        ? vm.runtime.targets.find(t => t.isStage)
        : (vm.runtime.targets.find(t => !t.isStage && t.sprite.name === spriteName) || vm.editingTarget);
    if (!target) { updateStatus('Error: sprite not found'); return; }

    // Restore previously-persisted injected IDs from localStorage.
    restoreInjectedIds(spriteName);

    // Build a "hat signature" for a top-level block — a string that uniquely
    // identifies which event/define this block represents. Used to find and
    // remove any pre-existing block that would conflict with the new script,
    // even if localStorage tracking is unavailable (e.g. cleared, new machine,
    // or the project was saved to scratch.mit.edu and reloaded).
    function hatSig(block, blocks) {
        switch (block.opcode) {
            case 'event_whenflagclicked':
            case 'event_whenthisspriteclicked':
            case 'event_whenstageclicked':
            case 'control_start_as_clone':
                return block.opcode;
            case 'event_whenkeypressed':
                return block.opcode + ':' + (block.fields?.KEY_OPTION?.value ?? '');
            case 'event_whenbroadcastreceived':
                return block.opcode + ':' + (block.fields?.BROADCAST_OPTION?.value ?? '');
            case 'event_whenbackdropswitchesto':
                return block.opcode + ':' + (block.fields?.BACKDROP?.value ?? '');
            case 'event_whengreaterthan':
                return block.opcode + ':' + (block.fields?.WHICHINPUT?.value ?? '');
            case 'procedures_definition': {
                // Resolve the prototype block to get the proccode
                const inp = block.inputs?.custom_block;
                const protoId = inp
                    ? (Array.isArray(inp) ? inp[1] : (inp.block ?? inp.shadow))
                    : null;
                const proto = protoId && blocks[protoId];
                return block.opcode + ':' + (proto?.mutation?.proccode ?? '');
            }
            default:
                return block.opcode;
        }
    }

    // Compute signatures of every top-level block in the incoming compilation.
    const incomingSigs = new Set();
    for (const b of Object.values(blockMap)) {
        if (b.topLevel && !b.shadow) incomingSigs.add(hatSig(b, blockMap));
    }

    // Build the full set of IDs to delete:
    //   1. IDs tracked by localStorage (fast path — works on re-compile).
    //   2. Any existing top-level block in the VM whose hat signature matches
    //      an incoming script (catches saved-project duplicates, cleared
    //      localStorage, or blocks left by a previous scratchpiler session
    //      on a different machine).
    const idsToDelete = new Set(injectedBlockIds.get(spriteName) ?? []);
    const existingBlocks = target.blocks._blocks ?? {};
    for (const [id, b] of Object.entries(existingBlocks)) {
        if (b.topLevel && !b.shadow && incomingSigs.has(hatSig(b, existingBlocks))) {
            idsToDelete.add(id);
        }
    }

    // Delete every block in one pass. deleteBlock cascades to children, so
    // only call it on top-level IDs — deleting a child first corrupts the parent.
    for (const id of idsToDelete) {
        try { target.blocks.deleteBlock(id); } catch (_) {}
    }

    removeStaleComments(target, idsToDelete);

    // Collect the top-level hat/define block IDs from the new blockMap so we
    // can persist them for cleanup on the next injection (even after a reload).
    const newTopLevelIds = new Set(
        Object.values(blockMap)
            .filter(b => b.topLevel && !b.shadow)
            .map(b => b.id)
    );

    let count = 0;
    for (const block of Object.values(blockMap)) {
        try {
            target.blocks.createBlock(block);
            count++;
        } catch (e) {
            console.warn('[scratchpiler] block create failed', block.id, e);
        }
    }

    const includes = {};
    for (const block of Object.values(blockMap)) {
        if (!block.topLevel || block.shadow) continue;
        const header = headerOf(block, blockMap, headerRoots);
        if (header) includes[block.id] = header;
    }
    try {
        writeComments(target, blockMap, comments, includes);
    } catch (e) {
        console.warn('[scratchpiler] comment write failed', e);
    }

    // Track only the top-level hat/define IDs for this sprite and persist them
    // to localStorage so cleanup survives page reloads.
    injectedBlockIds.set(spriteName, newTopLevelIds);
    persistInjectedIds(spriteName);

    // Reload the Blockly workspace from VM state. setEditingTarget is a no-op
    // when the target is already being edited, so emit the update directly —
    // otherwise Blockly never sees the new blocks and script glows throw.
    try {
        if (vm.editingTarget?.id === target.id) vm.emitWorkspaceUpdate();
        else vm.setEditingTarget(target.id);
    } catch (e) {
        console.warn('[scratchpiler] workspace refresh failed', e);
    }

    updateStatus(`Injected ${count} blocks into "${spriteName}"`);
}


