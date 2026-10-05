import { analyze } from "./analyzer.js";

export const STAGE = '__stage__';
export const ROUTINE_MESSAGE_PREFIX = '__sroutine_';

const SPRITE_ARGUMENT = {
    touching: 0, distanceTo: 0, attributeOf: 1,
    xOf: 0, yOf: 0, directionOf: 0, costumeNumOf: 0, costumeNameOf: 0, sizeOf: 0, volumeOf: 0,
};
const SPRITE_TARGET_STATEMENTS = new Set(['GoToStmt', 'GlideToStmt', 'PointTowardsStmt']);
const BACKDROP_SWITCHES = new Set(['SwitchBackdropStmt', 'SwitchBackdropWaitStmt', 'NextBackdropStmt']);
export const YIELDING_STATEMENTS = new Set([
    'WaitStmt', 'WaitUntilStmt', 'GlideStmt', 'GlideToStmt', 'SayForStmt', 'ThinkForStmt',
    'AwaitStmt', 'BroadcastWaitStmt', 'AskAndWaitStmt', 'PlayUntilDoneStmt', 'SwitchBackdropWaitStmt',
]);
export const LOOP_STATEMENTS = new Set(['ForeverStmt', 'RepeatStmt', 'RepeatUntilStmt', 'WhileStmt', 'ForStmt', 'PyForStmt', 'DoWhileStmt']);
const POSITION_KEYS = new Set(['line', 'col', 'endLine', 'endCol']);

export const varKey = (owner, kind, name) => `${owner}\u0001${kind}\u0001${name}`;
export function parseVarKey(key) {
    const [owner, kind, name] = key.split('\u0001');
    return { owner, kind, name };
}

export function ownerOf(index, sprite, kind, name) {
    if (sprite === STAGE) return STAGE;
    const local = (index.spriteVariables?.[sprite] || []).some(v => v.name === name && v.type === kind);
    return local ? sprite : STAGE;
}

const literal = node => node && node.type === 'Str' ? node : null;
const stringSpan = node => node.endLine !== undefined
    ? { line: node.line, col: node.col, endLine: node.endLine, endCol: node.endCol }
    : { line: node.line, col: node.col, endLine: node.line, endCol: node.col + node.value.length + 2 };

function children(node) {
    const out = [];
    for (const [key, value] of Object.entries(node)) {
        if (POSITION_KEYS.has(key) || !value || typeof value !== 'object') continue;
        if (Array.isArray(value)) value.forEach(v => v && typeof v === 'object' && out.push(v));
        else out.push(value);
    }
    return out;
}

export function walkNodes(root, visit) {
    const stack = (Array.isArray(root) ? [...root].reverse() : [root]).map(node => [node, false]);
    while (stack.length) {
        const [node, inLoop] = stack.pop();
        if (!node || typeof node !== 'object') continue;
        if (visit(node, inLoop) === false) continue;
        const next = children(node);
        const loops = inLoop || LOOP_STATEMENTS.has(node.type);
        for (let i = next.length - 1; i >= 0; i--) stack.push([next[i], loops]);
    }
}

export function maxLineOf(node) {
    let max = node.line ?? 0;
    walkNodes(node, n => {
        if (typeof n.line === 'number' && n.line > max) max = n.line;
        if (typeof n.endLine === 'number' && n.endLine > max) max = n.endLine;
    });
    return max;
}

export function exprKey(node) {
    return JSON.stringify(node, (key, value) => POSITION_KEYS.has(key) ? undefined : value);
}

const HAT_LABELS = {
    flag: () => 'when flag clicked',
    click: () => 'when clicked',
    clone: () => 'when I start as a clone',
    key: hat => `when ${hat.key} key pressed`,
    receive: hat => `when I receive "${hat.msg}"`,
    backdrop: hat => `when backdrop is "${hat.backdrop}"`,
    greaterThan: hat => `when ${String(hat.sense).toLowerCase()} >`,
};
export const hatLabel = hat => (HAT_LABELS[hat.event] ?? (() => `on ${hat.event}`))(hat);

function unitsOf(ast, sprite) {
    const units = [];
    for (const block of ast.blocks || []) {
        const base = { sprite, node: block, line: block.line, col: block.col, endLine: maxLineOf(block) };
        if (block.type === 'OnBlock') {
            units.push({ ...base, kind: 'script', hat: block.hat, label: hatLabel(block.hat), body: block.body || [] });
        } else if (block.type === 'ScratchroutineStmt') {
            const hat = { event: 'receive', msg: ROUTINE_MESSAGE_PREFIX + block.name, routine: block.name };
            units.push({ ...base, kind: 'script', hat, name: block.name, label: `scratchroutine ${block.name}`, body: block.body || [] });
        } else if (block.type === 'DefineBlock') {
            units.push({ ...base, kind: 'proc', name: block.name, warp: !!block.warp || !!block.returns, label: `define ${block.name}`, body: block.body || [] });
        } else if (block.type !== 'EnumDecl' && block.type !== 'StructDecl') {
            units.push({ ...base, kind: 'orphan', label: 'loose blocks', body: block.body || [block] });
        }
    }
    for (const unit of units) unit.key = `${sprite}:${unit.line}:${unit.col}`;
    return units;
}

