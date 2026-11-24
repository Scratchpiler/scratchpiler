import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import {
    tokenize,
    parse,
    lint,
    typeCheckDiagnostics,
} from '../compiler.js';
import { analyze, semanticDiagnostics, smellDiagnostics } from '../analyzer.js';
import { expand, compileSourceWithHeaders } from '../preprocess.js';
import { decompile } from '../decompiler.js';
import { formatSource } from '../format.js';
import { HEADER_NAME_RE } from '../headers.js';
import { setScratchIndex } from '../scratch-index.js';
import {
    STAGE,
    createProject,
    setProjectIndex,
    setProjectFile,
    linkedProject,
    diagnosticsFor,
    slvmFacts,
    eventGraph,
    displayMessage,
} from '../project-analysis.js';
import { optimizationLevel, OPTIMIZATION_LEVELS } from '../optimization-levels.js';
import {
    discoverWorkspace,
    encodeSpriteFile,
} from './workspace.js';
import {
    loadProjectHost,
    buildScratchIndex,
    findTarget,
    applyCompiledTarget,
    saveSb3,
    saveProjectJson,
    createBlankSb3,
} from './vm-host.js';
import {
    closestMatches,
    enrichDiagnostic,
    deduplicateDiagnostics,
    formatDiagnostics,
    useColor,
} from './diagnostics.js';

const COMMANDS = ['check', 'build', 'unpack', 'init', 'fmt', 'watch', 'info', 'help'];

const OPTION_SPECS = [
    { long: 'help', short: 'h', takesValue: false },
    { long: 'version', short: 'V', takesValue: false },
    { long: 'project', short: 'p', takesValue: true },
    { long: 'out', short: 'o', takesValue: true },
    { long: 'opt', short: 'O', takesValue: true },
    { long: 'format', short: 'f', takesValue: true },
    { long: 'color', takesValue: true },
    { long: 'no-color', takesValue: false },
    { long: 'json', takesValue: false },
    { long: 'smells', takesValue: false },
    { long: 'no-project-lint', takesValue: false },
    { long: 'no-compile', takesValue: false },
    { long: 'no-whole-program', takesValue: false },
    { long: 'no-embed', takesValue: false },
    { long: 'verify-each', takesValue: false },
    { long: 'deny-warnings', takesValue: false },
    { long: 'force', takesValue: false },
    { long: 'json-only', takesValue: false },
    { long: 'check', takesValue: false },
    { long: 'stdout', takesValue: false },
    { long: 'check-only', takesValue: false },
];

function getPackageVersion() {
    try {
        const pkgUrl = new URL('../../package.json', import.meta.url);
        return JSON.parse(fs.readFileSync(pkgUrl, 'utf8')).version || '1.0.0';
    } catch {
        return '1.0.0';
    }
}

function makeCliError(code, message, notes = []) {
    return {
        severity: 'error',
        code,
        category: 'CLI',
        message,
        file: null,
        line: null,
        col: null,
        len: 1,
        label: null,
        notes,
    };
}

export function parseCliArgs(argv) {
    const positionals = [];
    const opts = {
        help: false,
        version: false,
        project: null,
        out: null,
        opt: null,
        format: 'pretty',
        color: 'auto',
        smells: false,
        projectLint: true,
        compileCheck: true,
        wholeProgram: true,
        embedSource: true,
        verifyEach: false,
        denyWarnings: false,
        force: false,
        jsonOnly: false,
        fmtCheck: false,
        stdout: false,
        checkOnly: false,
    };
    const errors = [];

    const specByLong = new Map(OPTION_SPECS.map((s) => [s.long, s]));
    const specByShort = new Map(OPTION_SPECS.filter((s) => s.short).map((s) => [s.short, s]));
    const allFlags = [
        ...OPTION_SPECS.map((s) => `--${s.long}`),
        ...OPTION_SPECS.filter((s) => s.short).map((s) => `-${s.short}`),
    ];

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--') {
            positionals.push(...argv.slice(i + 1));
            break;
        }
        if (/^-O([0-3])$/.test(arg)) {
            opts.opt = Number(arg.slice(2));
            continue;
        }
        if (arg.startsWith('--')) {
            const eq = arg.indexOf('=');
            const name = eq >= 0 ? arg.slice(2, eq) : arg.slice(2);
            const inlineVal = eq >= 0 ? arg.slice(eq + 1) : null;
            const spec = specByLong.get(name);
            if (!spec) {
                const similar = closestMatches(`--${name}`, allFlags, { max: 2 });
                errors.push(makeCliError(
                    'E0411',
                    `Unknown option \`--${name}\``,
                    similar.length
                        ? [{ kind: 'help', message: `did you mean \`${similar[0]}\`?` }]
                        : [{ kind: 'help', message: 'run `scratchpiler --help` to see supported options' }],
                ));
                continue;
            }
            let val = inlineVal;
            if (spec.takesValue && val === null) {
                if (i + 1 >= argv.length) {
                    errors.push(makeCliError('E0412', `Option \`--${name}\` requires a value`));
                    continue;
                }
                val = argv[++i];
            }
            applyOption(opts, spec.long, val, errors);
            continue;
        }
        if (arg.startsWith('-') && arg.length > 1) {
            const short = arg.slice(1, 2);
            const rest = arg.slice(2);
            const spec = specByShort.get(short);
            if (!spec) {
                const similar = closestMatches(`-${short}`, allFlags, { max: 2 });
                errors.push(makeCliError(
                    'E0411',
                    `Unknown option \`-${short}\``,
                    similar.length
                        ? [{ kind: 'help', message: `did you mean \`${similar[0]}\`?` }]
                        : [{ kind: 'help', message: 'run `scratchpiler --help` to see supported options' }],
                ));
                continue;
            }
            let val = rest || null;
            if (spec.takesValue && val === null) {
                if (i + 1 >= argv.length) {
                    errors.push(makeCliError('E0412', `Option \`-${short}\` requires a value`));
                    continue;
                }
                val = argv[++i];
            }
            applyOption(opts, spec.long, val, errors);
            continue;
        }
        positionals.push(arg);
    }

    return { command: positionals[0] || null, args: positionals.slice(1), opts, errors };
}

