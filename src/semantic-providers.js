import { LANG_ID } from "./constants.js";
import { getAnalysis, symbolAt, buildSemanticTokens } from "./analyzer.js";
import { fileForUri, ensureSpriteModel, openFile, currentVM, noteCrossSpriteRename, onInlayHintsChange } from "./editor.js";
import { projectAnalysis, updateSpriteSource, stableMessageCounts } from "./project-service.js";
import {
    projectSymbolAt, messageSites, variableSites, describeVariable, describeMessage, renameEdits, countsFor,
    isRoutineMessage, displayMessage, parseVarKey, STAGE,
} from "./project-analysis.js";
import { renameVariable, renameBroadcast, targetForSprite } from "./variables.js";
import { spriteLabel, plural } from "./ui-dom.js";
import { broadcastHintSites } from "./broadcast-hints.js";

const TOKEN_TYPES = ['parameter', 'variable', 'function', 'enumMember', 'type', 'property', 'invalid'];
const TOKEN_TYPE_IDX = Object.fromEntries(TOKEN_TYPES.map((t, i) => [t, i]));

const RENAMEABLE = new Set(['define', 'routine', 'param', 'loopVar', 'enumMember', 'struct', 'structField']);

function occRange(monaco, occ) {
    return new monaco.Range(occ.line, occ.col, occ.endLine ?? occ.line, occ.endCol ?? occ.col + 1);
}

function occurrencesOf(analysis, symbol) {
    return analysis.occurrences.filter(o => o.symbol === symbol);
}

const spriteOf = model => {
    const file = fileForUri(model.uri);
    return file?.kind === 'sprite' ? file.name : null;
};

function projectHit(model, position) {
    const sprite = spriteOf(model);
    if (!sprite) return null;
    updateSpriteSource(sprite, model.getValue(), getAnalysis(model, sprite));
    const linked = projectAnalysis();
    const hit = linked && projectSymbolAt(linked, sprite, position.lineNumber, position.column);
    if (!hit || hit.kind === 'message' && isRoutineMessage(hit.name)) return null;
    return { linked, sprite, hit };
}

function siteLocation(monaco, site) {
    const model = ensureSpriteModel(site.sprite);
    return model && { uri: model.uri, range: occRange(monaco, site.span) };
}

const listSprites = sites => [...new Set(sites.map(s => spriteLabel(s.sprite)))].join(', ');
const listNames = sprites => [...new Set(sprites.map(spriteLabel))].join(', ');

