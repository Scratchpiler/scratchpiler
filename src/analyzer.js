import { tokenize, parse, fuzzyMatch, CALL_SIGS } from "./compiler.js";
import { scratchIndex } from "./scratch-index.js";
import { expand, mapExpandedError } from "./preprocess.js";

// [A] Semantic analyzer — symbol table, occurrence index, scope-aware lookups,
// semantic diagnostics and code-smell lints. Pure module: no Monaco imports,
// so it can be exercised outside the browser. All positions are 1-based
// (line, col) matching the lexer; `end*` fields are one-past-the-end.

// Bare reporters usable without parens (mirrors genReporter + parser whitelist)
const REPORTER_BUILTINS = new Set([
    'xPos', 'yPos', 'direction', 'size', 'timer', 'answer', 'mouseDown',
    'mouseX', 'mouseY', 'loudness', 'costumeNum', 'costumeName', 'volume',
    'username', 'daysSince2000', 'isRunning', 'true', 'false',
]);

// Function-call reporters usable in expressions (mirrors genCallExpr)
const EXPR_FN_BUILTINS = new Set([
    'touching', 'key', 'round', 'random', 'join', 'letterOf', 'contains',
    'distanceTo', 'currentTime', 'length', 'attributeOf', 'clamp', 'yield', 'isRunning',
    'abs', 'sqrt', 'floor', 'ceiling', 'ceil', 'sin', 'cos', 'tan',
    'asin', 'acos', 'atan', 'ln', 'log', 'exp', 'pow10',
    'xOf', 'yOf', 'directionOf', 'costumeNumOf', 'costumeNameOf',
    'sizeOf', 'volumeOf',
    'alloc', // hidden heap allocator define spliced in by the compiler
]);

const STMT_BUILTINS = new Set([...Object.keys(CALL_SIGS), 'alloc', 'free']);

// Statements that yield/block — used by the busy-wait smell
const BLOCKING_STMTS = new Set([
    'WaitStmt', 'WaitUntilStmt', 'GlideStmt', 'GlideToStmt',
    'SayForStmt', 'ThinkForStmt', 'AwaitStmt',
]);

// Literals too common to count as "magic numbers"
const BORING_NUMBERS = new Set([-1, 0, 1, 2, 10, 100, 180, 360]);

function mkSymbol(name, kind, defRange, meta) {
    return { name, kind, defRange: defRange || null, refs: [], meta: meta || {} };
}

function spanOf(node) {
    if (!node) return null;
    if (node.endLine !== undefined && node.endCol !== undefined) {
        return { line: node.line, col: node.col, endLine: node.endLine, endCol: node.endCol };
    }
    if (node.line === undefined) return null;
    const len = (node.name || '').length || 1;
    return { line: node.line, col: node.col, endLine: node.line, endCol: node.col + len };
}

// Compute the max line of an AST subtree — used to approximate scope extents.
function subtreeMaxLine(node) {
    let max = 0;
    (function walk(n) {
        if (!n) return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        if (typeof n !== 'object') return;
        if (typeof n.line === 'number' && n.line > max) max = n.line;
        if (typeof n.endLine === 'number' && n.endLine > max) max = n.endLine;
        for (const k of Object.keys(n)) {
            const v = n[k];
            if (v && typeof v === 'object') walk(v);
        }
    })(node);
    return max;
}

function posInScope(scope, line, col) {
    if (line < scope.startLine || line > scope.endLine) return false;
    return true; // line-granular is enough for this DSL's block style
}