function collectUnitFacts(unit, defineNames) {
    const facts = {
        calls: new Set(), sends: [], dynamicSend: false, cloneTargets: [], dynamicClone: false,
        spriteRefs: [], attributeRefs: [], stops: new Set(), deletesClone: false,
        switchesBackdrop: false, asm: null,
    };
    const spriteRef = (node, via) => {
        const str = literal(node);
        if (str) facts.spriteRefs.push({ name: str.value, span: stringSpan(str), via });
    };
    walkNodes(unit.body, (node, inLoop) => {
        switch (node.type) {
            case 'CallStmt':
            case 'CallExpr':
                if (defineNames.has(node.name)) facts.calls.add(node.name);
                if (node.type === 'CallExpr' && node.name in SPRITE_ARGUMENT) {
                    const target = node.args?.[SPRITE_ARGUMENT[node.name]];
                    spriteRef(target, node.name);
                    if (node.name === 'attributeOf') {
                        const prop = literal(node.args?.[0]);
                        const owner = target ? literal(target) : { value: '_stage_' };
                        if (prop && owner) facts.attributeRefs.push({ prop: prop.value, sprite: owner.value, span: stringSpan(prop) });
                    }
                }
                break;
            case 'BroadcastStmt':
            case 'BroadcastWaitStmt': {
                const msg = literal(node.msg);
                if (msg) facts.sends.push({ msg: msg.value, wait: node.type === 'BroadcastWaitStmt', inLoop, span: stringSpan(msg), stmt: { line: node.line, col: node.col } });
                else facts.dynamicSend = true;
                break;
            }
            case 'LaunchStmt':
            case 'AwaitStmt':
                facts.sends.push({ msg: ROUTINE_MESSAGE_PREFIX + node.name, wait: node.type === 'AwaitStmt', routine: node.name, inLoop,
                    span: node.nameSpan ?? { line: node.line, col: node.col, endLine: node.line, endCol: node.col + 1 }, stmt: { line: node.line, col: node.col } });
                break;
            case 'StopStmt':
                if (node.option !== 'this script') facts.stops.add(node.option);
                break;
            case 'CreateCloneStmt': {
                const str = typeof node.target === 'string' ? { value: node.target } : literal(node.target);
                if (!str) facts.dynamicClone = true;
                else if (str.line === undefined) facts.cloneTargets.push({ name: str.value, span: null });
                else {
                    facts.cloneTargets.push({ name: str.value, span: stringSpan(str) });
                    spriteRef(str, 'createClone');
                }
                break;
            }
            case 'DeleteCloneStmt':
                facts.deletesClone = true;
                break;
            case 'AsmStmt':
                facts.asm = (facts.asm ?? '') + JSON.stringify(node.statements);
                return false;
            default:
                if (BACKDROP_SWITCHES.has(node.type)) facts.switchesBackdrop = true;
        }
        if (SPRITE_TARGET_STATEMENTS.has(node.type)) spriteRef(node.target, node.type);
    });
    return facts;
}

function accessesByUnit(units, analysis, sprite, index) {
    const sorted = [...units].sort((a, b) => a.line - b.line);
    for (const unit of sorted) unit.accesses = [];
    const occurrenceAt = new Map();
    for (const occ of analysis.occurrences) {
        const kind = occ.symbol.kind === 'projectVar' ? 'variable' : occ.symbol.kind === 'projectList' ? 'list' : null;
        if (!kind || occ.isDef) continue;
        const key = varKey(ownerOf(index, sprite, kind, occ.symbol.name), kind, occ.symbol.name);
        const access = { key, access: occ.access ?? 'read', span: { line: occ.line, col: occ.col, endLine: occ.endLine ?? occ.line, endCol: occ.endCol ?? occ.col + 1 } };
        occurrenceAt.set(`${occ.line}:${occ.col}`, access);
        const unit = sorted.findLast(u => u.line <= occ.line);
        if (unit && occ.line <= unit.endLine) unit.accesses.push(access);
    }
    return occurrenceAt;
}

export function extractFileFacts(sprite, text, index, existingAnalysis = null) {
    const analysis = existingAnalysis ?? analyze(text, sprite);
    const units = unitsOf(analysis.ast, sprite);
    const procs = new Map(units.filter(u => u.kind === 'proc').map(u => [u.name, u]));
    const defineNames = new Set(procs.keys());
    for (const unit of units) Object.assign(unit, collectUnitFacts(unit, defineNames));
    const occurrenceAt = accessesByUnit(units, analysis, sprite, index);
    const receives = units.filter(u => u.kind === 'script' && u.hat.event === 'receive').map(u => ({
        msg: u.hat.msg, routine: u.hat.routine ?? null, unit: u,
        span: u.hat.msgSpan ?? u.node.nameSpan ?? { line: u.line, col: u.col, endLine: u.line, endCol: u.col + 1 },
    }));
    return {
        sprite, text, index, analysis, units, procs, receives, occurrenceAt,
        lineCount: analysis._expand?.userLineCount ?? text.split('\n').length,
        hasParseErrors: analysis.parseErrors.length > 0,
    };
}
