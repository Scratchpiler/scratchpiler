import { cast } from 'slvm';
import { tokenize, parse, PTR_HELPERS_SRC } from '../../src/compiler.js';

const { toNumber, toBoolean, toString, compare, EVAL } = cast;

class Break {}
class Continue {}
class Return {
    constructor(value) { this.value = value; }
}
export class OracleLimit extends Error {}

const BINARY = { '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', mod: 'mod', '<': 'lt', '>': 'gt', '=': 'eq' };
const MATH = { abs: 'math.abs', floor: 'math.floor', sqrt: 'math.sqrt', ceiling: 'math.ceiling', ceil: 'math.ceiling' };

const HEAP_STATIC_SLOTS = 64;

function walk(node, visit) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((n) => walk(n, visit)); return; }
    visit(node);
    for (const v of Object.values(node)) if (v && typeof v === 'object') walk(v, visit);
}

const listIndex = (index, length, extra = 0) => {
    const i = Math.floor(toNumber(index));
    return i >= 1 && i <= length + extra ? i - 1 : -1;
};

export function runOracle(source, { maxSteps = 200000, initialVars = {}, initialLists = {} } = {}) {
    const { ast, errors } = parse(tokenize(source));
    if (errors.length) throw new Error(`oracle: parse errors: ${errors.map((e) => e.message).join('; ')}`);

    const vars = new Map(Object.entries(initialVars));
    const lists = new Map(Object.entries(initialLists));
    const said = [];
    const scalarNames = new Set(Object.keys(initialVars));
    const listNames = new Set(Object.keys(initialLists));
    walk(ast.blocks, n => {
        if (n.type === 'SetVarStmt' || n.type === 'ChangeVarStmt') scalarNames.add(n.varName);
        if (n.listName) listNames.add(n.listName);
    });
    let usesHeap = false;
    let usesAllocator = false;
    const addressTaken = [];
    walk(ast.blocks, (n) => {
        if (n.type === 'MemberCall' && n.method === 'item' && n.object.type === 'Var' && scalarNames.has(n.object.name) && !listNames.has(n.object.name)) usesHeap = true;
        if (n.type === 'AddrExpr' || n.type === 'DerefExpr' || n.type === 'DerefSetStmt') usesHeap = true;
        if ((n.type === 'CallExpr' || n.type === 'CallStmt') && (n.name === 'alloc' || n.name === 'free')) usesAllocator = true;
        if (n.type === 'AddrExpr' && !addressTaken.includes(n.varName)) addressTaken.push(n.varName);
    });
    if (usesAllocator && !ast.blocks.some((b) => b.type === 'DefineBlock' && (b.name === 'alloc' || b.name === 'free'))) {
        ast.blocks.push(...parse(tokenize(PTR_HELPERS_SRC)).ast.blocks);
    }
    usesHeap ||= usesAllocator;
    const promoted = new Map(addressTaken.map((name, i) => [name, i + 1]));
    if (usesHeap) {
        lists.set('__heap', Array(HEAP_STATIC_SLOTS).fill(''));
        lists.set('__ptab', [...addressTaken]);
        for (const name of addressTaken) lists.get('__heap')[promoted.get(name) - 1] = 0;
    }
    const isPromoted = (name, frame) => promoted.has(name) && !frame.locals.has(name) && !frame.params.has(name);
    const heapGet = (index) => {
        const heap = lists.get('__heap');
        const i = listIndex(index, heap.length);
        return i < 0 ? '' : heap[i];
    };
    const heapSet = (index, value) => {
        const heap = lists.get('__heap');
        const i = listIndex(index, heap.length);
        if (i >= 0) heap[i] = value;
    };
    const defines = new Map(ast.blocks.filter((b) => b.type === 'DefineBlock').map((b) => [b.name, b]));
    let steps = 0;
    const tick = () => { if (++steps > maxSteps) throw new OracleLimit('oracle: step limit'); };

    const getVar = (name, frame) => {
        if (frame.locals.has(name)) return frame.locals.get(name);
        if (isPromoted(name, frame)) return heapGet(promoted.get(name));
        return vars.get(name) ?? 0;
    };
    const setVar = (name, value, frame) => {
        if (frame.locals.has(name)) frame.locals.set(name, value);
        else if (isPromoted(name, frame)) heapSet(promoted.get(name), value);
        else vars.set(name, value);
    };
    const list = (name) => {
        if (!lists.has(name)) lists.set(name, []);
        return lists.get(name);
    };

    function literal(node) {
        return typeof node.value === 'number' ? String(node.value) : node.value;
    }

    function evaluate(node, frame) {
        tick();
        switch (node.type) {
            case 'Num': return literal(node);
            case 'Str': return node.value;
            case 'Bool': return node.value ? '1' : '0';
            case 'Var':
                if (frame.params.has(node.name)) return frame.params.get(node.name);
                return getVar(node.name, frame);
            case 'DerefExpr': return heapGet(evaluate(node.addr, frame));
            case 'AddrExpr': return lists.get('__ptab').findIndex((x) => compare(x, node.varName) === 0) + 1;
            case 'Reporter':
                if (frame.params.has(node.name)) return frame.params.get(node.name);
                return '';
            case 'UnaryOp':
                if (node.op === 'not') return !toBoolean(evaluate(node.operand, frame));
                return EVAL.sub('0', evaluate(node.operand, frame));
            case 'BinOp': {
                if (node.op === 'and' || node.op === 'or') {
                    const l = toBoolean(evaluate(node.left, frame));
                    const r = toBoolean(evaluate(node.right, frame));
                    return node.op === 'and' ? l && r : l || r;
                }
                return EVAL[BINARY[node.op]](evaluate(node.left, frame), evaluate(node.right, frame));
            }
            case 'TernaryExpr':
                return toBoolean(evaluate(node.cond, frame)) ? evaluate(node.then, frame) : evaluate(node.alt, frame);
            case 'CallExpr': {
                const args = node.args.map((a) => evaluate(a, frame));
                if (defines.has(node.name)) return call(defines.get(node.name), args);
                if (node.name in MATH) return EVAL[MATH[node.name]](args[0]);
                if (node.name === 'clamp') return Math.max(toNumber(args[1] ?? 0), Math.min(toNumber(args[0] ?? 0), toNumber(args[2] ?? 100)));
                if (node.name === 'length') return toString(args[0] ?? '').length;
                if (node.name === 'round') return EVAL.round(args[0]);
                if (node.name === 'join') return EVAL.join(args[0] ?? '', args[1] ?? '');
                if (node.name === 'letterOf') return EVAL.letter(args[0], args[1]);
                if (node.name === 'contains') return EVAL.contains(args[0], args[1]);
                throw new Error(`oracle: unknown function ${node.name}`);
            }
            case 'MemberCall': {
                if (node.method === 'item' && usesHeap && !lists.has(node.object.name) && node.object.name !== 'L') {
                    return heapGet(EVAL.add(evaluate(node.object, frame), node.args[0] ? evaluate(node.args[0], frame) : '1'));
                }
                const l = list(node.object.name);
                const arg = node.args[0] ? evaluate(node.args[0], frame) : undefined;
                switch (node.method) {
                    case 'length': return l.length;
                    case 'item': {
                        const i = listIndex(arg, l.length);
                        return i < 0 ? '' : l[i];
                    }
                    case 'contains': return l.some((x) => compare(x, arg) === 0);
                    case 'indexOf': return l.findIndex((x) => compare(x, arg) === 0) + 1;
                }
                throw new Error(`oracle: unknown method ${node.method}`);
            }
        }
        throw new Error(`oracle: cannot evaluate ${node.type}`);
    }

    function aggregate(node, frame) {
        const l = list(node.object.name);
        const item = (i) => (i >= 1 && i <= l.length ? l[i - 1] : '');
        let tmp = node.method === 'min' || node.method === 'max' ? item(1) : '0';
        for (let ctr = 1; !(ctr > l.length); ctr++) {
            const x = item(ctr);
            if (node.method === 'sum') tmp = toNumber(tmp) + toNumber(x);
            else if (node.method === 'min' && EVAL.lt(x, tmp)) tmp = x;
            else if (node.method === 'max' && EVAL.gt(x, tmp)) tmp = x;
            else if (node.method === 'count' && EVAL.eq(x, node.args[0] ? evaluate(node.args[0], frame) : '0')) tmp = toNumber(tmp) + 1;
        }
        return tmp;
    }

    function shellSort(l, desc) {
        const item = (i) => (listIndex(i, l.length) < 0 ? '' : l[listIndex(i, l.length)]);
        const replace = (i, x) => { const k = listIndex(i, l.length); if (k >= 0) l[k] = x; };
        const before = desc ? EVAL.lt : EVAL.gt;
        let gap = 1;
        while (EVAL.lt(gap * 3 + 1, l.length)) gap = gap * 3 + 1;
        while (!EVAL.lt(gap, 1)) {
            let i = gap + 1;
            while (!EVAL.gt(i, l.length)) {
                const tmp = item(i);
                let j = i;
                while (EVAL.gt(j, gap) && before(item(j - gap), tmp)) {
                    replace(j, item(j - gap));
                    j -= gap;
                }
                replace(j, tmp);
                i += 1;
            }
            gap = Math.floor(gap / 3);
        }
    }

    function call(define, args) {
        const frame = { params: new Map(define.params.map((p, i) => [p, args[i] ?? ''])), locals: new Map() };
        try {
            execBody(define.body, frame);
        } catch (e) {
            if (e instanceof Return) return e.value;
            throw e;
        }
        return '';
    }

    function loopBody(body, frame) {
        try {
            execBody(body, frame);
        } catch (e) {
            if (e instanceof Break) return false;
            if (!(e instanceof Continue)) throw e;
        }
        return true;
    }

    function execBody(body, frame) {
        for (const s of body || []) exec(s, frame);
    }

    function exec(node, frame) {
        tick();
        const v = (n) => evaluate(n, frame);
        switch (node.type) {
            case 'SetVarStmt':
                if (node.value?.type === 'MemberCall' && ['sum', 'min', 'max', 'count'].includes(node.value.method)) {
                    setVar(node.varName, aggregate(node.value, frame), frame);
                    return;
                }
                setVar(node.varName, v(node.value), frame);
                return;
            case 'PyForStmt': {
                const l = list(node.listName);
                const saved = frame.locals.get(node.varName);
                for (let ctr = 1; !(ctr > l.length); ctr++) {
                    frame.locals.set(node.varName, l[ctr - 1]);
                    if (!loopBody(node.body, frame)) break;
                }
                if (saved === undefined) frame.locals.delete(node.varName);
                else frame.locals.set(node.varName, saved);
                return;
            }
            case 'MemberCallStmt':
                shellSort(list(node.object.name), node.args[0]?.type === 'Str' && node.args[0].value === 'desc');
                return;
            case 'PopulateListStmt': {
                const l = list(node.listName);
                const clear = node.clearFirst.type === 'Num' ? Number(node.clearFirst.value) !== 0 : toBoolean(v(node.clearFirst));
                if (clear) l.splice(0);
                const n = Math.round(toNumber(v(node.countExpr)));
                for (let i = 0; i < n; i++) l.push(v(node.valueExpr));
                return;
            }
            case 'ChangeVarStmt': {
                const delta = v(node.value);
                setVar(node.varName, toNumber(getVar(node.varName, frame)) + toNumber(delta), frame);
                return;
            }
            case 'IfStmt':
                if (toBoolean(v(node.cond))) execBody(node.then, frame);
                else if (node.alt) execBody(node.alt, frame);
                return;
            case 'RepeatStmt': {
                const n = Math.round(toNumber(v(node.count)));
                for (let i = 0; i < n; i++) if (!loopBody(node.body, frame)) break;
                return;
            }
            case 'ForStmt': {
                const saved = frame.locals.has(node.varName) ? frame.locals.get(node.varName) : undefined;
                frame.locals.set(node.varName, v(node.from));
                while (!(compare(frame.locals.get(node.varName), v(node.to)) > 0)) {
                    if (!loopBody(node.body, frame)) break;
                    frame.locals.set(node.varName, toNumber(frame.locals.get(node.varName)) + 1);
                }
                if (saved === undefined) frame.locals.delete(node.varName);
                else frame.locals.set(node.varName, saved);
                return;
            }
            case 'WhileStmt':
                while (toBoolean(v(node.cond))) if (!loopBody(node.body, frame)) break;
                return;
            case 'RepeatUntilStmt':
                while (!toBoolean(v(node.cond))) if (!loopBody(node.body, frame)) break;
                return;
            case 'DoWhileStmt':
                do {
                    if (!loopBody(node.body, frame)) break;
                } while (toBoolean(v(node.cond)));
                return;
            case 'MatchStmt': {
                const subject = v(node.subject);
                const hit = node.cases.find((c) => c.values.some((value) => compare(subject, v(value)) === 0));
                if (hit) execBody(hit.body, frame);
                else if (node.defaultBody) execBody(node.defaultBody, frame);
                return;
            }
            case 'BreakStmt': throw new Break();
            case 'ContinueStmt': throw new Continue();
            case 'ReturnStmt': throw new Return(node.value ? v(node.value) : '');
            case 'CallStmt': {
                if (node.name === 'yield') return;
                call(defines.get(node.name), node.args.map(v));
                return;
            }
            case 'SayStmt': {
                const message = toString(v(node.msg));
                if (message !== '') said.push(message);
                return;
            }
            case 'WaitStmt': v(node.duration); return;
            case 'ListAddStmt': list(node.listName).push(v(node.item)); return;
            case 'ListDeleteStmt': {
                const l = list(node.listName);
                const i = listIndex(v(node.index), l.length);
                if (i >= 0) l.splice(i, 1);
                return;
            }
            case 'ListInsertStmt': {
                const item = v(node.item);
                const l = list(node.listName);
                const i = listIndex(v(node.index), l.length, 1);
                if (i >= 0) l.splice(i, 0, item);
                return;
            }
            case 'ListReplaceStmt': {
                const l = list(node.listName);
                const i = listIndex(v(node.index), l.length);
                const item = v(node.item);
                if (i >= 0) l[i] = item;
                return;
            }
            case 'ListDeleteAllStmt': list(node.listName).splice(0); return;
            case 'DerefSetStmt': {
                const addr = v(node.addr);
                heapSet(addr, v(node.value));
                return;
            }
        }
        throw new Error(`oracle: cannot execute ${node.type}`);
    }

    for (const block of ast.blocks) {
        if (block.type !== 'OnBlock' || block.hat.event !== 'flag') continue;
        execBody(block.body, { params: new Map(), locals: new Map() });
    }

    const text = (x) => (Array.isArray(x) ? x.map(String) : String(x));
    return {
        vars: Object.fromEntries([...vars].map(([k, x]) => [k, text(x)])),
        lists: Object.fromEntries([...lists].map(([k, x]) => [k, text(x)])),
        said,
    };
}
