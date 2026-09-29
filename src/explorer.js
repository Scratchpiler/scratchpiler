import { currentVM, currentSpriteContext, editingHeader, monacoEditor, selectSidebarSprite, openHeader, isSpriteDirty, problemCounts, compileAndInject, pullFromScratch, exportToLocalFile, allSpriteNames, setView, closeTabs, openTabs, fileKey, reindexProject } from "./editor.js";
import { scratchIndex, reindex } from "./vm.js";
import { listHeaders, readHeader, writeHeader, deleteHeader, renameHeader } from "./headers.js";
import { escapeHtml, plural, spriteLabel, toast, logToOutput, showMenu } from "./ui-dom.js";
import { variablesInScope, createVariable, deleteVariable, targetForSprite, isCompilerVariable, CLOUD_PREFIX } from "./variables.js";
import { revealVariable, renderVariablesPanel, setDock } from "./variables-panel.js";
import { searchFor } from "./search-panel.js";

const $ = id => document.getElementById(id);
const ICON = {
    chev: '<svg class="sp-chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg>',
    plus: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    rename: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    del: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
    pull: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    insert: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12h12M12 6l6 6-6 6M20 5v14"/></svg>',
};
export const CLOUD_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-label="Cloud variable"><path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.5 4.3 4.3 0 0 0 7 18z"/></svg>';

const closedSections = new Set(['Costumes', 'Backdrops', 'Sounds']);
let adding = null;
let addScope = 'local';
let lastSignature = '';

const thumbnailCache = new Map();
function thumbnailUrl(sprite) {
    if (!currentVM) return null;
    const target = targetForSprite(currentVM, sprite);
    const costume = target?.getCostumes?.()[target.currentCostume];
    const asset = costume?.asset;
    if (!asset?.data) return null;
    const key = asset.assetId || costume.assetId;
    if (!thumbnailCache.has(key)) {
        try {
            const type = asset.assetType?.contentType || (asset.dataFormat === 'svg' ? 'image/svg+xml' : 'image/png');
            thumbnailCache.set(key, URL.createObjectURL(new Blob([asset.data], { type })));
        } catch (_) {
            thumbnailCache.set(key, null);
        }
    }
    return thumbnailCache.get(key);
}

export const blockDisplayName = proccode => {
    const name = proccode.split(' ')[0];
    const argCount = (proccode.match(/%[snb]/g) || []).length;
    return { name, label: `${name}(${argCount ? '…' : ''})` };
};

const selectedSprite = () => currentSpriteContext || '__stage__';

function spriteVariables(sprite) {
    if (currentVM) return variablesInScope(currentVM, sprite);
    const toEntry = scope => v => ({ id: v.id, name: v.name, kind: v.type === 'list' ? 'list' : 'var', value: '', scope });
    return {
        local: sprite === '__stage__' ? [] : (scratchIndex.spriteVariables[sprite] || []).map(toEntry('local')),
        global: scratchIndex.globalVariables.map(toEntry('global')),
    };
}

const visibleVariables = list => list.filter(v => !isCompilerVariable(v.name));
const livePreview = v => v.kind === 'list'
    ? plural(Array.isArray(v.value) ? v.value.length : 0, 'item')
    : String(v.value ?? '');

function explorerSignature() {
    const sprite = selectedSprite();
    const vars = spriteVariables(sprite);
    return JSON.stringify([
        allSpriteNames(), sprite, editingHeader,
        allSpriteNames().map(s => [isSpriteDirty(s), problemCounts.get(s), thumbnailUrl(s)]),
        [...vars.local, ...vars.global].map(v => [v.id, v.name, v.kind, v.isCloud]),
        scratchIndex.customBlocks[sprite], scratchIndex.sprites.find(s => s.name === sprite), scratchIndex.stage,
        [...closedSections], adding, addScope,
    ]);
}

export function renderExplorer() {
    const list = $('scratchpiler-sprites-list');
    if (!list) return;
    if ($('sp-details')?.contains(document.activeElement) && document.activeElement.matches('input')) return;
    const signature = explorerSignature();
    if (signature === lastSignature) return;
    lastSignature = signature;
    renderSpriteList(list);
    renderDetails();
}

