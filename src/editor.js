import { LANG_ID, LS_KEY, LS_INJ_KEY } from "./constants.js";
import { injectedBlockIds } from "./inject-state.js";
import { acquireVM, scratchIndex, reindex } from "./vm.js";
import { loadMonaco } from "./monaco.js";
import { registerLanguage } from "./language.js";
import { buildOverlayDOM, buildTriggerButton, buildSearchNowhereDOM, setupSpritePicker, spPickerOpen, searchNowhereOpen, logToOutput, flashCompileBtn, openSpritePicker, closeSpritePicker, showSpriteContextMenu, closeSpriteContextMenu, setupOutputPanel, setupSidebarResize, openSearchNowhere, closeSearchNowhere, } from "./ui-dom.js";
import { compileSource, decompile, tokenize, parse, lint, typeCheckDiagnostics, injectBlocks, uid } from "./main.js";

// [I] Editor Lifecycle

export let monacoEditor  = null;
export let overlayVisible = false;
export let currentVM      = null;

let applySettingsFn = null;
let currentActiveTab = 'explorer';
let sidebarExpanded = true;
let debugPollInterval = null;

function renderSidebarSprites() {
    const listEl = document.getElementById('scratchpiler-sprites-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    function makeSpriteItem(spriteName, labelText, iconSvg) {
        const el = document.createElement('div');
        el.className = 'sp-list-item';
        el.dataset.sprite = spriteName;
        el.innerHTML = `${iconSvg}<span class="sp-item-name">${labelText}</span>`;
        el.addEventListener('click', () => selectSidebarSprite(spriteName));
        el.addEventListener('contextmenu', e => showSpriteContextMenu(e, spriteName));
        return el;
    }

    // Add Stage first
    const stageEl = makeSpriteItem('__stage__', 'Stage.sp',
        `<svg class="sp-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`);
    listEl.appendChild(stageEl);

    // Add all other sprites
    for (const s of scratchIndex.sprites) {
        const el = makeSpriteItem(s.name, `${s.name}.sp`,
            `<svg class="sp-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`);
        listEl.appendChild(el);
    }

    // Maintain active highlighting
    if (currentSpriteContext) {
        const activeItem = listEl.querySelector(`[data-sprite="${currentSpriteContext}"]`);
        if (activeItem) activeItem.classList.add('active');
    }
}

