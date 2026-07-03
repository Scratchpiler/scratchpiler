// [L1.5] AST lowering — desugars high-level constructs into the core AST the
// code generator understands. Runs between parse() and compile(); the analyzer
// keeps operating on the un-lowered AST so diagnostics point at user syntax.
//
// Mechanisms:
//   1. Statement rewriters — map one statement to a replacement statement list
//      (return/match/do-while/break-continue).
//   2. Expression hoisting — expressions that have no block form (ternary,
//      calls to `define … returns` functions) are extracted into statements
//      before the statement that used them, and replaced by a hidden temp.
//
// Hidden temps follow the existing `_scratchpiler_internal_<rand4>_<tag>`
// convention so the decompiler can recognize and re-sugar them.

const EXPR_TYPES = new Set([
    'Num', 'Str', 'Hex', 'Var', 'BinOp', 'UnaryOp', 'CallExpr', 'Reporter',
    'MemberCall', 'Bool', 'TernaryExpr', 'DerefExpr', 'AddrExpr',
]);

const TOP_LEVEL_BODIES = new Set(['OnBlock', 'DefineBlock', 'ScratchroutineStmt', 'OrphanedBlock']);

function isExprNode(v) {
    return v && typeof v === 'object' && !Array.isArray(v) && EXPR_TYPES.has(v.type);
}

function isStmtList(v) {
    return Array.isArray(v) && (v.length === 0 ||
        (v[0] && typeof v[0] === 'object' && typeof v[0].type === 'string' && !EXPR_TYPES.has(v[0].type)));
}

export function makeNamer() {
    const rand4 = Math.random().toString(36).slice(2, 6);
    let n = 0;
    const created = [];
    return {
        fresh(tag) {
            const name = `_scratchpiler_internal_${rand4}_${tag}${n++}`;
            created.push(name);
            return name;
        },
        created,
    };
}

function SET(varName, value, at) {
    return { type: 'SetVarStmt', varName, value, line: at.line || 1, col: at.col || 1 };
}
function VAR(name, at) {
    return { type: 'Var', name, line: at.line || 1, col: at.col || 1 };
}
function NUM(value, at) {
    return { type: 'Num', value, line: at.line || 1, col: at.col || 1 };
}
function STR(value, at) {
    return { type: 'Str', value, line: at.line || 1, col: at.col || 1 };
}
function BOP(op, left, right, at) {
    return { type: 'BinOp', op, left, right, line: at.line || 1, col: at.col || 1 };
}
function NOT(operand, at) {
    return { type: 'UnaryOp', op: 'not', operand, line: at.line || 1, col: at.col || 1 };
}
export function retVarName(fnName) { return `__ret_${fnName}`; }

// --- Expression hoisting -----------------------------------------------------

// Rewrite one expression tree bottom-up, pushing hoisted statements to `out`.
function hoistExpr(expr, namer, ctx, out) {
    if (!isExprNode(expr)) return expr;
    for (const key of Object.keys(expr)) {
        const v = expr[key];
        if (isExprNode(v)) expr[key] = hoistExpr(v, namer, ctx, out);
        else if (Array.isArray(v) && v.some(isExprNode)) {
            expr[key] = v.map(e => isExprNode(e) ? hoistExpr(e, namer, ctx, out) : e);
        }
    }

    if (expr.type === 'TernaryExpr') {
        const tmp = namer.fresh('tern');
        out.push({
            type: 'IfStmt', cond: expr.cond,
            then: [SET(tmp, expr.then, expr)],
            alt:  [SET(tmp, expr.alt,  expr)],
            line: expr.line || 1, col: expr.col || 1,
        });
        return VAR(tmp, expr);
    }

    // Call to a user define in expression position
    if (expr.type === 'CallExpr' && ctx.defines.has(expr.name)) {
        const def = ctx.defines.get(expr.name);
        if (!def.returns) {
            ctx.errors.push({ line: expr.line || 1, col: expr.col || 1, len: expr.name.length,
                message: `\`${expr.name}\` is a define without a return value — add \`returns\` to its definition to use it in an expression: \`define ${expr.name}(...) returns { ... }\`` });
            return { type: 'Num', value: 0, line: expr.line || 1, col: expr.col || 1 };
        }
        // Hoist the call, then capture its result immediately. The capture
        // temp makes nested/multiple/recursive calls safe: __ret_<fn> is
        // only read in the instant after the call returns.
        out.push({ type: 'CallStmt', name: expr.name, args: expr.args, line: expr.line || 1, col: expr.col || 1 });
        const tmp = namer.fresh('rv');
        ctx.retVars.add(retVarName(expr.name));
        out.push(SET(tmp, VAR(retVarName(expr.name), expr), expr));
        return VAR(tmp, expr);
    }

    return expr;
}

