import path from 'node:path';
import { tokenize } from '../compiler.js';

const STAGE = '__stage__';

export function useColor(colorOpt = 'auto', stream = process.stderr) {
    if (colorOpt === true || colorOpt === 'always') return true;
    if (colorOpt === false || colorOpt === 'never') return false;
    if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== '0') return true;
    if (process.env.NO_COLOR !== undefined) return false;
    if (process.env.TERM === 'dumb') return false;
    return Boolean(stream && stream.isTTY);
}

function ansi(enabled) {
    const wrap = (open, close = '\x1b[0m') => (s) => (enabled ? `${open}${s}${close}` : String(s));
    return {
        bold: wrap('\x1b[1m'),
        dim: wrap('\x1b[2m'),
        redBold: wrap('\x1b[1;31m'),
        yellowBold: wrap('\x1b[1;33m'),
        cyanBold: wrap('\x1b[1;36m'),
        blueBold: wrap('\x1b[1;34m'),
        greenBold: wrap('\x1b[1;32m'),
        magentaBold: wrap('\x1b[1;35m'),
    };
}

function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const prev = new Array(n + 1);
    const curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
        curr[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        for (let j = 0; j <= n; j++) prev[j] = curr[j];
    }
    return prev[n];
}

export function closestMatches(target, candidates, { max = 3, maxDist } = {}) {
    const q = String(target || '');
    const ql = q.toLowerCase();
    if (!ql) return [];
    const limit = maxDist ?? Math.max(2, Math.floor(ql.length / 2));
    const scored = [];
    const seen = new Set();
    for (const raw of candidates) {
        const cand = String(raw);
        if (!cand || seen.has(cand)) continue;
        seen.add(cand);
        const cl = cand.toLowerCase();
        if (cl === ql) continue;
        const dist = levenshtein(ql, cl);
        const prefix = cl.startsWith(ql) || ql.startsWith(cl);
        const sub = cl.includes(ql) || (ql.length >= 3 && ql.includes(cl));
        if (dist <= limit || prefix || sub) {
            const score = (prefix ? -2 : 0) + (sub ? -1 : 0) + dist;
            scored.push({ cand, score, dist });
        }
    }
    scored.sort((a, b) => a.score - b.score || a.dist - b.dist || a.cand.localeCompare(b.cand));
    return scored.slice(0, max).map((s) => s.cand);
}

function formatSuggestionList(items, wrap = (s) => `\`${s}\``) {
    if (items.length === 1) return wrap(items[0]);
    if (items.length === 2) return `${wrap(items[0])} or ${wrap(items[1])}`;
    return `${items.slice(0, -1).map(wrap).join(', ')}, or ${wrap(items[items.length - 1])}`;
}

export function findUnclosedBrace(source) {
    if (!source) return null;
    let tokens;
    try {
        tokens = tokenize(source);
    } catch {
        return null;
    }
    const stack = [];
    for (const t of tokens) {
        if (t.value === '{' && !t.type?.includes?.('STR')) {
            stack.push(t);
        } else if (t.value === '}' && !t.type?.includes?.('STR')) {
            stack.pop();
        }
    }
    return stack.length ? stack[stack.length - 1] : null;
}

function indexLookup(index, spriteName) {
    const stageScalars = new Set();
    const stageLists = new Set();
    for (const v of index?.globalVariables || []) {
        (v.type === 'list' ? stageLists : stageScalars).add(v.name);
    }
    const spriteScalars = new Set();
    const spriteLists = new Set();
    if (spriteName && spriteName !== STAGE) {
        for (const v of index?.spriteVariables?.[spriteName] || []) {
            (v.type === 'list' ? spriteLists : spriteScalars).add(v.name);
        }
    }
    const otherLocalScalars = new Map();
    const otherLocalLists = new Map();
    for (const [sp, vars] of Object.entries(index?.spriteVariables || {})) {
        if (sp === spriteName) continue;
        for (const v of vars || []) {
            const targetMap = v.type === 'list' ? otherLocalLists : otherLocalScalars;
            if (!targetMap.has(v.name)) targetMap.set(v.name, []);
            targetMap.get(v.name).push(sp);
        }
    }
    return { stageScalars, stageLists, spriteScalars, spriteLists, otherLocalScalars, otherLocalLists };
}

function spriteDisplay(spriteName) {
    return spriteName === STAGE ? 'Stage' : spriteName;
}