function applyOption(opts, key, val, errors) {
    switch (key) {
        case 'help': opts.help = true; break;
        case 'version': opts.version = true; break;
        case 'project': opts.project = val; break;
        case 'out': opts.out = val; break;
        case 'opt': {
            const n = Number(val);
            if (!Number.isInteger(n) || n < 0 || n > 3) {
                errors.push(makeCliError(
                    'E0412',
                    `Invalid optimization level \`${val}\` — expected 0, 1, 2, or 3`,
                    [{ kind: 'note', message: OPTIMIZATION_LEVELS.map((l) => `${l.level}=${l.name}`).join(', ') }],
                ));
            } else {
                opts.opt = n;
            }
            break;
        }
        case 'format':
            if (!['pretty', 'compact', 'json'].includes(val)) {
                errors.push(makeCliError('E0412', `Invalid output format \`${val}\` — expected pretty, compact, or json`));
            } else {
                opts.format = val;
            }
            break;
        case 'color':
            if (!['auto', 'always', 'never'].includes(val)) {
                errors.push(makeCliError('E0412', `Invalid --color value \`${val}\` — expected auto, always, or never`));
            } else {
                opts.color = val;
            }
            break;
        case 'no-color': opts.color = 'never'; break;
        case 'json': opts.format = 'json'; break;
        case 'smells': opts.smells = true; break;
        case 'no-project-lint': opts.projectLint = false; break;
        case 'no-compile': opts.compileCheck = false; break;
        case 'no-whole-program': opts.wholeProgram = false; break;
        case 'no-embed': opts.embedSource = false; break;
        case 'verify-each': opts.verifyEach = true; break;
        case 'deny-warnings': opts.denyWarnings = true; break;
        case 'force': opts.force = true; break;
        case 'json-only': opts.jsonOnly = true; break;
        case 'check': opts.fmtCheck = true; break;
        case 'stdout': opts.stdout = true; break;
        case 'check-only': opts.checkOnly = true; break;
    }
}

function helpText(command = null) {
    if (command === 'check') {
        return `Usage: scratchpiler check [dir] [options]

Validate all .sdsl sprites and .h headers in a project directory.

Options:
  -p, --project <file>   Base .sb3 or project.json (overrides scratchpiler.json)
  -O, --opt <0|1|2|3>    Optimization level for compile verification (default: 1)
  -f, --format <fmt>     Output format: pretty, compact, or json (default: pretty)
      --smells           Include code-smell hints
      --no-project-lint  Skip cross-sprite project checks
      --no-compile       Skip IR/SLVM compile verification
      --deny-warnings    Exit 1 if any warnings are emitted
      --color <mode>     auto | always | never (or --no-color)
`;
    }
    if (command === 'build') {
        return `Usage: scratchpiler build [dir] [options]

Compile all .sdsl sprites into an .sb3 (or project.json) output file.

Options:
  -p, --project <file>   Base .sb3 or project.json (overrides scratchpiler.json)
  -o, --out <file>       Output .sb3 or .json path
  -O, --opt <0|1|2|3>    Optimization level: 0=Off, 1=Standard, 2=Aggressive, 3=Maximum
      --no-whole-program Disable cross-sprite SLVM confinement facts
      --no-embed         Do not embed source comments into Scratch blocks
      --verify-each      Verify SLVM IR after every optimization pass
      --deny-warnings    Abort build if any warnings are emitted
      --force            Allow overwriting the input base .sb3 in place
  -f, --format <fmt>     pretty | compact | json
`;
    }
    if (command === 'unpack') {
        return `Usage: scratchpiler unpack <file.sb3|project.json> [dir] [options]

Decompile a Scratch project into Stage.sdsl, <Sprite>.sdsl, and scratchpiler.json.

Options:
      --force            Overwrite existing .sdsl / scratchpiler.json files
      --json-only        Copy project.json instead of the .sb3 archive
`;
    }
    if (command === 'init') {
        return `Usage: scratchpiler init [dir] [options]

Initialize a new Scratchpiler project with a starter base.sb3, Sprite1.sdsl, and headers/utils.h.

Options:
      --force            Overwrite existing files
`;
    }
    if (command === 'fmt') {
        return `Usage: scratchpiler fmt [paths...] [options]

Format .sdsl and .h files using Scratchpiler's canonical indentation.

Options:
      --check            Exit 1 if any file would be reformatted
      --stdout           Print formatted output of a single file to stdout
`;
    }
    if (command === 'watch') {
        return `Usage: scratchpiler watch [dir] [options]

Watch .sdsl, .h, and scratchpiler.json for changes and rebuild automatically.

Options:
      --check-only       Only run \`check\` on changes instead of \`build\`
  -p, --project <file>   Base .sb3 or project.json
  -o, --out <file>       Output .sb3 or .json path
  -O, --opt <0|1|2|3>    Optimization level (default: 1)
`;
    }
    if (command === 'info') {
        return `Usage: scratchpiler info [dir|file.sb3] [options]

Inspect sprites, variables, lists, headers, and broadcast graph of a project.

Options:
  -p, --project <file>   Base .sb3 or project.json
      --json             Print JSON output
`;
    }
    return `Scratchpiler CLI v${getPackageVersion()}

Usage: scratchpiler <command> [options]

Commands:
  check [dir]            Validate syntax, types, headers, cross-sprite links, and SLVM compile
  build [dir]            Compile workspace into a .sb3 or project.json artifact
  unpack <sb3> [dir]     Decompile an existing .sb3 / project.json into .sdsl files
  init [dir]             Create a new starter Scratchpiler project
  fmt [paths...]         Format .sdsl and .h files
  watch [dir]            Rebuild automatically when source or header files change
  info [dir|sb3]         Show sprites, variables, headers, and broadcast graph
  help [command]         Show help for a specific command

Run \`scratchpiler <command> --help\` for command-specific options.
`;
}