function renderSpriteList(list) {
    const names = allSpriteNames();
    $('sp-sprite-count').textContent = names.length;
    list.innerHTML = names.map(name => {
        const counts = problemCounts.get(name);
        const problems = counts ? counts.errors + counts.warnings : 0;
        const url = thumbnailUrl(name);
        const thumb = url
            ? `<span class="sp-thumb"><img src="${escapeHtml(url)}" alt=""></span>`
            : name === '__stage__'
                ? '<span class="sp-thumb sp-stage"></span>'
                : `<span class="sp-thumb">${escapeHtml(name[0] || '?')}</span>`;
        const active = !editingHeader && name === currentSpriteContext;
        return `<div class="sp-row sp-sprite${active ? ' sp-on' : ''}" tabindex="0" data-sprite="${escapeHtml(name)}">${thumb}
            <span class="sp-nm">${escapeHtml(spriteLabel(name))}</span>
            ${isSpriteDirty(name) ? '<span class="sp-state" title="Changed since last inject"></span>' : ''}
            ${problems ? `<span class="sp-pcount${counts.errors ? ' sp-err' : ''}" title="${plural(problems, 'problem')}">${problems}</span>` : ''}
            <span class="sp-acts"><button data-act="pull" title="Pull code from Scratch">${ICON.pull}</button></span></div>`;
    }).join('');
}

function section(title, count, body, addKind) {
    const closed = closedSections.has(title);
    const addBtn = addKind ? `<button class="sp-add" data-add="${addKind}" title="New ${addKind === 'var' ? 'variable' : 'list'}">${ICON.plus}</button>` : '';
    const form = addKind && adding === addKind ? newVariableForm(addKind) : '';
    return `<div class="sp-sec-h${closed ? ' sp-closed' : ''}" data-sec="${title}">${ICON.chev}${title}<span class="sp-n">${count}</span><span class="sp-grow"></span>${addBtn}</div>
        <div class="sp-sec-b">${form}${body || '<div class="sp-row sp-empty-row">None yet</div>'}</div>`;
}

function variableRows(kind) {
    const sprite = selectedSprite();
    const vars = spriteVariables(sprite);
    const groups = [
        ['This sprite only', visibleVariables(vars.local).filter(v => v.kind === kind)],
        ['All sprites', visibleVariables(vars.global).filter(v => v.kind === kind)],
    ].filter(([, items]) => items.length);
    const count = groups.reduce((n, [, items]) => n + items.length, 0);
    const html = groups.map(([title, items]) => (sprite === '__stage__' ? '' : `<div class="sp-subgroup">${title}</div>`) + items.map(v => {
        const name = v.isCloud ? `<span class="sp-g-cloud">${CLOUD_ICON}</span> ${escapeHtml(v.name.slice(CLOUD_PREFIX.length))}` : escapeHtml(v.name);
        return `<div class="sp-row sp-clickable" tabindex="0" data-var-id="${escapeHtml(v.id)}" data-target-id="${escapeHtml(v.targetId || '')}" title="Edit in the Variables panel">
            <span class="sp-glyph ${kind === 'list' ? 'sp-g-list' : 'sp-g-var'}"></span><span class="sp-nm sp-mono">${name}</span>
            <span class="sp-meta sp-live" data-live-id="${escapeHtml(v.id)}">${escapeHtml(livePreview(v))}</span>
            <span class="sp-acts"><button data-var-act="rename" title="Rename">${ICON.rename}</button><button class="sp-danger" data-var-act="delete" title="Delete">${ICON.del}</button></span></div>`;
    }).join('')).join('');
    return { count, html };
}

function newVariableForm(kind) {
    const noun = kind === 'var' ? 'variable' : 'list';
    const scope = selectedSprite() === '__stage__' ? '' :
        `<span class="sp-seg" id="sp-new-scope"><button data-scope="local" aria-pressed="${addScope === 'local'}">This sprite only</button><button data-scope="global" aria-pressed="${addScope === 'global'}">All sprites</button></span>`;
    return `<div class="sp-inline-new"><input id="sp-new-var-name" placeholder="New ${noun} name" spellcheck="false" autocomplete="off" aria-label="New ${noun} name">${scope}
        <div class="sp-hint"><span>Enter to create</span><span>Esc to cancel</span></div></div>`;
}

