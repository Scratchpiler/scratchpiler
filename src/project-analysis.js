import { symbolAt } from "./analyzer.js";
import { isCompilerVariable } from "./variables.js";
import {
    STAGE, ROUTINE_MESSAGE_PREFIX, YIELDING_STATEMENTS, LOOP_STATEMENTS,
    extractFileFacts, varKey, parseVarKey, exprKey,
} from "./project-facts.js";

export { STAGE, varKey, parseVarKey } from "./project-facts.js";

const SPECIAL_TARGETS = new Set(['_mouse_', '_random_', '_edge_', '_stage_', '_myself_']);
const SPRITE_ATTRIBUTES = new Set(['x position', 'y position', 'direction', 'costume #', 'costume name', 'size', 'volume']);
const STAGE_ATTRIBUTES = new Set(['backdrop #', 'backdrop name', 'volume']);
const USER_TRIGGERED = new Set(['flag', 'click', 'key', 'greaterThan']);
const CLOUD_PREFIX = '☁';

export const isRoutineMessage = msg => msg.startsWith(ROUTINE_MESSAGE_PREFIX);
const messageKey = name => name.toUpperCase();

export function createProject() {
    return { files: new Map(), index: null, linked: null };
}

export function setProjectFile(project, sprite, text, index, analysis = null) {
    const current = project.files.get(sprite);
    if (current && current.text === text && current.index === index) return false;
    project.files.set(sprite, extractFileFacts(sprite, text, index, analysis));
    project.linked = null;
    return true;
}

export const isFileCurrent = (project, sprite) => project.files.get(sprite)?.index === project.index;

export function removeProjectFile(project, sprite) {
    if (project.files.delete(sprite)) project.linked = null;
}

export function setProjectIndex(project, index) {
    if (project.index === index) return;
    project.index = index;
    project.linked = null;
}

export function spriteNamesOf(index) {
    return [STAGE, ...(index?.sprites || []).map(s => s.name)];
}

export function linkedProject(project, options = {}) {
    if (project.linked && project.linked.options === options) return project.linked;
    project.linked = link(project, options);
    return project.linked;
}

function addTo(map, key, value) {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
}

function reachableProcs(file, unit) {
    const seen = new Set();
    const stack = [...unit.calls];
    while (stack.length) {
        const name = stack.pop();
        if (seen.has(name) || !file.procs.has(name)) continue;
        seen.add(name);
        stack.push(...file.procs.get(name).calls);
    }
    return [...seen].map(name => file.procs.get(name));
}

const effectiveCache = new WeakMap();
const segmentCache = new WeakMap();

function effectiveFacts(file, unit) {
    if (!effectiveCache.has(unit)) effectiveCache.set(unit, computeEffectiveFacts(file, unit));
    return effectiveCache.get(unit);
}

function computeEffectiveFacts(file, unit) {
    const parts = [unit, ...reachableProcs(file, unit)];
    return {
        procs: parts.slice(1),
        accesses: parts.flatMap(p => p.accesses),
        sends: parts.flatMap(p => p.sends),
        dynamicSend: parts.some(p => p.dynamicSend),
        cloneTargets: parts.flatMap(p => p.cloneTargets),
        dynamicClone: parts.some(p => p.dynamicClone),
        attributeRefs: parts.flatMap(p => p.attributeRefs),
        stops: new Set(parts.flatMap(p => [...p.stops])),
        deletesClone: parts.some(p => p.deletesClone),
        switchesBackdrop: parts.some(p => p.switchesBackdrop),
        asm: parts.map(p => p.asm).filter(Boolean).join('') || null,
    };
}

