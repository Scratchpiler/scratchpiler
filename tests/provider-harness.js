// Runs the real Monaco completion provider from src/language.js in Node: bundles it
// with esbuild (css/html as text), stubs the few browser globals it touches at import
// time, and drives it through a minimal model double.

import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

const noop = () => ({ dispose() {} });
const kinds = new Proxy({}, { get: (_, k) => k });

function makeMonaco(onCompletionProvider) {
    const languages = new Proxy({
        registerCompletionItemProvider: (_, provider) => { onCompletionProvider(provider); return noop(); },
        CompletionItemKind: kinds,
        CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
    }, { get: (target, k) => k in target ? target[k] : noop });
    return { languages, editor: new Proxy({}, { get: () => noop }), MarkerSeverity: {}, Uri: {} };
}

function makeModel(text, version) {
    const lines = text.split('\n');
    const starts = [0];
    for (const l of lines) starts.push(starts.at(-1) + l.length + 1);
    return {
        getValue: () => text,
        getVersionId: () => version,
        getLineContent: n => lines[n - 1],
        getOffsetAt: p => starts[p.lineNumber - 1] + p.column - 1,
        getWordUntilPosition: p => {
            const word = /\w*$/.exec(lines[p.lineNumber - 1].slice(0, p.column - 1))[0];
            return { word, startColumn: p.column - word.length, endColumn: p.column };
        },
        uri: { toString: () => 'inmemory://completion-test' },
        lines,
    };
}

export async function createProvider() {
    Object.assign(globalThis, {
        window: globalThis,
        document: { addEventListener() {}, querySelector: () => null, getElementById: () => null },
    });
    Object.defineProperty(globalThis, 'localStorage', {
        value: { getItem: () => null, setItem() {} }, configurable: true,
    });

    const { outputFiles } = await build({
        stdin: {
            contents: `
                export { registerLanguage } from './language.js';
                export { setScratchIndex } from './scratch-index.js';
                export { selectSidebarSprite } from './editor.js';`,
            resolveDir: srcDir,
        },
        bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
        loader: { '.css': 'text', '.html': 'text' },
    });
    const bundle = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

    let provider;
    bundle.registerLanguage(makeMonaco(p => { provider ??= p; }));

    let version = 0;

    // Completions at the end of `text` (the cursor sits after its last character).
    function complete(text, { triggerCharacter } = {}) {
        const model = makeModel(text, ++version);
        const lineNumber = model.lines.length;
        const position = { lineNumber, column: model.lines[lineNumber - 1].length + 1 };
        const context = { triggerKind: triggerCharacter ? 1 : 0, triggerCharacter };
        return { items: provider.provideCompletionItems(model, position, context).suggestions, position };
    }

    function setProject({ sprites = [], backdrops = [], globalVariables = [], spriteVariables = {}, customBlocks = {}, active = null } = {}) {
        bundle.setScratchIndex({
            sprites, stage: { backdrops, sounds: [] }, globalVariables, spriteVariables, customBlocks,
        });
        bundle.selectSidebarSprite(active);
    }

    return { complete, setProject };
}
