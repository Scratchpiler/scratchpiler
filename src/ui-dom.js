import overlayCss from "./overlay.css";
import overlayHtml from "./overlay.html";
import { overlayVisible, openOverlay, closeOverlay, selectSidebarSprite, importFromLocalFile, exportToLocalFile, monacoEditor, compileAndInject, formatDocument, reindexProject, clearSavedCode } from "./editor.js";
import { scratchIndex } from "./vm.js";

const LOGO_B64 = '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';

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap';

export const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const plural = (n, word, pluralWord = word + 's') => `${Number(n).toLocaleString()} ${n === 1 ? word : pluralWord}`;
export const spriteLabel = name => !name ? '' : name === '__stage__' ? 'Stage' : name;
const $ = id => document.getElementById(id);

export function buildOverlayDOM() {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = FONT_URL;
    document.head.appendChild(fontLink);

    const style = document.createElement('style');
    style.textContent = overlayCss;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'scratchpiler-overlay';
    overlay.innerHTML = overlayHtml;
    document.body.appendChild(overlay);

    const logoImg = overlay.querySelector('#scratchpiler-logo');
    try {
        const raw = atob(LOGO_B64);
        const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
        logoImg.src = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
    } catch (_) {
        logoImg.hidden = true;
    }
}

export function buildTriggerButton() {
    const btn = document.createElement('button');
    btn.id = 'scratchpiler-trigger';
    btn.title = 'Open Scratchpiler (Alt+M)';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M4 4.5l5.5 5-5.5 5" stroke="#ff9a1f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14.5h3.5" stroke="#ff9a1f" stroke-width="2" stroke-linecap="round"/></svg>Open Scratchpiler`;
    btn.addEventListener('click', openOverlay);
    document.body.appendChild(btn);
}

export function toast(message, kind = '', action = null) {
    const host = $('sp-toasts');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'sp-toast' + (kind ? ` sp-${kind}` : '');
    el.innerHTML = `<i></i><span>${escapeHtml(message)}</span>`;
    if (action) {
        const btn = document.createElement('button');
        btn.className = 'sp-act';
        btn.textContent = action.label;
        btn.addEventListener('click', () => { el.remove(); action.run(); });
        el.appendChild(btn);
    }
    host.appendChild(el);
    setTimeout(() => el.remove(), action ? 6000 : 3000);
}

let statusFadeTimer = null;
export function setStatusMessage(text) {
    const el = $('scratchpiler-status');
    if (!el) return;
    el.textContent = text;
    el.title = text;
    el.classList.remove('sp-fade');
    clearTimeout(statusFadeTimer);
    statusFadeTimer = setTimeout(() => el.classList.add('sp-fade'), 6000);
}

export function logToOutput(message, level = 'info') {
    const log = $('sp-output-log');
    if (!log) return;
    const now = new Date();
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
    const entry = document.createElement('div');
    entry.className = `sp-out-entry ${level}`;
    entry.innerHTML = `<time>${time}</time><span>${escapeHtml(message)}</span>`;
    log.appendChild(entry);
    log.parentElement.scrollTop = log.parentElement.scrollHeight;
    if (level === 'error') setBottomPanel(true, 'output');
}

export function flashCompileBtn(ok) {
    const run = $('sp-run');
    if (!run) return;
    run.classList.remove('sp-flash-ok', 'sp-flash-err');
    void run.offsetWidth;
    run.classList.add(ok ? 'sp-flash-ok' : 'sp-flash-err');
}

let menuAnchor = null;
let menuItems = [];
export const isMenuOpen = () => $('sp-menu')?.classList.contains('sp-on');

export function showMenu(items, { x, y, alignRight = false, anchor = null }) {
    const menu = $('sp-menu');
    closeMenu();
    menuItems = items.filter(Boolean);
    menu.innerHTML = menuItems.map((item, i) => {
        if (item === '-') return '<hr>';
        if (item.label) return `<div class="sp-lbl">${escapeHtml(item.label)}</div>`;
        const cls = item.danger ? ' class="sp-danger"' : '';
        return `<button role="menuitem" data-i="${i}"${cls}${item.disabled ? ' disabled' : ''}><span>${escapeHtml(item.text)}</span>${item.keys ? `<kbd>${escapeHtml(item.keys)}</kbd>` : ''}</button>`;
    }).join('');
    menu.classList.add('sp-on');
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(alignRight ? x - w : x, innerWidth - w - 8)) + 'px';
    menu.style.top = (y + h > innerHeight - 8 ? Math.max(8, y - h) : y) + 'px';
    menuAnchor = anchor;
    anchor?.setAttribute('aria-expanded', 'true');
    menu.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
}