export function analyze(src, spriteName) {
    // #include expansion: header declarations are appended after the user's
    // text (line numbers stay 1:1); appended-region positions are mapped back
    // onto the include line before anything reaches the editor.
    let _expand = null;
    if (src.includes('#include')) {
        const ex = expand(src);
        if (ex.segments.length > 0 || ex.errors.length > 0) {
            _expand = ex;
            src = ex.text;
        }
    }
    const tokens = tokenize(src);
    const { ast, errors: parseErrors } = parse(tokens);
    if (_expand) parseErrors.push(..._expand.errors);

    const symbols = [];          // all symbols
    const byKey = new Map();     // "kind:name" → symbol (document scope)
    const occurrences = [];      // {line, col, endLine, endCol, symbol, isDef, isBracketed}
    const scopes = [];           // {startLine, endLine, symbols: [param/loopVar symbols]}
    const unresolved = [];       // {name, kindGuess, line, col, endLine, endCol}
    const duplicates = [];       // {name, kind, line, col, len}

    const projectVars = new Set();
    const projectLists = new Set();
    for (const v of [
        ...(scratchIndex.globalVariables || []),
        ...(scratchIndex.spriteVariables[spriteName] || []),
    ]) {
        (v.type === 'list' ? projectLists : projectVars).add(v.name);
    }
    // With no VM index at all we can't judge project vars — suppress those checks
    const projectIndexed = projectVars.size > 0 || projectLists.size > 0;

    function docSymbol(name, kind, defSpan, meta) {
        if (name === '_err_') return null;
        const key = kind + ':' + name;
        if (byKey.has(key)) {
            if (defSpan) duplicates.push({ name, kind, line: defSpan.line, col: defSpan.col,
                                           len: Math.max(name.length, 1) });
            return byKey.get(key);
        }
        const sym = mkSymbol(name, kind, defSpan, meta);
        byKey.set(key, sym);
        symbols.push(sym);
        if (defSpan) occurrences.push({ ...defSpan, symbol: sym, isDef: true,
                                        isBracketed: kind === 'loopVar' });
        return sym;
    }

    function addOcc(sym, span, isBracketed, access = 'read') {
        if (!sym || !span) return;
        sym.refs.push({ ...span, access });
        occurrences.push({ ...span, symbol: sym, isDef: false, isBracketed: !!isBracketed, access });
    }

    // Pass 1: document-scope declarations
    for (const block of (ast.blocks || [])) {
        if (block.type === 'DefineBlock') {
            docSymbol(block.name, 'define',
                { line: block.line, col: block.col,
                  endLine: block.nameEndLine || block.line,
                  endCol: block.nameEndCol || block.col + block.name.length },
                { params: block.params, node: block, returns: !!block.returns });
        } else if (block.type === 'ScratchroutineStmt') {
            docSymbol(block.name, 'routine', block.nameSpan ||
                { line: block.line, col: block.col, endLine: block.line,
                  endCol: block.col + block.name.length },
                { params: block.params, node: block });
        } else if (block.type === 'EnumDecl') {
            for (const e of block.entries) {
                docSymbol(e.name, 'enumMember', spanOf(e), { value: e.value });
            }
        } else if (block.type === 'StructDecl') {
            const structSym = docSymbol(block.name, 'struct', block.nameSpan, { fields: block.fields });
            for (const f of (block.fieldSpans || [])) {
                const fs = docSymbol(block.name + '.' + f.name, 'structField',
                    { line: f.line, col: f.col, endLine: f.endLine, endCol: f.endCol },
                    { struct: block.name, field: f.name });
                if (fs && structSym) fs.meta.structSym = structSym;
            }
        }
    }

    // Project variables/lists become symbols without a def range (they live in Scratch)
    function projectSymbol(name, isList) {
        return docSymbol(name, isList ? 'projectList' : 'projectVar', null);
    }

    // Pass 2: reference walk with scope stack
    const scopeStack = [];  // innermost last: {symbols: Map(name→sym), startLine, endLine}

    function pushScope(startNode, entries) {
        const scope = {
            startLine: startNode.line, endLine: subtreeMaxLine(startNode) + 1,
            symbols: new Map(entries.map(s => [s.name, s])),
        };
        scopes.push(scope);
        scopeStack.push(scope);
        return scope;
    }

    function lookupLocal(name) {
        for (let i = scopeStack.length - 1; i >= 0; i--) {
            const s = scopeStack[i].symbols.get(name);
            if (s) return s;
        }
        return null;
    }

    // Resolve a [var]-style name, mirroring codegen's resolveVar precedence:
    // loop var / routine param first, then struct fields, then project vars.
    function resolveVarName(name, span, ctx, access = 'read') {
        const local = lookupLocal(name);
        if (local) { addOcc(local, span, true, access); return local; }
        if (name.includes('.')) {
            const key = 'structField:' + name;
            if (byKey.has(key)) { addOcc(byKey.get(key), span, true, access); return byKey.get(key); }
        }
        const preferList = ctx === 'list';
        const isList = projectLists.has(name) && (preferList || !projectVars.has(name));
        if (isList || projectVars.has(name)) {
            const sym = projectSymbol(name, isList);
            addOcc(sym, span, true, access);
            return sym;
        }
        if (name !== '_err_' && projectIndexed) {
            unresolved.push({ name, kindGuess: ctx || 'variable', ...span });
        }
        return null;
    }

    function paramSymbolsOf(node) {
        const spans = node.paramSpans || [];
        return (node.params || []).filter(p => p !== '_err_').map((p, i) => {
            const s = spans[i] && spans[i].name === p ? spans[i] : null;
            const sym = mkSymbol(p, 'param',
                s ? { line: s.line, col: s.col, endLine: s.endLine, endCol: s.endCol } : null,
                { owner: node.name });
            symbols.push(sym);
            if (sym.defRange) occurrences.push({ ...sym.defRange, symbol: sym, isDef: true, isBracketed: false });
            return sym;
        });
    }

    function loopVarSymbol(node) {
        if (!node.varName || node.varName === '_err_') return null;
        const sym = mkSymbol(node.varName, 'loopVar',
            node.varSpan ? { ...node.varSpan } : null, {});
        symbols.push(sym);
        if (sym.defRange) occurrences.push({ ...sym.defRange, symbol: sym, isDef: true, isBracketed: true });
        return sym;
    }

    function callTarget(name, span, isLaunch) {
        if (name === '_err_') return;
        const routine = byKey.get('routine:' + name);
        const define = byKey.get('define:' + name);
        if (isLaunch) {
            if (routine) { addOcc(routine, span, false); return; }
            unresolved.push({ name, kindGuess: 'routine', ...span });
            return;
        }
        if (define)  { addOcc(define, span, false); return; }
        if (routine) { addOcc(routine, span, false); return; }
        if (STMT_BUILTINS.has(name)) return; // builtin — no symbol needed
        unresolved.push({ name, kindGuess: 'call', ...span });
    }

    function visitExpr(e) {
        if (!e || typeof e !== 'object') return;
        switch (e.type) {
            case 'Var':
                resolveVarName(e.name, spanOf(e), 'variable');
                return;
            case 'Reporter': {
                // Bare define-param / loop-var reference (e.g. `n` instead of `[n]`)
                const local = lookupLocal(e.name);
                if (local) {
                    addOcc(local, spanOf(e), false);
                } else if (byKey.has('enumMember:' + e.name)) {
                    addOcc(byKey.get('enumMember:' + e.name), spanOf(e), false);
                } else if (!REPORTER_BUILTINS.has(e.name) && e.name !== '_err_') {
                    unresolved.push({ name: e.name, kindGuess: 'reporter', ...spanOf(e) });
                }
                return;
            }
            case 'CallExpr': {
                const defineSym = byKey.get('define:' + e.name);
                if (defineSym) {
                    addOcc(defineSym, spanOf(e), false);
                } else if (!EXPR_FN_BUILTINS.has(e.name) && e.name !== '_err_') {
                    unresolved.push({ name: e.name, kindGuess: 'exprFn', ...spanOf(e) });
                }
                (e.args || []).forEach(visitExpr);
                return;
            }
            case 'MemberCall':
                if (e.object && e.object.type === 'Var') {
                    resolveVarName(e.object.name, spanOf(e.object), 'list');
                }
                (e.args || []).forEach(visitExpr);
                return;
            case 'BinOp':  visitExpr(e.left); visitExpr(e.right); return;
            case 'UnaryOp': case 'UnOp': visitExpr(e.operand); return;
            case 'TernaryExpr': visitExpr(e.cond); visitExpr(e.then); visitExpr(e.alt); return;
            case 'DerefExpr': visitExpr(e.addr); return;
            case 'AddrExpr':
                resolveVarName(e.varName, e.varSpan || spanOf(e), 'variable', 'readwrite');
                return;
            default: return; // Num / Str / Hex / Bool / synthetic
        }
    }

    function visitStmt(stmt) {
        if (!stmt || typeof stmt !== 'object') return;
        switch (stmt.type) {
            case 'AsmStmt':
                return; // raw opcodes — out of scope for the symbol table
            case 'SetVarStmt': case 'ChangeVarStmt':
                visitExpr(stmt.value);
                if (stmt.varSpan) resolveVarName(stmt.varName, stmt.varSpan, 'variable', stmt.type === 'SetVarStmt' ? 'write' : 'readwrite');
                return;
            case 'MemberCallStmt':
                if (stmt.object && stmt.object.type === 'Var') {
                    resolveVarName(stmt.object.name, spanOf(stmt.object), 'list', stmt.method === 'sort' ? 'readwrite' : 'read');
                }
                (stmt.args || []).forEach(visitExpr);
                return;
            case 'ListAddStmt': case 'ListDeleteStmt': case 'ListInsertStmt': case 'ListReplaceStmt':
            case 'ListDeleteAllStmt': case 'PopulateListStmt':
                [stmt.item, stmt.index, stmt.valueExpr, stmt.countExpr, stmt.clearFirst].forEach(visitExpr);
                if (stmt.listSpan) resolveVarName(stmt.listName, stmt.listSpan, 'list', 'write');
                return;
            case 'ShowVarStmt': case 'HideVarStmt':
                if (stmt.nameSpan) resolveVarName(stmt.name, stmt.nameSpan, 'variable');
                return;
            case 'ShowListStmt': case 'HideListStmt':
                if (stmt.nameSpan) resolveVarName(stmt.name, stmt.nameSpan, 'list');
                return;
            case 'CallStmt':
                callTarget(stmt.name, spanOf(stmt), false);
                (stmt.args || []).forEach(visitExpr);
                return;
            case 'LaunchStmt': case 'AwaitStmt': case 'CancelStmt':
                callTarget(stmt.name, stmt.nameSpan ||
                    { line: stmt.line, col: stmt.col, endLine: stmt.line,
                      endCol: stmt.col + (stmt.name || '').length }, true);
                (stmt.args || []).forEach(visitExpr);
                return;
            case 'ForStmt': {
                visitExpr(stmt.from); visitExpr(stmt.to);
                const lv = loopVarSymbol(stmt);
                pushScope(stmt, lv ? [lv] : []);
                (stmt.body || []).forEach(visitStmt);
                scopeStack.pop();
                return;
            }
            case 'PyForStmt': {
                if (stmt.listSpan && stmt.listName !== '_err_') {
                    resolveVarName(stmt.listName, stmt.listSpan, 'list');
                }
                const lv = loopVarSymbol(stmt);
                pushScope(stmt, lv ? [lv] : []);
                (stmt.body || []).forEach(visitStmt);
                scopeStack.pop();
                return;
            }
            case 'MatchStmt':
                visitExpr(stmt.subject);
                for (const c of (stmt.cases || [])) {
                    (c.values || []).forEach(visitExpr);
                    (c.body || []).forEach(visitStmt);
                }
                (stmt.defaultBody || []).forEach(visitStmt);
                return;
            default: {
                // Generic: recurse into expression-valued fields and body arrays
                for (const k of Object.keys(stmt)) {
                    if (k === 'line' || k === 'col' || k === 'endLine' || k === 'endCol' ||
                        k === 'type' || k === 'varSpan' || k === 'nameSpan' || k === 'listSpan') continue;
                    const v = stmt[k];
                    if (Array.isArray(v)) {
                        v.forEach(x => { if (x && x.type) (isStmtType(x.type) ? visitStmt : visitExpr)(x); });
                    } else if (v && typeof v === 'object' && v.type) {
                        (isStmtType(v.type) ? visitStmt : visitExpr)(v);
                    }
                }
                return;
            }
        }
    }

    function isStmtType(t) {
        return typeof t === 'string' && (t.endsWith('Stmt') || t.endsWith('Block'));
    }

    for (const block of (ast.blocks || [])) {
        if (block.type === 'DefineBlock' || block.type === 'ScratchroutineStmt') {
            pushScope(block, paramSymbolsOf(block));
            (block.body || []).forEach(visitStmt);
            scopeStack.pop();
        } else if (block.type === 'OnBlock' || block.type === 'OrphanedBlock') {
            if (block.hat && block.hat.threshold) visitExpr(block.hat.threshold);
            (block.body || []).forEach(visitStmt);
        } else if (block.type === 'EnumDecl' || block.type === 'StructDecl') {
            // declarations only
        } else {
            visitStmt(block);
        }
    }

    occurrences.sort((a, b) => a.line - b.line || a.col - b.col);

    // Header-origin cleanup: occurrences/scopes inside the appended region
    // would point past the end of the editor document — drop them, and pin
    // header symbols' definitions onto their include line.
    let outOccurrences = occurrences, outScopes = scopes;
    if (_expand) {
        const segFor = (line) => _expand.segments.find(s => line >= s.startLine && line < s.startLine + s.lineCount);
        outOccurrences = occurrences.filter(o => o.line <= _expand.userLineCount);
        outScopes = scopes.filter(s => (s.startLine ?? 0) <= _expand.userLineCount);
        for (const sym of symbols) {
            if (sym.defRange && sym.defRange.line > _expand.userLineCount) {
                const seg = segFor(sym.defRange.line);
                sym.headerOrigin = seg ? seg.header : 'header';
                sym.defRange = seg
                    ? { line: seg.includeLine, col: 1, endLine: seg.includeLine, endCol: 2 }
                    : { line: _expand.userLineCount, col: 1, endLine: _expand.userLineCount, endCol: 2 };
            }
        }
    }

    return {
        src, tokens, ast, parseErrors, symbols, byKey,
        occurrences: outOccurrences, scopes: outScopes,
        unresolved, duplicates, spriteName, projectVars, projectLists, projectIndexed,
        _expand,
    };
}