function makeHeaderReader(ws) {
    return (name) => ws.headers.get(name)?.content ?? null;
}

function validateStandaloneHeaders(ws) {
    const rawItems = [];
    const INCLUDE_RE = /^\s*#include\s*<([^<>]+)>\s*$/;
    const ALLOWED_TOP = new Set(['DefineBlock', 'ScratchroutineStmt', 'EnumDecl', 'StructDecl']);
    for (const hdr of ws.headers.values()) {
        const stripped = hdr.content
            .split('\n')
            .map((line) => (INCLUDE_RE.test(line) ? '' : line))
            .join('\n');
        const { ast, errors } = parse(tokenize(stripped));
        for (const pe of errors) {
            rawItems.push({
                filePath: hdr.relPath,
                source: hdr.content,
                raw: { ...pe, severity: 'error', category: 'Parse' },
            });
        }
        if (errors.length === 0) {
            for (const block of ast.blocks || []) {
                if (!ALLOWED_TOP.has(block.type)) {
                    rawItems.push({
                        filePath: hdr.relPath,
                        source: hdr.content,
                        raw: {
                            line: block.line || 1,
                            col: block.col || 1,
                            len: 1,
                            severity: 'error',
                            category: 'Include',
                            message: 'Headers may only contain `define`, `scratchroutine`, `enum` and `struct` declarations',
                        },
                    });
                }
            }
        }
    }
    return rawItems;
}

function buildSyntheticIndex(ws) {
    const idx = {
        sprites: [],
        stage: { backdrops: [], sounds: [] },
        globalVariables: [],
        spriteVariables: {},
        customBlocks: {},
    };
    for (const sp of ws.sprites) {
        if (sp.name !== STAGE) {
            idx.sprites.push({ name: sp.name, costumes: [], sounds: [] });
            idx.spriteVariables[sp.name] = [];
            idx.customBlocks[sp.name] = [];
        }
    }
    setScratchIndex(idx);
    return idx;
}

function buildAllSpriteDefines(analyses) {
    const map = new Map();
    for (const [spriteName, analysis] of analyses) {
        for (const sym of analysis.symbols || []) {
            if (sym.kind !== 'define' || sym.headerOrigin) continue;
            if (!map.has(sym.name)) map.set(sym.name, []);
            if (!map.get(sym.name).includes(spriteName)) map.get(sym.name).push(spriteName);
        }
    }
    return map;
}