function link(project, options) {
    const index = project.index || { sprites: [], globalVariables: [], spriteVariables: {} };
    const spriteNames = spriteNamesOf(index);
    const files = spriteNames.map(name => project.files.get(name)).filter(Boolean);
    const complete = files.length === spriteNames.length;
    const clean = complete && files.every(f => !f.hasParseErrors);

    const variables = new Map();
    for (const v of index.globalVariables || []) variables.set(varKey(STAGE, v.type, v.name), { owner: STAGE, kind: v.type, name: v.name, id: v.id, accesses: [] });
    for (const [sprite, vars] of Object.entries(index.spriteVariables || {})) {
        for (const v of vars) variables.set(varKey(sprite, v.type, v.name), { owner: sprite, kind: v.type, name: v.name, id: v.id, accesses: [] });
    }

    const threads = [];
    const messages = new Map();
    const message = name => {
        const key = messageKey(name);
        if (!messages.has(key)) messages.set(key, { name, senders: [], receivers: [] });
        return messages.get(key);
    };
    let dynamicSend = false, dynamicClone = false, anyAsm = false;
    const cloned = new Set();

    for (const file of files) {
        for (const unit of file.units) {
            for (const access of unit.accesses) variables.get(access.key)?.accesses.push({ sprite: file.sprite, unit, ...access });
            for (const send of unit.sends) message(send.msg).senders.push({ sprite: file.sprite, unit, ...send });
            dynamicSend ||= unit.dynamicSend;
            dynamicClone ||= unit.dynamicClone;
            anyAsm ||= !!unit.asm;
            for (const clone of unit.cloneTargets) cloned.add(clone.name === '_myself_' ? file.sprite : clone.name);
            for (const ref of unit.attributeRefs) {
                const owner = ref.sprite === '_stage_' ? STAGE : ref.sprite;
                const target = variables.get(varKey(owner, 'variable', ref.prop));
                if (target && (owner === STAGE || owner !== file.sprite)) {
                    target.accesses.push({ sprite: file.sprite, unit, key: varKey(owner, 'variable', ref.prop), access: 'read', span: ref.span, viaAttribute: true });
                }
            }
            if (unit.kind === 'script') threads.push({ file, unit, effects: effectiveFacts(file, unit) });
        }
        for (const receive of file.receives) message(receive.msg).receivers.push({ sprite: file.sprite, unit: receive.unit, span: receive.span, routine: receive.routine });
    }

    const linked = {
        options, index, spriteNames, files: new Map(files.map(f => [f.sprite, f])),
        complete, clean, variables, messages, threads, cloned,
        dynamicSend, dynamicClone, anyAsm,
    };
    linked.diagnostics = projectDiagnostics(linked);
    return linked;
}

const isCloneable = (linked, sprite) => sprite !== STAGE && (linked.dynamicClone || linked.cloned.has(sprite));

const triggerKey = ({ file, unit }) => {
    const hat = unit.hat;
    switch (hat.event) {
        case 'flag': return 'flag';
        case 'key': return `key:${hat.key}`;
        case 'receive': return `receive:${messageKey(hat.msg)}`;
        case 'backdrop': return `backdrop:${hat.backdrop}`;
        case 'click': return `click:${file.sprite}`;
        default: return null;
    }
};

const triggerPhrase = hat => ({
    flag: 'on green flag',
    key: `on key "${hat.key}"`,
    receive: hat.routine ? `when ${hat.routine} launches` : `on "${hat.msg}"`,
    backdrop: `on backdrop "${hat.backdrop}"`,
    click: 'on click',
}[hat.event]);

function firstSegment(file, unit) {
    if (!segmentCache.has(unit)) segmentCache.set(unit, computeFirstSegment(file, unit));
    return segmentCache.get(unit);
}

