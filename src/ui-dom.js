import overlayCss from "./overlay.css";
import overlayHtml from "./overlay.html";
import { overlayVisible, openOverlay, closeOverlay, selectSidebarSprite, searchCode, importFromLocalFile, exportToLocalFile } from "./editor.js";

// Overlay DOM

export function buildOverlayDOM() {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(fontLink);

    const style = document.createElement('style');
    style.textContent = overlayCss;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'scratchpiler-overlay';
    overlay.innerHTML = overlayHtml;
    document.body.appendChild(overlay);
}

export function buildTriggerButton() {
    const btn = document.createElement('button');
    btn.id = 'scratchpiler-trigger';
    btn.title = 'Open Scratchpiler (Alt+M)';
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4.5l5.5 5-5.5 5" stroke="#ff8c00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14.5h3.5" stroke="#ff8c00" stroke-width="2" stroke-linecap="round"/></svg>Open Scratchpiler`;
    btn.addEventListener('click', openOverlay);
    document.body.appendChild(btn);
}

// [SN] Search Nowhere

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

export function snGetRealActions() {
    return [
        { icon: '▶', label: 'Compile & Inject',       sub: 'Action  ·  Ctrl+Enter',  action: () => document.getElementById('scratchpiler-compile-btn')?.click() },
        { icon: '⟳', label: 'Format Document',        sub: 'Action  ·  Edit menu',   action: () => monacoEditor?.getAction('editor.action.formatDocument').run() },
        { icon: '↺', label: 'Invalidate & Re-Index',  sub: 'Action  ·  Fixes panel', action: () => document.getElementById('sp-fix-reindex')?.click() },
        { icon: '⌫', label: 'Clear Code Cache',       sub: 'Action  ·  Fixes panel', action: () => document.getElementById('sp-fix-clear-cache')?.click() },
        { icon: '↓', label: 'Import from File',       sub: 'Action  ·  File menu',   action: importFromLocalFile },
        { icon: '↑', label: 'Export to File',         sub: 'Action  ·  File menu',   action: exportToLocalFile },
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
                <svg id="sp-sn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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

export function snSwitchTab(tabId) {
    snActiveTab = tabId; snFocusIdx = -1;
    document.querySelectorAll('.sp-sn-tab').forEach(t =>
        t.classList.toggle('sp-sn-active', t.dataset.tab === tabId));
    snRenderResults();
}

export function snUpdateFocus(items) {
    items.forEach((r, i) => {
        r.classList.toggle('sp-sn-focused', i === snFocusIdx);
        if (i === snFocusIdx) r.scrollIntoView({ block: 'nearest' });
    });
}

export function openSearchNowhere() {
    if (searchNowhereOpen) return;
    const backdrop = document.getElementById('sp-sn-backdrop');
    if (!backdrop) return;
    backdrop.style.display = 'flex';
    searchNowhereOpen = true;
    snActiveTab = 'all'; snFocusIdx = -1;
    document.querySelectorAll('.sp-sn-tab').forEach(t =>
        t.classList.toggle('sp-sn-active', t.dataset.tab === 'all'));
    const input = document.getElementById('sp-sn-input');
    if (input) { input.value = ''; input.focus(); }
    snRenderResults();
}

export function closeSearchNowhere() {
    const backdrop = document.getElementById('sp-sn-backdrop');
    if (backdrop) backdrop.style.display = 'none';
    searchNowhereOpen = false;
}

export function snEscHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function snHighlight(text, query) {
    const safe = snEscHtml(text);
    if (!query) return safe;
    const re = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
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

export function snMakeResultEl(item, query, forceVoid) {
    const isVoid = forceVoid || item.isVoid || item.isFake;
    const el = document.createElement('div');
    el.className = 'sp-sn-result' + (isVoid ? ' sp-sn-void' : '');
    const pro  = item.pro  ? '<span class="sp-sn-pro">PRO</span>' : '';
    const badge = item.isFake
        ? '<span class="sp-sn-result-badge">fake</span>'
        : (item.action || item.jumpTo ? '<span class="sp-sn-result-badge">real</span>' : '');
    el.innerHTML = `
        <span class="sp-sn-result-icon">${snEscHtml(item.icon || '·')}</span>
        <span class="sp-sn-result-main">
            <span class="sp-sn-result-label">${snHighlight(item.label, query)}${pro}</span>
            ${item.sub ? `<span class="sp-sn-result-sub">${snEscHtml(item.sub)}</span>` : ''}
        </span>
        ${badge}
    `;
    el.addEventListener('click', () => {
        if (item.action)  { closeSearchNowhere(); item.action();  }
        else if (item.jumpTo) { closeSearchNowhere(); item.jumpTo(); }
        else {
            const st = document.getElementById('sp-sn-status');
            if (st) st.textContent = SN_VOID_JOKES[Math.floor(Math.random() * SN_VOID_JOKES.length)];
        }
    });
    return el;
}

export function snRenderSection(container, header, items, query, isVoid) {
    if (!items.length) return;
    const hdr = document.createElement('div');
    hdr.className = 'sp-sn-group-header';
    hdr.textContent = header;
    container.appendChild(hdr);
    for (const item of items)
        container.appendChild(snMakeResultEl(item, query, isVoid));
}

export function snEmptyState(container, msg) {
    container.innerHTML = `<div class="sp-sn-empty"><div class="sp-sn-empty-icon">🕳</div>${snEscHtml(msg || 'Nothing found here either.')}<br><span style="font-size:11px;color:#263040">This is Search Nowhere. What did you expect?</span></div>`;
}

export function snGetSpriteResults(query) {
    const all = [
        { name: '__stage__', label: 'Stage.sp', icon: '▣', sub: `Stage  ·  ${scratchIndex.stage.backdrops.length} backdrop(s)  ·  ${scratchIndex.globalVariables.length} global var(s)` },
        ...scratchIndex.sprites.map(s => ({
            name: s.name, label: `${s.name}.sp`, icon: '◻',
            sub: `Sprite  ·  ${s.costumes.length} costume(s)  ·  ${(scratchIndex.spriteVariables[s.name] || []).length} var(s)`,
        })),
    ];
    return all
        .filter(s => !query || s.label.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase()))
        .map(s => ({
            ...s,
            jumpTo: () => {
                if (!overlayVisible) openOverlay();
                setTimeout(() => selectSidebarSprite(s.name), overlayVisible ? 0 : 150);
            },
        }));
}

export function snGetBlockResults(query) {
    if (!query) return [];
    const raw = [];
    searchCode(localStorage.getItem('scratchpiler-content-__stage__') || '', '__stage__', query, raw);
    for (const s of scratchIndex.sprites)
        searchCode(localStorage.getItem(`scratchpiler-content-${s.name}`) || '', s.name, query, raw);
    return raw.slice(0, 50).map(m => ({
        icon: '≡',
        label: m.text || '(empty line)',
        sub: `${m.spriteName === '__stage__' ? 'Stage' : m.spriteName}.sp  ·  Line ${m.line}`,
        _sprite: m.spriteName,
        jumpTo: () => {
            const go = () => {
                selectSidebarSprite(m.spriteName);
                if (monacoEditor) {
                    monacoEditor.setPosition({ lineNumber: m.line, column: 1 });
                    monacoEditor.revealLineInCenter(m.line);
                    monacoEditor.focus();
                }
            };
            if (!overlayVisible) { openOverlay(); setTimeout(go, 150); } else go();
        },
    }));
}

export function snRenderResults() {
    const query     = (document.getElementById('sp-sn-input')?.value || '').trim();
    const resultsEl = document.getElementById('sp-sn-results');
    const statusEl  = document.getElementById('sp-sn-status');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';
    snFocusIdx = -1;

    if (snActiveTab === 'void') {
        const items = [...SN_VOID_RESULTS];
        if (query) items.unshift({ icon: '∅', label: `"${query}" found in The Void`, sub: 'Cannot access  ·  Forbidden by cosmic law  ·  Try again: never', isVoid: true });
        snRenderSection(resultsEl, 'The Void', items, query, true);
        if (statusEl) statusEl.textContent = `${items.length} result${items.length !== 1 ? 's' : ''}  ·  none accessible  ·  this is fine`;
        return;
    }

    if (snActiveTab === 'sprites') {
        const real = snGetSpriteResults(query);
        const ghosts = [
            { icon: '👻', label: 'Sprite3.sp',        sub: 'Ghost  ·  Deleted 2 saves ago  ·  Still haunting the VM', isVoid: true },
            { icon: '👻', label: 'Stage.sp (backup)', sub: 'Ghost  ·  Exists in your heart only',                      isVoid: true },
        ];
        snRenderSection(resultsEl, 'Sprites', real, query, false);
        snRenderSection(resultsEl, 'Ghost Sprites', ghosts, query, true);
        if (!real.length && !ghosts.length) snEmptyState(resultsEl);
        if (statusEl) statusEl.textContent = `${real.length} sprite${real.length !== 1 ? 's' : ''}  ·  plus ${ghosts.length} haunted`;
        return;
    }

    if (snActiveTab === 'blocks') {
        const items = snGetBlockResults(query);
        snRenderSection(resultsEl, 'Code Matches', items, query, false);
        if (!items.length) snEmptyState(resultsEl, query ? 'No matches found. (Searched: nowhere.)' : 'Type to search code blocks');
        if (statusEl) {
            const spriteCount = new Set(items.map(i => i._sprite)).size;
            statusEl.textContent = items.length === 0
                ? (query ? 'No matches  ·  checked everywhere  ·  found nowhere' : 'Type to search blocks')
                : `${items.length} match${items.length !== 1 ? 'es' : ''}  ·  across ${spriteCount} sprite${spriteCount !== 1 ? 's' : ''}`;
        }
        return;
    }

    if (snActiveTab === 'actions') {
        const real = snGetRealActions().filter(a => !query || a.label.toLowerCase().includes(query.toLowerCase()));
        const fake = SN_FAKE_ACTIONS.filter(a => !query || a.label.toLowerCase().includes(query.toLowerCase()));
        snRenderSection(resultsEl, 'Actions', real, query, false);
        snRenderSection(resultsEl, 'Definitely Real Actions™', fake, query, true);
        if (!real.length && !fake.length) snEmptyState(resultsEl);
        if (statusEl) statusEl.textContent = `${real.length} action${real.length !== 1 ? 's' : ''}  ·  ${fake.length} "action${fake.length !== 1 ? 's' : ''}"`;
        return;
    }

    // All tab
    const sprites     = snGetSpriteResults(query);
    const blocks      = snGetBlockResults(query);
    const realActions = snGetRealActions().filter(a => !query || a.label.toLowerCase().includes(query.toLowerCase()));
    const fakeActions = query ? SN_FAKE_ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase())) : SN_FAKE_ACTIONS.slice(0, 2);
    const voidPeek    = query
        ? [{ icon: '∅', label: `"${query}" found in The Void`, sub: 'Cannot access  ·  See The Void tab for more', isVoid: true }]
        : [SN_VOID_RESULTS[0], SN_VOID_RESULTS[1]];

    snRenderSection(resultsEl, 'Sprites', sprites, query, false);
    snRenderSection(resultsEl, 'Blocks',  blocks,  query, false);
    snRenderSection(resultsEl, 'Actions', [...realActions, ...fakeActions], query, false);
    snRenderSection(resultsEl, 'The Void', voidPeek, query, true);

    const totalReal = sprites.length + blocks.length + realActions.length;
    const totalFake = fakeActions.length + voidPeek.length;
    if (!totalReal && !totalFake) snEmptyState(resultsEl);
    if (statusEl) statusEl.textContent = !totalReal && !totalFake
        ? 'No results found (as expected)'
        : `${totalReal} result${totalReal !== 1 ? 's' : ''}  ·  ${totalFake} fabricated`;
}

