import { KEYWORDS } from "./constants.js";
import { scratchIndex } from "./scratch-index.js";
import { ASM_OPCODES } from "./asm-opcodes.js";
import { compileWithSLVM } from "./slvm-backend.js";
import { buildComments } from "./metadata.js";

// [L] DSL Compiler

// --- Lexer ---

const TT = {
    NUM: 'NUM', STR: 'STR', ISTR: 'ISTR', IDENT: 'IDENT', VAR: 'VAR',
    LBRACE: '{', RBRACE: '}', LPAREN: '(', RPAREN: ')',
    COMMA: ',', COLON: ':', HASH: '#', HEX: 'HEX', DOT: '.',
    LT: '<', GT: '>', EQ: '=', PLUS: '+', MINUS: '-',
    STAR: '*', SLASH: '/', SEMI: ';', EOF: 'EOF',
    NEQ: '!=', LE: '<=', GE: '>=', BANG: '!', QUESTION: '?', AMP: '&',
};

const KW_SET = new Set(KEYWORDS);
const DEFINE_MODIFIERS = ['returns', 'warp', 'noinline'];

export function tokenize(src, opts = {}) {
    const tokens = [];
    let i = 0, line = 1, col = 1;

    function advance() {
        const c = src[i++];
        if (c === '\n') { line++; col = 1; } else col++;
        return c;
    }

    while (i < src.length) {
        // Skip whitespace
        if (/\s/.test(src[i])) { advance(); continue; }
        // Line comment
        if (src[i] === '/' && src[i+1] === '/') {
            const from = i, cLine = line, cCol = col;
            while (i < src.length && src[i] !== '\n') i++;
            if (opts.comments) {
                col += i - from;
                tokens.push({ type: 'COMMENT', value: src.slice(from, i), line: cLine, col: cCol, endLine: line, endCol: col });
            }
            continue;
        }
        const startLine = line, startCol = col;
        const c = src[i];

        // String literal — with {expr} interpolation ({{ and }} are literal braces)
        if (c === '"') {
            advance();
            let s = '';
            const parts = [];  // {kind:'str',text} | {kind:'expr',src,line,col}
            while (i < src.length && src[i] !== '"') {
                if (src[i] === '\\' && i + 1 < src.length) {
                    advance();
                    const escape = advance();
                    const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' };
                    if (escape === 'u' && /^[0-9a-fA-F]{4}$/.test(src.slice(i, i + 4))) {
                        s += String.fromCharCode(parseInt(src.slice(i, i + 4), 16));
                        for (let digit = 0; digit < 4; digit++) advance();
                    } else s += escapes[escape] ?? '\\' + escape;
                    continue;
                }
                if (src[i] === '{' && src[i+1] === '{') { advance(); advance(); s += '{'; continue; }
                if (src[i] === '}' && src[i+1] === '}') { advance(); advance(); s += '}'; continue; }
                if (src[i] === '{') {
                    advance(); // consume '{'
                    const eLine = line, eCol = col;
                    let depth = 1, esrc = '';
                    while (i < src.length) {
                        if (src[i] === '"') {
                            // nested string literal inside the interpolated expression
                            esrc += advance();
                            while (i < src.length && src[i] !== '"') {
                                const escaped = src[i] === '\\';
                                esrc += advance();
                                if (escaped && i < src.length) esrc += advance();
                            }
                            if (i < src.length) esrc += advance();
                            continue;
                        }
                        if (src[i] === '{') depth++;
                        else if (src[i] === '}') { depth--; if (depth === 0) break; }
                        esrc += advance();
                    }
                    if (src[i] === '}') advance();
                    parts.push({ kind: 'str', text: s }); s = '';
                    parts.push({ kind: 'expr', src: esrc, line: eLine, col: eCol });
                    continue;
                }
                s += advance();
            }
            const unterminated = src[i] !== '"';
            if (!unterminated) advance();
            if (parts.length === 0) {
                tokens.push({ type: TT.STR, value: s, unterminated, line: startLine, col: startCol, endLine: line, endCol: col });
            } else {
                if (s !== '') parts.push({ kind: 'str', text: s });
                tokens.push({ type: TT.ISTR, parts, value: '', unterminated, line: startLine, col: startCol, endLine: line, endCol: col });
            }
            continue;
        }

        // Variable [...]
        if (c === '[') {
            advance();
            let s = '';
            while (i < src.length && src[i] !== ']') s += advance();
            const unterminated = src[i] !== ']';
            if (!unterminated) advance();
            tokens.push({ type: TT.VAR, value: s.trim(), unterminated, line: startLine, col: startCol, endLine: line, endCol: col });
            continue;
        }

        // Number (including negative handled at parser level)
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i+1]))) {
            const s = src.slice(i).match(/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/)[0];
            for (let digit = 0; digit < s.length; digit++) advance();
            tokens.push({ type: TT.NUM, value: parseFloat(s), line: startLine, col: startCol, endLine: line, endCol: col });
            continue;
        }

        // Identifier / keyword
        if (/[a-zA-Z_]/.test(c)) {
            let s = '';
            while (i < src.length && /[\w]/.test(src[i])) s += advance();
            tokens.push({ type: KW_SET.has(s) ? s : TT.IDENT, value: s, line: startLine, col: startCol, endLine: line, endCol: col });
            continue;
        }

        // Hex color literal #rrggbb
        if (c === '#') {
            const hex6 = src.slice(i + 1, i + 7);
            if (/^[0-9a-fA-F]{6}$/.test(hex6)) {
                advance(); // consume '#'
                for (let h = 0; h < 6; h++) advance();
                tokens.push({ type: TT.HEX, value: '#' + hex6, line: startLine, col: startCol, endLine: line, endCol: col });
                continue;
            }
        }

        // Two-char comparison operators
        const two = c + (src[i + 1] || '');
        if (two === '!=' || two === '<=' || two === '>=') {
            advance(); advance();
            tokens.push({ type: two, value: two, line: startLine, col: startCol, endLine: line, endCol: col });
            continue;
        }
        if (c === '!' || c === '?') {
            advance();
            tokens.push({ type: c === '!' ? TT.BANG : TT.QUESTION, value: c, line: startLine, col: startCol, endLine: line, endCol: col });
            continue;
        }

        // Single-char tokens
        const SINGLE = { '{': TT.LBRACE, '}': TT.RBRACE, '(': TT.LPAREN, ')': TT.RPAREN,
                          ',': TT.COMMA,  ':': TT.COLON, '<': TT.LT, '>': TT.GT,
                          '=': TT.EQ, '+': TT.PLUS, '-': TT.MINUS, '*': TT.STAR,
                          '/': TT.SLASH, '#': TT.HASH, '.': TT.DOT, ';': TT.SEMI,
                          '&': TT.AMP };
        if (SINGLE[c]) {
            advance();
            tokens.push({ type: SINGLE[c], value: c, line: startLine, col: startCol, endLine: line, endCol: col });
            continue;
        }

        tokens.push({ type: 'INVALID', value: c, line, col, endLine: line, endCol: col + 1 });
        advance();
    }

    tokens.push({ type: TT.EOF, value: '', line, col });
    return tokens;
}

// --- Parser ---

// Human-readable names for token types
const TOKEN_NAMES = {
    '(': '`(`', ')': '`)`', '{': '`{`', '}': '`}`',
    ',': '`,`', ':': '`:`', ';': '`;`',
    NUM: 'a number', STR: 'a string (e.g. "hello")',
    VAR: 'a variable (e.g. [score])', IDENT: 'an identifier', EOF: 'end of file',
};

// Full call signatures for every built-in — shown in error messages
export const CALL_SIGS = {
    move:             'move(steps)',
    turnRight:        'turnRight(degrees)',
    turnLeft:         'turnLeft(degrees)',
    goTo:             'goTo(x, y)  or  goTo("sprite")',
    glide:            'glide(secs, x, y)',
    bounce:           'bounce()',
    setX:             'setX(x)',       setY:    'setY(y)',
    changeX:          'changeX(dx)',   changeY: 'changeY(dy)',
    say:              'say(message)',
    sayFor:           'sayFor(message, secs)',
    think:            'think(message)',
    thinkFor:         'thinkFor(message, secs)',
    switchCostume:    'switchCostume("name")',
    switchBackdrop:   'switchBackdrop("name")',
    nextCostume:      'nextCostume()',    nextBackdrop:  'nextBackdrop()',
    setSize:          'setSize(percent)', changeSize:    'changeSize(amount)',
    show:             'show()',            hide:          'hide()',
    clearEffects:     'clearEffects()',
    play:             'play("sound")',
    playUntilDone:    'playUntilDone("sound")',
    stopSounds:       'stopSounds()',
    broadcast:        'broadcast("message")',
    broadcastAndWait: 'broadcastAndWait("message")',
    wait:             'wait(secs)',
    stopAll:          'stopAll()',  stopThis: 'stopThis()',  stopOtherScripts: 'stopOtherScripts()',
    createClone:      'createClone()  or  createClone("sprite")',
    deleteClone:      'deleteClone()',
    showVariable:     'showVariable([var])',   hideVariable: 'hideVariable([var])',
    showList:         'showList([list])',       hideList:     'hideList([list])',
    listAdd:          'listAdd(item, [list])',
    listDelete:       'listDelete(index, [list])',
    listInsert:       'listInsert(item, index, [list])',
    listReplace:      'listReplace(index, [list], item)',
    // Operators / string
    random:   'random(min, max)',
    length:   'length(value)',
    attributeOf: 'attributeOf(\"property\", \"sprite\")',
    join:     'join(str1, str2)',
    letterOf: 'letterOf(index, string)',
    contains: 'contains(string, substring)',
    clamp:    'clamp(value, min, max)',
    // Motion extras
    setDirection:  'setDirection(degrees)',
    turnTo:        'turnTo(degrees)  — point in absolute direction',
    pointTowards:  'pointTowards("sprite" | "_mouse_")',
    distanceTo:    'distanceTo("sprite" | "_mouse_")',
    // Looks effects
    setEffect:    'setEffect("color", value)',
    changeEffect: 'changeEffect("color", amount)',
    goToFront: 'goToFront()', goToBack: 'goToBack()',
    moveForward: 'moveForward(layers)', moveBackward: 'moveBackward(layers)',
    // Sound
    setVolume:    'setVolume(percent)',
    changeVolume: 'changeVolume(amount)',
    // Sensing
    askAndWait:   'askAndWait(question)',
    resetTimer:   'resetTimer()',
    currentTime:  'currentTime("hour" | "minute" | "second" | "year" | "month" | "date" | "day")',
    // Sensing of other sprites
    xOf:          'xOf("sprite")',
    yOf:          'yOf("sprite")',
    directionOf:  'directionOf("sprite")',
    costumeNumOf: 'costumeNumOf("sprite")',
    costumeNameOf:'costumeNameOf("sprite")',
    sizeOf:       'sizeOf("sprite")',
    volumeOf:     'volumeOf("sprite")',
    // Sugar
    yield:        'yield()',
    // New v1.0 blocks
    listDeleteAll:        'listDeleteAll([list])',
    populateList:         'populateList([list], value, count | max, clearFirst)',
    populateArray:        'populateArray([list], value, count | max, clearFirst)  — alias for populateList',
    setRotationStyle:     'setRotationStyle("all around" | "left-right" | "don\'t rotate")',
    switchBackdropAndWait:'switchBackdropAndWait("name")',
    setSoundEffect:       'setSoundEffect("PITCH" | "PAN LEFT/RIGHT", value)',
    changeSoundEffect:    'changeSoundEffect("PITCH" | "PAN LEFT/RIGHT", amount)',
    clearSoundEffects:    'clearSoundEffects()',
    setDragMode:          'setDragMode("draggable" | "not draggable")',
    // Pen
    penDown:  'penDown()',
    penUp:    'penUp()',
    penClear: 'penClear()',
    stamp:    'stamp()',
    setPenColor:          'setPenColor(color)  — #hex literal or string',
    setPenSize:           'setPenSize(size)',
    changePenSize:        'changePenSize(amount)',
    setPenColorParam:     'setPenColorParam("param", value)  — "color"|"saturation"|"brightness"|"transparency"',
    changePenColorParam:  'changePenColorParam("param", amount)',
    // pyfor
    pyfor:    'pyfor [iterator] in [list] { … }',
    // Ergonomic aliases
    print:      'print(message)  — alias for say()',
    println:    'println(message)  — alias for say()',
    step:       'step(steps)  — alias for move()',
    forward:    'forward(steps)  — alias for move()',
    left:       'left(degrees)  — alias for turnLeft()',
    right:      'right(degrees)  — alias for turnRight()',
    front:      'front()  — alias for goToFront()',
    back:       'back()  — alias for goToBack()',
    down:       'down()  — alias for penDown()',
    up:         'up()  — alias for penUp()',
    clone:      'clone()  — alias for createClone("_myself_")',
    stopMe:     'stopMe()  — alias for stopThis()',
    ask:        'ask("question")  — alias for askAndWait()',
    send:       'send("message")  — alias for broadcast()',
    sendAndWait:'sendAndWait("message")  — alias for broadcastAndWait()',
    append:     'append([list], value)  — alias for listAdd',
    push:       'push([list], value)  — alias for listAdd',
    remove:     'remove([list], index)  — alias for listDelete',
    insert:     'insert([list], index, value)  — alias for listInsert',
    replace:    'replace([list], index, value)  — alias for listReplace',
    clear:      'clear([list])  — alias for listDeleteAll',
    pop:        'pop([list])  — alias for listDeleteAll',
    // Math / trig
    abs:      'abs(n)',         round:    'round(n)',
    sqrt:     'sqrt(n)',        floor:    'floor(n)',
    ceiling:  'ceiling(n)',     ceil:     'ceil(n)',
    sin:      'sin(degrees)',   cos:      'cos(degrees)',   tan:    'tan(degrees)',
    asin:     'asin(n)',        acos:     'acos(n)',        atan:   'atan(n)',
    ln:       'ln(n)',          log:      'log(n)',
    exp:      'exp(n)',         pow10:    'pow10(n)',
    // Scratchroutines
    scratchroutine: 'scratchroutine name(params) { … }',
    launch:         'launch name(args)  — fire and forget',
    await:          'await name(args)   — block until done',
    cancel:         'cancel name        — set cancel flag',
    isRunning:      'isRunning(name)    — boolean: currently running?',
    checkCancel:    'checkCancel()      — stop this script if cancelled',
    // Sensing predicates & heap
    touching: 'touching("sprite" | "_edge_" | "_mouse_")  — boolean',
    key:      'key("name")  — boolean: is the key pressed?',
    alloc:    'alloc(n)  — allocate n heap cells, returns a pointer',
    free:     'free(p)  — free heap cells allocated by alloc(p)',
};

