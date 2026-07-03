// [L0] Project index — pure module (no browser deps) so compiler/analyzer
// can be imported in Node for tests.

export let scratchIndex = {
    sprites:         [],  // [{ name, costumes: string[], sounds: string[] }]
    stage:           { backdrops: [], sounds: [] },
    globalVariables: [],  // [{ name, id, type }]
    spriteVariables: {},  // { spriteName: [{ name, id, type }] }
    customBlocks:    {},  // { spriteName: string[] }
};

export function setScratchIndex(idx) {
    scratchIndex = idx;
}