export function selectSidebarSprite(spriteName) {
    if (!spriteName) return;
    const oldSprite = currentSpriteContext;
    if (oldSprite && oldSprite !== spriteName) {
        saveToLocalStorage(oldSprite);
    }
    currentSpriteContext = spriteName;

    // Switch editing target in VM if available
    if (currentVM) {
        const stage = currentVM.runtime.targets.find(t => t.isStage);
        const target = (spriteName === '__stage__')
            ? stage
            : currentVM.runtime.targets.find(t => !t.isStage && t.sprite.name === spriteName);
        if (target) {
            try {
                currentVM.setEditingTarget(target.id);
            } catch (_) {}
        }
    }

    // Highlight active item
    const listEl = document.getElementById('scratchpiler-sprites-list');
    if (listEl) {
        for (const item of listEl.children) {
            if (item.dataset.sprite === spriteName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    }

    loadFromLocalStorage(spriteName);
    updateSpriteDetails(spriteName);
    openSpriteTab(spriteName);
    updateStatusBarSprite(spriteName);
}

// ===== Sprite Tab Bar =====

const openTabSprites = [];

function renderTabs() {
    const bar = document.getElementById('sp-tab-bar');
    if (!bar) return;
    bar.innerHTML = '';
    for (const name of openTabSprites) {
        const isStage = name === '__stage__';
        const label   = isStage ? 'Stage.sp' : `${name}.sp`;
        const icon    = isStage ? '▣' : '◻';
        const tab     = document.createElement('div');
        tab.className = 'sp-tab' + (name === currentSpriteContext ? ' sp-tab-active' : '');
        tab.dataset.sprite = name;
        tab.innerHTML = `<span class="sp-tab-icon">${icon}</span><span class="sp-tab-name">${label}</span>`;
        const closeBtn = document.createElement('button');
        closeBtn.className = 'sp-tab-close';
        closeBtn.textContent = '×';
        closeBtn.title = 'Close tab';
        closeBtn.addEventListener('click', e => { e.stopPropagation(); closeSpriteTab(name); });
        tab.appendChild(closeBtn);
        tab.addEventListener('click', () => selectSidebarSprite(name));
        bar.appendChild(tab);
    }
}

function openSpriteTab(name) {
    if (!openTabSprites.includes(name)) openTabSprites.push(name);
    renderTabs();
}

function closeSpriteTab(name) {
    const idx = openTabSprites.indexOf(name);
    if (idx < 0) return;
    openTabSprites.splice(idx, 1);
    if (currentSpriteContext === name) {
        const next = openTabSprites[idx] ?? openTabSprites[idx - 1] ?? null;
        if (next) {
            selectSidebarSprite(next);
        } else {
            currentSpriteContext = null;
            if (monacoEditor) monacoEditor.setValue('');
            renderTabs();
        }
    } else {
        renderTabs();
    }
}

// ===== Status Bar =====

function updateStatusBarVM(state) {
    const dot  = document.getElementById('sp-sb-vm-dot');
    const text = document.getElementById('sp-sb-vm-text');
    if (!dot || !text) return;
    dot.className = `sp-sb-dot sp-sb-dot-${state}`;
    if (state === 'ok')    text.textContent = 'VM Ready';
    if (state === 'error') text.textContent = 'VM Not Found';
}

function updateStatusBarSprite(name) {
    const el = document.getElementById('sp-sb-sprite-name');
    if (el) el.textContent = !name ? '—' : name === '__stage__' ? 'Stage' : name;
}

function updateStatusBarCursor(line, col) {
    const el = document.getElementById('sp-sb-cursor');
    if (el) el.textContent = `Ln ${line}, Col ${col}`;
}

function updateStatusBarProblems(errors, warnings) {
    const errEl  = document.getElementById('sp-sb-err-count');
    const warnEl = document.getElementById('sp-sb-warn-count');
    if (errEl)  { errEl.textContent  = `${errors} error${errors !== 1 ? 's' : ''}`;     errEl.classList.toggle('sp-sb-zero', errors === 0); }
    if (warnEl) { warnEl.textContent = `${warnings} warning${warnings !== 1 ? 's' : ''}`; warnEl.classList.toggle('sp-sb-zero', warnings === 0); }
}

function updateSpriteDetails(spriteName) {
    const detailTitle = document.getElementById('scratchpiler-detail-spritename');
    if (detailTitle) {
        detailTitle.textContent = spriteName === '__stage__' ? 'Stage' : spriteName;
    }

    const costumesContent   = document.getElementById('sp-subacc-costumes-content');
    const soundsContent     = document.getElementById('sp-subacc-sounds-content');
    const varsContent       = document.getElementById('sp-subacc-variables-content');
    const cbContent         = document.getElementById('sp-subacc-customblocks-content');

    if (!costumesContent || !soundsContent || !varsContent) return;

    costumesContent.innerHTML = '';
    soundsContent.innerHTML   = '';
    varsContent.innerHTML     = '';
    if (cbContent) cbContent.innerHTML = '';

    let costumes = [], sounds = [], vars = [], customBlocks = [];

    if (spriteName === '__stage__') {
        costumes = scratchIndex.stage.backdrops || [];
        sounds   = scratchIndex.stage.sounds    || [];
        vars     = scratchIndex.globalVariables || [];
    } else {
        const sprite = scratchIndex.sprites.find(s => s.name === spriteName);
        if (sprite) { costumes = sprite.costumes || []; sounds = sprite.sounds || []; }
        vars         = scratchIndex.spriteVariables[spriteName] || [];
        customBlocks = scratchIndex.customBlocks[spriteName]    || [];
    }

    function makeDetailItem(label, snippet, title) {
        const div = document.createElement('div');
        div.className = 'sp-detail-item';
        div.textContent = label;
        div.title = title;
        div.addEventListener('click', () => {
            if (monacoEditor) {
                monacoEditor.trigger('sidebar', 'type', { text: snippet });
                monacoEditor.focus();
            }
        });
        return div;
    }

    // Costumes / backdrops
    if (costumes.length === 0) {
        costumesContent.innerHTML = '<div class="sp-detail-empty">None</div>';
    } else {
        for (const c of costumes) {
            const snippet = spriteName === '__stage__'
                ? `switchBackdrop("${c}")` : `switchCostume("${c}")`;
            costumesContent.appendChild(makeDetailItem(c, snippet, `Insert: ${snippet}`));
        }
    }

    // Sounds
    if (sounds.length === 0) {
        soundsContent.innerHTML = '<div class="sp-detail-empty">None</div>';
    } else {
        for (const s of sounds) {
            soundsContent.appendChild(makeDetailItem(s, `play("${s}")`, `Insert: play("${s}")`));
        }
    }

    // Variables / lists
    if (vars.length === 0) {
        varsContent.innerHTML = '<div class="sp-detail-empty">None</div>';
    } else {
        for (const v of vars) {
            const snippet = `[${v.name}]`;
            const row = document.createElement('div');
            row.className = 'sp-detail-item-row';

            const lbl = document.createElement('div');
            lbl.className = 'sp-detail-item';
            lbl.textContent = `${v.name} (${v.type})`;
            lbl.title = `Insert: ${snippet}`;
            lbl.addEventListener('click', () => {
                if (monacoEditor) { monacoEditor.trigger('sidebar', 'type', { text: snippet }); monacoEditor.focus(); }
            });

            const actBtn = document.createElement('button');
            actBtn.className = 'sp-detail-action-btn';
            actBtn.textContent = '⋮';
            actBtn.title = 'Variable actions';
            actBtn.addEventListener('click', e => {
                e.stopPropagation();
                const rect = actBtn.getBoundingClientRect();
                const menuItems = [
                    { label: 'Rename…', action: () => openRenameDialog(v) },
                    { label: 'Delete', danger: true, action: () => doDeleteVariable(v.id) },
                ];
                if (v.type === 'list') {
                    menuItems.splice(1, 0, { label: 'Initialize from CSV…', action: () => openInitListDialog(v) });
                }
                showContextMenu(menuItems, rect.left, rect.bottom + 2);
            });

            row.appendChild(lbl);
            row.appendChild(actBtn);
            varsContent.appendChild(row);
        }
    }

    // Custom blocks
    if (cbContent) {
        if (customBlocks.length === 0) {
            cbContent.innerHTML = '<div class="sp-detail-empty">None</div>';
        } else {
            for (const proc of customBlocks) {
                cbContent.appendChild(makeDetailItem(proc, proc, `Insert call: ${proc}`));
            }
        }
    }
}

function setupActivityBar() {
    const sidebar = document.getElementById('scratchpiler-sidebar');
    const actExplorer = document.getElementById('sp-activity-explorer');
    const actSearch = document.getElementById('sp-activity-search');
    const actSettings = document.getElementById('sp-activity-settings');
    const actFixes = document.getElementById('sp-activity-fixes');

    const panels = {
        explorer: document.getElementById('sp-panel-explorer'),
        search: document.getElementById('sp-panel-search'),
        settings: document.getElementById('sp-panel-settings'),
        fixes: document.getElementById('sp-panel-fixes')
    };

    const buttons = {
        explorer: actExplorer,
        search: actSearch,
        settings: actSettings,
        fixes: actFixes
    };

    function switchTab(tabId) {
        const sidebarTitle = document.getElementById('scratchpiler-sidebar-title');
        if (sidebarTitle) {
            sidebarTitle.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
        }

        if (currentActiveTab === tabId && sidebarExpanded) {
            // Collapse sidebar
            sidebar.style.display = 'none';
            sidebarExpanded = false;
            buttons[tabId].classList.remove('sp-active');
        } else {
            // Show/switch sidebar tab
            sidebar.style.display = 'flex';
            sidebarExpanded = true;

            // Toggle active button class
            Object.keys(buttons).forEach(k => {
                if (k === tabId) buttons[k].classList.add('sp-active');
                else buttons[k].classList.remove('sp-active');
            });

            // Toggle active panel class
            Object.keys(panels).forEach(k => {
                if (k === tabId) panels[k].classList.add('active');
                else panels[k].classList.remove('active');
            });

            currentActiveTab = tabId;
        }

        // Force Monaco editor layout update
        if (monacoEditor) {
            setTimeout(() => monacoEditor.layout(), 50);
        }
    }

    actExplorer.addEventListener('click', () => switchTab('explorer'));
    actSearch.addEventListener('click', () => switchTab('search'));
    actSettings.addEventListener('click', () => switchTab('settings'));
    actFixes.addEventListener('click', () => switchTab('fixes'));

    // Fixes panel actions
    document.getElementById('sp-fix-clear-cache').addEventListener('click', () => {
        let cleared = 0;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('scratchpiler-content-') || key.startsWith(`${LS_INJ_KEY}-`))) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => { localStorage.removeItem(k); cleared++; });
        // Also clear the legacy key
        try { localStorage.removeItem('scratchpiler-editor-content'); cleared++; } catch {}
        // Clear in-memory injected ID tracking too (persisted entries are already removed above)
        injectedBlockIds.clear();
        updateStatus(`✓ Cleared ${cleared} cached entries`);
        // Reload editor from VM for current sprite
        if (currentSpriteContext) loadFromLocalStorage(currentSpriteContext);
    });

    document.getElementById('sp-fix-reindex').addEventListener('click', () => {
        if (!currentVM) { updateStatus('Error: VM not available'); return; }
        reindex(currentVM);
        renderSidebarSprites();
        if (currentSpriteContext) {
            selectSidebarSprite(currentSpriteContext);
        }
        updateStatus('✓ Re-indexed all sprites & variables');
    });

    document.getElementById('sp-fix-reset-all').addEventListener('click', () => {
        if (!currentVM) { updateStatus('Error: VM not available'); return; }
        if (!confirm('Reset all Scratchpiler changes?\n\nThis will:\n• Remove all injected blocks from every sprite\n• Clear all cached SDSL code\n• Re-index the project\n\nThe project will return to its last-saved state.')) return;

        // 1. Remove injected blocks from every sprite
        let removedCount = 0;
        for (const [spriteName, ids] of injectedBlockIds.entries()) {
            const target = spriteName === '__stage__'
                ? currentVM.runtime.targets.find(t => t.isStage)
                : currentVM.runtime.targets.find(t => !t.isStage && t.sprite.name === spriteName);
            if (target) {
                for (const id of ids) {
                    try { target.blocks.deleteBlock(id); removedCount++; } catch {}
                }
            }
        }
        injectedBlockIds.clear();

        // 2. Clear all localStorage caches (content + persisted injected IDs)
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('scratchpiler-content-') || key.startsWith(`${LS_INJ_KEY}-`))) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        try { localStorage.removeItem('scratchpiler-editor-content'); } catch {}

        // 3. Refresh workspace
        try { currentVM.setEditingTarget(currentVM.editingTarget.id); } catch {}

        // 4. Re-index
        reindex(currentVM);
        renderSidebarSprites();

        // 5. Reset editor to decompile from VM
        if (currentSpriteContext) {
            selectSidebarSprite(currentSpriteContext);
        } else {
            if (monacoEditor) monacoEditor.setValue('');
        }

        updateStatus(`✓ Reset complete — removed ${removedCount} injected blocks, cleared ${keysToRemove.length} cache entries`);
    });

    // Setup accordions inside Sidebar Explorer
    document.querySelectorAll('.sp-accordion-header').forEach(hdr => {
        hdr.addEventListener('click', () => {
            const content = hdr.nextElementSibling;
            hdr.classList.toggle('active');
            content.classList.toggle('active');
            const chevron = hdr.querySelector('.sp-chevron');
            if (chevron) {
                chevron.textContent = hdr.classList.contains('active') ? '▼' : '▶';
            }
        });
    });

    document.querySelectorAll('.sp-sub-accordion-header').forEach(hdr => {
        hdr.addEventListener('click', () => {
            const content = hdr.nextElementSibling;
            hdr.classList.toggle('active');
            content.classList.toggle('active');
            const isAct = hdr.classList.contains('active');
            hdr.textContent = (isAct ? '▼ ' : '▶ ') + hdr.textContent.substring(2);
        });
    });

    // Setup search & replace button click listeners
    document.getElementById('scratchpiler-search-btn').addEventListener('click', runSearch);
    document.getElementById('scratchpiler-search-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') runSearch();
    });
    document.getElementById('scratchpiler-replace-btn').addEventListener('click', runReplace);
    document.getElementById('scratchpiler-replace-all-btn').addEventListener('click', runReplaceAll);
}