// Returns up to `max` candidates whose spelling is close to `name` (prefix/substring heuristics).
export function fuzzyMatch(name, candidates, max = 3) {
    const vl = String(name).toLowerCase();
    return candidates.filter(k => {
        const kl = k.toLowerCase();
        return kl.startsWith(vl) || vl.startsWith(kl.slice(0, 3)) || kl.includes(vl) || vl.includes(kl.slice(0, 4));
    }).slice(0, max);
}

export function parse(tokens, opts = {}) {
    let pos = 0;
    let callCtx = '';  // set before args helpers; picked up automatically by eat()
    const errors = tokens.filter(t => t.unterminated).map(t => ({ line: t.line, col: t.col, len: 1, message: `Unterminated ${t.type === TT.VAR ? 'variable name' : 'string literal'}` }));

    function peek()     { return tokens[Math.min(pos, tokens.length - 1)]; }
    function peekType() { return peek().type; }

    function tok(t) {
        if (t.type === TT.EOF) return 'end of file';
        if (t.type === TT.STR) return `string "${t.value}"`;
        if (t.type === TT.NUM) return `number ${t.value}`;
        if (t.type === TT.VAR) return `[${t.value}]`;
        return `"${t.value}"`;
    }

    const spanOfToken = t => ({ line: t.line, col: t.col, endLine: t.endLine, endCol: t.endCol });

    // ctx overrides callCtx for one eat() call when you need a specific message
    function eat(type, ctx) {
        if (peek().type === type) return tokens[pos++];
        const t = peek();
        const expected = TOKEN_NAMES[type] || `"${type}"`;
        const where = ctx || callCtx;
        const msg = where
            ? `${where} — expected ${expected}, got ${tok(t)}`
            : `Expected ${expected}, got ${tok(t)}`;
        errors.push({ line: t.line, col: t.col, len: Math.max(t.value.length, 1), message: msg });
        return t;
    }
    function check(type) { return peek().type === type; }
    function checkV(val) { const t = peek(); return t.type !== TT.STR && t.type !== TT.ISTR && t.value === val; }
    function tryEat(type) { if (check(type)) { pos++; return true; } return false; }
    function tryEatV(val) { if (checkV(val)) { pos++; return true; } return false; }

    function parseScript() {
        const blocks = [];
        while (!check(TT.EOF)) {
            const first = peek();
            const node = parseTopLevel();
            const last = tokens[pos - 1];
            node.span = { line: first.line, col: first.col, endLine: last.endLine, endCol: last.endCol };
            blocks.push(node);
        }
        return { type: 'Script', blocks };
    }

    function parseTopLevel() {
        if (checkV('on') || checkV('define')) return parseHatBlock();
        if (checkV('scratchroutine')) return parseScratchroutine();
        if (checkV('struct')) return parseStruct();
        if (checkV('enum') || checkV('enums')) return parseEnum();
        if (check(TT.LBRACE)) {
            const t = peek();
            const body = parseBody();
            return { type: 'OrphanedBlock', body, line: t.line, col: t.col };
        }
        return parseStatement();
    }

    function parseHatBlock() {
        if (checkV('define')) {
            pos++;
            const nameT = peek(); pos++;
            eat(TT.LPAREN, '`define name(params)`: expected `(` after the block name');
            const params = [];
            const paramSpans = [];
            while (!check(TT.RPAREN) && !check(TT.EOF)) {
                const pT = peek();
                params.push(pT.value); pos++;
                paramSpans.push({ name: pT.value, line: pT.line, col: pT.col,
                                  endLine: pT.endLine, endCol: pT.endCol });
                if (!tryEat(TT.COMMA)) break;
            }
            eat(TT.RPAREN, '`define name(params)`: expected `)` to close the parameter list');
            const modifiers = new Set();
            for (let next; (next = DEFINE_MODIFIERS.find(name => !modifiers.has(name) && checkV(name))); pos++) modifiers.add(next);
            const returns = modifiers.has('returns'), warp = modifiers.has('warp'), noinline = modifiers.has('noinline');
            const body = parseBody();
            return { type: 'DefineBlock', name: nameT.value, params, body, returns, warp, noinline,
                     line: nameT.line, col: nameT.col,
                     nameEndLine: nameT.endLine, nameEndCol: nameT.endCol, paramSpans };
        }
        // on <hatArg> { ... }
        pos++; // consume 'on'
        const hat = parseHatArg();
        const body = parseBody();
        return { type: 'OnBlock', hat, body, line: hat.line, col: hat.col };
    }

    function parseHatArg() {
        const t = peek();
        if (checkV('flag'))    { pos++; return { event: 'flag', line: t.line, col: t.col }; }
        if (checkV('click'))   { pos++; return { event: 'click', line: t.line, col: t.col }; }
        if (checkV('clone'))   { pos++; return { event: 'clone', line: t.line, col: t.col }; }
        if (checkV('key'))     { pos++; const key = eat(TT.STR, '`on key "..."`: expected a quoted key name, e.g. `on key "space"`').value; return { event: 'key', key, line: t.line, col: t.col }; }
        if (checkV('receive')) { pos++; const msgTok = eat(TT.STR, '`on receive "..."`: expected a quoted message name'); return { event: 'receive', msg: msgTok.value, msgSpan: msgTok.type === TT.STR ? spanOfToken(msgTok) : null, line: t.line, col: t.col }; }
        if (checkV('backdrop')){ pos++; const bg  = eat(TT.STR, '`on backdrop "..."`: expected a quoted backdrop name').value; return { event: 'backdrop', backdrop: bg, line: t.line, col: t.col }; }
        if (checkV('timer'))   { pos++; eat(TT.GT, '`on timer > n`: expected `>` after `timer`'); const threshold = parseExpr(); return { event: 'greaterThan', sense: 'TIMER', threshold, line: t.line, col: t.col }; }
        if (checkV('loudness')){ pos++; eat(TT.GT, '`on loudness > n`: expected `>` after `loudness`'); const threshold = parseExpr(); return { event: 'greaterThan', sense: 'LOUDNESS', threshold, line: t.line, col: t.col }; }
        errors.push({ line: t.line, col: t.col, len: Math.max(t.value.length, 1),
            message: `Unknown event "${t.value}" after \`on\`. Valid events: flag  click  clone  key "..."  receive "..."  backdrop "..."  timer > n  loudness > n` });
        pos++;
        return { event: 'unknown', line: t.line, col: t.col };
    }

    function parseBody() {
        eat(TT.LBRACE, 'expected `{` to open block body');
        const stmts = [];
        while (!check(TT.RBRACE) && !check(TT.EOF)) stmts.push(parseStatement());
        eat(TT.RBRACE, 'expected `}` to close block body');
        return stmts;
    }

    function parseStatement() {
        const t = peek();
        const v = t.value;

        if (v === 'if' || v === 'elif') return parseIf();
        if (v === 'repeat' && tokens[pos+1] && tokens[pos+1].value === 'until') return parseRepeatUntil();
        if (v === 'repeat')        return parseRepeat();
        if (v === 'forever')       return parseForever();
        if (v === 'wait' && tokens[pos+1] && tokens[pos+1].value === 'until') return parseWaitUntil();
        if (v === 'while')         return parseWhile();
        if (v === 'for')           return parseFor();
        if (v === 'pyfor')         return parsePyFor();
        if (v === 'scratchroutine') return parseScratchroutine();
        if (v === 'launch')        return parseLaunchAwait('launch');
        if (v === 'await')         return parseLaunchAwait('await');
        if (v === 'cancel')        return parseCancel();
        if (v === 'breakpoint')    return parseBreakpoint();
        if (v === '__asm__')      return parseAsmStmt();
        if (v === 'return') {
            pos++;
            const value = (check(TT.RBRACE) || check(TT.EOF) || check(TT.SEMI) || peek().line > t.line) ? null : parseExpr();
            tryEat(TT.SEMI);
            return { type: 'ReturnStmt', value, line: t.line, col: t.col };
        }
        if (v === 'match' || v === 'switch') return parseMatch();
        if (v === 'do')            return parseDoWhile();
        if (v === 'break')    { pos++; return { type: 'BreakStmt',    line: t.line, col: t.col }; }
        if (v === 'continue') { pos++; return { type: 'ContinueStmt', line: t.line, col: t.col }; }

        return parseSimpleStatement();
    }

    // match expr { case v1, v2 { ... } case v3 { ... } default { ... } }
    function parseMatch() {
        const t = peek(); pos++;
        const subject = parseExpr();
        eat(TT.LBRACE, '`match expr { … }`: expected `{` after the match subject');
        const cases = [];
        let defaultBody = null;
        while (!check(TT.RBRACE) && !check(TT.EOF)) {
            if (checkV('case')) {
                const ct = peek(); pos++;
                const values = [parseExpr()];
                while (tryEat(TT.COMMA)) values.push(parseExpr());
                const body = parseBody();
                cases.push({ values, body, line: ct.line, col: ct.col });
            } else if (checkV('default')) {
                pos++;
                defaultBody = parseBody();
            } else {
                const bad = peek();
                errors.push({ line: bad.line, col: bad.col, len: Math.max(String(bad.value).length, 1),
                    message: `Inside \`match\`: expected \`case <value> { … }\` or \`default { … }\` — got ${tok(bad)}` });
                pos++;
            }
        }
        eat(TT.RBRACE, '`match`: expected `}` to close the match block');
        if (cases.length === 0) {
            errors.push({ line: t.line, col: t.col, len: t.value.length,
                message: '`match` needs at least one `case <value> { … }` arm' });
        }
        return { type: 'MatchStmt', subject, cases, defaultBody, line: t.line, col: t.col };
    }

    // do { ... } while cond
    function parseDoWhile() {
        const t = peek(); pos++;
        const body = parseBody();
        if (!checkV('while')) {
            const bad = peek();
            errors.push({ line: bad.line, col: bad.col, len: Math.max(String(bad.value).length, 1),
                message: '`do { … } while cond`: expected `while` after the body' });
        } else pos++;
        const cond = parseExpr();
        return { type: 'DoWhileStmt', cond, body, line: t.line, col: t.col };
    }

    function parseIf() {
        const t = peek(); pos++;
        const cond = parseExpr();
        const then = parseBody();
        let alt = null;
        if (checkV('else')) {
            pos++;
            // else if / else elif — recursively parse, wrap in array so alt is a body
            if (checkV('if') || checkV('elif')) {
                alt = [parseIf()];
            } else {
                alt = parseBody();
            }
        }
        return { type: 'IfStmt', cond, then, alt, line: t.line, col: t.col };
    }

    function parseRepeat() {
        const t = peek(); pos++;
        const count = parseExpr();
        const nounroll = tryEatV('nounroll');
        const body = parseBody();
        return { type: 'RepeatStmt', count, body, nounroll, line: t.line, col: t.col };
    }

    function parseRepeatUntil() {
        const t = peek(); pos++; pos++; // 'repeat' 'until'
        eat(TT.LPAREN, '`repeat until (condition)`: expected `(` before the condition');
        const cond = parseExpr();
        eat(TT.RPAREN, '`repeat until (condition)`: expected `)` after the condition');
        const body = parseBody();
        return { type: 'RepeatUntilStmt', cond, body, line: t.line, col: t.col };
    }

    function parseForever() {
        const t = peek(); pos++;
        const body = parseBody();
        return { type: 'ForeverStmt', body, line: t.line, col: t.col };
    }

    function parseWaitUntil() {
        const t = peek(); pos++; pos++; // 'wait' 'until'
        const cond = parseExpr();
        return { type: 'WaitUntilStmt', cond, line: t.line, col: t.col };
    }

    function parseWhile() {
        const t = peek(); pos++;
        eat(TT.LPAREN, '`while (condition)`: expected `(` before the condition');
        const cond = parseExpr();
        eat(TT.RPAREN, '`while (condition)`: expected `)` after the condition');
        const body = parseBody();
        return { type: 'WhileStmt', cond, body, line: t.line, col: t.col };
    }

    function parseFor() {
        const t = peek(); pos++; // consume 'for'
        if (!check(TT.VAR)) {
            errors.push({ line: t.line, col: t.col, len: 3,
                message: '`for [var] from expr to expr {}`: expected `[variable]` after `for`' });
        }
        const varTok = check(TT.VAR) ? eat(TT.VAR) : null;
        const varName = varTok ? varTok.value : '_err_';
        if (!checkV('from')) {
            errors.push({ line: peek().line, col: peek().col, len: peek().value.length,
                message: '`for [var] from expr to expr {}`: expected `from` after variable' });
        } else { pos++; }
        const fromExpr = parseExpr();
        if (!checkV('to')) {
            errors.push({ line: peek().line, col: peek().col, len: peek().value.length,
                message: '`for [var] from expr to expr {}`: expected `to` after start expression' });
        } else { pos++; }
        const toExpr = parseExpr();
        const nounroll = tryEatV('nounroll');
        const body = parseBody();
        return { type: 'ForStmt', varName, from: fromExpr, to: toExpr, body, nounroll, line: t.line, col: t.col,
                 varSpan: varTok ? { line: varTok.line, col: varTok.col, endLine: varTok.endLine, endCol: varTok.endCol } : null };
    }

    function parsePyFor() {
        const t = peek(); pos++; // consume 'pyfor'
        if (!check(TT.VAR)) {
            errors.push({ line: t.line, col: t.col, len: 5,
                message: '`pyfor [var] in [list] {}`: expected `[iterator variable]` after `pyfor`' });
        }
        const varTok = check(TT.VAR) ? eat(TT.VAR) : { value: '_err_', line: t.line, col: t.col };
        if (!checkV('in')) {
            errors.push({ line: peek().line, col: peek().col, len: Math.max(peek().value.length, 1),
                message: '`pyfor [var] in [list] {}`: expected keyword `in` after the iterator variable' });
        } else { pos++; }
        if (!check(TT.VAR)) {
            errors.push({ line: peek().line, col: peek().col, len: Math.max(peek().value.length, 1),
                message: '`pyfor [var] in [list] {}`: expected `[list variable]` after `in`' });
        }
        const listTok = check(TT.VAR) ? eat(TT.VAR) : { value: '_err_', line: t.line, col: t.col };
        const body = parseBody();
        return { type: 'PyForStmt', varName: varTok.value, listName: listTok.value, body, line: t.line, col: t.col,
                 varSpan:  varTok.endLine  ? { line: varTok.line,  col: varTok.col,  endLine: varTok.endLine,  endCol: varTok.endCol }  : null,
                 listSpan: listTok.endLine ? { line: listTok.line, col: listTok.col, endLine: listTok.endLine, endCol: listTok.endCol } : null };
    }

    function parseScratchroutine() {
        const t = peek(); pos++; // consume 'scratchroutine'
        const nameTok = peek();
        if (nameTok.type !== TT.IDENT) {
            errors.push({ line: t.line, col: t.col, len: 13,
                message: '`scratchroutine name(params) {}`: expected a routine name after `scratchroutine`' });
        }
        const name = nameTok.type === TT.IDENT ? (pos++, nameTok.value) : '_err_';
        const params = [];
        const paramSpans = [];
        if (check(TT.LPAREN)) {
            eat(TT.LPAREN);
            while (!check(TT.RPAREN) && !check(TT.EOF)) {
                const pT = peek();
                params.push(pT.value); pos++;
                paramSpans.push({ name: pT.value, line: pT.line, col: pT.col,
                                  endLine: pT.endLine, endCol: pT.endCol });
                if (!tryEat(TT.COMMA)) break;
            }
            eat(TT.RPAREN);
        }
        const body = parseBody();
        return { type: 'ScratchroutineStmt', name, params, body, line: t.line, col: t.col,
                 nameSpan: nameTok.type === TT.IDENT
                     ? { line: nameTok.line, col: nameTok.col, endLine: nameTok.endLine, endCol: nameTok.endCol }
                     : null,
                 paramSpans };
    }

    function parseLaunchAwait(mode) {
        const t = peek(); pos++; // consume 'launch'/'await'
        const nameTok = peek();
        if (nameTok.type !== TT.IDENT) {
            errors.push({ line: t.line, col: t.col, len: mode.length,
                message: `\`${mode} name(args)\`: expected a scratchroutine name` });
        }
        const name = nameTok.type === TT.IDENT ? (pos++, nameTok.value) : '_err_';
        const args = [];
        if (check(TT.LPAREN)) {
            eat(TT.LPAREN);
            while (!check(TT.RPAREN) && !check(TT.EOF)) {
                args.push(parseExpr());
                if (!tryEat(TT.COMMA)) break;
            }
            eat(TT.RPAREN);
        }
        return { type: mode === 'launch' ? 'LaunchStmt' : 'AwaitStmt', name, args, line: t.line, col: t.col,
                 nameSpan: nameTok.type === TT.IDENT
                     ? { line: nameTok.line, col: nameTok.col, endLine: nameTok.endLine, endCol: nameTok.endCol }
                     : null };
    }

    function parseCancel() {
        const t = peek(); pos++; // consume 'cancel'
        const nameTok = peek();
        if (nameTok.type !== TT.IDENT) {
            errors.push({ line: t.line, col: t.col, len: 6,
                message: '`cancel name`: expected a scratchroutine name after `cancel`' });
        }
        const name = nameTok.type === TT.IDENT ? (pos++, nameTok.value) : '_err_';
        return { type: 'CancelStmt', name, line: t.line, col: t.col,
                 nameSpan: nameTok.type === TT.IDENT
                     ? { line: nameTok.line, col: nameTok.col, endLine: nameTok.endLine, endCol: nameTok.endCol }
                     : null };
    }

    function parseBreakpoint() {
        const t = peek(); pos++;
        return { type: 'BreakpointStmt', line: t.line, col: t.col };
    }

    // __asm__ volatile [unsafe] ( opcode(args); opcode(args); ... )
    function parseAsmStmt() {
        const t = peek(); pos++; // consume '__asm__'
        if (!checkV('volatile')) {
            errors.push({ line: peek().line, col: peek().col, len: Math.max((peek().value || '').length, 1),
                message: '`__asm__ volatile(...)`: expected `volatile` immediately after `__asm__`' });
        } else pos++;
        let mode = 'strict';
        if (checkV('unsafe')) { pos++; mode = 'unsafe'; }
        eat(TT.LPAREN, check(TT.LBRACE)
            ? '`__asm__ volatile(...)` uses parens `(...)`, not braces like other blocks'
            : '`__asm__ volatile(...)`: expected `(` to open the asm block');
        const statements = [];
        while (!check(TT.RPAREN) && !check(TT.EOF)) {
            const s = parseAsmInnerStmt();
            if (s) statements.push(s);
        }
        eat(TT.RPAREN, '`__asm__ volatile(...)`: expected `)` to close the asm block');
        return { type: 'AsmStmt', mode, statements, line: t.line, col: t.col };
    }

    function parseAsmInnerStmt() {
        const opTok = peek();
        if (opTok.type !== TT.IDENT) {
            errors.push({ line: opTok.line, col: opTok.col, len: Math.max((opTok.value || '').length, 1),
                message: `__asm__: expected an opcode name (e.g. \`looks_say\`), got ${tok(opTok)}` });
            pos++;
            return null;
        }
        const opcode = opTok.value; pos++;
        eat(TT.LPAREN, `__asm__: expected \`(\` after opcode \`${opcode}\``);
        const args = [];
        while (!check(TT.RPAREN) && !check(TT.EOF)) {
            args.push(parseAsmInnerArg());
            if (!tryEat(TT.COMMA)) break;
        }
        eat(TT.RPAREN, `__asm__: expected \`)\` to close arguments for \`${opcode}\``);
        if (!tryEat(TT.SEMI)) {
            errors.push({ line: peek().line, col: peek().col, len: 1,
                message: `__asm__: expected \`;\` after \`${opcode}(...)\`` });
        }
        return { opcode, args, line: opTok.line, col: opTok.col };
    }

    function parseAsmInnerArg() {
        const t = peek();
        if (check(TT.STR)) { pos++; return { kind: 'lit', valueType: 'string', value: t.value, line: t.line, col: t.col }; }
        if (check(TT.NUM)) { pos++; return { kind: 'lit', valueType: 'number', value: t.value, line: t.line, col: t.col }; }
        if (check(TT.MINUS) && tokens[pos + 1] && tokens[pos + 1].type === TT.NUM) {
            pos++; const n = eat(TT.NUM);
            return { kind: 'lit', valueType: 'number', value: -n.value, line: t.line, col: t.col };
        }
        if (check(TT.IDENT) && (t.value === 'true' || t.value === 'false')) {
            pos++; return { kind: 'lit', valueType: 'boolean', value: t.value === 'true', line: t.line, col: t.col };
        }
        if (check(TT.VAR)) { pos++; return { kind: 'reg', name: t.value, line: t.line, col: t.col }; }
        if (check(TT.IDENT)) {
            if (tokens[pos + 1] && tokens[pos + 1].type === TT.LPAREN) {
                errors.push({ line: t.line, col: t.col, len: t.value.length,
                    message: `__asm__: nested opcode calls are not supported as arguments (v1) — \`${t.value}(...)\` must be its own statement; args must be a literal or a bare register name` });
                pos++; // consume ident
                let depth = 1; pos++; // consume '('
                while (depth > 0 && !check(TT.EOF)) {
                    if (check(TT.LPAREN)) depth++;
                    else if (check(TT.RPAREN)) depth--;
                    pos++;
                }
                return { kind: 'lit', valueType: 'number', value: 0, line: t.line, col: t.col };
            }
            pos++;
            return { kind: 'reg', name: t.value, line: t.line, col: t.col };
        }
        errors.push({ line: t.line, col: t.col, len: Math.max((t.value || '').length, 1),
            message: `__asm__: expected a literal (string/number/boolean) or a bare register name, got ${tok(t)}` });
        pos++;
        return { kind: 'lit', valueType: 'number', value: 0, line: t.line, col: t.col };
    }

    function parseEnum() {
        const t = peek(); pos++; // consume 'enum' or 'enums'
        const entries = [];
        eat(TT.LBRACE, '`enum { ... }` — expected `{` to open enum body');
        while (!check(TT.RBRACE) && !check(TT.EOF)) {
            const nameTok = peek();
            if (nameTok.type !== TT.IDENT) {
                errors.push({ line: nameTok.line, col: nameTok.col, len: 1,
                    message: '`enum { name = value, ... }`: expected an identifier for the entry name' });
                pos++;
                tryEat(TT.COMMA);
                continue;
            }
            pos++;
            const name = nameTok.value;
            let value;
            if (tryEat(TT.EQ)) {
                const vTok = peek();
                if (check(TT.NUM))       { pos++; value = { type: 'Num', value: vTok.value, line: vTok.line, col: vTok.col }; }
                else if (check(TT.STR)) { pos++; value = { type: 'Str', value: vTok.value, line: vTok.line, col: vTok.col }; }
                else {
                    errors.push({ line: vTok.line, col: vTok.col, len: 1,
                        message: `enum entry \`${name}\`: value must be a number or string literal` });
                    value = { type: 'Num', value: 0, line: vTok.line, col: vTok.col };
                }
            } else {
                value = { type: 'Num', value: 0, line: nameTok.line, col: nameTok.col };
            }
            entries.push({ name, value, line: nameTok.line, col: nameTok.col,
                           endLine: nameTok.endLine, endCol: nameTok.endCol });
            tryEat(TT.COMMA);
        }
        eat(TT.RBRACE, '`enum { ... }` — expected `}` to close enum body');
        return { type: 'EnumDecl', entries, line: t.line, col: t.col };
    }

    function parseStruct() {
        const t = peek(); pos++; // consume 'struct'
        const nameTok = peek();
        if (nameTok.type !== TT.IDENT) {
            errors.push({ line: t.line, col: t.col, len: 6,
                message: '`struct name { fields }`: expected a name after `struct`' });
        }
        const name = nameTok.type === TT.IDENT ? (pos++, nameTok.value) : '_err_';
        const fields = [];
        const fieldSpans = [];
        eat(TT.LBRACE, '`struct` declaration — expected `{` after the struct name');
        while (!check(TT.RBRACE) && !check(TT.EOF)) {
            const fTok = peek();
            if (fTok.type === TT.IDENT) {
                fields.push(fTok.value); pos++;
                fieldSpans.push({ name: fTok.value, line: fTok.line, col: fTok.col,
                                  endLine: fTok.endLine, endCol: fTok.endCol });
            } else {
                errors.push({ line: fTok.line, col: fTok.col, len: 1, message: 'Expected a struct field name' });
                pos++;
            }
            tryEat(TT.COMMA);
        }
        eat(TT.RBRACE, '`struct` declaration — expected `}` to close field list');
        return { type: 'StructDecl', name, fields, line: t.line, col: t.col,
                 nameSpan: nameTok.type === TT.IDENT
                     ? { line: nameTok.line, col: nameTok.col, endLine: nameTok.endLine, endCol: nameTok.endCol }
                     : null,
                 fieldSpans };
    }

    function parseSimpleStatement() {
        // Collect tokens until the next statement-start or brace
        // We use a greedy keyword-dispatch approach
        const t = peek();
        const v = t.value;

        // Statement-level dot method call: [var].sort() etc.
        if (t.type === TT.VAR && tokens[pos+1]?.type === TT.DOT) {
            pos++; pos++; // consume [var] and '.'
            const mTok = peek();
            const method = mTok.type === TT.IDENT ? mTok.value : '';
            if (mTok.type === TT.IDENT) pos++;
            eat(TT.LPAREN, `\`[${t.value}].${method}(...)\`: expected \`(\``);
            const args = [];
            while (!check(TT.RPAREN) && !check(TT.EOF)) {
                args.push(parseExpr()); if (!tryEat(TT.COMMA)) break;
            }
            eat(TT.RPAREN, `\`[${t.value}].${method}(...)\`: expected \`)\``);
            return { type: 'MemberCallStmt',
                object: { type: 'Var', name: t.value, line: t.line, col: t.col, endLine: t.endLine, endCol: t.endCol },
                method, args, line: t.line, col: t.col };
        }

        // Namespaced pen commands: pen.down(), pen.setColor(...), etc.
        if (t.type === TT.IDENT && v === 'pen' && tokens[pos+1]?.type === TT.DOT) {
            pos += 2; // consume 'pen' and '.'
            const mTok = peek();
            // Method names may collide with reserved keywords (down/up/clear/stamp/setSize/changeSize),
            // whose tokens carry the keyword itself as `type` rather than TT.IDENT.
            const isWordTok = mTok.type === TT.IDENT || (mTok.type !== TT.STR && KW_SET.has(mTok.value));
            const method = isWordTok ? mTok.value : '';
            if (isWordTok) pos++;
            const PEN_METHODS = {
                down:             () => { args0(t.line, t.col); return { type: 'PenDownStmt', line: t.line, col: t.col }; },
                up:               () => { args0(t.line, t.col); return { type: 'PenUpStmt', line: t.line, col: t.col }; },
                clear:            () => { args0(t.line, t.col); return { type: 'PenClearStmt', line: t.line, col: t.col }; },
                stamp:            () => { args0(t.line, t.col); return { type: 'PenStampStmt', line: t.line, col: t.col }; },
                setColor:         () => { const [c]   = args1(t.line, t.col); return { type: 'SetPenColorStmt', color: c, line: t.line, col: t.col }; },
                setSize:          () => { const [n]   = args1(t.line, t.col); return { type: 'SetPenSizeStmt', value: n, line: t.line, col: t.col }; },
                changeSize:       () => { const [n]   = args1(t.line, t.col); return { type: 'ChangePenSizeStmt', value: n, line: t.line, col: t.col }; },
                setColorParam:    () => { const [p,n] = args2(t.line, t.col); return { type: 'SetPenColorParamStmt', param: p, value: n, line: t.line, col: t.col }; },
                changeColorParam: () => { const [p,n] = args2(t.line, t.col); return { type: 'ChangePenColorParamStmt', param: p, amount: n, line: t.line, col: t.col }; },
            };
            if (PEN_METHODS[method]) return PEN_METHODS[method]();
            const known = Object.keys(PEN_METHODS);
            const similar = fuzzyMatch(method, known);
            const hint = similar.length
                ? `  Did you mean: ${similar.map(k => `pen.${k}()`).join('  or  ')}?`
                : `  Known pen.* methods: ${known.map(k => `pen.${k}()`).join(', ')}`;
            errors.push({ line: mTok.line || t.line, col: mTok.col || t.col, len: method.length || 1,
                message: `Unknown method \`pen.${method}()\`.${hint}` });
            return { type: 'UnknownStmt', value: `pen.${method}`, line: t.line, col: t.col };
        }

        // Increment / decrement: [var]++ or [var]--
        if (t.type === TT.VAR) {
            const n1 = tokens[pos+1], n2 = tokens[pos+2];
            if (n1 && n2 && n1.type === TT.PLUS  && n2.type === TT.PLUS) {
                pos += 3;
                return { type: 'ChangeVarStmt', varName: t.value,
                         value: { type: 'Num', value: 1,  line: t.line, col: t.col }, line: t.line, col: t.col,
                         varSpan: { line: t.line, col: t.col, endLine: t.endLine, endCol: t.endCol } };
            }
            if (n1 && n2 && n1.type === TT.MINUS && n2.type === TT.MINUS) {
                pos += 3;
                return { type: 'ChangeVarStmt', varName: t.value,
                         value: { type: 'Num', value: -1, line: t.line, col: t.col }, line: t.line, col: t.col,
                         varSpan: { line: t.line, col: t.col, endLine: t.endLine, endCol: t.endCol } };
            }
        }

        // Compound assignment: [var] += / -= / *= / /= expr
        if (t.type === TT.VAR) {
            const next1 = tokens[pos+1];
            const next2 = tokens[pos+2];
            const isCompoundOp = next1 && (next1.type === TT.PLUS || next1.type === TT.MINUS || next1.type === TT.STAR || next1.type === TT.SLASH);
            if (isCompoundOp && next2 && next2.type === TT.EQ) {
                const op = next1.value;
                if (op === '+' || op === '-' || op === '*' || op === '/') {
                    pos += 3; // consume [var], op, =
                    const rhs = parseExpr();
                    const varName = t.value;
                    const varSpan = { line: t.line, col: t.col, endLine: t.endLine, endCol: t.endCol };
                    if (op === '+') return { type: 'ChangeVarStmt', varName, value: rhs, line: t.line, col: t.col, varSpan };
                    // For *=, /=, -= we need set [v] to ([v] op rhs)
                    const varRef = { type: 'Var', name: varName, line: t.line, col: t.col };
                    const binop  = { type: 'BinOp', op, left: varRef, right: rhs };
                    return { type: 'SetVarStmt', varName, value: binop, line: t.line, col: t.col, varSpan };
                }
            }
        }

        // Custom block call: IDENT ( args )
        if (t.type === TT.IDENT) {
            pos++;
            if (check(TT.LPAREN)) {
                eat(TT.LPAREN);
                const args = [];
                while (!check(TT.RPAREN) && !check(TT.EOF)) {
                    args.push(parseExpr());
                    if (!tryEat(TT.COMMA)) break;
                }
                eat(TT.RPAREN);
                return { type: 'CallStmt', name: v, args, line: t.line, col: t.col };
            }
            return { type: 'RawKeyword', value: v, line: t.line, col: t.col };
        }

        pos++;
        return parseKeywordStatement(v, t);
    }

    function eatOptionalStr()  { return check(TT.STR) ? eat(TT.STR).value : null; }
    function eatOptionalNum()  { return check(TT.NUM) ? eat(TT.NUM).value : null; }
    function eatVarWithSpan() {
        const tok = eat(TT.VAR);
        return { value: tok.value, span: tok.type === TT.VAR ? spanOfToken(tok) : null };
    }
    function eatOptionalVar()  { return check(TT.VAR) ? eat(TT.VAR).value : null; }

    function args0(ln, cl) { eat(TT.LPAREN); eat(TT.RPAREN); return [ln, cl]; }
    function args1(ln, cl) { eat(TT.LPAREN); const a = parseExpr(); eat(TT.RPAREN); return [a, ln, cl]; }
    function args2(ln, cl) { eat(TT.LPAREN); const a = parseExpr(); eat(TT.COMMA); const b = parseExpr(); eat(TT.RPAREN); return [a, b, ln, cl]; }
    function args3(ln, cl) { eat(TT.LPAREN); const a = parseExpr(); eat(TT.COMMA); const b = parseExpr(); eat(TT.COMMA); const c = parseExpr(); eat(TT.RPAREN); return [a, b, c, ln, cl]; }

    function parseKeywordStatement(v, t) {
        const ln = t.line, cl = t.col;
        // Set the context string that eat() will use for all errors in this call
        callCtx = CALL_SIGS[v] ? `\`${CALL_SIGS[v]}\`` : (v ? `\`${v}(...)\`` : '');

        // Motion
        if (v === 'move')       { const [n] = args1(ln,cl); return { type: 'MoveStmt', steps: n, line: ln, col: cl }; }
        if (v === 'turnRight')  { const [n] = args1(ln,cl); return { type: 'TurnStmt', dir: 'right', degrees: n, line: ln, col: cl }; }
        if (v === 'turnLeft')   { const [n] = args1(ln,cl); return { type: 'TurnStmt', dir: 'left',  degrees: n, line: ln, col: cl }; }
        if (v === 'goTo') {
            eat(TT.LPAREN);
            const first = parseExpr();
            if (tryEat(TT.COMMA)) {
                const y = parseExpr(); eat(TT.RPAREN);
                return { type: 'GoToXYStmt', x: first, y, line: ln, col: cl };
            }
            eat(TT.RPAREN);
            const target = first;
            return { type: 'GoToStmt', target, line: ln, col: cl };
        }
        if (v === 'glide') {
            eat(TT.LPAREN);
            const secs = parseExpr();
            eat(TT.COMMA);
            const first = parseExpr();
            if (!tryEat(TT.COMMA)) {
                eat(TT.RPAREN);
                return { type: 'GlideToStmt', secs, target: first, line: ln, col: cl };
            }
            const x = first;
            const y = parseExpr();
            eat(TT.RPAREN);
            return { type: 'GlideStmt', secs, x, y, line: ln, col: cl };
        }
        if (v === 'bounce')     { args0(ln,cl); return { type: 'BounceStmt', line: ln, col: cl }; }
        if (v === 'setX')       { const [n] = args1(ln,cl); return { type: 'SetXStmt', value: n, line: ln, col: cl }; }
        if (v === 'setY')       { const [n] = args1(ln,cl); return { type: 'SetYStmt', value: n, line: ln, col: cl }; }
        if (v === 'changeX')    { const [n] = args1(ln,cl); return { type: 'ChangeXStmt', value: n, line: ln, col: cl }; }
        if (v === 'changeY')    { const [n] = args1(ln,cl); return { type: 'ChangeYStmt', value: n, line: ln, col: cl }; }

        // Looks
        if (v === 'say')            { const [m] = args1(ln,cl); return { type: 'SayStmt', msg: m, line: ln, col: cl }; }
        if (v === 'sayFor')         { const [m,s] = args2(ln,cl); return { type: 'SayForStmt', msg: m, secs: s, line: ln, col: cl }; }
        if (v === 'think')          { const [m] = args1(ln,cl); return { type: 'ThinkStmt', msg: m, line: ln, col: cl }; }
        if (v === 'thinkFor')       { const [m,s] = args2(ln,cl); return { type: 'ThinkForStmt', msg: m, secs: s, line: ln, col: cl }; }
        if (v === 'switchCostume')  { const [n] = args1(ln,cl); return { type: 'SwitchCostumeStmt', name: n, line: ln, col: cl }; }
        if (v === 'switchBackdrop') { const [n] = args1(ln,cl); return { type: 'SwitchBackdropStmt', name: n, line: ln, col: cl }; }
        if (v === 'nextCostume')    { args0(ln,cl); return { type: 'NextCostumeStmt', line: ln, col: cl }; }
        if (v === 'nextBackdrop')   { args0(ln,cl); return { type: 'NextBackdropStmt', line: ln, col: cl }; }
        if (v === 'setSize')        { const [n] = args1(ln,cl); return { type: 'SetSizeStmt', value: n, line: ln, col: cl }; }
        if (v === 'changeSize')     { const [n] = args1(ln,cl); return { type: 'ChangeSizeStmt', value: n, line: ln, col: cl }; }
        if (v === 'show')           { args0(ln,cl); return { type: 'ShowStmt', line: ln, col: cl }; }
        if (v === 'hide')           { args0(ln,cl); return { type: 'HideStmt', line: ln, col: cl }; }
        if (v === 'clearEffects')   { args0(ln,cl); return { type: 'ClearEffectsStmt', line: ln, col: cl }; }

        // Sound
        if (v === 'play')           { const [s] = args1(ln,cl); return { type: 'PlayStmt', sound: s, line: ln, col: cl }; }
        if (v === 'playUntilDone')  { const [s] = args1(ln,cl); return { type: 'PlayUntilDoneStmt', sound: s, line: ln, col: cl }; }
        if (v === 'stopSounds')     { args0(ln,cl); return { type: 'StopSoundsStmt', line: ln, col: cl }; }

        // Events
        if (v === 'broadcast')        { const [m] = args1(ln,cl); return { type: 'BroadcastStmt', msg: m, line: ln, col: cl }; }
        if (v === 'broadcastAndWait') { const [m] = args1(ln,cl); return { type: 'BroadcastWaitStmt', msg: m, line: ln, col: cl }; }

        // Control
        if (v === 'wait')              { const [n] = args1(ln,cl); return { type: 'WaitStmt', duration: n, line: ln, col: cl }; }
        if (v === 'stopAll')           { args0(ln,cl); return { type: 'StopStmt', option: 'all', line: ln, col: cl }; }
        if (v === 'stopThis')          { args0(ln,cl); return { type: 'StopStmt', option: 'this script', line: ln, col: cl }; }
        if (v === 'stopOtherScripts')  { args0(ln,cl); return { type: 'StopStmt', option: 'other scripts in sprite', line: ln, col: cl }; }
        if (v === 'createClone') {
            eat(TT.LPAREN);
            if (check(TT.RPAREN)) { eat(TT.RPAREN); return { type: 'CreateCloneStmt', target: '_myself_', line: ln, col: cl }; }
            const s = parseExpr(); eat(TT.RPAREN);
            return { type: 'CreateCloneStmt', target: s, line: ln, col: cl };
        }
        if (v === 'deleteClone')    { args0(ln,cl); return { type: 'DeleteCloneStmt', line: ln, col: cl }; }

        // Motion extras
        if (v === 'setDirection')   { const [n] = args1(ln,cl); return { type: 'SetDirectionStmt', degrees: n, line: ln, col: cl }; }
        if (v === 'turnTo')         { const [n] = args1(ln,cl); return { type: 'SetDirectionStmt', degrees: n, line: ln, col: cl }; }
        if (v === 'pointTowards')   { const [s] = args1(ln,cl); return { type: 'PointTowardsStmt', target: s, line: ln, col: cl }; }
        if (v === 'moveForward')    { const [n] = args1(ln,cl); return { type: 'MoveForwardLayersStmt', layers: n, line: ln, col: cl }; }
        if (v === 'moveBackward')   { const [n] = args1(ln,cl); return { type: 'MoveBackwardLayersStmt', layers: n, line: ln, col: cl }; }
        if (v === 'goToFront')      { args0(ln,cl); return { type: 'GoToFrontStmt', line: ln, col: cl }; }
        if (v === 'goToBack')       { args0(ln,cl); return { type: 'GoToBackStmt', line: ln, col: cl }; }

        // Looks effects
        if (v === 'setEffect')      { const [e,n] = args2(ln,cl); return { type: 'SetEffectStmt', effect: e, value: n, line: ln, col: cl }; }
        if (v === 'changeEffect')   { const [e,n] = args2(ln,cl); return { type: 'ChangeEffectStmt', effect: e, amount: n, line: ln, col: cl }; }

        // Sound extras
        if (v === 'setVolume')      { const [n] = args1(ln,cl); return { type: 'SetVolumeStmt', value: n, line: ln, col: cl }; }
        if (v === 'changeVolume')   { const [n] = args1(ln,cl); return { type: 'ChangeVolumeStmt', value: n, line: ln, col: cl }; }

        // Sensing extras
        if (v === 'askAndWait')     { const [q] = args1(ln,cl); return { type: 'AskAndWaitStmt', question: q, line: ln, col: cl }; }
        if (v === 'resetTimer')     { args0(ln,cl); return { type: 'ResetTimerStmt', line: ln, col: cl }; }
        if (v === 'setDragMode')    { const [m] = args1(ln,cl); return { type: 'SetDragModeStmt', mode: m, line: ln, col: cl }; }

        // Pen
        if (v === 'penDown')  { args0(ln,cl); return { type: 'PenDownStmt', line: ln, col: cl }; }
        if (v === 'penUp')    { args0(ln,cl); return { type: 'PenUpStmt', line: ln, col: cl }; }
        if (v === 'penClear') { args0(ln,cl); return { type: 'PenClearStmt', line: ln, col: cl }; }
        if (v === 'stamp')    { args0(ln,cl); return { type: 'PenStampStmt', line: ln, col: cl }; }
        if (v === 'setPenColor')  { const [c] = args1(ln,cl); return { type: 'SetPenColorStmt', color: c, line: ln, col: cl }; }
        if (v === 'setPenSize')   { const [n] = args1(ln,cl); return { type: 'SetPenSizeStmt', value: n, line: ln, col: cl }; }
        if (v === 'changePenSize'){ const [n] = args1(ln,cl); return { type: 'ChangePenSizeStmt', value: n, line: ln, col: cl }; }
        if (v === 'setPenColorParam')    { const [p,n] = args2(ln,cl); return { type: 'SetPenColorParamStmt', param: p, value: n, line: ln, col: cl }; }
        if (v === 'changePenColorParam') { const [p,n] = args2(ln,cl); return { type: 'ChangePenColorParamStmt', param: p, amount: n, line: ln, col: cl }; }

        // New list ops
        if (v === 'listDeleteAll') { eat(TT.LPAREN); const { value: listName, span: listSpan } = eatVarWithSpan(); eat(TT.RPAREN); return { type: 'ListDeleteAllStmt', listName, listSpan, line: ln, col: cl }; }

        // Motion rotation style
        if (v === 'setRotationStyle') { const [s] = args1(ln,cl); return { type: 'SetRotationStyleStmt', style: s, line: ln, col: cl }; }

        // Looks
        if (v === 'switchBackdropAndWait') { const [n] = args1(ln,cl); return { type: 'SwitchBackdropWaitStmt', name: n, line: ln, col: cl }; }

        // Sound effects
        if (v === 'setSoundEffect')    { const [e,val] = args2(ln,cl); return { type: 'SetSoundEffectStmt', effect: e, value: val, line: ln, col: cl }; }
        if (v === 'changeSoundEffect') { const [e,val] = args2(ln,cl); return { type: 'ChangeSoundEffectStmt', effect: e, value: val, line: ln, col: cl }; }
        if (v === 'clearSoundEffects') { args0(ln,cl); return { type: 'ClearSoundEffectsStmt', line: ln, col: cl }; }

        // Variables
        if (v === 'set') {
            // Pointer write: `set *[p] to v` / `set *(expr) to v`
            if (check(TT.STAR)) {
                pos++;
                const addr = parsePrimaryExpr();
                tryEatV('to');
                return { type: 'DerefSetStmt', addr, value: parseExpr(), line: ln, col: cl };
            }
            if (!check(TT.VAR)) {
                errors.push({ line: ln, col: cl, len: v.length,
                    message: `\`set\` must be followed by a [variable], e.g. \`set [score] to 0\` — got ${tok(peek())}` });
                return { type: 'UnknownStmt', value: v, line: ln, col: cl };
            }
            const varT = eat(TT.VAR); tryEatV('to');
            return { type: 'SetVarStmt', varName: varT.value, value: parseExpr(), line: ln, col: cl,
                     varSpan: { line: varT.line, col: varT.col, endLine: varT.endLine, endCol: varT.endCol } };
        }
        if (v === 'change') {
            if (!check(TT.VAR)) {
                errors.push({ line: ln, col: cl, len: v.length,
                    message: `\`change\` must be followed by a [variable], e.g. \`change [score] by 1\` — got ${tok(peek())}` });
                return { type: 'UnknownStmt', value: v, line: ln, col: cl };
            }
            const varT = eat(TT.VAR); tryEatV('by');
            return { type: 'ChangeVarStmt', varName: varT.value, value: parseExpr(), line: ln, col: cl,
                     varSpan: { line: varT.line, col: varT.col, endLine: varT.endLine, endCol: varT.endCol } };
        }
        if (v === 'showVariable') { eat(TT.LPAREN); const { value: va, span: nameSpan } = eatVarWithSpan(); eat(TT.RPAREN); return { type: 'ShowVarStmt', name: va, nameSpan, line: ln, col: cl }; }
        if (v === 'hideVariable') { eat(TT.LPAREN); const { value: va, span: nameSpan } = eatVarWithSpan(); eat(TT.RPAREN); return { type: 'HideVarStmt', name: va, nameSpan, line: ln, col: cl }; }
        if (v === 'showList')     { eat(TT.LPAREN); const { value: va, span: nameSpan } = eatVarWithSpan(); eat(TT.RPAREN); return { type: 'ShowListStmt', name: va, nameSpan, line: ln, col: cl }; }
        if (v === 'hideList')     { eat(TT.LPAREN); const { value: va, span: nameSpan } = eatVarWithSpan(); eat(TT.RPAREN); return { type: 'HideListStmt', name: va, nameSpan, line: ln, col: cl }; }

        // Lists
        if (v === 'listAdd') {
            eat(TT.LPAREN); const item = parseExpr(); eat(TT.COMMA); const { value: listName, span: listSpan } = eatVarWithSpan(); eat(TT.RPAREN);
            return { type: 'ListAddStmt', listName, listSpan, item, line: ln, col: cl };
        }
        if (v === 'listDelete') {
            eat(TT.LPAREN); const idx = parseExpr(); eat(TT.COMMA); const { value: listName, span: listSpan } = eatVarWithSpan(); eat(TT.RPAREN);
            return { type: 'ListDeleteStmt', listName, listSpan, index: idx, line: ln, col: cl };
        }
        if (v === 'listInsert') {
            eat(TT.LPAREN); const item = parseExpr(); eat(TT.COMMA); const idx = parseExpr(); eat(TT.COMMA); const { value: listName, span: listSpan } = eatVarWithSpan(); eat(TT.RPAREN);
            return { type: 'ListInsertStmt', listName, listSpan, item, index: idx, line: ln, col: cl };
        }
        if (v === 'listReplace') {
            eat(TT.LPAREN); const idx = parseExpr(); eat(TT.COMMA); const { value: listName, span: listSpan } = eatVarWithSpan(); eat(TT.COMMA); const item = parseExpr(); eat(TT.RPAREN);
            return { type: 'ListReplaceStmt', listName, listSpan, index: idx, item, line: ln, col: cl };
        }

        // Ergonomic aliases
        // print / println → say (programming-style output alias)
        if (v === 'print' || v === 'println') { const [m] = args1(ln,cl); return { type: 'SayStmt', msg: m, line: ln, col: cl }; }
        // step / forward → move (more natural direction vocabulary)
        if (v === 'step' || v === 'forward')  { const [n] = args1(ln,cl); return { type: 'MoveStmt', steps: n, line: ln, col: cl }; }
        // left / right → turnLeft / turnRight (concise directional turns)
        if (v === 'left')  { const [n] = args1(ln,cl); return { type: 'TurnStmt', dir: 'left',  degrees: n, line: ln, col: cl }; }
        if (v === 'right') { const [n] = args1(ln,cl); return { type: 'TurnStmt', dir: 'right', degrees: n, line: ln, col: cl }; }
        // front / back → goToFront / goToBack (layer shortcuts)
        if (v === 'front') { args0(ln,cl); return { type: 'GoToFrontStmt', line: ln, col: cl }; }
        if (v === 'back')  { args0(ln,cl); return { type: 'GoToBackStmt',  line: ln, col: cl }; }
        // down / up → penDown / penUp (pen shortcuts)
        if (v === 'down') { args0(ln,cl); return { type: 'PenDownStmt', line: ln, col: cl }; }
        if (v === 'up')   { args0(ln,cl); return { type: 'PenUpStmt',   line: ln, col: cl }; }
        // clone() → createClone("_myself_") (common case shorthand)
        if (v === 'clone') { args0(ln,cl); return { type: 'CreateCloneStmt', target: { type: 'Str', value: '_myself_', line: ln, col: cl }, line: ln, col: cl }; }
        // stopMe() → stopThis (friendlier stop)
        if (v === 'stopMe') { args0(ln,cl); return { type: 'StopStmt', option: 'this script', line: ln, col: cl }; }
        // ask() → askAndWait()
        if (v === 'ask') { const [q] = args1(ln,cl); return { type: 'AskAndWaitStmt', question: q, line: ln, col: cl }; }
        // send() → broadcast(), sendAndWait() → broadcastAndWait()
        if (v === 'send')        { const [m] = args1(ln,cl); return { type: 'BroadcastStmt', msg: m, line: ln, col: cl }; }
        if (v === 'sendAndWait') { const [m] = args1(ln,cl); return { type: 'BroadcastWaitStmt', msg: m, line: ln, col: cl }; }
        // List aliases: append/push → listAdd, remove → listDelete, insert → listInsert, replace → listReplace, clear/pop → listDeleteAll
        if (v === 'append' || v === 'push') {
            eat(TT.LPAREN); const { value: listName, span: listSpan } = eatVarWithSpan(); eat(TT.COMMA); const item = parseExpr(); eat(TT.RPAREN);
            return { type: 'ListAddStmt', listName, listSpan, item, line: ln, col: cl };
        }
        if (v === 'remove') {
            eat(TT.LPAREN); const { value: listName, span: listSpan } = eatVarWithSpan(); eat(TT.COMMA); const idx = parseExpr(); eat(TT.RPAREN);
            return { type: 'ListDeleteStmt', listName, listSpan, index: idx, line: ln, col: cl };
        }
        if (v === 'insert') {
            eat(TT.LPAREN); const { value: listName, span: listSpan } = eatVarWithSpan(); eat(TT.COMMA); const idx = parseExpr(); eat(TT.COMMA); const item = parseExpr(); eat(TT.RPAREN);
            return { type: 'ListInsertStmt', listName, listSpan, item, index: idx, line: ln, col: cl };
        }
        if (v === 'replace') {
            eat(TT.LPAREN); const { value: listName, span: listSpan } = eatVarWithSpan(); eat(TT.COMMA); const idx = parseExpr(); eat(TT.COMMA); const item = parseExpr(); eat(TT.RPAREN);
            return { type: 'ListReplaceStmt', listName, listSpan, index: idx, item, line: ln, col: cl };
        }
        if (v === 'clear' || v === 'pop') {
            eat(TT.LPAREN); const { value: listName, span: listSpan } = eatVarWithSpan(); eat(TT.RPAREN);
            return { type: 'ListDeleteAllStmt', listName, listSpan, line: ln, col: cl };
        }
        if (v === 'populateList' || v === 'populateArray') {
            eat(TT.LPAREN);
            const { value: listName, span: listSpan } = eatVarWithSpan();
            eat(TT.COMMA);
            const valueExpr = parseExpr();
            eat(TT.COMMA);
            let countExpr;
            if (check(TT.IDENT) && peek().value === 'max') {
                pos++;
                countExpr = { type: 'Num', value: 200000, line: ln, col: cl };
            } else {
                countExpr = parseExpr();
            }
            eat(TT.COMMA);
            const clearFirst = parseExpr();
            eat(TT.RPAREN);
            return { type: 'PopulateListStmt', listName, listSpan, valueExpr, countExpr, clearFirst, line: ln, col: cl };
        }

        // Scratchroutine control
        if (v === 'checkCancel') { args0(ln,cl); return { type: 'CheckCancelStmt', line: ln, col: cl }; }

        {
            const similar = fuzzyMatch(v, Object.keys(CALL_SIGS)).map(k => `\`${CALL_SIGS[k]}\``);
            const hint = similar.length ? `  Did you mean: ${similar.join('  or  ')}?` : '  Commands are camelCase function calls like `move(10)`, `say("hi")`, `forever { }`.';
            errors.push({ line: ln, col: cl, len: v.length || 1,
                message: `Unknown statement \`${v}\`.${hint}` });
        }
        return { type: 'UnknownStmt', value: v, line: ln, col: cl };
    }

    // Expression parser
    function parseExpr()        { return parseTernaryExpr(); }
    function parseTernaryExpr() {
        const t = peek();
        const cond = parseOrExpr();
        if (!check(TT.QUESTION)) return cond;
        pos++;
        const thenE = parseTernaryExpr();
        eat(TT.COLON, '`cond ? a : b` ternary: expected `:` between the two result values');
        const altE = parseTernaryExpr();
        return { type: 'TernaryExpr', cond, then: thenE, alt: altE, line: t.line, col: t.col };
    }
    function parseOrExpr() {
        let left = parseAndExpr();
        while (checkV('or')) { pos++; const right = parseAndExpr(); left = { type: 'BinOp', op: 'or', left, right }; }
        return left;
    }
    function parseAndExpr() {
        let left = parseNotExpr();
        while (checkV('and')) { pos++; const right = parseNotExpr(); left = { type: 'BinOp', op: 'and', left, right }; }
        return left;
    }
    function parseNotExpr() {
        if (checkV('not')) { pos++; return { type: 'UnaryOp', op: 'not', operand: parseNotExpr() }; }
        return parseCompareExpr();
    }
    function parseCompareExpr() {
        let left = parseAddExpr();
        // Collect (op, operand) pairs so chained comparisons work: a < b < c
        const pairs = [];
        while (check(TT.LT) || check(TT.GT) || check(TT.EQ) ||
               check(TT.NEQ) || check(TT.LE) || check(TT.GE)) {
            const op = peek().type; pos++;
            pairs.push({ op, right: parseAddExpr() });
        }
        if (pairs.length === 0) return left;

        // Desugar: != → not(=), <= → not(>), >= → not(<)  (Scratch has only < > =)
        function cmp(op, l, r) {
            switch (op) {
                case TT.NEQ: return { type: 'UnaryOp', op: 'not', operand: { type: 'BinOp', op: TT.EQ, left: l, right: r } };
                case TT.LE:  return { type: 'UnaryOp', op: 'not', operand: { type: 'BinOp', op: TT.GT, left: l, right: r } };
                case TT.GE:  return { type: 'UnaryOp', op: 'not', operand: { type: 'BinOp', op: TT.LT, left: l, right: r } };
                default:     return { type: 'BinOp', op, left: l, right: r };
            }
        }
        // a < b < c → (a < b) and (b < c); middle operands are re-evaluated.
        let result = cmp(pairs[0].op, left, pairs[0].right);
        let prev = pairs[0].right;
        for (let k = 1; k < pairs.length; k++) {
            result = { type: 'BinOp', op: 'and', left: result,
                       right: cmp(pairs[k].op, structuredClone(prev), pairs[k].right) };
            prev = pairs[k].right;
        }
        return result;
    }
    function parseAddExpr() {
        let left = parseMulExpr();
        while (check(TT.PLUS) || check(TT.MINUS)) {
            const op = peek().type; pos++;
            const right = parseMulExpr();
            left = { type: 'BinOp', op, left, right };
        }
        return left;
    }
    function parseMulExpr() {
        let left = parseUnaryExpr();
        while (check(TT.STAR) || check(TT.SLASH) || checkV('mod')) {
            const op = peek().type === TT.STAR ? '*' : peek().type === TT.SLASH ? '/' : 'mod';
            pos++;
            const right = parseUnaryExpr();
            left = { type: 'BinOp', op, left, right };
        }
        return left;
    }
    function parseUnaryExpr() {
        if (check(TT.MINUS)) { pos++; return { type: 'UnaryOp', op: '-', operand: parseUnaryExpr() }; }
        // Pointer sugar: `*[p]` / `*(expr)` dereference, `&[x]` address-of
        if (check(TT.STAR)) {
            const t = peek(); pos++;
            return { type: 'DerefExpr', addr: parseUnaryExpr(), line: t.line, col: t.col };
        }
        if (check(TT.AMP)) {
            const t = peek(); pos++;
            if (!check(TT.VAR)) {
                errors.push({ line: t.line, col: t.col, len: 1,
                    message: '`&` takes the address of a variable: `&[x]`' });
                return { type: 'Num', value: 0, line: t.line, col: t.col };
            }
            const varT = eat(TT.VAR);
            return { type: 'AddrExpr', varName: varT.value, line: t.line, col: t.col,
                     varSpan: { line: varT.line, col: varT.col, endLine: varT.endLine, endCol: varT.endCol } };
        }
        if (check(TT.BANG)) {
            const t = peek();
            errors.push({ line: t.line, col: t.col, len: 1,
                message: 'Use `not` for boolean negation — `!` is only valid as part of `!=`' });
            pos++;
            return { type: 'UnaryOp', op: 'not', operand: parseUnaryExpr() };
        }
        return parseCallExpr();
    }
    function parseCallExpr() {
        const t = peek();
        if (t.type === TT.IDENT || (t.type !== TT.STR && KW_SET.has(t.value) && ['touching','key','xPos','yPos','direction','size','timer','answer','mouseDown','mouseX','mouseY','loudness','costumeNum','costumeName','volume','username','daysSince2000','isRunning'].includes(t.value))) {
            pos++;
            if (check(TT.LPAREN)) {
                eat(TT.LPAREN);
                const args = [];
                while (!check(TT.RPAREN) && !check(TT.EOF)) {
                    args.push(parseExpr());
                    if (!tryEat(TT.COMMA)) break;
                }
                eat(TT.RPAREN, `\`${t.value}(...)\`: expected \`)\` to close the argument list`);
                return { type: 'CallExpr', name: t.value, args, line: t.line, col: t.col };
            }
            // Boolean literals
            if (t.value === 'true' || t.value === 'false') {
                return { type: 'Bool', value: t.value === 'true', line: t.line, col: t.col };
            }
            // Bare reporter keywords
            return { type: 'Reporter', name: t.value, line: t.line, col: t.col };
        }
        return parsePrimaryExpr();
    }
    function parsePrimaryExpr() {
        const t = peek();
        if (check(TT.NUM)) { pos++; return { type: 'Num', value: t.value, line: t.line, col: t.col }; }
        if (check(TT.STR)) { pos++; return { type: 'Str', value: t.value, line: t.line, col: t.col, endLine: t.endLine, endCol: t.endCol }; }
        if (check(TT.ISTR)) {
            pos++;
            // Interpolated string: parse each {expr} fragment, fold into joins
            const exprs = [];
            for (const part of t.parts) {
                if (part.kind === 'str') {
                    if (part.text !== '') exprs.push({ type: 'Str', value: part.text, line: t.line, col: t.col });
                    continue;
                }
                if (!part.src.trim()) {
                    errors.push({ line: part.line, col: part.col, len: 2,
                        message: 'Empty `{}` in string — put an expression inside, or write `{{`/`}}` for literal braces' });
                    continue;
                }
                const fragTokens = tokenize(part.src);
                for (const ft of fragTokens) {
                    if (ft.line === 1) { ft.col = part.col + ft.col - 1; if (ft.endLine === 1) ft.endCol = part.col + (ft.endCol || ft.col) - 1; }
                    ft.line = part.line;
                    if (ft.endLine !== undefined) ft.endLine = part.line;
                }
                const sub = parse(fragTokens, { entry: 'expr' });
                for (const e of sub.errors) {
                    errors.push({ ...e, message: `In \`{…}\` inside string: ${e.message}  (use \`{{\` for a literal brace)` });
                }
                if (sub.expr) exprs.push(sub.expr);
            }
            if (exprs.length === 0) return { type: 'Str', value: '', line: t.line, col: t.col };
            let node = exprs[exprs.length - 1];
            for (let k = exprs.length - 2; k >= 0; k--) {
                node = { type: 'CallExpr', name: 'join', args: [exprs[k], node], line: t.line, col: t.col };
            }
            return node;
        }
        if (check(TT.HEX)) { pos++; return { type: 'Hex', value: t.value, line: t.line, col: t.col }; }
        if (check(TT.VAR)) {
            pos++;
            const varExpr = { type: 'Var', name: t.value, line: t.line, col: t.col, endLine: t.endLine, endCol: t.endCol };
            if (check(TT.DOT)) {
                pos++; // consume '.'
                const mTok = peek();
                if (mTok.type === TT.IDENT) {
                    pos++;
                    const method = mTok.value;
                    eat(TT.LPAREN, `\`[${t.value}].${method}(...)\`: expected \`(\``);
                    const args = [];
                    while (!check(TT.RPAREN) && !check(TT.EOF)) {
                        args.push(parseExpr());
                        if (!tryEat(TT.COMMA)) break;
                    }
                    eat(TT.RPAREN, `\`[${t.value}].${method}(...)\`: expected \`)\``);
                    // sort() is statement-only — can't return a value in expression context
                    if (method === 'sort') {
                        errors.push({ line: t.line, col: t.col, len: t.value.length,
                            message: `\`[${t.value}].sort()\` is a statement — write it on its own line, not inside an expression` });
                        return varExpr;
                    }
                    return { type: 'MemberCall', object: varExpr, method, args, line: t.line, col: t.col };
                }
            }
            // [list][i] subscript sugar → [list].item(i)
            if (check(TT.VAR) && peek().line === t.line) {
                const idxTok = peek(); pos++;
                return { type: 'MemberCall', object: varExpr, method: 'item',
                    args: [{ type: 'Var', name: idxTok.value, line: idxTok.line, col: idxTok.col, endLine: idxTok.endLine, endCol: idxTok.endCol }],
                    line: t.line, col: t.col };
            }
            return varExpr;
        }
        if (check(TT.LPAREN)) {
            pos++;
            const e = parseExpr();
            eat(TT.RPAREN);
            return e;
        }
        {
            const where = callCtx ? ` in ${callCtx}` : '';
            errors.push({ line: t.line, col: t.col, len: Math.max(t.value.length, 1),
                message: `Expected a value (number, string "...", [variable], or expression)${where} — got ${tok(t)}` });
        }
        pos++;
        return { type: 'Num', value: 0 };
    }

    if (opts.entry === 'expr') return { expr: parseExpr(), errors };
    return { ast: parseScript(), errors };
}

