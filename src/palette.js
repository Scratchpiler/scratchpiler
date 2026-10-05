import { monacoEditor, currentVM, currentSpriteContext, activeFile, allSpriteNames, modelFor, savedSpriteCode, selectSidebarSprite, openHeader, fileLabel, revealPosition, compileAndInject, pullFromScratch, formatDocument, reindexProject, clearSavedCode, importFromLocalFile, exportToLocalFile, closeOverlay, setView, toggleSetting } from "./editor.js";
import { listHeaders, readHeader } from "./headers.js";
import { scratchIndex } from "./vm.js";
import { escapeHtml, plural, spriteLabel, openScrim, closeScrims, setBottomPanel, isBottomOpen } from "./ui-dom.js";
import { setDock, isDockOpen, revealVariable } from "./variables-panel.js";
import { startAdding, startCreatingHeader } from "./explorer.js";
import { variablesInScope, isCompilerVariable } from "./variables.js";
import { projectAnalysis, analyzeProject } from "./project-service.js";
import { projectSymbols } from "./project-analysis.js";
import { openEventFlow } from "./event-flow.js";

const $ = id => document.getElementById(id);
let items = [];
let focusIndex = 0;

function commands() {
    const toggleSidebar = () => $('sp-main').classList.contains('sp-no-side') ? setView('explorer') : $('sp-main').classList.add('sp-no-side');
    return [
        { group: 'Commands', text: 'Compile & inject', keys: 'Ctrl Enter', icon: '▶', run: () => compileAndInject() },
        { group: 'Commands', text: 'Compile & inject minified', keys: 'Ctrl Shift Enter', icon: '▶', run: () => compileAndInject({ minify: true }) },
        { group: 'Commands', text: 'Pull code from Scratch', keys: 'Alt Shift P', icon: '↓', run: pullFromScratch },
        { group: 'Commands', text: 'Format document', keys: 'Alt Shift F', icon: '≡', run: formatDocument },
        { group: 'Commands', text: 'Toggle variables panel', keys: 'Ctrl Shift V', icon: '▦', run: () => setDock(!isDockOpen()) },
        { group: 'Commands', text: 'New variable', icon: '+', run: () => startAdding('var') },
        { group: 'Commands', text: 'New list', icon: '+', run: () => startAdding('list') },
        { group: 'Commands', text: 'New header', icon: '+', run: startCreatingHeader },
        { group: 'Commands', text: 'Find in all sprites', keys: 'Ctrl Shift F', icon: '⌕', run: () => setView('search') },
        { group: 'Commands', text: 'Toggle sidebar', keys: 'Ctrl B', icon: '▏', run: toggleSidebar },
        { group: 'Commands', text: 'Toggle bottom panel', keys: 'Ctrl J', icon: '▁', run: () => setBottomPanel(!isBottomOpen()) },
        { group: 'Commands', text: 'Show problems', keys: 'Ctrl Shift M', icon: '!', run: () => setBottomPanel(true, 'problems') },
        { group: 'Commands', text: 'Show output', icon: '›', run: () => setBottomPanel(true, 'output') },
        { group: 'Commands', text: 'Toggle line wrap', keys: 'Alt Z', icon: '↩', run: () => toggleSetting('wrap') },
        { group: 'Commands', text: 'Toggle minimap', icon: '▥', run: () => toggleSetting('minimap') },
        { group: 'Commands', text: 'Open settings', keys: 'Ctrl ,', icon: '⚙', run: () => setView('settings') },
        { group: 'Commands', text: 'Re-index project', icon: '↻', run: reindexProject },
        { group: 'Commands', text: 'Show event flow', icon: '⇄', run: openEventFlow },
        { group: 'Commands', text: 'Go to symbol in project', keys: 'Ctrl T', icon: '#', run: () => openPalette('#') },
        { group: 'Commands', text: 'Analyze project again', icon: '↻', run: () => analyzeProject(currentVM) },
        { group: 'Commands', text: 'Clear saved code', icon: '⌫', run: clearSavedCode },
        { group: 'Commands', text: 'Open .sdsl file…', icon: '⤓', run: importFromLocalFile },
        { group: 'Commands', text: 'Save as .sdsl file…', keys: 'Ctrl Shift S', icon: '⤒', run: exportToLocalFile },
        { group: 'Commands', text: 'Keyboard shortcuts', keys: 'Ctrl /', icon: '⌨', run: () => openScrim('sp-keys-scrim') },
        { group: 'Commands', text: 'Close Scratchpiler', keys: 'Esc', icon: '✕', run: closeOverlay },
    ];
}

function files() {
    return [
        ...allSpriteNames().map(name => {
            const info = name === '__stage__' ? { costumes: scratchIndex.stage.backdrops } : scratchIndex.sprites.find(s => s.name === name);
            const sub = plural(info?.costumes?.length ?? 0, name === '__stage__' ? 'backdrop' : 'costume');
            return { group: 'Sprites', text: spriteLabel(name), sub, icon: name === '__stage__' ? '▣' : '◻', run: () => selectSidebarSprite(name) };
        }),
        ...listHeaders().map(name => ({ group: 'Headers', text: name, sub: 'header', icon: '{}', run: () => openHeader(name) })),
    ];
}

const SYMBOL_ICONS = { define: 'ƒ', routine: '↻', script: '⚑', enumMember: '#', struct: '{}' };
const symbolCache = new WeakMap();
function projectSymbolItems(linked) {
    if (!symbolCache.has(linked)) {
        symbolCache.set(linked, projectSymbols(linked).map(sym => ({
            group: 'Symbols in the project',
            text: sym.kind === 'define' ? `${sym.name}()` : sym.label,
            sub: `${spriteLabel(sym.sprite)}, line ${sym.line}`,
            icon: SYMBOL_ICONS[sym.kind] ?? '·',
            run: () => revealPosition({ kind: 'sprite', name: sym.sprite }, sym.line, sym.col),
        })));
    }
    return symbolCache.get(linked);
}

