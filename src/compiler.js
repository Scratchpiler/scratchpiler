import { KEYWORDS } from "./constants.js";
import { scratchIndex } from "./vm.js";

// [L] DSL Compiler

// --- Lexer ---

const TT = {
    NUM: 'NUM', STR: 'STR', IDENT: 'IDENT', VAR: 'VAR',
    LBRACE: '{', RBRACE: '}', LPAREN: '(', RPAREN: ')',
    COMMA: ',', COLON: ':', HASH: '#', HEX: 'HEX', DOT: '.',
    LT: '<', GT: '>', EQ: '=', PLUS: '+', MINUS: '-',
    STAR: '*', SLASH: '/', EOF: 'EOF',
};

const KW_SET = new Set(KEYWORDS);

export function tokenize(src) {
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
            while (i < src.length && src[i] !== '\n') i++;
            continue;
        }
        const startLine = line, startCol = col;
        const c = src[i];

        // String literal
        if (c === '"') {
            advance();
            let s = '';
            while (i < src.length && src[i] !== '"') s += advance();
            if (src[i] === '"') advance();
            tokens.push({ type: TT.STR, value: s, line: startLine, col: startCol });
            continue;
        }

        // Variable [...]
        if (c === '[') {
            advance();
            let s = '';
            while (i < src.length && src[i] !== ']') s += advance();
            if (src[i] === ']') advance();
            tokens.push({ type: TT.VAR, value: s.trim(), line: startLine, col: startCol });
            continue;
        }

        // Number (including negative handled at parser level)
        if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i+1]))) {
            let s = '';
            while (i < src.length && /[0-9.]/.test(src[i])) s += advance();
            tokens.push({ type: TT.NUM, value: parseFloat(s), line: startLine, col: startCol });
            continue;
        }

        // Identifier / keyword
        if (/[a-zA-Z_]/.test(c)) {
            let s = '';
            while (i < src.length && /[\w]/.test(src[i])) s += advance();
            tokens.push({ type: KW_SET.has(s) ? s : TT.IDENT, value: s, line: startLine, col: startCol });
            continue;
        }

        // Hex color literal #rrggbb
        if (c === '#') {
            const hex6 = src.slice(i + 1, i + 7);
            if (/^[0-9a-fA-F]{6}$/.test(hex6)) {
                advance(); // consume '#'
                for (let h = 0; h < 6; h++) advance();
                tokens.push({ type: TT.HEX, value: '#' + hex6, line: startLine, col: startCol });
                continue;
            }
        }

        // Single-char tokens
        const SINGLE = { '{': TT.LBRACE, '}': TT.RBRACE, '(': TT.LPAREN, ')': TT.RPAREN,
                          ',': TT.COMMA,  ':': TT.COLON, '<': TT.LT, '>': TT.GT,
                          '=': TT.EQ, '+': TT.PLUS, '-': TT.MINUS, '*': TT.STAR,
                          '/': TT.SLASH, '#': TT.HASH, '.': TT.DOT };
        if (SINGLE[c]) {
            advance();
            tokens.push({ type: SINGLE[c], value: c, line: startLine, col: startCol });
            continue;
        }

        // Unknown — skip with warning
        console.warn(`[scratchpiler] unexpected char: ${c} at ${line}:${col}`);
        advance();
    }

    tokens.push({ type: TT.EOF, value: '', line, col });
    return tokens;
}

// --- Parser ---

// Human-readable names for token types
const TOKEN_NAMES = {
    '(': '`(`', ')': '`)`', '{': '`{`', '}': '`}`',
    ',': '`,`', ':': '`:`',
    NUM: 'a number', STR: 'a string (e.g. "hello")',
    VAR: 'a variable (e.g. [score])', IDENT: 'an identifier', EOF: 'end of file',
};

// Full call signatures for every built-in — shown in error messages
const CALL_SIGS = {
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
};

