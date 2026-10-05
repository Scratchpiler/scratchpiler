import { loadSettings } from './settings.js';
import { LANG_ID, LS_KEY, LS_INJ_KEY } from "./constants.js";
import { injectedBlockIds } from "./inject-state.js";
import { acquireVM, scratchIndex, reindex } from "./vm.js";
import { loadMonaco } from "./monaco.js";
import { registerLanguage } from "./language.js";
import {
    buildOverlayDOM, buildTriggerButton, buildSearchNowhereDOM, searchNowhereOpen, openSearchNowhere, closeSearchNowhere,
    logToOutput, flashCompileBtn, toast, setStatusMessage, showMenu, showMenuBelow, closeMenu, isMenuOpen, setupMenu,
    openScrim, closeScrims, isScrimOpen, setupScrims, setBottomPanel, isBottomOpen, setupBottomPanel, setupSidebarResize,
    escapeHtml, plural, spriteLabel,
} from "./ui-dom.js";
import { lint, typeCheckDiagnostics } from "./compiler.js";
import { compileSourceWithHeaders, expand } from "./preprocess.js";
import { readHeader, writeHeader } from "./headers.js";
import { decompileAsync } from "./decompiler.js";
import { injectBlocks } from "./injector.js";
import { getAnalysis, semanticDiagnostics, smellDiagnostics } from "./analyzer.js";
import { registerSemanticProviders } from "./semantic-providers.js";
import { renderExplorer, renderHeadersList, setupExplorer, updateExplorerLiveValues } from "./explorer.js";
import { setupSearchPanel, focusSearch } from "./search-panel.js";
import { setupPalette, openPalette } from "./palette.js";
import { setupVariablesPanel, setDock, isDockOpen, renderVariablesPanel, tickVariablesPanel } from "./variables-panel.js";
import { projectRunState } from "./variables.js";
import { setupTooltips } from "./tooltips.js";
import { configureProjectService, analyzeProject, projectAnalysis, projectChangedInScratch, forgetDecompiledSources, decompiledSource, updateSpriteSource, onProjectChange, projectProgress, projectFactsFor, stableMessageCounts } from "./project-service.js";
import { diagnosticsFor as projectDiagnosticsFor, STAGE, parseVarKey, varKey, renameEdits } from "./project-analysis.js";
import { renderProblemsView, toggleProblemGroup, toggleProblemHints, problemsShowHints } from "./problems-view.js";
import { revealVariable } from "./variables-panel.js";
import { setupEventFlow, isEventFlowOpen, closeEventFlow } from "./event-flow.js";

export let monacoEditor = null;
export let overlayVisible = false;
export let currentVM = null;
export let currentSpriteContext = null;
export let editingHeader = null;
export let lastInjectAt = null;
let monaco = null;

const $ = id => document.getElementById(id);
const contentKey = sprite => sprite ? `scratchpiler-content-${sprite}` : LS_KEY;
const injectedSourceKey = sprite => `scratchpiler-injected-src-${sprite}`;
export const fileKey = ({ kind, name }) => `${kind}:${name}`;
export const fileLabel = ({ kind, name }) => kind === 'header' ? name : spriteLabel(name);
export const allSpriteNames = () => ['__stage__', ...scratchIndex.sprites.map(s => s.name)];

export function activeFile() {
    if (editingHeader) return { kind: 'header', name: editingHeader };
    if (currentSpriteContext) return { kind: 'sprite', name: currentSpriteContext };
    return null;
}

const SETTINGS_KEY = 'scratchpiler-settings';
const settings = loadSettings();
const EDITOR_FONT = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const models = new Map();
let saveTimer = null;
let lintTimer = null;

function modelEntry(file) { return models.get(fileKey(file)); }
export function modelFor(file) { return modelEntry(file)?.model ?? null; }

const uriFor = file => monaco.Uri.from({
    scheme: 'scratchpiler',
    path: file.kind === 'sprite' && file.name === '__stage__' ? '/stage/Stage' : `/${file.kind}/${file.name}`,
});

export function fileForUri(uri) {
    if (uri?.scheme !== 'scratchpiler') return null;
    const kind = uri.path.split('/')[1];
    if (kind === 'stage') return { kind: 'sprite', name: '__stage__' };
    return kind ? { kind, name: uri.path.slice(kind.length + 2) } : null;
}

function createModel(file, text) {
    const model = monaco.editor.createModel(text, LANG_ID, uriFor(file));
    model.updateOptions({ tabSize: parseInt(settings.tabSize, 10) || 4, insertSpaces: true });
    models.set(fileKey(file), { file, model, viewState: null });
    model.onDidChangeContent(() => {
        if (monacoEditor?.getModel() === model) return;
        saveFile(file);
        scheduleLint();
    });
    return model;
}

export function ensureSpriteModel(sprite) {
    const file = { kind: 'sprite', name: sprite };
    const existing = modelFor(file);
    if (existing) return existing;
    const fromScratch = cachedSpriteText(sprite) === null ? decompiledSource(sprite) : null;
    const text = cachedSpriteText(sprite) ?? fromScratch;
    if (text === null) return null;
    if (fromScratch !== null && injectedSource(sprite) === null) recordInjectedSource(sprite, fromScratch);
    return createModel(file, text);
}

function disposeModel(file) {
    const entry = modelEntry(file);
    if (!entry) return;
    if (monacoEditor?.getModel() === entry.model) monacoEditor.setModel(null);
    entry.model.dispose();
    models.delete(fileKey(file));
}

export function replaceModelText(model, text) {
    if (model.getValue() === text) return;
    model.pushEditOperations([], [{ range: model.getFullModelRange(), text }], () => null);
}

export function savedSpriteCode(sprite) {
    try { return localStorage.getItem(contentKey(sprite)); } catch (_) { return null; }
}
export function writeSavedSpriteCode(sprite, text) {
    try { localStorage.setItem(contentKey(sprite), text); } catch (_) {}
}

export function spriteSource(sprite) {
    return modelFor({ kind: 'sprite', name: sprite })?.getValue() ?? savedSpriteCode(sprite) ?? '';
}

function injectedSource(sprite) {
    try { return localStorage.getItem(injectedSourceKey(sprite)); } catch (_) { return null; }
}
function recordInjectedSource(sprite, text) {
    try { localStorage.setItem(injectedSourceKey(sprite), text); } catch (_) {}
}
function forgetInjectedSources() {
    removeLocalStorageKeys(k => k.startsWith('scratchpiler-injected-src-'));
}
export function isSpriteDirty(sprite) {
    const injected = injectedSource(sprite);
    return injected !== null && injected !== spriteSource(sprite);
}

function removeLocalStorageKeys(predicate) {
    const keys = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && predicate(k)) keys.push(k);
        }
        keys.forEach(k => localStorage.removeItem(k));
    } catch (_) {}
    return keys.length;
}

function saveFile(file) {
    const model = modelFor(file);
    if (!model) return;
    const text = model.getValue();
    if (file.kind === 'header') {
        try { writeHeader(file.name, text); } catch (_) {}
        return;
    }
    if (!text.trim()) return;
    writeSavedSpriteCode(file.name, text);
}

function saveActiveFile() {
    const file = activeFile();
    if (file) saveFile(file);
}

function cachedSpriteText(sprite) {
    const cached = savedSpriteCode(sprite);
    return cached !== null && cached.trim() !== '' ? cached : null;
}

const decompiling = new Map();

function syncReadOnly() {
    const file = activeFile();
    const busy = file?.kind === 'sprite' && decompiling.has(file.name);
    monacoEditor?.updateOptions({ readOnly: busy, readOnlyMessage: { value: 'Decompiling from Scratch…' } });
}