function computeFirstSegment(file, unit) {
    const reads = [], sets = [];
    const visitingProcs = new Set();
    const accessAt = node => file.occurrenceAt.get(`${node.line}:${node.col}`);
    const readsIn = expr => {
        const found = [];
        const stack = [expr];
        while (stack.length) {
            const node = stack.pop();
            if (!node || typeof node !== 'object') continue;
            if (Array.isArray(node)) { stack.push(...node); continue; }
            if (node.type === 'Var') { const a = accessAt(node); if (a) found.push(a); }
            if (node.type === 'CallExpr' && file.procs.has(node.name)) callProc(node.name);
            for (const [k, v] of Object.entries(node)) if (k !== 'body' && v && typeof v === 'object') stack.push(v);
        }
        reads.push(...found);
    };
    let warp = false;
    function callProc(name) {
        const proc = file.procs.get(name);
        if (!proc || visitingProcs.has(name)) return true;
        visitingProcs.add(name);
        const savedWarp = warp;
        warp ||= proc.warp;
        const finished = runBody(proc.body);
        warp = savedWarp;
        visitingProcs.delete(name);
        return finished;
    }
    function runStatement(stmt) {
        if (!stmt || typeof stmt !== 'object') return true;
        if (YIELDING_STATEMENTS.has(stmt.type)) { readsIn(stmt); return false; }
        if (stmt.type === 'SetVarStmt') {
            readsIn(stmt.value);
            const access = stmt.varSpan && file.occurrenceAt.get(`${stmt.varSpan.line}:${stmt.varSpan.col}`);
            if (access) sets.push({ ...access, value: exprKey(stmt.value) });
            return true;
        }
        if (stmt.type === 'ChangeVarStmt') {
            readsIn(stmt.value);
            const access = stmt.varSpan && file.occurrenceAt.get(`${stmt.varSpan.line}:${stmt.varSpan.col}`);
            if (access) reads.push(access);
            return true;
        }
        if (stmt.type === 'CallStmt' && file.procs.has(stmt.name)) {
            readsIn(stmt.args);
            return callProc(stmt.name);
        }
        if (stmt.type === 'IfStmt') {
            readsIn(stmt.cond);
            const thenFinished = runBody(stmt.then);
            const altFinished = runBody(stmt.alt);
            return thenFinished && altFinished;
        }
        if (LOOP_STATEMENTS.has(stmt.type)) {
            const { body, ...header } = stmt;
            readsIn(header);
            return warp && runBody(body);
        }
        if (stmt.type === 'MatchStmt') {
            readsIn(stmt.subject);
            const bodies = [...(stmt.cases || []).map(c => c.body), stmt.defaultBody];
            return bodies.map(runBody).every(Boolean);
        }
        readsIn(stmt);
        return true;
    }
    function runBody(stmts) {
        for (const stmt of stmts || []) if (!runStatement(stmt)) return false;
        return true;
    }
    runBody(unit.body);
    return { reads, sets };
}

function orderingDiagnostics(linked, push) {
    const periodic = new Set();
    for (const message of linked.messages.values()) {
        if (message.senders.some(s => s.inLoop || s.unit.kind !== 'script')) periodic.add(messageKey(message.name));
    }
    const groups = new Map();
    for (const thread of linked.threads) {
        const key = triggerKey(thread);
        const { hat } = thread.unit;
        if (!key || hat.event === 'receive' && (isRoutineMessage(hat.msg) || periodic.has(messageKey(hat.msg)))) continue;
        addTo(groups, key, thread);
    }
    for (const group of groups.values()) {
        if (group.length < 2) continue;
        const segments = group.map(thread => ({ thread, ...firstSegment(thread.file, thread.unit) }));
        const settersOf = new Map();
        for (const segment of segments) for (const set of segment.sets) addTo(settersOf, set.key, segment);
        for (const reader of segments) {
            const reported = new Set();
            const ownSets = new Set();
            const ownReads = [...reader.reads, ...reader.sets.map(s => ({ ...s, isSet: true }))]
                .sort((a, b) => a.span.line - b.span.line || a.span.col - b.span.col);
            for (const access of ownReads) {
                if (access.isSet) { ownSets.add(access.key); continue; }
                if (ownSets.has(access.key) || reported.has(access.key)) continue;
                const writer = settersOf.get(access.key)?.find(other => other !== reader);
                if (!writer) continue;
                reported.add(access.key);
                const { name } = parseVarKey(access.key);
                const who = writer.thread.file === reader.thread.file ? 'another script here' : spriteName(writer.thread.file.sprite);
                push(reader.thread.file.sprite, access.span, 'warning',
                    `May read \`[${name}]\` before ${who} sets it ${triggerPhrase(reader.thread.unit.hat)}`);
            }
        }
        const finalSets = new Map();
        for (const segment of segments) {
            const last = new Map();
            for (const set of segment.sets) last.set(set.key, set);
            for (const set of last.values()) addTo(finalSets, set.key, { segment, set });
        }
        for (const [key, sites] of finalSets) {
            if (sites.length < 2 || new Set(sites.map(s => s.set.value)).size < 2) continue;
            const { name } = parseVarKey(key);
            for (const { segment, set } of sites) {
                const other = sites.find(s => s.segment !== segment && s.set.value !== set.value);
                const who = other.segment.thread.file === segment.thread.file ? 'another script here' : spriteName(other.segment.thread.file.sprite);
                push(segment.thread.file.sprite, set.span, 'warning',
                    `\`[${name}]\` is also set by ${who} ${triggerPhrase(segment.thread.unit.hat)} — the order decides`);
            }
        }
    }
}

