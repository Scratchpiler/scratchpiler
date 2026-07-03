import { updateStatus } from "./editor.js";
import { injectedBlockIds, persistInjectedIds, restoreInjectedIds } from "./inject-state.js";

export { formatSource } from "./format.js";

// [M] Block Injector

export function injectBlocks(blockMap, vm, spriteName, headerRoots) {
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

    // Drop stale header-marker comments (their block is gone or being replaced)
    if (target.comments) {
        for (const [cid, c] of Object.entries(target.comments)) {
            if (typeof c?.text === 'string' && c.text.startsWith('scratchpiler:include=') &&
                (!c.blockId || idsToDelete.has(c.blockId) || !target.blocks._blocks?.[c.blockId])) {
                try { delete target.comments[cid]; } catch (_) {}
            }
        }
    }

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

    // Mark header-origin scripts with a workspace comment so the decompiler
    // can collapse them back to `#include <name.h>`.
    if (headerRoots && Object.keys(headerRoots).length > 0) {
        const rootHeader = (b) => {
            if (b.opcode === 'procedures_definition') {
                const inp = b.inputs?.custom_block;
                const protoId = inp ? (Array.isArray(inp) ? inp[1] : (inp.block ?? inp.shadow)) : null;
                const name = ((blockMap[protoId]?.mutation?.proccode) || '').split(' ')[0];
                return headerRoots[name] || null;
            }
            if (b.opcode === 'event_whenbroadcastreceived') {
                const m = (b.fields?.BROADCAST_OPTION?.value ?? '').match(/^__sroutine_(.+)$/);
                return m ? (headerRoots[m[1]] || null) : null;
            }
            return null;
        };
        for (const b of Object.values(blockMap)) {
            if (!b.topLevel || b.shadow) continue;
            const hdr = rootHeader(b);
            if (!hdr) continue;
            const cid = b.id + '_hdr';
            try {
                if (typeof target.createComment === 'function') {
                    target.createComment(cid, b.id, `scratchpiler:include=${hdr}`,
                        (b.x ?? 50), Math.max((b.y ?? 50) - 60, 0), 220, 48, true);
                } else {
                    target.comments = target.comments || {};
                    target.comments[cid] = { id: cid, blockId: b.id, text: `scratchpiler:include=${hdr}`,
                        x: b.x ?? 50, y: Math.max((b.y ?? 50) - 60, 0), width: 220, height: 48, minimized: true };
                }
                const created = target.blocks._blocks?.[b.id];
                if (created) created.comment = cid;
            } catch (_) {}
        }
    }

    // Track only the top-level hat/define IDs for this sprite and persist them
    // to localStorage so cleanup survives page reloads.
    injectedBlockIds.set(spriteName, newTopLevelIds);
    persistInjectedIds(spriteName);

    // Reload the Blockly workspace from VM state.
    try {
        vm.setEditingTarget(target.id);
    } catch (_) {
        try { vm.emitWorkspaceUpdate(); } catch (__) {
            console.warn('[scratchpiler] workspace refresh failed', __);
        }
    }

    updateStatus(`Injected ${count} blocks into "${spriteName}"`);
}