function runSearch() {
    const query = document.getElementById('scratchpiler-search-input').value.trim();
    const resultsEl = document.getElementById('scratchpiler-search-results');
    if (!resultsEl) return;
    resultsEl.innerHTML = '';

    if (!query) {
        resultsEl.innerHTML = '<div class="sp-search-no-results">Type a query to search</div>';
        return;
    }

    const matches = [];

    // Search Stage
    const stageCode = localStorage.getItem('scratchpiler-content-__stage__') || '';
    searchCode(stageCode, '__stage__', query, matches);

    // Search Sprites
    for (const s of scratchIndex.sprites) {
        const code = localStorage.getItem(`scratchpiler-content-${s.name}`) || '';
        searchCode(code, s.name, query, matches);
    }

    if (matches.length === 0) {
        resultsEl.innerHTML = '<div class="sp-search-no-results">No results found</div>';
        return;
    }

    // Group matches by sprite name
    const groups = {};
    for (const m of matches) {
        if (!groups[m.spriteName]) groups[m.spriteName] = [];
        groups[m.spriteName].push(m);
    }

    for (const [spriteName, groupMatches] of Object.entries(groups)) {
        const groupHeader = document.createElement('div');
        groupHeader.className = 'sp-search-group-header';
        groupHeader.textContent = spriteName === '__stage__' ? 'Stage.sp' : `${spriteName}.sp`;
        resultsEl.appendChild(groupHeader);

        for (const m of groupMatches) {
            const item = document.createElement('div');
            item.className = 'sp-search-result-item';
            item.innerHTML = `<span class="sp-search-line-num">${m.line}:</span> <span class="sp-search-line-text"></span>`;
            item.querySelector('.sp-search-line-text').textContent = m.text;

            item.addEventListener('click', () => {
                selectSidebarSprite(m.spriteName);
                if (monacoEditor) {
                    monacoEditor.setPosition({ lineNumber: m.line, column: 1 });
                    monacoEditor.revealLineInCenter(m.line);
                    monacoEditor.focus();
                }
            });
            resultsEl.appendChild(item);
        }
    }
}

export function searchCode(code, spriteName, query, matches) {
    const lines = code.split('\n');
    const lowerQuery = query.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(lowerQuery)) {
            matches.push({
                spriteName,
                line: i + 1,
                text: lines[i].trim()
            });
        }
    }
}

function runReplace() {
    const searchVal = document.getElementById('scratchpiler-search-input').value;
    const replaceVal = document.getElementById('scratchpiler-replace-input').value;
    if (!searchVal) return;

    if (monacoEditor) {
        const selection = monacoEditor.getSelection();
        const selectedText = monacoEditor.getModel().getValueInRange(selection);
        if (selectedText.toLowerCase().includes(searchVal.toLowerCase())) {
            const range = new monaco.Range(
                selection.startLineNumber,
                selection.startColumn,
                selection.endLineNumber,
                selection.endColumn
            );
            monacoEditor.executeEdits('search-replace', [{
                range: range,
                text: replaceVal,
                forceMoveMarkers: true
            }]);
            saveToLocalStorage(currentSpriteContext);
            runSearch();
        } else {
            const model = monacoEditor.getModel();
            const matches = model.findMatches(searchVal, true, false, false, null, true);
            if (matches.length > 0) {
                const match = matches[0];
                monacoEditor.setSelection(match.range);
                monacoEditor.revealRangeInCenter(match.range);
                monacoEditor.focus();
            }
        }
    }
}