function waitCycleDiagnostics(linked, push) {
    const waitsFrom = new Map();
    for (const thread of linked.threads) {
        if (thread.unit.hat.event !== 'receive') continue;
        for (const send of thread.effects.sends) {
            if (send.wait) addTo(waitsFrom, messageKey(thread.unit.hat.msg), { thread, send, target: messageKey(send.msg) });
        }
    }
    const onCycle = new Set();
    const state = new Map();
    const stack = [];
    const visit = msg => {
        state.set(msg, 'active');
        stack.push(msg);
        for (const { target } of waitsFrom.get(msg) || []) {
            if (state.get(target) === 'active') stack.slice(stack.indexOf(target)).forEach(m => onCycle.add(m));
            else if (!state.has(target)) visit(target);
        }
        stack.pop();
        state.set(msg, 'done');
    };
    for (const msg of waitsFrom.keys()) if (!state.has(msg)) visit(msg);
    for (const [msg, waits] of waitsFrom) {
        if (!onCycle.has(msg)) continue;
        for (const { thread, send, target } of waits) {
            if (!onCycle.has(target)) continue;
            const where = target === msg ? 'restarts its own script' : `waits on "${displayMessage(send.msg)}", which waits back`;
            push(thread.file.sprite, send.span, 'warning', `Never finishes — ${where}`);
        }
    }
}

function variableDiagnostics(linked, push, pushProject) {
    if (!linked.clean || linked.anyAsm) return;
    const monitored = linked.options.monitored ?? new Set();
    for (const [key, variable] of linked.variables) {
        if (isCompilerVariable(variable.name) || variable.name.startsWith(CLOUD_PREFIX) || monitored.has(key)) continue;
        const reads = variable.accesses.filter(a => a.access !== 'write');
        const writes = variable.accesses.filter(a => a.access !== 'read');
        if (!reads.length && !writes.length) {
            pushProject({ severity: 'info', message: `\`[${variable.name}]\` is never used`, varKey: key, owner: variable.owner, kind: variable.kind });
        } else if (!reads.length) {
            for (const write of writes) push(write.sprite, write.span, 'info', `\`[${variable.name}]\` is never read`, ['unnecessary']);
        } else if (!writes.length && variable.kind === 'variable') {
            const first = new Map();
            for (const read of reads) if (!first.has(read.sprite)) first.set(read.sprite, read);
            for (const read of first.values()) push(read.sprite, read.span, 'info', `\`[${variable.name}]\` is never set — it keeps its saved value`);
        }
    }
}

