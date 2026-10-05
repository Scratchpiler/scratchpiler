import { escapeHtml } from "./ui-dom.js";

const STORAGE_KEY = 'scratchpiler-problems-view';
const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };
const MAX_ROWS_PER_GROUP = 200;
const CHEVRON = '<svg class="sp-pg-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>';

function loadState() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return { collapsed: new Set(saved.collapsed || []), expanded: new Set(saved.expanded || []), showHints: saved.showHints ?? true };
    } catch {
        return { collapsed: new Set(), expanded: new Set(), showHints: true };
    }
}
const state = loadState();
function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed: [...state.collapsed], expanded: [...state.expanded], showHints: state.showHints })); } catch {}
}

export const problemsShowHints = () => state.showHints;

export function toggleProblemHints() {
    state.showHints = !state.showHints;
    saveState();
}

let lastHtml = '';
const groupDefaults = new Map();
const isCollapsed = group => state.collapsed.has(group.key) || (group.collapsedByDefault && !state.expanded.has(group.key));

export function toggleProblemGroup(key) {
    const collapsed = isCollapsed({ key, collapsedByDefault: groupDefaults.get(key) });
    state.collapsed.delete(key);
    state.expanded.delete(key);
    (collapsed ? state.expanded : state.collapsed).add(key);
    saveState();
}

const counts = items => {
    const out = { error: 0, warning: 0, info: 0 };
    for (const item of items) out[item.severity]++;
    return out;
};

const countPills = c => ['error', 'warning', 'info']
    .filter(severity => c[severity])
    .map(severity => `<span class="sp-pg-n sp-${severity}">${c[severity]}</span>`).join('');

function row(item, group) {
    const where = item.where ?? `${item.line}:${item.col}`;
    const data = item.varId
        ? `data-var="${escapeHtml(item.varId)}"`
        : `data-key="${escapeHtml(group.key)}" data-line="${item.line}" data-col="${item.col}"`;
    return `<div class="sp-prob" ${data} title="${escapeHtml(item.message)}"><span class="sp-sev sp-${item.severity}"></span><span class="sp-prob-msg">${formatMessage(item.message)}</span><span class="sp-loc">${escapeHtml(where)}</span></div>`;
}

function formatMessage(message) {
    return escapeHtml(message).replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function renderProblemsView(container, groups, { emptyText }) {
    const visibleGroups = groups
        .map(group => ({ ...group, shown: group.items.filter(i => state.showHints || i.severity !== 'info') }))
        .filter(group => group.shown.length);
    const html = visibleGroups.length ? visibleGroups.map(group => {
        groupDefaults.set(group.key, !!group.collapsedByDefault);
        const collapsed = isCollapsed(group);
        const sorted = collapsed ? [] : group.shown
            .slice().sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (a.line ?? 0) - (b.line ?? 0) || (a.col ?? 0) - (b.col ?? 0));
        const hidden = sorted.length - MAX_ROWS_PER_GROUP;
        const rows = sorted.slice(0, MAX_ROWS_PER_GROUP).map(item => row(item, group)).join('')
            + (hidden > 0 ? `<div class="sp-prob-more">${hidden} more in ${escapeHtml(group.label)}</div>` : '');
        return `<div class="sp-pg${collapsed ? ' sp-collapsed' : ''}"><button class="sp-pg-h" data-group="${escapeHtml(group.key)}" aria-expanded="${!collapsed}">${CHEVRON}<span class="sp-pg-name">${escapeHtml(group.label)}</span>${group.note ? `<span class="sp-pg-note">${escapeHtml(group.note)}</span>` : ''}<span class="sp-grow"></span>${countPills(counts(group.shown))}</button>${rows}</div>`;
    }).join('') : `<div class="sp-empty">${escapeHtml(emptyText)}</div>`;
    if (html === lastHtml && container.firstChild) return;
    lastHtml = html;
    container.innerHTML = html;
}