async function analyzeAndCompileWorkspace(rootDir, opts, { cwd = process.cwd(), wantCompile = true } = {}) {
    const ws = discoverWorkspace(rootDir, { projectOverride: opts.project, cwd });
    const allDiagnostics = [...ws.diagnostics];

    const hasDiscoveryError = ws.diagnostics.some((d) => d.severity === 'error');
    if (hasDiscoveryError) {
        return { ws, vm: null, hostKind: 'none', index: null, linked: null, compiledTargets: [], diagnostics: allDiagnostics };
    }

    const host = await loadProjectHost(ws.indexSource, { relPath: ws.relPath });
    if (host.errors.length) {
        allDiagnostics.push(...host.errors);
        return { ws, vm: null, hostKind: host.kind, index: null, linked: null, compiledTargets: [], diagnostics: allDiagnostics };
    }

    const vm = host.vm;
    const index = vm ? buildScratchIndex(vm) : buildSyntheticIndex(ws);
    const readHeader = makeHeaderReader(ws);

    if (ws.sprites.length === 0) {
        allDiagnostics.push(makeCliError(
            'E0409',
            `No .sdsl sprite files found in ${ws.relPath(ws.root)}`,
            [{ kind: 'help', message: 'run `scratchpiler init` to create a starter project or `scratchpiler unpack <file.sb3>`' }],
        ));
        return { ws, vm, hostKind: host.kind, index, linked: null, compiledTargets: [], diagnostics: allDiagnostics };
    }

    // Validate standalone headers first so un-included broken headers still report cleanly.
    const standaloneHeaderRaw = validateStandaloneHeaders(ws);

    const spriteSources = new Map();
    const analyses = new Map();
    const spriteByName = new Map();
    for (const sp of ws.sprites) {
        const text = fs.readFileSync(sp.filePath, 'utf8');
        ws.fileSources.set(sp.relPath, text);
        spriteSources.set(sp.name, text);
        spriteByName.set(sp.name, sp);
        analyses.set(sp.name, analyze(text, sp.name, { readHeader }));
    }

    const allSpriteDefines = buildAllSpriteDefines(analyses);

    // Cross-sprite project linking (including untouched targets from base VM so broadcasts match)
    const project = createProject();
    setProjectIndex(project, index);
    for (const sp of ws.sprites) {
        setProjectFile(project, sp.name, spriteSources.get(sp.name), index, analyses.get(sp.name));
    }
    if (vm) {
        for (const target of vm.runtime.targets) {
            const name = target.isStage ? STAGE : target.sprite.name;
            if (spriteByName.has(name)) continue;
            const text = decompile(vm, name);
            setProjectFile(project, name, text, index);
        }
    }
    const linked = linkedProject(project);

    const makeCtx = (sp, analysis) => ({
        spriteName: sp?.name || null,
        filePath: sp?.relPath || null,
        source: sp ? spriteSources.get(sp.name) : null,
        index,
        hasIndex: Boolean(vm),
        analysis,
        linked,
        headerPaths: ws.headerPaths,
        headerSearchDirs: ws.headerSearchDirs,
        fileSources: ws.fileSources,
        allSpriteDefines,
        relPath: ws.relPath,
    });

    for (const item of standaloneHeaderRaw) {
        allDiagnostics.push(enrichDiagnostic(item.raw, {
            ...makeCtx(null, null),
            filePath: item.filePath,
            source: item.source,
        }));
    }

    const optLevel = optimizationLevel(opts.opt ?? ws.manifest?.opt ?? 1);
    const compiledTargets = [];

    for (const sp of ws.sprites) {
        const text = spriteSources.get(sp.name);
        const analysis = analyses.get(sp.name);
        const ctx = makeCtx(sp, analysis);

        for (const pe of analysis.parseErrors) {
            allDiagnostics.push(enrichDiagnostic({ ...pe, severity: 'error', category: 'Parse' }, ctx));
        }

        if (analysis.parseErrors.length === 0) {
            for (const w of lint(analysis.ast)) {
                allDiagnostics.push(enrichDiagnostic({ ...w, severity: 'warning', category: w.category || 'Lint' }, ctx));
            }
            if (vm) {
                for (const tw of typeCheckDiagnostics(analysis.ast, sp.name)) {
                    allDiagnostics.push(enrichDiagnostic({ ...tw, severity: 'warning', category: 'Type' }, ctx));
                }
            }
            for (const sw of semanticDiagnostics(analysis)) {
                allDiagnostics.push(enrichDiagnostic({ ...sw, severity: 'warning', category: 'Semantic' }, ctx));
            }
            if (opts.smells) {
                for (const sm of smellDiagnostics(analysis)) {
                    allDiagnostics.push(enrichDiagnostic({ ...sm, severity: 'info', category: 'Smell' }, ctx));
                }
            }
        }

        if (opts.projectLint) {
            for (const pd of diagnosticsFor(linked, sp.name)) {
                allDiagnostics.push(enrichDiagnostic({ ...pd, category: 'Project' }, ctx));
            }
        }

        // Check missing target in base VM
        if (vm && !findTarget(vm, sp.name)) {
            const avail = vm.runtime.targets.filter((t) => !t.isStage).map((t) => t.sprite.name);
            const matches = sp.name === STAGE ? [] : closestMatches(sp.name, avail);
            allDiagnostics.push({
                severity: 'error',
                code: 'E0408',
                category: 'CLI',
                message: `Sprite "${sp.name === STAGE ? 'Stage' : sp.name}" (from ${sp.relPath}) does not exist in ${ws.relPath(ws.indexSource)}`,
                file: sp.relPath,
                line: null,
                col: null,
                len: 1,
                label: null,
                notes: matches.length
                    ? [{ kind: 'help', message: `did you mean "${matches[0]}"? (or map it in scratchpiler.json \`"sprites"\`)` }]
                    : [{ kind: 'note', message: `available sprites in project: ${avail.length ? avail.map((s) => `"${s}"`).join(', ') : '(none)'}` }],
            });
            continue;
        }

        if (wantCompile && vm && analysis.parseErrors.length === 0) {
            const facts = opts.wholeProgram && optLevel > 0 ? slvmFacts(linked, sp.name) : null;
            const res = compileSourceWithHeaders(text, vm, sp.name, {
                optimize: optLevel,
                embedSource: opts.embedSource,
                projectFacts: facts,
                verifyEach: opts.verifyEach,
                readHeader,
            });
            for (const err of res.errors || []) {
                allDiagnostics.push(enrichDiagnostic({ ...err, severity: 'error', category: 'Compile' }, ctx));
            }
            if (res.optimizerFallback) {
                allDiagnostics.push(enrichDiagnostic({
                    line: 1,
                    col: 1,
                    len: 1,
                    severity: 'warning',
                    category: 'SLVM',
                    message: `Optimization level ${optLevel} fell back to unoptimized lowering: ${res.optimizerFallback}`,
                }, ctx));
            }
            if (!res.errors?.length) {
                compiledTargets.push({ sprite: sp, compiled: res });
            }
        }
    }

    if (opts.projectLint && linked?.diagnostics?.project?.length) {
        for (const item of linked.diagnostics.project) {
            allDiagnostics.push({
                severity: item.severity || 'info',
                code: 'I0301',
                category: 'Project',
                message: item.message,
                file: null,
                line: null,
                col: null,
                len: 1,
                label: null,
                notes: [],
            });
        }
    }

    return {
        ws,
        vm,
        hostKind: host.kind,
        index,
        linked,
        optLevel,
        compiledTargets,
        diagnostics: deduplicateDiagnostics(allDiagnostics),
    };
}