function eventDiagnostics(linked, push) {
    const spriteNames = new Set(linked.spriteNames.filter(n => n !== STAGE));
    for (const message of linked.messages.values()) {
        const { name } = message;
        if (isRoutineMessage(name)) continue;
        if (!message.receivers.length && linked.clean) {
            for (const send of message.senders) push(send.sprite, send.span, 'warning', `Nothing receives "${name}"`);
        }
        if (!message.senders.length && !linked.dynamicSend && linked.clean) {
            for (const receive of message.receivers) push(receive.sprite, receive.span, 'warning', `Never runs — nothing broadcasts "${name}"`);
        }
    }
    for (const file of linked.files.values()) {
        for (const unit of file.units) {
            if (unit.kind === 'script' && unit.hat.event === 'clone' && linked.clean && !isCloneable(linked, file.sprite)) {
                push(file.sprite, { line: unit.hat.line, col: unit.hat.col, endLine: unit.hat.line, endCol: unit.hat.col + 5 }, 'warning',
                    file.sprite === STAGE ? 'The stage has no clones' : 'Never runs — nothing clones this sprite');
            }
            for (const ref of unit.spriteRefs) {
                if (SPECIAL_TARGETS.has(ref.name) || spriteNames.has(ref.name) || !ref.span) continue;
                push(file.sprite, ref.span, 'warning', `No sprite named "${ref.name}"`);
            }
            for (const ref of unit.attributeRefs) {
                const isStage = ref.sprite === '_stage_';
                if (!isStage && !spriteNames.has(ref.sprite)) continue;
                if ((isStage ? STAGE_ATTRIBUTES : SPRITE_ATTRIBUTES).has(ref.prop)) continue;
                if (linked.variables.has(varKey(isStage ? STAGE : ref.sprite, 'variable', ref.prop))) continue;
                push(file.sprite, ref.span, 'warning', `${isStage ? 'The stage' : `"${ref.sprite}"`} has no variable "${ref.prop}"`);
            }
        }
    }
}

export const spriteName = sprite => sprite === STAGE ? 'the Stage' : sprite;
export const displayMessage = msg => isRoutineMessage(msg) ? msg.slice(ROUTINE_MESSAGE_PREFIX.length) : msg;

function projectDiagnostics(linked) {
    const bySprite = new Map(linked.spriteNames.map(n => [n, []]));
    const project = [];
    const seen = new Set();
    const push = (sprite, span, severity, message, tags) => {
        const file = linked.files.get(sprite);
        if (!file || !span || span.line > file.lineCount) return;
        const id = `${sprite}:${span.line}:${span.col}:${message}`;
        if (seen.has(id)) return;
        seen.add(id);
        const len = Math.max(1, (span.endLine ?? span.line) === span.line ? (span.endCol ?? span.col + 1) - span.col : 1);
        bySprite.get(sprite).push({ line: span.line, col: span.col, len, message, severity, category: 'Project', tags });
    };
    eventDiagnostics(linked, push);
    variableDiagnostics(linked, push, item => project.push(item));
    orderingDiagnostics(linked, push);
    waitCycleDiagnostics(linked, push);
    return { bySprite, project };
}

export function diagnosticsFor(linked, sprite) {
    return linked?.diagnostics.bySprite.get(sprite) ?? [];
}

function within(span, line, col) {
    if (line < span.line || line > (span.endLine ?? span.line)) return false;
    if (line === span.line && col < span.col) return false;
    if (line === (span.endLine ?? span.line) && col > (span.endCol ?? span.col + 1)) return false;
    return true;
}

export function projectSymbolAt(linked, sprite, line, col) {
    const file = linked?.files.get(sprite);
    if (!file) return null;
    for (const unit of file.units) {
        for (const send of unit.sends) if (within(send.span, line, col)) return { kind: 'message', name: send.msg, span: send.span };
        for (const ref of unit.attributeRefs) {
            if (!within(ref.span, line, col)) continue;
            const owner = ref.sprite === '_stage_' ? STAGE : ref.sprite;
            const key = varKey(owner, 'variable', ref.prop);
            if (linked.variables.has(key)) return { kind: 'variable', key, span: ref.span, viaAttribute: true };
        }
    }
    for (const receive of file.receives) if (within(receive.span, line, col)) return { kind: 'message', name: receive.msg, span: receive.span };
    const hit = symbolAt(file.analysis, line, col);
    if (hit && (hit.symbol.kind === 'projectVar' || hit.symbol.kind === 'projectList')) {
        const access = file.occurrenceAt.get(`${hit.occurrence.line}:${hit.occurrence.col}`);
        if (access) return { kind: 'variable', key: access.key, span: access.span };
    }
    return null;
}

const visibleIn = (linked, sprite, span) => span && span.line <= (linked.files.get(sprite)?.lineCount ?? 0);

export function messageSites(linked, name) {
    const message = linked?.messages.get(messageKey(name));
    if (!message) return { senders: [], receivers: [] };
    return {
        senders: message.senders.filter(s => visibleIn(linked, s.sprite, s.span)),
        receivers: message.receivers.filter(r => visibleIn(linked, r.sprite, r.span)),
    };
}

