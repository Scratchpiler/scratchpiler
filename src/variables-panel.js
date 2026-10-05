import { currentVM, currentSpriteContext, rewriteVariableReferences } from "./editor.js";
import { reindex } from "./vm.js";
import { escapeHtml, plural, spriteLabel, toast, logToOutput, showMenu, makeResizer } from "./ui-dom.js";
import { variablesInScope, findVariable, renameVariable, setVariableValue, isCompilerVariable, CLOUD_PREFIX } from "./variables.js";
import { renderExplorer, removeVariable, variableMenuItems, CLOUD_ICON } from "./explorer.js";

const $ = id => document.getElementById(id);
const HUGE_LIST_ITEMS = 10000;
const HUGE_VALUE_CHARS = 1000000;
const DELETE_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>';
const CHEVRON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9l6 6 6-6"/></svg>';
const RUN_STATE_COPY = {
    running: { label: 'Live', title: 'Values update while the project runs', note: '' },
    paused: { label: 'Paused', title: 'Paused at a breakpoint', note: 'Values are from the moment the breakpoint paused the project.' },
    stopped: { label: 'Stopped', title: 'The project isn’t running. Edits apply right away.', note: '' },
};

const expandedLists = new Set();
const revealedHuge = new Set();
let filter = '';
let showInternal = false;
let lastSignature = '';
let shownRunState = null;

export const isDockOpen = () => !$('sp-main').classList.contains('sp-no-dock');

export function setDock(open) {
    $('sp-main').classList.toggle('sp-no-dock', !open);
    $('sp-dock-toggle').setAttribute('aria-pressed', String(open));
    if (open) { lastSignature = ''; renderVariablesPanel(); }
}

const scopeSprite = () => currentSpriteContext || '__stage__';
const displayName = v => v.isCloud ? v.name.slice(CLOUD_PREFIX.length) : v.name;
const listText = v => (Array.isArray(v.value) ? v.value : []).join('\n');
const isHuge = v => v.kind === 'list'
    ? (v.value?.length ?? 0) > HUGE_LIST_ITEMS
    : String(v.value ?? '').length > HUGE_VALUE_CHARS;

function visibleGroups() {
    if (!currentVM) return [];
    const sprite = scopeSprite();
    const { local, global } = variablesInScope(currentVM, sprite);
    const q = filter.toLowerCase();
    const keep = v => (showInternal || !isCompilerVariable(v.name)) && (!q || v.name.toLowerCase().includes(q));
    const order = list => [...list.filter(v => v.kind === 'var'), ...list.filter(v => v.kind === 'list')];
    return [
        { title: `${spriteLabel(sprite)} only`, items: order(local.filter(keep)) },
        { title: 'All sprites', items: order(global.filter(keep)) },
    ].filter(g => g.items.length);
}

function variableRow(v) {
    const glyph = v.isCloud
        ? `<span class="sp-g-cloud" title="Cloud variable">${CLOUD_ICON}</span>`
        : `<span class="sp-glyph ${v.kind === 'list' ? 'sp-g-list' : 'sp-g-var'}" title="${v.kind === 'list' ? 'List' : 'Variable'}"></span>`;
    const name = displayName(v);
    const nameInput = `<input class="sp-vname" id="sp-v-${escapeHtml(v.id)}-name" value="${escapeHtml(name)}" data-orig="${escapeHtml(name)}" spellcheck="false" autocomplete="off" aria-label="Name of ${escapeHtml(name)}">`;
    const del = `<button class="sp-vdel" data-vdel title="Delete ${escapeHtml(name)}">${DELETE_ICON}</button>`;
    const attrs = `data-id="${escapeHtml(v.id)}" data-target="${escapeHtml(v.targetId)}" data-kind="${v.kind}" data-scope="${v.scope}"`;

    if (v.kind === 'var') {
        const value = isHuge(v) && !revealedHuge.has(v.id) ? '' : String(v.value ?? '');
        const placeholder = isHuge(v) && !revealedHuge.has(v.id) ? ` placeholder="Too long to show (${plural(String(v.value).length, 'character')})"` : '';
        return `<div class="sp-vrow" ${attrs}>${glyph}${nameInput}<input class="sp-vval" id="sp-v-${escapeHtml(v.id)}-val" value="${escapeHtml(value)}"${placeholder} spellcheck="false" autocomplete="off" aria-label="Value of ${escapeHtml(name)}">${del}</div>`;
    }

    const open = expandedLists.has(v.id);
    const count = v.value?.length ?? 0;
    const button = `<button class="sp-vlist-btn" data-toggle-list aria-expanded="${open}" title="${escapeHtml(listText(v).slice(0, 200))}"><b>${plural(count, 'item')}</b>${CHEVRON}</button>`;
    let editor = '';
    if (open && isHuge(v) && !revealedHuge.has(v.id)) {
        editor = `<div class="sp-vlist-ed" data-list-for="${escapeHtml(v.id)}"><div class="sp-vlist-big">[${escapeHtml(name)}] has ${plural(count, 'item')}. Showing all of them can slow the editor down.<button class="sp-btn" data-show-huge>Show anyway</button></div></div>`;
    } else if (open) {
        editor = `<div class="sp-vlist-ed" data-list-for="${escapeHtml(v.id)}"><div class="sp-vlist-body"><div class="sp-vlist-gutter">${gutterLines(count)}</div>
            <textarea id="sp-v-${escapeHtml(v.id)}-items" rows="${Math.max(1, count)}" spellcheck="false" aria-label="Items of ${escapeHtml(name)}, one per line">${escapeHtml(listText(v))}</textarea></div>
            <div class="sp-vlist-foot"><span>One item per line</span><span>Changes apply when you click away</span></div></div>`;
    }
    return `<div class="sp-vrow" ${attrs}>${glyph}${nameInput}${button}${del}</div>${editor}`;
}