// --- Linter ---

export function lint(ast) {
    const items = [];
    const loops = new Set(['ForeverStmt', 'RepeatStmt', 'RepeatUntilStmt', 'WhileStmt', 'DoWhileStmt', 'ForStmt', 'PyForStmt']);
    const hasBreak = node => {
        if (!node || typeof node !== 'object') return false;
        if (Array.isArray(node)) return node.some(hasBreak);
        if (node.type === 'BreakStmt') return true;
        if (loops.has(node.type)) return false;
        return Object.values(node).some(hasBreak);
    };

    // Statements that unconditionally terminate execution in the current script.
    // stopOtherScripts() is intentionally excluded — it stops others but the
    // current script keeps running.
    function isTerminator(stmt) {
        if (stmt.type === 'ForeverStmt') return !hasBreak(stmt.body);
        if (stmt.type === 'StopStmt')
            return stmt.option === 'all' || stmt.option === 'this script';
        return false;
    }

    function warn(stmt, msg, category) {
        items.push({ line: stmt.line || 1, col: stmt.col || 1, message: msg, category });
    }

    function lintBody(stmts) {
        if (!stmts || stmts.length === 0) return;
        let dead = false;
        for (const stmt of stmts) {
            if (dead) {
                warn(stmt, 'Unreachable code', 'Unreachable');
                lintChildren(stmt); // still recurse so nested issues are reported
                continue;
            }
            lintChildren(stmt);
            if (isTerminator(stmt)) dead = true;
        }
    }

    function lintChildren(stmt) {
        if (!stmt) return;
        switch (stmt.type) {
            case 'OnBlock':
            case 'DefineBlock':
            case 'OrphanedBlock':
                lintBody(stmt.body); break;
            case 'IfStmt':
                lintBody(stmt.then);
                if (stmt.alt) lintBody(stmt.alt);
                break;
            case 'ForeverStmt':
            case 'RepeatStmt':
            case 'RepeatUntilStmt':
            case 'WhileStmt':
            case 'ForStmt':
            case 'PyForStmt':
            case 'ScratchroutineStmt':
                lintBody(stmt.body); break;
            case 'AsmStmt':
                if (stmt.mode === 'unsafe') {
                    for (const s of stmt.statements) {
                        if (!ASM_OPCODES[s.opcode]) {
                            warn(s, `Unknown opcode \`${s.opcode}\` — inputs are wired by guesswork`);
                        }
                    }
                }
                break;
        }
    }

    for (const block of (ast.blocks || [])) {
        if (block.type === 'OrphanedBlock') {
            warn(block, 'Never runs — not under a hat block', 'Orphaned');
            lintChildren(block);
        } else if (block.type === 'StructDecl' || block.type === 'EnumDecl') {
            // compile-time declarations — not executable
        } else if (block.type !== 'OnBlock' && block.type !== 'DefineBlock' && block.type !== 'ScratchroutineStmt') {
            warn(block, 'Never runs — not inside `on` or `define`', 'Orphaned');
            lintChildren(block);
        } else {
            lintChildren(block);
        }
    }

    return items;
}