// [I0] Utility: Output Panel, Sprite Picker, Context Menu, Resize

// Output panel
export function logToOutput(message, level = 'info') {
    const log = document.getElementById('sp-output-log');
    if (!log) return;
    const panel = document.getElementById('sp-output-panel');
    if (panel && !panel.classList.contains('sp-expanded')) {
        panel.classList.add('sp-expanded');
        const toggleBtn = document.getElementById('sp-output-toggle-btn');
        if (toggleBtn) toggleBtn.textContent = '▾';
        if (monacoEditor) setTimeout(() => monacoEditor.layout(), 160);
    }
    const now = new Date();
    const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    const entry = document.createElement('div');
    entry.className = `sp-out-entry ${level}`;
    const safeMsg = String(message).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    entry.innerHTML = `<span class="sp-out-time">[${ts}]</span><span class="sp-out-text">${safeMsg}</span>`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

// Compile button flash
export function flashCompileBtn(ok) {
    const btn = document.getElementById('scratchpiler-compile-btn');
    if (!btn) return;
    btn.classList.remove('sp-flash-ok', 'sp-flash-err');
    void btn.offsetWidth; // force reflow to restart animation
    btn.classList.add(ok ? 'sp-flash-ok' : 'sp-flash-err');
    btn.addEventListener('animationend', () => btn.classList.remove('sp-flash-ok', 'sp-flash-err'), { once: true });
}

// Sprite picker (Ctrl+P)
export let spPickerOpen     = false;
let spPickerFocusIdx = -1;

export function openSpritePicker() {
    if (spPickerOpen) return;
    const backdrop = document.getElementById('sp-picker-backdrop');
    if (!backdrop) return;
    backdrop.style.display = 'flex';
    spPickerOpen = true; spPickerFocusIdx = -1;
    const input = document.getElementById('sp-picker-input');
    if (input) { input.value = ''; input.focus(); }
    spPickerRender('');
}

export function closeSpritePicker() {
    const backdrop = document.getElementById('sp-picker-backdrop');
    if (backdrop) backdrop.style.display = 'none';
    spPickerOpen = false;
}

export function spPickerRender(query) {
    const list = document.getElementById('sp-picker-list');
    if (!list) return;
    list.innerHTML = '';
    spPickerFocusIdx = -1;

    const all = [
        { name: '__stage__', label: 'Stage.sp', icon: '▣',
          sub: `${scratchIndex.stage.backdrops.length} bg · ${scratchIndex.globalVariables.length} var` },
        ...scratchIndex.sprites.map(s => ({
            name: s.name, label: `${s.name}.sp`, icon: '◻',
            sub: `${s.costumes.length} costume · ${(scratchIndex.spriteVariables[s.name]||[]).length} var`,
        })),
    ];
    const filtered = query
        ? all.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
        : all;

    if (!filtered.length) {
        list.innerHTML = '<div id="sp-picker-empty">No sprites match</div>';
        return;
    }
    filtered.forEach(s => {
        const el = document.createElement('div');
        el.className = 'sp-picker-item';
        const hl = query ? snHighlight(s.label, query) : snEscHtml(s.label);
        el.innerHTML = `<span class="sp-picker-item-icon">${s.icon}</span><span class="sp-picker-item-name">${hl}</span><span class="sp-picker-item-sub">${snEscHtml(s.sub)}</span>`;
        el.addEventListener('click', () => {
            closeSpritePicker();
            if (!overlayVisible) openOverlay();
            setTimeout(() => selectSidebarSprite(s.name), overlayVisible ? 0 : 150);
        });
        list.appendChild(el);
    });
}

export function spPickerMoveFocus(delta) {
    const items = Array.from(document.querySelectorAll('#sp-picker-list .sp-picker-item'));
    spPickerFocusIdx = Math.max(-1, Math.min(items.length - 1, spPickerFocusIdx + delta));
    items.forEach((el, i) => {
        el.classList.toggle('sp-picker-focused', i === spPickerFocusIdx);
        if (i === spPickerFocusIdx) el.scrollIntoView({ block: 'nearest' });
    });
}

export function setupSpritePicker() {
    const backdrop = document.getElementById('sp-picker-backdrop');
    const input    = document.getElementById('sp-picker-input');
    if (!backdrop || !input) return;
    backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) closeSpritePicker(); });
    input.addEventListener('input', () => spPickerRender(input.value.trim()));
    input.addEventListener('keydown', e => {
        if (e.key === 'Escape')     { closeSpritePicker(); return; }
        if (e.key === 'ArrowDown')  { e.preventDefault(); spPickerMoveFocus(+1); return; }
        if (e.key === 'ArrowUp')    { e.preventDefault(); spPickerMoveFocus(-1); return; }
        if (e.key === 'Enter') {
            const items = document.querySelectorAll('#sp-picker-list .sp-picker-item');
            const target = spPickerFocusIdx >= 0 ? items[spPickerFocusIdx] : items[0];
            if (target) target.click();
        }
    });
}

