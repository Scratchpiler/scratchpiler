import { mkOp, ref, lit, sym, OPS } from 'slvm';
import { ASM_OPCODES } from './asm-opcodes.js';
import { fuzzyMatch } from './compiler.js';

const REPORTERS = {
    xPos: ['motion_xposition'],
    yPos: ['motion_yposition'],
    direction: ['motion_direction'],
    size: ['looks_size'],
    timer: ['sensing_timer'],
    answer: ['sensing_answer'],
    mouseDown: ['sensing_mousedown'],
    mouseX: ['sensing_mousex'],
    mouseY: ['sensing_mousey'],
    loudness: ['sensing_loudness'],
    costumeNum: ['looks_costumenumbername', { NUMBER_NAME: 'number' }],
    costumeName: ['looks_costumenumbername', { NUMBER_NAME: 'name' }],
    volume: ['sound_volume'],
    username: ['sensing_username'],
    daysSince2000: ['sensing_dayssince2000'],
};

const MATH_FUNCTIONS = {
    abs: 'abs', sqrt: 'sqrt', floor: 'floor', ceiling: 'ceiling', ceil: 'ceiling',
    sin: 'sin', cos: 'cos', tan: 'tan', asin: 'asin', acos: 'acos', atan: 'atan',
    ln: 'ln', log: 'log', exp: 'exp', pow10: 'pow10',
};

const SENSING_OF = {
    xOf: 'x position', yOf: 'y position', directionOf: 'direction',
    costumeNumOf: 'costume #', costumeNameOf: 'costume name', sizeOf: 'size', volumeOf: 'volume',
};

const BINARY_OPS = { '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', mod: 'mod', '<': 'lt', '>': 'gt', '=': 'eq', and: 'and', or: 'or' };
const BOOL_OPS = new Set(['lt', 'gt', 'eq', 'and', 'or', 'not', 'contains', 'list.has', 'truthy', 'arg.b']);
const BOOL_SB = new Set(['sensing_touchingobject', 'sensing_touchingcolor', 'sensing_coloristouchingcolor', 'sensing_keypressed', 'sensing_mousedown']);

const SIMPLE_STATEMENTS = {
    MoveStmt: ['motion_movesteps', { STEPS: 'steps' }],
    GoToXYStmt: ['motion_gotoxy', { X: 'x', Y: 'y' }],
    GlideStmt: ['motion_glidesecstoxy', { SECS: 'secs', X: 'x', Y: 'y' }],
    SetXStmt: ['motion_setx', { X: 'value' }],
    SetYStmt: ['motion_sety', { Y: 'value' }],
    ChangeXStmt: ['motion_changexby', { DX: 'value' }],
    ChangeYStmt: ['motion_changeyby', { DY: 'value' }],
    BounceStmt: ['motion_ifonedgebounce', {}],
    SetDirectionStmt: ['motion_pointindirection', { DIRECTION: 'degrees' }],
    SayStmt: ['looks_say', { MESSAGE: 'msg' }],
    SayForStmt: ['looks_sayforsecs', { MESSAGE: 'msg', SECS: 'secs' }],
    ThinkStmt: ['looks_think', { MESSAGE: 'msg' }],
    ThinkForStmt: ['looks_thinkforsecs', { MESSAGE: 'msg', SECS: 'secs' }],
    NextCostumeStmt: ['looks_nextcostume', {}],
    NextBackdropStmt: ['looks_nextbackdrop', {}],
    SetSizeStmt: ['looks_setsizeto', { SIZE: 'value' }],
    ChangeSizeStmt: ['looks_changesizeby', { CHANGE: 'value' }],
    ShowStmt: ['looks_show', {}],
    HideStmt: ['looks_hide', {}],
    ClearEffectsStmt: ['looks_cleargraphiceffects', {}],
    GoToFrontStmt: ['looks_gotofrontback', {}, { FRONT_BACK: 'front' }],
    GoToBackStmt: ['looks_gotofrontback', {}, { FRONT_BACK: 'back' }],
    MoveForwardLayersStmt: ['looks_goforwardbackwardlayers', { NUM: 'layers' }, { FORWARD_BACKWARD: 'forward' }],
    MoveBackwardLayersStmt: ['looks_goforwardbackwardlayers', { NUM: 'layers' }, { FORWARD_BACKWARD: 'backward' }],
    SwitchCostumeStmt: ['looks_switchcostumeto', { COSTUME: 'name' }],
    SwitchBackdropStmt: ['looks_switchbackdropto', { BACKDROP: 'name' }],
    SwitchBackdropWaitStmt: ['looks_switchbackdroptoandwait', { BACKDROP: 'name' }],
    PlayStmt: ['sound_play', { SOUND_MENU: 'sound' }],
    PlayUntilDoneStmt: ['sound_playuntildone', { SOUND_MENU: 'sound' }],
    StopSoundsStmt: ['sound_stopallsounds', {}],
    SetVolumeStmt: ['sound_setvolumeto', { VOLUME: 'value' }],
    ChangeVolumeStmt: ['sound_changevolumeby', { VOLUME: 'value' }],
    ClearSoundEffectsStmt: ['sound_cleareffects', {}],
    AskAndWaitStmt: ['sensing_askandwait', { QUESTION: 'question' }],
    ResetTimerStmt: ['sensing_resettimer', {}],
    DeleteCloneStmt: ['control_delete_this_clone', {}],
    PenDownStmt: ['pen_penDown', {}],
    PenUpStmt: ['pen_penUp', {}],
    PenClearStmt: ['pen_clear', {}],
    PenStampStmt: ['pen_stamp', {}],
    SetPenColorStmt: ['pen_setPenColorToColor', { COLOR: 'color' }],
    SetPenSizeStmt: ['pen_setPenSizeTo', { SIZE: 'value' }],
    ChangePenSizeStmt: ['pen_changePenSizeBy', { SIZE: 'value' }],
};