function describeVarScope(name, lookup, spriteName) {
    if (lookup.spriteScalars.has(name) || lookup.spriteLists.has(name)) return spriteDisplay(spriteName);
    if (lookup.stageScalars.has(name) || lookup.stageLists.has(name)) return 'Stage';
    return null;
}

function enrichMissingVariable(name, ctx, diag) {
    diag.code = 'E0101';
    const { index, spriteName } = ctx;
    const lookup = indexLookup(index, spriteName);
    const labelTarget = spriteName === STAGE ? 'Stage' : `"${spriteName}" or Stage`;
    diag.label = `not found on ${labelTarget}`;

    if (lookup.spriteLists.has(name) || lookup.stageLists.has(name)) {
        const scope = lookup.spriteLists.has(name) ? spriteDisplay(spriteName) : 'Stage';
        diag.notes.push({
            kind: 'help',
            message: `\`[${name}]\` is a list (${scope}), not a scalar variable — use list functions or \`[${name}].item(i)\``,
        });
        return;
    }

    const onOther = lookup.otherLocalScalars.get(name);
    if (onOther?.length) {
        const other = onOther[0];
        diag.notes.push({
            kind: 'note',
            message: `\`[${name}]\` exists as a sprite-local variable on "${other}", not on ${labelTarget}`,
        });
        diag.notes.push({
            kind: 'help',
            message: `make \`${name}\` a Stage (global) variable, or read it via \`attributeOf("${name}", "${other}")\``,
        });
        return;
    }

    const visibleScalars = [...lookup.spriteScalars, ...lookup.stageScalars];
    const suggestions = closestMatches(name, visibleScalars);
    if (suggestions.length) {
        const annotated = suggestions.map((s) => {
            const sc = describeVarScope(s, lookup, spriteName);
            return sc ? `\`[${s}]\` (${sc})` : `\`[${s}]\``;
        });
        diag.notes.push({
            kind: 'help',
            message: `did you mean ${annotated.join(', ')}?`,
        });
    } else if (!ctx.hasIndex) {
        diag.notes.push({
            kind: 'note',
            message: 'no base .sb3 or project.json was found to resolve Scratch variables',
        });
    } else {
        diag.notes.push({
            kind: 'note',
            message: 'Scratch variables must exist in the base .sb3 / project.json (or be declared with `struct`)',
        });
    }
}