const gutterLines = n => Array.from({ length: Math.max(1, n) }, (_, i) => i + 1).join('<br>');

function signature(groups) {
    return JSON.stringify([scopeSprite(), filter, showInternal, [...expandedLists], [...revealedHuge],
        groups.map(g => [g.title, g.items.map(v => [v.id, v.name, v.kind, v.isCloud, isHuge(v)])])]);
}

export function renderVariablesPanel() {
    renderRunState(shownRunState || 'stopped');
    if (!isDockOpen()) return;
    const body = $('sp-dock-body');
    if (!currentVM) { body.innerHTML = '<div class="sp-empty">Waiting for Scratch to load…</div>'; lastSignature = ''; return; }
    const groups = visibleGroups();
    const sig = signature(groups);
    if (sig === lastSignature) return;
    if (body.contains(document.activeElement) && document.activeElement.matches('input, textarea')) return;
    lastSignature = sig;
    body.innerHTML = groups.map(g => `<div class="sp-vgroup">${escapeHtml(g.title)}</div>` + g.items.map(variableRow).join('')).join('')
        || `<div class="sp-empty">${filter ? `No variables or lists match “${escapeHtml(filter)}”.` : `${escapeHtml(spriteLabel(scopeSprite()))} has no variables or lists yet. Use + in the explorer to add one.`}</div>`;
}

function renderRunState(state) {
    const copy = RUN_STATE_COPY[state];
    const el = $('sp-vars-state');
    el.innerHTML = `<span class="sp-live-dot${state === 'running' ? '' : ` sp-${state}`}"></span>${copy.label}`;
    el.title = copy.title;
    $('sp-dock-note').textContent = copy.note;
    $('sp-dock-note').hidden = !copy.note;
}

function flash(input) {
    input.classList.remove('sp-flash');
    void input.offsetWidth;
    input.classList.add('sp-flash');
}

export function tickVariablesPanel(runState) {
    if (runState !== shownRunState) { shownRunState = runState; renderRunState(runState); }
    if (!isDockOpen() || !currentVM) return;
    renderVariablesPanel();
    const active = document.activeElement;
    document.querySelectorAll('#sp-dock-body .sp-vrow').forEach(row => {
        const found = findVariable(currentVM, row.dataset.target, row.dataset.id);
        if (!found) return;
        const value = found.variable.value;
        if (row.dataset.kind === 'var') {
            const input = row.querySelector('.sp-vval');
            if (input === active || input.placeholder) return;
            const text = String(value ?? '');
            if (input.value !== text) { input.value = text; flash(input); }
            return;
        }
        const count = Array.isArray(value) ? value.length : 0;
        const label = row.querySelector('.sp-vlist-btn b');
        const countText = plural(count, 'item');
        if (label.textContent !== countText) label.textContent = countText;
        const editor = row.nextElementSibling?.matches('.sp-vlist-ed') ? row.nextElementSibling : null;
        const textarea = editor?.querySelector('textarea');
        if (!textarea || textarea === active) return;
        const text = (Array.isArray(value) ? value : []).join('\n');
        if (textarea.value !== text) {
            textarea.value = text;
            textarea.rows = Math.max(1, count);
            editor.querySelector('.sp-vlist-gutter').innerHTML = gutterLines(count);
        }
    });
}

export function revealVariable(variableId, focus = 'value') {
    if (!currentVM) return;
    filter = '';
    $('sp-var-filter').value = '';
    const target = variablesInScope(currentVM, scopeSprite());
    const v = [...target.local, ...target.global].find(x => x.id === variableId);
    if (v && isCompilerVariable(v.name)) showInternal = true;
    if (v?.kind === 'list' && focus === 'value') expandedLists.add(variableId);
    setDock(true);
    lastSignature = '';
    renderVariablesPanel();
    const row = [...document.querySelectorAll('#sp-dock-body .sp-vrow')].find(r => r.dataset.id === variableId);
    if (!row) return;
    row.scrollIntoView({ block: 'nearest' });
    row.classList.add('sp-hl');
    setTimeout(() => row.classList.remove('sp-hl'), 1200);
    const field = focus === 'name'
        ? row.querySelector('.sp-vname')
        : row.querySelector('.sp-vval') || row.nextElementSibling?.querySelector?.('textarea') || row.querySelector('.sp-vlist-btn');
    field?.focus();
    field?.select?.();
}