export function typeCheckDiagnostics(ast, spriteName) {
    if (!ast || !ast.blocks) return [];
    const items = [];

    // Build lookup sets from scratchIndex for the active sprite
    const listNames = new Set();
    const varNames  = new Set();
    const allVars   = [
        ...(scratchIndex.globalVariables || []),
        ...(scratchIndex.spriteVariables[spriteName] || []),
    ];
    for (const v of allVars) {
        if (v.type === 'list') listNames.add(v.name);
        else varNames.add(v.name);
    }

    function err(node, msg) {
        items.push({ line: node.line || 1, col: node.col || 1, len: 1, message: msg });
    }

    function checkExpr(node) {
        if (!node) return;
        switch (node.type) {
            case 'MemberCall': {
                const obj = node.object;
                if (obj && obj.type === 'Var') {
                    if (varNames.has(obj.name)) {
                        err(obj, `\`.${node.method}()\` needs a list; \`[${obj.name}]\` is a variable`);
                    } else if (!listNames.has(obj.name)) {
                        err(obj, `\`[${obj.name}]\` isn't a list in Scratch`);
                    }
                }
                for (const a of (node.args || [])) checkExpr(a);
                break;
            }
            case 'BinOp':
                checkExpr(node.left);
                checkExpr(node.right);
                break;
            case 'UnOp':
                checkExpr(node.operand);
                break;
            case 'Call':
                for (const a of (node.args || [])) checkExpr(a);
                break;
        }
    }

    // List-expecting built-ins
    const LIST_BUILTINS = new Set([
        'listAdd', 'listDelete', 'listInsert', 'listReplace',
        'listDeleteAll', 'showList', 'hideList',
        'populateList', 'populateArray',
    ]);
    // Variable-expecting built-ins
    const VAR_BUILTINS = new Set(['showVariable', 'hideVariable']);

    function checkStmt(stmt) {
        if (!stmt) return;
        switch (stmt.type) {
            case 'CallStmt': {
                const fn = stmt.name;
                const firstArg = stmt.args && stmt.args[0];
                if (LIST_BUILTINS.has(fn) && firstArg && firstArg.type === 'Var') {
                    if (varNames.has(firstArg.name)) {
                        err(firstArg, `\`${fn}\` needs a list; \`[${firstArg.name}]\` is a variable`);
                    } else if (!listNames.has(firstArg.name)) {
                        err(firstArg, `\`[${firstArg.name}]\` isn't a list in Scratch`);
                    }
                }
                if (VAR_BUILTINS.has(fn) && firstArg && firstArg.type === 'Var') {
                    if (listNames.has(firstArg.name)) {
                        err(firstArg, `\`${fn}\` needs a variable; \`[${firstArg.name}]\` is a list`);
                    }
                }
                for (const a of (stmt.args || [])) checkExpr(a);
                break;
            }
            case 'SetVarStmt':
            case 'ChangeVarStmt': {
                if (listNames.has(stmt.varName)) {
                    err(stmt, `\`[${stmt.varName}]\` is a list — use list functions`);
                }
                checkExpr(stmt.value);
                break;
            }
            case 'PyForStmt': {
                if (stmt.listName && varNames.has(stmt.listName)) {
                    err(stmt, `\`pyfor\` needs a list; \`[${stmt.listName}]\` is a variable`);
                } else if (stmt.listName && !listNames.has(stmt.listName)) {
                    err(stmt, `\`[${stmt.listName}]\` isn't a list in Scratch`);
                }
                for (const s of (stmt.body || [])) checkStmt(s);
                break;
            }
            case 'PopulateListStmt': {
                if (varNames.has(stmt.listName)) {
                    err(stmt, `\`populateList\` needs a list; \`[${stmt.listName}]\` is a variable`);
                } else if (!listNames.has(stmt.listName)) {
                    err(stmt, `\`[${stmt.listName}]\` isn't a list in Scratch`);
                }
                checkExpr(stmt.valueExpr);
                checkExpr(stmt.countExpr);
                checkExpr(stmt.clearFirst);
                break;
            }
            case 'IfStmt':
                checkExpr(stmt.cond);
                for (const s of (stmt.then || [])) checkStmt(s);
                for (const s of (stmt.alt  || [])) checkStmt(s);
                break;
            case 'ForeverStmt':
            case 'RepeatStmt':
            case 'RepeatUntilStmt':
            case 'WhileStmt':
            case 'ForStmt':
                checkExpr(stmt.cond);
                checkExpr(stmt.from);
                checkExpr(stmt.to);
                for (const s of (stmt.body || [])) checkStmt(s);
                break;
            default:
                // cover expression-bearing fields generically
                for (const k of ['value','msg','secs','x','y','degrees','duration','steps','volume','effect','value2']) {
                    if (stmt[k]) checkExpr(stmt[k]);
                }
                for (const s of (stmt.body || [])) checkStmt(s);
        }
    }

    for (const block of ast.blocks) {
        for (const s of (block.body || [])) checkStmt(s);
    }
    return items;
}

