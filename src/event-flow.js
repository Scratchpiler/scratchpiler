import { projectAnalysis, onProjectChange, projectProgress } from "./project-service.js";
import { eventGraph, parseVarKey, STAGE } from "./project-analysis.js";
import { revealPosition } from "./editor.js";
import { thumbnailUrl } from "./explorer.js";
import { escapeHtml, spriteLabel, plural } from "./ui-dom.js";

const $ = id => document.getElementById(id);
const ENTRY_SIZE = { w: 216, h: 44 };
const RECEIVER_SIZE = { w: 216, h: 38 };
const MESSAGE_SIZE = { w: 168, h: 30 };
const HUB_SIZE = { w: 196, h: 38 };
const HUB_RECEIVERS = 3;
const COLUMN_GAP = 96;
const ROW_GAP = 24;
const HAT_CAP = 11;
const GROUP_GAP = 22;
const TRAY_PAD = 10;
const TRAY_HEADER = 42;
const COLUMN_HEADER = 44;
const PADDING = 28;
const ENTRY_EVENTS = new Set(['flag', 'key', 'click', 'backdrop', 'greaterThan']);
const SVG = 'http://www.w3.org/2000/svg';

const HAT_ICONS = {
    flag: '<path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/>',
    key: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11h.01M11 11h.01M15 11h.01M8 14h8"/>',
    click: '<path d="M9 9l10 4-4 1.5L13.5 19z"/><path d="M5 5l1.5 1.5M10 3v2M3 10h2"/>',
    receive: '<path d="M4 12h12M12 7l5 5-5 5"/><path d="M20 5v14"/>',
    clone: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    backdrop: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 15l5-4 4 3 3-2 6 4"/>',
    greaterThan: '<circle cx="12" cy="13" r="7"/><path d="M12 13V9M10 3h4"/>',
    routine: '<path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3"/><path d="M18 3v4h-4M6 21v-4h4"/>',
};
const icon = name => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${HAT_ICONS[name] ?? HAT_ICONS.receive}</svg>`;

let open = false;
let selected = null;
let filter = '';
let layout = null;
let renderTimer = null;
let zoom = null;
let hovered = null;
let animateNextRender = false;
const ZOOM_STEPS = [0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.15];

export const isEventFlowOpen = () => open;

export function openEventFlow() {
    open = true;
    animateNextRender = true;
    $('sp-flow').hidden = false;
    $('sp-flow').classList.remove('sp-flow-leaving');
    document.querySelectorAll('#scratchpiler-overlay [data-flow-toggle]').forEach(b => b.setAttribute('aria-pressed', 'true'));
    render();
    $('sp-flow-filter').focus({ preventScroll: true });
}

export function closeEventFlow() {
    if (!open) return;
    open = false;
    selected = null;
    $('sp-flow').hidden = true;
    document.querySelectorAll('#scratchpiler-overlay [data-flow-toggle]').forEach(b => b.setAttribute('aria-pressed', 'false'));
}

const hatFamily = hat => hat.routine ? 'routine' : hat.event === 'clone' ? 'clone' : ENTRY_EVENTS.has(hat.event) ? 'entry' : 'receive';

function buildNodes(graph) {
    const nodes = new Map();
    for (const script of graph.scripts) {
        const family = hatFamily(script.hat);
        nodes.set(script.id, { id: script.id, kind: 'script', family, data: script, ...(family === 'entry' ? ENTRY_SIZE : RECEIVER_SIZE) });
    }
    for (const message of graph.messages) nodes.set(message.id, { id: message.id, kind: 'message', data: message, ...MESSAGE_SIZE });
    const seen = new Set();
    const edges = graph.edges.filter(e => nodes.has(e.from) && nodes.has(e.to) && !seen.has(`${e.from}>${e.to}`) && seen.add(`${e.from}>${e.to}`));
    for (const node of nodes.values()) { node.out = []; node.in = []; }
    for (const edge of edges) { nodes.get(edge.from).out.push(edge); nodes.get(edge.to).in.push(edge); }
    for (const node of nodes.values()) {
        if (node.kind === 'message' && node.out.length >= HUB_RECEIVERS) Object.assign(node, HUB_SIZE, { hub: true });
    }
    return { nodes, edges };
}

function assignLayers(nodes, edges) {
    const state = new Map();
    const back = new Set();
    const sorted = [...nodes.values()].sort((a, b) => a.in.length - b.in.length || a.id.localeCompare(b.id));
    for (const start of sorted) {
        if (state.has(start.id)) continue;
        const stack = [[start, 0]];
        state.set(start.id, 'active');
        while (stack.length) {
            const frame = stack.at(-1);
            const [node, i] = frame;
            if (i >= node.out.length) { state.set(node.id, 'done'); stack.pop(); continue; }
            frame[1]++;
            const edge = node.out[i];
            const next = nodes.get(edge.to);
            if (state.get(next.id) === 'active') back.add(edge);
            else if (!state.has(next.id)) { state.set(next.id, 'active'); stack.push([next, 0]); }
        }
    }
    const forward = edges.filter(e => !back.has(e));
    const indegree = new Map([...nodes.keys()].map(id => [id, 0]));
    for (const e of forward) indegree.set(e.to, indegree.get(e.to) + 1);
    const queue = [...nodes.values()].filter(n => indegree.get(n.id) === 0);
    for (const node of nodes.values()) node.layer = 0;
    while (queue.length) {
        const node = queue.shift();
        for (const e of node.out) {
            if (back.has(e)) continue;
            const next = nodes.get(e.to);
            next.layer = Math.max(next.layer, node.layer + 1);
            indegree.set(e.to, indegree.get(e.to) - 1);
            if (indegree.get(e.to) === 0) queue.push(next);
        }
    }
    return back;
}

function orderLayers(nodes) {
    const layers = [];
    for (const node of nodes.values()) (layers[node.layer] ??= []).push(node);
    for (const layer of layers) {
        layer.sort((a, b) => (a.data.sprite ?? '~').localeCompare(b.data.sprite ?? '~') || a.id.localeCompare(b.id));
        layer.forEach((n, i) => { n.order = i; });
    }
    const barycenter = (node, neighbours) => {
        const orders = neighbours.map(id => nodes.get(id)).filter(Boolean).map(n => n.order);
        return orders.length ? orders.reduce((a, b) => a + b, 0) / orders.length : node.order;
    };
    for (let sweep = 0; sweep < 4; sweep++) {
        const downward = sweep % 2 === 0;
        const sequence = downward ? layers.slice(1) : layers.slice(0, -1).reverse();
        for (const layer of sequence) {
            for (const node of layer) node.weight = barycenter(node, downward ? node.in.map(e => e.from) : node.out.map(e => e.to));
            layer.sort((a, b) => a.weight - b.weight);
            layer.forEach((n, i) => { n.order = i; });
        }
    }
    return layers.map(groupBySprite);
}

const groupKey = node => node.kind === 'script' ? `sprite:${node.data.sprite}` : node.id;

function groupBySprite(layer) {
    const groups = new Map();
    for (const node of layer) {
        const key = groupKey(node);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(node);
    }
    const mean = nodes => nodes.reduce((sum, n) => sum + n.order, 0) / nodes.length;
    const grouped = [...groups.values()].sort((a, b) => mean(a) - mean(b)).flat();
    grouped.forEach((n, i) => { n.order = i; });
    return grouped;
}

function columnLabel(layer, index) {
    const scripts = layer.filter(n => n.kind === 'script').length;
    const messages = layer.length - scripts;
    if (index === 0) return { title: 'Starts', count: plural(layer.length, 'script') };
    if (!scripts) return { title: 'Messages', count: plural(messages, 'message') };
    if (!messages) return { title: 'Then runs', count: plural(scripts, 'script') };
    return { title: 'Then', count: `${plural(scripts, 'script')}, ${plural(messages, 'message')}` };
}

function place(layers) {
    if (!layers.length) return { width: 0, height: 0, trays: [], columns: [] };
    const trays = [], columns = [];
    let x = PADDING, bottom = 0;
    layers.forEach((layer, index) => {
        const width = Math.max(...layer.map(n => n.w)) + TRAY_PAD * 2;
        columns.push({ x, width, ...columnLabel(layer, index) });
        let y = PADDING + COLUMN_HEADER;
        let tray = null;
        const closeTray = () => {
            if (!tray) return;
            tray.h = y - ROW_GAP + TRAY_PAD - tray.y;
            y = tray.y + tray.h + GROUP_GAP;
            tray = null;
        };
        for (const node of layer) {
            if (node.kind === 'script' && tray?.sprite !== node.data.sprite) {
                closeTray();
                tray = { sprite: node.data.sprite, x, y, w: width, ids: [] };
                trays.push(tray);
                y += TRAY_HEADER;
            } else if (node.kind !== 'script') {
                closeTray();
            }
            node.x = x + (width - node.w) / 2;
            node.y = y;
            tray?.ids.push(node.id);
            y += node.h + ROW_GAP;
        }
        closeTray();
        bottom = Math.max(bottom, y);
        x += width + COLUMN_GAP;
    });
    return { width: x - COLUMN_GAP + PADDING, height: bottom + PADDING, trays, columns };
}

function computeLayout() {
    const linked = projectAnalysis();
    if (!linked) return null;
    const graph = eventGraph(linked);
    const { nodes, edges } = buildNodes(graph);
    const connected = new Map([...nodes].filter(([, n]) => n.in.length || n.out.length));
    const isolated = [...nodes.values()].filter(n => !n.in.length && !n.out.length && n.kind === 'script');
    const back = assignLayers(connected, edges);
    const layers = orderLayers(connected);
    const size = place(layers);
    return { nodes: connected, edges, back, isolated, size, graph, linked };
}

function edgePath(from, to, isBack) {
    const x1 = from.x + from.w, y1 = from.y + from.h / 2;
    const x2 = to.x, y2 = to.y + to.h / 2;
    if (isBack || x2 <= x1) {
        const drop = Math.max(from.y + from.h, to.y + to.h) + 36;
        return `M${x1},${y1} C${x1 + 70},${y1} ${x1 + 70},${drop} ${(x1 + x2) / 2},${drop} S${x2 - 70},${y2} ${x2},${y2}`;
    }
    const dx = Math.max(40, (x2 - x1) / 2);
    return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

const hatIcon = data => data.hat.routine ? 'routine' : data.hat.event;
const matches = (node, query) => !query || (node.kind === 'script'
    ? `${spriteLabel(node.data.sprite)} ${node.data.label}`
    : node.data.name).toLowerCase().includes(query);

const delay = layer => `--sp-d:${Math.min(layer, 10) * 55}ms`;

function nodeHtml(node) {
    const box = `left:${node.x}px;top:${node.y}px;width:${node.w}px;height:${node.h}px;${delay(node.layer)}`;
    if (node.kind === 'message') {
        const label = node.data.routine ? `${node.data.name}()` : `"${node.data.name}"`;
        const fanOut = node.out.length > 1 ? `<span class="sp-fn-fan" title="${plural(node.out.length, 'receiver')}">${node.out.length}</span>` : '';
        return `<button class="sp-fn sp-fn-msg${node.hub ? ' sp-hub' : ''}${node.data.routine ? ' sp-fn-routine' : ''}" data-id="${escapeHtml(node.id)}" style="${box}" title="${escapeHtml(label)}"><span class="sp-fn-name">${escapeHtml(label)}</span>${fanOut}</button>`;
    }
    const d = node.data;
    return `<button class="sp-fn sp-fn-hat sp-hat-${node.family}" data-id="${escapeHtml(node.id)}" style="${box}" title="${escapeHtml(`${spriteLabel(d.sprite)}: ${d.label}, line ${d.line}`)}">
        <svg class="sp-hat-shape" width="${node.w}" height="${node.h + HAT_CAP}" viewBox="0 0 ${node.w} ${node.h + HAT_CAP}" aria-hidden="true"><path d="${hatPath(node.w, node.h)}"/></svg>
        <span class="sp-fn-ic">${icon(hatIcon(d))}</span><span class="sp-fn-label">${escapeHtml(d.label)}</span></button>`;
}

function hatPath(w, h) {
    const r = 7, top = HAT_CAP, bottom = HAT_CAP + h;
    return `M0.5,${top} c19,-15 57,-15 76,0 H${w - r} a${r},${r} 0 0 1 ${r - 0.5},${r} V${bottom - r} a${r},${r} 0 0 1 ${-r},${r - 0.5} H${r} a${r},${r} 0 0 1 ${0.5 - r},${0.5 - r} Z`;
}

function trayHtml(tray) {
    const thumb = thumbnailUrl(tray.sprite);
    const avatar = thumb ? `<img src="${escapeHtml(thumb)}" alt="">` : `<span>${escapeHtml(spriteLabel(tray.sprite).trim().slice(0, 1).toUpperCase())}</span>`;
    return `<div class="sp-flow-tray" data-tray="${escapeHtml(tray.ids.join(' '))}" style="left:${tray.x}px;top:${tray.y}px;width:${tray.w}px;height:${tray.h}px;${delay(layout.nodes.get(tray.ids[0]).layer)}">
        <div class="sp-flow-tray-h"><span class="sp-flow-avatar">${avatar}</span>${escapeHtml(spriteLabel(tray.sprite))}</div></div>`;
}

function columnHtml(column) {
    return `<div class="sp-flow-col" style="left:${column.x}px;width:${column.width}px"><b>${escapeHtml(column.title)}</b><span>${escapeHtml(column.count)}</span></div>`;
}

function render() {
    if (!open) return;
    const progress = projectProgress();
    layout = computeLayout();
    const canvas = $('sp-flow-canvas');
    if (!layout) {
        $('sp-flow-stats').textContent = '';
        canvas.innerHTML = `<div class="sp-flow-empty">${progress.running ? 'Reading every sprite…' : 'Open the project in Scratch to see how its scripts talk to each other.'}</div>`;
        renderDetail();
        return;
    }
    const { nodes, edges, back, isolated, size, graph } = layout;
    $('sp-flow-stats').textContent = `${plural(graph.scripts.length, 'script')}, ${plural(graph.messages.length, 'message')} and ${plural(edges.length, 'link')}`;
    const svg = `<svg class="sp-flow-edges" width="${size.width}" height="${size.height}" xmlns="${SVG}">${edges.map(e =>
        `<path class="sp-fe sp-fe-${e.kind}" data-from="${escapeHtml(e.from)}" data-to="${escapeHtml(e.to)}" d="${edgePath(nodes.get(e.from), nodes.get(e.to), back.has(e))}"/>`).join('')}</svg>`;
    const isolatedHtml = isolated.length ? `<section class="sp-flow-loose"><h3>Scripts that don't send or receive anything <span>${isolated.length}</span></h3><div>${isolated
        .sort((a, b) => a.data.sprite.localeCompare(b.data.sprite))
        .map(n => `<button class="sp-flow-chip" data-id="${escapeHtml(n.id)}"><span class="sp-fn-ic sp-hat-${hatFamily(n.data.hat)}">${icon(hatIcon(n.data))}</span>${escapeHtml(spriteLabel(n.data.sprite))} <em>${escapeHtml(n.data.label)}</em></button>`).join('')}</div></section>` : '';
    for (const n of isolated) nodes.set(n.id, n);
    const placed = [...nodes.values()].filter(n => n.x !== undefined);
    canvas.innerHTML = `<div class="sp-flow-stage${animateNextRender ? ' sp-entering' : ''}" style="width:${size.width}px;height:${size.height}px">${size.columns.map(columnHtml).join('')}${size.trays.map(trayHtml).join('')}${svg}${placed.map(nodeHtml).join('')}</div>${isolatedHtml}`;
    animateNextRender = false;
    if (selected && !nodes.has(selected)) selected = null;
    if (zoom === null) {
        const view = canvas.getBoundingClientRect();
        const fit = Math.min(1, (view.height - 24) / size.height);
        zoom = ZOOM_STEPS.findLast(step => step <= Math.max(fit, 0.75)) ?? 1;
    }
    applyZoom();
    applyHighlight();
    renderDetail();
}

function applyZoom() {
    const stage = document.querySelector('#sp-flow-canvas .sp-flow-stage');
    if (stage) stage.style.zoom = zoom;
    $('sp-flow-zoom-level').textContent = `${Math.round(zoom * 100)}%`;
}

function stepZoom(direction) {
    const index = ZOOM_STEPS.indexOf(zoom);
    zoom = ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, (index === -1 ? ZOOM_STEPS.indexOf(1) : index) + direction))];
    applyZoom();
}

function neighbourhood(id) {
    const ids = new Set([id]);
    for (const e of layout.edges) {
        if (e.from === id) ids.add(e.to);
        if (e.to === id) ids.add(e.from);
    }
    return ids;
}

function applyHighlight() {
    if (!layout) return;
    const query = filter.trim().toLowerCase();
    const anchor = selected ?? hovered;
    const focus = anchor ? neighbourhood(anchor) : null;
    const shown = id => {
        const node = layout.nodes.get(id);
        return (!focus || focus.has(id)) && (!node || matches(node, query));
    };
    document.querySelectorAll('#sp-flow-canvas [data-id]').forEach(el => {
        el.classList.toggle('sp-dim', !shown(el.dataset.id));
        el.classList.toggle('sp-sel', el.dataset.id === selected);
    });
    document.querySelectorAll('#sp-flow-canvas .sp-flow-tray').forEach(el => {
        el.classList.toggle('sp-dim', !el.dataset.tray.split(' ').some(shown));
    });
    document.querySelectorAll('#sp-flow-canvas .sp-fe').forEach(el => {
        const lit = anchor && (el.dataset.from === anchor || el.dataset.to === anchor);
        el.classList.toggle('sp-lit', !!lit);
        el.classList.toggle('sp-dim', !!anchor && !lit);
    });
}

const MAX_CHIPS = 24;
function chips(keys) {
    if (!keys.length) return '<span class="sp-flow-none">none</span>';
    const more = keys.length > MAX_CHIPS ? `<span class="sp-flow-none">+${keys.length - MAX_CHIPS} more</span>` : '';
    return keys.slice(0, MAX_CHIPS).map(key => {
        const { owner, kind, name } = parseVarKey(key);
        const scope = owner === STAGE ? 'all sprites' : `only ${spriteLabel(owner)}`;
        return `<span class="sp-flow-var${kind === 'list' ? ' sp-list' : ''}" title="${escapeHtml(`${kind}, ${scope}`)}">${escapeHtml(name)}</span>`;
    }).join('') + more;
}

function linkList(edges, pick, empty) {
    if (!edges.length) return `<span class="sp-flow-none">${empty}</span>`;
    return edges.map(e => {
        const node = layout.nodes.get(pick(e));
        const text = node.kind === 'message' ? `"${node.data.name}"${e.kind === 'wait' ? ' and waits' : ''}` : `${spriteLabel(node.data.sprite)} · ${node.data.label}`;
        return `<button class="sp-flow-link" data-id="${escapeHtml(node.id)}">${escapeHtml(text)}</button>`;
    }).join('');
}

const startedBy = hat => ({
    flag: 'The green flag',
    key: `Pressing the ${hat.key} key`,
    click: 'Clicking it',
    backdrop: `Switching to backdrop "${hat.backdrop}"`,
    greaterThan: `${String(hat.sense).toLowerCase() === 'timer' ? 'The timer' : 'Loudness'} passing a threshold`,
    clone: 'Nothing clones this sprite',
})[hat.event] ?? 'Nothing';

function renderDetail() {
    const panel = $('sp-flow-detail');
    const node = selected && layout?.nodes.get(selected);
    panel.classList.toggle('sp-on', !!node);
    if (!node) { panel.innerHTML = ''; return; }
    const outgoing = layout.edges.filter(e => e.from === node.id);
    const incoming = layout.edges.filter(e => e.to === node.id);
    if (node.kind === 'message') {
        panel.innerHTML = `<div class="sp-bezel"><div class="sp-bezel-core">
            <span class="sp-flow-kicker">${node.data.routine ? 'Scratchroutine' : 'Broadcast message'}</span>
            <h3>${escapeHtml(node.data.routine ? `${node.data.name}()` : `"${node.data.name}"`)}</h3>
            <h4>Sent by</h4><div class="sp-flow-links">${linkList(incoming, e => e.from, 'Nothing sends it')}</div>
            <h4>Received by</h4><div class="sp-flow-links">${linkList(outgoing, e => e.to, 'Nothing receives it')}</div>
        </div></div>`;
        return;
    }
    const d = node.data;
    panel.innerHTML = `<div class="sp-bezel"><div class="sp-bezel-core">
        <span class="sp-flow-kicker">${escapeHtml(spriteLabel(d.sprite))}, line ${d.line}</span>
        <h3>${escapeHtml(d.label)}</h3>
        <button class="sp-cta" id="sp-flow-open"><span>Open in editor</span><span class="sp-cta-ic"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg></span></button>
        <h4>Started by</h4><div class="sp-flow-links">${linkList(incoming, e => e.from, startedBy(d.hat))}</div>
        <h4>Starts</h4><div class="sp-flow-links">${linkList(outgoing, e => e.to, 'Nothing')}</div>
        <h4>Writes</h4><div class="sp-flow-vars">${chips(d.writes)}</div>
        <h4>Reads</h4><div class="sp-flow-vars">${chips(d.reads)}</div>
    </div></div>`;
}

function openNode(id) {
    const node = layout?.nodes.get(id);
    if (node?.kind !== 'script') return;
    closeEventFlow();
    revealPosition({ kind: 'sprite', name: node.data.sprite }, node.data.line, node.data.col);
}

function select(id) {
    selected = selected === id ? null : id;
    applyHighlight();
    renderDetail();
    const el = selected && document.querySelector(`#sp-flow-canvas .sp-fn[data-id="${CSS.escape(selected)}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
}