export function registerSemanticProviders(monaco) {
    const locations = sites => sites.map(site => siteLocation(monaco, site)).filter(Boolean);

    monaco.editor.registerEditorOpener({
        openCodeEditor(_source, resource, selectionOrPosition) {
            const file = fileForUri(resource);
            if (!file) return false;
            openFile(file);
            const editor = monaco.editor.getEditors()[0];
            if (selectionOrPosition && editor) {
                if (monaco.Range.isIRange(selectionOrPosition)) editor.setSelection(selectionOrPosition);
                else editor.setPosition(selectionOrPosition);
                editor.revealRangeInCenterIfOutsideViewport(editor.getSelection());
            }
            return true;
        },
    });

    monaco.languages.registerDefinitionProvider(LANG_ID, {
        provideDefinition(model, position) {
            const project = projectHit(model, position);
            if (project?.hit.kind === 'message') {
                const { senders, receivers } = messageSites(project.linked, project.hit.name);
                const isReceiver = receivers.some(r => r.sprite === project.sprite && r.span.line === project.hit.span.line && r.span.col === project.hit.span.col);
                return locations(isReceiver ? senders : receivers);
            }
            if (project?.hit.kind === 'variable') {
                return locations(variableSites(project.linked, project.hit.key).filter(s => s.access !== 'read'));
            }
            const analysis = getAnalysis(model, spriteOf(model));
            const hit = symbolAt(analysis, position.lineNumber, position.column);
            if (!hit || !hit.symbol.defRange) return null;
            return { uri: model.uri, range: occRange(monaco, hit.symbol.defRange) };
        },
    });

    monaco.languages.registerReferenceProvider(LANG_ID, {
        provideReferences(model, position) {
            const project = projectHit(model, position);
            if (project?.hit.kind === 'message') {
                const { senders, receivers } = messageSites(project.linked, project.hit.name);
                return locations([...receivers, ...senders]);
            }
            if (project?.hit.kind === 'variable') return locations(variableSites(project.linked, project.hit.key));
            const analysis = getAnalysis(model, spriteOf(model));
            const hit = symbolAt(analysis, position.lineNumber, position.column);
            if (!hit) return null;
            return occurrencesOf(analysis, hit.symbol).map(o => ({ uri: model.uri, range: occRange(monaco, o) }));
        },
    });

    monaco.languages.registerDocumentHighlightProvider(LANG_ID, {
        provideDocumentHighlights(model, position) {
            const kinds = monaco.languages.DocumentHighlightKind;
            const project = projectHit(model, position);
            if (project) {
                const sites = project.hit.kind === 'message'
                    ? [...messageSites(project.linked, project.hit.name).senders.map(s => ({ ...s, write: true })), ...messageSites(project.linked, project.hit.name).receivers]
                    : variableSites(project.linked, project.hit.key).map(s => ({ ...s, write: s.access !== 'read' }));
                return sites.filter(s => s.sprite === project.sprite)
                    .map(s => ({ range: occRange(monaco, s.span), kind: s.write ? kinds.Write : kinds.Read }));
            }
            const analysis = getAnalysis(model, spriteOf(model));
            const hit = symbolAt(analysis, position.lineNumber, position.column);
            if (!hit) return null;
            return occurrencesOf(analysis, hit.symbol).map(o => ({
                range: occRange(monaco, o),
                kind: o.isDef ? kinds.Write : kinds.Read,
            }));
        },
    });

    monaco.languages.registerHoverProvider(LANG_ID, {
        provideHover(model, position) {
            const project = projectHit(model, position);
            if (!project) return null;
            const range = occRange(monaco, project.hit.span);
            if (project.hit.kind === 'message') {
                const { senders, receivers } = describeMessage(project.linked, project.hit.name);
                return { range, contents: [
                    { value: `**"${displayMessage(project.hit.name)}"**` },
                    { value: [
                        receivers.length ? `Received by ${listSprites(receivers)} (${plural(receivers.length, 'script')})` : 'Nothing receives it',
                        senders.length ? `Sent from ${listSprites(senders)} (${plural(senders.length, 'place')})` : 'Nothing sends it',
                    ].join('  \n') },
                ] };
            }
            const { owner, kind, name } = parseVarKey(project.hit.key);
            const { writes, reads } = describeVariable(project.linked, project.hit.key);
            const scope = owner === STAGE ? 'for all sprites' : `only ${spriteLabel(owner)}`;
            return { range, contents: [
                { value: `**[${name}]** · ${kind === 'list' ? 'list' : 'variable'}, ${scope}` },
                { value: [`Written by ${writes ?? 'nobody'}`, `Read by ${reads ?? 'nobody'}`].join('  \n') },
            ] };
        },
    });

    monaco.languages.registerInlayHintsProvider(LANG_ID, {
        onDidChangeInlayHints: onInlayHintsChange,
        provideInlayHints(model, range) {
            const sprite = spriteOf(model);
            const counts = sprite && stableMessageCounts();
            if (!counts) return { hints: [], dispose() {} };
            const dynamicSend = projectAnalysis()?.dynamicSend;
            const sites = broadcastHintSites(getAnalysis(model, sprite).tokens, { lineCount: model.getLineCount(), startLine: range.startLineNumber, endLine: range.endLineNumber });
            const hints = sites.map(site => {
                const { senders, receivers } = countsFor(counts, site.msg);
                const position = { lineNumber: site.line, column: site.column };
                if (site.kind === 'send') {
                    return {
                        position, paddingLeft: true, label: receivers.length ? plural(receivers.length, 'listener') : 'no listeners',
                        tooltip: receivers.length ? `Received by ${listNames(receivers)}` : 'Nothing has an `on receive` for this message',
                    };
                }
                return {
                    position, paddingLeft: true, label: senders.length ? `sent from ${plural(senders.length, 'place')}` : 'never sent',
                    tooltip: senders.length ? `Sent from ${listNames(senders)}` : dynamicSend ? 'No literal broadcast sends it, but some broadcasts use computed names' : 'Nothing broadcasts this message',
                };
            });
            return { hints, dispose() {} };
        },
    });

    monaco.languages.registerRenameProvider(LANG_ID, {
        resolveRenameLocation(model, position) {
            const project = projectHit(model, position);
            if (project) {
                const text = project.hit.kind === 'message' ? displayMessage(project.hit.name) : parseVarKey(project.hit.key).name;
                return { range: occRange(monaco, project.hit.span), text };
            }
            const analysis = getAnalysis(model, spriteOf(model));
            const hit = symbolAt(analysis, position.lineNumber, position.column);
            if (!hit) {
                return { rejectReason: 'Nothing to rename here.' };
            }
            const sym = hit.symbol;
            if (!RENAMEABLE.has(sym.kind) || !sym.defRange) {
                return { rejectReason: `\`${sym.name}\` cannot be renamed here.` };
            }
            const displayName = sym.kind === 'structField' ? sym.meta.field : sym.name;
            return { range: occRange(monaco, hit.occurrence), text: displayName };
        },

        provideRenameEdits(model, position, newName) {
            const project = projectHit(model, position);
            if (project) return renameAcrossProject(monaco, project, newName);
            const analysis = getAnalysis(model, spriteOf(model));
            const hit = symbolAt(analysis, position.lineNumber, position.column);
            if (!hit || !RENAMEABLE.has(hit.symbol.kind)) return null;
            const sym = hit.symbol;

            const bare = /^[A-Za-z_]\w*$/;
            if (!bare.test(newName)) {
                return { edits: [], rejectReason: `\`${newName}\` is not a valid name — use letters, digits, and underscores, starting with a letter or underscore.` };
            }

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

    monaco.languages.registerDocumentSemanticTokensProvider(LANG_ID, {
        getLegend() {
            return { tokenTypes: TOKEN_TYPES, tokenModifiers: [] };
        },
        provideDocumentSemanticTokens(model) {
            const analysis = getAnalysis(model, spriteOf(model));
            const toks = buildSemanticTokens(analysis);
            const data = [];
            let prevLine = 0, prevCol = 0;
            for (const t of toks) {
                const line = t.line - 1, col = t.col - 1;
                const typeIdx = TOKEN_TYPE_IDX[t.tokenType];
                if (typeIdx === undefined || line < prevLine) continue;
                const deltaLine = line - prevLine;
                const deltaCol = deltaLine === 0 ? col - prevCol : col;
                if (deltaCol < 0) continue;
                data.push(deltaLine, deltaCol, t.length, typeIdx, 0);
                prevLine = line; prevCol = col;
            }
            return { data: new Uint32Array(data), resultId: null };
        },
        releaseDocumentSemanticTokens() {},
    });
}

function renameAcrossProject(monaco, { linked, hit }, rawName) {
    const newName = rawName.replace(/^\[|\]$/g, '').replace(/^"|"$/g, '');
    if (!newName.trim()) return { edits: [], rejectReason: 'The new name is empty.' };
    if (hit.kind === 'message') {
        if (currentVM) {
            const result = renameBroadcast(currentVM, displayMessage(hit.name), newName);
            if (result.error) return { edits: [], rejectReason: result.error };
        }
    } else {
        const { owner, name } = parseVarKey(hit.key);
        const variable = (owner === STAGE ? linked.index.globalVariables : linked.index.spriteVariables[owner] ?? [])
            .find(v => v.name === name && v.type === parseVarKey(hit.key).kind);
        const target = currentVM && targetForSprite(currentVM, owner);
        if (target && variable) {
            const result = renameVariable(currentVM, target.id, variable.id, newName);
            if (result.error) return { edits: [], rejectReason: result.error };
        }
    }
    const before = new Map();
    const edits = [];
    for (const [sprite, changes] of renameEdits(linked, hit, newName)) {
        const model = ensureSpriteModel(sprite);
        if (!model) continue;
        before.set(sprite, model.getValue());
        for (const change of changes) {
            edits.push({ resource: model.uri, versionId: model.getVersionId(), textEdit: { range: occRange(monaco, change.span), text: change.text } });
        }
    }
    noteCrossSpriteRename(before);
    return { edits };
}