function renderDetails() {
    const sprite = selectedSprite();
    const isStage = sprite === '__stage__';
    $('scratchpiler-detail-spritename').textContent = spriteLabel(sprite);
    $('sp-detail-sub').textContent = isStage ? 'shared by all sprites' : '';
    const info = isStage ? { costumes: scratchIndex.stage.backdrops, sounds: scratchIndex.stage.sounds } : (scratchIndex.sprites.find(s => s.name === sprite) || { costumes: [], sounds: [] });
    const blocks = scratchIndex.customBlocks[sprite] || [];
    const vars = variableRows('var'), lists = variableRows('list');
    const costumeTitle = isStage ? 'Backdrops' : 'Costumes';
    const insertFn = isStage ? 'switchBackdrop' : 'switchCostume';

    $('sp-details').innerHTML =
        section('Variables', vars.count, vars.html, 'var') +
        section('Lists', lists.count, lists.html, 'list') +
        section('Custom blocks', blocks.length, blocks.map(p => {
            const { name, label } = blockDisplayName(p);
            return `<div class="sp-row sp-clickable" tabindex="0" data-block="${escapeHtml(name)}" title="Go to definition">
                <span class="sp-glyph sp-g-block"></span><span class="sp-nm sp-mono">${escapeHtml(label)}</span>
                <span class="sp-acts"><button data-block-act="insert" title="Insert a call at the cursor">${ICON.insert}</button></span></div>`;
        }).join('')) +
        section(costumeTitle, info.costumes.length, info.costumes.map((c, i) =>
            `<div class="sp-row sp-clickable" data-insert="${escapeHtml(`${insertFn}("${c}")`)}" title="Insert ${escapeHtml(`${insertFn}("${c}")`)}"><span class="sp-glyph sp-g-look"></span><span class="sp-nm">${escapeHtml(c)}</span><span class="sp-meta">${i + 1}</span></div>`).join('')) +
        section('Sounds', info.sounds.length, info.sounds.map(s =>
            `<div class="sp-row sp-clickable" data-insert="${escapeHtml(`play("${s}")`)}" title="Insert ${escapeHtml(`play("${s}")`)}"><span class="sp-glyph sp-g-sound"></span><span class="sp-nm">${escapeHtml(s)}</span></div>`).join(''));
    $('sp-new-var-name')?.focus();
}

export function updateExplorerLiveValues() {
    if (!currentVM) return;
    const elements = document.querySelectorAll('#sp-details [data-live-id]');
    if (!elements.length) return;
    const vars = spriteVariables(selectedSprite());
    const byId = new Map([...vars.local, ...vars.global].map(v => [v.id, v]));
    elements.forEach(el => {
        const v = byId.get(el.dataset.liveId);
        const text = v ? livePreview(v) : '';
        if (el.textContent !== text) el.textContent = text;
    });
}

function insertAtCursor(text) {
    if (!monacoEditor?.getModel()) return;
    monacoEditor.trigger('scratchpiler', 'type', { text });
    monacoEditor.focus();
}

