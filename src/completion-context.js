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
    distanceTo: ['mouseTargets'],
    xOf: ['ofTargets'], yOf: ['ofTargets'], directionOf: ['ofTargets'], sizeOf: ['ofTargets'],
    costumeNumOf: ['ofTargets'], costumeNameOf: ['ofTargets'], volumeOf: ['ofTargets'],
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

const MAX_LOOKBACK_LINES = 8;

function lexLine(line) {
    let toks;
    try { toks = tokenize(line, { quiet: true }); } catch (_) { return null; }
    toks.pop(); // EOF
    return toks.some(t => t.unterminated) ? null : toks;
}

// Walks tokens right-to-left from `from`, resuming from `state`, until the call whose
// argument list holds the cursor is found. Returns { slot } once decided, or the
// carried-over state when the tokens ran out first.
function scanSlot(toks, from, state) {
    let { depth, argIndex } = state;
    for (let i = from; i >= 0; i--) {
        const t = toks[i];
        if (t.type === '{' || t.type === '}') return { slot: null };
        if (t.type === ')') depth++;
        else if (t.type === ',' && depth === 0) argIndex++;
        else if (t.type === '(') {
            if (depth > 0) { depth--; continue; }
            const callee = toks[i - 1];
            return { slot: callee && isWord(callee) ? (CALL_SLOTS[callee.value]?.[argIndex] ?? null) : null };
        }
    }
    return { depth, argIndex };
}

function stringSlot(toks, k, lineAbove) {
    const hat = toks[k - 2], kind = toks[k - 1];
    if (hat && kind && hat.value === 'on' && STRING_HATS.has(kind.value)) return HAT_SLOTS[kind.value];

    let state = scanSlot(toks, k - 1, { depth: 0, argIndex: 0 });
    for (let n = 1; !('slot' in state) && lineAbove && n <= MAX_LOOKBACK_LINES; n++) {
        const line = lineAbove(n);
        const above = line === undefined ? null : lexLine(line);
        if (!above) break;
        state = scanSlot(above, above.length - 1, state);
    }
    return state.slot ?? null;
}

// The `{expr}` being typed inside an unterminated string, as { text, offset } where
// `offset` is how many characters of the line precede `text`; null outside an expr.
function openInterpolation(prefix, quoteCol) {
    const body = prefix.slice(quoteCol);
    let i = 0, exprStart = -1, depth = 0;
    while (i < body.length) {
        const c = body[i];
        if (exprStart < 0) {
            if ((c === '{' || c === '}') && body[i + 1] === c) i += 2;
            else if (c === '{') { exprStart = ++i; depth = 1; }
            else i++;
        } else if (c === '"') {
            const close = body.indexOf('"', i + 1);
            if (close < 0) return { text: body.slice(exprStart), offset: quoteCol + exprStart };
            i = close + 1;
        } else {
            if (c === '{') depth++;
            else if (c === '}' && --depth === 0) exprStart = -1;
            i++;
        }
    }
    return exprStart < 0 ? null : { text: body.slice(exprStart), offset: quoteCol + exprStart };
}

let structMemo = { src: null, structs: null };

// struct name -> field names, for every `struct name { a, b }` in `src`.
export function structFields(src) {
    if (structMemo.src === src) return structMemo.structs;
    const structs = new Map();
    let toks = [];
    try { toks = tokenize(src, { quiet: true }); } catch (_) {}
    for (let i = 0; i + 2 < toks.length; i++) {
        if (toks[i].value !== 'struct' || !isWord(toks[i]) || !isWord(toks[i + 1]) || toks[i + 2].type !== '{') continue;
        const fields = [];
        let j = i + 3;
        for (; j < toks.length && toks[j].type !== '}'; j++) if (isWord(toks[j])) fields.push(toks[j].value);
        structs.set(toks[i + 1].value, fields);
        i = j;
    }
    structMemo = { src, structs };
    return structs;
}

// Typing `<` pops the list open for #include <...>; after a comparison it is only noise.
export function isComparisonNoise(ctx, wordText, triggerCharacter) {
    return ctx.kind === 'general' && ctx.afterLt && wordText === '' && triggerCharacter === '<';
}

// `lineAbove(n)` (optional) returns the text n lines above the cursor line, so an
// argument list that spans lines can still be traced back to its callee.
//
// kinds: comment | string | structField | varName | include | routine |
//        listMethod | penMethod | member | general
export function completionContext(prefix, lineAbove) {
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
        const expr = openInterpolation(prefix, last.col);
        if (expr) {
            const inner = completionContext(expr.text);
            return inner.kind === 'string' ? { ...inner, quoteCol: inner.quoteCol + expr.offset }
                : { ...inner, onCol: null };
        }
        return { kind: 'string', quoteCol: last.col, slot: stringSlot(toks, toks.length - 1, lineAbove) };
    }

    const partial = isWord(last) && last.endCol === prefix.length + 1;
    const head = partial ? toks.slice(0, -1) : toks;
    const tail = head[head.length - 1];
    if (!tail) return { kind: 'general' };
    const before = head[head.length - 2];

    if (head.length >= 3 && head[0].type === '#' && head[1].value === 'include' && head[2].type === '<'
        && !head.some(t => t.type === '>')) {
        return { kind: 'include' };
    }
    if (tail.type === '.') {
        if (before?.type === 'VAR') return { kind: 'listMethod' };
        if (before && before.value === 'pen' && isWord(before)) return { kind: 'penMethod' };
        return { kind: 'member' };
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
