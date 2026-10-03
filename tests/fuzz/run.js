import fs from 'node:fs';
import path from 'node:path';
import { generateProgram, DEFAULT_FEATURES } from './generate.js';
import { execute, haveVM, visible } from '../backend-harness.js';
import { runOracle, OracleLimit } from './oracle.js';

const USAGE = `usage: node tests/fuzz/run.js [--from N] [--count N] [--out dir] [--feature name ...]

Generates random Scratchpiler programs, compiles through SLVM, and compares a
headless scratch-vm execution with the independent source interpreter. Failing
programs and reports are written to --out. Any failure produces a nonzero exit.
features: ${Object.keys(DEFAULT_FEATURES).join(', ')}`;

const argv = process.argv.slice(2);
const opts = { from: 0, count: 100, out: null, features: { ...DEFAULT_FEATURES } };
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from') opts.from = Number(argv[++i]);
    else if (a === '--count') opts.count = Number(argv[++i]);
    else if (a === '--out') opts.out = argv[++i];
    else if (a === '--feature') opts.features[argv[++i]] = true;
    else { console.log(USAGE); process.exit(a === '-h' || a === '--help' ? 0 : 2); }
}
if (!haveVM) {
    console.error('fuzz: slvm/testing with scratch-vm is not installed');
    process.exit(2);
}
if (opts.out) fs.mkdirSync(opts.out, { recursive: true });

const totals = { programs: 0, compileErrors: 0, runtimeErrors: 0, mismatches: 0, oracleSkipped: 0, optimizerFallbacks: 0, blocks: 0 };

function disagreements(vm, oracle) {
    const out = [];
    const vars = visible(vm.vars);
    for (const name of new Set([...Object.keys(vars), ...Object.keys(oracle.vars)])) {
        const want = oracle.vars[name] ?? '0';
        if (vars[name] !== want) out.push(`[${name}] = ${JSON.stringify(vars[name])}, expected ${JSON.stringify(want)}`);
    }
    for (const name of ['L', '__heap', '__ptab']) {
        const got = visible(vm.lists)[name] ?? [];
        const want = oracle.lists[name] ?? [];
        if (JSON.stringify(got) !== JSON.stringify(want)) out.push(`[${name}] = ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
    }
    if (JSON.stringify(vm.said) !== JSON.stringify(oracle.said)) out.push(`said ${JSON.stringify(vm.said)}, expected ${JSON.stringify(oracle.said)}`);
    return out;
}
function saveFailure(seed, source, report) {
    if (!opts.out) return;
    fs.writeFileSync(path.join(opts.out, `seed-${seed}.sdsl`), source);
    fs.writeFileSync(path.join(opts.out, `seed-${seed}.json`), JSON.stringify(report, null, 2));
}

for (let seed = opts.from; seed < opts.from + opts.count; seed++) {
    const source = generateProgram(seed, opts.features);
    totals.programs++;
    let result;
    try {
        result = await execute(source, { maxFrames: 2000 }, { lists: ['L'], vars: ['p', 'q'] });
    } catch (error) {
        totals.runtimeErrors++;
        console.log(`seed ${seed}: ${error.message}`);
        saveFailure(seed, source, { error: error.stack });
        continue;
    }
    if (result.errors.length) {
        totals.compileErrors++;
        console.log(`seed ${seed}: compile errors ${JSON.stringify(result.errors.map((e) => e.message))}`);
        saveFailure(seed, source, { errors: result.errors });
        continue;
    }
    if (result.optimizerFallback) {
        totals.optimizerFallbacks++;
        console.log(`seed ${seed}: optimizer fallback: ${result.optimizerFallback.split('\n')[0]}`);
        saveFailure(seed, source, { optimizerFallback: result.optimizerFallback });
    }
    totals.blocks += Object.keys(result.blocks).length;
    let oracle;
    try {
        oracle = runOracle(source, { initialVars: { p: 0, q: 0 }, initialLists: { L: [] } });
    } catch (e) {
        if (!(e instanceof OracleLimit)) throw e;
        totals.oracleSkipped++;
        continue;
    }
    const differences = disagreements(result.runtime, oracle);
    if (differences.length) {
        totals.mismatches++;
        console.log(`seed ${seed}: ${differences[0]}`);
        saveFailure(seed, source, { differences });
    }
}
console.log(JSON.stringify(totals));
process.exitCode = totals.compileErrors || totals.runtimeErrors || totals.mismatches || totals.oracleSkipped || totals.optimizerFallbacks ? 1 : 0;