export function showMenuBelow(anchor, items, alignRight = false) {
    const r = anchor.getBoundingClientRect();
    showMenu(items, { x: alignRight ? r.right : r.left, y: r.bottom + 6, alignRight, anchor });
}

export function closeMenu() {
    const menu = $('sp-menu');
    if (!menu) return;
    menu.classList.remove('sp-on');
    menuAnchor?.setAttribute('aria-expanded', 'false');
    menuAnchor = null;
}

export function setupMenu() {
    const menu = $('sp-menu');
    menu.addEventListener('click', e => {
        const btn = e.target.closest('button[data-i]:not(:disabled)');
        if (!btn) return;
        const item = menuItems[+btn.dataset.i];
        closeMenu();
        item.run();
    });
    menu.addEventListener('keydown', e => {
        const buttons = [...menu.querySelectorAll('button:not(:disabled)')];
        const i = buttons.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') { e.preventDefault(); buttons[(i + 1) % buttons.length]?.focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); buttons[(i - 1 + buttons.length) % buttons.length]?.focus(); }
    });
    document.addEventListener('mousedown', e => {
        if (!isMenuOpen() || menu.contains(e.target) || menuAnchor?.contains(e.target)) return;
        closeMenu();
    }, true);
    window.addEventListener('blur', closeMenu);
    window.addEventListener('resize', closeMenu);
}

export const isScrimOpen = () => !!document.querySelector('#scratchpiler-overlay .sp-scrim.sp-on');
export function openScrim(id) {
    closeScrims();
    closeMenu();
    $(id)?.classList.add('sp-on');
}
export function closeScrims() {
    document.querySelectorAll('#scratchpiler-overlay .sp-scrim.sp-on').forEach(s => s.classList.remove('sp-on'));
}
export function setupScrims() {
    document.querySelectorAll('#scratchpiler-overlay .sp-scrim').forEach(scrim =>
        scrim.addEventListener('mousedown', e => { if (e.target === scrim) closeScrims(); }));
    $('sp-sb-keys').addEventListener('click', () => openScrim('sp-keys-scrim'));
}

let bottomTab = 'problems';
export const isBottomOpen = () => !$('sp-bottom').classList.contains('sp-closed');