function hasFatalDiagnostics(diagnostics, denyWarnings) {
    return diagnostics.some((d) => d.severity === 'error' || (denyWarnings && d.severity === 'warning'));
}

async function cmdCheck(args, opts, io) {
    const dir = args[0] || '.';
    const result = await analyzeAndCompileWorkspace(dir, opts, { cwd: io.cwd, wantCompile: opts.compileCheck });
    const rendered = formatDiagnostics(result.diagnostics, result.ws.fileSources, {
        format: opts.format,
        color: opts.color,
    });
    if (rendered) {
        (opts.format === 'json' ? io.stdout : io.stderr).write(rendered);
    }
    const failed = hasFatalDiagnostics(result.diagnostics, opts.denyWarnings);
    if (!failed && opts.format === 'pretty') {
        const errInfo = result.ws.indexSource ? '' : ' (no base .sb3/project.json — variable resolution skipped)';
        io.stdout.write(`Checked ${result.ws.sprites.length} sprite${result.ws.sprites.length === 1 ? '' : 's'}, ${result.ws.headers.size} header${result.ws.headers.size === 1 ? '' : 's'} — ok${errInfo}\n`);
    }
    return failed ? 1 : 0;
}

async function cmdBuild(args, opts, io) {
    const start = performance.now();
    const dir = args[0] || '.';
    const result = await analyzeAndCompileWorkspace(dir, opts, { cwd: io.cwd, wantCompile: true });
    const { ws, vm, hostKind, compiledTargets, diagnostics } = result;

    if (!ws.indexSource && !diagnostics.some((d) => d.severity === 'error')) {
        diagnostics.push(makeCliError(
            'E0407',
            `Cannot build without a base .sb3 or project.json in ${ws.relPath(ws.root)}`,
            [{ kind: 'help', message: 'add a `.sb3` file (or `scratchpiler.json` with `"project"`), or run `scratchpiler init`' }],
        ));
    }

    const failed = hasFatalDiagnostics(diagnostics, opts.denyWarnings);
    if (failed) {
        const rendered = formatDiagnostics(diagnostics, ws.fileSources, { format: opts.format, color: opts.color });
        if (rendered) (opts.format === 'json' ? io.stdout : io.stderr).write(rendered);
        return 1;
    }

    const configuredOut = opts.out || ws.manifest?.out || null;
    const defaultExt = hostKind === 'json' ? '.json' : '.sb3';
    const defaultName = `${path.basename(ws.root) || 'project'}.built${defaultExt}`;
    const outPath = configuredOut
        ? path.resolve(configuredOut.startsWith('/') || opts.out ? io.cwd : ws.root, configuredOut)
        : path.join(ws.root, defaultName);

    if (ws.indexSource && path.resolve(outPath) === path.resolve(ws.indexSource) && !opts.force) {
        const err = makeCliError(
            'E0413',
            `Refusing to overwrite input project file ${ws.relPath(outPath)} in place`,
            [{ kind: 'help', message: 'pass `--out <different-path>` or `--force` if you really want to overwrite it' }],
        );
        const rendered = formatDiagnostics([...diagnostics, err], ws.fileSources, { format: opts.format, color: opts.color });
        (opts.format === 'json' ? io.stdout : io.stderr).write(rendered);
        return 1;
    }

    const wantsJsonOut = outPath.toLowerCase().endsWith('.json');
    if (!wantsJsonOut && hostKind === 'json') {
        const err = makeCliError(
            'E0407',
            `Cannot emit .sb3 archive (${ws.relPath(outPath)}) when base project is a bare project.json`,
            [{ kind: 'help', message: 'costume/sound assets live in `.sb3` files — use `--out project.out.json`, or point `"project"` at a `.sb3` file' }],
        );
        const rendered = formatDiagnostics([...diagnostics, err], ws.fileSources, { format: opts.format, color: opts.color });
        (opts.format === 'json' ? io.stdout : io.stderr).write(rendered);
        return 1;
    }

    const stats = [];
    for (const { sprite, compiled } of compiledTargets) {
        const count = applyCompiledTarget(vm, sprite.name, compiled);
        stats.push({
            sprite: sprite.name === STAGE ? 'Stage' : sprite.name,
            file: sprite.relPath,
            blocks: count,
            usedProjectFacts: compiled.usedProjectFacts,
        });
    }

    if (wantsJsonOut) saveProjectJson(vm, outPath);
    else await saveSb3(vm, outPath);

    const elapsedMs = Math.round(performance.now() - start);
    if (opts.format === 'json') {
        const cleanDiags = diagnostics.map(({ _dedupKey, ...rest }) => rest);
        io.stdout.write(JSON.stringify({
            ok: true,
            out: ws.relPath(outPath),
            optLevel: result.optLevel,
            elapsedMs,
            targets: stats,
            warnings: cleanDiags.filter((d) => d.severity === 'warning').length,
            diagnostics: cleanDiags,
        }, null, 2) + '\n');
        return 0;
    }

    if (diagnostics.length) {
        io.stderr.write(formatDiagnostics(diagnostics, ws.fileSources, { format: opts.format, color: opts.color }));
    }

    const optName = OPTIMIZATION_LEVELS[result.optLevel]?.name || `O${result.optLevel}`;
    for (const s of stats) {
        const wp = s.usedProjectFacts ? ' [whole-program]' : '';
        io.stdout.write(`  ${s.sprite.padEnd(16)} ${String(s.blocks).padStart(5)} blocks${wp}\n`);
    }
    io.stdout.write(`Built ${ws.relPath(outPath)} (${optName}, ${elapsedMs} ms)\n`);
    return 0;
}

