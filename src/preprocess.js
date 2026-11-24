// [P5] #include preprocessor.
//
// `#include <name.h>` splices a stored header (see headers.js) into the
// compilation. Headers may only contain top-level declarations (`define`,
// `scratchroutine`, `enum`, `struct`), which are order-independent — so
// instead of splicing inline (which would shift every following line number),
// the include line is blanked in place and the header text is appended after
// the user's source. User line numbers survive 1:1; only errors inside the
// appended region need remapping (onto the include line, prefixed
// `name.h:N:`). Duplicate includes are no-ops; cycles are errors.

import { readHeader, HEADER_NAME_RE } from './headers.js';
import { tokenize, parse, compileSource } from './compiler.js';

const INCLUDE_RE = /^\s*#include\s*<([^<>]+)>\s*$/;
const ALLOWED_TOP = new Set(['DefineBlock', 'ScratchroutineStmt', 'EnumDecl', 'StructDecl']);

// expand(src) → {
//   text            expanded source (user text + appended headers)
//   errors          include-level errors (missing header, bad content, cycle)
//   userLineCount   lines in the original source
//   segments        [{ header, includeLine, startLine, lineCount }] for the appended region
//   headerRoots     { defineOrRoutineName → header } for decompiler round-trip marking
//   includes        header names in first-include order
// }
export function expand(src, options = {}) {
    const getHeader = typeof options.readHeader === 'function' ? options.readHeader : readHeader;
    const errors = [];
    const segments = [];
    const headerRoots = {};
    const includeOrder = [];
    const seen = new Set();

    const userLines = String(src).split('\n');
    const userLineCount = userLines.length;
    const outUser = [];
    const queue = []; // { name, includeLine } — include line in the USER file (for error attribution)

    for (let i = 0; i < userLines.length; i++) {
        const m = INCLUDE_RE.exec(userLines[i]);
        if (!m) { outUser.push(userLines[i]); continue; }
        outUser.push(''); // keep line numbers stable
        queue.push({ name: m[1], includeLine: i + 1, stack: [] });
    }

    const appended = [];
    let appendedLines = 0;

    while (queue.length) {
        const { name, includeLine, stack } = queue.shift();
        if (!HEADER_NAME_RE.test(name)) {
            errors.push({ line: includeLine, col: 1, len: userLines[includeLine - 1]?.length || 8,
                code: 'INVALID_HEADER_NAME', headerName: name,
                message: `Invalid header name <${name}> — header names use letters/digits/_/- and end with .h` });
            continue;
        }
        if (seen.has(name)) continue; // duplicate include = no-op
        if (stack.includes(name)) {
            const cycle = [...stack, name];
            errors.push({ line: includeLine, col: 1, len: userLines[includeLine - 1]?.length || 8,
                code: 'INCLUDE_CYCLE', cycle,
                message: `Include cycle: ${cycle.join(' → ')}` });
            continue;
        }
        const content = getHeader(name);
        if (content === null || content === undefined) {
            errors.push({ line: includeLine, col: 1, len: userLines[includeLine - 1]?.length || 8,
                code: 'MISSING_HEADER', missingHeader: name,
                message: `Header not found: ${name} — create it in the Headers panel first` });
            continue;
        }
        seen.add(name);
        includeOrder.push(name);

        // Blank nested includes in the header body and queue them
        const hdrLines = String(content).split('\n');
        const hdrOut = [];
        for (let j = 0; j < hdrLines.length; j++) {
            const m = INCLUDE_RE.exec(hdrLines[j]);
            if (m) {
                hdrOut.push('');
                queue.push({ name: m[1], includeLine, stack: [...stack, name] });
            } else hdrOut.push(hdrLines[j]);
        }
        const hdrText = hdrOut.join('\n');

        // Validate the header: parses cleanly, only declaration blocks at top level
        const { ast, errors: parseErrors } = parse(tokenize(hdrText));
        if (parseErrors.length > 0) {
            for (const pe of parseErrors) {
                const hdrLine = pe.line || 1;
                const hdrCol = pe.col || 1;
                errors.push({ line: includeLine, col: 1, len: userLines[includeLine - 1]?.length || 8,
                    origin: { header: name, line: hdrLine, col: hdrCol, len: pe.len || 1, includeLine, rawMessage: pe.message },
                    message: `${name}:${hdrLine}:${hdrCol}: ${pe.message}` });
            }
            continue;
        }
        let bad = false;
        for (const block of ast.blocks || []) {
            if (!ALLOWED_TOP.has(block.type)) {
                const hdrLine = block.line || 1;
                const hdrCol = block.col || 1;
                const rawMessage = 'headers may only contain `define`, `scratchroutine`, `enum` and `struct` declarations';
                errors.push({ line: includeLine, col: 1, len: userLines[includeLine - 1]?.length || 8,
                    origin: { header: name, line: hdrLine, col: hdrCol, len: 1, includeLine, rawMessage },
                    message: `${name}:${hdrLine}: ${rawMessage}` });
                bad = true;
            }
        }
        if (bad) continue;

        for (const block of ast.blocks || []) {
            if (block.type === 'DefineBlock' || block.type === 'ScratchroutineStmt') {
                headerRoots[block.name] = name;
            }
        }

        segments.push({ header: name, includeLine,
            startLine: userLineCount + 1 + appendedLines, lineCount: hdrOut.length });
        appended.push(hdrText);
        appendedLines += hdrOut.length;
    }

    const text = appended.length ? outUser.join('\n') + '\n' + appended.join('\n') : outUser.join('\n');
    return { text, errors, userLineCount, segments, headerRoots, includes: includeOrder };
}

// Map an error whose line refers to the EXPANDED text back onto the user file.
export function mapExpandedError(ex, err) {
    if (!err || typeof err.line !== 'number' || err.line <= ex.userLineCount) return err;
    for (const seg of ex.segments) {
        if (err.line >= seg.startLine && err.line < seg.startLine + seg.lineCount) {
            const hdrLine = err.line - seg.startLine + 1;
            return { ...err, line: seg.includeLine, col: 1, len: 200,
                origin: { header: seg.header, line: hdrLine, col: err.col || 1, len: err.len || 1, includeLine: seg.includeLine, rawMessage: err.message },
                message: `${seg.header}:${hdrLine}:${err.col}: ${err.message}` };
        }
    }
    return { ...err, line: ex.userLineCount, col: 1 };
}

// compileSource with #include expansion. Drop-in superset of compileSource:
// returns { blocks, errors, headerRoots } where headerRoots maps define /
// scratchroutine names that came from headers to their header file name.
export function compileSourceWithHeaders(source, vm, spriteName, options = {}) {
    const ex = expand(source, { readHeader: options.readHeader });
    if (ex.errors.length > 0) return { blocks: {}, comments: [], errors: ex.errors, headerRoots: {} };
    const r = compileSource(ex.text, vm, spriteName, { ...options, embedUntilLine: ex.userLineCount });
    return { blocks: r.blocks, comments: r.comments ?? [], optimizerFallback: r.optimizerFallback ?? null, usedProjectFacts: !!r.usedProjectFacts, errors: r.errors.map(e => mapExpandedError(ex, e)), headerRoots: ex.headerRoots };
}