function runReplaceAll() {
    const searchVal = document.getElementById('scratchpiler-search-input').value;
    const replaceVal = document.getElementById('scratchpiler-replace-input').value;
    if (!searchVal) return;

    if (!confirm(`Are you sure you want to replace all occurrences of "${searchVal}" with "${replaceVal}" in all sprites?`)) {
        return;
    }

    let replacedCount = 0;
    replacedCount += replaceInSprite('__stage__', searchVal, replaceVal);
    for (const s of scratchIndex.sprites) {
        replacedCount += replaceInSprite(s.name, searchVal, replaceVal);
    }

    loadFromLocalStorage(currentSpriteContext);
    updateStatus(`Replaced ${replacedCount} occurrence(s) across all sprites.`);
    runSearch();
}

function replaceInSprite(spriteName, searchVal, replaceVal) {
    const key = `scratchpiler-content-${spriteName}`;
    const code = localStorage.getItem(key) || '';
    if (!code) return 0;

    const escaped = searchVal.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    let count = 0;
    const newCode = code.replace(regex, () => {
        count++;
        return replaceVal;
    });

    if (count > 0) {
        localStorage.setItem(key, newCode);
    }
    return count;
}

function setupSettings() {
    const themeSelect       = document.getElementById('sp-setting-theme');
    const fontSizeSelect    = document.getElementById('sp-setting-fontsize');
    const wrapCheckbox      = document.getElementById('sp-setting-wrap');
    const minimapCheckbox   = document.getElementById('sp-setting-minimap');
    const tabSizeSelect     = document.getElementById('sp-setting-tabsize');
    const autosaveSelect    = document.getElementById('sp-setting-autosave');
    const lintTypecheckChk  = document.getElementById('sp-setting-lint-typecheck');
    const lintUnreachChk    = document.getElementById('sp-setting-lint-unreachable');
    const lintOrphanedChk   = document.getElementById('sp-setting-lint-orphaned');

    let settings = {};
    try {
        settings = JSON.parse(localStorage.getItem('scratchpiler-settings')) || {};
    } catch (_) {}

    if (!settings.theme)                    settings.theme = 'scratchpiler-dark';
    if (!settings.fontSize)                 settings.fontSize = '14';
    if (settings.wrap === undefined)         settings.wrap = true;
    if (settings.minimap === undefined)      settings.minimap = false;
    if (!settings.tabSize)                   settings.tabSize = '4';
    if (settings.autosave === undefined)     settings.autosave = '1000';
    if (settings.lintTypecheck === undefined) settings.lintTypecheck = true;
    if (settings.lintUnreachable === undefined) settings.lintUnreachable = true;
    if (settings.lintOrphaned === undefined)  settings.lintOrphaned = true;

    themeSelect.value      = settings.theme;
    fontSizeSelect.value   = settings.fontSize;
    wrapCheckbox.checked   = settings.wrap;
    minimapCheckbox.checked = settings.minimap;
    tabSizeSelect.value    = settings.tabSize;
    autosaveSelect.value   = settings.autosave;
    lintTypecheckChk.checked  = settings.lintTypecheck;
    lintUnreachChk.checked    = settings.lintUnreachable;
    lintOrphanedChk.checked   = settings.lintOrphaned;

    // Sync into module-level spSettings
    spSettings.tabSize         = parseInt(settings.tabSize, 10) || 4;
    spSettings.autosave        = parseInt(settings.autosave, 10);
    spSettings.lintTypecheck   = settings.lintTypecheck;
    spSettings.lintUnreachable = settings.lintUnreachable;
    spSettings.lintOrphaned    = settings.lintOrphaned;

    function applySettings() {
        if (!monacoEditor) return;
        const newTabSize  = parseInt(tabSizeSelect.value, 10) || 4;
        const newAutosave = parseInt(autosaveSelect.value, 10);
        spSettings.tabSize         = newTabSize;
        spSettings.autosave        = newAutosave;
        spSettings.lintTypecheck   = lintTypecheckChk.checked;
        spSettings.lintUnreachable = lintUnreachChk.checked;
        spSettings.lintOrphaned    = lintOrphanedChk.checked;

        monaco.editor.setTheme(themeSelect.value);
        monacoEditor.updateOptions({
            fontSize: parseInt(fontSizeSelect.value, 10),
            wordWrap: wrapCheckbox.checked ? 'on' : 'off',
            minimap: { enabled: minimapCheckbox.checked },
            tabSize: newTabSize,
            insertSpaces: true,
        });
        localStorage.setItem('scratchpiler-settings', JSON.stringify({
            theme:            themeSelect.value,
            fontSize:         fontSizeSelect.value,
            wrap:             wrapCheckbox.checked,
            minimap:          minimapCheckbox.checked,
            tabSize:          tabSizeSelect.value,
            autosave:         autosaveSelect.value,
            lintTypecheck:    lintTypecheckChk.checked,
            lintUnreachable:  lintUnreachChk.checked,
            lintOrphaned:     lintOrphanedChk.checked,
        }));
    }

    themeSelect.addEventListener('change', applySettings);
    fontSizeSelect.addEventListener('change', applySettings);
    wrapCheckbox.addEventListener('change', applySettings);
    minimapCheckbox.addEventListener('change', applySettings);
    tabSizeSelect.addEventListener('change', applySettings);
    autosaveSelect.addEventListener('change', applySettings);
    lintTypecheckChk.addEventListener('change', applySettings);
    lintUnreachChk.addEventListener('change', applySettings);
    lintOrphanedChk.addEventListener('change', applySettings);

    return applySettings;
}

export function importFromLocalFile() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.sp,.sdsl,.txt';
    inp.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const rdr = new FileReader();
        rdr.onload = ev => {
            if (monacoEditor) {
                monacoEditor.setValue(ev.target.result);
                updateStatus(`Loaded file: ${file.name}`);
            }
        };
        rdr.readAsText(file);
    };
    inp.click();
}

export function exportToLocalFile() {
    if (!monacoEditor) return;
    const code = monacoEditor.getValue();
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const name = currentSpriteContext === '__stage__' ? 'Stage' : (currentSpriteContext || 'project');
    a.download = `${name}.sp`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    updateStatus(`Exported ${name}.sp`);
}