async function cmdUnpack(args, opts, io) {
    if (args.length === 0) {
        const err = makeCliError('E0412', 'Missing input .sb3 or project.json path', [
            { kind: 'help', message: 'usage: scratchpiler unpack <file.sb3|project.json> [dir]' },
        ]);
        io.stderr.write(formatDiagnostics([err], new Map(), { format: opts.format, color: opts.color }));
        return 1;
    }

    const srcFile = path.resolve(io.cwd, args[0]);
    if (!fs.existsSync(srcFile)) {
        const err = makeCliError('E0404', `Input file not found: ${args[0]}`);
        io.stderr.write(formatDiagnostics([err], new Map(), { format: opts.format, color: opts.color }));
        return 1;
    }

    const defaultDir = path.basename(srcFile, path.extname(srcFile));
    const outDir = path.resolve(io.cwd, args[1] || defaultDir);
    const rel = (p) => path.relative(io.cwd, p) || path.basename(p);

    const host = await loadProjectHost(srcFile, { relPath: rel });
    if (host.errors.length) {
        io.stderr.write(formatDiagnostics(host.errors, new Map(), { format: opts.format, color: opts.color }));
        return 1;
    }

    const { vm } = host;
    buildScratchIndex(vm);

    const writes = [];
    for (const target of vm.runtime.targets) {
        const spriteName = target.isStage ? STAGE : target.sprite.name;
        const fileName = encodeSpriteFile(spriteName);
        const text = decompile(vm, spriteName);
        writes.push({ path: path.join(outDir, fileName), content: text, sprite: spriteName === STAGE ? 'Stage' : spriteName });
    }

    const useJson = opts.jsonOnly || host.kind === 'json';
    const baseName = useJson ? 'project.json' : path.basename(srcFile);
    const manifestPath = path.join(outDir, 'scratchpiler.json');
    const outProjectName = path.basename(srcFile, path.extname(srcFile)) + (useJson ? '.built.json' : '.built.sb3');
    const manifestContent = JSON.stringify({ project: baseName, out: outProjectName }, null, 2) + '\n';

    const conflicts = [...writes.map((w) => w.path), manifestPath].filter((p) => fs.existsSync(p));
    if (conflicts.length && !opts.force) {
        const err = makeCliError(
            'E0413',
            `Target directory already contains ${conflicts.length} file${conflicts.length === 1 ? '' : 's'} that would be overwritten: ${conflicts.map((c) => path.basename(c)).join(', ')}`,
            [{ kind: 'help', message: 'pass `--force` to overwrite, or choose a different output directory' }],
        );
        io.stderr.write(formatDiagnostics([err], new Map(), { format: opts.format, color: opts.color }));
        return 1;
    }

    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(path.join(outDir, 'headers'), { recursive: true });

    const baseDest = path.join(outDir, baseName);
    if (useJson) {
        saveProjectJson(vm, baseDest);
    } else if (path.resolve(srcFile) !== path.resolve(baseDest)) {
        fs.copyFileSync(srcFile, baseDest);
    }

    for (const w of writes) fs.writeFileSync(w.path, w.content, 'utf8');
    fs.writeFileSync(manifestPath, manifestContent, 'utf8');

    io.stdout.write(`Unpacked ${writes.length} target${writes.length === 1 ? '' : 's'} into ${rel(outDir)}/\n`);
    io.stdout.write(`  next: scratchpiler check ${rel(outDir)}\n`);
    io.stdout.write(`        scratchpiler build ${rel(outDir)}\n`);
    return 0;
}

async function cmdInit(args, opts, io) {
    const outDir = path.resolve(io.cwd, args[0] || '.');
    const rel = (p) => path.relative(io.cwd, p) || '.';

    const files = {
        'scratchpiler.json': JSON.stringify({ project: 'base.sb3', out: 'game.sb3' }, null, 2) + '\n',
        'Stage.sdsl': 'on receive "reset" {\n    set [score] to 0\n}\n',
        'Sprite1.sdsl': [
            '#include <utils.h>',
            '',
            'on flag {',
            '    say("Hello from Scratchpiler!")',
            '    broadcastAndWait("reset")',
            '    set [score] to addOne([score])',
            '    move(10)',
            '}',
            '',
        ].join('\n'),
        'headers/utils.h': [
            'define addOne(x) returns {',
            '    return x + 1',
            '}',
            '',
        ].join('\n'),
    };

    const baseSb3Path = path.join(outDir, 'base.sb3');
    const targets = [baseSb3Path, ...Object.keys(files).map((f) => path.join(outDir, f))];
    const existing = targets.filter((p) => fs.existsSync(p));
    if (existing.length && !opts.force) {
        const err = makeCliError(
            'E0413',
            `Directory already contains project files: ${existing.map((p) => path.relative(outDir, p)).join(', ')}`,
            [{ kind: 'help', message: 'pass `--force` to overwrite or specify a new directory: `scratchpiler init my-game`' }],
        );
        io.stderr.write(formatDiagnostics([err], new Map(), { format: opts.format, color: opts.color }));
        return 1;
    }

    fs.mkdirSync(path.join(outDir, 'headers'), { recursive: true });
    fs.writeFileSync(baseSb3Path, await createBlankSb3());
    for (const [name, content] of Object.entries(files)) {
        fs.writeFileSync(path.join(outDir, name), content, 'utf8');
    }

    io.stdout.write(`Initialized Scratchpiler project in ${rel(outDir)}\n`);
    io.stdout.write(`  next: scratchpiler check ${rel(outDir)}\n`);
    io.stdout.write(`        scratchpiler build ${rel(outDir)}\n`);
    return 0;
}