function decompileSprite(sprite) {
    if (!decompiling.has(sprite)) {
        setStatusMessage(`Decompiling ${spriteLabel(sprite)}…`);
        decompiling.set(sprite, decompileAsync(currentVM, sprite, {
            onProgress: fraction => setStatusMessage(`Decompiling ${spriteLabel(sprite)}… ${Math.round(fraction * 100)}%`),
        }).finally(() => { decompiling.delete(sprite); syncReadOnly(); }));
        syncReadOnly();
    }
    return decompiling.get(sprite);
}

async function fillFromScratch(sprite) {
    const file = { kind: 'sprite', name: sprite };
    try {
        const code = await decompileSprite(sprite);
        const model = modelFor(file);
        if (!model || model.getValue() !== '') return;
        model.setValue(code);
        recordInjectedSource(sprite, code);
        setStatusMessage(`Decompiled ${spriteLabel(sprite)} from Scratch`);
        refreshSyncState();
        scheduleLint(0);
    } catch (e) {
        console.warn('[scratchpiler] decompile failed for', sprite, e);
    }
}

function showFile(file, text) {
    closeEventFlow();
    const current = activeFile();
    if (current) {
        const entry = modelEntry(current);
        if (entry && monacoEditor) entry.viewState = monacoEditor.saveViewState();
        saveFile(current);
    }
    const model = modelFor(file) ?? createModel(file, text());
    if (file.kind === 'header') {
        editingHeader = file.name;
    } else {
        editingHeader = null;
        currentSpriteContext = file.name;
        switchScratchEditingTarget(file.name);
    }
    if (monacoEditor) {
        monacoEditor.setModel(model);
        const viewState = modelEntry(file)?.viewState;
        if (viewState) monacoEditor.restoreViewState(cursorAndScrollOnly(viewState));
    }
    ensureTab(file);
    onActiveFileChanged();
    syncReadOnly();
}

const cursorAndScrollOnly = viewState => ({ ...viewState, contributionsState: {} });

function switchScratchEditingTarget(sprite) {
    if (!currentVM) return;
    const target = sprite === '__stage__'
        ? currentVM.runtime.targets.find(t => t.isStage)
        : currentVM.runtime.targets.find(t => !t.isStage && t.isOriginal !== false && t.sprite.name === sprite);
    if (target) { try { currentVM.setEditingTarget(target.id); } catch (_) {} }
}

export function selectSidebarSprite(sprite) {
    if (!sprite || !monacoEditor) { currentSpriteContext = sprite || currentSpriteContext; return; }
    const file = { kind: 'sprite', name: sprite };
    ensureSpriteModel(sprite);
    const needsDecompile = !modelFor(file) && cachedSpriteText(sprite) === null && !!currentVM;
    showFile(file, () => cachedSpriteText(sprite) ?? '');
    if (needsDecompile) fillFromScratch(sprite);
}

export function openHeader(name) {
    if (!monacoEditor) return;
    showFile({ kind: 'header', name }, () => readHeader(name) ?? '');
}

export function openFile(file) {
    if (file.kind === 'header') openHeader(file.name); else selectSidebarSprite(file.name);
}

function reloadSprite(sprite) {
    disposeModel({ kind: 'sprite', name: sprite });
    if (currentSpriteContext === sprite && !editingHeader) currentSpriteContext = null;
    selectSidebarSprite(sprite);
}

function onActiveFileChanged() {
    const file = activeFile();
    $('sp-crumb-file').textContent = file ? fileLabel(file) : '—';
    $('sp-run-label').textContent = editingHeader ? 'Check Header' : 'Compile & Inject';
    $('scratchpiler-compile-btn').title = editingHeader
        ? 'Save this header and check it for problems (Ctrl+Enter)'
        : 'Compile and inject into Scratch (Ctrl+Enter). Shift+click to minify.';
    renderTabs();
    renderExplorer();
    renderHeadersList();
    renderVariablesPanel();
    refreshSyncState();
    scheduleLint(0);
}

export const openTabs = [];

function ensureTab(file) {
    if (!openTabs.some(t => fileKey(t) === fileKey(file))) openTabs.push(file);
}

export function renderTabs() {
    const bar = $('sp-tab-bar');
    if (!bar) return;
    const active = activeFile();
    bar.innerHTML = openTabs.map(t => {
        const key = fileKey(t);
        const isActive = active && fileKey(active) === key;
        const dirty = t.kind === 'sprite' && isSpriteDirty(t.name);
        return `<div class="sp-tab${isActive ? ' sp-on' : ''}${dirty ? ' sp-dirty' : ''}" role="tab" aria-selected="${!!isActive}" data-key="${escapeHtml(key)}" title="${dirty ? 'Changed since last inject' : ''}">
            ${escapeHtml(fileLabel(t))}${t.kind === 'header' ? '<span class="sp-kind">header</span>' : ''}<span class="sp-dot"></span>
            <button class="sp-x" aria-label="Close ${escapeHtml(fileLabel(t))}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>`;
    }).join('');
}

const tabByKey = key => openTabs.find(t => fileKey(t) === key);

export function closeTabs(keys) {
    const active = activeFile();
    const activeIndex = active ? openTabs.findIndex(t => fileKey(t) === fileKey(active)) : -1;
    const closingActive = active && keys.includes(fileKey(active));
    for (const key of keys) {
        const tab = tabByKey(key);
        if (!tab) continue;
        saveFile(tab);
        openTabs.splice(openTabs.indexOf(tab), 1);
        if (!closingActive || fileKey(tab) !== fileKey(active)) disposeModel(tab);
    }
    if (closingActive) {
        const next = openTabs[Math.min(activeIndex, openTabs.length - 1)];
        const closed = active;
        if (next) {
            openFile(next);
        } else {
            editingHeader = null;
            currentSpriteContext = null;
            onActiveFileChanged();
        }
        disposeModel(closed);
    } else {
        renderTabs();
    }
}

function tabMenuItems(key) {
    const i = openTabs.findIndex(t => fileKey(t) === key);
    const tab = openTabs[i];
    return [
        { text: 'Close', keys: 'Middle click', run: () => closeTabs([key]) },
        { text: 'Close others', disabled: openTabs.length < 2, run: () => closeTabs(openTabs.filter(t => fileKey(t) !== key).map(fileKey)) },
        { text: 'Close to the right', disabled: i === openTabs.length - 1, run: () => closeTabs(openTabs.slice(i + 1).map(fileKey)) },
        '-',
        tab.kind === 'sprite' && { text: 'Compile & inject', run: () => { openFile(tab); compileAndInject(); } },
        tab.kind === 'sprite' && { text: 'Save as .sdsl file…', run: () => { openFile(tab); exportToLocalFile(); } },
    ];
}

function setupTabs() {
    const bar = $('sp-tab-bar');
    bar.addEventListener('click', e => {
        const tab = e.target.closest('.sp-tab');
        if (!tab) return;
        if (e.target.closest('.sp-x')) closeTabs([tab.dataset.key]);
        else openFile(tabByKey(tab.dataset.key));
    });
    bar.addEventListener('auxclick', e => {
        const tab = e.target.closest('.sp-tab');
        if (tab && e.button === 1) { e.preventDefault(); closeTabs([tab.dataset.key]); }
    });
    bar.addEventListener('contextmenu', e => {
        const tab = e.target.closest('.sp-tab');
        if (!tab) return;
        e.preventDefault();
        showMenu(tabMenuItems(tab.dataset.key), { x: e.clientX, y: e.clientY });
    });
}