function loadExample(name) {
    if (!monacoEditor) return;
    let code = '';
    if (name === 'hello-world') {
        code = `// Hello World\n// A basic script: say hello when the flag is clicked.\n\non flag {\n    say("Hello, World!")\n    wait(2)\n    say("I'm a Scratch sprite!")\n    wait(2)\n    say("")\n}\n`;
    } else if (name === 'chase-mouse') {
        code = `// Chase Mouse\n// Point towards mouse and move forever\n\non flag {\n    forever {\n        point_towards("_mouse_")\n        move(5)\n    }\n}\n`;
    } else if (name === 'bounce-loop') {
        code = `// Bounce Loop\n// Move and bounce off edges forever\n\non flag {\n    forever {\n        move(10)\n        if_on_edge_bounce()\n    }\n}\n`;
    }
    if (code) {
        monacoEditor.setValue(code);
        updateStatus(`Loaded example: ${name}`);
    }
}

function populateSpriteDropdown() {
    renderSidebarSprites();
}

export function openOverlay() {
    const overlay = document.getElementById('scratchpiler-overlay');
    overlay.style.display = 'flex';
    overlayVisible = true;
    renderSidebarSprites();
    if (!currentSpriteContext) {
        currentSpriteContext = '__stage__';
    }
    selectSidebarSprite(currentSpriteContext);
    const trigger = document.getElementById('scratchpiler-trigger');
    if (trigger) trigger.style.display = 'none';
    if (monacoEditor) { monacoEditor.layout(); monacoEditor.focus(); }
}

export function closeOverlay() {
    saveToLocalStorage(currentSpriteContext);
    document.getElementById('scratchpiler-overlay').style.display = 'none';
    overlayVisible = false;
    const trigger = document.getElementById('scratchpiler-trigger');
    if (trigger) trigger.style.display = '';
}

function toggleOverlay() {
    if (overlayVisible) closeOverlay(); else openOverlay();
}

function startDebugPoll(vm) {
    if (debugPollInterval) return;
    debugPollInterval = setInterval(() => {
        const bar = document.getElementById('sp-debug-bar');
        if (!bar) return;
        if (!overlayVisible) { bar.style.display = 'none'; return; }
        const stage = vm.runtime.targets.find(t => t.isStage);
        if (!stage) return;
        const atV = Object.values(stage.variables).find(v => v.name === '__dbg_at__');
        bar.style.display = (atV && atV.value == 1) ? 'flex' : 'none';
    }, 100);
}

function resumeDebugger() {
    if (!currentVM) return;
    const stage = currentVM.runtime.targets.find(t => t.isStage);
    if (!stage) return;
    const resumeV = Object.values(stage.variables).find(v => v.name === '__dbg_resume__');
    if (resumeV) resumeV.value = 1;
}

// [J] Hotkeys

function registerHotkeys() {
    document.addEventListener('keydown', e => {
        if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM') {
            e.preventDefault(); e.stopPropagation(); toggleOverlay();
        } else if (e.key === 'Escape' && spPickerOpen) {
            e.preventDefault(); e.stopPropagation(); closeSpritePicker();
        } else if (e.key === 'Escape' && searchNowhereOpen) {
            e.preventDefault(); e.stopPropagation(); closeSearchNowhere();
        } else if (e.key === 'Escape' && overlayVisible) {
            e.preventDefault(); e.stopPropagation(); closeOverlay();
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's') && overlayVisible) {
            e.preventDefault(); e.stopPropagation();
            document.getElementById('scratchpiler-compile-btn').click();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'p' && overlayVisible) {
            e.preventDefault(); e.stopPropagation();
            if (spPickerOpen) closeSpritePicker(); else openSpritePicker();
        }
    }, true);

    // Double-Shift opens/closes Search Nowhere (⇧⇧)
    let _snLastShift = 0;
    document.addEventListener('keyup', e => {
        if (e.key === 'Shift' && !e.altKey && !e.ctrlKey && !e.metaKey) {
            const now = Date.now();
            if (now - _snLastShift < 400) {
                _snLastShift = 0;
                if (searchNowhereOpen) closeSearchNowhere(); else openSearchNowhere();
            } else {
                _snLastShift = now;
            }
        }
    }, true);
}

// [K] Persistence

const spSettings = {
    tabSize:         4,
    autosave:        1000,
    lintTypecheck:   true,
    lintUnreachable: true,
    lintOrphaned:    true,
};

let saveTimer = null;
let lintTimer = null;
export let currentSpriteContext = null; // track current sprite for per-sprite save/load

function saveToLocalStorage(spriteName) {
    if (!monacoEditor) return;
    const key = spriteName ? `scratchpiler-content-${spriteName}` : LS_KEY;
    const val = monacoEditor.getValue();
    // Don't cache empty/whitespace-only content — it poisons future
    // decompile attempts when the editor was set to '' before the VM loaded.
    if (!val || !val.trim()) return;
    try { localStorage.setItem(key, val); } catch {}
}

function loadFromLocalStorage(spriteName) {
    if (!monacoEditor) return;
    const key = spriteName ? `scratchpiler-content-${spriteName}` : LS_KEY;
    try {
        const v = localStorage.getItem(key);
        // Use cached value ONLY if it contains actual content.
        // Empty/whitespace-only strings are treated as "no cache" so
        // we always attempt a live decompile from the VM.
        if (v !== null && v.trim() !== '') {
            monacoEditor.setValue(v);
        } else {
            // No cached content — decompile live from the VM
            if (currentVM) {
                try {
                    const code = decompile(currentVM, spriteName);
                    monacoEditor.setValue(code);
                    updateStatus(`Decompiled "${spriteName === '__stage__' ? 'Stage' : spriteName}"`);
                } catch (e) {
                    monacoEditor.setValue('');
                    console.warn('[scratchpiler] decompile failed for', spriteName, e);
                }
            } else {
                monacoEditor.setValue('');
            }
        }
    } catch (e) {
        monacoEditor.setValue('');
    }
}

export function updateStatus(text) {
    const el = document.getElementById('scratchpiler-status');
    if (!el) return;
    let prefix = '> ';
    if (/^(error|warning)/i.test(text)) prefix = '! ';
    else if (/^(injected|imported|index:|created)/i.test(text)) prefix = '✓ ';
    el.textContent = prefix + text;
}

// [K2] Menu + Variable Creation

let activeMenu = null;
let activeContextMenu = null;
let dialogCallback = null;

