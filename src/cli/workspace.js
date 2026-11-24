import fs from 'node:fs';
import path from 'node:path';
import { HEADER_NAME_RE } from '../headers.js';
import { closestMatches } from './diagnostics.js';

export const STAGE = '__stage__';

const MANIFEST_KEYS = new Set(['project', 'stage', 'sprites', 'headers', 'out', 'opt']);

export function encodeSpriteFile(name) {
    if (name === STAGE) return 'Stage.sdsl';
    let out = '';
    for (const ch of String(name)) {
        const cp = ch.codePointAt(0);
        if (cp < 0x20 || '%<>:"/\\|?*'.includes(ch)) {
            for (const b of Buffer.from(ch, 'utf8')) {
                out += '%' + b.toString(16).toUpperCase().padStart(2, '0');
            }
        } else {
            out += ch;
        }
    }
    return out + '.sdsl';
}

export function decodeSpriteFile(stem) {
    if (stem === 'Stage') return STAGE;
    const bytes = [];
    for (let i = 0; i < stem.length; i++) {
        if (stem[i] === '%' && i + 2 < stem.length && /^[0-9a-fA-F]{2}$/.test(stem.slice(i + 1, i + 3))) {
            bytes.push(parseInt(stem.slice(i + 1, i + 3), 16));
            i += 2;
        } else {
            bytes.push(...Buffer.from(stem[i], 'utf8'));
        }
    }
    return Buffer.from(bytes).toString('utf8');
}

function posFromOffset(text, offset) {
    const safe = Math.max(0, Math.min(offset, text.length));
    let line = 1;
    let col = 1;
    for (let i = 0; i < safe; i++) {
        if (text[i] === '\n') {
            line++;
            col = 1;
        } else {
            col++;
        }
    }
    return { line, col };
}

export function findJsonParseLocation(text, error) {
    const msg = String(error?.message || error || 'Invalid JSON');
    const posMatch = /position\s+(\d+)/i.exec(msg);
    if (posMatch) {
        return { ...posFromOffset(text, Number(posMatch[1])), message: msg };
    }
    const lcMatch = /line\s+(\d+)\s+column\s+(\d+)/i.exec(msg);
    if (lcMatch) {
        return { line: Number(lcMatch[1]), col: Number(lcMatch[2]), message: msg };
    }
    return { line: 1, col: 1, message: msg };
}