export function refreshSyncState() {
    const known = allSpriteNames().filter(s => injectedSource(s) !== null);
    const dirty = known.filter(isSpriteDirty);
    const pill = $('sp-sync');
    pill.classList.toggle('sp-dirty', dirty.length > 0);
    pill.classList.toggle('sp-clean', known.length > 0 && dirty.length === 0);
    $('sp-sync-text').textContent = dirty.length ? 'Changed since last inject' : known.length ? 'Scratch is up to date' : 'Not injected yet';
    pill.title = dirty.length ? `Not injected yet: ${dirty.map(spriteLabel).join(', ')}` : 'Scratch has the code shown here';
    renderTabs();
    renderExplorer();
}

function updateLastInjectLabel() {
    const el = $('sp-sb-last');
    if (!el) return;
    if (!lastInjectAt) { el.textContent = 'Not injected yet'; return; }
    const s = Math.round((Date.now() - lastInjectAt) / 1000);
    el.textContent = s < 10 ? 'Injected just now' : s < 60 ? `Injected ${s}s ago` : `Injected ${Math.round(s / 60)} min ago`;
}

let currentView = 'explorer';
export function setView(view, { toggle = false } = {}) {
    const main = $('sp-main');
    if (toggle && view === currentView && !main.classList.contains('sp-no-side')) {
        main.classList.add('sp-no-side');
        document.querySelectorAll('#scratchpiler-overlay .sp-rail [data-view]').forEach(b => b.setAttribute('aria-pressed', 'false'));
        return;
    }
    currentView = view;
    main.classList.remove('sp-no-side');
    document.querySelectorAll('#scratchpiler-overlay .sp-rail [data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    document.querySelectorAll('#scratchpiler-overlay .sp-panel').forEach(p => p.classList.toggle('sp-on', p.dataset.panel === view));
    if (view === 'headers') renderHeadersList();
    if (view === 'search') focusSearch();
}

function toggleSidebar() {
    const main = $('sp-main');
    if (main.classList.contains('sp-no-side')) setView(currentView);
    else setView(currentView, { toggle: true });
}

function setupRail() {
    document.querySelectorAll('#scratchpiler-overlay .sp-rail [data-view]').forEach(b =>
        b.addEventListener('click', () => setView(b.dataset.view, { toggle: true })));
    $('sp-rail-problems').addEventListener('click', () => setBottomPanel(true, 'problems'));
    if (matchMedia('(max-width: 860px)').matches) $('sp-main').classList.add('sp-no-side');
}

function updateStatusBarVM(state) {
    const dot = $('sp-sb-vm-dot');
    dot.className = 'sp-vm-dot' + (state === 'ok' ? '' : ` sp-${state}`);
    $('sp-sb-vm-text').textContent = state === 'ok' ? 'Scratch connected' : state === 'error' ? 'Scratch not found' : 'Connecting to Scratch';
}

export function updateStatus(text) {
    setStatusMessage(text);
    if (/^error/i.test(text)) logToOutput(text, 'error');
}

const SEVERITY = () => ({
    [monaco.MarkerSeverity.Error]: 'error',
    [monaco.MarkerSeverity.Warning]: 'warning',
    [monaco.MarkerSeverity.Info]: 'info',
    [monaco.MarkerSeverity.Hint]: 'info',
});
export const problemCounts = new Map();
let problemsStale = false;
export function renderProblemsIfStale() {
    if (problemsStale) { problemsStale = false; renderProblems(); }
}

const markerItems = model => {
    const severity = SEVERITY();
    return monaco.editor.getModelMarkers({ resource: model.uri, owner: LANG_ID })
        .map(m => ({ line: m.startLineNumber, col: m.startColumn, message: m.message, severity: severity[m.severity] }));
};

function problemGroups() {
    const linked = projectAnalysis();
    const groups = [];
    for (const sprite of allSpriteNames()) {
        const file = { kind: 'sprite', name: sprite };
        const model = modelFor(file);
        const projectFile = linked?.files.get(sprite);
        const items = model ? markerItems(model) : projectFile ? fileDiagnostics(sprite, projectFile.analysis) : [];
        groups.push({ key: fileKey(file), label: spriteLabel(sprite), note: model ? '' : 'not open', collapsedByDefault: !model, items });
    }
    for (const { file, model } of models.values()) {
        if (file.kind === 'header') groups.push({ key: fileKey(file), label: file.name, note: 'header', items: markerItems(model) });
    }
    if (linked && settings.lintProject) {
        const index = linked.index;
        const idOf = (owner, kind, name) => (owner === STAGE ? index.globalVariables : index.spriteVariables[owner] ?? [])
            .find(v => v.name === name && v.type === kind)?.id;
        groups.push({
            key: 'project', label: 'Project', note: 'variables and lists',
            items: linked.diagnostics.project.map(item => ({
                ...item, varId: idOf(item.owner, item.kind, parseVarKey(item.varKey).name), owner: item.owner,
                where: `${spriteLabel(item.owner)} · ${item.kind === 'list' ? 'list' : 'variable'}`,
            })),
        });
    }
    return groups;
}

function renderProblems() {
    if (!monacoEditor) return;
    const groups = problemGroups();
    let errors = 0, warnings = 0;
    problemCounts.clear();
    for (const group of groups) {
        const fileErrors = group.items.filter(i => i.severity === 'error').length;
        const fileWarnings = group.items.filter(i => i.severity === 'warning').length;
        if (group.key.startsWith('sprite:')) problemCounts.set(group.key.slice(7), { errors: fileErrors, warnings: fileWarnings });
        errors += fileErrors; warnings += fileWarnings;
    }
    const analyzing = projectProgress().running;
    if (isBottomOpen()) {
        renderProblemsView($('sp-problems-view'), groups, {
            emptyText: analyzing ? 'Checking the project…' : projectAnalysis() ? 'No problems in the project.' : 'Open a sprite to check it for problems.',
        });
    } else {
        problemsStale = true;
    }
    $('sp-prob-hints').setAttribute('aria-pressed', String(problemsShowHints()));

    const total = errors + warnings;
    $('sp-problems-count').textContent = total;
    const badge = $('sp-rail-badge');
    badge.hidden = total === 0;
    badge.textContent = total;
    badge.classList.toggle('sp-err', errors > 0);
    const errEl = $('sp-sb-err-count'), warnEl = $('sp-sb-warn-count');
    errEl.textContent = plural(errors, 'error');
    warnEl.textContent = plural(warnings, 'warning');
    errEl.classList.toggle('sp-zero', errors === 0);
    warnEl.classList.toggle('sp-zero', warnings === 0);
    renderExplorer();
}

export function revealPosition(file, line, col = 1) {
    openFile(file);
    if (!monacoEditor) return;
    monacoEditor.setPosition({ lineNumber: line, column: col });
    monacoEditor.revealPositionInCenter({ lineNumber: line, column: col });
    monacoEditor.focus();
}

function setupProblemsView() {
    $('sp-problems-view').addEventListener('click', e => {
        const header = e.target.closest('.sp-pg-h');
        if (header) { toggleProblemGroup(header.dataset.group); renderProblems(); return; }
        const row = e.target.closest('.sp-prob');
        if (!row) return;
        if (row.dataset.var) {
            const item = projectAnalysis()?.diagnostics.project.find(p => p.varKey && row.title.includes(parseVarKey(p.varKey).name));
            if (item && item.owner !== STAGE) selectSidebarSprite(item.owner);
            revealVariable(row.dataset.var, 'name');
            return;
        }
        const [kind, ...rest] = row.dataset.key.split(':');
        revealPosition(tabByKey(row.dataset.key) ?? { kind, name: rest.join(':') }, +row.dataset.line, +row.dataset.col);
    });
    $('sp-prob-hints').addEventListener('click', () => { toggleProblemHints(); renderProblems(); });
    document.addEventListener('scratchpiler:bottom-open', renderProblemsIfStale);
    $('sp-sb-problems').addEventListener('click', () => setBottomPanel(true, 'problems'));
}

function scheduleLint(delay = 350) {
    clearTimeout(lintTimer);
    lintTimer = setTimeout(lintOpenModels, delay);
}

function toMarker(item, model) {
    const S = monaco.MarkerSeverity;
    const line = Math.min(item.line, model.getLineCount());
    return {
        startLineNumber: line, startColumn: item.col,
        endLineNumber: line, endColumn: item.wholeLine ? model.getLineMaxColumn(line) : item.col + (item.len || 1),
        message: item.message,
        severity: { error: S.Error, warning: S.Warning, info: S.Info }[item.severity],
        tags: item.tags?.includes('unnecessary') ? [monaco.MarkerTag.Unnecessary] : undefined,
    };
}

const localDiagnosticsCache = new WeakMap();
const lintSettingsKey = () => ['lintUnreachable', 'lintOrphaned', 'lintTypecheck', 'lintSemantic', 'lintSmells'].map(k => settings[k] ? 1 : 0).join('');

function localDiagnostics(sprite, analysis) {
    const cached = localDiagnosticsCache.get(analysis);
    if (cached?.settings === lintSettingsKey()) return cached.items;
    const { ast, parseErrors } = analysis;
    const severity = level => item => ({ ...item, severity: level });
    const items = [
        ...parseErrors.map(severity('error')),
        ...lint(ast).filter(w => (w.category !== 'Unreachable' || settings.lintUnreachable) && (w.category !== 'Orphaned' || settings.lintOrphaned))
            .map(w => ({ ...w, severity: 'warning', wholeLine: w.category === 'Unreachable' || w.category === 'Orphaned' })),
        ...(settings.lintTypecheck ? typeCheckDiagnostics(ast, sprite) : []).map(severity('warning')),
        ...(settings.lintSemantic ? semanticDiagnostics(analysis) : []).map(severity('warning')),
        ...(settings.lintSmells ? smellDiagnostics(analysis) : []).map(severity('info')),
    ];
    localDiagnosticsCache.set(analysis, { settings: lintSettingsKey(), items });
    return items;
}

function fileDiagnostics(sprite, analysis) {
    const linked = settings.lintProject ? projectAnalysis() : null;
    const projectFile = linked?.files.get(sprite);
    const project = projectFile && projectFile.analysis.src === analysis.src ? projectDiagnosticsFor(linked, sprite) : [];
    return [...localDiagnostics(sprite, analysis), ...project];
}

let linting = false;
function lintOpenModels() {
    if (!monacoEditor) return;
    linting = true;
    try {
        for (const { file, model } of models.values()) {
            if (file.kind !== 'sprite') continue;
            updateSpriteSource(file.name, model.getValue(), getAnalysis(model, file.name));
        }
        for (const { file, model } of models.values()) {
            if (file.kind !== 'sprite') continue;
            try {
                const items = fileDiagnostics(file.name, getAnalysis(model, file.name));
                monaco.editor.setModelMarkers(model, LANG_ID, items.map(item => toMarker(item, model)));
            } catch (error) {
                console.warn('[scratchpiler] lint failed for', file.name, error);
            }
        }
    } finally {
        linting = false;
    }
    refreshInlayHints();
    fitWrappingIndent();
    renderProblems();
    refreshSyncState();
}

const inlayListeners = new Set();
export const onInlayHintsChange = listener => { inlayListeners.add(listener); return { dispose: () => inlayListeners.delete(listener) }; };
let hintedCounts = null;
function refreshInlayHints() {
    const counts = stableMessageCounts();
    if (counts === hintedCounts) return;
    hintedCounts = counts;
    inlayListeners.forEach(listener => listener());
}

const MIN_WRAPPED_COLUMNS = 40;
let wrappingIndent = 'same';
function fitWrappingIndent() {
    const model = monacoEditor?.getModel();
    if (!model || !settings.wrap) return;
    const fontInfo = monacoEditor.getOption(monaco.editor.EditorOption.fontInfo);
    const columns = Math.floor(monacoEditor.getLayoutInfo().contentWidth / fontInfo.typicalHalfwidthCharacterWidth);
    let deepest = 0;
    for (const line of model.getLinesContent()) {
        if (line.length <= columns) continue;
        deepest = Math.max(deepest, line.length - line.trimStart().length);
    }
    const next = columns - deepest >= MIN_WRAPPED_COLUMNS ? 'same' : 'none';
    if (next === wrappingIndent) return;
    wrappingIndent = next;
    monacoEditor.updateOptions({ wrappingIndent });
}

const MIN_EDITOR_WIDTH = 560;
function fitSidePanels() {
    const main = $('sp-main');
    const dockOpen = !main.classList.contains('sp-no-dock');
    const rail = main.querySelector('.sp-rail')?.offsetWidth ?? 48;
    const side = main.classList.contains('sp-no-side') ? 0 : $('scratchpiler-sidebar').offsetWidth;
    const dock = parseInt(getComputedStyle(main).getPropertyValue('--sp-dock-w'), 10) || 320;
    main.classList.toggle('sp-dock-float', dockOpen && main.clientWidth - rail - side - dock < MIN_EDITOR_WIDTH);
}

function setupResponsivePanels() {
    const main = $('sp-main');
    if (typeof ResizeObserver === 'function') new ResizeObserver(fitSidePanels).observe(main);
    else addEventListener('resize', fitSidePanels);
    new MutationObserver(fitSidePanels).observe(main, { attributes: true, attributeFilter: ['class', 'style'] });
    new MutationObserver(fitSidePanels).observe($('scratchpiler-overlay'), { attributes: true, attributeFilter: ['style'] });
    fitSidePanels();
}

function renderAnalysisProgress() {
    const { running, done, total, label } = projectProgress();
    const bar = $('sp-analysis');
    bar.classList.toggle('sp-on', running);
    const fraction = total ? Math.min(1, done / total) : 0;
    bar.style.setProperty('--sp-progress', fraction.toFixed(3));
    $('sp-sb-analysis').hidden = !running;
    $('sp-sb-analysis-text').textContent = running ? `Analyzing ${label ? spriteLabel(label) : 'project'} · ${Math.floor(done)}/${total}` : '';
    $('sp-sb-analysis').style.setProperty('--sp-progress', fraction.toFixed(3));
}

function onProjectAnalysisChange() {
    renderAnalysisProgress();
    if (linting) return;
    scheduleLint(projectProgress().running ? 400 : 0);
}

export function compileAndInject({ minify = false } = {}) {
    if (!monacoEditor) return;
    if (editingHeader) { checkCurrentHeader(); return; }
    if (!currentVM) { toast('Scratch isn’t connected yet. Try again in a moment.', 'error'); return; }
    const sprite = currentSpriteContext;
    if (!sprite) { toast('Open a sprite to compile it', 'warn'); return; }
    if (decompiling.has(sprite)) { toast(`Still decompiling ${spriteLabel(sprite)}. Try again in a moment.`, 'warn'); return; }
    const model = monacoEditor.getModel();
    const source = model.getValue();
    setStatusMessage(minify ? 'Compiling (minified)…' : 'Compiling…');

    let result;
    try {
        updateSpriteSource(sprite, source);
        const { facts, reason } = settings.optimize && settings.optimizeProject
            ? projectFactsFor(sprite, (other, text) => injectedSource(other) === text)
            : { facts: null, reason: null };
        if (reason) logToOutput(`Whole-program optimizations skipped: ${reason}`, 'info');
        result = compileSourceWithHeaders(source, currentVM, sprite, { embedSource: settings.embedSource && !minify, optimize: settings.optimize, projectFacts: facts });
    } catch (e) {
        console.error('[scratchpiler] compile exception', e);
        logToOutput(`Compiler crashed: ${e.message}`, 'error');
        toast('The compiler crashed. The details are in Output.', 'error');
        flashCompileBtn(false);
        return;
    }

    monaco.editor.setModelMarkers(model, LANG_ID, result.errors.map(e => toMarker(e, monaco.MarkerSeverity.Error, model)));
    if (result.errors.length > 0) {
        result.errors.forEach(er => logToOutput(`${spriteLabel(sprite)}, line ${er.line}:${er.col}: ${er.message}`, 'error'));
        setBottomPanel(true, 'problems');
        toast(`${plural(result.errors.length, 'error')} in ${spriteLabel(sprite)}. Nothing was injected.`, 'error');
        flashCompileBtn(false);
        return;
    }

    if (minify) {
        const renamed = minifyBlocks(result.blocks, currentVM, sprite);
        logToOutput(`Minified: ${plural(renamed, 'variable')} renamed to gibberish`, 'ok');
    }
    injectBlocks(result.blocks, currentVM, sprite, result.headerRoots, result.comments);

    const blocks = Object.values(result.blocks);
    const scripts = blocks.filter(b => b.topLevel && !b.shadow).length;
    const message = `Injected ${spriteLabel(sprite)}: ${plural(scripts, 'script')} (${plural(blocks.length, 'block')})${minify ? ', minified' : ''}`;
    lastInjectAt = Date.now();
    recordInjectedSource(sprite, source);
    saveFile({ kind: 'sprite', name: sprite });
    flashCompileBtn(true);
    toast(message);
    logToOutput(message, 'ok');
    reindex(currentVM);
    updateLastInjectLabel();
    refreshSyncState();
    renderVariablesPanel();
}

function checkCurrentHeader() {
    const name = editingHeader;
    const model = monacoEditor.getModel();
    try { writeHeader(name, model.getValue()); }
    catch (err) { toast(err.message, 'error'); flashCompileBtn(false); return; }
    const expanded = expand(`#include <${name}>`);
    const markers = expanded.errors.map(e => {
        const m = e.message.match(/^[\w-]+\.h:(\d+)(?::(\d+))?:? ?(.*)$/s);
        const line = m ? +m[1] : 1, col = m && m[2] ? +m[2] : 1;
        return { startLineNumber: line, startColumn: col, endLineNumber: line, endColumn: col + 40, message: m ? m[3] : e.message, severity: monaco.MarkerSeverity.Error };
    });
    monaco.editor.setModelMarkers(model, LANG_ID, markers);
    if (expanded.errors.length) {
        expanded.errors.forEach(er => logToOutput(`${name}: ${er.message}`, 'error'));
        setBottomPanel(true, 'problems');
        toast(`${plural(expanded.errors.length, 'problem')} in ${name}`, 'error');
        flashCompileBtn(false);
    } else {
        toast(`Saved ${name}. No problems found.`);
        flashCompileBtn(true);
    }
}

function minifyBlocks(blocks, vm, spriteName) {
    const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randName = () => Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
    const nameMap = new Map();
    for (const block of Object.values(blocks)) {
        for (const key of ['VARIABLE', 'LIST']) {
            const f = block.fields?.[key];
            if (f && !nameMap.has(f.value)) nameMap.set(f.value, randName());
        }
    }
    for (const block of Object.values(blocks)) {
        for (const key of ['VARIABLE', 'LIST']) {
            const f = block.fields?.[key];
            if (f && nameMap.has(f.value)) f.value = nameMap.get(f.value);
        }
    }
    const stage = vm.runtime.targets.find(t => t.isStage);
    const sprite = spriteName !== '__stage__' ? vm.runtime.targets.find(t => t.sprite?.name === spriteName) : null;
    for (const [realName, obfName] of nameMap) {
        for (const target of [sprite, stage].filter(Boolean)) {
            const vmVar = Object.values(target.variables).find(v => v.name === realName);
            if (vmVar) vmVar.name = obfName;
        }
    }
    return nameMap.size;
}

export async function pullFromScratch() {
    if (editingHeader) { toast('Headers are stored in your userscript manager, not in Scratch', 'warn'); return; }
    if (!currentVM) { toast('Scratch isn’t connected yet. Try again in a moment.', 'error'); return; }
    const sprite = currentSpriteContext;
    if (!sprite || !monacoEditor) return;
    try {
        const code = await decompileSprite(sprite);
        const model = modelFor({ kind: 'sprite', name: sprite });
        if (!model) return;
        replaceModelText(model, code);
        recordInjectedSource(sprite, code);
        saveFile({ kind: 'sprite', name: sprite });
        refreshSyncState();
        toast(`Pulled ${spriteLabel(sprite)} from Scratch. Press Ctrl+Z to undo.`);
        logToOutput(`Decompiled ${spriteLabel(sprite)} from the Scratch VM`, 'ok');
    } catch (e) {
        logToOutput(`Couldn’t decompile ${spriteLabel(sprite)}: ${e.message}`, 'error');
        toast(`Couldn’t pull ${spriteLabel(sprite)} from Scratch. The details are in Output.`, 'error');
    }
}

export function formatDocument() {
    monacoEditor?.getAction('editor.action.formatDocument')?.run();
}

export function reindexProject() {
    if (!currentVM) { toast('Scratch isn’t connected yet. Try again in a moment.', 'error'); return; }
    reindex(currentVM);
    renderExplorer();
    renderVariablesPanel();
    const vars = scratchIndex.globalVariables.length + Object.values(scratchIndex.spriteVariables).reduce((n, v) => n + v.length, 0);
    const message = `Re-indexed ${plural(scratchIndex.sprites.length + 1, 'sprite')} and ${plural(vars, 'variable')}`;
    toast(message);
    logToOutput(message, 'info');
}

function reloadAllSprites() {
    const sprites = [...models.values()].map(e => e.file).filter(f => f.kind === 'sprite');
    const active = activeFile();
    sprites.filter(f => !active || fileKey(f) !== fileKey(active)).forEach(disposeModel);
    if (active?.kind === 'sprite') reloadSprite(active.name);
    else refreshSyncState();
}

export function clearSavedCode() {
    const cleared = removeLocalStorageKeys(k => k.startsWith('scratchpiler-content-') || k.startsWith(`${LS_INJ_KEY}-`) || k === LS_KEY);
    forgetInjectedSources();
    injectedBlockIds.clear();
    forgetDecompiledSources();
    reloadAllSprites();
    analyzeProject(currentVM);
    toast(`Cleared ${plural(cleared, 'saved entry', 'saved entries')}. Sprites are decompiled fresh from Scratch.`);
    logToOutput('Cleared saved code from this browser', 'info');
}

export function resetAllChanges() {
    if (!currentVM) { toast('Scratch isn’t connected yet. Try again in a moment.', 'error'); return; }
    let removed = 0;
    for (const [sprite, ids] of injectedBlockIds.entries()) {
        const target = sprite === '__stage__'
            ? currentVM.runtime.targets.find(t => t.isStage)
            : currentVM.runtime.targets.find(t => !t.isStage && t.sprite.name === sprite);
        if (!target) continue;
        for (const id of ids) {
            try { target.blocks.deleteBlock(id); removed++; } catch (_) {}
        }
    }
    injectedBlockIds.clear();
    removeLocalStorageKeys(k => k.startsWith('scratchpiler-content-') || k.startsWith(`${LS_INJ_KEY}-`) || k === LS_KEY);
    forgetInjectedSources();
    try { currentVM.setEditingTarget(currentVM.editingTarget.id); } catch (_) {}
    reindex(currentVM);
    reloadAllSprites();
    const message = `Removed ${plural(removed, 'injected script')} and cleared saved code`;
    toast(message, 'warn');
    logToOutput(message, 'warn');
}

export function noteCrossSpriteRename(textBefore) {
    setTimeout(() => {
        for (const [sprite, text] of textBefore) {
            if (injectedSource(sprite) === text) recordInjectedSource(sprite, spriteSource(sprite));
        }
        if (currentVM) reindex(currentVM);
        refreshSyncState();
        renderVariablesPanel();
        scheduleLint(0);
    });
}

function applySpanEdits(model, changes) {
    model.pushEditOperations([], changes.map(c => ({
        range: new monaco.Range(c.span.line, c.span.col, c.span.endLine ?? c.span.line, c.span.endCol),
        text: c.text,
    })), () => null);
}

export function rewriteVariableReferences(oldName, newName, { global, sprite, kind = 'variable' }) {
    const linked = projectProgress().running ? null : projectAnalysis();
    const key = varKey(global ? STAGE : sprite, kind, oldName);
    if (linked?.variables.has(key)) {
        let refs = 0, files = 0;
        for (const [name, changes] of renameEdits(linked, { kind: 'variable', key }, newName)) {
            const model = ensureSpriteModel(name);
            if (!model) continue;
            const before = model.getValue();
            applySpanEdits(model, changes);
            if (injectedSource(name) === before) recordInjectedSource(name, model.getValue());
            saveFile({ kind: 'sprite', name });
            refs += changes.length;
            files++;
        }
        refreshSyncState();
        scheduleLint(0);
        return { refs, files };
    }
    const needle = `[${oldName}]`, replacement = `[${newName}]`;
    let refs = 0, files = 0;
    for (const s of global ? allSpriteNames() : [sprite]) {
        const model = modelFor({ kind: 'sprite', name: s });
        const text = model ? model.getValue() : savedSpriteCode(s);
        const injected = injectedSource(s);
        if (injected?.includes(needle)) recordInjectedSource(s, injected.split(needle).join(replacement));
        if (!text || !text.includes(needle)) continue;
        refs += text.split(needle).length - 1;
        files++;
        const next = text.split(needle).join(replacement);
        if (model) replaceModelText(model, next); else writeSavedSpriteCode(s, next);
    }
    refreshSyncState();
    return { refs, files };
}

export function importFromLocalFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sdsl,.sp,.txt';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file || !monacoEditor) return;
        const reader = new FileReader();
        reader.onload = ev => {
            replaceModelText(monacoEditor.getModel(), ev.target.result);
            toast(`Opened ${file.name}. Press Ctrl+Z to undo.`);
        };
        reader.readAsText(file);
    };
    input.click();
}