export function uid() {
    return Math.random().toString(36).slice(2, 10) +
           Math.random().toString(36).slice(2, 10);
}

export const PTR_HELPERS_SRC = `
define alloc(n) returns {
    set [__alloc_prev] to 0
    set [__alloc_cur] to [__heap_free]
    while ([__alloc_cur] > 0) {
        if [__heap].item([__alloc_cur] - 1) >= n {
            set [__alloc_next] to [__heap].item([__alloc_cur])
            if [__alloc_prev] = 0 {
                set [__heap_free] to [__alloc_next]
            } else {
                listReplace([__alloc_prev], [__heap], [__alloc_next])
            }
            if [__heap].item([__alloc_cur] - 1) >= n + 2 {
                listReplace([__alloc_cur] + n, [__heap], [__heap].item([__alloc_cur] - 1) - n - 1)
                listReplace([__alloc_cur] + n + 1, [__heap], [__heap_free])
                set [__heap_free] to [__alloc_cur] + n + 1
                listReplace([__alloc_cur] - 1, [__heap], n)
            }
            return [__alloc_cur]
        }
        set [__alloc_prev] to [__alloc_cur]
        set [__alloc_cur] to [__heap].item([__alloc_cur])
    }
    listAdd(n, [__heap])
    set [__alloc_cur] to [__heap].length() + 1
    repeat n {
        listAdd(0, [__heap])
    }
    return [__alloc_cur]
}

define free(p) {
    listReplace(p, [__heap], [__heap_free])
    set [__heap_free] to p
}
`;
const PTR_TEMP_VARS = ['__alloc_prev', '__alloc_cur', '__alloc_next', '__heap_free'];
const HEAP_STATIC_SLOTS = 64;