export function parse(tokens) {
    let pos = 0;
    let callCtx = '';  // set before args helpers; picked up automatically by eat()
    const errors = [];

    function peek()     { return tokens[pos]; }
    function peekType() { return tokens[pos].type; }

    function tok(t) {
        if (t.type === TT.EOF) return 'end of file';
        if (t.type === TT.STR) return `string "${t.value}"`;
        if (t.type === TT.NUM) return `number ${t.value}`;
        if (t.type === TT.VAR) return `[${t.value}]`;
        return `"${t.value}"`;
    }

    // ctx overrides callCtx for one eat() call when you need a specific message
    function eat(type, ctx) {
        if (tokens[pos].type === type) return tokens[pos++];
        const t = tokens[pos];
        const expected = TOKEN_NAMES[type] || `"${type}"`;
        const where = ctx || callCtx;
        const msg = where
            ? `${where} — expected ${expected}, got ${tok(t)}`
            : `Expected ${expected}, got ${tok(t)}`;
        errors.push({ line: t.line, col: t.col, len: Math.max(t.value.length, 1), message: msg });
        return t;
    }
    function check(type) { return tokens[pos].type === type; }
    function checkV(val) { return tokens[pos].value === val; }
    function tryEat(type) { if (check(type)) { pos++; return true; } return false; }
    function tryEatV(val) { if (checkV(val)) { pos++; return true; } return false; }

    function parseScript() {
        const blocks = [];
        while (!check(TT.EOF)) {
            if (checkV('on') || checkV('define')) {
                blocks.push(parseHatBlock());
            } else if (checkV('scratchroutine')) {
                blocks.push(parseScratchroutine());
            } else if (checkV('struct')) {
                blocks.push(parseStruct());
            } else if (checkV('enum') || checkV('enums')) {
                blocks.push(parseEnum());
            } else if (check(TT.LBRACE)) {
                // Bare { ... } block with no hat — parse cleanly, lint will flag it
                const t = peek();
                const body = parseBody();
                blocks.push({ type: 'OrphanedBlock', body, line: t.line, col: t.col });
            } else {
                // Top-level statement without a hat — parse it so the rest of the file
                // continues to work, lint will flag it as orphaned
                blocks.push(parseStatement());
            }
        }
        return { type: 'Script', blocks };
    }

    function parseHatBlock() {
        if (checkV('define')) {
            pos++;
            const nameT = peek(); pos++;
            eat(TT.LPAREN, '`define name(params)`: expected `(` after the block name');
            const params = [];
            while (!check(TT.RPAREN) && !check(TT.EOF)) {
                params.push(peek().value); pos++;
                if (!tryEat(TT.COMMA)) break;
            }
            eat(TT.RPAREN, '`define name(params)`: expected `)` to close the parameter list');
            const body = parseBody();
            return { type: 'DefineBlock', name: nameT.value, params, body,
                     line: nameT.line, col: nameT.col };
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
        if (checkV('receive')) { pos++; const msg = eat(TT.STR, '`on receive "..."`: expected a quoted message name').value; return { event: 'receive', msg, line: t.line, col: t.col }; }
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

        return parseSimpleStatement();
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
        const body = parseBody();
        return { type: 'RepeatStmt', count, body, line: t.line, col: t.col };
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
        const varName = check(TT.VAR) ? eat(TT.VAR).value : '_err_';
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
        const body = parseBody();
        return { type: 'ForStmt', varName, from: fromExpr, to: toExpr, body, line: t.line, col: t.col };
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
        return { type: 'PyForStmt', varName: varTok.value, listName: listTok.value, body, line: t.line, col: t.col };
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
        if (check(TT.LPAREN)) {
            eat(TT.LPAREN);
            while (!check(TT.RPAREN) && !check(TT.EOF)) {
                params.push(peek().value); pos++;
                if (!tryEat(TT.COMMA)) break;
            }
            eat(TT.RPAREN);
        }
        const body = parseBody();
        return { type: 'ScratchroutineStmt', name, params, body, line: t.line, col: t.col };
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
        return { type: mode === 'launch' ? 'LaunchStmt' : 'AwaitStmt', name, args, line: t.line, col: t.col };
    }

    function parseCancel() {
        const t = peek(); pos++; // consume 'cancel'
        const nameTok = peek();
        if (nameTok.type !== TT.IDENT) {
            errors.push({ line: t.line, col: t.col, len: 6,
                message: '`cancel name`: expected a scratchroutine name after `cancel`' });
        }
        const name = nameTok.type === TT.IDENT ? (pos++, nameTok.value) : '_err_';
        return { type: 'CancelStmt', name, line: t.line, col: t.col };
    }

    function parseBreakpoint() {
        const t = peek(); pos++;
        return { type: 'BreakpointStmt', line: t.line, col: t.col };
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
            entries.push({ name, value });
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
        eat(TT.LBRACE, '`struct` declaration — expected `{` after the struct name');
        while (!check(TT.RBRACE) && !check(TT.EOF)) {
            const fTok = peek();
            if (fTok.type === TT.IDENT) { fields.push(fTok.value); pos++; }
            tryEat(TT.COMMA);
        }
        eat(TT.RBRACE, '`struct` declaration — expected `}` to close field list');
        return { type: 'StructDecl', name, fields, line: t.line, col: t.col };
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
                object: { type: 'Var', name: t.value, line: t.line, col: t.col },
                method, args, line: t.line, col: t.col };
        }

        // Increment / decrement: [var]++ or [var]--
        if (t.type === TT.VAR) {
            const n1 = tokens[pos+1], n2 = tokens[pos+2];
            if (n1 && n2 && n1.type === TT.PLUS  && n2.type === TT.PLUS) {
                pos += 3;
                return { type: 'ChangeVarStmt', varName: t.value,
                         value: { type: 'Num', value: 1,  line: t.line, col: t.col }, line: t.line, col: t.col };
            }
            if (n1 && n2 && n1.type === TT.MINUS && n2.type === TT.MINUS) {
                pos += 3;
                return { type: 'ChangeVarStmt', varName: t.value,
                         value: { type: 'Num', value: -1, line: t.line, col: t.col }, line: t.line, col: t.col };
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
                    if (op === '+') return { type: 'ChangeVarStmt', varName, value: rhs, line: t.line, col: t.col };
                    // For *=, /=, -= we need set [v] to ([v] op rhs)
                    const varRef = { type: 'Var', name: varName, line: t.line, col: t.col };
                    const binop  = { type: 'BinOp', op, left: varRef, right: rhs };
                    return { type: 'SetVarStmt', varName, value: binop, line: t.line, col: t.col };
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
            const target = first.type === 'Str' ? first.value : '_mouse_';
            return { type: 'GoToStmt', target, line: ln, col: cl };
        }
        if (v === 'glide') {
            eat(TT.LPAREN);
            const secs = parseExpr();
            eat(TT.COMMA);
            if (check(TT.STR)) {
                const target = eat(TT.STR).value; eat(TT.RPAREN);
                return { type: 'GlideToStmt', secs, target, line: ln, col: cl };
            }
            const x = parseExpr(); eat(TT.COMMA); const y = parseExpr(); eat(TT.RPAREN);
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
            return { type: 'CreateCloneStmt', target: s.type === 'Str' ? s.value : '_myself_', line: ln, col: cl };
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

        // New list ops
        if (v === 'listDeleteAll') { eat(TT.LPAREN); const listName = eat(TT.VAR).value; eat(TT.RPAREN); return { type: 'ListDeleteAllStmt', listName, line: ln, col: cl }; }

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
            if (!check(TT.VAR)) {
                errors.push({ line: ln, col: cl, len: v.length,
                    message: `\`set\` must be followed by a [variable], e.g. \`set [score] to 0\` — got ${tok(peek())}` });
                return { type: 'UnknownStmt', value: v, line: ln, col: cl };
            }
            const varName = eat(TT.VAR).value; tryEatV('to');
            return { type: 'SetVarStmt', varName, value: parseExpr(), line: ln, col: cl };
        }
        if (v === 'change') {
            if (!check(TT.VAR)) {
                errors.push({ line: ln, col: cl, len: v.length,
                    message: `\`change\` must be followed by a [variable], e.g. \`change [score] by 1\` — got ${tok(peek())}` });
                return { type: 'UnknownStmt', value: v, line: ln, col: cl };
            }
            const varName = eat(TT.VAR).value; tryEatV('by');
            return { type: 'ChangeVarStmt', varName, value: parseExpr(), line: ln, col: cl };
        }
        if (v === 'showVariable') { eat(TT.LPAREN); const va = eat(TT.VAR).value; eat(TT.RPAREN); return { type: 'ShowVarStmt', name: va, line: ln, col: cl }; }
        if (v === 'hideVariable') { eat(TT.LPAREN); const va = eat(TT.VAR).value; eat(TT.RPAREN); return { type: 'HideVarStmt', name: va, line: ln, col: cl }; }
        if (v === 'showList')     { eat(TT.LPAREN); const va = eat(TT.VAR).value; eat(TT.RPAREN); return { type: 'ShowListStmt', name: va, line: ln, col: cl }; }
        if (v === 'hideList')     { eat(TT.LPAREN); const va = eat(TT.VAR).value; eat(TT.RPAREN); return { type: 'HideListStmt', name: va, line: ln, col: cl }; }

        // Lists
        if (v === 'listAdd') {
            eat(TT.LPAREN); const item = parseExpr(); eat(TT.COMMA); const listName = eat(TT.VAR).value; eat(TT.RPAREN);
            return { type: 'ListAddStmt', listName, item, line: ln, col: cl };
        }
        if (v === 'listDelete') {
            eat(TT.LPAREN); const idx = parseExpr(); eat(TT.COMMA); const listName = eat(TT.VAR).value; eat(TT.RPAREN);
            return { type: 'ListDeleteStmt', listName, index: idx, line: ln, col: cl };
        }
        if (v === 'listInsert') {
            eat(TT.LPAREN); const item = parseExpr(); eat(TT.COMMA); const idx = parseExpr(); eat(TT.COMMA); const listName = eat(TT.VAR).value; eat(TT.RPAREN);
            return { type: 'ListInsertStmt', listName, item, index: idx, line: ln, col: cl };
        }
        if (v === 'listReplace') {
            eat(TT.LPAREN); const idx = parseExpr(); eat(TT.COMMA); const listName = eat(TT.VAR).value; eat(TT.COMMA); const item = parseExpr(); eat(TT.RPAREN);
            return { type: 'ListReplaceStmt', listName, index: idx, item, line: ln, col: cl };
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
            eat(TT.LPAREN); const listName = eat(TT.VAR).value; eat(TT.COMMA); const item = parseExpr(); eat(TT.RPAREN);
            return { type: 'ListAddStmt', listName, item, line: ln, col: cl };
        }
        if (v === 'remove') {
            eat(TT.LPAREN); const listName = eat(TT.VAR).value; eat(TT.COMMA); const idx = parseExpr(); eat(TT.RPAREN);
            return { type: 'ListDeleteStmt', listName, index: idx, line: ln, col: cl };
        }
        if (v === 'insert') {
            eat(TT.LPAREN); const listName = eat(TT.VAR).value; eat(TT.COMMA); const idx = parseExpr(); eat(TT.COMMA); const item = parseExpr(); eat(TT.RPAREN);
            return { type: 'ListInsertStmt', listName, item, index: idx, line: ln, col: cl };
        }
        if (v === 'replace') {
            eat(TT.LPAREN); const listName = eat(TT.VAR).value; eat(TT.COMMA); const idx = parseExpr(); eat(TT.COMMA); const item = parseExpr(); eat(TT.RPAREN);
            return { type: 'ListReplaceStmt', listName, index: idx, item, line: ln, col: cl };
        }
        if (v === 'clear' || v === 'pop') {
            eat(TT.LPAREN); const listName = eat(TT.VAR).value; eat(TT.RPAREN);
            return { type: 'ListDeleteAllStmt', listName, line: ln, col: cl };
        }
        if (v === 'populateList' || v === 'populateArray') {
            eat(TT.LPAREN);
            const listName = eat(TT.VAR).value;
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
            let clearFirst;
            if (check(TT.IDENT) && peek().value === 'true')  { pos++; clearFirst = { type: 'Num', value: 1, line: ln, col: cl }; }
            else if (check(TT.IDENT) && peek().value === 'false') { pos++; clearFirst = { type: 'Num', value: 0, line: ln, col: cl }; }
            else clearFirst = parseExpr();
            eat(TT.RPAREN);
            return { type: 'PopulateListStmt', listName, valueExpr, countExpr, clearFirst, line: ln, col: cl };
        }

        // Scratchroutine control
        if (v === 'checkCancel') { args0(ln,cl); return { type: 'CheckCancelStmt', line: ln, col: cl }; }

        {
            const all = Object.keys(CALL_SIGS);
            const vl = v.toLowerCase();
            const similar = all.filter(k => {
                const kl = k.toLowerCase();
                return kl.startsWith(vl) || vl.startsWith(kl.slice(0, 3)) || kl.includes(vl) || vl.includes(kl.slice(0, 4));
            }).slice(0, 3).map(k => `\`${CALL_SIGS[k]}\``);
            const hint = similar.length ? `  Did you mean: ${similar.join('  or  ')}?` : '  Commands are camelCase function calls like `move(10)`, `say("hi")`, `forever { }`.';
            errors.push({ line: ln, col: cl, len: v.length || 1,
                message: `Unknown statement \`${v}\`.${hint}` });
        }
        return { type: 'UnknownStmt', value: v, line: ln, col: cl };
    }

    // Expression parser
    function parseExpr()        { return parseOrExpr(); }
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
        if (check(TT.LT) || check(TT.GT) || check(TT.EQ)) {
            const op = peek().type; pos++;
            const right = parseAddExpr();
            left = { type: 'BinOp', op, left, right };
        }
        return left;
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
        return parseCallExpr();
    }
    function parseCallExpr() {
        const t = peek();
        if (t.type === TT.IDENT || (KW_SET.has(t.value) && ['touching','key','xPos','yPos','direction','size','timer','answer','mouseDown','mouseX','mouseY','loudness','costumeNum','costumeName','volume','username','daysSince2000','isRunning'].includes(t.value))) {
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
            // Bare reporter keywords
            return { type: 'Reporter', name: t.value, line: t.line, col: t.col };
        }
        return parsePrimaryExpr();
    }
    function parsePrimaryExpr() {
        const t = peek();
        if (check(TT.NUM)) { pos++; return { type: 'Num', value: t.value, line: t.line, col: t.col }; }
        if (check(TT.STR)) { pos++; return { type: 'Str', value: t.value, line: t.line, col: t.col }; }
        if (check(TT.HEX)) { pos++; return { type: 'Hex', value: t.value, line: t.line, col: t.col }; }
        if (check(TT.VAR)) {
            pos++;
            const varExpr = { type: 'Var', name: t.value, line: t.line, col: t.col };
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
                    args: [{ type: 'Var', name: idxTok.value, line: idxTok.line, col: idxTok.col }],
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

    return { ast: parseScript(), errors };
}

// --- Linter ---

export function lint(ast) {
    const items = [];

    // Statements that unconditionally terminate execution in the current script.
    // stopOtherScripts() is intentionally excluded — it stops others but the
    // current script keeps running.
    function isTerminator(stmt) {
        if (stmt.type === 'ForeverStmt')    return true;
        if (stmt.type === 'DeleteCloneStmt') return true;
        if (stmt.type === 'StopStmt')
            return stmt.option === 'all' || stmt.option === 'this script';
        return false;
    }

    function warn(stmt, msg) {
        items.push({ line: stmt.line || 1, col: stmt.col || 1, message: msg });
    }

    function lintBody(stmts) {
        if (!stmts || stmts.length === 0) return;
        let dead = false;
        for (const stmt of stmts) {
            if (dead) {
                warn(stmt, 'Unreachable code — this statement can never execute after a terminator (stopAll, stopThis, forever, deleteClone)');
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
        }
    }

    for (const block of (ast.blocks || [])) {
        if (block.type === 'OrphanedBlock') {
            warn(block, 'Orphaned block — no hat event to trigger it. Wrap with `on flag { }`, `on click { }`, etc.');
            lintChildren(block);
        } else if (block.type === 'StructDecl' || block.type === 'EnumDecl') {
            // compile-time declarations — not executable
        } else if (block.type !== 'OnBlock' && block.type !== 'DefineBlock' && block.type !== 'ScratchroutineStmt') {
            warn(block, 'Orphaned statement — not inside an `on` or `define` block, will never run');
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
                        err(obj, `\`[${obj.name}]\` is a variable, not a list — \`.${node.method}()\` requires a list`);
                    } else if (!listNames.has(obj.name)) {
                        err(obj, `\`[${obj.name}]\` is not defined — create a list in Scratch first`);
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
                        err(firstArg, `\`${fn}\` expects a list — [${firstArg.name}] is a variable`);
                    } else if (!listNames.has(firstArg.name)) {
                        err(firstArg, `\`${fn}\`: [${firstArg.name}] is not defined as a list`);
                    }
                }
                if (VAR_BUILTINS.has(fn) && firstArg && firstArg.type === 'Var') {
                    if (listNames.has(firstArg.name)) {
                        err(firstArg, `\`${fn}\` expects a variable — [${firstArg.name}] is a list (use showList / hideList instead)`);
                    }
                }
                for (const a of (stmt.args || [])) checkExpr(a);
                break;
            }
            case 'SetVarStmt':
            case 'ChangeVarStmt': {
                if (listNames.has(stmt.varName)) {
                    err(stmt, `\`[${stmt.varName}]\` is a list — use list functions (listAdd, listReplace…) instead of set/change`);
                }
                checkExpr(stmt.value);
                break;
            }
            case 'PyForStmt': {
                if (stmt.listName && varNames.has(stmt.listName)) {
                    err(stmt, `\`pyfor … in [${stmt.listName}]\`: [${stmt.listName}] is a variable, not a list`);
                } else if (stmt.listName && !listNames.has(stmt.listName)) {
                    err(stmt, `\`pyfor … in [${stmt.listName}]\`: [${stmt.listName}] is not defined — create a list in Scratch first`);
                }
                for (const s of (stmt.body || [])) checkStmt(s);
                break;
            }
            case 'PopulateListStmt': {
                if (varNames.has(stmt.listName)) {
                    err(stmt, `\`populateList\` expects a list — [${stmt.listName}] is a variable`);
                } else if (!listNames.has(stmt.listName)) {
                    err(stmt, `\`populateList\`: [${stmt.listName}] is not defined — create a list in Scratch first`);
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

// --- Code Generator ---

export function uid() {
    return Math.random().toString(36).slice(2, 10) +
           Math.random().toString(36).slice(2, 10);
}

function compile(ast, vm, spriteName) {
    const blocks = {};
    const errors = [];
    let scriptIndex = 0;
    // Maps loop-variable name → {id, name, type} for active for-loop scopes
    const forScope = {};
    // Maps scratchroutine param name → internal variable name (active inside a routine body)
    const routineScope = {};
    // Name of the currently-compiling scratchroutine (for checkCancel)
    let currentRoutineName = null;

    // Resolve variable/list id by name (searches sprite then stage/globals)
    function resolveVar(name) {
        // for-loop / routine param variables take precedence over Scratch variables
        if (forScope[name])   return forScope[name];
        if (routineScope[name]) return routineScope[name];
        const target = spriteName === '__stage__'
            ? vm.runtime.targets.find(t => t.isStage)
            : vm.runtime.targets.find(t => t.sprite.name === spriteName);
        const stage  = vm.runtime.targets.find(t => t.isStage);
        if (target) {
            const v = Object.values(target.variables).find(v => v.name === name);
            if (v) return { id: v.id, name: v.name, type: v.type };
        }
        if (stage) {
            const v = Object.values(stage.variables).find(v => v.name === name);
            if (v) return { id: v.id, name: v.name, type: v.type };
        }
        return null;
    }

    function resolveBroadcast(name) {
        const stage = vm.runtime.targets.find(t => t.isStage);
        if (stage) {
            const v = Object.values(stage.variables).find(v => v.name === name && v.type === 'broadcast_msg');
            if (v) return v.id;
        }
        return uid(); // new broadcast
    }

    function addBlock(b) { blocks[b.id] = b; return b.id; }

    function inp(blockId, shadowId) {
        return { name: '', block: blockId, shadow: shadowId !== undefined ? shadowId : null };
    }

    function numInput(expr, parentId) {
        expr = resolveEnum(expr);
        const shadowId = uid();
        const val = expr.type === 'Num' ? String(expr.value) : expr.type === 'Str' ? expr.value : '0';
        addBlock({ id: shadowId, opcode: 'math_number', next: null, parent: parentId,
            inputs: {}, fields: { NUM: { name: 'NUM', value: val } },
            shadow: true, topLevel: false });
        if (expr.type === 'Num' || expr.type === 'Str') return inp(shadowId, shadowId);
        const exprId = genExpr(expr, parentId);
        return inp(exprId !== null ? exprId : shadowId, shadowId);
    }

    function strInput(expr, parentId) {
        expr = resolveEnum(expr);
        if (expr.type === 'Hex') {
            const hexId = uid();
            addBlock({ id: hexId, opcode: 'colour_picker', next: null, parent: parentId,
                inputs: {}, fields: { COLOUR: { name: 'COLOUR', value: expr.value } },
                shadow: true, topLevel: false });
            return inp(hexId, hexId);
        }
        const shadowId = uid();
        const val = expr.type === 'Str' ? expr.value : expr.type === 'Num' ? String(expr.value) : '';
        addBlock({ id: shadowId, opcode: 'text', next: null, parent: parentId,
            inputs: {}, fields: { TEXT: { name: 'TEXT', value: val } },
            shadow: true, topLevel: false });
        if (expr.type === 'Str' || expr.type === 'Num') return inp(shadowId, shadowId);
        const exprId = genExpr(expr, parentId);
        return inp(exprId !== null ? exprId : shadowId, shadowId);
    }

    function boolInput(expr, parentId) {
        const exprId = genExpr(expr, parentId);
        return inp(exprId, null);
    }

    // Returns a block id if expr needs a block, else null for primitives
    function genExpr(expr, parentId) {
        expr = resolveEnum(expr);
        if (expr.type === 'Num' || expr.type === 'Str') return null;
        if (expr.type === 'Hex') {
            const id = uid();
            addBlock({ id, opcode: 'colour_picker', next: null, parent: parentId,
                inputs: {}, fields: { COLOUR: { name: 'COLOUR', value: expr.value } },
                shadow: true, topLevel: false });
            return id;
        }
        if (expr.type === 'Var') {
            const v = resolveVar(expr.name);
            if (!v) {
                errors.push({ line: expr.line || 1, col: expr.col || 1, len: expr.name.length,
                              message: `Variable not found: ${expr.name}` });
                return null;
            }
            const id = uid();
            addBlock({ id, opcode: 'data_variable', next: null, parent: parentId,
                inputs: {}, fields: { VARIABLE: { name: 'VARIABLE', value: v.name, id: v.id } },
                shadow: false, topLevel: false });
            return id;
        }
        if (expr.type === 'UnaryOp' && expr.op === '-') {
            // Negate: use operator_subtract(0, expr)
            const id = uid();
            const zeroId = uid();
            addBlock({ id: zeroId, opcode: 'math_number', next: null, parent: id,
                inputs: {}, fields: { NUM: { name: 'NUM', value: '0' } },
                shadow: true, topLevel: false });
            const innerInput = numInput(expr.operand, id);
            addBlock({ id, opcode: 'operator_subtract', next: null, parent: parentId,
                inputs: { NUM1: inp(zeroId, zeroId), NUM2: innerInput },
                fields: {}, shadow: false, topLevel: false });
            return id;
        }
        if (expr.type === 'UnaryOp' && expr.op === 'not') {
            const id = uid();
            const inner = boolInput(expr.operand, id);
            addBlock({ id, opcode: 'operator_not', next: null, parent: parentId,
                inputs: { OPERAND: inner }, fields: {}, shadow: false, topLevel: false });
            return id;
        }
        if (expr.type === 'BinOp') {
            return genBinOp(expr, parentId);
        }
        if (expr.type === 'Reporter') {
            return genReporter(expr, parentId);
        }
        if (expr.type === 'CallExpr') {
            return genCallExpr(expr, parentId);
        }
        if (expr.type === 'MemberCall') {
            return genMemberCall(expr, parentId);
        }
        return null;
    }

    function genMemberCall(expr, parentId) {
        const id  = uid();
        const obj = expr.object;
        const m   = expr.method;
        const v   = resolveVar(obj.name);

        // length / len
        if (m === 'length' || m === 'len') {
            if (v && v.type === 'list') {
                // length of list
                if (!v) { errors.push({ line: obj.line||1, col: obj.col||1, len: obj.name.length, message: `List not found: ${obj.name}` }); return null; }
                addBlock({ id, opcode: 'data_lengthoflist', next: null, parent: parentId,
                    inputs: {}, fields: { LIST: { name: 'LIST', value: v.name, id: v.id } },
                    shadow: false, topLevel: false });
            } else {
                // string length of variable
                addBlock({ id, opcode: 'operator_length', next: null, parent: parentId,
                    inputs: { STRING: strInput(obj, id) },
                    fields: {}, shadow: false, topLevel: false });
            }
            return id;
        }

        if (!v) {
            errors.push({ line: obj.line||1, col: obj.col||1, len: obj.name.length, message: `Variable/list not found: ${obj.name}` });
            return null;
        }

        // contains(item)
        if (m === 'contains') {
            const item = expr.args[0] || { type: 'Str', value: '' };
            addBlock({ id, opcode: 'data_listcontainsitem', next: null, parent: parentId,
                inputs: { ITEM: strInput(item, id) },
                fields: { LIST: { name: 'LIST', value: v.name, id: v.id } },
                shadow: false, topLevel: false });
            return id;
        }
        // item(index)
        if (m === 'item') {
            const idx = expr.args[0] || { type: 'Num', value: 1 };
            addBlock({ id, opcode: 'data_itemoflist', next: null, parent: parentId,
                inputs: { INDEX: numInput(idx, id) },
                fields: { LIST: { name: 'LIST', value: v.name, id: v.id } },
                shadow: false, topLevel: false });
            return id;
        }
        // indexOf(item)
        if (m === 'indexOf' || m === 'itemNumber') {
            const item = expr.args[0] || { type: 'Str', value: '' };
            addBlock({ id, opcode: 'data_itemnumoflist', next: null, parent: parentId,
                inputs: { ITEM: strInput(item, id) },
                fields: { LIST: { name: 'LIST', value: v.name, id: v.id } },
                shadow: false, topLevel: false });
            return id;
        }

        errors.push({ line: expr.line||1, col: expr.col||1, len: m.length,
            message: `Unknown method .${m}() — expression methods: .length(), .contains(item), .item(index), .indexOf(item) | statement method: .sort() / .sort("desc")` });
        return null;
    }

    function genBinOp(expr, parentId) {
        const op = expr.op;
        const id = uid();
        if (op === 'or') {
            addBlock({ id, opcode: 'operator_or', next: null, parent: parentId,
                inputs: { OPERAND1: boolInput(expr.left, id), OPERAND2: boolInput(expr.right, id) },
                fields: {}, shadow: false, topLevel: false });
        } else if (op === 'and') {
            addBlock({ id, opcode: 'operator_and', next: null, parent: parentId,
                inputs: { OPERAND1: boolInput(expr.left, id), OPERAND2: boolInput(expr.right, id) },
                fields: {}, shadow: false, topLevel: false });
        } else if (op === '+') {
            addBlock({ id, opcode: 'operator_add', next: null, parent: parentId,
                inputs: { NUM1: numInput(expr.left, id), NUM2: numInput(expr.right, id) },
                fields: {}, shadow: false, topLevel: false });
        } else if (op === '-') {
            addBlock({ id, opcode: 'operator_subtract', next: null, parent: parentId,
                inputs: { NUM1: numInput(expr.left, id), NUM2: numInput(expr.right, id) },
                fields: {}, shadow: false, topLevel: false });
        } else if (op === '*') {
            addBlock({ id, opcode: 'operator_multiply', next: null, parent: parentId,
                inputs: { NUM1: numInput(expr.left, id), NUM2: numInput(expr.right, id) },
                fields: {}, shadow: false, topLevel: false });
        } else if (op === '/') {
            addBlock({ id, opcode: 'operator_divide', next: null, parent: parentId,
                inputs: { NUM1: numInput(expr.left, id), NUM2: numInput(expr.right, id) },
                fields: {}, shadow: false, topLevel: false });
        } else if (op === 'mod') {
            addBlock({ id, opcode: 'operator_mod', next: null, parent: parentId,
                inputs: { NUM1: numInput(expr.left, id), NUM2: numInput(expr.right, id) },
                fields: {}, shadow: false, topLevel: false });
        } else if (op === TT.LT || op === '<') {
            addBlock({ id, opcode: 'operator_lt', next: null, parent: parentId,
                inputs: { OPERAND1: numInput(expr.left, id), OPERAND2: numInput(expr.right, id) },
                fields: {}, shadow: false, topLevel: false });
        } else if (op === TT.GT || op === '>') {
            addBlock({ id, opcode: 'operator_gt', next: null, parent: parentId,
                inputs: { OPERAND1: numInput(expr.left, id), OPERAND2: numInput(expr.right, id) },
                fields: {}, shadow: false, topLevel: false });
        } else if (op === TT.EQ || op === '=') {
            addBlock({ id, opcode: 'operator_equals', next: null, parent: parentId,
                inputs: { OPERAND1: strInput(expr.left, id), OPERAND2: strInput(expr.right, id) },
                fields: {}, shadow: false, topLevel: false });
        }
        return id;
    }

    function genReporter(expr, parentId) {
        const id = uid();
        const name = expr.name;
        const reporterMap = {
            'xPos':        'motion_xposition',
            'yPos':        'motion_yposition',
            'direction':   'motion_direction',
            'size':        'looks_size',
            'timer':       'sensing_timer',
            'answer':      'sensing_answer',
            'mouseDown':   'sensing_mousedown',
            'mouseX':      'sensing_mousex',
            'mouseY':      'sensing_mousey',
            'loudness':      'sensing_loudness',
            'costumeNum':    'looks_costumenumbername',
            'costumeName':   'looks_costumenumbername',
            'volume':        'sound_volume',
            'username':      'sensing_username',
            'daysSince2000': 'sensing_dayssince2000',
        };
        const opcode = reporterMap[name];
        if (!opcode) return null;
        const fields = {};
        if (name === 'costumeNum')  fields.NUMBER_NAME = { name: 'NUMBER_NAME', value: 'number' };
        if (name === 'costumeName') fields.NUMBER_NAME = { name: 'NUMBER_NAME', value: 'name' };
        addBlock({ id, opcode, next: null, parent: parentId, inputs: {}, fields, shadow: false, topLevel: false });
        return id;
    }

    function genCallExpr(expr, parentId) {
        const name = expr.name;
        const args = expr.args;
        const id = uid();

        // Sensing calls
        if (name === 'touching') {
            const arg = args[0] && (args[0].type === 'Str' ? args[0].value : null);
            const targetName = arg === 'edge' ? '_edge_' : arg === 'mouse' ? '_mouse_' : arg || '_edge_';
            const menuId = uid();
            addBlock({ id: menuId, opcode: 'sensing_touchingobjectmenu', next: null, parent: id,
                inputs: {}, fields: { TOUCHINGOBJECTMENU: { name: 'TOUCHINGOBJECTMENU', value: targetName } },
                shadow: true, topLevel: false });
            addBlock({ id, opcode: 'sensing_touchingobject', next: null, parent: parentId,
                inputs: { TOUCHINGOBJECTMENU: inp(menuId, menuId) }, fields: {}, shadow: false, topLevel: false });
            return id;
        }
        if (name === 'key') {
            const keyName = args[0] && args[0].type === 'Str' ? args[0].value : 'space';
            const menuId = uid();
            addBlock({ id: menuId, opcode: 'sensing_keyoptions', next: null, parent: id,
                inputs: {}, fields: { KEY_OPTION: { name: 'KEY_OPTION', value: keyName } },
                shadow: true, topLevel: false });
            addBlock({ id, opcode: 'sensing_keypressed', next: null, parent: parentId,
                inputs: { KEY_OPTION: inp(menuId, menuId) }, fields: {}, shadow: false, topLevel: false });
            return id;
        }

        // Math / trig  (operator_mathop + operator_round)
        const MATHOP_MAP = {
            abs: 'abs',   sqrt: 'sqrt',  floor: 'floor', ceiling: 'ceiling', ceil: 'ceiling',
            sin: 'sin',   cos: 'cos',    tan: 'tan',
            asin: 'asin', acos: 'acos',  atan: 'atan',
            ln:  'ln',    log: 'log',    exp: 'e ^',     pow10: '10 ^',
        };
        if (name in MATHOP_MAP) {
            const arg = args[0] || { type: 'Num', value: 0 };
            addBlock({ id, opcode: 'operator_mathop', next: null, parent: parentId,
                inputs: { NUM: numInput(arg, id) },
                fields: { OPERATOR: { name: 'OPERATOR', value: MATHOP_MAP[name] } },
                shadow: false, topLevel: false });
            return id;
        }
        if (name === 'round') {
            const arg = args[0] || { type: 'Num', value: 0 };
            addBlock({ id, opcode: 'operator_round', next: null, parent: parentId,
                inputs: { NUM: numInput(arg, id) },
                fields: {}, shadow: false, topLevel: false });
            return id;
        }

        // operator_random
        if (name === 'random') {
            const from = args[0] || { type: 'Num', value: 1 };
            const to   = args[1] || { type: 'Num', value: 10 };
            addBlock({ id, opcode: 'operator_random', next: null, parent: parentId,
                inputs: { FROM: numInput(from, id), TO: numInput(to, id) },
                fields: {}, shadow: false, topLevel: false });
            return id;
        }

        // operator_join
        if (name === 'join') {
            const s1 = args[0] || { type: 'Str', value: '' };
            const s2 = args[1] || { type: 'Str', value: '' };
            addBlock({ id, opcode: 'operator_join', next: null, parent: parentId,
                inputs: { STRING1: strInput(s1, id), STRING2: strInput(s2, id) },
                fields: {}, shadow: false, topLevel: false });
            return id;
        }

        // operator_letter_of
        if (name === 'letterOf') {
            const idx = args[0] || { type: 'Num', value: 1 };
            const str = args[1] || { type: 'Str', value: '' };
            addBlock({ id, opcode: 'operator_letter_of', next: null, parent: parentId,
                inputs: { LETTER: numInput(idx, id), STRING: strInput(str, id) },
                fields: {}, shadow: false, topLevel: false });
            return id;
        }

        // operator_contains
        if (name === 'contains') {
            const str  = args[0] || { type: 'Str', value: '' };
            const sub  = args[1] || { type: 'Str', value: '' };
            addBlock({ id, opcode: 'operator_contains', next: null, parent: parentId,
                inputs: { STRING1: strInput(str, id), STRING2: strInput(sub, id) },
                fields: {}, shadow: false, topLevel: false });
            return id;
        }

        // motion_distanceto
        if (name === 'distanceTo') {
            const tgt = args[0] && args[0].type === 'Str' ? args[0].value : '_mouse_';
            const menuId = menuBlock('motion_distancetomenu', 'DISTANCETOMENU', tgt, id);
            addBlock({ id, opcode: 'motion_distanceto', next: null, parent: parentId,
                inputs: { DISTANCETOMENU: inp(menuId, menuId) },
                fields: {}, shadow: false, topLevel: false });
            return id;
        }

        // sensing_current
        if (name === 'currentTime') {
            const unit = (args[0] && args[0].type === 'Str' ? args[0].value : 'hour').toUpperCase();
            addBlock({ id, opcode: 'sensing_current', next: null, parent: parentId,
                inputs: {},
                fields: { CURRENTMENU: { name: 'CURRENTMENU', value: unit } },
                shadow: false, topLevel: false });
            return id;
        }

        // sensing_of  (xOf, yOf, directionOf, costumeNumOf, costumeNameOf, sizeOf, volumeOf)
        const SENSING_OF_MAP = {
            xOf: 'x position', yOf: 'y position', directionOf: 'direction',
            costumeNumOf: 'costume #', costumeNameOf: 'costume name',
            sizeOf: 'size', volumeOf: 'volume',
        };
        if (name in SENSING_OF_MAP) {
            const spriteTgt = args[0] && args[0].type === 'Str' ? args[0].value : '';
            const menuId = uid();
            addBlock({ id: menuId, opcode: 'sensing_of_object_menu', next: null, parent: id,
                inputs: {}, fields: { OBJECT: { name: 'OBJECT', value: spriteTgt } },
                shadow: true, topLevel: false });
            addBlock({ id, opcode: 'sensing_of', next: null, parent: parentId,
                inputs: { OBJECT: inp(menuId, menuId) },
                fields: { PROPERTY: { name: 'PROPERTY', value: SENSING_OF_MAP[name] } },
                shadow: false, topLevel: false });
            return id;
        }

        // clamp(val, lo, hi) → max(lo, min(val, hi))
        // max(a,b) = (a+b+abs(a-b))/2  min(a,b) = (a+b-abs(a-b))/2
        if (name === 'clamp') {
            const val = args[0] || { type: 'Num', value: 0 };
            const lo  = args[1] || { type: 'Num', value: 0 };
            const hi  = args[2] || { type: 'Num', value: 100 };
            // build: (val+hi+abs(val-hi))/2  then  (lo+min_val-abs(lo-min_val))/2
            function mkN(v)    { return { type: 'Num', value: v }; }
            function mkAdd(a,b){ return { type: 'BinOp', op: '+', left: a, right: b }; }
            function mkSub(a,b){ return { type: 'BinOp', op: '-', left: a, right: b }; }
            function mkDiv(a,b){ return { type: 'BinOp', op: '/', left: a, right: b }; }
            function mkAbs(a)  { return { type: 'Call', name: 'abs', args: [a] }; }
            // min(val, hi) = (val+hi - abs(val-hi)) / 2
            const minExpr = mkDiv(mkSub(mkAdd(val, hi), mkAbs(mkSub(val, hi))), mkN(2));
            // max(lo, min(val,hi)) = (lo + min + abs(lo - min)) / 2
            const maxExpr = mkDiv(mkAdd(mkAdd(lo, minExpr), mkAbs(mkSub(lo, minExpr))), mkN(2));
            return genExpr(maxExpr, parentId);
        }

        // yield() → wait 0 seconds
        if (name === 'yield') {
            addBlock({ id, opcode: 'control_wait', next: null, parent: parentId,
                inputs: { DURATION: numInput({ type: 'Num', value: 0 }, id) },
                fields: {}, shadow: false, topLevel: false });
            return id;
        }

        // isRunning(routineName) → [__sroutine_<name>_count] > 0
        if (name === 'isRunning') {
            const rname = args[0] && (args[0].type === 'Reporter' || args[0].type === 'CallExpr')
                ? args[0].name
                : args[0] && args[0].type === 'Str' ? args[0].value : '';
            if (!rname) {
                errors.push({ line: expr.line||1, col: expr.col||1, len: 9,
                    message: '`isRunning(name)`: expected a scratchroutine name as argument' });
                return null;
            }
            const countVarName = `__sroutine_${rname}_count`;
            const countV = resolveVar(countVarName);
            if (!countV) {
                errors.push({ line: expr.line||1, col: expr.col||1, len: 9,
                    message: `\`isRunning(${rname})\`: scratchroutine \`${rname}\` has not been defined` });
                return null;
            }
            const zeroId = uid(); const varId = uid();
            addBlock({ id: zeroId, opcode: 'math_number', next: null, parent: id,
                inputs: {}, fields: { NUM: { name: 'NUM', value: '0' } },
                shadow: true, topLevel: false });
            addBlock({ id: varId, opcode: 'data_variable', next: null, parent: id,
                inputs: {}, fields: { VARIABLE: { name: 'VARIABLE', value: countV.name, id: countV.id } },
                shadow: false, topLevel: false });
            addBlock({ id, opcode: 'operator_gt', next: null, parent: parentId,
                inputs: { OPERAND1: inp(varId, zeroId), OPERAND2: inp(zeroId, zeroId) },
                fields: {}, shadow: false, topLevel: false });
            return id;
        }

        return null;
    }

    // Menu shadow block helper
    function menuBlock(opcode, fieldName, fieldValue, parentId) {
        const id = uid();
        addBlock({ id, opcode, next: null, parent: parentId,
            inputs: {}, fields: { [fieldName]: { name: fieldName, value: fieldValue } },
            shadow: true, topLevel: false });
        return id;
    }

    // Generate a chain of statement nodes; returns [firstId, lastId]
    function genStmts(stmts, parentId) {
        if (!stmts || stmts.length === 0) return [null, null];
        let ids = [];
        for (const stmt of stmts) {
            if (stmt.type === 'ForStmt') {
                const [setId, loopId] = genForStmt(stmt);
                if (setId)  ids.push(setId);
                if (loopId) ids.push(loopId);
            } else if (stmt.type === 'PyForStmt') {
                const [setCtrId, loopId] = genPyForStmt(stmt);
                if (setCtrId) ids.push(setCtrId);
                if (loopId)   ids.push(loopId);
            } else if (stmt.type === 'MemberCallStmt') {
                const sortIds = genMemberCallStmt(stmt);
                sortIds.forEach(id => { if (id) ids.push(id); });
            } else if (stmt.type === 'SetVarStmt' &&
                       stmt.value?.type === 'MemberCall' &&
                       ['sum','min','max','count'].includes(stmt.value.method)) {
                const aggIds = genAggregateSetVar(stmt);
                aggIds.forEach(id => { if (id) ids.push(id); });
            } else if (stmt.type === 'LaunchStmt' || stmt.type === 'AwaitStmt') {
                const launchIds = genLaunchOrAwaitStmt(stmt);
                launchIds.forEach(id => { if (id) ids.push(id); });
            } else if (stmt.type === 'BreakpointStmt') {
                const bpIds = genBreakpointStmt(stmt);
                bpIds.forEach(id => { if (id) ids.push(id); });
            } else if (stmt.type === 'PopulateListStmt') {
                const populateIds = genPopulateListStmt(stmt);
                populateIds.forEach(id => { if (id) ids.push(id); });
            } else {
                const id = genStmt(stmt, null);
                if (id) ids.push(id);
            }
        }
        // Link chain
        for (let i = 0; i < ids.length - 1; i++) {
            blocks[ids[i]].next    = ids[i + 1];
            blocks[ids[i + 1]].parent = ids[i];
        }
        // Fix parent of first
        if (ids[0] && parentId) blocks[ids[0]].parent = parentId;
        return [ids[0] || null, ids[ids.length - 1] || null];
    }

    function genMemberCallStmt(node) {
        if (node.method !== 'sort') {
            errors.push({ line: node.line||1, col: node.col||1, len: node.method.length,
                message: `Unknown statement-level method .${node.method}() — only .sort() / .sort("desc") are supported` });
            return [];
        }

        const listVarName = node.object.name;
        const listV = resolveVar(listVarName);
        if (!listV || listV.type !== 'list') {
            errors.push({ line: node.line||1, col: node.col||1, len: listVarName.length,
                message: `.sort() requires a list variable — [${listVarName}] is not a list or was not found. Create it in Scratch first.` });
            return [];
        }

        const desc = node.args.length > 0 && node.args[0].type === 'Str' && node.args[0].value === 'desc';

        const rand4 = Math.random().toString(36).slice(2, 6);
        const pfx   = `_scratchpiler_internal_${rand4}_`;
        const activeTarget = spriteName === '__stage__'
            ? vm.runtime.targets.find(t => t.isStage)
            : vm.runtime.targets.find(t => t.sprite.name === spriteName);
        if (!activeTarget) {
            errors.push({ line: node.line||1, col: node.col||1, len: 4,
                message: `sort: could not resolve target "${spriteName}"` });
            return [];
        }

        // Create the four Knuth/shell-sort temp variables
        const names = { gap: pfx+'gap', i: pfx+'i', j: pfx+'j', tmp: pfx+'tmp' };
        for (const nm of Object.values(names)) {
            if (!Object.values(activeTarget.variables).find(v => v.name === nm))
                activeTarget.createVariable(uid(), nm, '');
        }

        // Synthetic AST builder helpers — each call produces a fresh node
        const ln = node.line, cl = node.col;
        const Lnode = { type: 'Var', name: listVarName, line: ln, col: cl };
        const V   = nm  => ({ type: 'Var',  name: nm,        line: ln, col: cl });
        const N   = v   => ({ type: 'Num',  value: v,        line: ln, col: cl });
        const bop = (op, l, r) => ({ type: 'BinOp', op, left: l, right: r, line: ln, col: cl });
        const not_= e   => ({ type: 'UnaryOp', op: 'not', operand: e, line: ln, col: cl });
        const itm = idx => ({ type: 'MemberCall', object: Lnode, method: 'item',   args: [idx], line: ln, col: cl });
        const len = ()  => ({ type: 'MemberCall', object: Lnode, method: 'length', args: [],    line: ln, col: cl });
        const flr = e   => ({ type: 'CallExpr',   name: 'floor', args: [e],        line: ln, col: cl });
        const SET = (nm, val) => ({ type: 'SetVarStmt',    varName: nm, value: val, line: ln, col: cl });
        const CHG = (nm, val) => ({ type: 'ChangeVarStmt', varName: nm, value: val, line: ln, col: cl });
        const REP = (idx,val) => ({ type: 'ListReplaceStmt', listName: listVarName, index: idx, item: val, line: ln, col: cl });
        const RU  = (cond, body) => ({ type: 'RepeatUntilStmt', cond, body, line: ln, col: cl });

        const { gap, i, j, tmp } = names;

        // ascending: shift while item[j-gap] > tmp | descending: shift while item[j-gap] < tmp
        const cmpOp = desc ? '<' : '>';

        // Inner shift body: move list[j-gap] → list[j], then j -= gap
        const shiftBody = [
            REP(V(j), itm(bop('-', V(j), V(gap)))),
            SET(j,    bop('-', V(j), V(gap))),
        ];
        // Shift stop: NOT(j > gap) OR NOT(list[j-gap] cmpOp tmp)
        const shiftStop = bop('or',
            not_(bop('>',    V(j),                         V(gap))),
            not_(bop(cmpOp,  itm(bop('-', V(j), V(gap))), V(tmp)))
        );

        // Insertion sort for one gap pass
        const insertBody = [
            SET(tmp, itm(V(i))),
            SET(j,   V(i)),
            RU(shiftStop, shiftBody),
            REP(V(j), V(tmp)),
            CHG(i, N(1)),
        ];

        // Shell sort: iterate through each outer i for this gap
        const passBody = [
            SET(i, bop('+', V(gap), N(1))),
            RU(bop('>', V(i), len()), insertBody),
            SET(gap, flr(bop('/', V(gap), N(3)))),
        ];

        // Phase 1 – find largest Knuth gap < list.length
        // repeat until NOT(gap*3+1 < list.length): gap = gap*3+1
        const p1Stop = not_(bop('<', bop('+', bop('*', V(gap), N(3)), N(1)), len()));
        const p1Body = [SET(gap, bop('+', bop('*', V(gap), N(3)), N(1)))];

        // Compile the three top-level sort blocks
        const stmts = [
            SET(gap, N(1)),
            RU(p1Stop, p1Body),
            RU(bop('<', V(gap), N(1)), passBody),
        ];
        return stmts.map(s => genStmt(s, null)).filter(Boolean);
    }

    function genForStmt(node) {
        const rand4 = Math.random().toString(36).slice(2, 6);
        const internalName = `_scratchpiler_internal_${rand4}_${node.varName}`;

        // Resolve the active target to create the variable on
        const activeTarget = spriteName === '__stage__'
            ? vm.runtime.targets.find(t => t.isStage)
            : vm.runtime.targets.find(t => t.sprite.name === spriteName);
        if (!activeTarget) {
            errors.push({ line: node.line, col: node.col, len: 3,
                message: `for: could not resolve target "${spriteName}"` });
            return [null, null];
        }

        // Reuse existing internal var if a previous compile left one with the same name
        let iterVarId;
        const existing = Object.values(activeTarget.variables).find(v => v.name === internalName);
        if (existing) {
            iterVarId = existing.id;
        } else {
            iterVarId = uid();
            activeTarget.createVariable(iterVarId, internalName, '');
        }

        // Expose the iterator to the body via forScope
        forScope[node.varName] = { id: iterVarId, name: internalName, type: '' };

        // set [iter] to from
        const setId = uid();
        addBlock({ id: setId, opcode: 'data_setvariableto', next: null, parent: null,
            inputs: { VALUE: strInput(node.from, setId) },
            fields: { VARIABLE: { name: 'VARIABLE', value: internalName, id: iterVarId } },
            shadow: false, topLevel: false });

        // repeat until ([iter] > to)
        const loopId = uid();
        const gtId   = uid();
        const iterVarExpr = { type: 'Var', name: node.varName, line: node.line, col: node.col };
        addBlock({ id: gtId, opcode: 'operator_gt', next: null, parent: loopId,
            inputs: {
                OPERAND1: numInput(iterVarExpr, gtId),
                OPERAND2: numInput(node.to, gtId),
            },
            fields: {}, shadow: false, topLevel: false });

        // change [iter] by 1  (appended at end of substack)
        const incrId     = uid();
        const oneShadId  = uid();
        addBlock({ id: oneShadId, opcode: 'math_number', next: null, parent: incrId,
            inputs: {}, fields: { NUM: { name: 'NUM', value: '1' } },
            shadow: true, topLevel: false });
        addBlock({ id: incrId, opcode: 'data_changevariableby', next: null, parent: null,
            inputs: { VALUE: inp(oneShadId, oneShadId) },
            fields: { VARIABLE: { name: 'VARIABLE', value: internalName, id: iterVarId } },
            shadow: false, topLevel: false });

        // Generate body, then append increment at the tail
        const bodyFirst = genBody(node.body, loopId);
        if (bodyFirst) {
            let lastId = bodyFirst;
            while (blocks[lastId].next) lastId = blocks[lastId].next;
            blocks[lastId].next = incrId;
            blocks[incrId].parent = lastId;
        } else {
            blocks[incrId].parent = loopId;
        }

        addBlock({ id: loopId, opcode: 'control_repeat_until', next: null, parent: null,
            inputs: {
                CONDITION: inp(gtId, null),
                SUBSTACK:  inp(bodyFirst || incrId, null),
            },
            fields: {}, shadow: false, topLevel: false });

        // Internal link set → loop (genStmts will re-apply, which is fine)
        blocks[setId].next = loopId;
        blocks[loopId].parent = setId;

        // Pop scope
        delete forScope[node.varName];

        return [setId, loopId];
    }

    function genPyForStmt(node) {
        const rand4 = Math.random().toString(36).slice(2, 6);
        const ctrInternalName  = `_scratchpiler_internal_${rand4}_pyfor_ctr`;
        const itemInternalName = `_scratchpiler_internal_${rand4}_${node.varName}`;

        const activeTarget = spriteName === '__stage__'
            ? vm.runtime.targets.find(t => t.isStage)
            : vm.runtime.targets.find(t => t.sprite.name === spriteName);
        if (!activeTarget) {
            errors.push({ line: node.line, col: node.col, len: 5,
                message: `pyfor: could not resolve target "${spriteName}"` });
            return [null, null];
        }

        // Validate the list exists
        const listV = resolveVar(node.listName);
        if (!listV || listV.type !== 'list') {
            errors.push({ line: node.line, col: node.col, len: node.listName.length,
                message: `\`pyfor\` requires a list — [${node.listName}] is ${!listV ? 'not found' : 'not a list (it\'s a variable)'}. Create a list in Scratch first.` });
            return [null, null];
        }

        // Create / reuse the hidden counter variable
        let ctrVarId;
        const existingCtr = Object.values(activeTarget.variables).find(v => v.name === ctrInternalName);
        if (existingCtr) { ctrVarId = existingCtr.id; }
        else { ctrVarId = uid(); activeTarget.createVariable(ctrVarId, ctrInternalName, ''); }

        // Create / reuse the item variable (visible to body via [node.varName])
        let itemVarId;
        const existingItem = Object.values(activeTarget.variables).find(v => v.name === itemInternalName);
        if (existingItem) { itemVarId = existingItem.id; }
        else { itemVarId = uid(); activeTarget.createVariable(itemVarId, itemInternalName, ''); }

        // Register both in forScope so body expressions can resolve them
        const CTR_KEY = ctrInternalName;
        forScope[CTR_KEY]        = { id: ctrVarId,  name: ctrInternalName,  type: '' };
        forScope[node.varName]   = { id: itemVarId, name: itemInternalName, type: '' };

        const ln = node.line, cl = node.col;
        const LN     = { type: 'Var', name: node.listName, line: ln, col: cl };
        const CTR_V  = { type: 'Var', name: CTR_KEY,       line: ln, col: cl };
        const N      = v   => ({ type: 'Num',  value: v, line: ln, col: cl });
        const bop    = (op, l, r) => ({ type: 'BinOp', op, left: l, right: r });
        const itemOf = idx => ({ type: 'MemberCall', object: LN, method: 'item',   args: [idx] });
        const lenOf  = ()  => ({ type: 'MemberCall', object: LN, method: 'length', args: []    });

        // First body block: set [item] to [list].item([ctr])
        const setItemStmt = { type: 'SetVarStmt', varName: node.varName, value: itemOf(CTR_V), line: ln, col: cl };
        // Last body block: change [ctr] by 1
        const incrCtrStmt = { type: 'ChangeVarStmt', varName: CTR_KEY, value: N(1), line: ln, col: cl };

        // Build the full loop body
        const fullBody = [setItemStmt, ...node.body, incrCtrStmt];

        // repeat until ([ctr] > [list].length())
        const loopStmt = { type: 'RepeatUntilStmt', cond: bop('>', CTR_V, lenOf()), body: fullBody, line: ln, col: cl };

        // Compile: set [ctr] to 1, then the loop
        const setCtrId = genStmt({ type: 'SetVarStmt', varName: CTR_KEY, value: N(1), line: ln, col: cl }, null);
        const loopId   = genStmt(loopStmt, null);

        // Pop forScope
        delete forScope[CTR_KEY];
        delete forScope[node.varName];

        if (setCtrId && loopId) {
            blocks[setCtrId].next   = loopId;
            blocks[loopId].parent   = setCtrId;
        }
        return [setCtrId, loopId];
    }

    // Helper: create or reuse a variable on a target, return {id, name, type:''}
    function ensureVar(activeTarget, name) {
        const existing = Object.values(activeTarget.variables).find(v => v.name === name);
        if (existing) return { id: existing.id, name: existing.name, type: '' };
        const id = uid();
        activeTarget.createVariable(id, name, '');
        return { id, name, type: '' };
    }

    // List aggregate: set [out] to [list].sum() / .min() / .max() / .count(val)
    // Compiles to a hidden pyfor loop that pre-computes a temp variable, then sets [out].
    function genAggregateSetVar(stmt) {
        const mc    = stmt.value;   // MemberCall node
        const method = mc.method;
        const listObj = mc.object;
        const outName = stmt.varName;
        const ln = stmt.line, cl = stmt.col;

        const listV = resolveVar(listObj.name);
        if (!listV || listV.type !== 'list') {
            errors.push({ line: ln, col: cl, len: listObj.name.length,
                message: `\`[${listObj.name}].${method}()\` requires a list — [${listObj.name}] is ${!listV ? 'not found' : 'not a list'}` });
            return [];
        }

        const activeTarget = spriteName === '__stage__'
            ? vm.runtime.targets.find(t => t.isStage)
            : vm.runtime.targets.find(t => t.sprite.name === spriteName);
        if (!activeTarget) return [];

        const rand4 = Math.random().toString(36).slice(2, 6);
        const tmpName  = `_scratchpiler_internal_${rand4}_agg_tmp`;
        const ctrName  = `_scratchpiler_internal_${rand4}_agg_ctr`;
        const itemName = `_scratchpiler_internal_${rand4}_agg_item`;

        const tmpV  = ensureVar(activeTarget, tmpName);
        const ctrV  = ensureVar(activeTarget, ctrName);
        const itemV = ensureVar(activeTarget, itemName);

        const N     = v => ({ type: 'Num', value: v, line: ln, col: cl });
        const LN    = { type: 'Var', name: listObj.name, line: ln, col: cl };
        const CTR   = { type: 'Var', name: ctrName, line: ln, col: cl };
        const ITEM  = { type: 'Var', name: itemName, line: ln, col: cl };
        const TMP   = { type: 'Var', name: tmpName,  line: ln, col: cl };
        const lenOf = () => ({ type: 'MemberCall', object: LN, method: 'length', args: [] });
        const itemOf = i => ({ type: 'MemberCall', object: LN, method: 'item', args: [i] });
        const bop   = (op, l, r) => ({ type: 'BinOp', op, left: l, right: r });

        // Register temps in forScope so genStmt can resolve them
        forScope[ctrName]  = ctrV;
        forScope[itemName] = itemV;
        forScope[tmpName]  = tmpV;

        let initTmpStmt, updateTmpStmt;

        if (method === 'sum') {
            initTmpStmt   = { type: 'SetVarStmt',    varName: tmpName, value: N(0), line: ln, col: cl };
            updateTmpStmt = { type: 'ChangeVarStmt', varName: tmpName, value: ITEM,  line: ln, col: cl };
        } else if (method === 'min') {
            initTmpStmt   = { type: 'SetVarStmt', varName: tmpName, value: itemOf(N(1)), line: ln, col: cl };
            // if ITEM < TMP: set TMP to ITEM
            updateTmpStmt = { type: 'IfStmt',
                cond: bop('<', ITEM, TMP),
                then: [{ type: 'SetVarStmt', varName: tmpName, value: ITEM, line: ln, col: cl }],
                alt: null, line: ln, col: cl };
        } else if (method === 'max') {
            initTmpStmt   = { type: 'SetVarStmt', varName: tmpName, value: itemOf(N(1)), line: ln, col: cl };
            updateTmpStmt = { type: 'IfStmt',
                cond: bop('>', ITEM, TMP),
                then: [{ type: 'SetVarStmt', varName: tmpName, value: ITEM, line: ln, col: cl }],
                alt: null, line: ln, col: cl };
        } else { // count(val)
            const countVal = mc.args[0] || { type: 'Num', value: 0 };
            initTmpStmt   = { type: 'SetVarStmt', varName: tmpName, value: N(0), line: ln, col: cl };
            updateTmpStmt = { type: 'IfStmt',
                cond: bop('=', ITEM, countVal),
                then: [{ type: 'ChangeVarStmt', varName: tmpName, value: N(1), line: ln, col: cl }],
                alt: null, line: ln, col: cl };
        }

        // set ctr to 1; repeat until (ctr > list.length) { set item = list.item(ctr); update; change ctr by 1 }
        const setItemStmt = { type: 'SetVarStmt', varName: itemName, value: itemOf(CTR), line: ln, col: cl };
        const incrCtrStmt = { type: 'ChangeVarStmt', varName: ctrName, value: N(1), line: ln, col: cl };
        const loopBody    = [setItemStmt, updateTmpStmt, incrCtrStmt];
        const loopStmt    = { type: 'RepeatUntilStmt', cond: bop('>', CTR, lenOf()), body: loopBody, line: ln, col: cl };

        const finalSetStmt = { type: 'SetVarStmt', varName: outName,
            value: { type: 'Var', name: tmpName, line: ln, col: cl }, line: ln, col: cl };

        // For min/max, skip the loop entirely if list is empty to avoid item(1) on empty list
        // (Scratch returns "" for out-of-bounds, which is acceptable — no extra guard needed)

        const setCtrId  = genStmt({ type: 'SetVarStmt', varName: ctrName, value: N(1), line: ln, col: cl }, null);
        const initTmpId = genStmt(initTmpStmt, null);
        const loopId    = genStmt(loopStmt, null);
        const setOutId  = genStmt(finalSetStmt, null);

        delete forScope[ctrName];
        delete forScope[itemName];
        delete forScope[tmpName];

        // Chain: setCtr → initTmp → loop → setOut
        const ids = [setCtrId, initTmpId, loopId, setOutId].filter(Boolean);
        for (let i = 0; i < ids.length - 1; i++) {
            blocks[ids[i]].next       = ids[i+1];
            blocks[ids[i+1]].parent   = ids[i];
        }
        return ids;
    }

    // Scratchroutine generation helpers
    function srInternalName(rname) { return `__sroutine_${rname}`; }

    function ensureGlobalVar(name) {
        const stage = vm.runtime.targets.find(t => t.isStage);
        if (!stage) return null;
        const existing = Object.values(stage.variables).find(v => v.name === name && v.type === '');
        if (existing) return { id: existing.id, name: existing.name, type: '' };
        const id = uid();
        stage.createVariable(id, name, '');
        return { id, name, type: '' };
    }

    function ensureBroadcast(name) {
        const stage = vm.runtime.targets.find(t => t.isStage);
        if (!stage) return uid();
        const existing = Object.values(stage.variables).find(v => v.name === name && v.type === 'broadcast_msg');
        if (existing) return existing.id;
        const id = uid();
        stage.createVariable(id, name, 'broadcast_msg');
        return id;
    }

    function genScratchroutineStmt(node, scriptX) {
        const rname     = node.name;
        const bcastName = srInternalName(rname);
        const cancelName = `__sroutine_${rname}_cancelled`;
        const countName  = `__sroutine_${rname}_count`;

        // Ensure infrastructure vars exist globally
        ensureBroadcast(bcastName);
        const cancelV = ensureGlobalVar(cancelName);
        const countV  = ensureGlobalVar(countName);
        if (!cancelV || !countV) {
            errors.push({ line: node.line, col: node.col, len: 13,
                message: `scratchroutine ${rname}: could not create global variables` });
            return;
        }

        // Ensure param vars exist globally and register in routineScope
        const paramVars = [];
        for (const p of node.params) {
            const pVarName = `__sroutine_${rname}_${p}`;
            const pV = ensureGlobalVar(pVarName);
            if (pV) {
                routineScope[p] = pV;
                paramVars.push({ param: p, v: pV });
            }
        }

        currentRoutineName = rname;

        // Hat: on receive "__sroutine_<name>"
        const bcastId = ensureBroadcast(bcastName);
        const hatId   = uid();
        addBlock({ id: hatId, opcode: 'event_whenbroadcastreceived', next: null, parent: null,
            inputs: {}, fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: bcastName, id: bcastId } },
            shadow: false, topLevel: true, x: scriptX, y: 50 });

        // Preamble: set cancelled=0, change count by 1
        const ln = node.line, cl = node.col;
        const setCancelStmt = { type: 'SetVarStmt',    varName: cancelName, value: { type: 'Num', value: 0 }, line: ln, col: cl };
        const incrCountStmt = { type: 'ChangeVarStmt', varName: countName,  value: { type: 'Num', value: 1 }, line: ln, col: cl };
        // Postamble: change count by -1
        const decrCountStmt = { type: 'ChangeVarStmt', varName: countName,  value: { type: 'Num', value: -1 }, line: ln, col: cl };

        const fullBody = [setCancelStmt, incrCountStmt, ...node.body, decrCountStmt];

        // Register infrastructure vars in routineScope so preamble/postamble genStmt can find them
        routineScope[cancelName] = cancelV;
        routineScope[countName]  = countV;

        const bodyFirst = genBody(fullBody, hatId);
        if (bodyFirst) {
            blocks[hatId].next       = bodyFirst;
            blocks[bodyFirst].parent = hatId;
        }

        // Clean up scopes
        currentRoutineName = null;
        for (const { param } of paramVars) delete routineScope[param];
        delete routineScope[cancelName];
        delete routineScope[countName];
    }

    function genLaunchOrAwaitStmt(node) {
        const rname     = node.name;
        const bcastName = srInternalName(rname);
        const ln = node.line, cl = node.col;

        // Ensure param vars exist (they must have been created by the scratchroutine definition)
        // Set each param before the broadcast
        const ids = [];
        for (let i = 0; i < node.args.length; i++) {
            const pVarName = `__sroutine_${rname}_param${i}`;
            // Try positional param name lookup from the routine definition
            // Since we don't have the param names here, use a positional approach
            // Best effort: find the var whose name matches __sroutine_<name>_<something>
            // We resolve by looking in global vars for positional match
            const stage = vm.runtime.targets.find(t => t.isStage);
            if (!stage) break;
            const stageVars = Object.values(stage.variables).filter(v =>
                v.name.startsWith(`__sroutine_${rname}_`) && v.type === '' &&
                v.name !== `__sroutine_${rname}_cancelled` && v.name !== `__sroutine_${rname}_count`);
            // Sort alphabetically to get stable param order
            stageVars.sort((a, b) => a.name < b.name ? -1 : 1);
            const pV = stageVars[i];
            if (!pV) continue;
            const setId = genStmt({ type: 'SetVarStmt', varName: pV.name,
                value: node.args[i], line: ln, col: cl }, null);
            if (setId) ids.push(setId);
        }

        const bcastId = ensureBroadcast(bcastName);
        const isAwait = node.type === 'AwaitStmt';
        const bcastStmt = isAwait
            ? { type: 'BroadcastWaitStmt', msg: { type: 'Str', value: bcastName, line: ln, col: cl }, line: ln, col: cl }
            : { type: 'BroadcastStmt',     msg: { type: 'Str', value: bcastName, line: ln, col: cl }, line: ln, col: cl };
        const bcastBlockId = genStmt(bcastStmt, null);
        if (bcastBlockId) ids.push(bcastBlockId);

        return ids;
    }

    function genPopulateListStmt(node) {
        const v = resolveVar(node.listName);
        if (!v) {
            errors.push({ line: node.line || 1, col: node.col || 1, len: node.listName.length,
                          message: `List not found: ${node.listName}. Create it in Scratch first.` });
            return [];
        }

        const ids = [];
        const isLiteralFalse = node.clearFirst.type === 'Num' && Number(node.clearFirst.value) === 0;

        if (!isLiteralFalse) {
            const clearId = uid();
            addBlock({ id: clearId, opcode: 'data_deletealloflist', next: null, parent: null,
                inputs: {}, fields: { LIST: { name: 'LIST', value: v.name, id: v.id } },
                shadow: false, topLevel: false });

            const isLiteralTrue = node.clearFirst.type === 'Num' && Number(node.clearFirst.value) !== 0;
            if (isLiteralTrue) {
                ids.push(clearId);
            } else {
                // Runtime condition: wrap deleteAll in control_if
                const ifId = uid();
                addBlock({ id: ifId, opcode: 'control_if', next: null, parent: null,
                    inputs: {
                        CONDITION: boolInput(node.clearFirst, ifId),
                        SUBSTACK:  inp(clearId, null),
                    }, fields: {}, shadow: false, topLevel: false });
                blocks[clearId].parent = ifId;
                ids.push(ifId);
            }
        }

        const repeatId = uid();
        const addId    = uid();
        addBlock({ id: addId, opcode: 'data_addtolist', next: null, parent: repeatId,
            inputs: { ITEM: strInput(node.valueExpr, addId) },
            fields: { LIST: { name: 'LIST', value: v.name, id: v.id } },
            shadow: false, topLevel: false });
        addBlock({ id: repeatId, opcode: 'control_repeat', next: null, parent: null,
            inputs: {
                TIMES:    numInput(node.countExpr, repeatId),
                SUBSTACK: inp(addId, null),
            }, fields: {}, shadow: false, topLevel: false });

        ids.push(repeatId);
        return ids;
    }

    function genBreakpointStmt(node) {
        const stage = vm.runtime.targets.find(t => t.isStage);
        if (!stage) {
            errors.push({ line: node.line||1, col: node.col||1, len: 10,
                message: '`breakpoint`: VM stage not available' });
            return [];
        }
        function ensureDbgVar(varName) {
            let v = Object.values(stage.variables).find(v => v.name === varName && v.type === '');
            if (!v) { const vid = uid(); stage.createVariable(vid, varName, ''); v = stage.variables[vid]; }
            return { id: v.id, name: v.name };
        }
        const atV     = ensureDbgVar('__dbg_at__');
        const resumeV = ensureDbgVar('__dbg_resume__');

        const setAtId = uid();
        addBlock({ id: setAtId, opcode: 'data_setvariableto', next: null, parent: null,
            inputs: { VALUE: strInput({ type: 'Num', value: 1 }, setAtId) },
            fields: { VARIABLE: { name: 'VARIABLE', value: atV.name, id: atV.id } },
            shadow: false, topLevel: false });

        const setResId = uid();
        addBlock({ id: setResId, opcode: 'data_setvariableto', next: null, parent: null,
            inputs: { VALUE: strInput({ type: 'Num', value: 0 }, setResId) },
            fields: { VARIABLE: { name: 'VARIABLE', value: resumeV.name, id: resumeV.id } },
            shadow: false, topLevel: false });

        const waitId   = uid();
        const resVarId = uid();
        addBlock({ id: resVarId, opcode: 'data_variable', next: null, parent: waitId,
            inputs: {}, fields: { VARIABLE: { name: 'VARIABLE', value: resumeV.name, id: resumeV.id } },
            shadow: false, topLevel: false });
        const oneId = uid();
        addBlock({ id: oneId, opcode: 'math_number', next: null, parent: waitId,
            inputs: {}, fields: { NUM: { name: 'NUM', value: '1' } },
            shadow: true, topLevel: false });
        const eqId = uid();
        addBlock({ id: eqId, opcode: 'operator_equals', next: null, parent: waitId,
            inputs: { OPERAND1: inp(resVarId, oneId), OPERAND2: inp(oneId, oneId) },
            fields: {}, shadow: false, topLevel: false });
        addBlock({ id: waitId, opcode: 'control_wait_until', next: null, parent: null,
            inputs: { CONDITION: inp(eqId, null) },
            fields: {}, shadow: false, topLevel: false });

        const clearAtId = uid();
        addBlock({ id: clearAtId, opcode: 'data_setvariableto', next: null, parent: null,
            inputs: { VALUE: strInput({ type: 'Num', value: 0 }, clearAtId) },
            fields: { VARIABLE: { name: 'VARIABLE', value: atV.name, id: atV.id } },
            shadow: false, topLevel: false });

        return [setAtId, setResId, waitId, clearAtId];
    }

    function genBody(stmts, parentId) {
        const [first] = genStmts(stmts, parentId);
        return first;
    }

    function genStmt(node, parentId) {
        if (!node) return null;
        const id = uid();

        switch (node.type) {
            // Control
            case 'IfStmt': {
                const condInput = boolInput(node.cond, id);
                const substackFirst = genBody(node.then, id);
                if (node.alt) {
                    const substack2First = genBody(node.alt, id);
                    addBlock({ id, opcode: 'control_if_else', next: null, parent: parentId,
                        inputs: {
                            CONDITION: condInput,
                            SUBSTACK:  inp(substackFirst || null, null),
                            SUBSTACK2: inp(substack2First || null, null),
                        }, fields: {}, shadow: false, topLevel: false });
                } else {
                    addBlock({ id, opcode: 'control_if', next: null, parent: parentId,
                        inputs: {
                            CONDITION: condInput,
                            SUBSTACK:  inp(substackFirst || null, null),
                        }, fields: {}, shadow: false, topLevel: false });
                }
                return id;
            }
            case 'RepeatStmt': {
                const timesInput = numInput(node.count, id);
                const substackFirst = genBody(node.body, id);
                addBlock({ id, opcode: 'control_repeat', next: null, parent: parentId,
                    inputs: {
                        TIMES:    timesInput,
                        SUBSTACK: inp(substackFirst || null, null),
                    }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ForeverStmt': {
                const substackFirst = genBody(node.body, id);
                addBlock({ id, opcode: 'control_forever', next: null, parent: parentId,
                    inputs: { SUBSTACK: inp(substackFirst || null, null) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'RepeatUntilStmt': {
                const condInput = boolInput(node.cond, id);
                const substackFirst = genBody(node.body, id);
                addBlock({ id, opcode: 'control_repeat_until', next: null, parent: parentId,
                    inputs: {
                        CONDITION: condInput,
                        SUBSTACK:  inp(substackFirst || null, null),
                    }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'WhileStmt': {
                const negCond = { type: 'UnaryOp', op: 'not', operand: node.cond };
                const condInput = boolInput(negCond, id);
                const substackFirst = genBody(node.body, id);
                addBlock({ id, opcode: 'control_repeat_until', next: null, parent: parentId,
                    inputs: {
                        CONDITION: condInput,
                        SUBSTACK:  inp(substackFirst || null, null),
                    }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'WaitUntilStmt': {
                addBlock({ id, opcode: 'control_wait_until', next: null, parent: parentId,
                    inputs: { CONDITION: boolInput(node.cond, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'WaitStmt': {
                addBlock({ id, opcode: 'control_wait', next: null, parent: parentId,
                    inputs: { DURATION: numInput(node.duration, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'StopStmt': {
                addBlock({ id, opcode: 'control_stop', next: null, parent: parentId,
                    inputs: {}, fields: { STOP_OPTION: { name: 'STOP_OPTION', value: node.option } },
                    shadow: false, topLevel: false });
                return id;
            }
            case 'CancelStmt': {
                // set [__sroutine_<name>_cancelled] to 1
                const flagName = `__sroutine_${node.name}_cancelled`;
                const flagV = resolveVar(flagName);
                if (!flagV) {
                    errors.push({ line: node.line||1, col: node.col||1, len: 6,
                        message: `\`cancel ${node.name}\`: scratchroutine \`${node.name}\` has not been defined` });
                    return null;
                }
                addBlock({ id, opcode: 'data_setvariableto', next: null, parent: parentId,
                    inputs: { VALUE: strInput({ type: 'Num', value: 1 }, id) },
                    fields: { VARIABLE: { name: 'VARIABLE', value: flagV.name, id: flagV.id } },
                    shadow: false, topLevel: false });
                return id;
            }
            case 'CheckCancelStmt': {
                // if [__sroutine_<currentRoutineName>_cancelled] = 1 { stopThis() }
                if (!currentRoutineName) {
                    errors.push({ line: node.line||1, col: node.col||1, len: 11,
                        message: '`checkCancel()` must be used inside a `scratchroutine` body' });
                    return null;
                }
                const flagName2 = `__sroutine_${currentRoutineName}_cancelled`;
                const flagV2 = resolveVar(flagName2);
                if (!flagV2) { errors.push({ line: node.line||1, col: node.col||1, len: 11, message: `checkCancel: cancel flag not found` }); return null; }
                const flagVarId = uid();
                addBlock({ id: flagVarId, opcode: 'data_variable', next: null, parent: id,
                    inputs: {}, fields: { VARIABLE: { name: 'VARIABLE', value: flagV2.name, id: flagV2.id } },
                    shadow: false, topLevel: false });
                const oneId = uid();
                addBlock({ id: oneId, opcode: 'math_number', next: null, parent: id,
                    inputs: {}, fields: { NUM: { name: 'NUM', value: '1' } },
                    shadow: true, topLevel: false });
                const eqId = uid();
                addBlock({ id: eqId, opcode: 'operator_equals', next: null, parent: id,
                    inputs: { OPERAND1: inp(flagVarId, oneId), OPERAND2: inp(oneId, oneId) },
                    fields: {}, shadow: false, topLevel: false });
                const stopId = uid();
                addBlock({ id: stopId, opcode: 'control_stop', next: null, parent: id,
                    inputs: {}, fields: { STOP_OPTION: { name: 'STOP_OPTION', value: 'this script' } },
                    shadow: false, topLevel: false });
                addBlock({ id, opcode: 'control_if', next: null, parent: parentId,
                    inputs: { CONDITION: inp(eqId, null), SUBSTACK: inp(stopId, null) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'CreateCloneStmt': {
                const menuId = menuBlock('control_create_clone_of_menu', 'CLONE_OPTION', node.target, id);
                addBlock({ id, opcode: 'control_create_clone_of', next: null, parent: parentId,
                    inputs: { CLONE_OPTION: inp(menuId, menuId) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'DeleteCloneStmt': {
                addBlock({ id, opcode: 'control_delete_this_clone', next: null, parent: parentId,
                    inputs: {}, fields: {}, shadow: false, topLevel: false });
                return id;
            }

            // Motion
            case 'MoveStmt': {
                addBlock({ id, opcode: 'motion_movesteps', next: null, parent: parentId,
                    inputs: { STEPS: numInput(node.steps, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'TurnStmt': {
                const opcode = node.dir === 'left' ? 'motion_turnleft' : 'motion_turnright';
                addBlock({ id, opcode, next: null, parent: parentId,
                    inputs: { DEGREES: numInput(node.degrees, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'GoToXYStmt': {
                addBlock({ id, opcode: 'motion_gotoxy', next: null, parent: parentId,
                    inputs: { X: numInput(node.x, id), Y: numInput(node.y, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'GoToStmt': {
                const menuId = menuBlock('motion_goto_menu', 'TO', node.target, id);
                addBlock({ id, opcode: 'motion_goto', next: null, parent: parentId,
                    inputs: { TO: inp(menuId, menuId) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'GlideStmt': {
                addBlock({ id, opcode: 'motion_glidesecstoxy', next: null, parent: parentId,
                    inputs: { SECS: numInput(node.secs, id), X: numInput(node.x, id), Y: numInput(node.y, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'SetXStmt': {
                addBlock({ id, opcode: 'motion_setx', next: null, parent: parentId,
                    inputs: { X: numInput(node.value, id) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'SetYStmt': {
                addBlock({ id, opcode: 'motion_sety', next: null, parent: parentId,
                    inputs: { Y: numInput(node.value, id) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ChangeXStmt': {
                addBlock({ id, opcode: 'motion_changexby', next: null, parent: parentId,
                    inputs: { DX: numInput(node.value, id) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ChangeYStmt': {
                addBlock({ id, opcode: 'motion_changeyby', next: null, parent: parentId,
                    inputs: { DY: numInput(node.value, id) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'BounceStmt': {
                addBlock({ id, opcode: 'motion_ifonedgebounce', next: null, parent: parentId,
                    inputs: {}, fields: {}, shadow: false, topLevel: false });
                return id;
            }

            // Looks
            case 'SayStmt': {
                addBlock({ id, opcode: 'looks_say', next: null, parent: parentId,
                    inputs: { MESSAGE: strInput(node.msg, id) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'SayForStmt': {
                addBlock({ id, opcode: 'looks_sayforsecs', next: null, parent: parentId,
                    inputs: { MESSAGE: strInput(node.msg, id), SECS: numInput(node.secs, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ThinkStmt': {
                addBlock({ id, opcode: 'looks_think', next: null, parent: parentId,
                    inputs: { MESSAGE: strInput(node.msg, id) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ThinkForStmt': {
                addBlock({ id, opcode: 'looks_thinkforsecs', next: null, parent: parentId,
                    inputs: { MESSAGE: strInput(node.msg, id), SECS: numInput(node.secs, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'SwitchCostumeStmt': {
                const menuId = menuBlock('looks_costume', 'COSTUME', node.name.type === 'Str' ? node.name.value : '', id);
                addBlock({ id, opcode: 'looks_switchcostumeto', next: null, parent: parentId,
                    inputs: { COSTUME: inp(menuId, menuId) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'SwitchBackdropStmt': {
                const menuId = menuBlock('looks_backdrops', 'BACKDROP', node.name.type === 'Str' ? node.name.value : '', id);
                addBlock({ id, opcode: 'looks_switchbackdropto', next: null, parent: parentId,
                    inputs: { BACKDROP: inp(menuId, menuId) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'NextCostumeStmt': {
                addBlock({ id, opcode: 'looks_nextcostume', next: null, parent: parentId,
                    inputs: {}, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'NextBackdropStmt': {
                addBlock({ id, opcode: 'looks_nextbackdrop', next: null, parent: parentId,
                    inputs: {}, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'SetSizeStmt': {
                addBlock({ id, opcode: 'looks_setsizeto', next: null, parent: parentId,
                    inputs: { SIZE: numInput(node.value, id) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ChangeSizeStmt': {
                addBlock({ id, opcode: 'looks_changesizeby', next: null, parent: parentId,
                    inputs: { CHANGE: numInput(node.value, id) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ShowStmt': {
                addBlock({ id, opcode: 'looks_show', next: null, parent: parentId,
                    inputs: {}, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'HideStmt': {
                addBlock({ id, opcode: 'looks_hide', next: null, parent: parentId,
                    inputs: {}, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ClearEffectsStmt': {
                addBlock({ id, opcode: 'looks_cleargraphiceffects', next: null, parent: parentId,
                    inputs: {}, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ShowVarStmt': {
                const v = resolveVar(node.name);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.name.length,
                                  message: `Variable not found: ${node.name}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_showvariable', next: null, parent: parentId,
                    inputs: {}, fields: { VARIABLE: { name: 'VARIABLE', value: v.name, id: v.id } }, shadow: false, topLevel: false });
                return id;
            }
            case 'HideVarStmt': {
                const v = resolveVar(node.name);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.name.length,
                                  message: `Variable not found: ${node.name}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_hidevariable', next: null, parent: parentId,
                    inputs: {}, fields: { VARIABLE: { name: 'VARIABLE', value: v.name, id: v.id } }, shadow: false, topLevel: false });
                return id;
            }
            case 'ShowListStmt': {
                const v = resolveVar(node.name);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.name.length,
                                  message: `List not found: ${node.name}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_showlist', next: null, parent: parentId,
                    inputs: {}, fields: { LIST: { name: 'LIST', value: v.name, id: v.id } }, shadow: false, topLevel: false });
                return id;
            }
            case 'HideListStmt': {
                const v = resolveVar(node.name);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.name.length,
                                  message: `List not found: ${node.name}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_hidelist', next: null, parent: parentId,
                    inputs: {}, fields: { LIST: { name: 'LIST', value: v.name, id: v.id } }, shadow: false, topLevel: false });
                return id;
            }

            // Sound
            case 'PlayStmt': {
                const sndName = node.sound.type === 'Str' ? node.sound.value : '';
                const menuId = menuBlock('sound_sounds_menu', 'SOUND_MENU', sndName, id);
                addBlock({ id, opcode: 'sound_play', next: null, parent: parentId,
                    inputs: { SOUND_MENU: inp(menuId, menuId) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'PlayUntilDoneStmt': {
                const sndName = node.sound.type === 'Str' ? node.sound.value : '';
                const menuId = menuBlock('sound_sounds_menu', 'SOUND_MENU', sndName, id);
                addBlock({ id, opcode: 'sound_playuntildone', next: null, parent: parentId,
                    inputs: { SOUND_MENU: inp(menuId, menuId) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'StopSoundsStmt': {
                addBlock({ id, opcode: 'sound_stopallsounds', next: null, parent: parentId,
                    inputs: {}, fields: {}, shadow: false, topLevel: false });
                return id;
            }

            // Events
            case 'BroadcastStmt': {
                const msgName = node.msg.type === 'Str' ? node.msg.value : '';
                const msgId = resolveBroadcast(msgName);
                const shadowId = uid();
                addBlock({ id: shadowId, opcode: 'event_broadcast_menu', next: null, parent: id,
                    inputs: {}, fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: msgName, id: msgId } },
                    shadow: true, topLevel: false });
                addBlock({ id, opcode: 'event_broadcast', next: null, parent: parentId,
                    inputs: { BROADCAST_INPUT: inp(shadowId, shadowId) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'BroadcastWaitStmt': {
                const msgName = node.msg.type === 'Str' ? node.msg.value : '';
                const msgId = resolveBroadcast(msgName);
                const shadowId = uid();
                addBlock({ id: shadowId, opcode: 'event_broadcast_menu', next: null, parent: id,
                    inputs: {}, fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: msgName, id: msgId } },
                    shadow: true, topLevel: false });
                addBlock({ id, opcode: 'event_broadcastandwait', next: null, parent: parentId,
                    inputs: { BROADCAST_INPUT: inp(shadowId, shadowId) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }

            // Variables
            case 'SetVarStmt': {
                let v = resolveVar(node.varName);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.varName.length,
                                  message: `Variable not found: ${node.varName}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_setvariableto', next: null, parent: parentId,
                    inputs: { VALUE: strInput(node.value, id) },
                    fields: { VARIABLE: { name: 'VARIABLE', value: v.name, id: v.id } }, shadow: false, topLevel: false });
                return id;
            }
            case 'ChangeVarStmt': {
                const v = resolveVar(node.varName);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.varName.length,
                                  message: `Variable not found: ${node.varName}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_changevariableby', next: null, parent: parentId,
                    inputs: { VALUE: numInput(node.value, id) },
                    fields: { VARIABLE: { name: 'VARIABLE', value: v.name, id: v.id } }, shadow: false, topLevel: false });
                return id;
            }
            case 'ListAddStmt': {
                const v = resolveVar(node.listName);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.listName.length,
                                  message: `List not found: ${node.listName}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_addtolist', next: null, parent: parentId,
                    inputs: { ITEM: strInput(node.item, id) },
                    fields: { LIST: { name: 'LIST', value: v.name, id: v.id } }, shadow: false, topLevel: false });
                return id;
            }
            case 'ListDeleteStmt': {
                const v = resolveVar(node.listName);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.listName.length,
                                  message: `List not found: ${node.listName}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_deleteoflist', next: null, parent: parentId,
                    inputs: { INDEX: numInput(node.index, id) },
                    fields: { LIST: { name: 'LIST', value: v.name, id: v.id } }, shadow: false, topLevel: false });
                return id;
            }
            case 'ListInsertStmt': {
                const v = resolveVar(node.listName);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.listName.length,
                                  message: `List not found: ${node.listName}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_insertatlist', next: null, parent: parentId,
                    inputs: { ITEM: strInput(node.item, id), INDEX: numInput(node.index, id) },
                    fields: { LIST: { name: 'LIST', value: v.name, id: v.id } }, shadow: false, topLevel: false });
                return id;
            }
            case 'ListReplaceStmt': {
                const v = resolveVar(node.listName);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.listName.length,
                                  message: `List not found: ${node.listName}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_replaceitemoflist', next: null, parent: parentId,
                    inputs: { INDEX: numInput(node.index, id), ITEM: strInput(node.item, id) },
                    fields: { LIST: { name: 'LIST', value: v.name, id: v.id } }, shadow: false, topLevel: false });
                return id;
            }

            // Motion extras
            case 'SetDirectionStmt': {
                addBlock({ id, opcode: 'motion_pointindirection', next: null, parent: parentId,
                    inputs: { DIRECTION: numInput(node.degrees, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'PointTowardsStmt': {
                const tgtVal = node.target.type === 'Str' ? node.target.value : '_mouse_';
                const menuId = menuBlock('motion_pointtowards_menu', 'TOWARDS', tgtVal, id);
                addBlock({ id, opcode: 'motion_pointtowards', next: null, parent: parentId,
                    inputs: { TOWARDS: inp(menuId, menuId) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'GoToFrontStmt': {
                addBlock({ id, opcode: 'looks_gotofrontback', next: null, parent: parentId,
                    inputs: {}, fields: { FRONT_BACK: { name: 'FRONT_BACK', value: 'front' } },
                    shadow: false, topLevel: false });
                return id;
            }
            case 'GoToBackStmt': {
                addBlock({ id, opcode: 'looks_gotofrontback', next: null, parent: parentId,
                    inputs: {}, fields: { FRONT_BACK: { name: 'FRONT_BACK', value: 'back' } },
                    shadow: false, topLevel: false });
                return id;
            }
            case 'MoveForwardLayersStmt': {
                addBlock({ id, opcode: 'looks_goforwardbackwardlayers', next: null, parent: parentId,
                    inputs: { NUM: numInput(node.layers, id) },
                    fields: { FORWARD_BACKWARD: { name: 'FORWARD_BACKWARD', value: 'forward' } },
                    shadow: false, topLevel: false });
                return id;
            }
            case 'MoveBackwardLayersStmt': {
                addBlock({ id, opcode: 'looks_goforwardbackwardlayers', next: null, parent: parentId,
                    inputs: { NUM: numInput(node.layers, id) },
                    fields: { FORWARD_BACKWARD: { name: 'FORWARD_BACKWARD', value: 'backward' } },
                    shadow: false, topLevel: false });
                return id;
            }

            // Looks effects
            case 'SetEffectStmt': {
                const eff = node.effect.type === 'Str' ? node.effect.value : 'color';
                addBlock({ id, opcode: 'looks_seteffectto', next: null, parent: parentId,
                    inputs: { VALUE: numInput(node.value, id) },
                    fields: { EFFECT: { name: 'EFFECT', value: eff } },
                    shadow: false, topLevel: false });
                return id;
            }
            case 'ChangeEffectStmt': {
                const eff = node.effect.type === 'Str' ? node.effect.value : 'color';
                addBlock({ id, opcode: 'looks_changeeffectby', next: null, parent: parentId,
                    inputs: { CHANGE: numInput(node.amount, id) },
                    fields: { EFFECT: { name: 'EFFECT', value: eff } },
                    shadow: false, topLevel: false });
                return id;
            }

            // Sound extras
            case 'SetVolumeStmt': {
                addBlock({ id, opcode: 'sound_setvolumeto', next: null, parent: parentId,
                    inputs: { VOLUME: numInput(node.value, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ChangeVolumeStmt': {
                addBlock({ id, opcode: 'sound_changevolumeby', next: null, parent: parentId,
                    inputs: { VOLUME: numInput(node.value, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }

            // Sensing extras
            case 'AskAndWaitStmt': {
                addBlock({ id, opcode: 'sensing_askandwait', next: null, parent: parentId,
                    inputs: { QUESTION: strInput(node.question, id) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'ResetTimerStmt': {
                addBlock({ id, opcode: 'sensing_resettimer', next: null, parent: parentId,
                    inputs: {}, fields: {}, shadow: false, topLevel: false });
                return id;
            }
            case 'SetDragModeStmt': {
                const modeVal = node.mode.type === 'Str' ? node.mode.value : 'draggable';
                addBlock({ id, opcode: 'sensing_setdragmode', next: null, parent: parentId,
                    inputs: {}, fields: { DRAG_MODE: { name: 'DRAG_MODE', value: modeVal } },
                    shadow: false, topLevel: false });
                return id;
            }

            // List delete all
            case 'ListDeleteAllStmt': {
                const v = resolveVar(node.listName);
                if (!v) {
                    errors.push({ line: node.line || 1, col: node.col || 1, len: node.listName.length,
                                  message: `List not found: ${node.listName}. Create it in Scratch first.` });
                    return null;
                }
                addBlock({ id, opcode: 'data_deletealloflist', next: null, parent: parentId,
                    inputs: {}, fields: { LIST: { name: 'LIST', value: v.name, id: v.id } },
                    shadow: false, topLevel: false });
                return id;
            }

            // Motion rotation style
            case 'SetRotationStyleStmt': {
                const styleVal = node.style.type === 'Str' ? node.style.value : 'all around';
                addBlock({ id, opcode: 'motion_setrotationstyle', next: null, parent: parentId,
                    inputs: {}, fields: { STYLE: { name: 'STYLE', value: styleVal } },
                    shadow: false, topLevel: false });
                return id;
            }

            // GlideTo (sprite)
            case 'GlideToStmt': {
                const menuId = menuBlock('motion_glidesecstosprite_menu', 'TO', node.target, id);
                addBlock({ id, opcode: 'motion_glidesecstosprite', next: null, parent: parentId,
                    inputs: { SECS: numInput(node.secs, id), TO: inp(menuId, menuId) },
                    fields: {}, shadow: false, topLevel: false });
                return id;
            }

            // Switch backdrop and wait
            case 'SwitchBackdropWaitStmt': {
                const menuId = menuBlock('looks_backdrops', 'BACKDROP', node.name.type === 'Str' ? node.name.value : '', id);
                addBlock({ id, opcode: 'looks_switchbackdroptoandwait', next: null, parent: parentId,
                    inputs: { BACKDROP: inp(menuId, menuId) }, fields: {}, shadow: false, topLevel: false });
                return id;
            }

            // Sound effects
            case 'SetSoundEffectStmt': {
                const effVal = node.effect.type === 'Str' ? node.effect.value.toUpperCase() : 'PITCH';
                addBlock({ id, opcode: 'sound_seteffectto', next: null, parent: parentId,
                    inputs: { VALUE: numInput(node.value, id) },
                    fields: { SOUND_EFFECT: { name: 'SOUND_EFFECT', value: effVal } },
                    shadow: false, topLevel: false });
                return id;
            }
            case 'ChangeSoundEffectStmt': {
                const effVal = node.effect.type === 'Str' ? node.effect.value.toUpperCase() : 'PITCH';
                addBlock({ id, opcode: 'sound_changeeffectby', next: null, parent: parentId,
                    inputs: { VALUE: numInput(node.value, id) },
                    fields: { SOUND_EFFECT: { name: 'SOUND_EFFECT', value: effVal } },
                    shadow: false, topLevel: false });
                return id;
            }
            case 'ClearSoundEffectsStmt': {
                addBlock({ id, opcode: 'sound_cleareffects', next: null, parent: parentId,
                    inputs: {}, fields: {}, shadow: false, topLevel: false });
                return id;
            }

            // Custom block call
            case 'CallStmt': {
                // yield() is sugar for wait(0) — handle before custom-block lookup
                if (node.name === 'yield') {
                    addBlock({ id, opcode: 'control_wait', next: null, parent: parentId,
                        inputs: { DURATION: numInput({ type: 'Num', value: 0 }, id) },
                        fields: {}, shadow: false, topLevel: false });
                    return id;
                }

                // Find the procedure definition to get the proccode and arg IDs
                const target = spriteName === '__stage__'
                    ? vm.runtime.targets.find(t => t.isStage)
                    : vm.runtime.targets.find(t => !t.isStage && t.sprite.name === spriteName);
                if (target) {
                    const protoBlock = Object.values(target.blocks._blocks).find(b =>
                        b.opcode === 'procedures_prototype' &&
                        b.mutation && b.mutation.proccode &&
                        b.mutation.proccode.split(' %')[0].trim() === node.name
                    );
                    if (protoBlock) {
                        const argIds = JSON.parse(protoBlock.mutation.argumentids || '[]');
                        const inputs = {};
                        argIds.forEach((argId, i) => {
                            if (node.args[i]) {
                                inputs[argId] = strInput(node.args[i], id);
                            } else {
                                const emptyId = uid();
                                addBlock({ id: emptyId, opcode: 'text', next: null, parent: id,
                                    inputs: {}, fields: { TEXT: { name: 'TEXT', value: '' } },
                                    shadow: true, topLevel: false });
                                inputs[argId] = inp(emptyId, emptyId);
                            }
                        });
                        addBlock({ id, opcode: 'procedures_call', next: null, parent: parentId,
                            inputs,
                            fields: {},
                            mutation: {
                                tagName: 'mutation',
                                children: [],
                                proccode: protoBlock.mutation.proccode,
                                argumentids: protoBlock.mutation.argumentids,
                                warp: protoBlock.mutation.warp,
                            },
                            shadow: false, topLevel: false });
                        return id;
                    }
                }
                errors.push({ line: node.line || 1, col: node.col || 1, len: node.name.length,
                              message: `Custom block not found: ${node.name}` });
                return null;
            }

            default:
                return null;
        }
    }

    // Build enum constant table from all EnumDecl nodes in the AST.
    // These are compile-time macros: name → {type:'Num'/'Str', value} node.
    const enumConstants = new Map();
    for (const block of ast.blocks) {
        if (block.type !== 'EnumDecl') continue;
        for (const { name, value } of block.entries) {
            enumConstants.set(name, value);
        }
    }

    // Substitute enum constants transparently before any input helper or genExpr dispatch.
    function resolveEnum(expr) {
        return (expr && expr.type === 'Reporter' && enumConstants.has(expr.name))
            ? enumConstants.get(expr.name)
            : expr;
    }

    // Pass 1: auto-create variables declared by struct name { field, ... }
    // Track newly-created IDs so we can roll back if compilation fails later.
    const newStructVarIds = [];
    for (const block of ast.blocks) {
        if (block.type !== 'StructDecl') continue;
        const stage = vm.runtime.targets.find(t => t.isStage);
        if (!stage) continue;
        for (const field of block.fields) {
            const varName = `${block.name}.${field}`;
            try {
                const exists = Object.values(stage.variables).some(v => v.name === varName);
                if (!exists) {
                    const varId = uid();
                    stage.createVariable(varId, varName, '');
                    newStructVarIds.push({ stage, id: varId });
                }
            } catch (e) {
                errors.push({ line: block.line || 1, col: block.col || 1, len: 6,
                    message: `struct ${block.name}: failed to create variable "${varName}" — ${e.message}` });
            }
        }
    }

    // Generate hat blocks
    let scriptX = 50;
    for (const block of ast.blocks) {
        if (block.type === 'StructDecl' || block.type === 'EnumDecl') {
            // compile-time declarations — no blocks generated
        } else if (block.type === 'OnBlock') {
            const hatId = uid();
            const hatBlock = genHat(block.hat, hatId, scriptX, spriteName === '__stage__');
            if (!hatBlock) { scriptX += 400; continue; }
            hatBlock.topLevel = true;
            hatBlock.x = scriptX;
            hatBlock.y = 50;
            // Handle greaterThan hat threshold (VALUE input must be wired inside compile closure)
            const pendingThreshold = hatBlock._hatThreshold;
            delete hatBlock._hatThreshold;
            addBlock(hatBlock);
            if (pendingThreshold !== undefined) {
                blocks[hatId].inputs = { VALUE: numInput(pendingThreshold, hatId) };
            }

            const bodyFirst = genBody(block.body, hatId);
            if (bodyFirst) {
                blocks[hatId].next = bodyFirst;
                blocks[bodyFirst].parent = hatId;
            }
            scriptX += 400;
        } else if (block.type === 'DefineBlock') {
            genDefineBlock(block, scriptX);
            scriptX += 400;
        } else if (block.type === 'ScratchroutineStmt') {
            genScratchroutineStmt(block, scriptX);
            scriptX += 400;
        }
    }

    function genDefineBlock(node, scriptX) {
        const defId   = uid();
        const protoId = uid();
        const argNames = node.params;
        const argIds   = argNames.map(() => uid());
        const proccode = node.name + (argNames.length > 0 ? ' ' + argNames.map(() => '%s').join(' ') : '');

        const argInputs = {};
        argIds.forEach((argId, i) => {
            const reporterId = uid();
            blocks[reporterId] = {
                id: reporterId, opcode: 'argument_reporter_string_number',
                next: null, parent: protoId,
                inputs: {}, fields: { VALUE: [argNames[i], null] },
                shadow: true, topLevel: false,
            };
            argInputs[argId] = [1, reporterId];
        });

        blocks[protoId] = {
            id: protoId, opcode: 'procedures_prototype',
            next: null, parent: defId,
            inputs: argInputs, fields: {},
            shadow: true, topLevel: false,
            mutation: {
                tagName: 'mutation', children: [], proccode,
                argumentids: JSON.stringify(argIds),
                argumentnames: JSON.stringify(argNames),
                argumentdefaults: JSON.stringify(argNames.map(() => '')),
                warp: 'false',
            },
        };

        blocks[defId] = {
            id: defId, opcode: 'procedures_definition',
            next: null, parent: null,
            inputs: { custom_block: inp(protoId, protoId) },
            fields: {}, shadow: false, topLevel: true, x: scriptX, y: 50,
        };

        const bodyFirst = genBody(node.body, defId);
        if (bodyFirst) {
            blocks[defId].next     = bodyFirst;
            blocks[bodyFirst].parent = defId;
        }
    }

    // Roll back any struct variables created above if compilation produced errors.
    // This prevents variable monitors from appearing in Scratch when injection is skipped.
    if (errors.length > 0) {
        for (const { stage, id } of newStructVarIds) {
            try {
                if (typeof stage.deleteVariable === 'function') stage.deleteVariable(id);
                else delete stage.variables[id];
            } catch (_) {}
        }
    }

    return { blocks, errors };
}

function genHat(hat, id, scriptX, isStage) {
    const base = { id, next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: scriptX, y: 50 };
    switch (hat.event) {
        case 'flag':    return { ...base, opcode: 'event_whenflagclicked' };
        case 'click':   return { ...base, opcode: isStage ? 'event_whenstageclicked' : 'event_whenthisspriteclicked' };
        case 'clone':   return { ...base, opcode: 'control_start_as_clone' };
        case 'key':     return { ...base, opcode: 'event_whenkeypressed', fields: { KEY_OPTION: { name: 'KEY_OPTION', value: hat.key || 'space' } } };
        case 'receive': return { ...base, opcode: 'event_whenbroadcastreceived', fields: { BROADCAST_OPTION: { name: 'BROADCAST_OPTION', value: hat.msg || '' } } };
        case 'backdrop':return { ...base, opcode: 'event_whenbackdropswitchesto', fields: { BACKDROP: { name: 'BACKDROP', value: hat.backdrop || '' } } };
        case 'greaterThan': {
            // VALUE input requires a shadow + possibly a reporter — build inline
            const blocks_local = {};
            const shadowId = uid();
            blocks_local[shadowId] = { id: shadowId, opcode: 'math_number', next: null, parent: id,
                inputs: {}, fields: { NUM: { name: 'NUM', value: '10' } },
                shadow: true, topLevel: false };
            // We can't call numInput here (it's inside compile closure), so we build the hat
            // and the VALUE shadow/reporter will be wired during compile().
            // Instead, we return the hat with a placeholder VALUE — compile() patches it.
            return {
                ...base,
                opcode: 'event_whengreaterthan',
                fields: { WHENGREATERTHANMENU: { name: 'WHENGREATERTHANMENU', value: hat.sense } },
                _hatThreshold: hat.threshold,
            };
        }
        default: return null;
    }
}


export function compileSource(source, vm, spriteName) {
    const tokens = tokenize(source);
    const { ast, errors: parseErrors } = parse(tokens);
    if (parseErrors.length > 0) return { blocks: {}, errors: parseErrors };
    const { blocks, errors: codeErrors } = compile(ast, vm, spriteName);
    return { blocks, errors: codeErrors };
}