function findJsonKeyLine(text, key) {
    const lines = text.split('\n');
    const re = new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`);
    for (let i = 0; i < lines.length; i++) {
        const m = re.exec(lines[i]);
        if (m) return { line: i + 1, col: m.index + 1, len: key.length + 2 };
    }
    return { line: 1, col: 1, len: 1 };
}

function listDirSorted(dir) {
    try {
        return fs.readdirSync(dir, { withFileTypes: true })
            .map((d) => path.join(dir, d.name))
            .sort();
    } catch {
        return [];
    }
}

export function discoverWorkspace(rootDir, { projectOverride = null, cwd = process.cwd() } = {}) {
    const root = path.resolve(cwd, rootDir || '.');
    const rel = (p) => path.relative(cwd, p) || path.basename(p);
    const diagnostics = [];
    const fileSources = new Map();

    if (!fs.existsSync(root)) {
        diagnostics.push({
            severity: 'error',
            code: 'E0401',
            category: 'CLI',
            message: `Project directory does not exist: ${root}`,
            file: null,
            line: null,
            col: null,
            len: 1,
            label: null,
            notes: [{ kind: 'help', message: 'pass an existing directory, or create one with `scratchpiler init <dir>`' }],
        });
        return { root, diagnostics, fileSources, sprites: [], headers: new Map(), headerPaths: new Map(), headerSearchDirs: [] };
    }

    if (!fs.statSync(root).isDirectory()) {
        diagnostics.push({
            severity: 'error',
            code: 'E0401',
            category: 'CLI',
            message: `Expected a project directory, got a file: ${rel(root)}`,
            file: null,
            line: null,
            col: null,
            len: 1,
            label: null,
            notes: [{ kind: 'help', message: 'pass the folder containing your `.sdsl` files, or use `scratchpiler unpack <file.sb3> <dir>`' }],
        });
        return { root, diagnostics, fileSources, sprites: [], headers: new Map(), headerPaths: new Map(), headerSearchDirs: [] };
    }

    const manifestPath = path.join(root, 'scratchpiler.json');
    let manifest = {};
    let manifestText = null;
    if (fs.existsSync(manifestPath)) {
        manifestText = fs.readFileSync(manifestPath, 'utf8');
        const mRel = rel(manifestPath);
        fileSources.set(mRel, manifestText);
        try {
            const parsed = JSON.parse(manifestText);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                diagnostics.push({
                    severity: 'error',
                    code: 'E0402',
                    category: 'Config',
                    message: 'scratchpiler.json must be a JSON object',
                    file: mRel,
                    line: 1,
                    col: 1,
                    len: 1,
                    label: 'expected `{ ... }`',
                    notes: [],
                });
            } else {
                manifest = parsed;
                for (const key of Object.keys(manifest)) {
                    if (!MANIFEST_KEYS.has(key)) {
                        const loc = findJsonKeyLine(manifestText, key);
                        const match = closestMatches(key, [...MANIFEST_KEYS]);
                        diagnostics.push({
                            severity: 'warning',
                            code: 'W0401',
                            category: 'Config',
                            message: `Unknown key \`"${key}"\` in scratchpiler.json`,
                            file: mRel,
                            line: loc.line,
                            col: loc.col,
                            len: loc.len,
                            label: 'unknown config key',
                            notes: match.length
                                ? [{ kind: 'help', message: `did you mean \`"${match[0]}"\`?` }]
                                : [{ kind: 'note', message: `valid keys: ${[...MANIFEST_KEYS].map((k) => `"${k}"`).join(', ')}` }],
                        });
                    }
                }
            }
        } catch (err) {
            const loc = findJsonParseLocation(manifestText, err);
            diagnostics.push({
                severity: 'error',
                code: 'E0402',
                category: 'Config',
                message: `Invalid JSON in scratchpiler.json: ${loc.message}`,
                file: mRel,
                line: loc.line,
                col: loc.col,
                len: 1,
                label: 'syntax error',
                notes: [],
            });
        }
    }

    const entries = listDirSorted(root);
    let indexSource = null;
    if (projectOverride) {
        const resolved = path.resolve(cwd, projectOverride);
        if (!fs.existsSync(resolved)) {
            diagnostics.push({
                severity: 'error',
                code: 'E0404',
                category: 'CLI',
                message: `Project file not found: ${projectOverride}`,
                file: null,
                line: null,
                col: null,
                len: 1,
                label: null,
                notes: [{ kind: 'help', message: 'check the path passed to `--project`' }],
            });
        } else {
            indexSource = resolved;
        }
    } else if (manifest.project) {
        const resolved = path.resolve(root, manifest.project);
        if (!fs.existsSync(resolved)) {
            const loc = manifestText ? findJsonKeyLine(manifestText, 'project') : { line: 1, col: 1, len: 9 };
            diagnostics.push({
                severity: 'error',
                code: 'E0404',
                category: 'Config',
                message: `Configured project file does not exist: ${manifest.project}`,
                file: rel(manifestPath),
                line: loc.line,
                col: loc.col,
                len: loc.len,
                label: 'file not found on disk',
                notes: [{ kind: 'help', message: `expected at ${rel(resolved)} — update \`"project"\` in scratchpiler.json or pass \`--project\`` }],
            });
        } else {
            indexSource = resolved;
        }
    } else {
        const jsonPath = path.join(root, 'project.json');
        if (fs.existsSync(jsonPath) && fs.statSync(jsonPath).isFile()) {
            indexSource = jsonPath;
        } else {
            const sb3s = entries.filter((p) => p.toLowerCase().endsWith('.sb3') && fs.statSync(p).isFile());
            if (sb3s.length === 1) {
                indexSource = sb3s[0];
            } else if (sb3s.length > 1) {
                const names = sb3s.map((p) => path.basename(p));
                diagnostics.push({
                    severity: 'error',
                    code: 'E0403',
                    category: 'Config',
                    message: `Multiple .sb3 files found in ${rel(root)}: ${names.join(', ')}`,
                    file: null,
                    line: null,
                    col: null,
                    len: 1,
                    label: null,
                    notes: [
                        { kind: 'help', message: `create scratchpiler.json with \`{ "project": "${names[0]}" }\`, or pass \`--project ${names[0]}\`` },
                    ],
                });
            }
        }
    }

    const sprites = [];
    const mappedPaths = new Set();
    const seenSprites = new Set();

    const addMapped = (spriteName, relFile, configKey) => {
        const full = path.resolve(root, relFile);
        mappedPaths.add(full);
        if (!fs.existsSync(full)) {
            const loc = manifestText ? findJsonKeyLine(manifestText, configKey) : { line: 1, col: 1, len: 1 };
            diagnostics.push({
                severity: 'error',
                code: 'E0405',
                category: 'Config',
                message: `Mapped file for "${spriteName === STAGE ? 'Stage' : spriteName}" does not exist: ${relFile}`,
                file: rel(manifestPath),
                line: loc.line,
                col: loc.col,
                len: loc.len,
                label: 'missing .sdsl file',
                notes: [],
            });
            return;
        }
        seenSprites.add(spriteName);
        sprites.push({ name: spriteName, filePath: full, relPath: rel(full) });
    };

    if (typeof manifest.stage === 'string') {
        addMapped(STAGE, manifest.stage, 'stage');
    }
    if (manifest.sprites && typeof manifest.sprites === 'object' && !Array.isArray(manifest.sprites)) {
        for (const [sp, file] of Object.entries(manifest.sprites)) {
            if (typeof file !== 'string') continue;
            const normName = sp === 'Stage' || sp === STAGE ? STAGE : sp;
            addMapped(normName, file, sp);
        }
    }

    for (const full of entries) {
        if (!full.toLowerCase().endsWith('.sdsl') || mappedPaths.has(full)) continue;
        if (!fs.statSync(full).isFile()) continue;
        const stem = path.basename(full, '.sdsl');
        const spriteName = decodeSpriteFile(stem);
        if (seenSprites.has(spriteName)) continue;
        seenSprites.add(spriteName);
        sprites.push({ name: spriteName, filePath: full, relPath: rel(full) });
    }

    const extraHeaders = Array.isArray(manifest.headers) ? manifest.headers.map((h) => path.resolve(root, h)) : [];
    const headerSearchDirs = [root, path.join(root, 'include'), path.join(root, 'headers'), ...extraHeaders];
    const headers = new Map();
    const headerPaths = new Map();

    for (const dir of headerSearchDirs) {
        for (const full of listDirSorted(dir)) {
            const base = path.basename(full);
            if (!base.endsWith('.h') || !HEADER_NAME_RE.test(base)) continue;
            if (!fs.statSync(full).isFile()) continue;
            if (headers.has(base)) continue;
            const content = fs.readFileSync(full, 'utf8');
            const rPath = rel(full);
            fileSources.set(rPath, content);
            headers.set(base, { name: base, filePath: full, relPath: rPath, content });
            headerPaths.set(base, rPath);
        }
    }

    return {
        root,
        manifest,
        manifestPath: fs.existsSync(manifestPath) ? manifestPath : null,
        manifestText,
        indexSource,
        sprites,
        headers,
        headerPaths,
        headerSearchDirs,
        fileSources,
        diagnostics,
        relPath: rel,
    };
}
