import { tokenize } from "./compiler.js";

// What the cursor is in the middle of, read off the compiler's own lexer run over
// the text before the cursor on the current line. Unclosed strings and [brackets]
// (the in-progress cases completion cares about) arrive as tokens flagged
// `unterminated`, so no regex has to guess at quoting.

const STRING_HATS = new Set(['receive', 'backdrop', 'key']);
const NOT_WORDS = new Set(['STR', 'ISTR', 'VAR', 'NUM', 'COMMENT', 'HEX']);
const WORD_RE = /^[a-zA-Z_]\w*$/;

const isWord = t => !NOT_WORDS.has(t.type) && WORD_RE.test(t.value);

// Where a string-literal completion pulls its candidates from, by callee and argument index.
const CALL_SLOTS = {
    switchCostume: ['costumes'],
    switchBackdrop: ['backdrops'], switchBackdropAndWait: ['backdrops'],
    play: ['sounds'], playUntilDone: ['sounds'],
    broadcast: ['broadcasts'], broadcastAndWait: ['broadcasts'], send: ['broadcasts'], sendAndWait: ['broadcasts'],
    goTo: ['targets'], pointTowards: ['targets'], glide: [null, 'targets'],
    distanceTo: ['targets'], xOf: ['targets'], yOf: ['targets'], directionOf: ['targets'], sizeOf: ['targets'],
    costumeNumOf: ['targets'], costumeNameOf: ['targets'], volumeOf: ['targets'],
    touching: ['touchTargets'],
    key: ['keys'],
    setEffect: ['effects'], changeEffect: ['effects'],
    setSoundEffect: ['soundEffects'], changeSoundEffect: ['soundEffects'],
    setRotationStyle: ['rotationStyles'],
    setDragMode: ['dragModes'],
    setPenColorParam: ['penParams'], changePenColorParam: ['penParams'],
    setColorParam: ['penParams'], changeColorParam: ['penParams'],
    currentTime: ['timeUnits'],
    createClone: ['clones'],
    sort: ['sortDirections'],
};

const HAT_SLOTS = { receive: 'broadcasts', backdrop: 'backdrops', key: 'keys' };

function stringSlot(toks, k) {
    const hat = toks[k - 2], kind = toks[k - 1];
    if (hat && kind && hat.value === 'on' && STRING_HATS.has(kind.value)) return HAT_SLOTS[kind.value];

    let depth = 0, argIndex = 0;
    for (let i = k - 1; i >= 0; i--) {
        const t = toks[i];
        if (t.type === '{' || t.type === '}') return null;
        if (t.type === ')') depth++;
        else if (t.type === ',' && depth === 0) argIndex++;
        else if (t.type === '(') {
            if (depth > 0) { depth--; continue; }
            const callee = toks[i - 1];
            return callee && isWord(callee) ? (CALL_SLOTS[callee.value]?.[argIndex] ?? null) : null;
        }
    }
    return null;
}

// kinds: comment | string | structField | varName | include | routine |
//        listMethod | penMethod | general
export function completionContext(prefix) {
    let toks;
    try { toks = tokenize(prefix, { comments: true, quiet: true }); } catch (_) { return { kind: 'general' }; }
    toks.pop(); // EOF

    const last = toks[toks.length - 1];
    if (!last) return { kind: 'general' };
    if (last.type === 'COMMENT') return { kind: 'comment' };

    if (last.unterminated) {
        if (last.type === 'VAR') {
            const field = /^([^.\]]+)\.\w*$/.exec(last.value);
            return field ? { kind: 'structField', struct: field[1] } : { kind: 'varName' };
        }
        return { kind: 'string', quoteCol: last.col, slot: stringSlot(toks, toks.length - 1) };
    }

    const partial = isWord(last) && last.endCol === prefix.length + 1;
    const head = partial ? toks.slice(0, -1) : toks;
    const tail = head[head.length - 1];
    if (!tail) return { kind: 'general' };
    const before = head[head.length - 2];

    if (tail.type === '.' && before) {
        if (before.type === 'VAR') return { kind: 'listMethod' };
        if (before.value === 'pen' && isWord(before)) return { kind: 'penMethod' };
    }
    if (head.length >= 3 && head[0].type === '#' && head[1].value === 'include' && head[2].type === '<') {
        return { kind: 'include' };
    }
    if (isWord(tail) && (tail.value === 'launch' || tail.value === 'await' || tail.value === 'cancel')) {
        return { kind: 'routine', withCall: tail.value !== 'cancel' };
    }
    if (tail.type === '(' && before && before.value === 'isRunning') return { kind: 'routine', withCall: false };

    return {
        kind: 'general',
        afterLt: tail.type === '<',
        onCol: isWord(tail) && tail.value === 'on' ? tail.col : null,
    };
}