function showContextMenu(items, x, y) {
    if (activeContextMenu && activeContextMenu.parentNode) activeContextMenu.remove();
    const overlay = document.getElementById('scratchpiler-overlay');
    if (!overlay) return;
    const dropdown = document.createElement('div');
    dropdown.className = 'sp-dropdown sp-context-menu';
    dropdown.style.left = x + 'px';
    dropdown.style.top  = y + 'px';
    for (const item of items) {
        if (item === '-') {
            const sep = document.createElement('div');
            sep.className = 'sp-dropdown-sep';
            dropdown.appendChild(sep);
        } else {
            const el = document.createElement('button');
            el.className = 'sp-dropdown-item';
            el.textContent = item.label;
            if (item.danger) el.style.color = '#ff7070';
            el.addEventListener('click', () => { closeContextMenu(); item.action(); });
            dropdown.appendChild(el);
        }
    }
    overlay.appendChild(dropdown);
    activeContextMenu = dropdown;
    setTimeout(() => {
        const onOutside = e => {
            if (!dropdown.contains(e.target)) {
                closeContextMenu();
                document.removeEventListener('mousedown', onOutside);
            }
        };
        document.addEventListener('mousedown', onOutside);
    }, 0);
}

function closeContextMenu() {
    if (activeContextMenu && activeContextMenu.parentNode) activeContextMenu.remove();
    activeContextMenu = null;
}

function doDeleteVariable(varId) {
    if (!currentVM) { updateStatus('Error: VM not available'); return; }
    let target = null;
    for (const t of currentVM.runtime.targets) {
        if (t.variables[varId]) { target = t; break; }
    }
    if (!target || !target.variables[varId]) { updateStatus('Error: variable not found'); return; }
    const varName = target.variables[varId].name;
    if (typeof target.deleteVariable === 'function') {
        target.deleteVariable(varId);
    } else {
        delete target.variables[varId];
    }
    reindex(currentVM);
    updateSpriteDetails(currentSpriteContext);
    updateStatus(`Deleted "${varName}"`);
}

function openRenameDialog(v) {
    const dialog = document.getElementById('scratchpiler-dialog');
    if (!dialog) return;
    document.getElementById('scratchpiler-dialog-title').textContent = `Rename "${v.name}"`;
    const okBtn = document.getElementById('scratchpiler-dialog-ok');
    if (okBtn) okBtn.textContent = 'Rename';
    const input = document.getElementById('scratchpiler-dialog-input');
    input.value = v.name;
    dialog.style.display = 'flex';
    setTimeout(() => { input.focus(); input.select(); }, 0);
    dialogCallback = newName => {
        dialog.style.display = 'none';
        dialogCallback = null;
        if (okBtn) okBtn.textContent = 'Create';
        if (!newName || !newName.trim()) return;
        newName = newName.trim();
        if (!currentVM) { updateStatus('Error: VM not available'); return; }
        let target = null;
        for (const t of currentVM.runtime.targets) {
            if (t.variables[v.id]) { target = t; break; }
        }
        if (!target) { updateStatus('Error: variable not found'); return; }
        const oldName = target.variables[v.id].name;
        target.variables[v.id].name = newName;
        // Update all block field references
        for (const t of currentVM.runtime.targets) {
            for (const block of Object.values(t.blocks._blocks || {})) {
                for (const field of Object.values(block.fields || {})) {
                    if (field.id === v.id) field.value = newName;
                }
            }
        }
        reindex(currentVM);
        updateSpriteDetails(currentSpriteContext);
        updateStatus(`Renamed "${oldName}" → "${newName}"`);
    };
}

function openInitListDialog(v) {
    const dialog = document.getElementById('scratchpiler-dialog');
    if (!dialog) return;
    document.getElementById('scratchpiler-dialog-title').textContent = `Initialize [${v.name}] (comma-separated)`;
    const okBtn = document.getElementById('scratchpiler-dialog-ok');
    if (okBtn) okBtn.textContent = 'Set';
    const input = document.getElementById('scratchpiler-dialog-input');
    input.value = '';
    input.placeholder = 'e.g. 1, 2, 3';
    dialog.style.display = 'flex';
    setTimeout(() => input.focus(), 0);
    dialogCallback = csv => {
        dialog.style.display = 'none';
        dialogCallback = null;
        if (okBtn) okBtn.textContent = 'Create';
        input.placeholder = '';
        if (!currentVM) return;
        let target = null;
        for (const t of currentVM.runtime.targets) {
            if (t.variables[v.id]) { target = t; break; }
        }
        if (!target) return;
        const items = (csv || '').split(',').map(s => s.trim()).filter(s => s !== '');
        target.variables[v.id].value = items;
        updateStatus(`Initialized [${v.name}] with ${items.length} item(s)`);
    };
}

function openMenu(btnId, items) {
    closeMenu();
    const btn = document.getElementById(btnId);
    const bar = document.getElementById('scratchpiler-menubar');
    if (!btn || !bar) return;
    btn.classList.add('sp-menu-active');
    const dropdown = document.createElement('div');
    dropdown.className = 'sp-dropdown';
    dropdown.style.left = btn.offsetLeft + 'px';
    for (const item of items) {
        if (item === '-') {
            const sep = document.createElement('div');
            sep.className = 'sp-dropdown-sep';
            dropdown.appendChild(sep);
        } else {
            const el = document.createElement('button');
            el.className = 'sp-dropdown-item';
            el.textContent = item.label;
            el.addEventListener('click', () => { closeMenu(); item.action(); });
            dropdown.appendChild(el);
        }
    }
    bar.appendChild(dropdown);
    activeMenu = { btnId, dropdown };
    setTimeout(() => {
        const onOutside = e => {
            if (!dropdown.contains(e.target) && e.target.id !== btnId) {
                closeMenu();
                document.removeEventListener('mousedown', onOutside);
            }
        };
        document.addEventListener('mousedown', onOutside);
    }, 0);
}

function closeMenu() {
    if (!activeMenu) return;
    const btn = document.getElementById(activeMenu.btnId);
    if (btn) btn.classList.remove('sp-menu-active');
    if (activeMenu.dropdown.parentNode) activeMenu.dropdown.remove();
    activeMenu = null;
}

function showCreateDialog(title, onConfirm) {
    const dialog = document.getElementById('scratchpiler-dialog');
    if (!dialog) return;
    document.getElementById('scratchpiler-dialog-title').textContent = title;
    const input = document.getElementById('scratchpiler-dialog-input');
    input.value = '';
    dialog.style.display = 'flex';
    setTimeout(() => input.focus(), 0);
    dialogCallback = name => {
        dialog.style.display = 'none';
        dialogCallback = null;
        if (name && name.trim()) onConfirm(name.trim());
    };
}

