import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runCli } from '../src/cli/commands.js';
import { encodeSpriteFile, decodeSpriteFile } from '../src/cli/workspace.js';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const JSZip = require('jszip');
const VirtualMachine = require('scratch-vm');
const { ScratchStorage } = require('scratch-storage');

function mkTempDir(prefix = 'sp-cli-test-') {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeCaptureStream() {
    let text = '';
    return {
        isTTY: false,
        write(chunk) { text += String(chunk); },
        get output() { return text; },
    };
}

async function execCli(args, cwd) {
    const stdout = makeCaptureStream();
    const stderr = makeCaptureStream();
    const code = await runCli(args, { stdout, stderr, cwd });
    return { code, stdout: stdout.output, stderr: stderr.output };
}

async function runBuiltSb3(sb3Path, frames = 10) {
    const vm = new VirtualMachine();
    vm.attachStorage(new ScratchStorage());
    await vm.loadProject(fs.readFileSync(sb3Path));
    const said = [];
    vm.runtime.on('SAY', (_t, _type, msg) => { if (msg) said.push(String(msg)); });
    vm.runtime.currentStepTime = 1000 / 30;
    vm.greenFlag();
    for (let i = 0; i < frames; i++) vm.runtime._step();
    const vars = {};
    for (const target of vm.runtime.targets) {
        const prefix = target.isStage ? 'Stage' : target.sprite.name;
        for (const v of Object.values(target.variables)) {
            if (v.type === '') vars[`${prefix}.${v.name}`] = v.value;
        }
    }
    return { vm, said, vars };
}

test('cli: sprite filename encoding and decoding roundtrip', () => {
    for (const name of ['Player', 'Bot:1/2', '100% Cat?', 'a<b>c"d|e*f\\g']) {
        const file = encodeSpriteFile(name);
        assert.ok(!/[<>:"/\\|?*]/.test(file), `unsafe char in ${file}`);
        assert.equal(decodeSpriteFile(path.basename(file, '.sdsl')), name);
    }
    assert.equal(encodeSpriteFile('__stage__'), 'Stage.sdsl');
    assert.equal(decodeSpriteFile('Stage'), '__stage__');
});

test('cli: init -> check -> build -> run in real scratch-vm', async (t) => {
    const dir = mkTempDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

    const initRes = await execCli(['init', '.'], dir);
    assert.equal(initRes.code, 0, initRes.stderr);
    assert.ok(fs.existsSync(path.join(dir, 'base.sb3')));
    assert.ok(fs.existsSync(path.join(dir, 'Sprite1.sdsl')));
    assert.ok(fs.existsSync(path.join(dir, 'headers/utils.h')));

    const checkRes = await execCli(['check', '--deny-warnings'], dir);
    assert.equal(checkRes.code, 0, checkRes.stderr);
    assert.match(checkRes.stdout, /Checked 2 sprites, 1 header — ok/);

    const buildRes = await execCli(['build', '-O2'], dir);
    assert.equal(buildRes.code, 0, buildRes.stderr);
    const outSb3 = path.join(dir, 'game.sb3');
    assert.ok(fs.existsSync(outSb3));

    const run = await runBuiltSb3(outSb3, 10);
    assert.equal(Number(run.vars['Stage.score']), 1);
    assert.ok(run.said.includes('Hello from Scratchpiler!'));
});

test('cli: missing variable shows caret snippet, fuzzy suggestion, list hint, and other-sprite hint', async (t) => {
    const dir = mkTempDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    await execCli(['init', '.'], dir);

    // Add a stage list `inventory` and a local variable `secret` on Stage/Sprite2 via a custom project.json
    const zip = await JSZip.loadAsync(fs.readFileSync(path.join(dir, 'base.sb3')));
    const pj = JSON.parse(await zip.file('project.json').async('string'));
    pj.targets[0].lists.list_inv = ['inventory', []];
    const sprite2 = structuredClone(pj.targets[1]);
    sprite2.name = 'Enemy';
    sprite2.variables.var_secret = ['enemyHp', 50];
    pj.targets.push(sprite2);
    zip.file('project.json', JSON.stringify(pj));
    fs.writeFileSync(path.join(dir, 'base.sb3'), await zip.generateAsync({ type: 'nodebuffer' }));
    fs.writeFileSync(path.join(dir, 'Enemy.sdsl'), 'on flag {\n    set [enemyHp] to 50\n}\n');

    fs.writeFileSync(path.join(dir, 'Sprite1.sdsl'), [
        'on flag {',
        '    set [scroe] to 10',
        '    set [inventory] to 1',
        '    set [enemyHp] to 0',
        '}',
        '',
    ].join('\n'));

    const res = await execCli(['check', '--no-color'], dir);
    assert.equal(res.code, 1);
    // Fuzzy suggestion for scroe -> score
    assert.match(res.stderr, /error\[E0101\]/);
    assert.match(res.stderr, /Sprite1\.sdsl:2:/);
    assert.match(res.stderr, /\^+/);
    assert.match(res.stderr, /did you mean `\[score\]`/);
    // List vs scalar hint for inventory
    assert.match(res.stderr, /`\[inventory\]` is a list \(Stage\), not a scalar variable/);
    // Other-sprite local hint for enemyHp
    assert.match(res.stderr, /sprite-local variable on "Enemy"/);
    assert.match(res.stderr, /attributeOf\("enemyHp", "Enemy"\)/);
});

test('cli: missing header, header error origin trace, unclosed brace, arity span, and unknown bare var', async (t) => {
    const dir = mkTempDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    await execCli(['init', '.'], dir);

    // 1. Missing header with fuzzy suggestion (no browser "Headers panel" message)
    fs.writeFileSync(path.join(dir, 'Sprite1.sdsl'), '#include <utlis.h>\non flag {\n    say("hi")\n}\n');
    const res1 = await execCli(['check', '--no-color'], dir);
    assert.equal(res1.code, 1);
    assert.match(res1.stderr, /error\[E0201\]: Header not found: `<utlis\.h>`/);
    assert.match(res1.stderr, /did you mean `#include <utils\.h>`/);
    assert.match(res1.stderr, /searched in:/);
    assert.ok(!res1.stderr.includes('Headers panel'));

    // 1b. Bare variable name without brackets suggests [score]
    fs.writeFileSync(path.join(dir, 'Sprite1.sdsl'), 'on flag {\n    say(score)\n}\n');
    const resBare = await execCli(['check', '--no-color'], dir);
    assert.match(resBare.stderr, /write `\[score\]` instead of `score`/);

    // 2. Error inside included header points to headers/utils.h + secondary span on #include
    fs.writeFileSync(path.join(dir, 'headers/utils.h'), 'define addOne(x) returns {\n    return [missingInHdr]\n}\n');
    fs.writeFileSync(path.join(dir, 'Sprite1.sdsl'), '#include <utils.h>\non flag {\n    set [score] to addOne(1)\n}\n');
    const res2 = await execCli(['check', '--no-color'], dir);
    assert.equal(res2.code, 1);
    assert.match(res2.stderr, /--> headers\/utils\.h:2:/);
    assert.match(res2.stderr, /::: Sprite1\.sdsl:1:1/);
    assert.match(res2.stderr, /included from Sprite1/);

    // 3. Unclosed brace points to opening `{`
    fs.writeFileSync(path.join(dir, 'headers/utils.h'), 'define addOne(x) returns {\n    return x + 1\n}\n');
    fs.writeFileSync(path.join(dir, 'Sprite1.sdsl'), [
        'on flag {',
        '    if [score] = 0 {',
        '        move(5)',
        '}',
        '',
    ].join('\n'));
    const res3 = await execCli(['check', '--no-color'], dir);
    assert.equal(res3.code, 1);
    assert.match(res3.stderr, /unclosed `\{` opened here/);

    // 4. Arity mismatch points to define line
    fs.writeFileSync(path.join(dir, 'Sprite1.sdsl'), [
        'define greet(a, b) {',
        '    say(a)',
        '}',
        'on flag {',
        '    greet("hi")',
        '}',
        '',
    ].join('\n'));
    const res4 = await execCli(['check', '--no-color'], dir);
    assert.match(res4.stderr, /`greet` takes 2 arguments, got 1/);
    assert.match(res4.stderr, /`greet` defined here with 2 parameters/);
});

test('cli: cross-sprite warnings, compact/json formats, and --deny-warnings', async (t) => {
    const dir = mkTempDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    await execCli(['init', '.'], dir);

    fs.writeFileSync(path.join(dir, 'Stage.sdsl'), 'on receive "gameStart" {\n    set [score] to 1\n}\n');
    fs.writeFileSync(path.join(dir, 'Sprite1.sdsl'), 'on flag {\n    broadcast("gameStrat")\n}\n');

    const denyRes = await execCli(['check', '--deny-warnings', '--no-color'], dir);
    assert.equal(denyRes.code, 1);
    assert.match(denyRes.stderr, /warning\[W0301\]: Nothing receives "gameStrat"/);
    assert.match(denyRes.stderr, /did you mean "gameStart"/);

    const jsonRes = await execCli(['check', '--format', 'json'], dir);
    assert.equal(jsonRes.code, 0);
    const parsed = JSON.parse(jsonRes.stdout);
    assert.equal(parsed.ok, true);
    assert.ok(parsed.warnings >= 1);
    assert.ok(parsed.diagnostics.some((d) => d.code === 'W0301'));

    const compactRes = await execCli(['check', '--format', 'compact'], dir);
    assert.match(compactRes.stderr, /^Sprite1\.sdsl:2:\d+: warning\[W0301\]: Nothing receives "gameStrat"/m);
});

test('cli: workspace errors (bad scratchpiler.json, multiple sb3s, unknown command/flag)', async (t) => {
    const dir = mkTempDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

    // Bad JSON in scratchpiler.json
    fs.writeFileSync(path.join(dir, 'scratchpiler.json'), '{\n  "project": "base.sb3",\n  bad\n}\n');
    const badJson = await execCli(['check', '--no-color'], dir);
    assert.equal(badJson.code, 1);
    assert.match(badJson.stderr, /error\[E0402\].*scratchpiler\.json/);
    assert.match(badJson.stderr, /--> scratchpiler\.json:/);

    // Ambiguous multiple .sb3 files
    fs.rmSync(path.join(dir, 'scratchpiler.json'));
    fs.writeFileSync(path.join(dir, 'one.sb3'), 'a');
    fs.writeFileSync(path.join(dir, 'two.sb3'), 'b');
    const multiSb3 = await execCli(['check', '--no-color'], dir);
    assert.equal(multiSb3.code, 1);
    assert.match(multiSb3.stderr, /error\[E0403\]: Multiple \.sb3 files found/);
    assert.match(multiSb3.stderr, /one\.sb3, two\.sb3/);

    // Unknown command and unknown flag suggestions
    const badCmd = await execCli(['buidl'], dir);
    assert.equal(badCmd.code, 1);
    assert.match(badCmd.stderr, /error\[E0410\]: Unknown command `buidl`/);
    assert.match(badCmd.stderr, /did you mean `scratchpiler build`/);

    const badFlag = await execCli(['check', '--formta', 'json'], dir);
    assert.equal(badFlag.code, 1);
    assert.match(badFlag.stderr, /error\[E0411\]: Unknown option `--formta`/);
    assert.match(badFlag.stderr, /did you mean `--format`/);
});

test('cli: unpack -> edit -> build preserves special sprite names and assets', async (t) => {
    const srcDir = mkTempDir();
    const unpackedDir = mkTempDir();
    t.after(() => {
        fs.rmSync(srcDir, { recursive: true, force: true });
        fs.rmSync(unpackedDir, { recursive: true, force: true });
    });

    await execCli(['init', '.'], srcDir);
    const zip = await JSZip.loadAsync(fs.readFileSync(path.join(srcDir, 'base.sb3')));
    const pj = JSON.parse(await zip.file('project.json').async('string'));
    pj.targets[1].name = 'Bot:1/2';
    zip.file('project.json', JSON.stringify(pj));
    const specialSb3 = path.join(srcDir, 'special.sb3');
    fs.writeFileSync(specialSb3, await zip.generateAsync({ type: 'nodebuffer' }));

    const unpackRes = await execCli(['unpack', specialSb3, unpackedDir], srcDir);
    assert.equal(unpackRes.code, 0, unpackRes.stderr);
    const encodedFile = path.join(unpackedDir, 'Bot%3A1%2F2.sdsl');
    assert.ok(fs.existsSync(encodedFile));

    // Refuses overwrite without --force
    const unpackAgain = await execCli(['unpack', specialSb3, unpackedDir], srcDir);
    assert.equal(unpackAgain.code, 1);
    assert.match(unpackAgain.stderr, /error\[E0413\]/);

    fs.writeFileSync(encodedFile, 'on flag {\n    set [score] to 42\n}\n');
    const buildRes = await execCli(['build', unpackedDir, '-o', path.join(unpackedDir, 'out.sb3')], srcDir);
    assert.equal(buildRes.code, 0, buildRes.stderr);

    const run = await runBuiltSb3(path.join(unpackedDir, 'out.sb3'), 5);
    assert.equal(Number(run.vars['Stage.score']), 42);
    const bot = run.vm.runtime.targets.find((tgt) => !tgt.isStage && tgt.sprite.name === 'Bot:1/2');
    assert.ok(bot);
    assert.equal(bot.sprite.costumes.length, 1);
});

test('cli: fmt --check, fmt, and info --json', async (t) => {
    const dir = mkTempDir();
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    await execCli(['init', '.'], dir);

    const messy = 'on flag {\nset [score] to 9\n}\n';
    fs.writeFileSync(path.join(dir, 'Stage.sdsl'), messy);

    const fmtCheckFail = await execCli(['fmt', '--check'], dir);
    assert.equal(fmtCheckFail.code, 1);
    assert.match(fmtCheckFail.stderr, /Would reformat: Stage\.sdsl/);

    const fmtApply = await execCli(['fmt'], dir);
    assert.equal(fmtApply.code, 0);
    assert.equal(fs.readFileSync(path.join(dir, 'Stage.sdsl'), 'utf8'), 'on flag {\n    set [score] to 9\n}\n');

    const fmtCheckPass = await execCli(['fmt', '--check'], dir);
    assert.equal(fmtCheckPass.code, 0);

    const infoRes = await execCli(['info', '--json'], dir);
    assert.equal(infoRes.code, 0);
    const info = JSON.parse(infoRes.stdout);
    assert.equal(info.sprites.length, 2);
    assert.ok(info.headers.some((h) => h.name === 'utils.h'));
});

test('cli: binary entrypoint runs via node', async () => {
    const { stdout } = await execFileAsync(process.execPath, ['cli/scratchpiler.js', '--help'], {
        cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'),
    });
    assert.match(stdout, /Scratchpiler CLI/);
    assert.match(stdout, /check \[dir\]/);
});