export function symbolAt(analysis, line, col) {
    // binary search would work; linear is fine at userscript scale
    for (const occ of analysis.occurrences) {
        if (line < occ.line || line > occ.endLine) continue;
        const afterStart = line > occ.line || col >= occ.col;
        const beforeEnd  = line < occ.endLine || col <= occ.endCol;
        if (afterStart && beforeEnd) return { symbol: occ.symbol, occurrence: occ };
    }
    return null;
}

export function visibleSymbols(analysis, line, col) {
    const out = [];
    const seen = new Set();
    // innermost scopes last in the array → walk backwards for precedence
    for (let i = analysis.scopes.length - 1; i >= 0; i--) {
        const scope = analysis.scopes[i];
        if (!posInScope(scope, line, col)) continue;
        for (const sym of scope.symbols.values()) {
            if (!seen.has(sym.name)) { seen.add(sym.name); out.push(sym); }
        }
    }
    for (const sym of analysis.symbols) {
        if (sym.kind === 'param' || sym.kind === 'loopVar') continue; // scope-gated above
        if (!seen.has(sym.kind + ':' + sym.name)) {
            seen.add(sym.kind + ':' + sym.name);
            out.push(sym);
        }
    }
    return out;
}

// --- Semantic diagnostics (category: "Semantic") --------------------------

