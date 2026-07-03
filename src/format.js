// [L3] Source Formatter — pure module (no browser deps) so the decompiler
// can be imported in Node for tests.

export function formatSource(src) {
    try {
        const lines = src.split('\n');
        const result = [];
        let indent = 0;
        for (let raw of lines) {
            const trimmed = raw.trim();
            if (!trimmed) { result.push(''); continue; }
            // Decrease indent BEFORE lines that start with }
            if (trimmed.startsWith('}')) indent = Math.max(0, indent - 1);
            result.push('    '.repeat(indent) + trimmed);
            // Increase indent AFTER lines that end with {
            if (trimmed.endsWith('{')) indent++;
        }
        return result.join('\n');
    } catch (_) { return null; }
}
