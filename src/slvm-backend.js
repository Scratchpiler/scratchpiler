import { runPipeline, slc, LegalizeError, SlcError } from 'slvm';
import { irgen, SLVM_OPCODE_SCHEMA } from './irgen.js';
import { uid } from './compiler.js';

const VARIABLE_TYPES = { var: '', list: 'list' };

function vmTargets(vm, spriteName) {
    const stage = vm.runtime.targets.find((t) => t.isStage);
    const sprite = spriteName === '__stage__'
        ? stage
        : vm.runtime.targets.find((t) => !t.isStage && t.sprite.name === spriteName);
    return { stage, sprite };
}

function findVariable(target, name, type) {
    return target && Object.values(target.variables).find((v) => v.name === name && v.type === type);
}

function findPrototype(target, name) {
    return Object.values(target.blocks._blocks ?? {}).find((b) =>
        b.opcode === 'procedures_prototype' && b.mutation?.proccode?.split(' %')[0].trim() === name);
}

const parseList = (json) => {
    try { return JSON.parse(json || '[]'); } catch { return []; }
};

function prepareHeap(stage, staticSlots) {
    const created = [];
    const ensureList = (name) => {
        let list = findVariable(stage, name, 'list');
        if (!list) {
            const id = uid();
            stage.createVariable(id, name, 'list');
            created.push(id);
            list = stage.variables[id];
        }
        if (!Array.isArray(list.value)) list.value = [];
        return list;
    };
    const heap = ensureList('__heap');
    const ptab = ensureList('__ptab');
    const before = { heap: [...heap.value], ptab: [...ptab.value] };
    while (heap.value.length < staticSlots) heap.value.push('');

    return {
        promote(name) {
            const variable = findVariable(stage, name, '');
            if (!variable) {
                return { error: `\`&[${name}]\` requires a global scalar variable (stage, "For all sprites") — sprite-local variables, lists, parameters and loop variables have no address` };
            }
            let slot = ptab.value.indexOf(name) + 1;
            if (slot === 0) {
                if (ptab.value.length >= staticSlots) {
                    return { error: `Too many address-taken variables — the heap reserves ${staticSlots} slots for \`&[…]\`` };
                }
                ptab.value.push(name);
                slot = ptab.value.length;
                heap.value[slot - 1] = variable.value ?? '';
            }
            return { slot };
        },
        rollback() {
            heap.value = before.heap;
            ptab.value = before.ptab;
            for (const id of created) {
                if (typeof stage.deleteVariable === 'function') stage.deleteVariable(id);
                else delete stage.variables[id];
            }
        },
    };
}

export function compileWithSLVM(ast, vm, spriteName, { passes = ['legalize'], heapVars = [], heapStaticSlots = 64 } = {}) {
    const { stage, sprite } = vmTargets(vm, spriteName);
    if (!sprite) return { blocks: {}, errors: [{ line: 1, col: 1, len: 1, message: `Sprite not found: ${spriteName}` }] };
    const heap = ast._usesHeap ? prepareHeap(stage, heapStaticSlots) : null;
    const failed = (errors) => {
        heap?.rollback();
        return { blocks: {}, errors };
    };

    const env = {
        spriteName,
        heapVars,
        promote: (name) => heap.promote(name),
        externProc(name) {
            const proto = findPrototype(sprite, name);
            if (!proto) return null;
            const ids = parseList(proto.mutation.argumentids);
            const names = parseList(proto.mutation.argumentnames);
            return { params: ids.map((_, i) => names[i] ?? `arg${i}`), warp: String(proto.mutation.warp) === 'true' };
        },
        lookup(name) {
            for (const [owner, target] of [['sprite', sprite], ['stage', stage]]) {
                if (findVariable(target, name, '')) return { kind: 'var', owner };
                if (findVariable(target, name, 'list')) return { kind: 'list', owner };
            }
            return null;
        },
        routineParamVars(routine) {
            const reserved = new Set([`__sroutine_${routine}_cancelled`, `__sroutine_${routine}_count`]);
            return Object.values(stage.variables)
                .filter((v) => v.type === '' && v.name.startsWith(`__sroutine_${routine}_`) && !reserved.has(v.name))
                .map((v) => v.name)
                .sort();
        },
    };

    const { module, errors } = irgen(ast, env);
    if (errors.length) return failed(errors);

    const ownerOf = (irTarget) => (irTarget.kind === 'stage' ? stage : sprite);
    let out;
    try {
        runPipeline(module, passes);
        out = slc(module, {
            uid,
            opcodes: SLVM_OPCODE_SCHEMA,
            resolveVariable: (irTarget, decl) => findVariable(ownerOf(irTarget), decl.name, VARIABLE_TYPES[decl.kind])?.id,
            resolveBroadcast: (name) => findVariable(stage, name, 'broadcast_msg')?.id,
            resolveProc: (irTarget, proc) => {
                const proto = findPrototype(ownerOf(irTarget), proc.name);
                return proto && { proccode: proto.mutation.proccode, argumentids: parseList(proto.mutation.argumentids), warp: proto.mutation.warp };
            },
        });
    } catch (e) {
        if (!(e instanceof LegalizeError || e instanceof SlcError)) throw e;
        return failed([{ line: 1, col: 1, len: 1, message: `SLVM: ${e.message}` }]);
    }

    for (const outTarget of out.targets) {
        const vmTarget = outTarget.kind === 'stage' ? stage : sprite;
        for (const v of outTarget.variables) {
            const owner = v.type === 'broadcast_msg' ? stage : vmTarget;
            if (!owner.variables[v.id]) owner.createVariable(v.id, v.name, v.type);
        }
    }
    const own = out.targets.find((t) => t.kind === (spriteName === '__stage__' ? 'stage' : 'sprite'));
    return { blocks: own.blocks, errors: [] };
}
