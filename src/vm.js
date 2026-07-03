import { updateStatus } from "./editor.js";
import { setScratchIndex } from "./scratch-index.js";

export { scratchIndex } from "./scratch-index.js";

function getFiberRoot() {
    const candidates = [
        document.getElementById('app'),
        document.querySelector('[class*="gui_"]'),
        document.querySelector('[class*="scratch-gui"]'),
        document.body,
    ];
    for (const el of candidates) {
        if (!el) continue;
        const key = Object.keys(el).find(k =>
            k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
        );
        if (!key) continue;
        // Walk up to the HostRoot so BFS covers the whole tree
        let fiber = el[key];
        while (fiber.return) fiber = fiber.return;
        return fiber;
    }
    return null;
}

function isValidVM(v) {
    return v != null
        && typeof v.runtime === 'object'
        && v.runtime.targets !== undefined
        && typeof v.on === 'function';
}

function bfsFindVM(rootFiber) {
    const queue  = [rootFiber];
    const depths = new Map([[rootFiber, 0]]);
    const visited = new Set();
    while (queue.length) {
        const node = queue.shift();
        if (!node || visited.has(node)) continue;
        visited.add(node);
        const depth = depths.get(node) ?? 0;
        if (depth > 200) continue;
        for (const k of ['memoizedProps', 'pendingProps']) {
            const p = node[k];
            if (p && p.vm && isValidVM(p.vm)) return p.vm;
        }
        const sn = node.stateNode;
        if (sn && sn.props && sn.props.vm && isValidVM(sn.props.vm)) return sn.props.vm;
        if (node.child)   { depths.set(node.child,   depth + 1); queue.push(node.child); }
        if (node.sibling) { depths.set(node.sibling, depth);     queue.push(node.sibling); }
    }
    return null;
}

export function acquireVM(onFound, onTimeout) {
    if (isValidVM(unsafeWindow.vm)) { onFound(unsafeWindow.vm); return; }
    let attempts = 0;
    const iv = setInterval(() => {
        if (++attempts > 30) {
            clearInterval(iv);
            const root = getFiberRoot();
            console.warn('[scratchpiler] VM not found. getFiberRoot()=', root,
                'unsafeWindow.vm=', unsafeWindow.vm,
                'app el=', document.getElementById('app'),
                'body keys with __react=', Object.keys(document.body).filter(k => k.startsWith('__react')));
            if (root) {
                // log first 5 nodes to see what we're traversing
                let n = root; let i = 0;
                while (n && i++ < 5) { console.warn('[scratchpiler] fiber node', i, n.type, n.memoizedProps); n = n.child; }
            }
            onTimeout();
            return;
        }
        if (isValidVM(unsafeWindow.vm)) { clearInterval(iv); onFound(unsafeWindow.vm); return; }
        const root = getFiberRoot();
        if (!root) return;
        const vm = bfsFindVM(root);
        if (vm) { clearInterval(iv); onFound(vm); }
    }, 500);
}

// Index project

export function reindex(vm) {
    const idx = {
        sprites: [], stage: { backdrops: [], sounds: [] },
        globalVariables: [], spriteVariables: {}, customBlocks: {},
    };
    for (const target of vm.runtime.targets) {
        const costumes = target.sprite.costumes.map(c => c.name);
        const sounds   = target.sprite.sounds.map(s => s.name);
        const vars = Object.values(target.variables).map(v => ({
            name: v.name, id: v.id, type: v.type === 'list' ? 'list' : 'variable',
        }));
        if (target.isStage) {
            idx.stage.backdrops = costumes;
            idx.stage.sounds    = sounds;
            idx.globalVariables = vars;
        } else {
            const name = target.sprite.name;
            idx.sprites.push({ name, costumes, sounds });
            idx.spriteVariables[name] = vars;
            idx.customBlocks[name] = Object.values(target.blocks._blocks)
                .filter(b => b.opcode === 'procedures_prototype')
                .map(b => b.mutation && b.mutation.proccode)
                .filter(Boolean);
        }
    }
    setScratchIndex(idx);
    updateStatus(`Index: ${idx.sprites.length} sprites, ${idx.globalVariables.length} globals`);
}