function commitValue(row, input) {
    const found = findVariable(currentVM, row.dataset.target, row.dataset.id);
    if (!found || input.placeholder) return;
    if (String(found.variable.value) === input.value) return;
    setVariableValue(currentVM, row.dataset.target, row.dataset.id, input.value);
    logToOutput(`Set [${found.variable.name}] to ${input.value}`, 'info');
}

function commitList(row, textarea) {
    const found = findVariable(currentVM, row.dataset.target, row.dataset.id);
    if (!found) return;
    const items = textarea.value === '' ? [] : textarea.value.split('\n');
    if (items.join('\n') === (found.variable.value || []).join('\n')) return;
    setVariableValue(currentVM, row.dataset.target, row.dataset.id, items);
    logToOutput(`Set [${found.variable.name}] to ${plural(items.length, 'item')}`, 'info');
}

function commitRename(row, input) {
    const result = renameVariable(currentVM, row.dataset.target, row.dataset.id, input.value);
    if (result.unchanged) { input.value = input.dataset.orig; return; }
    if (result.error) { input.value = input.dataset.orig; toast(result.error, 'warn'); return; }
    const { refs, files } = rewriteVariableReferences(result.oldName, result.newName, { global: result.scope === 'global', sprite: result.spriteName, kind: result.kind });
    reindex(currentVM);
    lastSignature = '';
    renderVariablesPanel();
    renderExplorer();
    const where = refs ? ` and ${plural(refs, 'reference')} in ${plural(files, 'file')}` : '';
    const message = `Renamed [${result.oldName}] to [${result.newName}] in Scratch${where}`;
    toast(message);
    logToOutput(message, 'ok');
}

export function setupVariablesPanel() {
    $('sp-dock-toggle').addEventListener('click', () => setDock(!isDockOpen()));
    $('sp-dock-close').addEventListener('click', () => setDock(false));
    $('sp-var-filter').addEventListener('input', e => { filter = e.target.value; renderVariablesPanel(); });
    $('sp-show-internal').addEventListener('change', e => { showInternal = e.target.checked; renderVariablesPanel(); });
    makeResizer($('sp-dock-resize'), {
        cursor: 'col-resize',
        size: () => $('sp-dock').offsetWidth,
        next: (start, dx) => Math.min(640, Math.max(240, start - dx)),
        apply: w => $('sp-main').style.setProperty('--sp-dock-w', w + 'px'),
    });

    const body = $('sp-dock-body');
    body.addEventListener('input', e => {
        if (!e.target.matches('textarea')) return;
        const n = e.target.value.split('\n').length;
        e.target.rows = n;
        e.target.closest('.sp-vlist-body').querySelector('.sp-vlist-gutter').innerHTML = gutterLines(n);
    });
    body.addEventListener('keydown', e => {
        if (!e.target.matches('.sp-vname, .sp-vval')) return;
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
        if (e.key === 'Escape') {
            e.preventDefault();
            if (e.target.matches('.sp-vname')) e.target.value = e.target.dataset.orig;
            else {
                const row = e.target.closest('.sp-vrow');
                e.target.value = String(findVariable(currentVM, row.dataset.target, row.dataset.id)?.variable.value ?? '');
            }
            e.target.blur();
        }
    });
    body.addEventListener('focusout', e => {
        if (!currentVM) return;
        if (e.target.matches('textarea')) {
            const row = e.target.closest('.sp-vlist-ed').previousElementSibling;
            commitList(row, e.target);
            return;
        }
        const row = e.target.closest('.sp-vrow');
        if (!row) return;
        if (e.target.matches('.sp-vval')) commitValue(row, e.target);
        else if (e.target.matches('.sp-vname')) commitRename(row, e.target);
        setTimeout(renderVariablesPanel, 0);
    });
    body.addEventListener('click', e => {
        const row = e.target.closest('.sp-vrow');
        const editor = e.target.closest('.sp-vlist-ed');
        if (e.target.closest('[data-toggle-list]')) {
            const id = row.dataset.id;
            expandedLists.has(id) ? expandedLists.delete(id) : expandedLists.add(id);
            renderVariablesPanel();
        } else if (e.target.closest('[data-show-huge]')) {
            revealedHuge.add(editor.dataset.listFor);
            renderVariablesPanel();
        } else if (e.target.closest('[data-vdel]')) {
            removeVariable(row.dataset.target, row.dataset.id);
        }
    });
    body.addEventListener('contextmenu', e => {
        const row = e.target.closest('.sp-vrow');
        if (!row || e.target.matches('input, textarea')) return;
        e.preventDefault();
        showMenu(variableMenuItems(row.dataset.target, row.dataset.id), { x: e.clientX, y: e.clientY });
    });
    renderVariablesPanel();
}