// Hoist from every expression-position field of a statement (not its bodies).
function hoistStmtExprs(stmt, namer, ctx, out) {
    for (const key of Object.keys(stmt)) {
        if (key === 'line' || key === 'col') continue;
        const v = stmt[key];
        if (isExprNode(v)) stmt[key] = hoistExpr(v, namer, ctx, out);
        else if (Array.isArray(v) && v.length > 0 && v.every(isExprNode)) {
            stmt[key] = v.map(e => hoistExpr(e, namer, ctx, out));
        }
    }
}

// --- Statement rewriters -----------------------------------------------------

// Each: (stmt, namer, ctx) → null (no match) | Stmt[] (replacement, re-processed).
const STMT_REWRITERS = [];
export function registerStmtRewriter(fn) { STMT_REWRITERS.push(fn); }

// return / return expr  →  set [__ret_<fn>] + stop this script
registerStmtRewriter(function lowerReturn(stmt, namer, ctx) {
    if (stmt.type !== 'ReturnStmt') return null;
    const stop = { type: 'StopStmt', option: 'this script', line: stmt.line, col: stmt.col };
    if (stmt.value === null || stmt.value === undefined) return [stop];
    const def = ctx.currentDefine;
    if (!def || !def.returns) {
        ctx.errors.push({ line: stmt.line, col: stmt.col, len: 6,
            message: def
                ? `\`return\` with a value requires the define to be declared with \`returns\`: \`define ${def.name}(...) returns { ... }\``
                : '`return <value>` is only valid inside a `define … returns { }` block' });
        return [stop];
    }
    ctx.retVars.add(retVarName(def.name));
    return [SET(retVarName(def.name), stmt.value, stmt), stop];
});

// --- break / continue ---------------------------------------------------------
// Loops whose bodies contain `break`/`continue` are converted to repeat-until
// with hidden `_.._brk`/`_.._cont` flag variables. Statements following a
// flag-set are wrapped in `if <flags clear>` guards so the rest of the
// iteration is skipped. `break`/`continue` bind to the innermost loop, so the
// scan never descends into nested loops.

const LOOP_TYPES = new Set(['ForeverStmt', 'RepeatStmt', 'WhileStmt', 'RepeatUntilStmt', 'DoWhileStmt']);
const FOR_TYPES  = new Set(['ForStmt', 'PyForStmt']);

// Iterate the statement lists nested in `stmt` that still belong to the same
// loop (if/else branches, match arms — NOT nested loop bodies).
function sameLoopBodies(stmt, fn) {
    if (LOOP_TYPES.has(stmt.type) || FOR_TYPES.has(stmt.type)) return;
    if (stmt.type === 'MatchStmt') {
        for (const c of stmt.cases) c.body = fn(c.body) || c.body;
        if (stmt.defaultBody) stmt.defaultBody = fn(stmt.defaultBody) || stmt.defaultBody;
        return;
    }
    for (const key of Object.keys(stmt)) {
        const v = stmt[key];
        if (isStmtList(v) && v.length > 0) stmt[key] = fn(v) || v;
    }
}

function scanBreakContinue(list, found) {
    for (const s of list) {
        if (!s || typeof s !== 'object') continue;
        if (s.type === 'BreakStmt') found.brk = true;
        else if (s.type === 'ContinueStmt') found.cont = true;
        else sameLoopBodies(s, (body) => { scanBreakContinue(body, found); });
    }
}

function setsFlag(s, brkVar, contVar) {
    if (s.type === 'SetVarStmt' && (s.varName === brkVar || s.varName === contVar)) return true;
    if (LOOP_TYPES.has(s.type) || FOR_TYPES.has(s.type)) return false;
    if (s.type === 'MatchStmt') {
        return s.cases.some(c => c.body.some(x => setsFlag(x, brkVar, contVar))) ||
               (s.defaultBody || []).some(x => setsFlag(x, brkVar, contVar));
    }
    for (const key of Object.keys(s)) {
        const v = s[key];
        if (isStmtList(v) && v.some(x => setsFlag(x, brkVar, contVar))) return true;
    }
    return false;
}

