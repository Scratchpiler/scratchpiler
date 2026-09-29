const SHOW_DELAY_MS = 450;
const WARM_WINDOW_MS = 700;
const GAP = 8;
const SCOPE = '#scratchpiler-overlay, #scratchpiler-trigger';
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const MAC_KEYS = { Ctrl: '⌘', Alt: '⌥', Shift: '⇧' };
const SHORTCUT = /^(?:(?:Ctrl|Alt|Shift|Cmd)\+)+\S+$|^(?:Esc|F\d{1,2})$/;

let tip = null;
let pendingTimer = null;
let current = null;
let lastHiddenAt = 0;

function parseTitle(text) {
    const keys = [];
    const withoutKeys = text.replace(/\s*\(([^)]+)\)/g, (whole, inner) => {
        if (!SHORTCUT.test(inner.trim())) return whole;
        keys.push(inner.trim());
        return '';
    });
    const [label, ...rest] = withoutKeys.split(/(?<=\.)\s+/);
    return { label: label.replace(/\.$/, ''), hint: rest.join(' '), keys: keys[0] ?? null };
}

const keyChips = combo => combo.split('+').map(k => IS_MAC ? (MAC_KEYS[k] ?? k) : k);

function adoptTitle(el) {
    const title = el.getAttribute('title');
    if (!title) return;
    el.dataset.tip = title;
    el.removeAttribute('title');
    if (!el.getAttribute('aria-label') && !el.textContent.trim()) el.setAttribute('aria-label', title);
}

function tipTarget(node) {
    const el = node?.closest?.('[title], [data-tip]');
    if (!el || !el.closest(SCOPE) || el.closest('.monaco-editor')) return null;
    return el;
}

function render(el) {
    const { label, hint, keys } = parseTitle(el.dataset.tip);
    tip.replaceChildren();
    const row = document.createElement('div');
    row.className = 'sp-tip-row';
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    row.appendChild(labelEl);
    if (keys) {
        const chips = document.createElement('span');
        chips.className = 'sp-tip-keys';
        for (const k of keyChips(keys)) {
            const kbd = document.createElement('kbd');
            kbd.textContent = k;
            chips.appendChild(kbd);
        }
        row.appendChild(chips);
    }
    tip.appendChild(row);
    if (hint) {
        const hintEl = document.createElement('div');
        hintEl.className = 'sp-tip-hint';
        hintEl.textContent = hint;
        tip.appendChild(hintEl);
    }
}

function place(el) {
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const clampX = x => Math.max(GAP, Math.min(x, innerWidth - w - GAP));
    const clampY = y => Math.max(GAP, Math.min(y, innerHeight - h - GAP));
    let x, y;
    if (el.closest('.sp-rail')) {
        x = r.right + GAP;
        y = clampY(r.top + r.height / 2 - h / 2);
    } else {
        x = clampX(r.left + r.width / 2 - w / 2);
        y = r.bottom + GAP + h <= innerHeight ? r.bottom + GAP : r.top - GAP - h;
    }
    tip.style.left = `${x}px`;
    tip.style.top = `${Math.max(GAP, y)}px`;
}

function show(el) {
    if (!el.isConnected || el.getAttribute('aria-expanded') === 'true' || !el.dataset.tip) return;
    current = el;
    render(el);
    tip.hidden = false;
    place(el);
    tip.classList.add('sp-on');
}

function hide() {
    clearTimeout(pendingTimer);
    if (current) lastHiddenAt = Date.now();
    current = null;
    if (!tip) return;
    tip.classList.remove('sp-on');
    tip.hidden = true;
}

function schedule(el, immediate = false) {
    adoptTitle(el);
    if (el === current) return;
    clearTimeout(pendingTimer);
    const warm = current || Date.now() - lastHiddenAt < WARM_WINDOW_MS;
    if (current) { current = null; tip.classList.remove('sp-on'); }
    pendingTimer = setTimeout(() => show(el), immediate || warm ? 0 : SHOW_DELAY_MS);
}

export function setupTooltips() {
    tip = document.createElement('div');
    tip.id = 'sp-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);

    document.addEventListener('pointerover', e => {
        if (e.pointerType === 'touch') return;
        const el = tipTarget(e.target);
        if (el) schedule(el);
        else if (current || pendingTimer) hide();
    }, true);
    document.addEventListener('pointerout', e => {
        const el = tipTarget(e.target);
        if (el && !el.contains(e.relatedTarget)) hide();
    }, true);
    document.addEventListener('focusin', e => {
        const el = tipTarget(e.target);
        if (el && el.matches(':focus-visible')) schedule(el, true);
    }, true);
    document.addEventListener('focusout', hide, true);
    for (const type of ['pointerdown', 'keydown', 'wheel']) document.addEventListener(type, hide, true);
    window.addEventListener('blur', hide);
    window.addEventListener('resize', hide);
}