export function semanticDiagnostics(analysis) {
    const items = [];
    const { ast, byKey, unresolved, duplicates } = analysis;
    const push = (line, col, len, message) =>
        items.push({ line: line || 1, col: col || 1, len: Math.max(len || 1, 1),
                     message, category: 'Semantic' });

    for (const d of duplicates) {
        push(d.line, d.col, d.len, `\`${d.name}\` is already declared`);
    }

    const defineNames  = [...byKey.keys()].filter(k => k.startsWith('define:')).map(k => k.slice(7));
    const routineNames = [...byKey.keys()].filter(k => k.startsWith('routine:')).map(k => k.slice(8));
    const enumNames    = [...byKey.keys()].filter(k => k.startsWith('enumMember:')).map(k => k.slice(11));

    const didYouMean = similar => similar.length ? ` — did you mean ${similar.map(n => `\`${n}\``).join(', ')}?` : '';
    for (const u of unresolved) {
        const len = Math.max((u.endCol || u.col + 1) - u.col, u.name.length, 1);
        if (u.kindGuess === 'routine') {
            push(u.line, u.col, len, `Unknown scratchroutine \`${u.name}\`` + didYouMean(fuzzyMatch(u.name, routineNames)));
        } else if (u.kindGuess === 'call') {
            push(u.line, u.col, len, `Unknown block \`${u.name}\`` +
                didYouMean(fuzzyMatch(u.name, [...defineNames, ...routineNames, ...STMT_BUILTINS])));
        } else if (u.kindGuess === 'exprFn') {
            push(u.line, u.col, len, `Unknown function \`${u.name}\`` + didYouMean(fuzzyMatch(u.name, [...EXPR_FN_BUILTINS])));
        } else if (u.kindGuess === 'reporter') {
            const similar = fuzzyMatch(u.name, [...enumNames, ...REPORTER_BUILTINS]);
            push(u.line, u.col, len, `Unknown name \`${u.name}\`` +
                (similar.length ? didYouMean(similar) : ` — variables need brackets: \`[${u.name}]\``));
        } else if (u.kindGuess === 'list' || u.kindGuess === 'variable') {
            push(u.line, u.col, len, `\`[${u.name}]\` doesn't exist in Scratch`);
        }
    }

    // Arity checks on define / routine calls
    function arity(node, sym, label) {
        const want = (sym.meta.params || []).length;
        const got  = (node.args || []).length;
        if (want !== got) {
            push(node.line, node.col, (node.name || '').length,
                `\`${node.name}\` takes ${want} argument${want === 1 ? '' : 's'}, got ${got}`);
        }
    }
    (function walk(n) {
        if (!n) return;
        if (Array.isArray(n)) { n.forEach(walk); return; }
        if (typeof n !== 'object') return;
        if (n.type === 'CallStmt') {
            const d = byKey.get('define:' + n.name);
            if (d) arity(n, d, 'define');
        } else if (n.type === 'CallExpr') {
            const d = byKey.get('define:' + n.name);
            if (d) {
                arity(n, d, 'define');
                if (!d.meta.returns) {
                    push(n.line, n.col, (n.name || '').length,
                        `\`${n.name}\` doesn't return a value — add \`returns\` to its define`);
                }
            }
        } else if (n.type === 'LaunchStmt' || n.type === 'AwaitStmt') {
            const r = byKey.get('routine:' + n.name);
            if (r) arity(n, r, 'scratchroutine');
        }
        for (const k of Object.keys(n)) {
            const v = n[k];
            if (v && typeof v === 'object') walk(v);
        }
    })(ast.blocks);

    // Returns-defines should actually return something
    for (const block of (ast.blocks || [])) {
        if (block.type !== 'DefineBlock' || !block.returns) continue;
        let hasReturn = false;
        (function scan(n) {
            if (hasReturn || !n) return;
            if (Array.isArray(n)) { n.forEach(scan); return; }
            if (typeof n !== 'object') return;
            if (n.type === 'ReturnStmt' && n.value !== null && n.value !== undefined) { hasReturn = true; return; }
            for (const k of Object.keys(n)) { const v = n[k]; if (v && typeof v === 'object') scan(v); }
        })(block.body);
        if (!hasReturn) {
            push(block.line, block.col, block.name.length,
                `\`${block.name}\` is \`returns\` but never returns a value`);
        }
    }

    // Shadowing
    for (const sym of analysis.symbols) {
        if ((sym.kind !== 'param' && sym.kind !== 'loopVar') || !sym.defRange) continue;
        if (analysis.projectVars.has(sym.name) || analysis.projectLists.has(sym.name)) {
            push(sym.defRange.line, sym.defRange.col, sym.name.length,
                `\`${sym.name}\` shadows the Scratch variable \`[${sym.name}]\``);
        } else if (byKey.has('enumMember:' + sym.name)) {
            push(sym.defRange.line, sym.defRange.col, sym.name.length,
                `\`${sym.name}\` shadows the enum constant`);
        }
    }

    return analysis._expand ? items.map(d => mapExpandedError(analysis._expand, d)) : items;
}