export function setBottomPanel(open, tab = bottomTab) {
    bottomTab = tab;
    $('sp-bottom').classList.toggle('sp-closed', !open);
    $('sp-bottom-toggle').setAttribute('aria-expanded', String(open));
    document.querySelectorAll('#scratchpiler-overlay .sp-btab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.bottom === tab)));
    $('sp-problems-view').hidden = tab !== 'problems';
    $('sp-output-log').hidden = tab !== 'output';
    $('sp-output-clear-btn').style.visibility = tab === 'output' ? 'visible' : 'hidden';
}

export function setupBottomPanel() {
    document.querySelectorAll('#scratchpiler-overlay .sp-btab').forEach(b => b.addEventListener('click', () => {
        const alreadyShowing = isBottomOpen() && bottomTab === b.dataset.bottom;
        setBottomPanel(!alreadyShowing, b.dataset.bottom);
    }));
    $('sp-bottom-toggle').addEventListener('click', () => setBottomPanel(!isBottomOpen()));
    $('sp-output-clear-btn').addEventListener('click', () => { $('sp-output-log').innerHTML = ''; });
    makeResizer($('sp-bottom-resize'), {
        cursor: 'row-resize',
        size: () => document.querySelector('#scratchpiler-overlay .sp-bottom-body').offsetHeight,
        next: (start, dx, dy) => Math.min(innerHeight * 0.7, Math.max(80, start - dy)),
        apply: h => $('scratchpiler-overlay').style.setProperty('--sp-bottom-h', h + 'px'),
    });
    setBottomPanel(true, 'problems');
}

export function makeResizer(handle, { cursor, size, next, apply }) {
    let startX = 0, startY = 0, start = 0;
    const move = e => apply(next(start, e.clientX - startX, e.clientY - startY));
    const end = () => {
        handle.classList.remove('sp-resizing');
        document.removeEventListener('pointermove', move);
        document.body.style.removeProperty('cursor');
        document.body.style.removeProperty('user-select');
    };
    handle.addEventListener('pointerdown', e => {
        startX = e.clientX; startY = e.clientY; start = size();
        handle.classList.add('sp-resizing');
        document.body.style.setProperty('cursor', cursor, 'important');
        document.body.style.setProperty('user-select', 'none', 'important');
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', end, { once: true });
        e.preventDefault();
    });
}

export function setupSidebarResize() {
    makeResizer($('sp-sidebar-resize'), {
        cursor: 'col-resize',
        size: () => $('scratchpiler-sidebar').offsetWidth,
        next: (start, dx) => Math.min(520, Math.max(180, start + dx)),
        apply: w => $('sp-main').style.setProperty('--sp-side-w', w + 'px'),
    });
}

export let searchNowhereOpen = false;
let snActiveTab = 'all';
let snFocusIdx = -1;

const SN_VOID_RESULTS = [
    { icon: '∅', label: '1 match found in /dev/null',          sub: '/dev/null — read-only, as always',                                           isVoid: true },
    { icon: '∅', label: '3 results evaporated during search',   sub: 'Cause: quantum measurement interference',                                    isVoid: true },
    { icon: '∅', label: 'Found in TODO.md',                     sub: 'TODO.md — never written, never read, never will be',                         isVoid: true },
    { icon: '∅', label: 'Located in Parallel Universe #7',      sub: 'Access requires inter-dimensional IDE license (yours expired)',               isVoid: true },
    { icon: '∅', label: 'Cached result from 1970-01-01',        sub: 'Cache TTL: ∞  ·  Source: unknown  ·  Trust: none',                          isVoid: true },
    { icon: '∅', label: 'Stored in $SCRATCH_HOME',              sub: '$SCRATCH_HOME is undefined (always has been)',                               isVoid: true },
    { icon: '∅', label: 'Exists in production only',            sub: 'Works on my machine™  ·  target: not your machine',                          isVoid: true },
    { icon: '∅', label: 'Hidden in a deleted comment',          sub: '// ← removed last week, reason: "makes no sense"',                          isVoid: true },
    { icon: '∅', label: 'Result is loading…',                   sub: '(has been loading since 2019)',                                              isVoid: true },
];

const SN_FAKE_ACTIONS = [
    { icon: '☁', label: 'Upload to Scratch Cloud™',            sub: 'Action  ·  Requires premium  ·  Not a real feature',         isFake: true, pro: true  },
    { icon: '↩', label: 'Undo All Mistakes (Career)',           sub: 'Action  ·  Lifetime Undo™  ·  Requires full system reboot',  isFake: true, pro: true  },
    { icon: '◑', label: 'Enable Dark Dark Mode',               sub: 'Action  ·  Screen goes fully black  ·  May cause confusion',  isFake: true            },
    { icon: '⚙', label: 'Let AI Write This For You',           sub: 'Action  ·  Opens the void  ·  Results: unknowable',           isFake: true, pro: true  },
    { icon: '▲', label: 'Deploy to Production',                sub: 'Action  ·  Scratch has no production  ·  Good luck anyway',   isFake: true            },
    { icon: '⌖', label: 'Search Somewhere',                    sub: 'Action  ·  Premium upgrade of Search Nowhere  ·  Finds things', isFake: true, pro: true },
];

const withOverlay = fn => () => { if (!overlayVisible) openOverlay(); fn(); };

export function snGetRealActions() {
    return [
        { icon: '▶', label: 'Compile & Inject',       sub: 'Action  ·  Ctrl+Enter',  action: withOverlay(() => compileAndInject()) },
        { icon: '⟳', label: 'Format Document',        sub: 'Action  ·  Alt+Shift+F', action: withOverlay(formatDocument) },
        { icon: '↺', label: 'Re-index Project',       sub: 'Action  ·  Settings',    action: reindexProject },
        { icon: '⌫', label: 'Clear Saved Code',       sub: 'Action  ·  Settings',    action: clearSavedCode },
        { icon: '↓', label: 'Open .sdsl File',        sub: 'Action  ·  File menu',   action: withOverlay(importFromLocalFile) },
        { icon: '↑', label: 'Save as .sdsl File',     sub: 'Action  ·  File menu',   action: withOverlay(exportToLocalFile) },
        { icon: '✕', label: 'Close Scratchpiler',     sub: 'Action  ·  Escape',      action: () => { if (overlayVisible) closeOverlay(); } },
    ];
}

export function buildSearchNowhereDOM() {
    const backdrop = document.createElement('div');
    backdrop.id = 'sp-sn-backdrop';
    backdrop.style.display = 'none';
    backdrop.innerHTML = `
        <div id="sp-sn-modal" role="dialog" aria-modal="true" aria-label="Search Nowhere">
            <div id="sp-sn-header">
                <svg id="sp-sn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/></svg>
                <input id="sp-sn-input" autocomplete="off" spellcheck="false" placeholder="Search Nowhere…" />
                <span id="sp-sn-hint">⇧⇧ · Esc</span>
            </div>
            <div id="sp-sn-tabs">
                <button class="sp-sn-tab sp-sn-active" data-tab="all">All</button>
                <button class="sp-sn-tab" data-tab="sprites">Sprites</button>
                <button class="sp-sn-tab" data-tab="blocks">Blocks</button>
                <button class="sp-sn-tab" data-tab="actions">Actions</button>
                <button class="sp-sn-tab sp-sn-tab-void" data-tab="void">The Void</button>
            </div>
            <div id="sp-sn-results"></div>
            <div id="sp-sn-footer">
                <span id="sp-sn-status">Type to search nowhere</span>
                <span id="sp-sn-tip">↑↓ navigate  ·  Enter select  ·  Tab switch tab  ·  Esc close</span>
            </div>
        </div>
    `;

    backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) closeSearchNowhere(); });

    const input = backdrop.querySelector('#sp-sn-input');
    input.addEventListener('input', () => { snFocusIdx = -1; snRenderResults(); });
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeSearchNowhere(); return; }
        const items = document.querySelectorAll('#sp-sn-results .sp-sn-result');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            snFocusIdx = Math.min(snFocusIdx + 1, items.length - 1);
            snUpdateFocus(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            snFocusIdx = Math.max(snFocusIdx - 1, -1);
            snUpdateFocus(items);
        } else if (e.key === 'Enter') {
            if (snFocusIdx >= 0 && items[snFocusIdx]) items[snFocusIdx].click();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const tabs = ['all', 'sprites', 'blocks', 'actions', 'void'];
            snSwitchTab(tabs[(tabs.indexOf(snActiveTab) + 1) % tabs.length]);
        }
    });

    backdrop.querySelectorAll('.sp-sn-tab').forEach(tab =>
        tab.addEventListener('click', () => { snSwitchTab(tab.dataset.tab); input.focus(); })
    );

    document.body.appendChild(backdrop);
}