function enrichMissingList(name, ctx, diag) {
    diag.code = 'E0102';
    diag.message = `List not found: \`[${name}]\``;
    const { index, spriteName } = ctx;
    const lookup = indexLookup(index, spriteName);
    const labelTarget = spriteName === STAGE ? 'Stage' : `"${spriteName}" or Stage`;
    diag.label = `list not found on ${labelTarget}`;

    if (lookup.spriteScalars.has(name) || lookup.stageScalars.has(name)) {
        diag.notes.push({
            kind: 'help',
            message: `\`[${name}]\` is a scalar variable, not a list`,
        });
        return;
    }

    const onOther = lookup.otherLocalLists.get(name);
    if (onOther?.length) {
        diag.notes.push({
            kind: 'note',
            message: `\`[${name}]\` is a sprite-local list on "${onOther[0]}"`,
        });
        return;
    }

    const visibleLists = [...lookup.spriteLists, ...lookup.stageLists];
    const suggestions = closestMatches(name, visibleLists);
    if (suggestions.length) {
        diag.notes.push({
            kind: 'help',
            message: `did you mean ${formatSuggestionList(suggestions, (s) => `\`[${s}]\``)}?`,
        });
    } else {
        diag.notes.push({
            kind: 'note',
            message: 'Scratch lists must exist in the base .sb3 / project.json',
        });
    }
}

export function enrichDiagnostic(raw, ctx = {}) {
    const fileSources = ctx.fileSources;
    let file = ctx.filePath || null;
    let line = raw.line ?? null;
    let col = raw.col ?? null;
    let len = Math.max(raw.len || 1, 1);
    let message = raw.message || String(raw);
    const notes = Array.isArray(raw.notes) ? [...raw.notes] : [];

    // Promote header-originated errors to the actual header file and add include-site span.
    if (raw.origin) {
        const hdrPath = ctx.headerPaths?.get(raw.origin.header) || raw.origin.header;
        const spriteFile = ctx.filePath;
        const includeLine = raw.origin.includeLine || line;
        file = hdrPath;
        line = raw.origin.line || 1;
        col = raw.origin.col || 1;
        len = Math.max(raw.origin.len || 1, 1);
        message = raw.origin.rawMessage || message;
        if (spriteFile && includeLine) {
            notes.push({
                kind: 'span',
                message: `included from ${spriteDisplay(ctx.spriteName || '') || path.basename(spriteFile)}`,
                file: spriteFile,
                line: includeLine,
                col: 1,
                len: (fileSources?.get(spriteFile)?.split('\n')[includeLine - 1] || '').length || 8,
            });
        }
    }

    const diag = {
        severity: raw.severity || 'error',
        code: raw.code || defaultCodeFor(raw),
        category: raw.category || 'Compile',
        message,
        file,
        line,
        col,
        len,
        label: raw.label || null,
        notes,
        _dedupKey: null,
    };

    const activeSource = file ? fileSources?.get(file) : ctx.source;

    // 1. Missing header
    if (raw.code === 'MISSING_HEADER' && raw.missingHeader) {
        diag.code = 'E0201';
        diag.category = 'Include';
        diag.message = `Header not found: \`<${raw.missingHeader}>\``;
        diag.label = 'missing header';
        const available = [...(ctx.headerPaths?.keys() || [])];
        const matches = closestMatches(raw.missingHeader, available);
        if (matches.length) {
            diag.notes.push({ kind: 'help', message: `did you mean \`#include <${matches[0]}>\`?` });
        }
        if (ctx.headerSearchDirs?.length) {
            diag.notes.push({
                kind: 'note',
                message: `searched in: ${ctx.headerSearchDirs.map((d) => ctx.relPath ? ctx.relPath(d) : d).join(', ')}`,
            });
        }
        return diag;
    }

    if (raw.code === 'INCLUDE_CYCLE') {
        diag.code = 'E0202';
        diag.category = 'Include';
        diag.label = 'circular #include';
        return diag;
    }

    if (raw.code === 'INVALID_HEADER_NAME') {
        diag.code = 'E0203';
        diag.category = 'Include';
        diag.label = 'invalid header name';
        return diag;
    }

    // 2. Missing variable / list
    let m;
    if ((m = /^Variable not found:\s*(.+)$/.exec(message)) || (m = /^`\[([^\]]+)\]` doesn't exist in Scratch$/.exec(message))) {
        const name = m[1].trim();
        diag._dedupKey = `missing-var:${file}:${line}:${name}`;
        enrichMissingVariable(name, ctx, diag);
        return diag;
    }

    if (
        (m = /^List not found:\s*([^.\n]+)/.exec(message)) ||
        (m = /^`\[([^\]]+)\]` isn't a list in Scratch$/.exec(message)) ||
        (m = /^`pyfor` requires a list — \[([^\]]+)\] is not found/.exec(message))
    ) {
        const name = m[1].trim();
        diag._dedupKey = `missing-list:${file}:${line}:${name}`;
        enrichMissingList(name, ctx, diag);
        return diag;
    }

    // 3. Unknown bare reporter (likely forgot [brackets])
    if ((m = /^Unknown name `([^`]+)`/.exec(message))) {
        const name = m[1];
        diag.code = diag.severity === 'error' ? 'E0103' : 'W0101';
        const lookup = indexLookup(ctx.index, ctx.spriteName);
        if (lookup.spriteScalars.has(name) || lookup.stageScalars.has(name) || lookup.spriteLists.has(name) || lookup.stageLists.has(name)) {
            diag.label = 'missing brackets around variable';
            diag.notes.push({
                kind: 'help',
                message: `Scratch variables need brackets: write \`[${name}]\` instead of \`${name}\``,
            });
        }
        return diag;
    }

    // 4. Unknown block / custom block / function -> check other sprites' defines
    if ((m = /^Unknown (?:block|custom block|function) `([^`]+)`|^Custom block not found:\s*(.+)$/.exec(message))) {
        const name = (m[1] || m[2] || '').trim();
        diag.code = diag.severity === 'error' ? 'E0104' : 'W0102';
        diag._dedupKey = `unknown-call:${file}:${line}:${col}:${name}`;
        const otherSprites = ctx.allSpriteDefines?.get(name)?.filter((s) => s !== ctx.spriteName) || [];
        if (otherSprites.length) {
            diag.notes.push({
                kind: 'note',
                message: `\`${name}\` is defined in sprite ${otherSprites.map((s) => `"${spriteDisplay(s)}"`).join(', ')}, and custom blocks are sprite-local in Scratch`,
            });
            diag.notes.push({
                kind: 'help',
                message: `move \`define ${name}(...)\` into a shared header file (e.g. \`headers/common.h\`) and \`#include\` it`,
            });
        }
        return diag;
    }

    // 5. Arity mismatch / missing returns -> point to definition span
    if ((m = /^`([^`]+)` takes (\d+) arguments?, got (\d+)$/.exec(message))) {
        const name = m[1];
        diag.code = diag.severity === 'error' ? 'E0105' : 'W0103';
        const sym = ctx.analysis?.byKey?.get(`define:${name}`) || ctx.analysis?.byKey?.get(`routine:${name}`);
        if (sym?.defRange && !sym.headerOrigin && file) {
            diag.notes.push({
                kind: 'span',
                message: `\`${name}\` defined here with ${m[2]} parameter${m[2] === '1' ? '' : 's'}`,
                file,
                line: sym.defRange.line,
                col: sym.defRange.col,
                len: name.length,
            });
        }
        return diag;
    }

    if ((m = /^`([^`]+)` doesn't return a value — add `returns` to its define$/.exec(message))) {
        const name = m[1];
        diag.code = diag.severity === 'error' ? 'E0106' : 'W0104';
        const sym = ctx.analysis?.byKey?.get(`define:${name}`);
        if (sym?.defRange && !sym.headerOrigin && file) {
            diag.notes.push({
                kind: 'span',
                message: `\`${name}\` declared here without \`returns\``,
                file,
                line: sym.defRange.line,
                col: sym.defRange.col,
                len: name.length,
            });
        }
        diag.notes.push({ kind: 'help', message: `add \`returns\`: \`define ${name}(...) returns { ... }\`` });
        return diag;
    }

    // 6. Parse errors: unclosed braces / hat syntax
    if (diag.category === 'Parse') {
        diag.code = 'E0001';
        if ((message.includes('expected `}`') || message.includes('got end of file')) && activeSource && file) {
            const unclosed = findUnclosedBrace(activeSource);
            if (unclosed && unclosed.line !== line) {
                notes.push({
                    kind: 'span',
                    message: 'unclosed `{` opened here',
                    file,
                    line: unclosed.line,
                    col: unclosed.col,
                    len: 1,
                });
            }
        }
        if (/^`on <event>`|Unknown `on` event/.test(message)) {
            diag.code = 'E0002';
            diag.notes.push({
                kind: 'help',
                message: 'valid hat events: `flag`, `click`, `clone`, `key "<k>"`, `receive "<msg>"`, `backdrop "<name>"`, `timer > <n>`, `loudness > <n>`',
            });
        }
        return diag;
    }

    // 7. SLVM / backend errors
    if (message.startsWith('SLVM:')) {
        diag.code = 'E0301';
        diag.category = 'SLVM';
        diag.message = message.slice(5).trim();
        if (/loop condition/i.test(diag.message)) {
            diag.notes.push({
                kind: 'help',
                message: 'evaluate the expression into a variable before the loop and update it at the end of the loop body',
            });
        } else if (/recursion/i.test(diag.message)) {
            diag.notes.push({
                kind: 'help',
                message: 'save intermediate subexpressions into a variable before the recursive call',
            });
        } else if (/opcode/i.test(diag.message)) {
            diag.notes.push({
                kind: 'help',
                message: 'if using a custom/extension opcode, use `__asm__ volatile unsafe(...)`',
            });
        }
        return diag;
    }

    // 8. Cross-sprite project warnings
    if (diag.category === 'Project' && ctx.linked) {
        if ((m = /^Nothing receives "([^"]+)"$/.exec(message))) {
            diag.code = 'W0301';
            const targetMsg = m[1];
            const receivers = [...ctx.linked.messages.values()]
                .filter((msg) => msg.receivers.length > 0 && !msg.name.startsWith('__sroutine_'))
                .map((msg) => msg.name);
            const matches = closestMatches(targetMsg, receivers);
            if (matches.length) {
                diag.notes.push({ kind: 'help', message: `did you mean ${formatSuggestionList(matches, (s) => `"${s}"`)}?` });
            } else {
                diag.notes.push({ kind: 'help', message: `add an \`on receive "${targetMsg}" { ... }\` handler in a sprite or Stage` });
            }
            return diag;
        }
        if ((m = /^Never runs — nothing broadcasts "([^"]+)"$/.exec(message))) {
            diag.code = 'W0302';
            const targetMsg = m[1];
            const senders = [...ctx.linked.messages.values()]
                .filter((msg) => msg.senders.length > 0 && !msg.name.startsWith('__sroutine_'))
                .map((msg) => msg.name);
            const matches = closestMatches(targetMsg, senders);
            if (matches.length) {
                diag.notes.push({ kind: 'help', message: `did you mean ${formatSuggestionList(matches, (s) => `"${s}"`)}?` });
            }
            return diag;
        }
        if ((m = /^No sprite named "([^"]+)"$/.exec(message))) {
            diag.code = 'W0303';
            const sprites = (ctx.index?.sprites || []).map((s) => s.name);
            const matches = closestMatches(m[1], sprites);
            if (matches.length) {
                diag.notes.push({ kind: 'help', message: `did you mean ${formatSuggestionList(matches, (s) => `"${s}"`)}?` });
            } else if (sprites.length) {
                diag.notes.push({ kind: 'note', message: `available sprites: ${sprites.map((s) => `"${s}"`).join(', ')}` });
            }
            return diag;
        }
        if (/^May read `\[/.test(message)) {
            diag.code = 'W0304';
            diag.notes.push({
                kind: 'help',
                message: 'initialize shared state in one `on flag` script, then `broadcast("start")` so dependent scripts run in deterministic order',
            });
            return diag;
        }
    }

    return diag;
}

function defaultCodeFor(raw) {
    const cat = raw.category || '';
    if (cat === 'Parse') return 'E0001';
    if (cat === 'Type') return 'E0110';
    if (cat === 'Semantic') return raw.severity === 'warning' ? 'W0100' : 'E0100';
    if (cat === 'Unreachable') return 'W0201';
    if (cat === 'Orphaned') return 'W0202';
    if (cat === 'Project') return raw.severity === 'info' ? 'I0300' : 'W0300';
    if (cat === 'Smell') return 'W0400';
    return raw.severity === 'error' ? 'E0199' : raw.severity === 'warning' ? 'W0199' : 'I0199';
}

const SEVERITY_RANK = { error: 3, warning: 2, info: 1 };

export function deduplicateDiagnostics(diagnostics) {
    const out = [];
    const byKey = new Map();
    for (const d of diagnostics) {
        const key = d._dedupKey || `${d.file || ''}:${d.line ?? ''}:${d.col ?? ''}:${d.message}`;
        const existing = byKey.get(key);
        if (!existing) {
            byKey.set(key, d);
            out.push(d);
            continue;
        }
        if ((SEVERITY_RANK[d.severity] || 0) > (SEVERITY_RANK[existing.severity] || 0)) {
            existing.severity = d.severity;
            existing.code = d.code;
            existing.category = d.category;
            existing.message = d.message;
            existing.label = existing.label || d.label;
            // Keep the more specific token column (e.g. `[var]` from analyzer vs `set` from irgen)
            if ((d.col ?? 0) > (existing.col ?? 0) && d.len >= existing.len) {
                existing.col = d.col;
                existing.len = d.len;
            }
        }
        for (const n of d.notes || []) {
            if (!existing.notes.some((en) => en.kind === n.kind && en.message === n.message && en.file === n.file && en.line === n.line)) {
                existing.notes.push(n);
            }
        }
    }
    return out;
}

function renderSpanSnippet(c, fileSources, { file, line, col, len = 1, label = null, colorFn, arrow = '-->' }) {
    const out = [];
    const loc = line != null ? `${file}:${line}:${col ?? 1}` : file;
    const source = file ? fileSources?.get(file) : null;
    if (!source || line == null) {
        if (file) out.push(`  ${c.blueBold(arrow)} ${c.bold(loc)}`);
        return out;
    }

    const lines = source.split('\n');
    const idx = Math.max(0, Math.min(line - 1, lines.length - 1));
    const lineText = lines[idx] ?? '';
    const hasPrev = idx > 0 && lines[idx - 1].trim().length > 0;
    const maxLineNum = line;
    const gutterWidth = Math.max(String(maxLineNum).length, 2);
    const pad = (n) => (n == null ? ' '.repeat(gutterWidth) : String(n).padStart(gutterWidth, ' '));

    // Expand tabs so carets align with rendered spaces
    const expandTabs = (s) => s.replace(/\t/g, '    ');
    const visualOffset = (rawLine, oneBasedCol) => {
        const prefix = rawLine.slice(0, Math.max(0, (oneBasedCol || 1) - 1));
        return expandTabs(prefix).length;
    };
    const visualLen = (rawLine, oneBasedCol, rawLen) => {
        const start = Math.max(0, (oneBasedCol || 1) - 1);
        const slice = rawLine.slice(start, start + Math.max(rawLen || 1, 1));
        return Math.max(expandTabs(slice).length, 1);
    };

    out.push(`  ${c.blueBold(arrow)} ${c.bold(loc)}`);
    out.push(`${' '.repeat(gutterWidth + 1)}${c.blueBold('|')}`);
    if (hasPrev) {
        out.push(`${c.dim(pad(line - 1))} ${c.blueBold('|')} ${c.dim(expandTabs(lines[idx - 1]))}`);
    }
    out.push(`${c.blueBold(pad(line))} ${c.blueBold('|')} ${expandTabs(lineText)}`);

    const vCol = visualOffset(lineText, col);
    const maxUnderline = Math.max(1, expandTabs(lineText).length - vCol + 1);
    const caretWidth = Math.min(visualLen(lineText, col, len), Math.max(maxUnderline, 1));
    const carets = '^'.repeat(caretWidth);
    const suffix = label ? ` ${label}` : '';
    out.push(`${' '.repeat(gutterWidth + 1)}${c.blueBold('|')} ${' '.repeat(vCol)}${colorFn(carets + suffix)}`);
    return out;
}

export function formatDiagnosticPretty(diag, fileSources, { color = false } = {}) {
    const c = ansi(color);
    const sevStyle = diag.severity === 'error' ? c.redBold : diag.severity === 'warning' ? c.yellowBold : c.cyanBold;
    const sevWord = diag.severity;
    const header = `${sevStyle(`${sevWord}[${diag.code}]`)}${c.bold(`: ${diag.message}`)}`;
    const lines = [header];

    if (diag.file) {
        lines.push(...renderSpanSnippet(c, fileSources, {
            file: diag.file,
            line: diag.line,
            col: diag.col,
            len: diag.len,
            label: diag.label,
            colorFn: sevStyle,
            arrow: '-->',
        }));
    }

    for (const note of diag.notes || []) {
        if (note.kind === 'span' && note.file) {
            const localSources = note.source ? new Map(fileSources).set(note.file, note.source) : fileSources;
            lines.push(...renderSpanSnippet(c, localSources, {
                file: note.file,
                line: note.line,
                col: note.col,
                len: note.len || 1,
                label: note.message,
                colorFn: c.cyanBold,
                arrow: ':::',
            }));
        } else {
            const tag = note.kind === 'help' ? c.greenBold('help') : c.cyanBold('note');
            lines.push(`   ${c.blueBold('=')} ${tag}: ${note.message}`);
        }
    }

    return lines.join('\n');
}

export function formatDiagnostics(diagnostics, fileSources, { format = 'pretty', color = 'auto' } = {}) {
    const counts = {
        errors: diagnostics.filter((d) => d.severity === 'error').length,
        warnings: diagnostics.filter((d) => d.severity === 'warning').length,
        info: diagnostics.filter((d) => d.severity === 'info').length,
    };

    if (format === 'json') {
        const clean = diagnostics.map(({ _dedupKey, ...rest }) => rest);
        return JSON.stringify({ ok: counts.errors === 0, ...counts, diagnostics: clean }, null, 2) + '\n';
    }

    if (format === 'compact') {
        return diagnostics
            .map((d) => {
                const loc = d.file ? `${d.file}:${d.line ?? 1}:${d.col ?? 1}: ` : '';
                return `${loc}${d.severity}[${d.code}]: ${d.message}`;
            })
            .join('\n') + (diagnostics.length ? '\n' : '');
    }

    const colorOn = useColor(color);
    const c = ansi(colorOn);
    const blocks = diagnostics.map((d) => formatDiagnosticPretty(d, fileSources, { color: colorOn }));
    const summaryParts = [];
    if (counts.errors) summaryParts.push(c.redBold(`${counts.errors} error${counts.errors === 1 ? '' : 's'}`));
    if (counts.warnings) summaryParts.push(c.yellowBold(`${counts.warnings} warning${counts.warnings === 1 ? '' : 's'}`));
    if (counts.info) summaryParts.push(c.cyanBold(`${counts.info} note${counts.info === 1 ? '' : 's'}`));
    if (summaryParts.length) {
        blocks.push(summaryParts.join(', '));
    }
    return blocks.join('\n\n') + (blocks.length ? '\n' : '');
}