function doCreateVariable(name, isGlobal, isList) {
    if (!currentVM) { updateStatus('Error: VM not available'); return; }
    const spriteName = currentSpriteContext;
    const stage = currentVM.runtime.targets.find(t => t.isStage);
    const target = (isGlobal || spriteName === '__stage__')
        ? stage
        : currentVM.runtime.targets.find(t => !t.isStage && t.sprite.name === spriteName);
    if (!target) { updateStatus('Error: target not found'); return; }
    const varType = isList ? 'list' : '';
    const existing = Object.values(target.variables).find(v => v.name === name && v.type === varType);
    if (existing) {
        updateStatus(`Error: ${isList ? 'list' : 'variable'} "${name}" already exists`);
        return;
    }
    target.createVariable(uid(), name, varType);
    reindex(currentVM);
    const scope = (isGlobal || spriteName === '__stage__') ? 'global' : 'local';
    updateStatus(`Created ${scope} ${isList ? 'list' : 'variable'} "${name}"`);
}

// [N] Bootstrap

export function bootstrap() {
    buildOverlayDOM();
    buildTriggerButton();
    buildSearchNowhereDOM();
    registerHotkeys();

    document.getElementById('scratchpiler-close-btn').addEventListener('click', closeOverlay);
    document.getElementById('sp-debug-resume-btn').addEventListener('click', resumeDebugger);

    document.getElementById('sp-menu-file').addEventListener('click', () => {
        openMenu('sp-menu-file', [
            { label: 'Import from active sprite', action: () => document.getElementById('scratchpiler-import-btn').click() },
            { label: 'Compile & Inject (Ctrl+Enter)', action: () => document.getElementById('scratchpiler-compile-btn').click() },
            '-',
            { label: 'Open .sp file...', action: () => importFromLocalFile() },
            { label: 'Save as .sp file...', action: () => exportToLocalFile() },
            '-',
            { label: 'Clear Editor', action: () => { if (confirm("Clear all editor content?")) monacoEditor.setValue(""); } }
        ]);
    });

    document.getElementById('sp-menu-edit').addEventListener('click', () => {
        openMenu('sp-menu-edit', [
            { label: 'Format Document', action: () => monacoEditor.getAction('editor.action.formatDocument').run() },
            { label: 'Find & Replace', action: () => {
                const searchBtn = document.getElementById('sp-activity-search');
                if (searchBtn) {
                    const sidebar = document.getElementById('scratchpiler-sidebar');
                    const panels = {
                        explorer: document.getElementById('sp-panel-explorer'),
                        search: document.getElementById('sp-panel-search'),
                        settings: document.getElementById('sp-panel-settings'),
                        fixes: document.getElementById('sp-panel-fixes')
                    };
                    const buttons = {
                        explorer: document.getElementById('sp-activity-explorer'),
                        search: searchBtn,
                        settings: document.getElementById('sp-activity-settings'),
                        fixes: document.getElementById('sp-activity-fixes')
                    };
                    sidebar.style.display = 'flex';
                    sidebarExpanded = true;
                    document.getElementById('scratchpiler-sidebar-title').textContent = 'Search';
                    Object.keys(buttons).forEach(k => {
                        if (k === 'search') buttons[k].classList.add('sp-active');
                        else buttons[k].classList.remove('sp-active');
                    });
                    Object.keys(panels).forEach(k => {
                        if (k === 'search') panels[k].classList.add('active');
                        else panels[k].classList.remove('active');
                    });
                    currentActiveTab = 'search';
                    if (monacoEditor) monacoEditor.layout();
                }
                const searchInput = document.getElementById('scratchpiler-search-input');
                if (searchInput) searchInput.focus();
            } },
            '-',
            { label: 'Toggle Line Wrap', action: () => {
                const wrapChk = document.getElementById('sp-setting-wrap');
                if (wrapChk) { wrapChk.checked = !wrapChk.checked; wrapChk.dispatchEvent(new Event('change')); }
            } },
            { label: 'Toggle Minimap', action: () => {
                const miniChk = document.getElementById('sp-setting-minimap');
                if (miniChk) { miniChk.checked = !miniChk.checked; miniChk.dispatchEvent(new Event('change')); }
            } }
        ]);
    });

    document.getElementById('sp-menu-variables').addEventListener('click', () => {
        openMenu('sp-menu-variables', [
            { label: 'New global variable…', action: () => showCreateDialog('New Global Variable', n => doCreateVariable(n, true, false)) },
            { label: 'New local variable…',  action: () => showCreateDialog('New Local Variable',  n => doCreateVariable(n, false, false)) },
            '-',
            { label: 'Rename / Delete…', action: () => {
                const actExplorer = document.getElementById('sp-activity-explorer');
                if (actExplorer) actExplorer.click();
                updateStatus('Right-click a variable in the sidebar to rename or delete it');
            }},
        ]);
    });

    document.getElementById('sp-menu-lists').addEventListener('click', () => {
        openMenu('sp-menu-lists', [
            { label: 'New global list…', action: () => showCreateDialog('New Global List', n => doCreateVariable(n, true, true)) },
            { label: 'New local list…',  action: () => showCreateDialog('New Local List',  n => doCreateVariable(n, false, true)) },
            '-',
            { label: 'Rename / Delete / Initialize…', action: () => {
                const actExplorer = document.getElementById('sp-activity-explorer');
                if (actExplorer) actExplorer.click();
                updateStatus('Click ⋮ on a list in the sidebar to rename, delete, or initialize it');
            }},
        ]);
    });

    document.getElementById('sp-menu-help').addEventListener('click', () => {
        openMenu('sp-menu-help', [
            { label: 'GitHub Repository', action: () => window.open('https://www.github.com/Earth1283/scratchpiler/', '_blank') },
            '-',
            { label: 'Load Example: Hello World', action: () => loadExample('hello-world') },
            { label: 'Load Example: Chase Mouse', action: () => loadExample('chase-mouse') },
            { label: 'Load Example: Bounce Loop', action: () => loadExample('bounce-loop') }
        ]);
    });

    setupActivityBar();
    setupOutputPanel();
    setupSpritePicker();
    setupSidebarResize();

    const confirmDialog = () => {
        if (dialogCallback) dialogCallback(document.getElementById('scratchpiler-dialog-input').value);
    };
    document.getElementById('scratchpiler-dialog-cancel').addEventListener('click', () => {
        document.getElementById('scratchpiler-dialog').style.display = 'none';
        dialogCallback = null;
    });
    document.getElementById('scratchpiler-dialog-ok').addEventListener('click', confirmDialog);
    document.getElementById('scratchpiler-dialog-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') confirmDialog();
        else if (e.key === 'Escape') {
            document.getElementById('scratchpiler-dialog').style.display = 'none';
            dialogCallback = null;
        }
    });

    document.getElementById('scratchpiler-import-btn').addEventListener('click', () => {
        if (!currentVM) { updateStatus('Error: VM not available'); return; }
        const spriteName = currentSpriteContext;
        updateStatus('Importing...');
        try {
            const code = decompile(currentVM, spriteName);
            monacoEditor.setValue(code);
            monacoEditor.setScrollPosition({ scrollTop: 0 });
            updateStatus(`Imported from "${spriteName}"`);
        } catch (e) {
            updateStatus('Import error: ' + e.message);
            console.error('[scratchpiler] import exception', e);
        }
    });

    loadMonaco(function (monaco) {
        registerLanguage(monaco);

        monacoEditor = monaco.editor.create(
            document.getElementById('scratchpiler-editor-container'),
            {
                value: '',
                language: LANG_ID,
                theme: 'scratchpiler-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                tabCompletion: 'on',
                smoothScrolling: true,
                cursorSmoothCaretAnimation: 'on',
                cursorBlinking: 'smooth',
                stickyScroll: { enabled: true },
            }
        );

        monacoEditor.onDidChangeCursorPosition(e => {
            updateStatusBarCursor(e.position.lineNumber, e.position.column);
        });

        applySettingsFn = setupSettings();
        if (applySettingsFn) applySettingsFn();

        monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            document.getElementById('scratchpiler-compile-btn').click();
        });

        // Format button (hidden compatibility button listener)
        document.getElementById('scratchpiler-format-btn').addEventListener('click', () => {
            monacoEditor.getAction('editor.action.formatDocument').run();
        });

        monacoEditor.onDidChangeModelContent(() => {
            clearTimeout(saveTimer);
            clearTimeout(lintTimer);
            const saveDelay = isFinite(spSettings.autosave) ? spSettings.autosave : 1000;
            if (saveDelay === 0) {
                saveToLocalStorage(currentSpriteContext);
            } else {
                saveTimer = setTimeout(() => saveToLocalStorage(currentSpriteContext), saveDelay);
            }
            lintTimer = setTimeout(() => {
                const src = monacoEditor.getValue();
                try {
                    const toks = tokenize(src);
                    const { ast, errors } = parse(toks);
                    const model = monacoEditor.getModel();
                    const sn = currentSpriteContext;
                    const rawLint = lint(ast);

                    const lintWarnings = rawLint.filter(w => {
                        const msg = w.message || '';
                        if (!spSettings.lintUnreachable && msg.startsWith('Unreachable')) return false;
                        if (!spSettings.lintOrphaned && msg.startsWith('Orphaned')) return false;
                        return true;
                    });

                    const typeWarnings = spSettings.lintTypecheck
                        ? typeCheckDiagnostics(ast, sn)
                        : [];

                    monaco.editor.setModelMarkers(model, LANG_ID, [
                        ...errors.map(er => ({
                            startLineNumber: er.line, startColumn: er.col,
                            endLineNumber:   er.line, endColumn: er.col + (er.len || 1),
                            message:  er.message,
                            severity: monaco.MarkerSeverity.Error,
                        })),
                        ...lintWarnings.map(w => ({
                            startLineNumber: w.line, startColumn: w.col,
                            endLineNumber:   w.line,
                            endColumn: model.getLineMaxColumn(w.line),
                            message:  w.message,
                            severity: monaco.MarkerSeverity.Warning,
                        })),
                        ...typeWarnings.map(w => ({
                            startLineNumber: w.line, startColumn: w.col,
                            endLineNumber:   w.line, endColumn: w.col + (w.len || 1),
                            message:  w.message,
                            severity: monaco.MarkerSeverity.Warning,
                        })),
                    ]);
                    updateStatusBarProblems(errors.length, lintWarnings.length + typeWarnings.length);
                } catch (_) {}
            }, 350);
        });

        // Compile & Inject button
        document.getElementById('scratchpiler-compile-btn').addEventListener('click', () => {
            if (!currentVM) { updateStatus('Error: VM not available'); return; }
            const spriteName = currentSpriteContext;
            const source = monacoEditor.getValue();
            updateStatus('Compiling...');

            let result;
            try { result = compileSource(source, currentVM, spriteName); }
            catch (e) {
                updateStatus('Compile error: ' + e.message);
                logToOutput('Compile error: ' + e.message, 'error');
                flashCompileBtn(false);
                console.error('[scratchpiler] compile exception', e);
                return;
            }

            // Show Monaco error markers
            monaco.editor.setModelMarkers(monacoEditor.getModel(), LANG_ID,
                result.errors.map(e => ({
                    startLineNumber: e.line, startColumn: e.col,
                    endLineNumber: e.line, endColumn: e.col + (e.len || 1),
                    message: e.message,
                    severity: monaco.MarkerSeverity.Error,
                }))
            );

            if (result.errors.length > 0) {
                const msg = `${result.errors.length} error(s) — not injected`;
                updateStatus(msg);
                result.errors.forEach(er => logToOutput(`Line ${er.line}:${er.col} — ${er.message}`, 'error'));
                flashCompileBtn(false);
                return;
            }

            injectBlocks(result.blocks, currentVM, spriteName);
            flashCompileBtn(true);
            const blockCount = Object.keys(result.blocks).length;
            const label = spriteName === '__stage__' ? 'Stage' : spriteName;
            logToOutput(`Compiled & injected ${blockCount} block(s) into "${label}"`, 'ok');
        });

        document.getElementById('sp-sb-problems')?.addEventListener('click', () => {
            const panel     = document.getElementById('sp-output-panel');
            const toggleBtn = document.getElementById('sp-output-toggle-btn');
            if (!panel) return;
            panel.classList.add('sp-expanded');
            if (toggleBtn) toggleBtn.textContent = '▾';
            if (monacoEditor) setTimeout(() => monacoEditor.layout(), 160);
        });

        acquireVM(
            vm => {
                currentVM = vm;
                updateStatusBarVM('ok');
                reindex(vm);
                startDebugPoll(vm);
                vm.on('targetsUpdate',   () => { reindex(vm); if (overlayVisible) populateSpriteDropdown(); });
                vm.runtime.on('PROJECT_LOADED', () => {
                    // A new project was loaded — any previously-tracked injected block IDs
                    // are stale (they belonged to the old project).  Clear both the in-memory
                    // map and the persisted localStorage entries so the next injection starts
                    // clean and doesn't try to delete IDs that no longer exist.
                    const injectedKeys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith(`${LS_INJ_KEY}-`)) injectedKeys.push(k);
                    }
                    injectedKeys.forEach(k => localStorage.removeItem(k));
                    injectedBlockIds.clear();
                    reindex(vm);
                });

                // If the overlay was opened before the VM was acquired,
                // re-trigger the sprite selection so the editor decompiles live code.
                if (overlayVisible && currentSpriteContext) {
                    renderSidebarSprites();
                    selectSidebarSprite(currentSpriteContext);
                }
            },
            () => { updateStatus('Warning: VM not found after 15s'); updateStatusBarVM('error'); }
        );
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}