// Sprite right-click context menu
export function showSpriteContextMenu(e, spriteName) {
    e.preventDefault();
    closeSpriteContextMenu();
    const menu = document.createElement('div');
    menu.className = 'sp-ctx-menu';
    menu.id = 'sp-active-ctx-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top  = e.clientY + 'px';

    const items = [
        { label: 'Open',
          action: () => selectSidebarSprite(spriteName) },
        { sep: true },
        { label: 'Decompile from VM',
          sub: 'Overwrite editor from live blocks',
          action: () => {
            if (!currentVM) { logToOutput('VM not available', 'error'); return; }
            try {
                const code = decompile(currentVM, spriteName);
                selectSidebarSprite(spriteName);
                if (monacoEditor) monacoEditor.setValue(code);
                const key = `scratchpiler-content-${spriteName}`;
                if (code && code.trim()) localStorage.setItem(key, code);
                const label = spriteName === '__stage__' ? 'Stage' : spriteName;
                logToOutput(`Decompiled "${label}" from VM`, 'ok');
                updateStatus(`Decompiled "${label}"`);
            } catch (err) {
                logToOutput('Decompile error: ' + err.message, 'error');
                updateStatus('Decompile error: ' + err.message);
            }
          },
        },
        { label: 'Export as .sp…',
          action: () => { selectSidebarSprite(spriteName); setTimeout(exportToLocalFile, 50); },
        },
    ];

    for (const item of items) {
        if (item.sep) {
            const sep = document.createElement('div'); sep.className = 'sp-ctx-sep';
            menu.appendChild(sep);
        } else {
            const btn = document.createElement('button');
            btn.className = 'sp-ctx-item';
            const safe = String(item.label).replace(/&/g,'&amp;').replace(/</g,'&lt;');
            btn.innerHTML = safe;
            btn.title = item.sub || '';
            btn.addEventListener('click', () => { closeSpriteContextMenu(); item.action(); });
            menu.appendChild(btn);
        }
    }

    document.body.appendChild(menu);

    // Nudge off-screen edges
    requestAnimationFrame(() => {
        const r = menu.getBoundingClientRect();
        if (r.right  > window.innerWidth)  menu.style.left = (e.clientX - r.width)  + 'px';
        if (r.bottom > window.innerHeight)  menu.style.top  = (e.clientY - r.height) + 'px';
    });

    setTimeout(() => {
        const onOutside = ev => { if (!menu.contains(ev.target)) { closeSpriteContextMenu(); document.removeEventListener('mousedown', onOutside); } };
        document.addEventListener('mousedown', onOutside);
    }, 0);
}

