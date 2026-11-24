import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { setScratchIndex } from '../scratch-index.js';
import { writeComments, removeStaleComments } from '../metadata.js';
import { findJsonParseLocation } from './workspace.js';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');

let VirtualMachine = null;
let ScratchStorage = null;

function ensureVMClasses() {
    if (VirtualMachine) return;
    try {
        require('minilog').disable();
    } catch {
        // optional
    }
    VirtualMachine = require('scratch-vm');
    try {
        ScratchStorage = require('scratch-storage').ScratchStorage;
    } catch {
        // optional fallback if scratch-storage isn't present
        ScratchStorage = null;
    }
}

export function buildScratchIndex(vm) {
    const idx = {
        sprites: [],
        stage: { backdrops: [], sounds: [] },
        globalVariables: [],
        spriteVariables: {},
        customBlocks: {},
    };
    for (const target of vm.runtime.targets) {
        const costumes = (target.sprite?.costumes || []).map((c) => c.name);
        const sounds = (target.sprite?.sounds || []).map((s) => s.name);
        const vars = Object.values(target.variables || {})
            .filter((v) => v.type === '' || v.type === 'list')
            .map((v) => ({
                name: String(v.name),
                id: v.id,
                type: v.type === 'list' ? 'list' : 'variable',
            }));
        if (target.isStage) {
            idx.stage.backdrops = costumes;
            idx.stage.sounds = sounds;
            idx.globalVariables = vars;
        } else {
            const name = target.sprite.name;
            idx.sprites.push({ name, costumes, sounds });
            idx.spriteVariables[name] = vars;
            idx.customBlocks[name] = Object.values(target.blocks?._blocks || {})
                .filter((b) => b.opcode === 'procedures_prototype')
                .map((b) => b.mutation && b.mutation.proccode)
                .filter(Boolean);
        }
    }
    setScratchIndex(idx);
    return idx;
}

class JsonTarget {
    constructor(raw) {
        this.isStage = Boolean(raw.isStage);
        this.sprite = {
            name: raw.isStage ? 'Stage' : raw.name,
            costumes: (raw.costumes || []).map((c) => ({ ...c })),
            sounds: (raw.sounds || []).map((s) => ({ ...s })),
        };
        this.variables = {};
        for (const [id, [name, value]] of Object.entries(raw.variables || {})) {
            this.variables[id] = { id, name: String(name), type: '', value };
        }
        for (const [id, [name, value]] of Object.entries(raw.lists || {})) {
            this.variables[id] = { id, name: String(name), type: 'list', value: Array.isArray(value) ? [...value] : [] };
        }
        for (const [id, name] of Object.entries(raw.broadcasts || {})) {
            this.variables[id] = { id, name: String(name), type: 'broadcast_msg', value: String(name) };
        }
        const _blocks = structuredClone(raw.blocks || {});
        this.blocks = {
            _blocks,
            createBlock(block) {
                _blocks[block.id] = structuredClone(block);
            },
            deleteBlock(id) {
                const b = _blocks[id];
                if (!b) return;
                delete _blocks[id];
                if (b.next) this.deleteBlock(b.next);
                for (const inp of Object.values(b.inputs || {})) {
                    const child = Array.isArray(inp) ? inp[1] : inp?.block;
                    const shadow = Array.isArray(inp) ? inp[2] : inp?.shadow;
                    if (child && typeof child === 'string') this.deleteBlock(child);
                    if (shadow && typeof shadow === 'string' && shadow !== child) this.deleteBlock(shadow);
                }
            },
        };
        this.comments = structuredClone(raw.comments || {});
        this._raw = raw;
    }

    createVariable(id, name, type) {
        this.variables[id] = { id, name: String(name), type: type || '', value: type === 'list' ? [] : 0 };
    }

    deleteVariable(id) {
        delete this.variables[id];
    }

    createComment(id, blockId, text, x, y, width, height, minimized) {
        this.comments[id] = { id, blockId, text, x, y, width, height, minimized };
    }
}

function makeJsonVMHost(projectJson) {
    const targets = (projectJson.targets || []).map((t) => new JsonTarget(t));
    return {
        isJsonHost: true,
        rawProject: projectJson,
        runtime: { targets },
        editingTarget: targets.find((t) => !t.isStage) || targets[0],
        on() {},
    };
}

