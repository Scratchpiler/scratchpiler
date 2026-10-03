function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const DEFAULT_FEATURES = {
    listSugar: true,
    conditionCalls: true,
    recursion: false,
    continueInFor: false,
    breakInFor: false,
    pointers: false,
};

export function generateProgram(seed, features = DEFAULT_FEATURES) {
    const rng = mulberry32(seed);
    const chance = (p) => rng() < p;
    const int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
    const pick = (items) => items[Math.floor(rng() * items.length)];
    const weighted = (options) => {
        const total = options.reduce((s, [w]) => s + w, 0);
        let r = rng() * total;
        for (const [w, make] of options) {
            r -= w;
            if (r <= 0) return make();
        }
        return options.at(-1)[1]();
    };

    const VARS = ['a', 'b', 'c'];
    const STRINGS = ['"x"', '"ab"', '""', '"7"', '"Hi"'];
    let budget = 28;
    let fresh = 0;
    const returning = [];
    const recursive = new Set();
    const plain = [];
    const callExpr = (name, arg) => (recursive.has(name) ? `${name}((${arg}) mod 5)` : `${name}(${arg})`);

    function num(d, ctx) {
        if (d <= 0 || chance(0.3)) {
            return weighted([
                [4, () => String(int(-3, 9))],
                [1, () => `${int(0, 9)}.${int(1, 9)}`],
                [5, () => `[${pick(ctx.reads)}]`],
                [ctx.param ? 3 : 0, () => ctx.param],
                [1, () => '[L].length()'],
                [1, () => `[L].item(${int(1, 4)})`],
                [features.listSugar ? 1 : 0, () => `[L].indexOf(${pick(STRINGS)})`],
                [features.pointers ? 2 : 0, () => '*[p]'],
                [features.pointers ? 1 : 0, () => `[q][${int(0, 2)}]`],
            ]);
        }
        return weighted([
            [3, () => `(${num(d - 1, ctx)} ${pick(['+', '-', '*'])} ${num(d - 1, ctx)})`],
            [1, () => `(${num(d - 1, ctx)} mod ${int(1, 5)})`],
            [1, () => `round(${num(d - 1, ctx)} / ${int(1, 4)})`],
            [1, () => `abs(${num(d - 1, ctx)})`],
            [1, () => `(${cond(d - 1, ctx)} ? ${num(d - 1, ctx)} : ${num(d - 1, ctx)})`],
            [ctx.callable.length ? 3 : 0, () => callExpr(pick(ctx.callable), num(d - 1, ctx))],
        ]);
    }

    function str(d, ctx) {
        if (d <= 0 || chance(0.4)) return pick(STRINGS);
        return weighted([
            [3, () => `join(${val(d - 1, ctx)}, ${val(d - 1, ctx)})`],
            [1, () => `letterOf(${int(0, 3)}, ${str(d - 1, ctx)})`],
        ]);
    }

    const val = (d, ctx) => (chance(0.7) ? num(d, ctx) : str(d, ctx));

    function cond(d, ctx) {
        if (d <= 0 || chance(0.5)) {
            return weighted([
                [5, () => `${num(d - 1, ctx)} ${pick(['<', '>', '=', '!=', '<=', '>='])} ${num(d - 1, ctx)}`],
                [1, () => `[L].contains(${val(d - 1, ctx)})`],
                [1, () => `contains(${str(d - 1, ctx)}, "a")`],
            ]);
        }
        return weighted([
            [2, () => `(${cond(d - 1, ctx)}) ${pick(['and', 'or'])} (${cond(d - 1, ctx)})`],
            [1, () => `not (${cond(d - 1, ctx)})`],
        ]);
    }

    const indent = (lines) => lines.map((l) => `    ${l}`);
    const block = (head, body) => [`${head} {`, ...indent(body.length ? body : ['wait(0)']), '}'];

    function stmts(d, ctx, count) {
        const out = [];
        for (let i = 0; i < count && budget > 0; i++) out.push(...stmt(d, ctx));
        return out;
    }

    function exitLine(ctx) {
        const allowed = [];
        if (ctx.loop && (ctx.loop !== 'for' || features.breakInFor)) allowed.push('break');
        if (ctx.loop && (ctx.loop !== 'for' || features.continueInFor)) allowed.push('continue');
        return allowed.length ? block(`if ${cond(1, ctx)}`, [pick(allowed)]) : [];
    }

    function stmt(d, ctx) {
        budget--;
        const v = pick(VARS);
        const simple = [
            [4, () => [`set [${v}] to ${val(2, ctx)}`]],
            [3, () => [`change [${v}] by ${num(2, ctx)}`]],
            [3, () => [`say(${val(2, ctx)})`]],
            [ctx.fixedList ? 0 : 1, () => [`listAdd(${val(1, ctx)}, [L])`]],
            [1, () => [`listDelete(${num(1, ctx)}, [L])`]],
            [ctx.fixedList ? 0 : 1, () => [`listInsert(${val(1, ctx)}, ${int(1, 3)}, [L])`]],
            [1, () => [`listReplace(${int(1, 3)}, [L], ${val(1, ctx)})`]],
            [ctx.plain.length && !ctx.fixedList ? 1 : 0, () => [`${pick(ctx.plain)}(${num(1, ctx)})`]],
            [features.listSugar ? 1 : 0, () => [`[L].sort(${chance(0.5) ? '"desc"' : ''})`]],
            [features.listSugar ? 1 : 0, () => [`set [${v}] to [L].${pick(['sum()', 'min()', 'max()', `count(${val(0, ctx)})`])}`]],
            [features.listSugar && !ctx.fixedList ? 1 : 0, () => [`populateList([L], ${val(1, ctx)}, ${int(0, 3)}, ${pick(['true', 'false', cond(0, ctx)])})`]],
            [ctx.loop ? 2 : 0, () => exitLine(ctx)],
            [features.pointers ? 2 : 0, () => [`set [p] to &[${v}]`]],
            [features.pointers ? 2 : 0, () => [`set *[p] to ${val(1, ctx)}`]],
            [features.pointers ? 2 : 0, () => {
                const size = int(1, 3);
                const lines = [`set [q] to alloc(${size})`, `set *([q] + ${int(0, size - 1)}) to ${val(1, ctx)}`, `say(*([q] + ${int(0, size - 1)}))`];
                return chance(0.6) ? [...lines, 'free([q])'] : lines;
            }],
        ];
        if (d <= 0) return weighted(simple);
        const nest = (extra) => ({ ...ctx, ...extra });
        return weighted([
            ...simple,
            [3, () => {
                const body = stmts(d - 1, ctx, int(1, 3));
                return chance(0.5)
                    ? block(`if ${cond(2, ctx)}`, body)
                    : [...block(`if ${cond(2, ctx)}`, body).slice(0, -1), '} else {', ...indent(stmts(d - 1, ctx, int(1, 2))), '}'];
            }],
            [2, () => block(`repeat ${int(0, 3)}`, stmts(d - 1, nest({ loop: 'repeat' }), int(1, 3)))],
            [2, () => {
                const i = `i${fresh++}`;
                const inner = nest({ loop: 'for', reads: [...ctx.reads, i] });
                return block(`for [${i}] from ${int(0, 2)} to ${int(1, 4)}`, stmts(d - 1, inner, int(1, 3)));
            }],
            [2, () => {
                const g = `g${fresh++}`;
                const inner = nest({ loop: 'while' });
                const guard = features.conditionCalls && chance(0.4) ? `(([${g}] < ${int(1, 3)}) and (${cond(1, ctx)}))` : `([${g}] < ${int(1, 3)})`;
                return [`set [${g}] to 0`, ...block(`while ${guard}`, [`change [${g}] by 1`, ...stmts(d - 1, inner, int(1, 2))])];
            }],
            [features.listSugar ? 1 : 0, () => {
                const it = `it${fresh++}`;
                const inner = nest({ loop: 'for', reads: [...ctx.reads, it], fixedList: true });
                return block(`pyfor [${it}] in [L]`, stmts(d - 1, inner, int(1, 2)));
            }],
            [1, () => {
                const g = `g${fresh++}`;
                const inner = nest({ loop: 'do' });
                return [`set [${g}] to 0`, ...block('do', [`change [${g}] by 1`, ...stmts(d - 1, inner, int(1, 2))]).slice(0, -1), `} while ([${g}] < ${int(1, 3)})`];
            }],
            [1, () => {
                const cases = [];
                const values = [...new Set([int(-1, 4), int(-1, 4), int(-1, 4)])];
                for (const value of values.slice(0, int(1, values.length))) cases.push(...block(`case ${value}`, stmts(d - 1, ctx, 1)));
                if (chance(0.6)) cases.push(...block('default', stmts(d - 1, ctx, 1)));
                return block(`match [${v}]`, cases);
            }],
        ]);
    }

    const lines = [];
    const procCount = int(0, 2);
    for (let k = 0; k < procCount; k++) {
        const name = `f${k}`;
        const ctx = { reads: VARS, param: 'x', callable: [...returning], plain: [], loop: null };
        const body = [];
        if (features.recursion && chance(0.6)) {
            const self = [`${name}(x - 1)`, ...(chance(0.5) ? [`${name}(x - 2)`] : [])];
            body.push(...block('if x < 1', [`return ${num(1, ctx)}`]));
            body.push(`return (${self.join(` ${pick(['+', '-', '*'])} `)}) ${pick(['+', '-'])} ${num(1, ctx)}`);
            recursive.add(name);
        } else {
            if (chance(0.5)) body.push(...block(`if ${cond(1, ctx)}`, [`return ${num(1, ctx)}`]));
            body.push(`return ${num(2, ctx)}`);
        }
        lines.push(...block(`define ${name}(x) returns`, body), '');
        returning.push(name);
    }
    if (chance(0.5)) {
        const ctx = { reads: VARS, param: 'x', callable: [...returning], plain: [], loop: null };
        budget -= 4;
        lines.push(...block('define p0(x)', stmts(1, ctx, int(1, 3))), '');
        plain.push('p0');
    }

    const ctx = { reads: VARS, param: null, callable: [...returning], plain: [...plain], loop: null };
    const main = ['set [a] to 3', 'set [b] to 5', 'set [c] to 0', 'listDeleteAll([L])', ...stmts(3, ctx, 12), 'say(join([a], join(" ", join([b], join(" ", [c])))))'];
    lines.push(...block('on flag', main));
    return `${lines.join('\n')}\n`;
}