function collectFmtFiles(args, cwd) {
    if (args.length === 0) {
        const ws = discoverWorkspace('.', { cwd });
        return [
            ...ws.sprites.map((s) => s.filePath),
            ...[...ws.headers.values()].map((h) => h.filePath),
        ];
    }
    const out = [];
    for (const a of args) {
        const full = path.resolve(cwd, a);
        if (!fs.existsSync(full)) continue;
        if (fs.statSync(full).isDirectory()) {
            const ws = discoverWorkspace(full, { cwd });
            out.push(...ws.sprites.map((s) => s.filePath), ...[...ws.headers.values()].map((h) => h.filePath));
        } else {
            out.push(full);
        }
    }
    return [...new Set(out)];
}

async function cmdFmt(args, opts, io) {
    for (const a of args) {
        const full = path.resolve(io.cwd, a);
        if (!fs.existsSync(full)) {
            const err = makeCliError('E0404', `File or directory not found: ${a}`);
            io.stderr.write(formatDiagnostics([err], new Map(), { format: opts.format, color: opts.color }));
            return 1;
        }
    }

    const files = collectFmtFiles(args, io.cwd);
    if (files.length === 0) {
        io.stdout.write('No .sdsl or .h files to format.\n');
        return 0;
    }

    if (opts.stdout) {
        if (files.length !== 1) {
            const err = makeCliError('E0412', '`--stdout` requires exactly one file');
            io.stderr.write(formatDiagnostics([err], new Map(), { format: opts.format, color: opts.color }));
            return 1;
        }
        const raw = fs.readFileSync(files[0], 'utf8');
        io.stdout.write(formatSource(raw) ?? raw);
        return 0;
    }

    let changed = 0;
    for (const file of files) {
        const raw = fs.readFileSync(file, 'utf8');
        const formatted = formatSource(raw);
        if (formatted === null || formatted === raw) continue;
        changed++;
        const rel = path.relative(io.cwd, file) || path.basename(file);
        if (opts.fmtCheck) {
            io.stderr.write(`Would reformat: ${rel}\n`);
        } else {
            fs.writeFileSync(file, formatted, 'utf8');
            io.stdout.write(`Formatted ${rel}\n`);
        }
    }

    if (opts.fmtCheck && changed > 0) {
        return 1;
    }
    if (!opts.fmtCheck && changed === 0) {
        io.stdout.write(`All ${files.length} file${files.length === 1 ? '' : 's'} already formatted.\n`);
    }
    return 0;
}

async function cmdInfo(args, opts, io) {
    const target = args[0] || '.';
    const resolved = path.resolve(io.cwd, target);
    let ws;
    let projectOverride = opts.project;

    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        projectOverride = resolved;
        ws = discoverWorkspace(path.dirname(resolved), { projectOverride, cwd: io.cwd });
    } else {
        ws = discoverWorkspace(target, { projectOverride, cwd: io.cwd });
    }

    const host = ws.indexSource ? await loadProjectHost(ws.indexSource, { relPath: ws.relPath }) : { vm: null, errors: [] };
    if (host.errors.length) {
        io.stderr.write(formatDiagnostics(host.errors, ws.fileSources, { format: opts.format, color: opts.color }));
        return 1;
    }

    const index = host.vm ? buildScratchIndex(host.vm) : buildSyntheticIndex(ws);
    const readHeader = makeHeaderReader(ws);
    const project = createProject();
    setProjectIndex(project, index);
    for (const sp of ws.sprites) {
        const text = fs.readFileSync(sp.filePath, 'utf8');
        setProjectFile(project, sp.name, text, index, analyze(text, sp.name, { readHeader }));
    }
    if (host.vm) {
        const loadedNames = new Set(ws.sprites.map((s) => s.name));
        for (const t of host.vm.runtime.targets) {
            const name = t.isStage ? STAGE : t.sprite.name;
            if (!loadedNames.has(name)) setProjectFile(project, name, decompile(host.vm, name), index);
        }
    }
    const linked = linkedProject(project);
    const graph = eventGraph(linked);

    const summary = {
        root: ws.relPath(ws.root),
        projectFile: ws.indexSource ? ws.relPath(ws.indexSource) : null,
        sprites: [
            { name: 'Stage', vars: index.globalVariables.length, backdrops: index.stage.backdrops.length, sounds: index.stage.sounds.length },
            ...index.sprites.map((s) => ({
                name: s.name,
                vars: (index.spriteVariables[s.name] || []).length,
                costumes: s.costumes.length,
                sounds: s.sounds.length,
                customBlocks: (index.customBlocks[s.name] || []).length,
            })),
        ],
        headers: [...ws.headers.values()].map((h) => ({ name: h.name, path: h.relPath })),
        messages: [...linked.messages.values()].map((m) => ({
            name: displayMessage(m.name),
            routine: m.name.startsWith('__sroutine_'),
            senders: m.senders.length,
            receivers: m.receivers.length,
        })),
        scripts: graph.scripts.length,
    };

    if (opts.format === 'json') {
        io.stdout.write(JSON.stringify(summary, null, 2) + '\n');
        return 0;
    }

    io.stdout.write(`Project: ${summary.projectFile || '(none)'}\n`);
    io.stdout.write(`Sprites (${summary.sprites.length}):\n`);
    for (const s of summary.sprites) {
        io.stdout.write(`  - ${s.name} (${s.vars} vars/lists${s.customBlocks ? `, ${s.customBlocks} custom blocks` : ''})\n`);
    }
    io.stdout.write(`Headers (${summary.headers.length}): ${summary.headers.map((h) => h.name).join(', ') || '(none)'}\n`);
    io.stdout.write(`Broadcasts (${summary.messages.length}):\n`);
    for (const m of summary.messages) {
        const tag = m.routine ? ' [routine]' : '';
        io.stdout.write(`  - "${m.name}"${tag}: ${m.senders} sender(s) -> ${m.receivers} receiver(s)\n`);
    }
    return 0;
}