export async function loadProjectHost(indexSource, { relPath = (p) => p } = {}) {
    if (!indexSource) {
        return { vm: null, kind: 'none', errors: [] };
    }

    const rPath = relPath(indexSource);
    const isJson = indexSource.toLowerCase().endsWith('.json');
    if (isJson) {
        const text = fs.readFileSync(indexSource, 'utf8');
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            const loc = findJsonParseLocation(text, err);
            return {
                vm: null,
                kind: 'json',
                errors: [{
                    severity: 'error',
                    code: 'E0406',
                    category: 'Config',
                    message: `Invalid JSON in ${rPath}: ${loc.message}`,
                    file: rPath,
                    line: loc.line,
                    col: loc.col,
                    len: 1,
                    label: 'syntax error',
                    notes: [],
                }],
            };
        }
        if (!parsed || !Array.isArray(parsed.targets)) {
            return {
                vm: null,
                kind: 'json',
                errors: [{
                    severity: 'error',
                    code: 'E0406',
                    category: 'Config',
                    message: `${rPath} does not look like a Scratch project.json (missing \`targets\` array)`,
                    file: rPath,
                    line: 1,
                    col: 1,
                    len: 1,
                    label: null,
                    notes: [],
                }],
            };
        }
        return { vm: makeJsonVMHost(parsed), kind: 'json', rawProject: parsed, errors: [] };
    }

    const buf = fs.readFileSync(indexSource);
    let zip;
    try {
        zip = await JSZip.loadAsync(buf);
    } catch (err) {
        return {
            vm: null,
            kind: 'sb3',
            errors: [{
                severity: 'error',
                code: 'E0406',
                category: 'Config',
                message: `Cannot read .sb3 archive ${rPath}: ${err.message}`,
                file: null,
                line: null,
                col: null,
                len: 1,
                label: null,
                notes: [{ kind: 'help', message: 'verify the file is a valid Scratch 3 `.sb3` zip archive' }],
            }],
        };
    }

    const projectFile = zip.file('project.json');
    if (!projectFile) {
        return {
            vm: null,
            kind: 'sb3',
            errors: [{
                severity: 'error',
                code: 'E0406',
                category: 'Config',
                message: `Invalid .sb3 archive ${rPath}: missing \`project.json\` entry`,
                file: null,
                line: null,
                col: null,
                len: 1,
                label: null,
                notes: [],
            }],
        };
    }

    let rawProject;
    try {
        rawProject = JSON.parse(await projectFile.async('string'));
    } catch (err) {
        return {
            vm: null,
            kind: 'sb3',
            errors: [{
                severity: 'error',
                code: 'E0406',
                category: 'Config',
                message: `Corrupt project.json inside ${rPath}: ${err.message}`,
                file: null,
                line: null,
                col: null,
                len: 1,
                label: null,
                notes: [],
            }],
        };
    }

    ensureVMClasses();
    const vm = new VirtualMachine();
    if (ScratchStorage) {
        vm.attachStorage(new ScratchStorage());
    }
    try {
        await vm.loadProject(buf);
    } catch (err) {
        return {
            vm: null,
            kind: 'sb3',
            errors: [{
                severity: 'error',
                code: 'E0406',
                category: 'Config',
                message: `Failed to load ${rPath} into Scratch VM: ${err.message}`,
                file: null,
                line: null,
                col: null,
                len: 1,
                label: null,
                notes: [],
            }],
        };
    }
    return { vm, kind: 'sb3', rawProject, errors: [] };
}

export function findTarget(vm, spriteName) {
    if (!vm) return null;
    return spriteName === '__stage__'
        ? vm.runtime.targets.find((t) => t.isStage) || null
        : vm.runtime.targets.find((t) => !t.isStage && t.sprite.name === spriteName) || null;
}

function headerOf(block, blockMap, headerRoots) {
    if (block.opcode === 'procedures_definition') {
        const input = block.inputs?.custom_block;
        const protoId = input ? (Array.isArray(input) ? input[1] : (input.block ?? input.shadow)) : null;
        const name = ((blockMap[protoId]?.mutation?.proccode) || '').split(' ')[0];
        return headerRoots[name] || null;
    }
    if (block.opcode === 'event_whenbroadcastreceived') {
        const match = (block.fields?.BROADCAST_OPTION?.value ?? '').match(/^__sroutine_(.+)$/);
        return match ? (headerRoots[match[1]] || null) : null;
    }
    return null;
}

export function applyCompiledTarget(vm, spriteName, compiled) {
    const target = findTarget(vm, spriteName);
    if (!target) throw new Error(`Target not found in VM: ${spriteName}`);

    const existing = target.blocks._blocks || {};
    const topIds = Object.values(existing).filter((b) => b && b.topLevel).map((b) => b.id);
    const deleted = new Set(Object.keys(existing));
    for (const id of topIds) {
        try {
            target.blocks.deleteBlock(id);
        } catch {
            // ignore
        }
    }
    // Ensure any stray blocks are cleared so target matches compiled source cleanly
    for (const id of Object.keys(target.blocks._blocks || {})) {
        try {
            target.blocks.deleteBlock(id);
        } catch {
            delete target.blocks._blocks[id];
        }
    }
    removeStaleComments(target, deleted);

    for (const block of Object.values(compiled.blocks)) {
        target.blocks.createBlock(block);
    }

    const includes = {};
    const headerRoots = compiled.headerRoots || {};
    for (const block of Object.values(compiled.blocks)) {
        if (!block.topLevel || block.shadow) continue;
        const hdr = headerOf(block, compiled.blocks, headerRoots);
        if (hdr) includes[block.id] = hdr;
    }
    writeComments(target, compiled.blocks, compiled.comments || [], includes);
    return Object.keys(compiled.blocks).length;
}