// Wrap everything after the first flag-setting statement in `if <flags clear>`.
function wrapGuards(list, brkVar, contVar) {
    for (let i = 0; i < list.length - 1; i++) {
        if (!setsFlag(list[i], brkVar, contVar)) continue;
        const at = list[i];
        const conds = [];
        if (brkVar)  conds.push(BOP('=', VAR(brkVar, at),  NUM(0, at), at));
        if (contVar) conds.push(BOP('=', VAR(contVar, at), NUM(0, at), at));
        const guard = {
            type: 'IfStmt',
            cond: conds.reduce((a, b) => BOP('and', a, b, at)),
            then: wrapGuards(list.slice(i + 1), brkVar, contVar),
            alt: null, line: at.line || 1, col: at.col || 1,
        };
        return [...list.slice(0, i + 1), guard];
    }
    return list;
}

function transformLoopBody(list, brkVar, contVar) {
    const out = [];
    for (const s of list) {
        if (s.type === 'BreakStmt')         { out.push(SET(brkVar,  NUM(1, s), s)); continue; }
        else if (s.type === 'ContinueStmt') { out.push(SET(contVar, NUM(1, s), s)); continue; }
        sameLoopBodies(s, (body) => transformLoopBody(body, brkVar, contVar));
        out.push(s);
    }
    return wrapGuards(out, brkVar, contVar);
}

registerStmtRewriter(function lowerBreakContinue(stmt, namer, ctx) {
    if (!LOOP_TYPES.has(stmt.type)) return null;
    const found = { brk: false, cont: false };
    scanBreakContinue(stmt.body, found);
    if (!found.brk && !found.cont) return null;

    const at = stmt;
    const brkVar  = found.brk  ? namer.fresh('brk')  : null;
    const contVar = found.cont ? namer.fresh('cont') : null;
    let body = transformLoopBody(stmt.body, brkVar, contVar);
    if (contVar) body = [SET(contVar, NUM(0, at), at), ...body];

    const pre = brkVar ? [SET(brkVar, NUM(0, at), at)] : [];
    const brkEq = brkVar ? BOP('=', VAR(brkVar, at), NUM(1, at), at) : null;
    const RU = (cond, b) => ({ type: 'RepeatUntilStmt', cond, body: b, line: at.line || 1, col: at.col || 1 });

    switch (stmt.type) {
        case 'ForeverStmt':
            if (!brkVar) { stmt.body = body; return [stmt]; }
            return [...pre, RU(brkEq, body)];
        case 'WhileStmt':
            if (!brkVar) { stmt.body = body; return [stmt]; }
            return [...pre, RU(BOP('or', NOT(stmt.cond, at), brkEq, at), body)];
        case 'RepeatUntilStmt':
            if (!brkVar) { stmt.body = body; return [stmt]; }
            return [...pre, RU(BOP('or', stmt.cond, brkEq, at), body)];
        case 'RepeatStmt': {
            // `continue` alone works with native repeat; `break` needs a counter.
            if (!brkVar) { stmt.body = body; return [stmt]; }
            const ctr = namer.fresh('rep');
            body = [...body, { type: 'ChangeVarStmt', varName: ctr, value: NUM(1, at), line: at.line || 1, col: at.col || 1 }];
            const exit = NOT(BOP('<', VAR(ctr, at), stmt.count, at), at);
            return [SET(ctr, NUM(0, at), at), ...pre, RU(BOP('or', exit, brkEq, at), body)];
        }
        case 'DoWhileStmt': {
            // Fused form: the condition re-eval stays outside the guards so
            // `continue` still re-tests the condition.
            const dw = namer.fresh('dowhile');
            const exitEq = BOP('=', VAR(dw, at), STR('false', at), at);
            body = [...body, SET(dw, stmt.cond, at)];
            return [SET(dw, STR('true', at), at), ...pre,
                    RU(brkVar ? BOP('or', exitEq, brkEq, at) : exitEq, body)];
        }
    }
    return null;
});

