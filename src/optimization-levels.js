export const OPTIMIZATION_LEVELS = Object.freeze([
    { level: 0, name: 'Off', pipeline: 'legalize', summary: 'No optimization. The blocks follow your source as written.' },
    { level: 1, name: 'Standard', pipeline: 'O1', summary: 'Inline small custom blocks, fold constants, unroll small constant loops, drop dead stores.' },
    { level: 2, name: 'Aggressive', pipeline: 'O2', summary: 'Also turn early returns, stops and continues into if/else, move leading breaks into the loop condition, and drop needless nots.' },
    { level: 3, name: 'Maximum', pipeline: 'O3', summary: 'Also rotate loops in warp blocks and rewrite if-not guards as empty-then ifs. Fewest blocks, but Pull shows the least familiar shapes.' },
]);

export const DEFAULT_OPTIMIZATION_LEVEL = 1;

export const MAX_OPTIMIZATION_LEVEL = OPTIMIZATION_LEVELS.length - 1;

export function optimizationLevel(value) {
    if (value === true || value === undefined || value === null) return DEFAULT_OPTIMIZATION_LEVEL;
    if (value === false) return 0;
    const level = Math.round(Number(value));
    return Number.isFinite(level) ? Math.min(MAX_OPTIMIZATION_LEVEL, Math.max(0, level)) : DEFAULT_OPTIMIZATION_LEVEL;
}

export const pipelineFor = (level) => [OPTIMIZATION_LEVELS[optimizationLevel(level)].pipeline];