export function messageCounts(linked) {
    const counts = new Map();
    for (const [key, message] of linked.messages) {
        const { senders, receivers } = messageSites(linked, message.name);
        counts.set(key, { senders: senders.map(s => s.sprite), receivers: receivers.map(r => r.sprite) });
    }
    return counts;
}

export const countsFor = (counts, name) => counts?.get(messageKey(name)) ?? { senders: [], receivers: [] };

export function variableSites(linked, key) {
    return (linked?.variables.get(key)?.accesses ?? []).filter(a => visibleIn(linked, a.sprite, a.span));
}

function countBySprite(sites) {
    const counts = new Map();
    for (const site of sites) counts.set(site.sprite, (counts.get(site.sprite) ?? 0) + 1);
    return [...counts].map(([sprite, n]) => `${sprite === STAGE ? 'Stage' : sprite}${n > 1 ? ` (${n})` : ''}`).join(', ');
}

export function describeVariable(linked, key) {
    const sites = variableSites(linked, key);
    const writes = sites.filter(s => s.access !== 'read');
    const reads = sites.filter(s => s.access !== 'write');
    return {
        writes: writes.length ? countBySprite(writes) : null,
        reads: reads.length ? countBySprite(reads) : null,
    };
}

export function describeMessage(linked, name) {
    const { senders, receivers } = messageSites(linked, name);
    return { senders, receivers, sentBy: countBySprite(senders), receivedBy: countBySprite(receivers) };
}

export function projectSymbols(linked) {
    const out = [];
    for (const file of linked?.files.values() ?? []) {
        for (const unit of file.units) {
            if (unit.kind === 'orphan' || unit.line > file.lineCount) continue;
            out.push({ sprite: file.sprite, kind: unit.kind === 'proc' ? 'define' : unit.hat.routine ? 'routine' : 'script', name: unit.name ?? unit.label, label: unit.label, line: unit.line, col: unit.col });
        }
        for (const sym of file.analysis.symbols) {
            if ((sym.kind === 'enumMember' || sym.kind === 'struct') && sym.defRange && !sym.headerOrigin) {
                out.push({ sprite: file.sprite, kind: sym.kind, name: sym.name, label: sym.name, line: sym.defRange.line, col: sym.defRange.col });
            }
        }
    }
    return out;
}

const quote = text => '"' + text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\{/g, '{{').replace(/\}/g, '}}') + '"';

export function renameEdits(linked, target, newName) {
    const edits = new Map();
    const add = (sprite, span, text) => addTo(edits, sprite, { span, text });
    if (target.kind === 'message') {
        const { senders, receivers } = messageSites(linked, target.name);
        for (const site of [...senders, ...receivers]) add(site.sprite, site.span, quote(newName));
    } else {
        for (const site of variableSites(linked, target.key)) add(site.sprite, site.span, site.viaAttribute ? quote(newName) : `[${newName}]`);
    }
    return edits;
}

export function eventGraph(linked) {
    const scripts = [], messageNodes = new Map(), edges = [];
    const cloneHats = new Map();
    for (const thread of linked?.threads ?? []) {
        if (thread.unit.line > thread.file.lineCount) continue;
        const id = thread.unit.key;
        const reads = new Set(), writes = new Set();
        for (const a of thread.effects.accesses) {
            if (a.access !== 'write') reads.add(a.key);
            if (a.access !== 'read') writes.add(a.key);
        }
        scripts.push({ id, sprite: thread.file.sprite, label: thread.unit.label, hat: thread.unit.hat, line: thread.unit.line, col: thread.unit.col, reads: [...reads], writes: [...writes] });
        if (thread.unit.hat.event === 'clone') addTo(cloneHats, thread.file.sprite, id);
    }
    const messageNode = name => {
        const key = messageKey(name);
        if (!messageNodes.has(key)) messageNodes.set(key, { id: `msg:${key}`, name: displayMessage(name), routine: isRoutineMessage(name) });
        return messageNodes.get(key).id;
    };
    for (const thread of linked?.threads ?? []) {
        if (thread.unit.line > thread.file.lineCount) continue;
        const sent = new Map();
        for (const send of thread.effects.sends) {
            const node = messageNode(send.msg);
            sent.set(node, sent.get(node) || send.wait);
        }
        for (const [node, wait] of sent) edges.push({ from: thread.unit.key, to: node, kind: wait ? 'wait' : 'send' });
        for (const target of new Set(thread.effects.cloneTargets.map(c => c.name === '_myself_' ? thread.file.sprite : c.name))) {
            for (const hat of cloneHats.get(target) ?? []) edges.push({ from: thread.unit.key, to: hat, kind: 'clone' });
        }
        if (thread.unit.hat.event === 'receive') edges.push({ from: messageNode(thread.unit.hat.msg), to: thread.unit.key, kind: 'receive' });
    }
    return { scripts, messages: [...messageNodes.values()], edges };
}