export function setupEventFlow() {
    $('sp-flow-close').addEventListener('click', closeEventFlow);
    document.querySelectorAll('#scratchpiler-overlay [data-flow-toggle]').forEach(b =>
        b.addEventListener('click', () => (open ? closeEventFlow() : openEventFlow())));
    $('sp-flow-filter').addEventListener('input', e => { filter = e.target.value; applyHighlight(); });
    $('sp-flow-zoom-out').addEventListener('click', () => stepZoom(-1));
    $('sp-flow-zoom-in').addEventListener('click', () => stepZoom(1));
    $('sp-flow-zoom-level').addEventListener('click', () => { zoom = null; render(); });
    $('sp-flow-canvas').addEventListener('wheel', e => {
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        stepZoom(e.deltaY > 0 ? -1 : 1);
    }, { passive: false });
    $('sp-flow-filter').addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (filter) { filter = ''; e.target.value = ''; applyHighlight(); } else closeEventFlow(); }
    });
    const onClick = e => {
        if (e.target.closest('#sp-flow-open')) { openNode(selected); return; }
        const target = e.target.closest('[data-id]');
        if (target) select(target.dataset.id);
        else if (e.target.closest('#sp-flow-canvas')) select(selected);
    };
    $('sp-flow-canvas').addEventListener('click', onClick);
    $('sp-flow-detail').addEventListener('click', onClick);
    $('sp-flow-canvas').addEventListener('pointerover', e => {
        const id = e.target.closest('.sp-fn')?.dataset.id ?? null;
        if (id === hovered) return;
        hovered = id;
        if (!selected) applyHighlight();
    });
    $('sp-flow-canvas').addEventListener('pointerleave', () => {
        hovered = null;
        if (!selected) applyHighlight();
    });
    $('sp-flow-canvas').addEventListener('dblclick', e => {
        const target = e.target.closest('[data-id]');
        if (target) openNode(target.dataset.id);
    });
    onProjectChange(() => {
        if (!open) return;
        clearTimeout(renderTimer);
        renderTimer = setTimeout(render, projectProgress().running ? 600 : 250);
    });
}
