export const SETTINGS_VERSION = 2;

export const DEFAULT_SETTINGS = Object.freeze({
    theme: 'scratchpiler-dark', fontSize: '14', wrap: false, minimap: false, tabSize: '4', autosave: '1000', embedSource: true, optimize: true,
    lintTypecheck: true, lintUnreachable: true, lintOrphaned: true, lintSemantic: true, lintSmells: true,
    lintProject: true, optimizeProject: true,
    version: SETTINGS_VERSION,
});

const SETTINGS_RESET_BY_VERSION = { 2: ['wrap'] };

export function loadSettings(storage, key = 'scratchpiler-settings') {
    try {
        storage ??= globalThis.localStorage;
        const saved = JSON.parse(storage.getItem(key) || '{}') ?? {};
        for (let version = (saved.version ?? 1) + 1; version <= SETTINGS_VERSION; version++) {
            for (const name of SETTINGS_RESET_BY_VERSION[version] ?? []) delete saved[name];
        }
        return Object.fromEntries(Object.entries(DEFAULT_SETTINGS).map(([name, fallback]) =>
            [name, name === 'version' ? SETTINGS_VERSION : saved[name] ?? fallback]));
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}