const DEFINITION = /^\s*(define|scratchroutine)\s+(\w+)\s*(\([^)]*\))?/;
const HAT = /^\s*on\s+(.+?)\s*\{/;
function symbols() {
    const linked = projectAnalysis();
    if (linked) return projectSymbolItems(linked);
    const found = [];
    const sources = [
        ...allSpriteNames().map(name => ({ file: { kind: 'sprite', name }, text: modelFor({ kind: 'sprite', name })?.getValue() ?? savedSpriteCode(name) ?? '' })),
        ...listHeaders().map(name => ({ file: { kind: 'header', name }, text: modelFor({ kind: 'header', name })?.getValue() ?? readHeader(name) ?? '' })),
    ];
    for (const { file, text } of sources) {
        text.split('\n').forEach((line, i) => {
            if (found.length > 400) return;
            const def = line.match(DEFINITION);
            const hat = !def && line.match(HAT);
            if (!def && !hat) return;
            found.push({
                group: 'Blocks and scripts',
                text: def ? `${def[2]}${def[3] || '()'}` : `on ${hat[1]}`,
                sub: `${fileLabel(file)}, line ${i + 1}`,
                icon: def ? 'ƒ' : '⚑',
                run: () => revealPosition(file, i + 1),
            });
        });
    }
    return found;
}

function variables() {
    if (!currentVM) return [];
    const { local, global } = variablesInScope(currentVM, currentSpriteContext || '__stage__');
    return [...local, ...global].filter(v => !isCompilerVariable(v.name)).map(v => ({
        group: 'Variables and lists',
        text: `[${v.name}]`,
        sub: v.kind === 'list' ? plural(v.value.length, 'item') : String(v.value),
        icon: v.kind === 'list' ? '☰' : '▢',
        run: () => revealVariable(v.id),
    }));
}

function fuzzyMatch(query, text) {
    const q = query.toLowerCase(), t = text.toLowerCase();
    const marks = [];
    let j = 0;
    for (let i = 0; i < t.length && j < q.length; i++) if (t[i] === q[j]) { marks.push(i); j++; }
    return j === q.length ? marks : null;
}

function lineItem(query) {
    const model = monacoEditor?.getModel();
    const file = activeFile();
    if (!model || !file) return [{ group: 'Go to line', text: 'Open a sprite first', icon: '#', run: () => {} }];
    const max = model.getLineCount();
    const n = parseInt(query, 10);
    return [{
        group: 'Go to line',
        text: n ? `Go to line ${Math.min(n, max)} in ${fileLabel(file)}` : `Type a line number from 1 to ${max}`,
        icon: '#',
        run: () => n && revealPosition(file, Math.min(n, max)),
    }];
}

function render() {
    const raw = $('sp-palette-input').value;
    let query = raw.trim(), pool;
    if (raw.startsWith(':')) { items = lineItem(raw.slice(1)); draw(); return; }
    if (raw.startsWith('>')) { pool = commands(); query = raw.slice(1).trim(); }
    else if (raw.startsWith('@')) { pool = files(); query = raw.slice(1).trim(); }
    else if (raw.startsWith('#')) { pool = symbols(); query = raw.slice(1).trim(); }
    else pool = query ? [...files(), ...symbols(), ...variables(), ...commands()] : [...files(), ...commands().slice(0, 6)];
    items = query ? pool.map(it => ({ ...it, marks: fuzzyMatch(query, it.text) })).filter(it => it.marks) : pool;
    draw();
}

function draw() {
    focusIndex = 0;
    let group = '', html = '';
    items.forEach((it, i) => {
        if (it.group !== group) { html += `<div class="sp-grp">${escapeHtml(it.group)}</div>`; group = it.group; }
        const label = it.marks ? [...it.text].map((c, j) => it.marks.includes(j) ? `<em>${escapeHtml(c)}</em>` : escapeHtml(c)).join('') : escapeHtml(it.text);
        const right = it.keys ? `<kbd>${escapeHtml(it.keys)}</kbd>` : it.sub ? `<span class="sp-sub">${escapeHtml(it.sub)}</span>` : '';
        html += `<div class="sp-res" data-i="${i}"><span class="sp-ic">${escapeHtml(it.icon || '·')}</span><span class="sp-lb">${label}</span>${right}</div>`;
    });
    $('sp-palette-results').innerHTML = html || '<div class="sp-empty">Nothing matches. Try a sprite, block or variable name, or start with &gt; for commands.</div>';
    highlight();
}

function highlight() {
    document.querySelectorAll('#sp-palette-results .sp-res').forEach((el, i) => {
        el.classList.toggle('sp-on', i === focusIndex);
        if (i === focusIndex) el.scrollIntoView({ block: 'nearest' });
    });
}

function choose(index) {
    const item = items[index];
    if (!item) return;
    closeScrims();
    item.run();
}

export function openPalette(prefix = '') {
    openScrim('sp-palette-scrim');
    const input = $('sp-palette-input');
    input.value = prefix;
    input.focus();
    render();
}

export function setupPalette() {
    const input = $('sp-palette-input');
    input.addEventListener('input', render);
    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); focusIndex = Math.min(focusIndex + 1, items.length - 1); highlight(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); focusIndex = Math.max(focusIndex - 1, 0); highlight(); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(focusIndex); }
    });
    $('sp-palette-results').addEventListener('click', e => {
        const row = e.target.closest('.sp-res');
        if (row) choose(+row.dataset.i);
    });
    $('sp-palette-btn').addEventListener('click', () => openPalette());
}
