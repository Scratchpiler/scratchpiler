import { runPipeline, slc, LegalizeError, SlcError, VerificationError } from 'slvm';
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

function indexVariables(target) {
    const types = new Map();
    for (const variable of Object.values(target?.variables ?? {})) {
        if (!types.has(variable.type)) types.set(variable.type, new Map());
        const names = types.get(variable.type);
        if (!names.has(variable.name)) names.set(variable.name, variable);
    }
    return (name, type) => types.get(type)?.get(name);
}

function indexPrototypes(target) {
    const prototypes = new Map();
    for (const block of Object.values(target.blocks._blocks ?? {})) {
        if (block.opcode !== 'procedures_prototype') continue;
        const name = block.mutation?.proccode?.split(' %')[0].trim();
        if (name && !prototypes.has(name)) prototypes.set(name, block);
    }
    return (name) => prototypes.get(name);
}

const parseList = (json) => {
    try { return JSON.parse(json || '[]'); } catch { return []; }
};

function prepareHeap(stage, staticSlots, findStageVariable) {
    const created = [];
    const ensureList = (name) => {
        let list = findStageVariable(name, 'list');
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
            const variable = findStageVariable(name, '');
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
    let findStageVariable = indexVariables(stage);
    const findPrototype = indexPrototypes(sprite);
    const heap = ast._usesHeap ? prepareHeap(stage, heapStaticSlots, findStageVariable) : null;
    if (heap) findStageVariable = indexVariables(stage);
    const findSpriteVariable = sprite === stage ? findStageVariable : indexVariables(sprite);

    const env = {
        spriteName,
        heapVars,
        promote: (name) => {
            if (sprite !== stage && (findSpriteVariable(name, '') || findSpriteVariable(name, 'list'))) {
                return { error: `\`&[${name}]\` requires a global scalar variable; a sprite-local variable or list shadows this name` };
            }
            return heap.promote(name);
        },
        externProc(name) {
            const proto = findPrototype(name);
            if (!proto) return null;
            const ids = parseList(proto.mutation.argumentids);
            const names = parseList(proto.mutation.argumentnames);
            return { params: ids.map((_, i) => names[i] ?? `arg${i}`), warp: String(proto.mutation.warp) === 'true' };
        },
        lookup(name, kind) {
            for (const [owner, find] of [['sprite', findSpriteVariable], ['stage', findStageVariable]]) {
                if (kind !== 'list' && find(name, '')) return { kind: 'var', owner };
                if (kind !== 'var' && find(name, 'list')) return { kind: 'list', owner };
            }
            return null;
        },
        routineParamVars(routine) {
            const signature = findStageVariable(`__sroutine_${routine}_params`, 'list');
            if (Array.isArray(signature?.value)) return signature.value.map(param => `__sroutine_${routine}_${param}`);
            const reserved = new Set([`__sroutine_${routine}_cancelled`, `__sroutine_${routine}_count`]);
            return Object.values(stage.variables)
                .filter((v) => v.type === '' && v.name.startsWith(`__sroutine_${routine}_`) && !reserved.has(v.name))
                .map((v) => v.name);
        },
    };

    const findFor = (irTarget) => irTarget.kind === 'stage' ? findStageVariable : findSpriteVariable;
    let out;
    let emitted = false;
    try {
        const { module, errors } = irgen(ast, env);
        if (errors.length) return { blocks: {}, errors };
        runPipeline(module, passes);
        out = slc(module, {
            uid,
            opcodes: SLVM_OPCODE_SCHEMA,
            resolveVariable: (irTarget, decl) => findFor(irTarget)(decl.name, VARIABLE_TYPES[decl.kind])?.id,
            resolveBroadcast: (name) => findStageVariable(name, 'broadcast_msg')?.id,
            resolveProc: (irTarget, proc) => {
                const proto = findPrototype(proc.name);
                return proto && { proccode: proto.mutation.proccode, argumentids: parseList(proto.mutation.argumentids), warp: proto.mutation.warp };
            },
        });
        emitted = true;
    } catch (e) {
        if (!(e instanceof LegalizeError || e instanceof SlcError || e instanceof VerificationError)) throw e;
        return { blocks: {}, errors: [{ line: 1, col: 1, len: 1, message: `SLVM: ${e.message}` }] };
    } finally {
        if (!emitted) heap?.rollback();
    }

    for (const outTarget of out.targets) {
        const vmTarget = outTarget.kind === 'stage' ? stage : sprite;
        for (const v of outTarget.variables) {
            const owner = v.type === 'broadcast_msg' ? stage : vmTarget;
            if (!owner.variables[v.id]) owner.createVariable(v.id, v.name, v.type);
        }
    }
    for (const routine of ast.blocks.filter(block => block.type === 'ScratchroutineStmt')) {
        const name = `__sroutine_${routine.name}_params`;
        let signature = findStageVariable(name, 'list');
        if (!signature) {
            const id = uid();
            stage.createVariable(id, name, 'list');
            signature = stage.variables[id];
        }
        signature.value = [...routine.params];
    }
    const own = out.targets.find((t) => t.kind === (spriteName === '__stage__' ? 'stage' : 'sprite'));
    return { blocks: own.blocks, errors: [] };
}