function scanPointerUse(ast, vm, spriteName) {
    const use = { ptr: false, allocFree: false };
    const sprite = vm.runtime.targets.find(t => spriteName === '__stage__' ? t.isStage : !t.isStage && t.sprite.name === spriteName);
    const stage = vm.runtime.targets.find(t => t.isStage);
    const scalars = new Set([sprite, stage].filter(Boolean).flatMap(t =>
        Object.values(t.variables).filter(v => v.type === '').map(v => v.name)));
    const lists = new Set([sprite, stage].filter(Boolean).flatMap(t =>
        Object.values(t.variables).filter(v => v.type === 'list').map(v => v.name)));
    (function walk(n) {
        if (!n || typeof n !== 'object') return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        if (n.type === 'MemberCall' && n.method === 'item' && n.object.type === 'Var' && scalars.has(n.object.name) && !lists.has(n.object.name)) use.ptr = true;
        if (n.type === 'AddrExpr' || n.type === 'DerefExpr' || n.type === 'DerefSetStmt') use.ptr = true;
        if ((n.type === 'CallExpr' || n.type === 'CallStmt') && (n.name === 'alloc' || n.name === 'free')) use.allocFree = true;
        for (const k of Object.keys(n)) {
            const v = n[k];
            if (v && typeof v === 'object') walk(v);
        }
    })(ast.blocks);
    return use;
}

