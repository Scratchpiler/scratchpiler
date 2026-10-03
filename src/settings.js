export const DEFAULT_SETTINGS = Object.freeze({
    theme: 'scratchpiler-dark', fontSize: '14', wrap: true, minimap: false, tabSize: '4', autosave: '1000',
    lintTypecheck: true, lintUnreachable: true, lintOrphaned: true, lintSemantic: true, lintSmells: true,
});

export function loadSettings(storage, key = 'scratchpiler-settings') {
    try {
        storage ??= globalThis.localStorage;
        const saved = JSON.parse(storage.getItem(key) || '{}');
        return Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([name, fallback]) =>
            [name, saved?.[name] ?? fallback]));
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}
