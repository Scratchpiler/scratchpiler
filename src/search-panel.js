import { monacoEditor, currentVM, activeFile, modelFor, replaceModelText, savedSpriteCode, writeSavedSpriteCode, allSpriteNames, openFile, fileKey, fileLabel, refreshSyncState, setView } from "./editor.js";
import { listHeaders, readHeader, writeHeader } from "./headers.js";
import { decompile } from "./decompiler.js";
import { escapeHtml, plural, toast, logToOutput } from "./ui-dom.js";

const $ = id => document.getElementById(id);
const REPLACE_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h11a4 4 0 0 1 0 8H8M8 15l3-3M8 15l3 3"/></svg>';
const options = { matchCase: false, wholeWord: false };
const decompiledSources = new Map();
let results = [];
let searchTimer = null;

const findInput = () => $('scratchpiler-search-input');
const replaceInput = () => $('scratchpiler-replace-input');

function buildMatcher(query = findInput().value) {
    if (!query) return null;
    const literal = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const body = options.wholeWord ? `(?<![\\w])${literal}(?![\\w])` : literal;
    return new RegExp(body, options.matchCase ? 'g' : 'gi');
}

function findMatches(text, re) {
    const hits = [];
    text.split('\n').forEach((lineText, i) => {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(lineText))) {
            hits.push({ line: i + 1, col: m.index + 1, len: m[0].length, lineText });
            if (!m[0].length) re.lastIndex++;
        }
    });
    return hits;
}

function searchableFiles() {
    const active = activeFile();
    const files = [...allSpriteNames().map(name => ({ kind: 'sprite', name })), ...listHeaders().map(name => ({ kind: 'header', name }))];
    if (!active) return files;
    return [active, ...files.filter(f => fileKey(f) !== fileKey(active))];
}

function readFile(file) {
    const model = modelFor(file);
    if (model) return model.getValue();
    if (file.kind === 'header') return readHeader(file.name) ?? '';
    const saved = savedSpriteCode(file.name);
    if (saved && saved.trim()) return saved;
    if (!currentVM) return '';
    if (!decompiledSources.has(file.name)) {
        try { decompiledSources.set(file.name, decompile(currentVM, file.name)); }
        catch (_) { decompiledSources.set(file.name, ''); }
    }
    return decompiledSources.get(file.name);
}

function writeFile(file, text) {
    const model = modelFor(file);
    if (model) { replaceModelText(model, text); return; }
    if (file.kind === 'header') writeHeader(file.name, text);
    else { writeSavedSpriteCode(file.name, text); decompiledSources.delete(file.name); }
}

function hitPreview(hit, replacement, showReplacement) {
    const indent = hit.lineText.length - hit.lineText.trimStart().length;
    const before = hit.lineText.slice(indent, hit.col - 1);
    const match = hit.lineText.slice(hit.col - 1, hit.col - 1 + hit.len);
    const after = hit.lineText.slice(hit.col - 1 + hit.len);
    const shownBefore = before.length > 24 ? '…' + before.slice(-24) : before;
    const middle = showReplacement ? `<del>${escapeHtml(match)}</del><ins>${escapeHtml(replacement)}</ins>` : `<mark>${escapeHtml(match)}</mark>`;
    return `<span>${escapeHtml(shownBefore)}${middle}${escapeHtml(after)}</span>`;
}

export function runSearch() {
    const re = buildMatcher();
    const replacement = replaceInput().value;
    const showReplacement = replacement !== '' || document.activeElement === replaceInput();
    results = re ? searchableFiles().map(file => ({ file, hits: findMatches(readFile(file), re) })).filter(r => r.hits.length) : [];
    const total = results.reduce((n, r) => n + r.hits.length, 0);

    const enabled = [options.matchCase && 'Match case', options.wholeWord && 'Whole word'].filter(Boolean);
    const hint = enabled.length ? `<span class="sp-hint">${enabled.join(' and ')} ${enabled.length > 1 ? 'are' : 'is'} on. Turning ${enabled.length > 1 ? 'them' : 'it'} off may find more.</span>` : '';
    $('sp-sr-summary').innerHTML = !re ? '' : total
        ? `${plural(total, 'result')} in ${plural(results.length, 'file')}`
        : `No results in any sprite or header.${hint}`;

    $('scratchpiler-search-results').innerHTML = results.map(({ file, hits }, fileIndex) =>
        `<div class="sp-sr-file">${escapeHtml(fileLabel(file))}<span class="sp-n">${hits.length}</span><span class="sp-grow"></span>
            <button class="sp-mini sp-rep" data-replace-file="${fileIndex}" title="Replace all in ${escapeHtml(fileLabel(file))}">${REPLACE_ICON}</button></div>` +
        hits.map((hit, hitIndex) => `<div class="sp-hit" data-file="${fileIndex}" data-hit="${hitIndex}"><span class="sp-l">${hit.line}</span>${hitPreview(hit, replacement, showReplacement)}
            <button class="sp-mini sp-rep" data-replace-one title="Replace this match">${REPLACE_ICON}</button></div>`).join('')
    ).join('');

    $('scratchpiler-replace-all-btn').disabled = total === 0;
    $('scratchpiler-replace-btn').disabled = total === 0;
}

function scheduleSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 120);
}

function selectMatch(file, line, col, len) {
    openFile(file);
    if (!monacoEditor) return;
    const range = { startLineNumber: line, startColumn: col, endLineNumber: line, endColumn: col + len };
    monacoEditor.setSelection(range);
    monacoEditor.revealRangeInCenter(range);
}

