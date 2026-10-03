export const MARKER = 'scratchpiler:';
export const ORIGINS = ['for', 'pyfor', 'sort'];

const KEY_LINE = /^scratchpiler:([a-z]+)(?:=(.*))?$/;
const HEADER_NAME = /^[\w-]+\.h$/;

export function formatComment(meta) {
    const lines = [];
    if (meta.include) lines.push(`${MARKER}include=${meta.include}`);
    if (meta.noinline) lines.push(`${MARKER}noinline`);
    if (meta.nounroll) lines.push(`${MARKER}nounroll`);
    if (meta.origin) lines.push(`${MARKER}origin=${meta.origin}`);
    if (meta.src) lines.push(`${MARKER}src=${meta.src.hash}`, meta.src.text);
    else if (meta.decls) lines.push(`${MARKER}decls`, meta.decls);
    return lines.join('\n');
}

export function parseComment(text) {
    if (typeof text !== 'string' || !text.startsWith(MARKER)) return null;
    const meta = {};
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const m = KEY_LINE.exec(lines[i].trimEnd());
        if (!m) continue;
        const [, key, value] = m;
        if (key === 'include' && HEADER_NAME.test(value ?? '')) meta.include = value;
        else if (key === 'noinline') meta.noinline = true;
        else if (key === 'nounroll') meta.nounroll = true;
        else if (key === 'origin' && ORIGINS.includes(value)) meta.origin = value;
        else if (key === 'src' && value) { meta.src = { hash: value, text: lines.slice(i + 1).join('\n') }; break; }
        else if (key === 'decls') { meta.decls = lines.slice(i + 1).join('\n'); break; }
    }
    return meta;
}

function cyrb53(text) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
        const ch = text.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

const mutationKeys = (block) => {
    const m = block.mutation;
    if (!m) return '';
    const parts = [`proccode=${m.proccode ?? ''}`];
    if (block.opcode === 'procedures_prototype') parts.push(`warp=${String(m.warp)}`, `names=${m.argumentnames ?? ''}`);
    return parts.join('&');
};

export function scriptHash(rootId, blocks) {
    const parts = [];
    const visitChain = (startId) => {
        for (let id = startId; id; id = blocks[id]?.next) {
            const block = blocks[id];
            if (!block) { parts.push('?'); return; }
            parts.push('(', block.opcode, mutationKeys(block));
            for (const name of Object.keys(block.fields ?? {}).sort()) parts.push(`|${name}=${String(block.fields[name].value)}`);
            for (const name of Object.keys(block.inputs ?? {}).sort()) {
                const input = block.inputs[name];
                parts.push(`|${name}:`);
                if (input.block) visitChain(input.block);
                if (input.shadow && input.shadow !== input.block) { parts.push('~'); visitChain(input.shadow); }
            }
            parts.push(')');
        }
    };
    visitChain(rootId);
    return cyrb53(parts.join(''));
}

export function sourceSlice(source, span) {
    const starts = [0];
    for (let i = 0; i < source.length; i++) if (source[i] === '\n') starts.push(i + 1);
    const offset = (line, col) => (starts[line - 1] ?? source.length) + col - 1;
    let from = offset(span.line, span.col);
    if (source.slice(starts[span.line - 1], from).trim() === '') {
        let line = span.line;
        from = starts[line - 1];
        while (line > 1 && /^\s*\/\//.test(source.slice(starts[line - 2], starts[line - 1]))) from = starts[--line - 1];
    }
    return source.slice(from, offset(span.endLine, span.endCol));
}

export function buildComments({ tags, blocks, source, embedSource, embedUntilLine, declSpans = [] }) {
    const comments = [];
    for (const { blockId, tag } of tags) {
        const meta = {};
        for (const hint of tag.hints ?? []) meta[hint] = true;
        if (tag.origin) meta.origin = tag.origin;
        if (embedSource && tag.span && tag.span.line <= embedUntilLine) {
            meta.src = { hash: scriptHash(blockId, blocks), text: sourceSlice(source, tag.span) };
        }
        const text = formatComment(meta);
        if (text) comments.push({ blockId, text });
    }
    const decls = embedSource ? declSpans.filter(span => span.line <= embedUntilLine).map(span => sourceSlice(source, span)) : [];
    if (decls.length) comments.push({ blockId: null, text: formatComment({ decls: decls.join('\n\n') }) });
    return comments;
}

const COMMENT_SIZE = [220, 48];

export function writeComments(target, blockMap, comments, includes = {}) {
    const byBlock = new Map();
    for (const { blockId, text } of comments) byBlock.set(blockId, text);
    for (const [blockId, header] of Object.entries(includes)) {
        const own = parseComment(byBlock.get(blockId) ?? '') ?? {};
        byBlock.set(blockId, formatComment({ ...own, include: header }));
    }
    const rootOf = (id) => {
        let block = blockMap[id];
        while (block && !block.topLevel && block.parent) block = blockMap[block.parent];
        return block;
    };
    const nested = new Map();
    for (const [blockId, text] of byBlock) {
        const id = blockId ? `${blockId}_meta` : `meta_${Math.random().toString(36).slice(2, 10)}`;
        const root = blockId ? rootOf(blockId) : null;
        let x = 50, y = 0;
        if (root && root.id === blockId) {
            x = root.x ?? 50;
            y = Math.max((root.y ?? 50) - 60, 0);
        } else if (root) {
            const n = nested.get(root.id) ?? 0;
            nested.set(root.id, n + 1);
            x = (root.x ?? 50) + 280;
            y = (root.y ?? 50) + 60 * n;
        }
        if (typeof target.createComment === 'function') {
            target.createComment(id, blockId, text, x, y, ...COMMENT_SIZE, true);
        } else {
            target.comments = target.comments ?? {};
            target.comments[id] = { id, blockId, text, x, y, width: COMMENT_SIZE[0], height: COMMENT_SIZE[1], minimized: true };
        }
        const created = blockId && target.blocks._blocks?.[blockId];
        if (created) created.comment = id;
    }
}

export function removeStaleComments(target, deletedIds) {
    for (const [id, comment] of Object.entries(target.comments ?? {})) {
        if (typeof comment?.text !== 'string' || !comment.text.startsWith(MARKER)) continue;
        const gone = !comment.blockId || deletedIds.has(comment.blockId) || !target.blocks._blocks?.[comment.blockId];
        if (gone) delete target.comments[id];
    }
}

export function readComments(target) {
    const byBlock = new Map();
    let decls = null;
    for (const comment of Object.values(target.comments ?? {})) {
        const meta = parseComment(comment?.text);
        if (!meta) continue;
        if (comment.blockId) byBlock.set(comment.blockId, meta);
        else if (meta.decls) decls = meta.decls;
    }
    return { byBlock, decls };
}