function atomicWrite(outPath, data) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const tmp = `${outPath}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, outPath);
}

export async function saveSb3(vm, outPath) {
    if (typeof vm.saveProjectSb3 !== 'function') {
        throw new Error('Cannot save .sb3 without a loaded .sb3 VM');
    }
    const raw = await vm.saveProjectSb3('blob');
    const buffer = Buffer.isBuffer(raw)
        ? raw
        : raw instanceof Uint8Array
            ? Buffer.from(raw)
            : Buffer.from(await raw.arrayBuffer());
    atomicWrite(outPath, buffer);
}

export function saveProjectJson(vm, outPath) {
    let jsonText;
    if (typeof vm.toJSON === 'function') {
        jsonText = vm.toJSON();
    } else if (vm.isJsonHost) {
        const targets = vm.runtime.targets.map((t) => {
            const variables = {};
            const lists = {};
            const broadcasts = {};
            for (const v of Object.values(t.variables)) {
                if (v.type === 'list') lists[v.id] = [v.name, v.value];
                else if (v.type === 'broadcast_msg') broadcasts[v.id] = v.name;
                else variables[v.id] = [v.name, v.value];
            }
            const blocks = {};
            for (const [id, b] of Object.entries(t.blocks._blocks || {})) {
                const clone = structuredClone(b);
                if (clone.inputs && !Array.isArray(clone.inputs)) {
                    const sb3Inputs = {};
                    for (const [iname, inp] of Object.entries(clone.inputs)) {
                        const status = inp.block && inp.shadow && inp.block !== inp.shadow ? 3 : inp.shadow && !inp.block ? 1 : 2;
                        if (status === 3) sb3Inputs[iname] = [3, inp.block, inp.shadow];
                        else sb3Inputs[iname] = [status, inp.block || inp.shadow];
                    }
                    clone.inputs = sb3Inputs;
                }
                if (clone.fields && !Array.isArray(clone.fields)) {
                    const sb3Fields = {};
                    for (const [fname, f] of Object.entries(clone.fields)) {
                        sb3Fields[fname] = f.id !== undefined ? [f.value, f.id] : [f.value, null];
                    }
                    clone.fields = sb3Fields;
                }
                blocks[id] = clone;
            }
            return {
                ...t._raw,
                variables,
                lists,
                broadcasts,
                blocks,
                comments: t.comments,
            };
        });
        jsonText = JSON.stringify({ ...vm.rawProject, targets }, null, 2) + '\n';
    } else {
        throw new Error('Unsupported VM host for JSON output');
    }
    atomicWrite(outPath, jsonText);
}

export async function createBlankSb3() {
    const blankSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"></svg>',
        'utf8',
    );
    const spriteSvg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="24" fill="#4C97FF"/></svg>',
        'utf8',
    );
    const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex');
    const stageId = md5(blankSvg);
    const spriteId = md5(spriteSvg);

    const projectJson = {
        targets: [
            {
                isStage: true,
                name: 'Stage',
                variables: {
                    var_score: ['score', 0],
                },
                lists: {},
                broadcasts: {},
                blocks: {},
                comments: {},
                currentCostume: 0,
                costumes: [
                    {
                        name: 'backdrop1',
                        dataFormat: 'svg',
                        assetId: stageId,
                        md5ext: `${stageId}.svg`,
                        rotationCenterX: 240,
                        rotationCenterY: 180,
                    },
                ],
                sounds: [],
                volume: 100,
                layerOrder: 0,
                tempo: 60,
                videoTransparency: 50,
                videoState: 'on',
                textToSpeechLanguage: null,
            },
            {
                isStage: false,
                name: 'Sprite1',
                variables: {},
                lists: {},
                broadcasts: {},
                blocks: {},
                comments: {},
                currentCostume: 0,
                costumes: [
                    {
                        name: 'costume1',
                        dataFormat: 'svg',
                        assetId: spriteId,
                        md5ext: `${spriteId}.svg`,
                        rotationCenterX: 32,
                        rotationCenterY: 32,
                    },
                ],
                sounds: [],
                volume: 100,
                layerOrder: 1,
                visible: true,
                x: 0,
                y: 0,
                size: 100,
                direction: 90,
                draggable: false,
                rotationStyle: 'all around',
            },
        ],
        monitors: [],
        extensions: [],
        meta: { semver: '3.0.0', vm: '0.2.0', agent: 'scratchpiler-cli' },
    };

    const zip = new JSZip();
    zip.file('project.json', JSON.stringify(projectJson));
    zip.file(`${stageId}.svg`, blankSvg);
    zip.file(`${spriteId}.svg`, spriteSvg);
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
