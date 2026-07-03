// Minimal duck-typed Scratch VM double for Node tests.
// Provides exactly the surface compiler.js / decompiler.js touch:
//   vm.runtime.targets, vm.editingTarget,
//   target.{isStage, sprite.name, variables, blocks._blocks, comments,
//           createVariable, deleteVariable}

let nextId = 0;
function vid() { return `mockvar_${nextId++}`; }

class MockTarget {
    constructor(name, isStage) {
        this.isStage = isStage;
        this.sprite = { name, costumes: [{ name: 'costume1' }], sounds: [] };
        this.variables = {};
        this.blocks = { _blocks: {} };
        this.comments = {};
    }
    createVariable(id, name, type) {
        this.variables[id] = { id, name, type: type || '', value: type === 'list' ? [] : 0 };
    }
    deleteVariable(id) { delete this.variables[id]; }
}

export function makeMockVM({ sprites = ['Sprite1'], vars = [], lists = [] } = {}) {
    const stage = new MockTarget('Stage', true);
    stage.sprite.costumes = [{ name: 'backdrop1' }];
    for (const v of vars)  stage.createVariable(vid(), v, '');
    for (const l of lists) stage.createVariable(vid(), l, 'list');
    const targets = [stage, ...sprites.map(n => new MockTarget(n, false))];
    return {
        runtime: { targets },
        editingTarget: targets[1] || stage,
        on() {},
    };
}

// Compile with auto-provisioning: when compile fails only because a
// variable/list doesn't exist in the (empty) mock project, create it on the
// stage and retry — mirrors a user who has already created their vars/lists
// in the real Scratch UI.
const MISSING_PATTERNS = [
    [/^Variable not found: ([^.\n]+)/, ''],
    [/^List not found: ([^.]+)/, 'list'],
    [/\[([^\]]+)\] is not a list or was not found/, 'list'],
    [/requires a list — \[([^\]]+)\] is not found/, 'list'],
    [/\[([^\]]+)\] is not defined/, 'list'],
];

export function provisionAndCompile(compileSource, source, vm, spriteName, maxRounds = 8) {
    const stage = vm.runtime.targets.find(t => t.isStage);
    let result;
    for (let round = 0; round < maxRounds; round++) {
        result = compileSource(source, vm, spriteName);
        if (result.errors.length === 0) return result;
        let provisioned = false;
        for (const err of result.errors) {
            for (const [re, type] of MISSING_PATTERNS) {
                const m = err.message.match(re);
                if (m) {
                    const name = m[1].trim();
                    const exists = Object.values(stage.variables).some(v => v.name === name);
                    if (!exists) { stage.createVariable(vid(), name, type); provisioned = true; }
                    break;
                }
            }
        }
        if (!provisioned) return result;
    }
    return result;
}