async function cmdWatch(args, opts, io) {
    const dir = args[0] || '.';
    const ws = discoverWorkspace(dir, { projectOverride: opts.project, cwd: io.cwd });
    if (ws.diagnostics.some((d) => d.severity === 'error')) {
        io.stderr.write(formatDiagnostics(ws.diagnostics, ws.fileSources, { format: opts.format, color: opts.color }));
        return 1;
    }

    const runOnce = async () => {
        const code = opts.checkOnly ? await cmdCheck(args, opts, io) : await cmdBuild(args, opts, io);
        const stamp = new Date().toLocaleTimeString();
        io.stdout.write(`[${stamp}] ${code === 0 ? 'ready' : 'waiting for fixes'} — watching ${ws.relPath(ws.root)}\n`);
    };

    await runOnce();

    let timer = null;
    let running = false;
    let pending = false;

    const trigger = () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
            if (running) { pending = true; return; }
            running = true;
            try {
                await runOnce();
            } finally {
                running = false;
                if (pending) { pending = false; trigger(); }
            }
        }, 150);
    };

    const dirs = [ws.root, ...ws.headerSearchDirs.filter((d) => d !== ws.root && fs.existsSync(d))];
    const watchers = [];
    for (const d of dirs) {
        try {
            watchers.push(fs.watch(d, (_event, filename) => {
                if (!filename || /\.(sdsl|h|sb3|json)$/i.test(filename)) trigger();
            }));
        } catch {
            // skip unwatcheable dir
        }
    }

    await new Promise((resolve) => {
        const stop = () => {
            clearTimeout(timer);
            for (const w of watchers) w.close();
            resolve();
        };
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
    });
    return 0;
}

export async function runCli(argv, io = {}) {
    const stdout = io.stdout || process.stdout;
    const stderr = io.stderr || process.stderr;
    const cwd = io.cwd || process.cwd();
    const ioCtx = { stdout, stderr, cwd };

    const { command, args, opts, errors } = parseCliArgs(argv);

    if (opts.version && !command) {
        stdout.write(`scratchpiler ${getPackageVersion()}\n`);
        return 0;
    }

    if (!command) {
        stdout.write(helpText(null));
        return errors.length ? 1 : 0;
    }

    if (command === 'help') {
        stdout.write(helpText(args[0] || null));
        return 0;
    }

    if (opts.help) {
        stdout.write(helpText(COMMANDS.includes(command) ? command : null));
        return 0;
    }

    if (errors.length) {
        const rendered = formatDiagnostics(errors, new Map(), { format: opts.format, color: opts.color });
        (opts.format === 'json' ? stdout : stderr).write(rendered);
        return 1;
    }

    if (!COMMANDS.includes(command)) {
        const similar = closestMatches(command, COMMANDS, { max: 2 });
        const err = makeCliError(
            'E0410',
            `Unknown command \`${command}\``,
            [
                ...(similar.length ? [{ kind: 'help', message: `did you mean \`scratchpiler ${similar[0]}\`?` }] : []),
                { kind: 'note', message: `available commands: ${COMMANDS.join(', ')}` },
            ],
        );
        const rendered = formatDiagnostics([err], new Map(), { format: opts.format, color: opts.color });
        (opts.format === 'json' ? stdout : stderr).write(rendered);
        return 1;
    }

    switch (command) {
        case 'check': return cmdCheck(args, opts, ioCtx);
        case 'build': return cmdBuild(args, opts, ioCtx);
        case 'unpack': return cmdUnpack(args, opts, ioCtx);
        case 'init': return cmdInit(args, opts, ioCtx);
        case 'fmt': return cmdFmt(args, opts, ioCtx);
        case 'watch': return cmdWatch(args, opts, ioCtx);
        case 'info': return cmdInfo(args, opts, ioCtx);
        default: return 1;
    }
}

export { useColor };