function matchAfterCursor() {
    const re = buildMatcher();
    if (!re) return null;
    const files = searchableFiles();
    const pos = monacoEditor?.getSelection()?.getEndPosition() ?? { lineNumber: 1, column: 1 };
    for (const [i, file] of files.entries()) {
        const hits = findMatches(readFile(file), re);
        const hit = i === 0
            ? hits.find(h => h.line > pos.lineNumber || (h.line === pos.lineNumber && h.col >= pos.column))
            : hits[0];
        if (hit) return { file, ...hit };
    }
    const wrapped = files.length ? findMatches(readFile(files[0]), re)[0] : null;
    return wrapped ? { file: files[0], ...wrapped } : null;
}

function findNext() {
    const next = matchAfterCursor();
    if (next) selectMatch(next.file, next.line, next.col, next.len);
}

function selectionIsExactMatch() {
    const model = monacoEditor?.getModel();
    const selection = monacoEditor?.getSelection();
    if (!model || !selection || selection.isEmpty()) return false;
    const text = model.getValueInRange(selection);
    const re = buildMatcher();
    if (!re) return false;
    const anchored = new RegExp(`^(?:${re.source})$`, re.flags.replace('g', ''));
    return anchored.test(text);
}

function replaceNext() {
    if (selectionIsExactMatch()) {
        const selection = monacoEditor.getSelection();
        monacoEditor.executeEdits('scratchpiler-replace', [{ range: selection, text: replaceInput().value, forceMoveMarkers: true }]);
        refreshSyncState();
    }
    findNext();
    runSearch();
}

function replaceHit(fileIndex, hitIndex) {
    const entry = results[fileIndex];
    const hit = entry?.hits[hitIndex];
    if (!hit) return;
    openFile(entry.file);
    const model = monacoEditor?.getModel();
    const lineText = model?.getLineContent(hit.line);
    const re = buildMatcher();
    if (!model || !re || !findMatches(lineText, re).some(h => h.col === hit.col && h.len === hit.len)) { runSearch(); return; }
    const range = { startLineNumber: hit.line, startColumn: hit.col, endLineNumber: hit.line, endColumn: hit.col + hit.len };
    monacoEditor.executeEdits('scratchpiler-replace', [{ range, text: replaceInput().value, forceMoveMarkers: true }]);
    monacoEditor.setPosition({ lineNumber: hit.line, column: hit.col + replaceInput().value.length });
    monacoEditor.revealLineInCenter(hit.line);
    refreshSyncState();
    runSearch();
}

function replaceAll(onlyFileIndex = null) {
    const re = buildMatcher();
    if (!re) return;
    const replacement = replaceInput().value;
    const targets = onlyFileIndex === null ? results.map(r => r.file) : [results[onlyFileIndex]?.file].filter(Boolean);
    const snapshots = [];
    let count = 0;
    for (const file of targets) {
        const before = readFile(file);
        let changed = 0;
        const after = before.replace(re, () => { changed++; return replacement; });
        if (!changed) continue;
        snapshots.push({ file, before });
        writeFile(file, after);
        count += changed;
    }
    if (!count) return;
    refreshSyncState();
    runSearch();
    const message = `Replaced ${plural(count, 'occurrence')} in ${plural(snapshots.length, 'file')}`;
    logToOutput(`${message}: ${snapshots.map(s => fileLabel(s.file)).join(', ')}`, 'info');
    toast(message, '', {
        label: 'Undo',
        run: () => {
            snapshots.forEach(({ file, before }) => writeFile(file, before));
            refreshSyncState();
            runSearch();
            toast('Replacement undone');
        },
    });
}

function setOption(id, on) {
    options[id === 'sp-opt-case' ? 'matchCase' : 'wholeWord'] = on;
    $(id).setAttribute('aria-pressed', String(on));
}

export function focusSearch() {
    decompiledSources.clear();
    const selection = monacoEditor?.getSelection();
    const selected = selection && !selection.isEmpty() && selection.startLineNumber === selection.endLineNumber
        ? monacoEditor.getModel().getValueInRange(selection) : '';
    if (selected) findInput().value = selected;
    runSearch();
    findInput().focus();
    findInput().select();
}

export function searchFor(text, { wholeWord = false } = {}) {
    setOption('sp-opt-word', wholeWord);
    findInput().value = text;
    setView('search');
    findInput().value = text;
    runSearch();
}

export function setupSearchPanel() {
    findInput().addEventListener('input', scheduleSearch);
    replaceInput().addEventListener('input', scheduleSearch);
    replaceInput().addEventListener('focus', runSearch);
    findInput().addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); findNext(); }
    });
    replaceInput().addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) replaceAll(); else replaceNext();
    });
    for (const id of ['sp-opt-case', 'sp-opt-word']) {
        $(id).addEventListener('click', () => { setOption(id, $(id).getAttribute('aria-pressed') !== 'true'); runSearch(); });
    }
    $('scratchpiler-replace-all-btn').addEventListener('click', () => replaceAll());
    $('scratchpiler-replace-btn').addEventListener('click', replaceNext);
    $('scratchpiler-search-results').addEventListener('click', e => {
        const fileBtn = e.target.closest('[data-replace-file]');
        if (fileBtn) { replaceAll(+fileBtn.dataset.replaceFile); return; }
        const hitEl = e.target.closest('.sp-hit');
        if (!hitEl) return;
        if (e.target.closest('[data-replace-one]')) { replaceHit(+hitEl.dataset.file, +hitEl.dataset.hit); return; }
        const { file, hits } = results[+hitEl.dataset.file];
        const hit = hits[+hitEl.dataset.hit];
        selectMatch(file, hit.line, hit.col, hit.len);
    });
}