function snSwitchTab(tabId) {
    snActiveTab = tabId; snFocusIdx = -1;
    document.querySelectorAll('.sp-sn-tab').forEach(t =>
        t.classList.toggle('sp-sn-active', t.dataset.tab === tabId));
    snRenderResults();
}

function snUpdateFocus(items) {
    items.forEach((r, i) => {
        r.classList.toggle('sp-sn-focused', i === snFocusIdx);
        if (i === snFocusIdx) r.scrollIntoView({ block: 'nearest' });
    });
}

export function openSearchNowhere() {
    if (searchNowhereOpen) return;
    const backdrop = $('sp-sn-backdrop');
    if (!backdrop) return;
    backdrop.style.display = 'flex';
    searchNowhereOpen = true;
    snActiveTab = 'all'; snFocusIdx = -1;
    document.querySelectorAll('.sp-sn-tab').forEach(t =>
        t.classList.toggle('sp-sn-active', t.dataset.tab === 'all'));
    const input = $('sp-sn-input');
    if (input) { input.value = ''; input.focus(); }
    snRenderResults();
}

export function closeSearchNowhere() {
    const backdrop = $('sp-sn-backdrop');
    if (backdrop) backdrop.style.display = 'none';
    searchNowhereOpen = false;
}

function snHighlight(text, query) {
    const safe = escapeHtml(text);
    if (!query) return safe;
    const re = new RegExp(`(${escapeHtml(query).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    return safe.replace(re, '<em>$1</em>');
}

const SN_VOID_JOKES = [
    'Access denied by the void.',
    'Connection to /dev/null timed out.',
    'Result has already evaporated.',
    'This result does not exist in this dimension.',
    'Error 404: result not found anywhere.',
    'Your request has been noted. It will be ignored.',
    'Cannot open a portal to /dev/null at this time.',
];

function snMakeResultEl(item, query, forceVoid) {
    const isVoid = forceVoid || item.isVoid || item.isFake;
    const el = document.createElement('div');
    el.className = 'sp-sn-result' + (isVoid ? ' sp-sn-void' : '');
    const pro = item.pro ? '<span class="sp-sn-pro">PRO</span>' : '';
    const badge = item.isFake
        ? '<span class="sp-sn-result-badge">fake</span>'
        : (item.action || item.jumpTo ? '<span class="sp-sn-result-badge">real</span>' : '');
    el.innerHTML = `
        <span class="sp-sn-result-icon">${escapeHtml(item.icon || '·')}</span>
        <span class="sp-sn-result-main">
            <span class="sp-sn-result-label">${snHighlight(item.label, query)}${pro}</span>
            ${item.sub ? `<span class="sp-sn-result-sub">${escapeHtml(item.sub)}</span>` : ''}
        </span>
        ${badge}
    `;
    el.addEventListener('click', () => {
        if (item.action) { closeSearchNowhere(); item.action(); }
        else if (item.jumpTo) { closeSearchNowhere(); item.jumpTo(); }
        else {
            const st = $('sp-sn-status');
            if (st) st.textContent = SN_VOID_JOKES[Math.floor(Math.random() * SN_VOID_JOKES.length)];
        }
    });
    return el;
}

function snRenderSection(container, header, items, query, isVoid) {
    if (!items.length) return;
    const hdr = document.createElement('div');
    hdr.className = 'sp-sn-group-header';
    hdr.textContent = header;
    container.appendChild(hdr);
    for (const item of items) container.appendChild(snMakeResultEl(item, query, isVoid));
}

function snEmptyState(container, msg) {
    container.innerHTML = `<div class="sp-sn-empty"><div class="sp-sn-empty-icon">🕳</div>${escapeHtml(msg || 'Nothing found here either.')}<br><span style="font-size:11px">This is Search Nowhere. Finding things was never the goal.</span></div>`;
}

function snGetSpriteResults(query) {
    const all = [
        { name: '__stage__', label: 'Stage', icon: '▣', sub: `Stage  ·  ${plural(scratchIndex.stage.backdrops.length, 'backdrop')}  ·  ${plural(scratchIndex.globalVariables.length, 'global variable')}` },
        ...scratchIndex.sprites.map(s => ({
            name: s.name, label: s.name, icon: '◻',
            sub: `Sprite  ·  ${plural(s.costumes.length, 'costume')}  ·  ${plural((scratchIndex.spriteVariables[s.name] || []).length, 'variable')}`,
        })),
    ];
    const q = query.toLowerCase();
    return all
        .filter(s => !q || s.label.toLowerCase().includes(q))
        .map(s => ({ ...s, jumpTo: withOverlay(() => selectSidebarSprite(s.name)) }));
}

function snGetBlockResults(query) {
    if (!query) return [];
    const q = query.toLowerCase();
    const results = [];
    for (const name of ['__stage__', ...scratchIndex.sprites.map(s => s.name)]) {
        const code = localStorage.getItem(`scratchpiler-content-${name}`) || '';
        code.split('\n').forEach((text, i) => {
            if (results.length < 50 && text.toLowerCase().includes(q)) results.push({ name, line: i + 1, text: text.trim() });
        });
    }
    return results.map(m => ({
        icon: '≡',
        label: m.text || '(empty line)',
        sub: `${spriteLabel(m.name)}  ·  Line ${m.line}`,
        sprite: m.name,
        jumpTo: withOverlay(() => {
            selectSidebarSprite(m.name);
            monacoEditor?.setPosition({ lineNumber: m.line, column: 1 });
            monacoEditor?.revealLineInCenter(m.line);
            monacoEditor?.focus();
        }),
    }));
}

function snRenderResults() {
    const query = ($('sp-sn-input')?.value || '').trim();
    const resultsEl = $('sp-sn-results');
    const statusEl = $('sp-sn-status');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    snFocusIdx = -1;
    const matchesQuery = a => !query || a.label.toLowerCase().includes(query.toLowerCase());

    if (snActiveTab === 'void') {
        const items = [...SN_VOID_RESULTS];
        if (query) items.unshift({ icon: '∅', label: `"${query}" found in The Void`, sub: 'Cannot access  ·  Forbidden by cosmic law  ·  Try again: never', isVoid: true });
        snRenderSection(resultsEl, 'The Void', items, query, true);
        statusEl.textContent = `${plural(items.length, 'result')}  ·  none accessible  ·  this is fine`;
        return;
    }

    if (snActiveTab === 'sprites') {
        const real = snGetSpriteResults(query);
        const ghosts = [
            { icon: '👻', label: 'Sprite3', sub: 'Ghost  ·  Deleted 2 saves ago  ·  Still haunting the VM', isVoid: true },
            { icon: '👻', label: 'Stage (backup)', sub: 'Ghost  ·  Exists in your heart only', isVoid: true },
        ];
        snRenderSection(resultsEl, 'Sprites', real, query, false);
        snRenderSection(resultsEl, 'Ghost Sprites', ghosts, query, true);
        statusEl.textContent = `${plural(real.length, 'sprite')}  ·  plus ${ghosts.length} haunted`;
        return;
    }

    if (snActiveTab === 'blocks') {
        const items = snGetBlockResults(query);
        snRenderSection(resultsEl, 'Code Matches', items, query, false);
        if (!items.length) snEmptyState(resultsEl, query ? 'No matches found. (Searched: nowhere.)' : 'Type to search code blocks');
        const spriteCount = new Set(items.map(i => i.sprite)).size;
        statusEl.textContent = items.length === 0
            ? (query ? 'No matches  ·  checked everywhere  ·  found nowhere' : 'Type to search blocks')
            : `${plural(items.length, 'match', 'matches')}  ·  across ${plural(spriteCount, 'sprite')}`;
        return;
    }

    if (snActiveTab === 'actions') {
        const real = snGetRealActions().filter(matchesQuery);
        const fake = SN_FAKE_ACTIONS.filter(matchesQuery);
        snRenderSection(resultsEl, 'Actions', real, query, false);
        snRenderSection(resultsEl, 'Definitely Real Actions™', fake, query, true);
        if (!real.length && !fake.length) snEmptyState(resultsEl);
        statusEl.textContent = `${plural(real.length, 'action')}  ·  ${fake.length} "actions"`;
        return;
    }

    const sprites = snGetSpriteResults(query);
    const blocks = snGetBlockResults(query);
    const realActions = snGetRealActions().filter(matchesQuery);
    const fakeActions = query ? SN_FAKE_ACTIONS.filter(matchesQuery) : SN_FAKE_ACTIONS.slice(0, 2);
    const voidPeek = query
        ? [{ icon: '∅', label: `"${query}" found in The Void`, sub: 'Cannot access  ·  See The Void tab for more', isVoid: true }]
        : [SN_VOID_RESULTS[0], SN_VOID_RESULTS[1]];

    snRenderSection(resultsEl, 'Sprites', sprites, query, false);
    snRenderSection(resultsEl, 'Blocks', blocks, query, false);
    snRenderSection(resultsEl, 'Actions', [...realActions, ...fakeActions], query, false);
    snRenderSection(resultsEl, 'The Void', voidPeek, query, true);

    const totalReal = sprites.length + blocks.length + realActions.length;
    const totalFake = fakeActions.length + voidPeek.length;
    statusEl.textContent = `${plural(totalReal, 'result')}  ·  ${totalFake} fabricated`;
}