export function closeSpriteContextMenu() {
    const m = document.getElementById('sp-active-ctx-menu');
    if (m) m.remove();
}

// Sidebar resize handle
export function setupSidebarResize() {
    const handle  = document.getElementById('sp-sidebar-resize');
    const sidebar = document.getElementById('scratchpiler-sidebar');
    if (!handle || !sidebar) return;
    let dragging = false, startX = 0, startW = 0;
    handle.addEventListener('mousedown', e => {
        if (!sidebarExpanded) return;
        dragging = true; startX = e.clientX; startW = sidebar.offsetWidth;
        handle.classList.add('sp-resizing');
        document.body.style.cssText += ';cursor:col-resize!important;user-select:none!important';
        e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const w = Math.max(150, Math.min(520, startW + e.clientX - startX));
        sidebar.style.width = w + 'px';
        if (monacoEditor) monacoEditor.layout();
    });
    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        handle.classList.remove('sp-resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    });
}

// Output panel toggle setup
export function setupOutputPanel() {
    const toggleBtn = document.getElementById('sp-output-toggle-btn');
    const clearBtn  = document.getElementById('sp-output-clear-btn');
    const header    = document.getElementById('sp-output-header');
    const panel     = document.getElementById('sp-output-panel');
    if (!panel) return;

    function toggle() {
        panel.classList.toggle('sp-expanded');
        if (toggleBtn) toggleBtn.textContent = panel.classList.contains('sp-expanded') ? '▾' : '▸';
        if (monacoEditor) setTimeout(() => monacoEditor.layout(), 160);
    }
    if (toggleBtn) toggleBtn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
    if (clearBtn)  clearBtn.addEventListener('click',  e => { e.stopPropagation(); const log = document.getElementById('sp-output-log'); if (log) log.innerHTML = ''; });
    if (header)    header.addEventListener('click', toggle);
}