export function compileSource(source, vm, spriteName, { embedSource = false, embedUntilLine = Infinity, optimize = true, projectFacts = null } = {}) {
    const tokens = tokenize(source);
    const { ast, errors: parseErrors } = parse(tokens);
    if (parseErrors.length > 0) return { blocks: {}, errors: parseErrors };

    const ptrUse = scanPointerUse(ast, vm, spriteName);
    let helperInjected = false;
    if (ptrUse.allocFree) {
        const userDefines = new Set(ast.blocks.filter(b => b.type === 'DefineBlock').map(b => b.name));
        if (!userDefines.has('alloc') && !userDefines.has('free')) {
            const helper = parse(tokenize(PTR_HELPERS_SRC));
            for (const b of helper.ast.blocks) {
                b._synthetic = true;
                if (b.name === 'free') b._forceWarp = true;
            }
            ast.blocks.push(...helper.ast.blocks);
            helperInjected = true;
        }
    }
    if (ptrUse.ptr || helperInjected) ast._usesHeap = true;

    const heapVars = helperInjected ? PTR_TEMP_VARS : ast._usesHeap ? ['__heap_free'] : [];
    const facts = optimize && projectFacts?.text === source ? projectFacts : null;
    const compileWith = (passes) => compileWithSLVM(ast, vm, spriteName, { passes, heapVars, heapStaticSlots: HEAP_STATIC_SLOTS, facts });
    let compiled = compileWith(optimize ? ['O1'] : ['legalize']);
    let optimizerFallback = null;
    if (optimize && compiled.errors.some(error => error.message.startsWith('SLVM:'))) {
        optimizerFallback = compiled.errors[0].message;
        compiled = compileWith(['legalize']);
    }
    if (compiled.errors.length > 0) return compiled;
    const declSpans = ast.blocks.filter(block => block.type === 'EnumDecl' || block.type === 'StructDecl').map(block => block.span);
    const comments = buildComments({ tags: compiled.tags, blocks: compiled.blocks, source, embedSource, embedUntilLine, declSpans });
    return { ...compiled, comments, optimizerFallback, usedProjectFacts: !!facts };
}