// --- Code-smell lints (category: "Smell") ---------------------------------

export function smellDiagnostics(analysis) {
    const items = [];
    const { ast, symbols } = analysis;
    const push = (line, col, len, message) =>
        items.push({ line: line || 1, col: col || 1, len: Math.max(len || 1, 1),
                     message, category: 'Smell' });

    // Unused defines / routines / params / loop vars
    for (const sym of symbols) {
        if (!sym.defRange || sym.refs.length > 0) continue;
        const unused = { define: 'is never called', routine: 'is never launched', param: 'is unused', loopVar: 'is unused' }[sym.kind];
        if (unused) push(sym.defRange.line, sym.defRange.col, sym.name.length, `\`${sym.name}\` ${unused}`);
    }

    function subtreeHasBlocking(stmts) {
        let found = false;
        (function walk(n) {
            if (found || !n) return;
            if (Array.isArray(n)) { n.forEach(walk); return; }
            if (typeof n !== 'object') return;
            if (BLOCKING_STMTS.has(n.type)) { found = true; return; }
            for (const k of Object.keys(n)) {
                const v = n[k];
                if (v && typeof v === 'object') walk(v);
            }
        })(stmts);
        return found;
    }

    const numCounts = new Map(); // value → [{line,col}]

    function checkBody(stmts, depth) {
        for (const stmt of (stmts || [])) checkStmt(stmt, depth);
    }

    let lastSet = null; // {varName, stmt} for consecutive-set detection

    function checkStmt(stmt, depth) {
        if (!stmt || typeof stmt !== 'object') return;

        // Redundant consecutive set: `set [x] to A` immediately followed by
        // `set [x] to B` (no read of x in B) — the first write is dead.
        if (stmt.type === 'SetVarStmt') {
            if (lastSet && lastSet.varName === stmt.varName && !exprReadsVar(stmt.value, stmt.varName)) {
                push(lastSet.stmt.line, lastSet.stmt.col, 3,
                    `Overwritten on line ${stmt.line} before it's read`);
            }
            lastSet = { varName: stmt.varName, stmt };
        } else {
            lastSet = null;
        }

        collectNums(stmt);

        const nested = depth + (isNesting(stmt.type) ? 1 : 0);
        if (isNesting(stmt.type) && nested > 4) {
            push(stmt.line, stmt.col, 4,
                `Nested ${nested} levels deep — extract a \`define\``);
        }

        if ((stmt.type === 'ForeverStmt' || stmt.type === 'RepeatUntilStmt')) {
            const body = stmt.body || [];
            if (body.length === 0) {
                push(stmt.line, stmt.col, 7, `Empty \`${stmt.type === 'ForeverStmt' ? 'forever' : 'repeat until'}\``);
            } else if (stmt.type === 'ForeverStmt' &&
                       body.every(s => s.type === 'IfStmt') && !subtreeHasBlocking(body)) {
                push(stmt.line, stmt.col, 7, `Busy-wait — use \`wait until\``);
            }
        }
        if ((stmt.type === 'RepeatStmt' || stmt.type === 'WhileStmt' || stmt.type === 'ForStmt' ||
             stmt.type === 'PyForStmt') && (stmt.body || []).length === 0) {
            push(stmt.line, stmt.col, 6, `Empty loop`);
        }
        if (stmt.type === 'IfStmt' && (stmt.then || []).length === 0 && !stmt.alt) {
            push(stmt.line, stmt.col, 2, `Empty \`if\``);
        }

        // Recurse into bodies with a fresh consecutive-set tracker per body
        const saved = lastSet;
        if (stmt.then) { lastSet = null; checkBody(stmt.then, nested); }
        if (stmt.alt)  { lastSet = null; checkBody(stmt.alt, nested); }
        if (stmt.body) { lastSet = null; checkBody(stmt.body, nested); }
        if (stmt.type === 'MatchStmt') {
            for (const c of (stmt.cases || [])) { lastSet = null; checkBody(c.body, nested); }
            if (stmt.defaultBody) { lastSet = null; checkBody(stmt.defaultBody, nested); }
        }
        lastSet = saved;
    }

    function isNesting(t) {
        return t === 'IfStmt' || t === 'ForeverStmt' || t === 'RepeatStmt' ||
               t === 'RepeatUntilStmt' || t === 'WhileStmt' || t === 'ForStmt' || t === 'PyForStmt' ||
               t === 'MatchStmt' || t === 'DoWhileStmt';
    }

    function exprReadsVar(e, name) {
        let found = false;
        (function walk(n) {
            if (found || !n || typeof n !== 'object') return;
            if (Array.isArray(n)) { n.forEach(walk); return; }
            if (n.type === 'Var' && n.name === name) { found = true; return; }
            for (const k of Object.keys(n)) {
                const v = n[k];
                if (v && typeof v === 'object') walk(v);
            }
        })(e);
        return found;
    }

    function collectNums(stmt) {
        // Only count literals in expression positions of this statement (not bodies)
        for (const k of Object.keys(stmt)) {
            if (k === 'body' || k === 'then' || k === 'alt' || k === 'cases' || k === 'defaultBody') continue;
            (function walk(n) {
                if (!n || typeof n !== 'object') return;
                if (Array.isArray(n)) { n.forEach(walk); return; }
                if (n.type === 'Num' && typeof n.value === 'number' &&
                    !BORING_NUMBERS.has(n.value) && typeof n.line === 'number') {
                    if (!numCounts.has(n.value)) numCounts.set(n.value, []);
                    numCounts.get(n.value).push({ line: n.line, col: n.col });
                    return;
                }
                for (const key of Object.keys(n)) {
                    const v = n[key];
                    if (v && typeof v === 'object') walk(v);
                }
            })(stmt[k]);
        }
    }

    for (const block of (ast.blocks || [])) {
        if (block.type === 'EnumDecl' || block.type === 'StructDecl') continue;
        lastSet = null;
        checkBody(block.body || (block.type.endsWith('Stmt') ? [block] : []), 0);
    }

    for (const [value, sites] of numCounts) {
        if (sites.length >= 3) {
            const first = sites[0];
            push(first.line, first.col, String(value).length,
                `${value} appears ${sites.length} times — make it an \`enum\` constant`);
        }
    }

    return analysis._expand ? items.map(d => mapExpandedError(analysis._expand, d)) : items;
}

