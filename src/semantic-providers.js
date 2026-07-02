import { LANG_ID } from "./constants.js";
import { getAnalysis, symbolAt, buildSemanticTokens } from "./analyzer.js";

// [S] Monaco-facing semantic providers: go-to-definition, rename, references,
// document highlight, and semantic tokens. All read from the shared cached
// analysis (one parse per edit — see analyzer.js getAnalysis).

const TOKEN_TYPES = ['parameter', 'variable', 'function', 'enumMember', 'type', 'property', 'invalid'];
const TOKEN_TYPE_IDX = Object.fromEntries(TOKEN_TYPES.map((t, i) => [t, i]));

// Kinds whose names live in the DSL source and are safe to text-rename.
// Project vars/lists live in the Scratch project — renaming the text alone
// would break compilation, so those are rejected with a message.
const RENAMEABLE = new Set(['define', 'routine', 'param', 'loopVar', 'enumMember', 'struct', 'structField']);

function occRange(monaco, occ) {
    return new monaco.Range(occ.line, occ.col, occ.endLine ?? occ.line, occ.endCol ?? occ.col + 1);
}

function occurrencesOf(analysis, symbol) {
    return analysis.occurrences.filter(o => o.symbol === symbol);
}

export function registerSemanticProviders(monaco, getSpriteName) {
    const sprite = () => (typeof getSpriteName === 'function' ? getSpriteName() : null);

    // --- Go to definition (F12 / Ctrl+click) ---
    monaco.languages.registerDefinitionProvider(LANG_ID, {
        provideDefinition(model, position) {
            const analysis = getAnalysis(model, sprite());
            const hit = symbolAt(analysis, position.lineNumber, position.column);
            if (!hit || !hit.symbol.defRange) return null;
            return { uri: model.uri, range: occRange(monaco, hit.symbol.defRange) };
        },
    });

    // --- Find all references (Shift+F12) ---
    monaco.languages.registerReferenceProvider(LANG_ID, {
        provideReferences(model, position) {
            const analysis = getAnalysis(model, sprite());
            const hit = symbolAt(analysis, position.lineNumber, position.column);
            if (!hit) return null;
            return occurrencesOf(analysis, hit.symbol)
                .map(o => ({ uri: model.uri, range: occRange(monaco, o) }));
        },
    });

    // --- Document highlight (cursor on a symbol lights up all its uses) ---
    monaco.languages.registerDocumentHighlightProvider(LANG_ID, {
        provideDocumentHighlights(model, position) {
            const analysis = getAnalysis(model, sprite());
            const hit = symbolAt(analysis, position.lineNumber, position.column);
            if (!hit) return null;
            return occurrencesOf(analysis, hit.symbol).map(o => ({
                range: occRange(monaco, o),
                kind: o.isDef
                    ? monaco.languages.DocumentHighlightKind.Write
                    : monaco.languages.DocumentHighlightKind.Read,
            }));
        },
    });

    // --- Rename (F2) ---
    monaco.languages.registerRenameProvider(LANG_ID, {
        resolveRenameLocation(model, position) {
            const analysis = getAnalysis(model, sprite());
            const hit = symbolAt(analysis, position.lineNumber, position.column);
            if (!hit) {
                return { rejectReason: 'Nothing renameable here — rename works on defines, scratchroutines, params, loop variables, enums, and structs.' };
            }
            const sym = hit.symbol;
            if (sym.kind === 'projectVar' || sym.kind === 'projectList') {
                return { rejectReason: `\`${sym.name}\` is a Scratch project ${sym.kind === 'projectList' ? 'list' : 'variable'} — rename it in the Scratch UI, not here (a text-only rename would break compilation).` };
            }
            if (!RENAMEABLE.has(sym.kind) || !sym.defRange) {
                return { rejectReason: `\`${sym.name}\` cannot be renamed here.` };
            }
            const displayName = sym.kind === 'structField' ? sym.meta.field : sym.name;
            return { range: occRange(monaco, hit.occurrence), text: displayName };
        },

        provideRenameEdits(model, position, newName) {
            const analysis = getAnalysis(model, sprite());
            const hit = symbolAt(analysis, position.lineNumber, position.column);
            if (!hit || !RENAMEABLE.has(hit.symbol.kind)) return null;
            const sym = hit.symbol;

            const bare = /^[A-Za-z_]\w*$/;
            if (!bare.test(newName)) {
                return { edits: [], rejectReason: `\`${newName}\` is not a valid name — use letters, digits, and underscores, starting with a letter or underscore.` };
            }

            // Collision check within the same namespace
            const collideKey = sym.kind === 'structField'
                ? 'structField:' + sym.meta.struct + '.' + newName
                : sym.kind + ':' + newName;
            if (analysis.byKey.has(collideKey)) {
                return { edits: [], rejectReason: `A ${sym.kind} named \`${newName}\` already exists.` };
            }

            const edits = [];
            for (const occ of occurrencesOf(analysis, sym)) {
                let text;
                if (sym.kind === 'structField') {
                    // def site is the bare field name inside the struct decl;
                    // refs are bracketed [Struct.field] variables
                    text = occ.isDef ? newName : `[${sym.meta.struct}.${newName}]`;
                } else {
                    text = occ.isBracketed ? `[${newName}]` : newName;
                }
                edits.push({
                    resource: model.uri,
                    versionId: model.getVersionId(),
                    textEdit: { range: occRange(monaco, occ), text },
                });
            }
            return { edits };
        },
    });

    // --- Semantic tokens (full document; no delta — files are small) ---
    monaco.languages.registerDocumentSemanticTokensProvider(LANG_ID, {
        getLegend() {
            return { tokenTypes: TOKEN_TYPES, tokenModifiers: [] };
        },
        provideDocumentSemanticTokens(model) {
            const analysis = getAnalysis(model, sprite());
            const toks = buildSemanticTokens(analysis);
            const data = [];
            let prevLine = 0, prevCol = 0; // 0-based
            for (const t of toks) {
                const line = t.line - 1, col = t.col - 1;
                const typeIdx = TOKEN_TYPE_IDX[t.tokenType];
                if (typeIdx === undefined || line < prevLine) continue;
                const deltaLine = line - prevLine;
                const deltaCol = deltaLine === 0 ? col - prevCol : col;
                if (deltaCol < 0) continue; // overlapping/misordered — skip defensively
                data.push(deltaLine, deltaCol, t.length, typeIdx, 0);
                prevLine = line; prevCol = col;
            }
            return { data: new Uint32Array(data), resultId: null };
        },
        releaseDocumentSemanticTokens() {},
    });
}