function goToDefinition(blockName) {
    const model = monacoEditor?.getModel();
    const pattern = new RegExp(`^\\s*(define|scratchroutine)\\s+${blockName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    const line = model ? model.getLinesContent().findIndex(l => pattern.test(l)) : -1;
    if (line < 0) { toast(`${blockName}() isn’t defined in this file. It may come from a header.`, 'warn'); return; }
    monacoEditor.setPosition({ lineNumber: line + 1, column: 1 });
    monacoEditor.revealLineInCenter(line + 1);
    monacoEditor.focus();
}

function findVariableEntry(targetId, id) {
    const vars = spriteVariables(selectedSprite());
    return [...vars.local, ...vars.global].find(v => v.id === id && (!targetId || v.targetId === targetId));
}

export function removeVariable(targetId, id) {
    if (!currentVM) return;
    const removed = deleteVariable(currentVM, targetId, id);
    if (!removed) return;
    reindex(currentVM);
    renderExplorer();
    renderVariablesPanel();
    const noun = removed.kind === 'list' ? 'list' : 'variable';
    logToOutput(`Deleted ${noun} [${removed.name}]`, 'warn');
    toast(`Deleted ${noun} [${removed.name}]`, 'warn', {
        label: 'Undo',
        run: () => { removed.restore(); reindex(currentVM); renderExplorer(); renderVariablesPanel(); },
    });
}

export function variableMenuItems(targetId, id) {
    const v = findVariableEntry(targetId, id);
    if (!v) return [];
    const noun = v.kind === 'list' ? 'list' : 'variable';
    return [
        { text: v.kind === 'list' ? 'Edit items' : 'Edit value', run: () => revealVariable(id, 'value') },
        { text: 'Rename', run: () => revealVariable(id, 'name') },
        { text: 'Insert at cursor', run: () => insertAtCursor(`[${v.name}]`) },
        { text: 'Find all references', run: () => searchFor(`[${v.name}]`, { wholeWord: false }) },
        '-',
        { text: `Delete ${noun}`, danger: true, run: () => removeVariable(v.targetId, id) },
    ];
}

export function spriteMenuItems(sprite) {
    const open = () => selectSidebarSprite(sprite);
    return [
        { text: 'Open', run: open },
        { text: 'Compile & inject', run: () => { open(); compileAndInject(); } },
        { text: 'Pull code from Scratch', run: () => { open(); pullFromScratch(); } },
        '-',
        { text: 'New variable', run: () => { open(); startAdding('var'); } },
        { text: 'New list', run: () => { open(); startAdding('list'); } },
        { text: 'Show variables', run: () => { open(); setDock(true); } },
        '-',
        { text: 'Save as .sdsl file…', run: () => { open(); exportToLocalFile(); } },
    ];
}

export function startAdding(kind) {
    setView('explorer');
    adding = kind;
    closedSections.delete(kind === 'var' ? 'Variables' : 'Lists');
    lastSignature = '';
    renderExplorer();
}

function finishAdding(name) {
    if (!currentVM) { toast('Scratch isn’t connected yet. Try again in a moment.', 'error'); return; }
    const kind = adding;
    const result = createVariable(currentVM, selectedSprite(), name, { kind, global: addScope === 'global' });
    if (result.error) { toast(result.error, 'warn'); return; }
    const noun = kind === 'var' ? 'variable' : 'list';
    const where = result.global ? 'for all sprites' : `on ${spriteLabel(selectedSprite())}`;
    toast(`Created ${noun} [${result.name}] ${where}`);
    logToOutput(`Created ${noun} [${result.name}] ${where}`, 'ok');
    adding = null;
    reindex(currentVM);
    lastSignature = '';
    renderExplorer();
    renderVariablesPanel();
}

function setupSpritesAndDetails() {
    const side = $('scratchpiler-sidebar');
    side.addEventListener('click', e => {
        const addBtn = e.target.closest('[data-add]');
        if (addBtn) { e.stopPropagation(); adding === addBtn.dataset.add ? (adding = null, lastSignature = '', renderExplorer()) : startAdding(addBtn.dataset.add); return; }
        const scopeBtn = e.target.closest('[data-scope]');
        if (scopeBtn) {
            addScope = scopeBtn.dataset.scope;
            document.querySelectorAll('#sp-new-scope button').forEach(b => b.setAttribute('aria-pressed', String(b === scopeBtn)));
            $('sp-new-var-name')?.focus();
            return;
        }
        if (e.target.closest('#sp-reindex-mini')) { e.stopPropagation(); reindexProject(); return; }
        const header = e.target.closest('.sp-sec-h[data-sec]');
        if (header) {
            const title = header.dataset.sec;
            if (title === 'Sprites') { header.classList.toggle('sp-closed'); return; }
            closedSections.has(title) ? closedSections.delete(title) : closedSections.add(title);
            lastSignature = '';
            renderExplorer();
            return;
        }
        const varRow = e.target.closest('[data-var-id]');
        if (varRow) {
            const act = e.target.closest('[data-var-act]')?.dataset.varAct;
            if (act === 'delete') removeVariable(varRow.dataset.targetId, varRow.dataset.varId);
            else revealVariable(varRow.dataset.varId, act === 'rename' ? 'name' : 'value');
            return;
        }
        const blockRow = e.target.closest('[data-block]');
        if (blockRow) {
            if (e.target.closest('[data-block-act="insert"]')) insertAtCursor(`${blockRow.dataset.block}()`);
            else goToDefinition(blockRow.dataset.block);
            return;
        }
        const insertRow = e.target.closest('[data-insert]');
        if (insertRow) { insertAtCursor(insertRow.dataset.insert); return; }
        const spriteRow = e.target.closest('.sp-sprite[data-sprite]');
        if (spriteRow) {
            selectSidebarSprite(spriteRow.dataset.sprite);
            if (e.target.closest('[data-act="pull"]')) pullFromScratch();
        }
    });

    side.addEventListener('keydown', e => {
        if (e.target.id === 'sp-new-var-name') {
            if (e.key === 'Escape') { adding = null; lastSignature = ''; renderExplorer(); }
            else if (e.key === 'Enter') { e.target.blur(); finishAdding(e.target.value); }
            return;
        }
        if (e.key === 'Enter' && e.target.matches('.sp-sprite, [data-var-id], [data-block], [data-h]')) e.target.click();
    });

    side.addEventListener('contextmenu', e => {
        const at = { x: e.clientX, y: e.clientY };
        const sprite = e.target.closest('.sp-sprite[data-sprite]');
        const variable = e.target.closest('[data-var-id]');
        const block = e.target.closest('[data-block]');
        const header = e.target.closest('[data-h]');
        let items = null;
        if (sprite) items = spriteMenuItems(sprite.dataset.sprite);
        else if (variable) items = variableMenuItems(variable.dataset.targetId, variable.dataset.varId);
        else if (block) items = [
            { text: 'Go to definition', run: () => goToDefinition(block.dataset.block) },
            { text: 'Insert a call at the cursor', run: () => insertAtCursor(`${block.dataset.block}()`) },
            { text: 'Find all references', run: () => searchFor(block.dataset.block, { wholeWord: true }) },
        ];
        else if (header) items = headerMenuItems(header.dataset.h);
        if (!items) return;
        e.preventDefault();
        showMenu(items, at);
    });
}

let creatingHeader = false;
let renamingHeader = null;

export function renderHeadersList() {
    const list = $('sp-headers-list');
    if (!list) return;
    const names = listHeaders();
    const includers = name => allSpriteNames().filter(s => (localStorage.getItem(`scratchpiler-content-${s}`) || '').includes(`<${name}>`)).map(spriteLabel);
    const newRow = creatingHeader
        ? '<div class="sp-row"><span class="sp-glyph sp-g-header"></span><input class="sp-inline-input" id="sp-new-header-name" placeholder="name.h" spellcheck="false" autocomplete="off" aria-label="New header name"></div>'
        : '';
    list.innerHTML = newRow + (names.map(name => {
        if (renamingHeader === name) {
            return `<div class="sp-row" data-h="${escapeHtml(name)}"><span class="sp-glyph sp-g-header"></span><input class="sp-inline-input" id="sp-rename-header" value="${escapeHtml(name)}" spellcheck="false" autocomplete="off" aria-label="Rename ${escapeHtml(name)}"></div>`;
        }
        const users = includers(name);
        const meta = users.length ? `used by ${users.join(', ')}` : plural((readHeader(name) || '').split('\n').length, 'line');
        return `<div class="sp-row sp-sprite${editingHeader === name ? ' sp-on' : ''}" tabindex="0" data-h="${escapeHtml(name)}">
            <span class="sp-glyph sp-g-header"></span><span class="sp-nm sp-mono">${escapeHtml(name)}</span><span class="sp-meta">${escapeHtml(meta)}</span>
            <span class="sp-acts"><button data-h-act="rename" title="Rename">${ICON.rename}</button><button class="sp-danger" data-h-act="delete" title="Delete">${ICON.del}</button></span></div>`;
    }).join('') || (creatingHeader ? '' : '<div class="sp-row sp-empty-row">No headers yet</div>'));
    const input = $('sp-new-header-name') || $('sp-rename-header');
    if (input) { input.focus(); input.select(); }
}

const withHeaderExtension = name => name.trim().endsWith('.h') ? name.trim() : `${name.trim()}.h`;

function createHeader(raw) {
    creatingHeader = false;
    if (!raw.trim()) { renderHeadersList(); return; }
    const name = withHeaderExtension(raw);
    if (readHeader(name) !== null) { toast(`A header named ${name} already exists`, 'warn'); renderHeadersList(); return; }
    try { writeHeader(name, `// ${name}: define, scratchroutine, enum and struct declarations\n`); }
    catch (err) { toast(err.message, 'warn'); renderHeadersList(); return; }
    renderHeadersList();
    openHeader(name);
}

function finishRenamingHeader(oldName, raw) {
    renamingHeader = null;
    const newName = withHeaderExtension(raw);
    if (!raw.trim() || newName === oldName) { renderHeadersList(); return; }
    try { renameHeader(oldName, newName); }
    catch (err) { toast(err.message, 'warn'); renderHeadersList(); return; }
    const key = fileKey({ kind: 'header', name: oldName });
    const wasOpen = openTabs.some(t => fileKey(t) === key);
    if (wasOpen) { closeTabs([key]); openHeader(newName); }
    renderHeadersList();
    toast(`Renamed ${oldName} to ${newName}. Update any #include lines that use the old name.`);
}

export function removeHeader(name) {
    const text = readHeader(name) ?? '';
    const key = fileKey({ kind: 'header', name });
    if (openTabs.some(t => fileKey(t) === key)) closeTabs([key]);
    deleteHeader(name);
    renderHeadersList();
    toast(`Deleted ${name}`, 'warn', { label: 'Undo', run: () => { writeHeader(name, text); renderHeadersList(); } });
}

function headerMenuItems(name) {
    return [
        { text: 'Open', run: () => openHeader(name) },
        { text: 'Rename', run: () => { renamingHeader = name; renderHeadersList(); } },
        { text: 'Find where it’s included', run: () => searchFor(`<${name}>`, { wholeWord: false }) },
        '-',
        { text: 'Delete header', danger: true, run: () => removeHeader(name) },
    ];
}

export function startCreatingHeader() {
    setView('headers');
    creatingHeader = true;
    renderHeadersList();
}

function setupHeaders() {
    $('sp-headers-new').addEventListener('click', () => { creatingHeader = true; renderHeadersList(); });
    const list = $('sp-headers-list');
    list.addEventListener('click', e => {
        const row = e.target.closest('[data-h]');
        if (!row || e.target.matches('input')) return;
        const act = e.target.closest('[data-h-act]')?.dataset.hAct;
        if (act === 'delete') removeHeader(row.dataset.h);
        else if (act === 'rename') { renamingHeader = row.dataset.h; renderHeadersList(); }
        else openHeader(row.dataset.h);
    });
    list.addEventListener('keydown', e => {
        if (e.target.id === 'sp-new-header-name') {
            if (e.key === 'Enter') createHeader(e.target.value);
            if (e.key === 'Escape') { creatingHeader = false; renderHeadersList(); }
        } else if (e.target.id === 'sp-rename-header') {
            const oldName = e.target.closest('[data-h]').dataset.h;
            if (e.key === 'Enter') finishRenamingHeader(oldName, e.target.value);
            if (e.key === 'Escape') { renamingHeader = null; renderHeadersList(); }
        }
    });
    list.addEventListener('focusout', e => {
        if (e.target.id === 'sp-new-header-name' && creatingHeader) createHeader(e.target.value);
        else if (e.target.id === 'sp-rename-header' && renamingHeader) finishRenamingHeader(renamingHeader, e.target.value);
    });
}

export function setupExplorer() {
    setupSpritesAndDetails();
    setupHeaders();
    renderHeadersList();
}
