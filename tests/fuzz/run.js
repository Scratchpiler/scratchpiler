import fs from 'node:fs';
import path from 'node:path';
import { generateProgram, DEFAULT_FEATURES } from './generate.js';
import { compareBackends, haveVM, visible } from '../backend-harness.js';
import { runOracle, OracleLimit } from './oracle.js';

const USAGE = `usage: node tests/fuzz/run.js [--from N] [--count N] [--out dir] [--feature name ...]

Generates random Scratchpiler programs, compiles each with the classic and the SLVM
backend, runs both in a headless scratch-vm and reports every difference in variables,
lists, speech or sprite state. Divergent programs are written to --out with a .json
report next to each.
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

const totals = { programs: 0, compileErrors: 0, classicOnlyErrors: 0, diverged: 0, classicWrong: 0, slvmWrong: 0, oracleSkipped: 0, blocksClassic: 0, blocksSlvm: 0 };

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
for (let seed = opts.from; seed < opts.from + opts.count; seed++) {
    const source = generateProgram(seed, opts.features);
    const result = await compareBackends(source, { maxFrames: 2000 }, { lists: ['L'], vars: ['p', 'q'] });
    totals.programs++;
    if (result.slvmErrors.length) {
        totals.compileErrors++;
        console.log(`seed ${seed}: SLVM compile errors ${JSON.stringify(result.slvmErrors.map((e) => e.message))}`);
        if (opts.out) fs.writeFileSync(path.join(opts.out, `seed-${seed}.sdsl`), source);
        continue;
    }
    if (result.classicErrors.length) totals.classicOnlyErrors++;
    if (result.compiled) {
        totals.blocksClassic += result.blocks.classic;
        totals.blocksSlvm += result.blocks.slvm;
    }
    let oracle = null;
    try {
        oracle = runOracle(source);
    } catch (e) {
        if (!(e instanceof OracleLimit)) throw e;
        totals.oracleSkipped++;
    }
    const report = {
        backends: result.differences,
        classic: oracle && result.classic ? disagreements(result.classic, oracle) : [],
        slvm: oracle ? disagreements(result.slvm, oracle) : [],
    };
    if (result.differences.length) totals.diverged++;
    if (report.classic.length) totals.classicWrong++;
    if (report.slvm.length) totals.slvmWrong++;
    if (result.differences.length || report.classic.length || report.slvm.length) {
        const parts = [];
        if (result.differences.length) parts.push(`backends differ (${result.differences.map((d) => d.what).join(', ')})`);
        if (report.classic.length) parts.push(`classic ≠ oracle: ${report.classic[0]}`);
        if (report.slvm.length) parts.push(`slvm ≠ oracle: ${report.slvm[0]}`);
        console.log(`seed ${seed}: ${parts.join(' | ')}`);
        if (opts.out) {
            fs.writeFileSync(path.join(opts.out, `seed-${seed}.sdsl`), source);
            fs.writeFileSync(path.join(opts.out, `seed-${seed}.json`), JSON.stringify(report, null, 2));
        }
    }
}
console.log(JSON.stringify(totals));