// match/switch  →  set [_.._match] to subject + if/elif equals-chain
registerStmtRewriter(function lowerMatch(stmt, namer, ctx) {
    if (stmt.type !== 'MatchStmt') return null;
    const tmp = namer.fresh('match');
    if (stmt.cases.length === 0) {
        return [SET(tmp, stmt.subject, stmt), ...(stmt.defaultBody || [])];
    }
    let alt = stmt.defaultBody; // null or plain stmt list
    for (let i = stmt.cases.length - 1; i >= 0; i--) {
        const c = stmt.cases[i];
        const cond = c.values
            .map(v => BOP('=', VAR(tmp, c), v, c))
            .reduce((a, b) => BOP('or', a, b, c));
        alt = [{ type: 'IfStmt', cond, then: c.body, alt, line: c.line || 1, col: c.col || 1 }];
    }
    return [SET(tmp, stmt.subject, stmt), ...alt];
});

// do { body } while cond  →  flag-driven repeat-until (cond re-checked at body end)
registerStmtRewriter(function lowerDoWhile(stmt, namer, ctx) {
    if (stmt.type !== 'DoWhileStmt') return null;
    const flag = namer.fresh('dowhile');
    return [
        SET(flag, STR('true', stmt), stmt),
        { type: 'RepeatUntilStmt',
          cond: BOP('=', VAR(flag, stmt), STR('false', stmt), stmt),
          body: [...stmt.body, SET(flag, stmt.cond, stmt)],
          line: stmt.line || 1, col: stmt.col || 1 },
    ];
});

// break/continue that reach here weren't consumed by a loop rewrite: they are
// outside any loop, or inside `for`/`pyfor` (not supported yet).
registerStmtRewriter(function lowerStrayBreakContinue(stmt, namer, ctx) {
    if (stmt.type !== 'BreakStmt' && stmt.type !== 'ContinueStmt') return null;
    const kw = stmt.type === 'BreakStmt' ? 'break' : 'continue';
    ctx.errors.push({ line: stmt.line || 1, col: stmt.col || 1, len: kw.length,
        message: `\`${kw}\` is only supported inside \`forever\`/\`repeat\`/\`while\`/\`until\`/\`do\` loops (not \`for\`/\`pyfor\`, and not outside a loop)` });
    return [];
});

// --- Core walk ----------------------------------------------------------------

function lowerStmtList(list, namer, ctx) {
    const result = [];
    for (let stmt of list) {
        // 1. statement rewriters (first match wins; output is re-processed)
        let rewritten = null;
        for (const rw of STMT_REWRITERS) {
            rewritten = rw(stmt, namer, ctx);
            if (rewritten) break;
        }
        if (rewritten) {
            result.push(...lowerStmtList(rewritten, namer, ctx));
            continue;
        }

        // 2. expression hoisting
        const pre = [];
        if (stmt.type === 'WhileStmt' || stmt.type === 'RepeatUntilStmt') {
            // Loop conditions are re-evaluated each iteration: hoist before the
            // loop AND repeat the hoisted statements at the end of the body
            // (loop rotation) so the temp is fresh for the next test.
            hoistStmtExprs(stmt, namer, ctx, pre);
            if (pre.length > 0) {
                stmt.body = [...stmt.body, ...structuredClone(pre)];
            }
        } else {
            hoistStmtExprs(stmt, namer, ctx, pre);
        }
        result.push(...pre);

        // 3. recurse into statement bodies
        for (const key of Object.keys(stmt)) {
            const v = stmt[key];
            if (isStmtList(v) && v.length > 0) stmt[key] = lowerStmtList(v, namer, ctx);
        }

        result.push(stmt);
    }
    return result;
}

// Lower a full program AST in place. Returns { ast, internalVars, errors }.
// internalVars are hidden variable names the compiler must create.
export function lowerAST(ast) {
    const namer = makeNamer();
    const defines = new Map();
    for (const block of ast.blocks || []) {
        if (block.type === 'DefineBlock') defines.set(block.name, { name: block.name, returns: !!block.returns });
    }
    const ctx = { defines, currentDefine: null, errors: [], retVars: new Set() };
    for (const block of ast.blocks || []) {
        if (TOP_LEVEL_BODIES.has(block.type) && Array.isArray(block.body)) {
            ctx.currentDefine = block.type === 'DefineBlock' ? defines.get(block.name) : null;
            block.body = lowerStmtList(block.body, namer, ctx);
        }
    }
    const internalVars = [...namer.created, ...ctx.retVars];
    ast._internalVars = internalVars;
    return { ast, internalVars, errors: ctx.errors };
}