function threadCanBeInterrupted(linked, thread) {
    const others = linked.threads.filter(t => t !== thread);
    const { hat } = thread.unit;
    if (others.some(t => t.effects.asm || t.effects.stops.has('all'))) return true;
    const sameSprite = others.filter(t => t.file.sprite === thread.file.sprite);
    if (sameSprite.some(t => t.effects.stops.has('other scripts in sprite') || t.effects.deletesClone)) return true;
    if (hat.event === 'receive') {
        if (linked.dynamicSend) return true;
        if (others.some(t => t.effects.sends.some(s => messageKey(s.msg) === messageKey(hat.msg)))) return true;
    }
    if (hat.event === 'backdrop' && others.some(t => t.effects.switchesBackdrop)) return true;
    return !USER_TRIGGERED.has(hat.event) && hat.event !== 'receive' && hat.event !== 'backdrop' && hat.event !== 'clone';
}

function runsAsOneThread(linked, thread) {
    return thread.file.sprite === STAGE || !isCloneable(linked, thread.file.sprite) || thread.unit.hat.event === 'flag';
}

export function slvmFacts(linked, sprite) {
    if (!linked?.clean || linked.anyAsm) return null;
    const file = linked.files.get(sprite);
    if (!file) return null;

    const threadsOf = new Map();
    const touch = (key, thread) => {
        if (!threadsOf.has(key)) threadsOf.set(key, new Set());
        threadsOf.get(key).add(thread);
    };
    for (const thread of linked.threads) {
        for (const access of thread.effects.accesses) touch(access.key, thread);
        for (const ref of thread.effects.attributeRefs) touch(varKey(ref.sprite === '_stage_' ? STAGE : ref.sprite, 'variable', ref.prop), thread);
    }
    const reachedBy = new Map();
    for (const thread of linked.threads) {
        if (thread.file !== file) continue;
        for (const proc of thread.effects.procs) addTo(reachedBy, proc.name, thread);
    }
    for (const [key, variable] of linked.variables) {
        for (const access of variable.accesses) if (access.unit.kind === 'orphan') touch(key, null);
    }

    const confined = [];
    for (const [key, touching] of threadsOf) {
        if (touching.size !== 1 || touching.has(null)) continue;
        const [thread] = touching;
        if (thread.file !== file) continue;
        const { owner, kind, name } = parseVarKey(key);
        if (name.startsWith(CLOUD_PREFIX) || isCompilerVariable(name)) continue;
        if (owner !== sprite && owner !== STAGE) continue;
        if (owner === STAGE && !runsAsOneThread(linked, thread)) continue;
        confined.push({ owner, kind, name });
    }

    const uninterruptedThreads = new Set(linked.threads.filter(t => t.file === file && !threadCanBeInterrupted(linked, t)));
    const scripts = new Set([...uninterruptedThreads].map(t => `${t.unit.line}:${t.unit.col}`));
    const singleThreadProcs = new Set([...reachedBy].filter(([, callers]) => callers.length === 1).map(([name]) => name));
    const procs = new Set([...singleThreadProcs].filter(name => uninterruptedThreads.has(reachedBy.get(name)[0])));
    return { confined, uninterruptedScripts: scripts, uninterruptedProcs: procs, singleThreadProcs, text: file.analysis.src };
}