export function exportToLocalFile() {
    if (!monacoEditor) return;
    const file = activeFile();
    const name = file?.kind === 'header' ? file.name : `${spriteLabel(file?.name) || 'project'}.sdsl`;
    const url = URL.createObjectURL(new Blob([monacoEditor.getValue()], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.download = name;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Saved ${name}`);
}

const EXAMPLES = {
    'Hello world': `// Hello World\n// Say hello when the green flag is clicked.\n\non flag {\n    say("Hello, World!")\n    wait(2)\n    say("I'm a Scratch sprite!")\n    wait(2)\n    say("")\n}\n`,
    'Chase mouse': `// Chase Mouse\n// Point towards the mouse and move forever.\n\non flag {\n    forever {\n        pointTowards("_mouse_")\n        move(5)\n    }\n}\n`,
    'Bounce loop': `// Bounce Loop\n// Move and bounce off the edges forever.\n\non flag {\n    forever {\n        move(10)\n        bounce()\n    }\n}\n`,
};

function loadExample(name) {
    if (!monacoEditor?.getModel()) { toast('Open a sprite first', 'warn'); return; }
    replaceModelText(monacoEditor.getModel(), EXAMPLES[name]);
    toast(`Loaded the “${name}” example. Press Ctrl+Z to undo.`);
}

function clearEditor() {
    if (!monacoEditor?.getModel()) return;
    replaceModelText(monacoEditor.getModel(), '');
    toast('Cleared the editor', '', { label: 'Undo', run: () => monacoEditor.trigger('scratchpiler', 'undo') });
}

function brandMenuItems() {
    return [
        { label: 'File' },
        { text: 'Open .sdsl file…', run: importFromLocalFile },
        { text: 'Save as .sdsl file…', keys: 'Ctrl Shift S', run: exportToLocalFile },
        { text: 'Clear editor', run: clearEditor },
        { label: 'Examples' },
        ...Object.keys(EXAMPLES).map(name => ({ text: name, run: () => loadExample(name) })),
        '-',
        { text: 'Keyboard shortcuts', keys: 'Ctrl /', run: () => openScrim('sp-keys-scrim') },
        { text: 'Documentation', run: () => window.open('https://github.com/Scratchpiler/scratchpiler/tree/main/docs', '_blank') },
        { text: 'Close Scratchpiler', keys: 'Esc', run: closeOverlay },
    ];
}

export function compileMenuItems() {
    return [
        { text: 'Compile & inject', keys: 'Ctrl Enter', disabled: !!editingHeader, run: () => compileAndInject() },
        { text: 'Compile & inject minified', keys: 'Ctrl Shift Enter', disabled: !!editingHeader, run: () => compileAndInject({ minify: true }) },
        '-',
        { text: 'Pull code from Scratch', keys: 'Alt Shift P', disabled: !!editingHeader, run: pullFromScratch },
        { text: 'Format document', keys: 'Alt Shift F', run: formatDocument },
    ];
}

function setupTopBar() {
    $('scratchpiler-compile-btn').addEventListener('click', e => compileAndInject({ minify: e.shiftKey }));
    $('sp-run-more').addEventListener('click', () => {
        if (isMenuOpen()) { closeMenu(); return; }
        showMenuBelow($('sp-run'), compileMenuItems(), true);
    });
    $('sp-brand').addEventListener('click', () => {
        if (isMenuOpen()) { closeMenu(); return; }
        showMenuBelow($('sp-brand'), brandMenuItems());
    });
    $('scratchpiler-close-btn').addEventListener('click', closeOverlay);
    $('sp-debug-resume-btn').addEventListener('click', resumeDebugger);
    $('sp-sb-cursor').addEventListener('click', () => openPalette(':'));
    $('sp-sb-wrap').addEventListener('click', () => toggleSetting('wrap'));
}

function applySettings() {
    const tabSize = parseInt(settings.tabSize, 10) || 4;
    $('sp-setting-theme').value = settings.theme;
    $('sp-setting-fontsize').textContent = settings.fontSize;
    $('sp-setting-wrap').checked = settings.wrap;
    $('sp-setting-minimap').checked = settings.minimap;
    $('sp-setting-autosave').value = settings.autosave;
    $('sp-setting-embed-source').checked = settings.embedSource;
    $('sp-setting-optimize').checked = settings.optimize;
    $('sp-setting-optimize-project').checked = settings.optimizeProject;
    $('sp-setting-optimize-project').disabled = !settings.optimize;
    $('sp-setting-optimize-project').closest('.sp-set').classList.toggle('sp-off', !settings.optimize);
    $('sp-setting-lint-project').checked = settings.lintProject;
    $('sp-setting-lint-typecheck').checked = settings.lintTypecheck;
    $('sp-setting-lint-unreachable').checked = settings.lintUnreachable;
    $('sp-setting-lint-orphaned').checked = settings.lintOrphaned;
    $('sp-setting-lint-semantic').checked = settings.lintSemantic;
    $('sp-setting-lint-smells').checked = settings.lintSmells;
    document.querySelectorAll('#sp-setting-tabsize button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.value === String(tabSize))));
    $('sp-sb-indent').textContent = `Spaces: ${tabSize}`;
    $('sp-sb-wrap').textContent = settings.wrap ? 'Wrap' : 'No wrap';
    $('sp-sb-wrap').setAttribute('aria-pressed', String(settings.wrap));
    if (!monacoEditor) return;
    monaco.editor.setTheme(settings.theme);
    monacoEditor.updateOptions({
        fontSize: parseInt(settings.fontSize, 10) || 14,
        wordWrap: settings.wrap ? 'on' : 'off',
        minimap: { enabled: settings.minimap },
    });
    fitWrappingIndent();
    for (const { model } of models.values()) model.updateOptions({ tabSize, insertSpaces: true });
}

function updateSetting(key, value) {
    settings[key] = value;
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
    applySettings();
    if (key.startsWith('lint')) scheduleLint(0);
}

export function toggleSetting(key) {
    updateSetting(key, !settings[key]);
}

function setupSettings() {
    $('sp-setting-theme').addEventListener('change', e => updateSetting('theme', e.target.value));
    $('sp-setting-autosave').addEventListener('change', e => updateSetting('autosave', e.target.value));
    const step = d => updateSetting('fontSize', String(Math.min(24, Math.max(10, (parseInt(settings.fontSize, 10) || 14) + d))));
    $('sp-fontsize-down').addEventListener('click', () => step(-1));
    $('sp-fontsize-up').addEventListener('click', () => step(1));
    $('sp-setting-tabsize').addEventListener('click', e => {
        const b = e.target.closest('button[data-value]');
        if (b) updateSetting('tabSize', b.dataset.value);
    });
    const toggles = {
        'sp-setting-wrap': 'wrap', 'sp-setting-minimap': 'minimap', 'sp-setting-embed-source': 'embedSource', 'sp-setting-optimize': 'optimize',
        'sp-setting-lint-typecheck': 'lintTypecheck', 'sp-setting-lint-unreachable': 'lintUnreachable',
        'sp-setting-lint-orphaned': 'lintOrphaned', 'sp-setting-lint-semantic': 'lintSemantic', 'sp-setting-lint-smells': 'lintSmells',
        'sp-setting-lint-project': 'lintProject', 'sp-setting-optimize-project': 'optimizeProject',
    };
    for (const [id, key] of Object.entries(toggles)) $(id).addEventListener('change', e => updateSetting(key, e.target.checked));

    $('sp-fix-reindex').addEventListener('click', reindexProject);
    $('sp-fix-clear-cache').addEventListener('click', clearSavedCode);
    const reset = $('sp-fix-reset-all');
    const RESET_COPY = { title: $('sp-reset-title').textContent, desc: $('sp-reset-desc').textContent };
    let disarmTimer = null;
    const disarm = () => {
        clearTimeout(disarmTimer);
        reset.classList.remove('sp-armed');
        $('sp-reset-title').textContent = RESET_COPY.title;
        $('sp-reset-desc').textContent = RESET_COPY.desc;
    };
    reset.addEventListener('click', () => {
        if (!reset.classList.contains('sp-armed')) {
            reset.classList.add('sp-armed');
            $('sp-reset-title').textContent = 'Click again to remove injected blocks';
            $('sp-reset-desc').textContent = 'This can’t be undone from Scratchpiler.';
            disarmTimer = setTimeout(disarm, 4000);
            return;
        }
        disarm();
        resetAllChanges();
    });
    applySettings();
}

let analysisStarted = false;

export function openOverlay() {
    $('scratchpiler-overlay').style.display = 'block';
    overlayVisible = true;
    const trigger = $('scratchpiler-trigger');
    if (trigger) trigger.style.display = 'none';
    renderExplorer();
    if (!activeFile()) selectSidebarSprite(currentSpriteContext || '__stage__');
    if (currentVM && monacoEditor) {
        if (!analysisStarted) { analysisStarted = true; analyzeProject(currentVM); } else projectChangedInScratch();
    }
    monacoEditor?.layout();
    monacoEditor?.focus();
}

export function closeOverlay() {
    saveActiveFile();
    closeMenu();
    closeScrims();
    $('scratchpiler-overlay').style.display = 'none';
    overlayVisible = false;
    const trigger = $('scratchpiler-trigger');
    if (trigger) trigger.style.display = '';
}

function toggleOverlay() {
    if (overlayVisible) closeOverlay(); else openOverlay();
}

let runState = 'stopped';
function tickRuntime() {
    if (!currentVM || !overlayVisible) return;
    const next = projectRunState(currentVM);
    if (next !== runState) {
        if (next === 'paused') {
            logToOutput('Paused at a breakpoint', 'warn');
            setDock(true);
        } else if (runState === 'paused') {
            logToOutput('Resumed', 'info');
        }
        runState = next;
        $('sp-debug-bar').classList.toggle('sp-on', runState === 'paused');
    }
    $('sp-live-dot').className = 'sp-live-dot' + (runState === 'running' ? '' : ` sp-${runState}`);
    tickVariablesPanel(runState);
    updateExplorerLiveValues();
}

function resumeDebugger() {
    const stage = currentVM?.runtime.targets.find(t => t.isStage);
    const resume = stage && Object.values(stage.variables).find(v => v.name === '__dbg_resume__');
    if (resume) resume.value = 1;
}

const MONACO_WIDGETS_BY_CLASS = '.suggest-widget.visible, .find-widget.visible, .rename-box, .parameter-hints-widget.visible';
const MONACO_WIDGETS_BY_VISIBILITY = '.quick-input-widget, .context-view, .monaco-hover:not(.hidden), .peekview-widget';
function monacoWidgetOpen() {
    const container = $('scratchpiler-editor-container');
    if (!container) return false;
    if (container.querySelector(MONACO_WIDGETS_BY_CLASS)) return true;
    if ([...container.querySelectorAll('.shadow-root-host')].some(host => host.shadowRoot?.querySelector('.monaco-menu'))) return true;
    return [...container.querySelectorAll(MONACO_WIDGETS_BY_VISIBILITY)].some(el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
}
const focusInEditor = () => $('scratchpiler-editor-container')?.contains(document.activeElement);
const focusInField = () => {
    const el = document.activeElement;
    return el && $('scratchpiler-overlay').contains(el) && !focusInEditor() && el.matches('input, textarea, select');
};

function handleEscape(e) {
    const stop = () => { e.preventDefault(); e.stopPropagation(); };
    if (isMenuOpen()) { stop(); closeMenu(); return; }
    if (isScrimOpen()) { stop(); closeScrims(); return; }
    if (searchNowhereOpen) { stop(); closeSearchNowhere(); return; }
    if (overlayVisible && isEventFlowOpen()) { stop(); closeEventFlow(); return; }
    if (!overlayVisible || monacoWidgetOpen() || focusInField()) return;
    stop();
    closeOverlay();
}

function registerHotkeys() {
    const bindings = [
        { when: e => e.key === 'Enter' && e.mod && !focusInField(), run: e => compileAndInject({ minify: e.shiftKey }) },
        { when: e => e.lower === 's' && e.mod && !e.shiftKey, run: () => compileAndInject() },
        { when: e => e.lower === 's' && e.mod && e.shiftKey, run: exportToLocalFile },
        { when: e => e.lower === 'k' && e.mod && !e.shiftKey, run: () => openPalette('') },
        { when: e => e.lower === 't' && e.mod && !e.shiftKey, run: () => openPalette('#') },
        { when: e => e.lower === 'p' && e.mod && e.shiftKey, run: () => openPalette('>') },
        { when: e => e.lower === 'p' && e.mod && !e.shiftKey, run: () => openPalette('@') },
        { when: e => e.lower === 'g' && e.mod && !focusInEditor(), run: () => openPalette(':') },
        { when: e => e.lower === 'b' && e.mod && !e.shiftKey, run: toggleSidebar },
        { when: e => e.lower === 'j' && e.mod && !e.shiftKey, run: () => setBottomPanel(!isBottomOpen()) },
        { when: e => e.lower === 'v' && e.mod && e.shiftKey, run: () => setDock(!isDockOpen()) },
        { when: e => e.lower === 'f' && e.mod && e.shiftKey, run: () => setView('search') },
        { when: e => e.lower === 'e' && e.mod && e.shiftKey, run: () => setView('explorer') },
        { when: e => e.lower === 'm' && e.mod && e.shiftKey, run: () => setBottomPanel(true, 'problems') },
        { when: e => e.key === ',' && e.mod, run: () => setView('settings') },
        { when: e => e.key === '/' && e.mod && !focusInEditor(), run: () => openScrim('sp-keys-scrim') },
        { when: e => e.lower === 'p' && e.altKey && e.shiftKey && !e.mod, run: pullFromScratch },
        { when: e => e.code === 'KeyZ' && e.altKey && !e.shiftKey && !e.mod, run: () => toggleSetting('wrap') },
        { when: e => e.key === 'F8' && runState === 'paused', run: resumeDebugger },
    ];

    let shiftTaps = 0, lastShiftAt = 0;
    document.addEventListener('keydown', e => {
        if (e.key !== 'Shift') shiftTaps = 0;
        if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM') {
            e.preventDefault(); e.stopPropagation(); toggleOverlay(); return;
        }
        if (e.key === 'Escape') { handleEscape(e); return; }
        if (!overlayVisible || isScrimOpen() || searchNowhereOpen) return;
        const info = { key: e.key, code: e.code, lower: e.key.toLowerCase(), mod: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey };
        const binding = bindings.find(b => b.when(info));
        if (!binding) return;
        e.preventDefault();
        e.stopPropagation();
        binding.run(info);
    }, true);

    document.addEventListener('keyup', e => {
        if (e.key !== 'Shift' || e.altKey || e.ctrlKey || e.metaKey) return;
        const now = Date.now();
        shiftTaps = now - lastShiftAt < 400 ? shiftTaps + 1 : 1;
        lastShiftAt = now;
        if (shiftTaps >= 2) {
            shiftTaps = 0;
            if (searchNowhereOpen) closeSearchNowhere(); else openSearchNowhere();
        }
    }, true);
}

function createEditor() {
    registerLanguage(monaco);
    registerSemanticProviders(monaco);
    configureProjectService({ getSource: sprite => modelFor({ kind: 'sprite', name: sprite })?.getValue() ?? cachedSpriteText(sprite) });
    onProjectChange(onProjectAnalysisChange);

    monacoEditor = monaco.editor.create($('scratchpiler-editor-container'), {
        model: null,
        theme: settings.theme,
        'semanticHighlighting.enabled': true,
        automaticLayout: true,
        minimap: { enabled: settings.minimap },
        fontSize: parseInt(settings.fontSize, 10) || 14,
        fontFamily: EDITOR_FONT,
        fontLigatures: false,
        lineHeight: 1.6,
        lineNumbers: 'on',
        wordWrap: settings.wrap ? 'on' : 'off',
        scrollBeyondLastLine: false,
        padding: { top: 10 },
        suggestOnTriggerCharacters: true,
        quickSuggestions: { other: true, comments: false, strings: true },
        wordBasedSuggestions: 'off',
        snippetSuggestions: 'inline',
        suggestSelection: 'recentlyUsed',
        acceptSuggestionOnEnter: 'smart',
        tabCompletion: 'on',
        suggest: {
            showWords: false,
            preview: true,
            insertMode: 'replace',
            localityBonus: true,
            snippetsPreventQuickSuggestions: false,
        },
        smoothScrolling: true,
        cursorSmoothCaretAnimation: 'on',
        cursorBlinking: 'smooth',
        renderLineHighlight: 'all',
        fixedOverflowWidgets: true,
    });

    document.fonts?.load(`13px ${EDITOR_FONT}`).then(() => monaco.editor.remeasureFonts()).catch(() => {});

    monacoEditor.addAction({
        id: 'scratchpiler.compile', label: 'Compile & inject',
        contextMenuGroupId: '0_scratchpiler', contextMenuOrder: 1,
        precondition: undefined, run: () => compileAndInject(),
    });
    monacoEditor.addAction({
        id: 'scratchpiler.pull', label: 'Pull code from Scratch',
        contextMenuGroupId: '0_scratchpiler', contextMenuOrder: 2,
        run: pullFromScratch,
    });

    monacoEditor.onDidChangeCursorPosition(e => {
        $('sp-sb-cursor').textContent = `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
    });

    monacoEditor.onDidChangeModelContent(() => {
        clearTimeout(saveTimer);
        const delay = parseInt(settings.autosave, 10);
        if (delay === 0) saveActiveFile();
        else saveTimer = setTimeout(saveActiveFile, isFinite(delay) ? delay : 1000);
        scheduleLint();
    });

    monaco.editor.onDidChangeMarkers(() => renderProblems());
    monacoEditor.onDidLayoutChange(fitWrappingIndent);
    monacoEditor.onDidChangeModel(fitWrappingIndent);
    applySettings();
}

function onVMFound(vm) {
    currentVM = vm;
    updateStatusBarVM('ok');
    reindex(vm);
    vm.on('targetsUpdate', () => { reindex(vm); if (overlayVisible) { renderExplorer(); renderVariablesPanel(); } });
    vm.runtime.on('PROJECT_LOADED', () => {
        removeLocalStorageKeys(k => k.startsWith(`${LS_INJ_KEY}-`));
        forgetInjectedSources();
        injectedBlockIds.clear();
        reindex(vm);
        forgetDecompiledSources();
        analysisStarted = false;
        if (overlayVisible && monacoEditor) { analysisStarted = true; analyzeProject(vm); }
        if (overlayVisible) refreshSyncState();
    });
    vm.runtime.on('PROJECT_CHANGED', projectChangedInScratch);
    if (overlayVisible && monacoEditor && !analysisStarted) { analysisStarted = true; analyzeProject(vm); }
    setInterval(tickRuntime, 200);
    if (overlayVisible && currentSpriteContext && !editingHeader && !spriteSource(currentSpriteContext).trim()) {
        reloadSprite(currentSpriteContext);
    } else if (overlayVisible) {
        renderExplorer();
    }
}

export function bootstrap() {
    buildOverlayDOM();
    buildTriggerButton();
    buildSearchNowhereDOM();
    registerHotkeys();

    setupMenu();
    setupScrims();
    setupBottomPanel();
    setupSidebarResize();
    setupTopBar();
    setupRail();
    setupTabs();
    setupProblemsView();
    setupSettings();
    setupExplorer();
    setupSearchPanel();
    setupPalette();
    setupVariablesPanel();
    setupTooltips();
    setupEventFlow();
    setupResponsivePanels();
    setInterval(updateLastInjectLabel, 15000);

    loadMonaco(loaded => {
        monaco = loaded;
        createEditor();
        if (overlayVisible) selectSidebarSprite(currentSpriteContext || '__stage__');
        acquireVM(onVMFound, () => {
            updateStatusBarVM('error');
            logToOutput('Couldn’t find the Scratch VM after 15 seconds. Compiling and injecting won’t work until the page is reloaded.', 'error');
        });
    });
}