// Monaco-agnostic list: [{line, col, length, tokenType}] (1-based, single-line)
const KIND_TO_TOKEN = {
    param: 'parameter',
    loopVar: 'variable',
    define: 'function',
    routine: 'function',
    enumMember: 'enumMember',
    struct: 'type',
    structField: 'property',
};

export function buildSemanticTokens(analysis) {
    const out = [];
    for (const occ of analysis.occurrences) {
        if (occ.endLine !== undefined && occ.endLine !== occ.line) continue; // single-line only
        const type = KIND_TO_TOKEN[occ.symbol.kind];
        if (!type) continue; // projectVar/projectList → Monarch coloring shows through
        const length = (occ.endCol || occ.col + occ.symbol.name.length) - occ.col;
        if (length <= 0) continue;
        out.push({ line: occ.line, col: occ.col, length, tokenType: type });
    }
    for (const u of analysis.unresolved) {
        if (u.endLine !== undefined && u.endLine !== u.line) continue;
        const length = Math.max((u.endCol || u.col + u.name.length) - u.col, u.name.length);
        out.push({ line: u.line, col: u.col, length, tokenType: 'invalid' });
    }
    out.sort((a, b) => a.line - b.line || a.col - b.col);
    return out;
}

const cache = new Map(); // uri → {versionId, spriteName, indexRef, analysis}

export function getAnalysis(model, spriteName) {
    const key = String(model.uri);
    const hit = cache.get(key);
    if (hit && hit.versionId === model.getVersionId() &&
        hit.spriteName === spriteName && hit.indexRef === scratchIndex) {
        return hit.analysis;
    }
    const analysis = analyze(model.getValue(), spriteName);
    cache.set(key, {
        versionId: model.getVersionId(), spriteName,
        indexRef: scratchIndex, analysis,
    });
    return analysis;
}