const ASM_CORE_OPS = {
    data_setvariableto: { op: 'var.set', symbol: ['VARIABLE', 'var'], args: ['VALUE'] },
    data_changevariableby: { op: 'var.change', symbol: ['VARIABLE', 'var'], args: ['VALUE'] },
    data_showvariable: { op: 'var.show', symbol: ['VARIABLE', 'var'], args: [] },
    data_hidevariable: { op: 'var.hide', symbol: ['VARIABLE', 'var'], args: [] },
    data_showlist: { op: 'list.show', symbol: ['LIST', 'list'], args: [] },
    data_hidelist: { op: 'list.hide', symbol: ['LIST', 'list'], args: [] },
    data_deletealloflist: { op: 'list.clear', symbol: ['LIST', 'list'], args: [] },
    data_addtolist: { op: 'list.add', symbol: ['LIST', 'list'], args: ['ITEM'] },
    data_deleteoflist: { op: 'list.del', symbol: ['LIST', 'list'], args: ['INDEX'] },
    data_insertatlist: { op: 'list.ins', symbol: ['LIST', 'list'], args: ['INDEX', 'ITEM'] },
    data_replaceitemoflist: { op: 'list.set', symbol: ['LIST', 'list'], args: ['INDEX', 'ITEM'] },
};

export const SLVM_OPCODE_SCHEMA = {
    ...ASM_OPCODES,
    motion_turnright: { params: [{ name: 'DEGREES', kind: 'input', valueType: 'number' }] },
    motion_turnleft: { params: [{ name: 'DEGREES', kind: 'input', valueType: 'number' }] },
    pen_setPenColorToColor: { params: [{ name: 'COLOR', kind: 'input', valueType: 'color' }] },
    looks_costumenumbername: { params: [{ name: 'NUMBER_NAME', kind: 'field', valueType: 'menu' }] },
};

const rand4 = () => Math.random().toString(36).slice(2, 6).padEnd(4, '0');

function addressTaken(ast) {
    const taken = new Map();
    (function visit(n) {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) { n.forEach(visit); return; }
        if (n.type === 'AddrExpr' && !taken.has(n.varName)) taken.set(n.varName, n);
        for (const v of Object.values(n)) if (v && typeof v === 'object') visit(v);
    })(ast.blocks);
    return taken;
}

