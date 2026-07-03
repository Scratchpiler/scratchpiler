// [P5] Header storage — named `.h` snippets shared across projects.
// Persisted via Tampermonkey GM storage when available (cross-project,
// cross-origin-safe), falling back to localStorage, then to a session-only
// in-memory map (Node/tests).

const GM_KEY = 'scratchpiler-headers';

export const HEADER_NAME_RE = /^[\w-]+\.h$/;

let memoryStore = null; // fallback of last resort

function readStore() {
    try {
        if (typeof GM_getValue === 'function') {
            return JSON.parse(GM_getValue(GM_KEY, '{}') || '{}');
        }
    } catch (_) {}
    try {
        if (typeof localStorage !== 'undefined') {
            return JSON.parse(localStorage.getItem(GM_KEY) || '{}');
        }
    } catch (_) {}
    return memoryStore || (memoryStore = {});
}

function writeStore(obj) {
    try {
        if (typeof GM_setValue === 'function') { GM_setValue(GM_KEY, JSON.stringify(obj)); return; }
    } catch (_) {}
    try {
        if (typeof localStorage !== 'undefined') { localStorage.setItem(GM_KEY, JSON.stringify(obj)); return; }
    } catch (_) {}
    memoryStore = obj;
}

export function listHeaders() {
    return Object.keys(readStore()).sort();
}

export function readHeader(name) {
    const store = readStore();
    return Object.prototype.hasOwnProperty.call(store, name) ? store[name] : null;
}

export function writeHeader(name, content) {
    if (!HEADER_NAME_RE.test(name)) {
        throw new Error(`Invalid header name "${name}" — use letters/digits/_/- and end with .h (e.g. utils.h)`);
    }
    const store = readStore();
    store[name] = String(content ?? '');
    writeStore(store);
}

export function deleteHeader(name) {
    const store = readStore();
    if (!(name in store)) return false;
    delete store[name];
    writeStore(store);
    return true;
}

export function renameHeader(oldName, newName) {
    if (!HEADER_NAME_RE.test(newName)) {
        throw new Error(`Invalid header name "${newName}" — use letters/digits/_/- and end with .h`);
    }
    const store = readStore();
    if (!(oldName in store)) throw new Error(`Header not found: ${oldName}`);
    if (newName in store) throw new Error(`A header named ${newName} already exists`);
    store[newName] = store[oldName];
    delete store[oldName];
    writeStore(store);
}