export function irgen(ast, env) {
    const errors = [];
    const fail = (node, message, len = 1) => {
        errors.push({ line: node?.line || 1, col: node?.col || 1, len, message });
        return null;
    };

    const isStage = env.spriteName === '__stage__';
    const stage = { kind: 'stage', name: null, vars: [], procs: [], scripts: [] };
    const sprite = isStage ? stage : { kind: 'sprite', name: env.spriteName, vars: [], procs: [], scripts: [] };
    const module = { targets: isStage ? [stage] : [stage, sprite] };

    const prefix = `_scratchpiler_internal_${rand4()}_`;
    let hiddenCount = 0;
    const known = new Map();
    const declarations = new Map(module.targets.map(target => [target, new Set()]));

    const declare = (target, kind, name, internal) => {
        const key = `${kind}:${name}`;
        if (!declarations.get(target).has(key)) {
            target.vars.push({ kind, name, internal });
            declarations.get(target).add(key);
        }
        if (!known.has(name)) known.set(name, new Set());
        known.get(name).add(kind);
        return name;
    };
    const hidden = (tag) => declare(sprite, 'var', `${prefix}${tag}${hiddenCount++}`, true);
    const hiddenNamed = (name) => declare(sprite, 'var', name, true);
    const global = (name) => declare(stage, 'var', name, false);

    const heap = ast._usesHeap ? declare(stage, 'list', '__heap', false) : null;
    const ptab = ast._usesHeap ? declare(stage, 'list', '__ptab', false) : null;
    for (const name of env.heapVars ?? []) global(name);
    const promoted = new Map();
    if (heap) {
        for (const [name, node] of addressTaken(ast)) {
            const { slot, error } = env.promote(name);
            if (error) fail(node, error, name.length + 3);
            else promoted.set(name, slot);
        }
    }
    const isPromoted = (name) => promoted.has(name) && !b.scope.has(name) && !b.params.has(name);

    const enums = new Map();
    const defines = new Map();
    const routines = new Map();
    for (const block of ast.blocks) {
        if (block.type === 'EnumDecl') for (const { name, value } of block.entries) enums.set(name, value);
        if (block.type === 'DefineBlock') {
            if (defines.has(block.name)) fail(block, `Duplicate custom block: ${block.name}`, block.name.length);
            defines.set(block.name, block);
            const params = new Set();
            for (const param of block.paramSpans) {
                if (params.has(param.name)) fail(param, `Duplicate parameter: ${param.name}`, param.name.length);
                params.add(param.name);
            }
        }
        if (block.type === 'ScratchroutineStmt') {
            if (routines.has(block.name)) fail(block, `Duplicate scratchroutine: ${block.name}`, block.name.length);
            if (new Set(block.params).size !== block.params.length) fail(block, `Duplicate parameter in scratchroutine: ${block.name}`);
            for (const param of block.paramSpans) {
                if (['count', 'cancelled'].includes(param.name)) fail(param, `Scratchroutine parameter name is reserved: ${param.name}`, param.name.length);
            }
            routines.set(block.name, block);
        }
        if (block.type === 'StructDecl') for (const field of block.fields) global(`${block.name}.${field}`);
    }

    function data(name, kind, node) {
        if (known.get(name)?.has(kind)) return name;
        const found = env.lookup(name, kind);
        if (!found || found.kind !== kind) {
            return fail(node, kind === 'list'
                ? `List not found: ${name}. Create it in Scratch first.`
                : `Variable not found: ${name}`, name.length);
        }
        return declare(found.owner === 'stage' ? stage : sprite, kind, name, false);
    }

    function routineParamVars(name) {
        const routine = routines.get(name);
        if (routine) return routine.params.map((p) => global(`__sroutine_${name}_${p}`));
        return env.routineParamVars(name).map(global);
    }

    function routineExists(name) {
        return routines.has(name) || env.lookup(`__sroutine_${name}_cancelled`) !== null;
    }

    function externProc(name) {
        const existing = sprite.procs.find((p) => p.name === name);
        if (existing) return existing;
        const found = env.externProc?.(name);
        if (!found) return null;
        const proc = { name, params: found.params, warp: found.warp, returns: false, extern: true, body: [] };
        sprite.procs.push(proc);
        return proc;
    }

    let b = null;

    function newRoot(params) {
        b = {
            n: 0,
            region: [],
            bools: new Set(),
            params: new Set(params),
            scope: new Map(),
            loops: [],
            routine: null,
            proc: null,
        };
        return b;
    }

    const emit = (op, args, extra) => { b.region.push(mkOp(op, args, extra)); };
    const value = (op, args, extra = {}) => {
        const id = `v${b.n++}`;
        b.region.push(mkOp(op, args, { ...extra, result: id }));
        if (BOOL_OPS.has(op) || (op === 'sb' && BOOL_SB.has(extra.opcode))) b.bools.add(id);
        return ref(id);
    };
    const originTag = (origin, fn) => {
        const region = b.region;
        const start = region.length;
        fn();
        const head = region.slice(start).find(op => op.result === null);
        if (head) head.tag = { origin };
    };
    const loopHints = (node) => (node.nounroll ? { nounroll: true, tag: { hints: ['nounroll'] } } : {});
    const nested = (fn) => {
        const saved = b.region;
        b.region = [];
        fn();
        const out = b.region;
        b.region = saved;
        return out;
    };
    const withScope = (bindings, fn) => {
        const saved = new Map(b.scope);
        for (const [k, v] of Object.entries(bindings)) b.scope.set(k, v);
        fn();
        b.scope = saved;
    };
    const inLoop = (kind, fn) => {
        b.loops.push(kind);
        const out = fn();
        b.loops.pop();
        return out;
    };

    function boolOf(operand) {
        if (typeof operand.lit === 'boolean') return operand;
        if (operand.ref !== undefined && b.bools.has(operand.ref)) return operand;
        return value('truthy', [operand]);
    }

    const cond = (node) => boolOf(expr(node));
    const scalar = (name, node) => {
        if (b.scope.has(name)) return b.scope.get(name);
        if (b.params.has(name)) return fail(node, `Parameter ${name} is read-only`, name.length);
        return data(name, 'var', node);
    };

    function readVar(name, node) {
        if (b.scope.has(name)) return value('var.get', [sym(b.scope.get(name))]);
        if (b.params.has(name)) return value('arg', [{ name }]);
        if (isPromoted(name)) return value('list.get', [sym(heap), lit(promoted.get(name))]);
        if (!known.get(name)?.has('var') && !env.lookup(name, 'var') && (known.get(name)?.has('list') || env.lookup(name, 'list'))) {
            return value('list.contents', [sym(data(name, 'list', node))]);
        }
        const v = data(name, 'var', node);
        return v === null ? lit(0) : value('var.get', [sym(v)]);
    }

    const menuValue = (node, fallback) => {
        if (typeof node === 'string') return lit(node);
        if (!node) return lit(fallback);
        return expr(node);
    };
    const literalString = (node, fallback) => (node && node.type === 'Str' ? node.value : fallback);

    function sb(opcode, inputs = {}, fields = {}, asValue = false) {
        const keys = [...Object.keys(inputs), ...Object.keys(fields)];
        const args = [...Object.values(inputs), ...Object.values(fields).map((v) => lit(v))];
        return asValue ? value('sb', args, { opcode, keys }) : emit('sb', args, { opcode, keys });
    }

    function callArgs(proc, node) {
        return proc.params.map((_, i) => (node.args[i] ? expr(node.args[i]) : lit('')));
    }

    function expr(node) {
        if (!node) return lit('');
        switch (node.type) {
            case 'Num': return lit(node.value);
            case 'Str': return lit(node.value);
            case 'Hex': return lit(node.value);
            case 'Bool': return lit(node.value ? 1 : 0);
            case 'BoolOf': return boolOf(expr(node.operand));
            case 'Var': return readVar(node.name, node);
            case 'UnaryOp':
                if (node.op === 'not') return value('not', [cond(node.operand)]);
                return value('sub', [lit(0), expr(node.operand)]);
            case 'BinOp': {
                const op = BINARY_OPS[node.op];
                if (!op) return fail(node, `Unknown operator ${node.op}`) ?? lit(0);
                if (op === 'and' || op === 'or') return value(op, [cond(node.left), cond(node.right)]);
                return value(op, [expr(node.left), expr(node.right)]);
            }
            case 'Reporter': return reporter(node);
            case 'CallExpr': return callExpr(node);
            case 'MemberCall': return memberCall(node);
            case 'DerefExpr':
                return value('list.get', [sym(heap), expr(node.addr)]);
            case 'AddrExpr': {
                if (b.scope.has(node.varName) || b.params.has(node.varName)) {
                    return fail(node, `\`&[${node.varName}]\` — parameters and loop variables have no address; copy the value into a global variable first`, node.varName.length + 3) ?? lit(0);
                }
                if (!promoted.has(node.varName)) return lit(0);
                return value('list.index', [sym(ptab), lit(node.varName)]);
            }
            case 'TernaryExpr': {
                const tmp = hidden('tern');
                const c = cond(node.cond);
                const thenOps = nested(() => emit('var.set', [sym(tmp), expr(node.then)]));
                const altOps = nested(() => emit('var.set', [sym(tmp), expr(node.alt)]));
                emit('if', [c], { regions: [thenOps, altOps] });
                return value('var.get', [sym(tmp)]);
            }
        }
        return fail(node, `Cannot compile a \`${node.type}\` expression yet`) ?? lit('');
    }

    function boolExpr(node) {
        if (node && node.type === 'Bool') return lit(!!node.value);
        return cond(node);
    }

    function reporter(node) {
        if (enums.has(node.name)) return expr(enums.get(node.name));
        if (b.params.has(node.name)) return value('arg', [{ name: node.name }]);
        const spec = REPORTERS[node.name];
        if (!spec) return lit('');
        const [opcode, fields = {}] = spec;
        return sb(opcode, {}, fields, true);
    }

    function callExpr(node) {
        const { name } = node;
        const args = node.args || [];
        const arg = (i, fallback) => (args[i] ? expr(args[i]) : lit(fallback));

        const define = defines.get(name);
        if (define) {
            if (!define.returns) {
                return fail(node, `\`${name}\` is a define without a return value — add \`returns\` to its definition to use it in an expression: \`define ${name}(...) returns { ... }\``, name.length) ?? lit(0);
            }
            return value('call', callArgs(define, node), { callee: name });
        }
        if (name in MATH_FUNCTIONS) return value(`math.${MATH_FUNCTIONS[name]}`, [arg(0, 0)]);
        switch (name) {
            case 'length': return value('length', [arg(0, '')]);
            case 'attributeOf': return sb('sensing_of', { OBJECT: arg(1, '_stage_') }, { PROPERTY: literalString(args[0], '') }, true);
            case 'round': return value('round', [arg(0, 0)]);
            case 'random': return value('random', [arg(0, 1), arg(1, 10)]);
            case 'join': return value('join', [arg(0, ''), arg(1, '')]);
            case 'letterOf': return value('letter', [arg(0, 1), arg(1, '')]);
            case 'contains': return value('contains', [arg(0, ''), arg(1, '')]);
            case 'touching': {
                const target = arg(0, 'edge');
                if (target.lit === 'edge') target.lit = '_edge_';
                if (target.lit === 'mouse') target.lit = '_mouse_';
                return sb('sensing_touchingobject', { TOUCHINGOBJECTMENU: target }, {}, true);
            }
            case 'key': return sb('sensing_keypressed', { KEY_OPTION: arg(0, 'space') }, {}, true);
            case 'distanceTo': return sb('sensing_distanceto', { DISTANCETOMENU: arg(0, '_mouse_') }, {}, true);
            case 'currentTime': return sb('sensing_current', {}, { CURRENTMENU: literalString(args[0], 'hour').toUpperCase() }, true);
            case 'clamp': {
                const callee = clampProcedure();
                return value('call', [arg(0, 0), arg(1, 0), arg(2, 100)], { callee });
            }
            case 'isRunning': {
                const rname = args[0] && (args[0].type === 'Str' ? args[0].value : args[0].name);
                if (!rname || !routineExists(rname)) return fail(node, `isRunning: scratchroutine \`${rname}\` has not been defined`) ?? lit(false);
                return value('gt', [value('var.get', [sym(global(`__sroutine_${rname}_count`))]), lit(0)]);
            }
        }
        if (name in SENSING_OF) {
            return sb('sensing_of', { OBJECT: arg(0, '') }, { PROPERTY: SENSING_OF[name] }, true);
        }
        return lit('');
    }

    let clampName = null;
    function clampProcedure() {
        if (clampName) return clampName;
        clampName = `${prefix}clamp`;
        const numericArg = (name, id) => [
            mkOp('arg', [{ name }], { result: `${id}_arg` }),
            mkOp('add', [ref(`${id}_arg`), lit(0)], { result: id }),
        ];
        const maximum = operand => [
            mkOp('gt', [ref('lower'), operand], { result: `${operand.ref}_below` }),
            mkOp('if', [ref(`${operand.ref}_below`)], { regions: [
                [mkOp('ret', [ref('lower')])], [mkOp('ret', [operand])],
            ] }),
        ];
        sprite.procs.push({ name: clampName, params: ['input', 'lo', 'hi'], warp: true, returns: true, noinline: true, body: [
            ...numericArg('input', 'input'), ...numericArg('lo', 'lower'), ...numericArg('hi', 'upper'),
            mkOp('lt', [ref('input'), ref('upper')], { result: 'choose' }),
            mkOp('if', [ref('choose')], { regions: [maximum(ref('input')), maximum(ref('upper'))] }),
        ] });
        return clampName;
    }

    function memberCall(node) {
        const { object, method } = node;
        if (['length', 'len'].includes(method) && object.type !== 'Var') return value('length', [expr(object)]);
        if (object.type !== 'Var') return fail(node, `.${method}() needs a [variable] or [list] before the dot`, method.length) ?? lit('');
        const listName = object.name;
        const isList = known.get(listName)?.has('list') || !!env.lookup(listName, 'list');
        if ((method === 'length' || method === 'len') && !isList) return value('length', [expr(object)]);
        if (method === 'item' && !isList && heap) {
            const base = expr(object);
            return value('list.get', [sym(heap), value('add', [base, node.args[0] ? expr(node.args[0]) : lit(1)])]);
        }
        if (['sum', 'min', 'max', 'count'].includes(method)) {
            return fail(node, `\`.${method}()\` can only be used as \`set [x] to [list].${method}(...)\``, method.length) ?? lit(0);
        }
        const list = data(listName, 'list', object);
        if (list === null) return lit('');
        const L = sym(list);
        switch (method) {
            case 'length':
            case 'len': return value('list.len', [L]);
            case 'contains': return value('list.has', [L, node.args[0] ? expr(node.args[0]) : lit('')]);
            case 'item': return value('list.get', [L, node.args[0] ? expr(node.args[0]) : lit(1)]);
            case 'indexOf':
            case 'itemNumber': return value('list.index', [L, node.args[0] ? expr(node.args[0]) : lit('')]);
        }
        return fail(node, `Unknown method .${method}() — expression methods: .length(), .contains(item), .item(index), .indexOf(item) | statement method: .sort() / .sort("desc")`, method.length) ?? lit('');
    }

    function body(stmts) {
        return nested(() => statements(stmts));
    }

    function statements(stmts) {
        for (const node of stmts || []) {
            stmt(node);
            const last = b.region.at(-1);
            if (!last) continue;
            if (last.op === 'forever') {
                const breaks = (region) => region.some(op => op.op === 'break' ||
                    (!OPS[op.op]?.loop && op.regions.some(breaks)));
                if (!breaks(last.regions[0])) break;
            } else if (last.op === 'stop' && ['all', 'this script'].includes(last.args[0]?.lit)) {
                break;
            } else if (OPS[last.op]?.terminator) {
                break;
            }
        }
    }

    function loopRegion(kind, stmts) {
        return inLoop(kind, () => body(stmts));
    }

    function untilLoop(condNode, stmts, kind, step = [], extra = {}) {
        const condOps = nested(() => emit('cond', [cond(condNode)]));
        const bodyOps = loopRegion(kind, stmts);
        const stepOps = body(step);
        emit('until', [], { regions: stepOps.length ? [condOps, bodyOps, stepOps] : [condOps, bodyOps], ...extra });
    }

    const at = (node) => ({ line: node.line, col: node.col });
    const S = {
        Var: (name, node) => ({ type: 'Var', name, ...at(node) }),
        Num: (v, node) => ({ type: 'Num', value: v, ...at(node) }),
        Str: (v, node) => ({ type: 'Str', value: v, ...at(node) }),
        Bin: (op, l, r, node) => ({ type: 'BinOp', op, left: l, right: r, ...at(node) }),
        Not: (e, node) => ({ type: 'UnaryOp', op: 'not', operand: e, ...at(node) }),
        Set: (name, v, node) => ({ type: 'SetVarStmt', varName: name, value: v, ...at(node) }),
        Change: (name, v, node) => ({ type: 'ChangeVarStmt', varName: name, value: v, ...at(node) }),
        Item: (list, i, node) => ({ type: 'MemberCall', object: { type: 'Var', name: list, ...at(node) }, method: 'item', args: [i], ...at(node) }),
        Len: (list, node) => ({ type: 'MemberCall', object: { type: 'Var', name: list, ...at(node) }, method: 'length', args: [], ...at(node) }),
        Until: (c, stmts, node) => ({ type: 'RepeatUntilStmt', cond: c, body: stmts, ...at(node) }),
        If: (c, then, node) => ({ type: 'IfStmt', cond: c, then, alt: null, ...at(node) }),
    };

    function forLoop(node) {
        const iter = hiddenNamed(`_scratchpiler_internal_${rand4()}_${node.varName}`);
        emit('var.set', [sym(iter), expr(node.from)]);
        withScope({ [node.varName]: iter }, () => {
            untilLoop(S.Bin('>', S.Var(node.varName, node), node.to, node), node.body, 'for', [S.Change(node.varName, S.Num(1, node), node)], loopHints(node));
        });
    }

    function pyforLoop(node) {
        const list = data(node.listName, 'list', node);
        if (list === null) {
            fail(node, `\`pyfor\` requires a list — [${node.listName}] is not found. Create a list in Scratch first.`, node.listName.length);
            return;
        }
        const tag = rand4();
        const ctr = hiddenNamed(`_scratchpiler_internal_${tag}_pyfor_ctr`);
        const item = hiddenNamed(`_scratchpiler_internal_${tag}_${node.varName}`);
        emit('var.set', [sym(ctr), lit(1)]);
        withScope({ [node.varName]: item, [ctr]: ctr }, () => {
            untilLoop(S.Bin('>', S.Var(ctr, node), S.Len(list, node), node),
                [S.Set(node.varName, S.Item(list, S.Var(ctr, node), node), node), ...node.body],
                'pyfor', [S.Change(ctr, S.Num(1, node), node)]);
        });
    }

    function sortList(node) {
        const list = node.object.name;
        if (data(list, 'list', node) === null) return;
        const desc = node.args.length > 0 && node.args[0].type === 'Str' && node.args[0].value === 'desc';
        const tag = rand4();
        const names = Object.fromEntries(['gap', 'i', 'j', 'tmp'].map((k) => [k, hiddenNamed(`_scratchpiler_internal_${tag}_${k}`)]));
        const { gap, i, j, tmp } = names;
        const V = (n) => S.Var(n, node);
        const N = (v) => S.Num(v, node);
        const bin = (op, l, r) => S.Bin(op, l, r, node);
        const item = (idx) => S.Item(list, idx, node);
        const replace = (idx, v) => ({ type: 'ListReplaceStmt', listName: list, index: idx, item: v, ...at(node) });
        const set = (n, v) => S.Set(n, v, node);
        const until = (c, stmts) => S.Until(c, stmts, node);
        const shiftBody = [replace(V(j), item(bin('-', V(j), V(gap)))), set(j, bin('-', V(j), V(gap)))];
        const shiftStop = bin('or', S.Not(bin('>', V(j), V(gap)), node), S.Not(bin(desc ? '<' : '>', item(bin('-', V(j), V(gap))), V(tmp)), node));
        const insertBody = [set(tmp, item(V(i))), set(j, V(i)), until(shiftStop, shiftBody), replace(V(j), V(tmp)), S.Change(i, N(1), node)];
        const passBody = [set(i, bin('+', V(gap), N(1))), until(bin('>', V(i), S.Len(list, node)), insertBody),
            set(gap, { type: 'CallExpr', name: 'floor', args: [bin('/', V(gap), N(3))], ...at(node) })];
        const grow = bin('+', bin('*', V(gap), N(3)), N(1));
        withScope(Object.fromEntries(Object.values(names).map((n) => [n, n])), () => {
            for (const s of [set(gap, N(1)), until(S.Not(bin('<', grow, S.Len(list, node)), node), [set(gap, grow)]), until(bin('<', V(gap), N(1)), passBody)]) stmt(s);
        });
    }

    function aggregate(node) {
        const { method, object } = node.value;
        const list = data(object.name, 'list', object);
        if (list === null) return;
        const tag = rand4();
        const tmp = hiddenNamed(`_scratchpiler_internal_${tag}_agg_tmp`);
        const ctr = hiddenNamed(`_scratchpiler_internal_${tag}_agg_ctr`);
        const item = hiddenNamed(`_scratchpiler_internal_${tag}_agg_item`);
        const V = (n) => S.Var(n, node);
        const N = (v) => S.Num(v, node);
        const init = method === 'min' || method === 'max' ? S.Set(tmp, S.Item(list, N(1), node), node) : S.Set(tmp, N(0), node);
        const update = {
            sum: S.Change(tmp, V(item), node),
            min: S.If(S.Bin('<', V(item), V(tmp), node), [S.Set(tmp, V(item), node)], node),
            max: S.If(S.Bin('>', V(item), V(tmp), node), [S.Set(tmp, V(item), node)], node),
            count: S.If(S.Bin('=', V(item), node.value.args[0] || N(0), node), [S.Change(tmp, N(1), node)], node),
        }[method];
        withScope({ [tmp]: tmp, [ctr]: ctr, [item]: item }, () => {
            stmt(S.Set(ctr, N(1), node));
            stmt(init);
            stmt(S.Until(S.Bin('>', V(ctr), S.Len(list, node), node), [S.Set(item, S.Item(list, V(ctr), node), node), update, S.Change(ctr, N(1), node)], node));
            stmt(S.Set(node.varName, V(tmp), node));
        });
    }

    function asm(node) {
        for (const inner of node.statements) {
            const schema = ASM_OPCODES[inner.opcode];
            if (!schema && node.mode === 'strict') {
                const similar = fuzzyMatch(inner.opcode, Object.keys(ASM_OPCODES));
                const hint = similar.length ? `  Did you mean: ${similar.map((s) => `\`${s}\``).join('  or  ')}?` : '';
                fail(inner, `__asm__ volatile: unknown opcode \`${inner.opcode}\`.${hint}  Use \`__asm__ volatile unsafe(...)\` to allow opcodes outside the known list.`, inner.opcode.length);
                continue;
            }
            if (schema && inner.args.length !== schema.params.length) {
                fail(inner, `__asm__: \`${inner.opcode}\` expects ${schema.params.length} argument(s) (${schema.params.map((p) => p.name).join(', ')}), got ${inner.args.length}`, inner.opcode.length);
                continue;
            }
            const operand = (a) => {
                if (a.kind === 'reg') return readVar(a.name, a);
                if (a.valueType === 'boolean') return lit(!!a.value);
                return lit(a.value);
            };
            const params = schema ? schema.params : inner.args.map((_, i) => ({ name: `VALUE${i}`, kind: 'input', valueType: 'string' }));
            const byName = Object.fromEntries(params.map((p, i) => [p.name, inner.args[i]]));
            const core = ASM_CORE_OPS[inner.opcode];
            if (core) {
                const [field, kind] = core.symbol;
                const reg = byName[field];
                if (!reg || reg.kind !== 'reg') {
                    fail(inner, `__asm__: \`${inner.opcode}\` argument \`${field}\` must be a register (variable name), not a literal`);
                    continue;
                }
                const target = kind === 'var' ? scalar(reg.name, reg) : data(reg.name, 'list', reg);
                if (target === null) continue;
                emit(core.op, [sym(target), ...core.args.map((n) => operand(byName[n]))]);
                continue;
            }
            const inputs = {};
            const fields = {};
            for (const p of params) {
                const a = byName[p.name];
                if (p.valueType === 'variable' || p.valueType === 'list') {
                    fail(inner, `__asm__: \`${inner.opcode}\` takes a ${p.valueType} field, which is only supported for data_* opcodes`);
                    continue;
                }
                if (p.kind === 'field') fields[p.name] = a.kind === 'reg' ? a.name : String(a.value);
                else if (p.menuShadow) inputs[p.name] = lit(a.kind === 'reg' ? a.name : String(a.value));
                else if (p.valueType === 'boolean') inputs[p.name] = boolOf(operand(a));
                else inputs[p.name] = operand(a);
            }
            sb(inner.opcode, inputs, fields);
        }
    }

    function stmt(node) {
        if (!node) return;
        if (node.type === 'DeleteCloneStmt' && b.routine) {
            const count = global(`__sroutine_${b.routine}_count`);
            emit('var.change', [sym(count), lit(-1)]);
            sb('control_delete_this_clone');
            emit('var.change', [sym(count), lit(1)]);
            return;
        }
        const simple = SIMPLE_STATEMENTS[node.type];
        if (simple) {
            const [opcode, inputs, fields = {}] = simple;
            sb(opcode, Object.fromEntries(Object.entries(inputs).map(([k, f]) => [k, expr(node[f])])), fields);
            return;
        }
        switch (node.type) {
            case 'SetVarStmt': {
                if (node.value?.type === 'MemberCall' && ['sum', 'min', 'max', 'count'].includes(node.value.method)) {
                    aggregate(node);
                    return;
                }
                const v = expr(node.value);
                if (isPromoted(node.varName)) {
                    emit('list.set', [sym(heap), lit(promoted.get(node.varName)), v]);
                    return;
                }
                const target = scalar(node.varName, node);
                if (target !== null) emit('var.set', [sym(target), v]);
                return;
            }
            case 'ChangeVarStmt': {
                if (isPromoted(node.varName)) {
                    const amount = expr(node.value);
                    const sum = value('add', [readVar(node.varName, node), amount]);
                    emit('list.set', [sym(heap), lit(promoted.get(node.varName)), sum]);
                    return;
                }
                const v = expr(node.value);
                const target = scalar(node.varName, node);
                if (target !== null) emit('var.change', [sym(target), v]);
                return;
            }
            case 'DerefSetStmt': {
                const addr = expr(node.addr);
                emit('list.set', [sym(heap), addr, expr(node.value)]);
                return;
            }
            case 'IfStmt': {
                const c = cond(node.cond);
                const regions = [body(node.then)];
                if (node.alt) regions.push(body(node.alt));
                emit('if', [c], { regions });
                return;
            }
            case 'RepeatStmt': {
                const n = expr(node.count);
                emit('repeat', [n], { regions: [loopRegion('repeat', node.body)], ...loopHints(node) });
                return;
            }
            case 'ForeverStmt':
                emit('forever', [], { regions: [loopRegion('forever', node.body)] });
                return;
            case 'RepeatUntilStmt':
                untilLoop(node.cond, node.body, 'until');
                return;
            case 'WhileStmt':
                untilLoop({ type: 'UnaryOp', op: 'not', operand: node.cond, ...at(node) }, node.body, 'while');
                return;
            case 'DoWhileStmt': {
                const flag = hidden('dowhile');
                emit('var.set', [sym(flag), lit('true')]);
                withScope({ [flag]: flag }, () => {
                    untilLoop(S.Bin('=', S.Var(flag, node), S.Str('false', node), node), node.body, 'dowhile',
                        [{ type: 'SetVarStmt', varName: flag, value: { type: 'BoolOf', operand: node.cond }, ...at(node) }]);
                });
                return;
            }
            case 'MatchStmt': {
                const tmp = hidden('match');
                emit('var.set', [sym(tmp), expr(node.subject)]);
                withScope({ [tmp]: tmp }, () => {
                    let alt = node.defaultBody;
                    for (let i = node.cases.length - 1; i >= 0; i--) {
                        const c = node.cases[i];
                        const test = c.values.map((v) => S.Bin('=', S.Var(tmp, c), v, c)).reduce((l, r) => S.Bin('or', l, r, c));
                        alt = [{ type: 'IfStmt', cond: test, then: c.body, alt, ...at(c) }];
                    }
                    for (const s of alt || []) stmt(s);
                });
                return;
            }
            case 'ForStmt': originTag('for', () => forLoop(node)); return;
            case 'PyForStmt': originTag('pyfor', () => pyforLoop(node)); return;
            case 'BreakStmt':
            case 'ContinueStmt': {
                const kw = node.type === 'BreakStmt' ? 'break' : 'continue';
                const loop = b.loops.at(-1);
                if (!loop) { fail(node, `\`${kw}\` is only valid inside a loop`, kw.length); return; }
                emit(kw, []);
                return;
            }
            case 'ReturnStmt': {
                const hasValue = node.value !== null && node.value !== undefined;
                if (!b.proc) {
                    if (hasValue) { fail(node, '`return <value>` is only valid inside a `define … returns { }` block', 6); return; }
                    if (b.routine) emit('var.change', [sym(global(`__sroutine_${b.routine}_count`)), lit(-1)]);
                    emit('stop', [lit('this script')]);
                    return;
                }
                if (hasValue && !b.proc.returns) {
                    fail(node, `\`return\` with a value requires the define to be declared with \`returns\`: \`define ${b.proc.name}(...) returns { ... }\``, 6);
                    return;
                }
                emit('ret', hasValue ? [expr(node.value)] : []);
                return;
            }
            case 'WaitStmt': emit('wait', [expr(node.duration)]); return;
            case 'WaitUntilStmt': {
                const condOps = nested(() => emit('cond', [cond(node.cond)]));
                emit('wait.until', [], { regions: [condOps] });
                return;
            }
            case 'StopStmt':
                if (b.routine && node.option === 'this script') emit('var.change', [sym(global(`__sroutine_${b.routine}_count`)), lit(-1)]);
                emit('stop', [lit(node.option)]);
                return;
            case 'BroadcastStmt': emit('broadcast', [expr(node.msg)]); return;
            case 'BroadcastWaitStmt': emit('broadcast.wait', [expr(node.msg)]); return;
            case 'CallStmt': {
                if (node.name === 'yield') { emit('wait', [lit(0)]); return; }
                const define = defines.get(node.name) ?? externProc(node.name);
                if (!define) { fail(node, `Custom block not found: ${node.name}`, node.name.length); return; }
                emit('call', callArgs(define, node), { callee: node.name });
                return;
            }
            case 'TurnStmt':
                sb(node.dir === 'left' ? 'motion_turnleft' : 'motion_turnright', { DEGREES: expr(node.degrees) });
                return;
            case 'GoToStmt': sb('motion_goto', { TO: menuValue(node.target, '_mouse_') }); return;
            case 'GlideToStmt': sb('motion_glideto', { SECS: expr(node.secs), TO: menuValue(node.target, '_mouse_') }); return;
            case 'PointTowardsStmt': sb('motion_pointtowards', { TOWARDS: menuValue(node.target, '_mouse_') }); return;
            case 'CreateCloneStmt': sb('control_create_clone_of', { CLONE_OPTION: menuValue(node.target, '_myself_') }); return;
            case 'SetEffectStmt': sb('looks_seteffectto', { VALUE: expr(node.value) }, { EFFECT: literalString(node.effect, 'color') }); return;
            case 'ChangeEffectStmt': sb('looks_changeeffectby', { CHANGE: expr(node.amount) }, { EFFECT: literalString(node.effect, 'color') }); return;
            case 'SetSoundEffectStmt': sb('sound_seteffectto', { VALUE: expr(node.value) }, { SOUND_EFFECT: literalString(node.effect, 'pitch').toUpperCase() }); return;
            case 'ChangeSoundEffectStmt': sb('sound_changeeffectby', { VALUE: expr(node.value) }, { SOUND_EFFECT: literalString(node.effect, 'pitch').toUpperCase() }); return;
            case 'SetDragModeStmt': sb('sensing_setdragmode', {}, { DRAG_MODE: literalString(node.mode, 'draggable') }); return;
            case 'SetRotationStyleStmt': sb('motion_setrotationstyle', {}, { STYLE: literalString(node.style, 'all around') }); return;
            case 'SetPenColorParamStmt': sb('pen_setPenColorParamTo', { COLOR_PARAM: lit(literalString(node.param, 'color')), VALUE: expr(node.value) }); return;
            case 'ChangePenColorParamStmt': sb('pen_changePenColorParamBy', { COLOR_PARAM: lit(literalString(node.param, 'color')), VALUE: expr(node.amount) }); return;
            case 'ShowVarStmt':
            case 'HideVarStmt': {
                const v = scalar(node.name, node);
                if (v !== null) emit(node.type === 'ShowVarStmt' ? 'var.show' : 'var.hide', [sym(v)]);
                return;
            }
            case 'ShowListStmt':
            case 'HideListStmt': {
                const l = data(node.name, 'list', node);
                if (l !== null) emit(node.type === 'ShowListStmt' ? 'list.show' : 'list.hide', [sym(l)]);
                return;
            }
            case 'ListAddStmt': case 'ListDeleteStmt': case 'ListInsertStmt': case 'ListReplaceStmt': case 'ListDeleteAllStmt': {
                const l = data(node.listName, 'list', node);
                if (l === null) return;
                const L = sym(l);
                if (node.type === 'ListAddStmt') emit('list.add', [L, expr(node.item)]);
                else if (node.type === 'ListDeleteStmt') emit('list.del', [L, expr(node.index)]);
                else if (node.type === 'ListInsertStmt') { const item = expr(node.item); emit('list.ins', [L, expr(node.index), item]); }
                else if (node.type === 'ListReplaceStmt') { const index = expr(node.index); emit('list.set', [L, index, expr(node.item)]); }
                else emit('list.clear', [L]);
                return;
            }
            case 'PopulateListStmt': {
                const l = data(node.listName, 'list', node);
                if (l === null) return;
                const clearFirst = node.clearFirst;
                const literal = clearFirst.type === 'Num' || clearFirst.type === 'Bool';
                if (!literal || Number(clearFirst.value) !== 0) {
                    const clear = () => emit('list.clear', [sym(l)]);
                    if (literal) clear();
                    else emit('if', [cond(clearFirst)], { regions: [nested(clear)] });
                }
                const n = expr(node.countExpr);
                emit('repeat', [n], { regions: [nested(() => emit('list.add', [sym(l), expr(node.valueExpr)]))] });
                return;
            }
            case 'MemberCallStmt':
                if (node.method !== 'sort') {
                    fail(node, `Unknown statement-level method .${node.method}() — only .sort() / .sort("desc") are supported`, node.method.length);
                    return;
                }
                originTag('sort', () => sortList(node));
                return;
            case 'LaunchStmt':
            case 'AwaitStmt': {
                const params = routineParamVars(node.name);
                node.args.forEach((a, i) => { if (params[i]) emit('var.set', [sym(params[i]), expr(a)]); });
                emit(node.type === 'AwaitStmt' ? 'broadcast.wait' : 'broadcast', [lit(`__sroutine_${node.name}`)]);
                return;
            }
            case 'CancelStmt':
                if (!routineExists(node.name)) { fail(node, `\`cancel ${node.name}\`: scratchroutine \`${node.name}\` has not been defined`, 6); return; }
                emit('var.set', [sym(global(`__sroutine_${node.name}_cancelled`)), lit(1)]);
                return;
            case 'CheckCancelStmt': {
                if (!b.routine) { fail(node, '`checkCancel()` must be used inside a `scratchroutine` body', 11); return; }
                const flag = value('var.get', [sym(global(`__sroutine_${b.routine}_cancelled`))]);
                emit('if', [value('eq', [flag, lit(1)])], { regions: [nested(() => {
                    emit('var.change', [sym(global(`__sroutine_${b.routine}_count`)), lit(-1)]);
                    emit('stop', [lit('this script')]);
                })] });
                return;
            }
            case 'BreakpointStmt': {
                const atVar = global('__dbg_at__');
                const resume = global('__dbg_resume__');
                emit('var.set', [sym(atVar), lit(1)]);
                emit('var.set', [sym(resume), lit(0)]);
                const condOps = nested(() => emit('cond', [value('eq', [value('var.get', [sym(resume)]), lit(1)])]));
                emit('wait.until', [], { regions: [condOps] });
                emit('var.set', [sym(atVar), lit(0)]);
                return;
            }
            case 'AsmStmt': asm(node); return;
            case 'UnknownStmt':
            case 'RawKeyword':
                return;
        }
        fail(node, `Cannot compile a \`${node.type}\` statement yet`);
    }

    const HATS = {
        flag: () => ({ event: 'flag', arg: null }),
        click: () => ({ event: 'clicked', arg: null }),
        clone: () => ({ event: 'clone', arg: null }),
        key: (h) => ({ event: 'key', arg: h.key || 'space' }),
        receive: (h) => ({ event: 'receive', arg: h.msg || '' }),
        backdrop: (h) => ({ event: 'backdrop', arg: h.backdrop || '' }),
        greaterThan: (h) => (h.threshold?.type === 'Num'
            ? { event: 'greater', arg: h.sense, value: Number(h.threshold.value) }
            : { event: 'greater', arg: h.sense, threshold: h.threshold }),
    };

    const rootTag = (block, hints = []) => ({ hints, span: block._synthetic ? null : block.span });

    for (const block of ast.blocks) {
        if (block.type === 'OnBlock') {
            const hatOf = HATS[block.hat.event];
            const hat = hatOf ? hatOf(block.hat) : fail(block.hat, `Unknown event \`${block.hat.event}\``);
            if (!hat) continue;
            newRoot([]);
            if (hat.threshold) {
                const threshold = hat.threshold;
                delete hat.threshold;
                hat.with = nested(() => emit('value', [expr(threshold)]));
                if (hat.with.some((op) => op.op !== 'value' && (op.result === null || op.op === 'call'))) {
                    fail(threshold, `\`on ${hat.arg.toLowerCase()} > …\` can only use a plain expression (no custom block calls or ternaries)`);
                    continue;
                }
            }
            statements(block.body);
            sprite.scripts.push({ hat, body: b.region, tag: rootTag(block) });
        } else if (block.type === 'DefineBlock') {
            newRoot(block.params);
            b.proc = block;
            statements(block.body);
            sprite.procs.push({ name: block.name, params: [...block.params], warp: !!(block.returns || block.warp || block._forceWarp || env.externProc?.(block.name)?.warp), returns: !!block.returns, body: b.region,
                ...((block.noinline || block._synthetic) && { noinline: true }), tag: rootTag(block, block.noinline ? ['noinline'] : []) });
        } else if (block.type === 'ScratchroutineStmt') {
            const name = block.name;
            const params = routineParamVars(name);
            const cancelled = global(`__sroutine_${name}_cancelled`);
            const count = global(`__sroutine_${name}_count`);
            newRoot([]);
            b.routine = name;
            withScope(Object.fromEntries(block.params.map((p, i) => [p, params[i]])), () => {
                emit('var.set', [sym(cancelled), lit(0)]);
                emit('var.change', [sym(count), lit(1)]);
                statements(block.body);
                if (!b.region.at(-1) || !['stop', 'forever'].includes(b.region.at(-1).op)) emit('var.change', [sym(count), lit(-1)]);
            });
            sprite.scripts.push({ hat: { event: 'receive', arg: `__sroutine_${name}` }, body: b.region });
        }
    }

    return { module: errors.length ? null : module, errors };
}
