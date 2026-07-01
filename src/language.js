import { LANG_ID, KEYWORDS } from "./constants.js";
import { scratchIndex } from "./vm.js";
import { currentVM, currentSpriteContext } from "./editor.js";
import { formatSource } from "./injector.js";
import { tokenize } from "./compiler.js";
import { ASM_OPCODES } from "./asm-opcodes.js";

export function registerLanguage(monaco) {
    monaco.languages.register({ id: LANG_ID });

    monaco.editor.defineTheme('scratchpiler-dark', {
        base: 'vs-dark', inherit: true,
        rules: [
            { token: 'mathfunc', foreground: '#4ec994' },
        ],
        colors: {
            'editor.background':                 '#002451',
            'editor.lineHighlightBackground':    '#00346e80',
            'editorLineNumber.foreground':       '#3d6090',
            'editorLineNumber.activeForeground': '#7285b7',
            'editor.selectionBackground':        '#003f8e',
            'editorCursor.foreground':           '#ff8c00',
            'editor.findMatchBackground':        '#ff8c004d',
        },
    });

    monaco.languages.setMonarchTokensProvider(LANG_ID, {
        keywords: KEYWORDS,
        mathfuncs: [
            'abs','sqrt','floor','ceiling','ceil','round',
            'sin','cos','tan','asin','acos','atan',
            'ln','log','exp','pow10','random','clamp',
            'join','letterOf','contains',
            'distanceTo','xOf','yOf','directionOf',
            'costumeNumOf','costumeNameOf','sizeOf','volumeOf',
        ],
        tokenizer: {
            root: [
                [/\/\/.*$/, 'comment'],
                [/\b__asm__\b/, { token: 'keyword', next: '@asmHeader' }],
                [/"[^"]*"/, 'string'],
                [/\[[^\]]+\]/, 'variable'],
                [/#[0-9a-fA-F]{6}/, 'number'],
                [/[0-9]+(\.[0-9]+)?/, 'number'],
                [/[a-zA-Z_][\w]*/, {
                    cases: {
                        '@keywords':  'keyword',
                        '@mathfuncs': 'mathfunc',
                        '@default':   'identifier',
                    }
                }],
                [/[{}()[\],:]/, 'delimiter'],
                [/[+\-*\/<>=]/, 'operator'],
            ],
            // __asm__ [volatile] [unsafe] ( ... ) — consumes the header keywords up to the opening '('
            asmHeader: [
                [/\s+/, ''],
                [/\bvolatile\b/, 'keyword'],
                [/\bunsafe\b/, 'keyword'],
                [/\(/, { token: 'delimiter.parenthesis', next: '@asmBody' }],
                ['', { token: '', next: '@pop' }],
            ],
            // Top level of the asm block: sees opcode names, ';', and the outer ')'
            asmBody: [
                [/\/\/.*$/, 'comment'],
                [/\s+/, ''],
                [/;/, 'delimiter'],
                [/\)/, { token: 'delimiter.parenthesis', next: '@pop' }],
                [/[a-zA-Z_][\w]*(?=\s*\()/, 'type.identifier'],
                [/\(/, { token: 'delimiter.parenthesis', next: '@asmArgs' }],
            ],
            // Inside a single opcode call's parens: literals + bare registers
            asmArgs: [
                [/\s+/, ''],
                [/\)/, { token: 'delimiter.parenthesis', next: '@pop' }],
                [/\(/, { token: 'delimiter.parenthesis', next: '@push' }],
                [/"[^"]*"/, 'string'],
                [/[0-9]+(\.[0-9]+)?/, 'number'],
                [/\btrue\b|\bfalse\b/, 'keyword'],
                [/,/, 'delimiter'],
                [/\[[^\]]+\]/, 'variable'],
                [/[a-zA-Z_][\w]*/, 'variable'],
            ],
        },
    });

    monaco.languages.registerCompletionItemProvider(LANG_ID, {
        triggerCharacters: ['"', '(', '[', '.'],
        provideCompletionItems(model, position) {
            const word  = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber:   position.lineNumber,
                startColumn:     word.startColumn,
                endColumn:       word.endColumn,
            };
            const linePrefix = model.getLineContent(position.lineNumber).substring(0, word.startColumn - 1);

            // Struct field completions inside [name. (unclosed bracket before dot)
            if (linePrefix.endsWith('.') && /\[([^\].]+)\.$/.test(linePrefix)) {
                const match = linePrefix.match(/\[([^\].]+)\.$/);
                const prefix = match ? match[1] : '';
                if (prefix) {
                    const src = model.getValue();
                    const structDefs = {};
                    const structRe = /\bstruct\s+(\w+)\s*\{([^}]*)\}/g;
                    let sm;
                    while ((sm = structRe.exec(src)) !== null) {
                        const fields = sm[2].split(/[\s,]+/).filter(f => f.length > 0);
                        structDefs[sm[1]] = fields;
                    }
                    const fields = structDefs[prefix];
                    if (fields && fields.length > 0) {
                        const CIKf = monaco.languages.CompletionItemKind;
                        return {
                            suggestions: fields.map(f => ({
                                label: `${prefix}.${f}]`,
                                kind: CIKf.Field,
                                detail: `Struct field · ${prefix}`,
                                insertText: f + ']',
                                range,
                            }))
                        };
                    }
                }
            }

            // Struct completions: inside an unclosed [ with no dot yet.
            // Typing `[p` shows `player.x]`, `player.y]`, etc. — one-shot fill.
            if (linePrefix.endsWith('[')) {
                const src = model.getValue();
                const structDefs = {};
                const structRe = /\bstruct\s+(\w+)\s*\{([^}]*)\}/g;
                let sm2;
                while ((sm2 = structRe.exec(src)) !== null) {
                    structDefs[sm2[1]] = sm2[2].split(/[\s,]+/).filter(f => f.length > 0);
                }
                const entries = Object.entries(structDefs);
                if (entries.length > 0) {
                    const CIKf = monaco.languages.CompletionItemKind;
                    const suggestions = [];
                    for (const [sName, fields] of entries) {
                        for (const field of fields) {
                            suggestions.push({
                                label: `${sName}.${field}]`,
                                kind: CIKf.Field,
                                detail: `Struct field · ${sName}`,
                                insertText: `${sName}.${field}]`,
                                sortText: `0_${sName}_${field}`,
                                range,
                            });
                        }
                    }
                    return { suggestions };
                }
            }

            // Dot-method completions after [varname].
            if (linePrefix.endsWith('.') && /\[[^\]]+\]\.$/.test(linePrefix)) {
                const dotRange = { ...range, startColumn: word.startColumn };
                const CIKd = monaco.languages.CompletionItemKind;
                const DOT_METHODS = [
                    { label: 'length()',  insertText: 'length()',  detail: 'String / list length' },
                    { label: 'len()',     insertText: 'len()',     detail: 'String / list length (alias)' },
                    { label: 'contains(item)', insertText: 'contains(${1:item})', detail: 'List · data_listcontainsitem' },
                    { label: 'item(index)',    insertText: 'item(${1:index})',    detail: 'List · data_itemoflist' },
                    { label: 'indexOf(item)',  insertText: 'indexOf(${1:item})',  detail: 'List · data_itemnumoflist' },
                    { label: 'sort()',         insertText: 'sort()',              detail: 'List · sort ascending (Shell sort)' },
                    { label: 'sort("desc")',   insertText: 'sort("desc")',        detail: 'List · sort descending (Shell sort)' },
                ];
                return {
                    suggestions: DOT_METHODS.map(m => ({
                        label: m.label, kind: CIKd.Method, detail: m.detail,
                        insertText: m.insertText,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range: dotRange,
                    })),
                };
            }

            // context aware completions (strings)
            // Detect if cursor is inside an unclosed string literal and
            // return only the appropriate completions for that argument slot.
            const fullPrefix = model.getLineContent(position.lineNumber)
                .substring(0, position.column - 1);
            let inStr = false, quoteStart = -1;
            for (let i = 0; i < fullPrefix.length; i++) {
                if (fullPrefix[i] === '"') { inStr = !inStr; if (inStr) quoteStart = i; }
            }
            if (inStr && quoteStart !== -1) {
                const beforeQuote = fullPrefix.substring(0, quoteStart).trimEnd();
                const CIKs = monaco.languages.CompletionItemKind;
                const IS   = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;

                // Range covers everything inside the string (from after " to closing " or cursor)
                const lineContent = model.getLineContent(position.lineNumber);
                const afterCursor = lineContent.substring(position.column - 1);
                const closingQ    = afterCursor.indexOf('"');
                const strRange = {
                    startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
                    startColumn: quoteStart + 2,
                    endColumn:   closingQ >= 0 ? position.column + closingQ : position.column,
                };

                function strItems(vals, kind, detail) {
                    return vals.map(v => ({
                        label: v, kind: kind ?? CIKs.Value, detail: detail ?? '',
                        insertText: v, range: strRange,
                    }));
                }

                // Helper: get broadcast names from the VM stage
                function getBroadcasts() {
                    if (!currentVM) return [];
                    const stage = currentVM.runtime.targets.find(t => t.isStage);
                    if (!stage) return [];
                    return Object.values(stage.variables)
                        .filter(v => v.type === 'broadcast_msg')
                        .map(v => v.name);
                }

                // Helper: get sounds for active sprite/stage
                function getActiveSounds() {
                    if (!currentVM) return [];
                    const sn = getActiveSpriteNameFromDropdown();
                    const target = sn === '__stage__'
                        ? currentVM.runtime.targets.find(t => t.isStage)
                        : currentVM.runtime.targets.find(t => t.sprite?.name === sn);
                    return target ? target.sprite.sounds.map(s => s.name) : [];
                }

                // Helper: get costumes for active sprite/stage
                function getActiveCostumes() {
                    if (!currentVM) return [];
                    const sn = getActiveSpriteNameFromDropdown();
                    const target = sn === '__stage__'
                        ? currentVM.runtime.targets.find(t => t.isStage)
                        : currentVM.runtime.targets.find(t => t.sprite?.name === sn);
                    return target ? target.sprite.costumes.map(c => c.name) : [];
                }

                const KEY_NAMES = [
                    'space','enter','up arrow','down arrow','left arrow','right arrow',
                    'a','b','c','d','e','f','g','h','i','j','k','l','m',
                    'n','o','p','q','r','s','t','u','v','w','x','y','z',
                    '0','1','2','3','4','5','6','7','8','9',
                ];
                const SPRITE_TARGETS = ['_mouse_', '_random_',
                    ...scratchIndex.sprites.map(s => s.name)];
                const TOUCH_TARGETS  = ['_edge_', '_mouse_',
                    ...scratchIndex.sprites.map(s => s.name)];
                const BACKDROPS = scratchIndex.stage.backdrops || [];
                const EFFECTS   = ['color','fisheye','whirl','pixelate','mosaic','brightness','ghost'];
                const ROT_STYLES = ["all around", "left-right", "don't rotate"];
                const TIME_UNITS = ['year','month','date','day','hour','minute','second'];

                // Match the context before the opening quote
                if (/\bon\s+receive\s*$/.test(beforeQuote)) {
                    return { suggestions: strItems(getBroadcasts(), CIKs.Event, 'Broadcast message') };
                }
                if (/\bon\s+backdrop\s*$/.test(beforeQuote)) {
                    return { suggestions: strItems(BACKDROPS, CIKs.File, 'Backdrop') };
                }
                if (/\bon\s+key\s*$/.test(beforeQuote)) {
                    return { suggestions: strItems(KEY_NAMES, CIKs.Enum, 'Key name') };
                }
                if (/\bswitchCostume\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(getActiveCostumes(), CIKs.Color, 'Costume') };
                }
                if (/\b(?:switchBackdrop|switchBackdropAndWait)\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(BACKDROPS, CIKs.File, 'Backdrop') };
                }
                if (/\b(?:play|playUntilDone)\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(getActiveSounds(), CIKs.Event, 'Sound') };
                }
                if (/\b(?:broadcast|broadcastAndWait|send|sendAndWait)\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(getBroadcasts(), CIKs.Event, 'Broadcast message') };
                }
                if (/\b(?:goTo|pointTowards|glide\s*\([^)]*,\s*)\s*$/.test(beforeQuote) ||
                    /\bglide\s*\([^,]+,\s*$/.test(beforeQuote)) {
                    return { suggestions: strItems(SPRITE_TARGETS, CIKs.Class, 'Sprite / target') };
                }
                if (/\btouching\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(TOUCH_TARGETS, CIKs.Class, 'Sprite / edge / mouse') };
                }
                if (/\b(?:distanceTo|xOf|yOf|directionOf|sizeOf|costumeNumOf|costumeNameOf|volumeOf|pointTowards)\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(SPRITE_TARGETS, CIKs.Class, 'Sprite / target') };
                }
                if (/\bkey\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(KEY_NAMES, CIKs.Enum, 'Key name') };
                }
                if (/\b(?:setEffect|changeEffect)\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(EFFECTS, CIKs.Enum, 'Visual effect') };
                }
                if (/\b(?:setSoundEffect|changeSoundEffect)\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(['PITCH', 'PAN LEFT/RIGHT'], CIKs.Enum, 'Sound effect') };
                }
                if (/\bsetRotationStyle\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(ROT_STYLES, CIKs.Enum, 'Rotation style') };
                }
                if (/\bsetDragMode\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(['draggable', 'not draggable'], CIKs.Enum, 'Drag mode') };
                }
                if (/\bcurrentTime\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(TIME_UNITS, CIKs.Enum, 'Time unit') };
                }
                if (/\b(?:createClone)\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(['_myself_', ...scratchIndex.sprites.map(s => s.name)], CIKs.Class, 'Sprite / self') };
                }
                if (/\b(?:sort)\s*\($/.test(beforeQuote)) {
                    return { suggestions: strItems(['desc'], CIKs.Enum, 'Sort direction') };
                }
                // Inside a string but no specific context — suppress generic completions
                return { suggestions: [] };
            }

            // __asm__ volatile(...) context: opcode names at the top level, registers inside a call
            const asmCtx = detectAsmContext(model, position);
            if (asmCtx) {
                const CIKa = monaco.languages.CompletionItemKind;
                if (asmCtx.kind === 'opcode') {
                    return {
                        suggestions: Object.keys(ASM_OPCODES).map(op => ({
                            label: op, kind: CIKa.Function,
                            detail: `__asm__ opcode · ${ASM_OPCODES[op].params.map(p => p.name).join(', ')}`,
                            insertText: `${op}($0)`,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                            range,
                        })),
                    };
                }
                return { suggestions: collectRegistersInScope(model, position).map(r => ({
                    label: r.name, kind: CIKa.Variable, detail: r.source, insertText: r.name, range,
                })) };
            }

            // Hat-block range fix: extend backwards to cover "on " prefix
            const onMatch = linePrefix.match(/\bon\s+$/);
            const hatRange = onMatch
                ? { ...range, startColumn: word.startColumn - onMatch[0].length }
                : range;
            return { suggestions: buildSuggestions(monaco, range, hatRange) };
        },
    });

    // Signature / syntax guide shown while filling in arguments
    const SIG_DB = {
        // keyword constructs (detected by looking behind cursor)
        'if':           { label: 'if <condition> { … }',            params: [{ label: '<condition>', documentation: 'A boolean expression' }] },
        'while':        { label: 'while (<condition>) { … }',       params: [{ label: '<condition>', documentation: 'Loop while true' }] },
        'repeat until': { label: 'repeat until (<condition>) { … }',params: [{ label: '<condition>', documentation: 'Loop until true' }] },
        'repeat':       { label: 'repeat <count> { … }',            params: [{ label: '<count>',     documentation: 'Number of iterations' }] },
        'for':          { label: 'for [var] from <start> to <end> { … }', params: [{ label: '[var]' }, { label: '<start>' }, { label: '<end>' }] },
        'wait until':   { label: 'wait until <condition>',          params: [{ label: '<condition>' }] },
        // function calls
        'move':             { label: 'move(steps)',               params: [{ label: 'steps' }] },
        'turnRight':        { label: 'turnRight(degrees)',         params: [{ label: 'degrees' }] },
        'turnLeft':         { label: 'turnLeft(degrees)',          params: [{ label: 'degrees' }] },
        'goTo':             { label: 'goTo(x, y)  |  goTo("sprite")', params: [{ label: 'x  or  "sprite"' }, { label: 'y' }] },
        'glide':            { label: 'glide(secs, x, y)',          params: [{ label: 'secs' }, { label: 'x' }, { label: 'y' }] },
        'setX':             { label: 'setX(x)',                    params: [{ label: 'x' }] },
        'setY':             { label: 'setY(y)',                    params: [{ label: 'y' }] },
        'changeX':          { label: 'changeX(dx)',                params: [{ label: 'dx' }] },
        'changeY':          { label: 'changeY(dy)',                params: [{ label: 'dy' }] },
        'say':              { label: 'say(message)',               params: [{ label: 'message' }] },
        'sayFor':           { label: 'sayFor(message, secs)',      params: [{ label: 'message' }, { label: 'secs' }] },
        'think':            { label: 'think(message)',             params: [{ label: 'message' }] },
        'thinkFor':         { label: 'thinkFor(message, secs)',    params: [{ label: 'message' }, { label: 'secs' }] },
        'switchCostume':    { label: 'switchCostume("name")',      params: [{ label: '"name"' }] },
        'switchBackdrop':   { label: 'switchBackdrop("name")',     params: [{ label: '"name"' }] },
        'setSize':          { label: 'setSize(percent)',           params: [{ label: 'percent' }] },
        'changeSize':       { label: 'changeSize(amount)',         params: [{ label: 'amount' }] },
        'play':             { label: 'play("sound")',              params: [{ label: '"sound"' }] },
        'playUntilDone':    { label: 'playUntilDone("sound")',     params: [{ label: '"sound"' }] },
        'broadcast':        { label: 'broadcast("message")',       params: [{ label: '"message"' }] },
        'broadcastAndWait': { label: 'broadcastAndWait("message")',params: [{ label: '"message"' }] },
        'wait':             { label: 'wait(seconds)',              params: [{ label: 'seconds' }] },
        'createClone':      { label: 'createClone()  |  createClone("sprite")', params: [{ label: '"sprite"?  (optional)' }] },
        'deleteClone':      { label: 'deleteClone()',              params: [] },
        'stopAll':          { label: 'stopAll()',                  params: [] },
        'stopThis':         { label: 'stopThis()',                 params: [] },
        'stopOtherScripts': { label: 'stopOtherScripts()',        params: [] },
        'touching':         { label: 'touching("sprite" | "_edge_" | "_mouse_")', params: [{ label: '"target"' }] },
        'key':              { label: 'key("key name")',            params: [{ label: '"key name"' }] },
        'showVariable':     { label: 'showVariable([var])',        params: [{ label: '[var]' }] },
        'hideVariable':     { label: 'hideVariable([var])',        params: [{ label: '[var]' }] },
        'showList':         { label: 'showList([list])',           params: [{ label: '[list]' }] },
        'hideList':         { label: 'hideList([list])',           params: [{ label: '[list]' }] },
        'listAdd':          { label: 'listAdd(item, [list])',      params: [{ label: 'item' }, { label: '[list]' }] },
        'listDelete':       { label: 'listDelete(index, [list])',  params: [{ label: 'index' }, { label: '[list]' }] },
        'listInsert':       { label: 'listInsert(item, index, [list])', params: [{ label: 'item' }, { label: 'index' }, { label: '[list]' }] },
        'listReplace':      { label: 'listReplace(index, [list], item)', params: [{ label: 'index' }, { label: '[list]' }, { label: 'item' }] },
        // dot methods
        'length':           { label: '[var].length()  —  string length\n[list].length()  —  list length', params: [] },
        'len':              { label: '[var].len()  —  string length (alias)\n[list].len()  —  list length (alias)', params: [] },
        'contains':         { label: '[list].contains(item)', params: [{ label: 'item', documentation: 'Value to search for' }] },
        'item':             { label: '[list].item(index)',    params: [{ label: 'index', documentation: '1-based position' }] },
        'indexOf':          { label: '[list].indexOf(item)',  params: [{ label: 'item', documentation: 'Value to find' }] },
        'sort':             { label: '[list].sort()  |  [list].sort("desc")', params: [] },
        // Math / trig
        'abs':     { label: 'abs(n)',                    params: [{ label: 'n' }] },
        'round':   { label: 'round(n)',                  params: [{ label: 'n' }] },
        'sqrt':    { label: 'sqrt(n)',                   params: [{ label: 'n' }] },
        'floor':   { label: 'floor(n)',                  params: [{ label: 'n' }] },
        'ceiling': { label: 'ceiling(n)',                params: [{ label: 'n' }] },
        'ceil':    { label: 'ceil(n)  — alias for ceiling', params: [{ label: 'n' }] },
        'sin':     { label: 'sin(degrees)  — Scratch uses degrees', params: [{ label: 'degrees' }] },
        'cos':     { label: 'cos(degrees)  — Scratch uses degrees', params: [{ label: 'degrees' }] },
        'tan':     { label: 'tan(degrees)  — Scratch uses degrees', params: [{ label: 'degrees' }] },
        'asin':    { label: 'asin(n)  → degrees',        params: [{ label: 'n', documentation: '-1 to 1' }] },
        'acos':    { label: 'acos(n)  → degrees',        params: [{ label: 'n', documentation: '-1 to 1' }] },
        'atan':    { label: 'atan(n)  → degrees',        params: [{ label: 'n' }] },
        'ln':      { label: 'ln(n)  — natural log',      params: [{ label: 'n' }] },
        'log':     { label: 'log(n)  — base 10',         params: [{ label: 'n' }] },
        'exp':     { label: 'exp(n)  — e^n',             params: [{ label: 'n' }] },
        'pow10':   { label: 'pow10(n)  — 10^n',          params: [{ label: 'n' }] },
        // Operators / string
        'random':      { label: 'random(min, max)  — pick a random number', params: [{ label: 'min' }, { label: 'max' }] },
        'join':        { label: 'join(str1, str2)  — concatenate strings', params: [{ label: 'str1' }, { label: 'str2' }] },
        'letterOf':    { label: 'letterOf(index, string)  — 1-based', params: [{ label: 'index', documentation: '1-based character position' }, { label: 'string' }] },
        'clamp':       { label: 'clamp(value, min, max)  — constrain to range', params: [{ label: 'value' }, { label: 'min' }, { label: 'max' }] },
        'yield':       { label: 'yield()  — pause one tick (wait 0s)',  params: [] },
        // Motion extras
        'setDirection':  { label: 'setDirection(degrees)',           params: [{ label: 'degrees', documentation: '0=up, 90=right, 180=down, -90=left' }] },
        'pointTowards':  { label: 'pointTowards("sprite" | "_mouse_")', params: [{ label: '"target"' }] },
        'distanceTo':    { label: 'distanceTo("sprite" | "_mouse_")', params: [{ label: '"target"' }] },
        'moveForward':   { label: 'moveForward(layers)  — raise layer order',  params: [{ label: 'layers' }] },
        'moveBackward':  { label: 'moveBackward(layers)  — lower layer order', params: [{ label: 'layers' }] },
        'goToFront':     { label: 'goToFront()  — bring to front layer',  params: [] },
        'goToBack':      { label: 'goToBack()  — send to back layer',     params: [] },
        // Looks effects
        'setEffect':     { label: 'setEffect("effect", value)  — e.g. "color", "brightness", "ghost"', params: [{ label: '"effect"', documentation: 'color, fisheye, whirl, pixelate, mosaic, brightness, ghost' }, { label: 'value' }] },
        'changeEffect':  { label: 'changeEffect("effect", amount)', params: [{ label: '"effect"' }, { label: 'amount' }] },
        // Sound
        'setVolume':     { label: 'setVolume(percent)',   params: [{ label: 'percent', documentation: '0–100' }] },
        'changeVolume':  { label: 'changeVolume(amount)', params: [{ label: 'amount' }] },
        // Sensing
        'askAndWait':    { label: 'askAndWait(question)  — stores reply in answer', params: [{ label: 'question' }] },
        'resetTimer':    { label: 'resetTimer()',          params: [] },
        'currentTime':   { label: 'currentTime("unit")  — "hour" | "minute" | "second" | "year" | "month" | "date" | "day"', params: [{ label: '"unit"', documentation: 'hour, minute, second, year, month, date, day' }] },
        // Sensing of other sprites
        'xOf':           { label: 'xOf("sprite")  — x position of another sprite', params: [{ label: '"sprite"' }] },
        'yOf':           { label: 'yOf("sprite")',         params: [{ label: '"sprite"' }] },
        'directionOf':   { label: 'directionOf("sprite")', params: [{ label: '"sprite"' }] },
        'costumeNumOf':  { label: 'costumeNumOf("sprite")',params: [{ label: '"sprite"' }] },
        'costumeNameOf': { label: 'costumeNameOf("sprite")',params:[{ label: '"sprite"' }] },
        'sizeOf':        { label: 'sizeOf("sprite")',      params: [{ label: '"sprite"' }] },
        'volumeOf':      { label: 'volumeOf("sprite")',    params: [{ label: '"sprite"' }] },
        // New v1.0
        'turnTo':              { label: 'turnTo(degrees)  — point in absolute direction (0=up, 90=right, 180/-180=down, -90=left)', params: [{ label: 'degrees', documentation: '0=up, 90=right, 180=down, -90=left' }] },
        'pyfor':               { label: 'pyfor [iterator] in [list] { … }', params: [{ label: '[iterator]', documentation: 'Variable to receive each item' }, { label: '[list]', documentation: 'List to iterate over' }] },
        'not':                 { label: 'not <condition>  — boolean NOT', params: [{ label: '<condition>' }] },
        'listDeleteAll':       { label: 'listDeleteAll([list])', params: [{ label: '[list]' }] },
        'populateList':        { label: 'populateList([list], value, count | max, clearFirst)', params: [{ label: '[list]', documentation: 'The list to fill. Must already exist in Scratch.' }, { label: 'value', documentation: 'Expression to fill each slot with.' }, { label: 'count  |  max', documentation: 'Number of items to add. Pass the literal `max` for 200,000.' }, { label: 'clearFirst', documentation: 'true — delete all items first.  false — append on top of existing items.' }] },
        'populateArray':       { label: 'populateArray([list], value, count | max, clearFirst)  — alias for populateList', params: [{ label: '[list]' }, { label: 'value' }, { label: 'count  |  max', documentation: 'Number of items to add. Pass the literal `max` for 200,000.' }, { label: 'clearFirst', documentation: 'true — delete all items first.  false — append on top of existing items.' }] },
        'setRotationStyle':    { label: 'setRotationStyle("style")', params: [{ label: '"style"', documentation: '"all around" | "left-right" | "don\'t rotate"' }] },
        'switchBackdropAndWait': { label: 'switchBackdropAndWait("name")', params: [{ label: '"name"' }] },
        'setSoundEffect':      { label: 'setSoundEffect("effect", value)', params: [{ label: '"effect"', documentation: '"PITCH" or "PAN LEFT/RIGHT"' }, { label: 'value' }] },
        'changeSoundEffect':   { label: 'changeSoundEffect("effect", amount)', params: [{ label: '"effect"', documentation: '"PITCH" or "PAN LEFT/RIGHT"' }, { label: 'amount' }] },
        'clearSoundEffects':   { label: 'clearSoundEffects()', params: [] },
        'setDragMode':         { label: 'setDragMode("mode")', params: [{ label: '"mode"', documentation: '"draggable" or "not draggable"' }] },
        // Ergonomic aliases
        'print':      { label: 'print(message)  — alias for say()', params: [{ label: 'message' }] },
        'println':    { label: 'println(message)  — alias for say()', params: [{ label: 'message' }] },
        'step':       { label: 'step(steps)  — alias for move()', params: [{ label: 'steps' }] },
        'forward':    { label: 'forward(steps)  — alias for move()', params: [{ label: 'steps' }] },
        'left':       { label: 'left(degrees)  — alias for turnLeft()', params: [{ label: 'degrees' }] },
        'right':      { label: 'right(degrees)  — alias for turnRight()', params: [{ label: 'degrees' }] },
        'front':      { label: 'front()  — bring to front layer (alias for goToFront)', params: [] },
        'back':       { label: 'back()  — send to back layer (alias for goToBack)', params: [] },
        'clone':      { label: 'clone()  — create clone of self (alias for createClone("_myself_"))', params: [] },
        'stopMe':     { label: 'stopMe()  — stop this script (alias for stopThis)', params: [] },
        'ask':        { label: 'ask("question")  — alias for askAndWait()', params: [{ label: '"question"' }] },
        'send':       { label: 'send("message")  — alias for broadcast()', params: [{ label: '"message"' }] },
        'sendAndWait':{ label: 'sendAndWait("message")  — alias for broadcastAndWait()', params: [{ label: '"message"' }] },
        'append':     { label: 'append([list], value)  — add item to end (alias for listAdd)', params: [{ label: '[list]', documentation: 'The list to append to' }, { label: 'value', documentation: 'Item to add' }] },
        'push':       { label: 'push([list], value)  — alias for append()', params: [{ label: '[list]' }, { label: 'value' }] },
        'remove':     { label: 'remove([list], index)  — delete item at index (alias for listDelete)', params: [{ label: '[list]' }, { label: 'index', documentation: 'Position to delete, or "last"/"random"' }] },
        'insert':     { label: 'insert([list], index, value)  — insert at position (alias for listInsert)', params: [{ label: '[list]' }, { label: 'index' }, { label: 'value' }] },
        'replace':    { label: 'replace([list], index, value)  — replace item (alias for listReplace)', params: [{ label: '[list]' }, { label: 'index' }, { label: 'value' }] },
        'clear':      { label: 'clear([list])  — delete all items (alias for listDeleteAll)', params: [{ label: '[list]' }] },
        'pop':        { label: 'pop([list])  — delete all items (alias for clear/listDeleteAll)', params: [{ label: '[list]' }] },
        // Scratchroutines
        'scratchroutine': { label: 'scratchroutine name(params) { … }', params: [{ label: 'name', documentation: 'Routine identifier' }, { label: 'params', documentation: 'Comma-separated parameter names (optional)' }] },
        'launch':         { label: 'launch name(args)  — fire and forget (broadcast)', params: [{ label: 'name', documentation: 'Scratchroutine name' }, { label: 'args', documentation: 'Arguments (optional)' }] },
        'await':          { label: 'await name(args)  — block until done (broadcastAndWait)', params: [{ label: 'name', documentation: 'Scratchroutine name' }, { label: 'args', documentation: 'Arguments (optional)' }] },
        'cancel':         { label: 'cancel name  — set the cancel flag (check with checkCancel)', params: [{ label: 'name', documentation: 'Scratchroutine name' }] },
        'isRunning':      { label: 'isRunning(name)  — boolean: is routine currently executing?', params: [{ label: 'name', documentation: 'Scratchroutine name' }] },
        'checkCancel':    { label: 'checkCancel()  — stop this script if cancelled (inside scratchroutine only)', params: [] },
        // Inline assembly
        '__asm__': {
            label: '__asm__ volatile(...)  — inline raw Scratch opcodes\n' +
                   '\n' +
                   'Body is PARENS, not braces:\n' +
                   '  __asm__ volatile(\n' +
                   '    looks_say("hi");\n' +
                   '    motion_movesteps(69);\n' +
                   '  )\n' +
                   '\n' +
                   'Args are literals or bare register names (variables in scope):\n' +
                   '  __asm__ volatile( data_changevariableby(counter, 5); )\n' +
                   '\n' +
                   '__asm__ volatile unsafe(...) allows opcodes outside the known list\n' +
                   '(best-effort arg wiring, no correctness guarantee).',
            params: [],
        },
        // List aggregates
        'sum':   { label: '[list].sum()  — sum of all numeric items', params: [] },
        'min':   { label: '[list].min()  — minimum numeric item',     params: [] },
        'max':   { label: '[list].max()  — maximum numeric item',     params: [] },
        'count': { label: '[list].count(value)  — how many items equal value', params: [{ label: 'value', documentation: 'Value to count' }] },
    };

    const KEYWORD_RE = /\b(wait until|repeat until|if|while|repeat|for)\s*$/;

    monaco.languages.registerSignatureHelpProvider(LANG_ID, {
        signatureHelpTriggerCharacters:   ['(', ' ', '['],
        signatureHelpRetriggerCharacters: [','],
        provideSignatureHelp(model, position) {
            const lineText = model.getLineContent(position.lineNumber);
            const before   = lineText.substring(0, position.column - 1);

            // Dot method: [list].method(
            const dotM = before.match(/\[([^\]]+)\]\.(\w+)\s*\([^)]*$/);
            if (dotM) {
                const sig = SIG_DB[dotM[2]];
                if (sig) {
                    const commas = (before.slice(before.lastIndexOf('(') + 1).match(/,/g) || []).length;
                    return mkSig(sig, commas);
                }
            }

            // Function call: name(
            const fnM = before.match(/(\w+)\s*\([^)]*$/);
            if (fnM) {
                const sig = SIG_DB[fnM[1]] || asmSigFor(fnM[1]);
                if (sig) {
                    const commas = (before.slice(before.lastIndexOf('(') + 1).match(/,/g) || []).length;
                    return mkSig(sig, commas);
                }
            }

            // Keyword construct (no parens needed)
            const kwM = before.match(KEYWORD_RE);
            if (kwM) {
                const sig = SIG_DB[kwM[1]];
                if (sig) return mkSig(sig, 0);
            }

            return null;
        },
    });

    function mkSig(sig, activeParam) {
        return {
            value: {
                signatures: [{
                    label: sig.label,
                    parameters: sig.params.map(p => ({ label: p.label, documentation: p.documentation || '' })),
                }],
                activeSignature: 0,
                activeParameter: Math.min(activeParam, Math.max(0, sig.params.length - 1)),
            },
            dispose: () => {},
        };
    }

    monaco.languages.registerHoverProvider(LANG_ID, {
        provideHover(model, position) {
            const word = model.getWordAtPosition(position);
            if (!word) return null;
            const sig = SIG_DB[word.word];
            if (!sig) return null;
            return {
                range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
                contents: [
                    { value: '```scratchpiler\n' + sig.label + '\n```' },
                    ...(sig.params.flatMap(p => p.documentation ? [{ value: '**' + p.label + '** — ' + p.documentation }] : [])),
                ],
            };
        }
    });

    monaco.languages.registerDocumentFormattingEditProvider(LANG_ID, {
        provideDocumentFormattingEdits(model) {
            const src = model.getValue();
            const formatted = formatSource(src);
            if (!formatted) return [];
            return [{ range: model.getFullModelRange(), text: formatted }];
        }
    });

    monaco.languages.registerFoldingRangeProvider(LANG_ID, {
        provideFoldingRanges(model) {
            const ranges = [];
            const lines = model.getLinesContent();
            const stack = [];
            for (let i = 0; i < lines.length; i++) {
                const t = lines[i].trim();
                if (t.endsWith('{')) stack.push(i + 1);
                else if (t === '}' || t.startsWith('}')) {
                    if (stack.length) {
                        const start = stack.pop();
                        if (i + 1 > start) {
                            ranges.push({ start, end: i + 1,
                                kind: monaco.languages.FoldingRangeKind.Region });
                        }
                    }
                }
            }
            return ranges;
        }
    });

    monaco.languages.setLanguageConfiguration(LANG_ID, {
        comments: { lineComment: '//' },
        brackets: [['{', '}'], ['(', ')'], ['[', ']']],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
        ],
        surroundingPairs: [
            { open: '{', close: '}' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
        ],
        indentationRules: {
            increaseIndentPattern: /^.*\{[^}]*$/,
            decreaseIndentPattern: /^\s*\}/,
        },
    });
}

function getActiveSpriteNameFromDropdown() {
    return currentSpriteContext;
}

// Detects whether `position` sits inside a `__asm__ volatile(...)` region, and at what
// depth: 1 = top level of the asm block (opcode-name position), 2+ = inside an opcode
// call's own parens (register/literal position). Returns null outside any asm region.
function detectAsmContext(model, position) {
    const offset = model.getOffsetAt(position);
    let toks;
    try { toks = tokenize(model.getValue()); } catch (e) { return null; }
    const posOf = (t) => model.getOffsetAt({ lineNumber: t.line, column: t.col });

    let lastAsmIdx = -1;
    for (let i = 0; i < toks.length; i++) {
        if (posOf(toks[i]) >= offset) break;
        if (toks[i].value === '__asm__') lastAsmIdx = i;
    }
    if (lastAsmIdx === -1) return null;

    let depth = 0, sawOpen = false;
    for (let i = lastAsmIdx + 1; i < toks.length; i++) {
        if (posOf(toks[i]) >= offset) break;
        if (toks[i].type === '(') { depth++; sawOpen = true; }
        else if (toks[i].type === ')') { depth--; if (sawOpen && depth <= 0) return null; }
    }
    if (!sawOpen || depth <= 0) return null;
    return { kind: depth === 1 ? 'opcode' : 'register' };
}

// Union of real Scratch variables/lists in scope plus compiler-internal temp vars
// (for/pyfor iterators, scratchroutine params) active at `position` — a deliberately
// simple source-level heuristic, since the real forScope/routineScope only exist
// transiently inside a live compile() call against a parsed AST + VM.
function collectRegistersInScope(model, position) {
    const seen = new Set();
    const registers = [];
    const add = (name, source) => {
        if (seen.has(name)) return;
        seen.add(name);
        registers.push({ name, source });
    };

    for (const v of scratchIndex.globalVariables) add(v.name, `Global ${v.type}`);
    const activeName = getActiveSpriteNameFromDropdown();
    if (activeName) {
        for (const v of (scratchIndex.spriteVariables[activeName] ?? [])) add(v.name, `${activeName} ${v.type}`);
    }

    const src = model.getValue();
    const offset = model.getOffsetAt(position);
    const before = src.slice(0, offset);
    let depth = 0;
    const scopeStack = []; // { depth, names: [] }
    // Walk char-by-char tracking brace depth, applying scope entries at the point they occur.
    for (let i = 0; i < before.length; i++) {
        const c = before[i];
        if (c === '{') {
            // Does a scope-introducing header end right before this brace?
            const head = before.slice(0, i);
            const forM = head.match(/\b(?:for|pyfor)\s*\[([^\]]+)\][^{}]*$/);
            const routineM = head.match(/\bscratchroutine\s+\w+\s*\(([^)]*)\)[^{}]*$/);
            const names = [];
            if (forM) names.push(forM[1].trim());
            if (routineM) {
                for (const p of routineM[1].split(',')) {
                    const name = p.trim();
                    if (name) names.push(name);
                }
            }
            scopeStack.push({ depth, names });
            depth++;
        } else if (c === '}') {
            depth--;
            while (scopeStack.length && scopeStack[scopeStack.length - 1].depth >= depth) scopeStack.pop();
        }
    }
    for (const frame of scopeStack) {
        for (const name of frame.names) add(name, 'Loop / routine variable');
    }

    return registers;
}

function asmSigFor(opcode) {
    const schema = ASM_OPCODES[opcode];
    if (!schema) return null;
    return {
        label: `${opcode}(${schema.params.map(p => p.name).join(', ')})`,
        params: schema.params.map(p => ({ label: p.name })),
    };
}

function buildSuggestions(monaco, range, hatRange) {
    const CIK = monaco.languages.CompletionItemKind;
    const IS  = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    const HR  = hatRange || range;
    const items = [];

    const push = (label, kind, detail, insertText, documentation) => {
        const item = { label, kind, detail, insertText: insertText ?? label, insertTextRules: IS, range };
        if (documentation) item.documentation = { value: documentation };
        items.push(item);
    };

    const pushHat = (label, insertText, documentation) => {
        const item = { label, kind: CIK.Snippet, detail: 'Hat block · event trigger', insertText, insertTextRules: IS, range: HR };
        if (documentation) item.documentation = { value: documentation };
        items.push(item);
    };

    // Hat blocks
    pushHat('on flag {}',        'on flag {\n\t$0\n}',        'Runs when the green flag is clicked');
    pushHat('on click {}',       'on click {\n\t$0\n}',       'Runs when this sprite is clicked');
    pushHat('on clone {}',       'on clone {\n\t$0\n}',       'Runs when this clone starts');
    pushHat('on key "" {}',      'on key "$1" {\n\t$0\n}',   'Runs when a key is pressed  e.g. `on key "space" {}`');
    pushHat('on receive "" {}',  'on receive "$1" {\n\t$0\n}','Runs when a broadcast message is received');
    pushHat('on backdrop "" {}', 'on backdrop "$1" {\n\t$0\n}','Runs when the backdrop switches to the named backdrop');
    // Control flow
    push('if {}',                  CIK.Snippet, 'Control · if <cond> {}',            'if ${1:condition} {\n\t$0\n}',                                   'Executes the block if the condition is true');
    push('if {} else {}',          CIK.Snippet, 'Control · if/else',                  'if ${1:condition} {\n\t$2\n} else {\n\t$0\n}',                   'Executes the `if` branch when true, the `else` branch when false');
    push('repeat {}',              CIK.Snippet, 'Control · repeat <n> {}',            'repeat ${1:count} {\n\t$0\n}',                                   'Repeats the block a fixed number of times');
    push('forever {}',             CIK.Snippet, 'Control · forever {}',               'forever {\n\t$0\n}',                                             'Loops the block forever');
    push('repeat until () {}',     CIK.Snippet, 'Control · repeat until (cond) {}',   'repeat until (${1:condition}) {\n\t$0\n}',                       'Loops until the condition becomes true');
    push('while () {}',            CIK.Snippet, 'Control · while (cond) {}',          'while (${1:condition}) {\n\t$0\n}',                              'Loops while the condition is true');
    push('for [i] from 1 to 10 {}',CIK.Snippet, 'Control · for [i] from n to n {}',  'for [${1:i}] from ${2:1} to ${3:10} {\n\t$0\n}',                'Numeric for-loop — [i] counts from start to end');
    push('pyfor [item] in [list] {}', CIK.Snippet, 'Control · pyfor [item] in [list] {}', 'pyfor [${1:item}] in [${2:myList}] {\n\t$0\n}',            'Python-style list iteration — [item] receives each list element in order');
    push('wait until',             CIK.Snippet, 'Control · wait until <cond>',        'wait until ${0:condition}',                                      'Pauses until the condition becomes true');
    push('define name(params) {}', CIK.Snippet, 'Custom block · define name(params) {}', 'define ${1:name}(${2:params}) {\n\t$0\n}',                   'Define a custom block (procedure)');
    // Variables (space-form preserved)
    push('set [] to',              CIK.Keyword,  'Variables · set [var] to value',   'set [$1] to $0',      'Set a variable to a value');
    push('change [] by',           CIK.Keyword,  'Variables · change [var] by n',    'change [$1] by $0',   'Add a number to a variable');
    // Motion
    push('move()',                 CIK.Function, 'Motion · move(steps)',              'move($0)',            'Move forward by the given number of steps');
    push('turnRight()',            CIK.Function, 'Motion · turnRight(degrees)',       'turnRight($0)',       'Rotate clockwise by the given degrees');
    push('turnLeft()',             CIK.Function, 'Motion · turnLeft(degrees)',        'turnLeft($0)',        'Rotate counter-clockwise by the given degrees');
    push('turnTo()',               CIK.Function, 'Motion · turnTo(degrees)',          'turnTo($0)',          'Point in an absolute direction (0=up, 90=right, 180=down, -90=left)');
    push('goTo(x, y)',             CIK.Function, 'Motion · goTo(x, y)',              'goTo($1, $0)',        'Go to absolute x, y coordinates');
    push('goTo("sprite")',         CIK.Function, 'Motion · goTo("sprite")',          'goTo("$0")',          'Go to another sprite or `"_mouse_"` / `"_random_"`');
    push('glide(secs, x, y)',      CIK.Function, 'Motion · glide(secs, x, y)',       'glide($1, $2, $0)',   'Glide smoothly to x, y over the given seconds');
    push('setX()',                 CIK.Function, 'Motion · setX(x)',                 'setX($0)',            'Set the sprite\'s x position');
    push('setY()',                 CIK.Function, 'Motion · setY(y)',                 'setY($0)',            'Set the sprite\'s y position');
    push('changeX()',              CIK.Function, 'Motion · changeX(dx)',             'changeX($0)',         'Move the sprite by dx on the x axis');
    push('changeY()',              CIK.Function, 'Motion · changeY(dy)',             'changeY($0)',         'Move the sprite by dy on the y axis');
    push('bounce()',               CIK.Function, 'Motion · bounce()',                'bounce()',            'Bounce if on the edge of the stage');
    // Looks
    push('say()',                  CIK.Function, 'Looks',    'say("$0")');
    push('sayFor()',               CIK.Function, 'Looks',    'sayFor("$1", $0)');
    push('think()',                CIK.Function, 'Looks',    'think("$0")');
    push('thinkFor()',             CIK.Function, 'Looks',    'thinkFor("$1", $0)');
    push('switchCostume()',        CIK.Function, 'Looks',    'switchCostume("$0")');
    push('switchBackdrop()',       CIK.Function, 'Looks',    'switchBackdrop("$0")');
    push('nextCostume()',          CIK.Function, 'Looks',    'nextCostume()');
    push('nextBackdrop()',         CIK.Function, 'Looks',    'nextBackdrop()');
    push('setSize()',              CIK.Function, 'Looks',    'setSize($0)');
    push('changeSize()',           CIK.Function, 'Looks',    'changeSize($0)');
    push('show()',                 CIK.Function, 'Looks',    'show()');
    push('hide()',                 CIK.Function, 'Looks',    'hide()');
    push('clearEffects()',         CIK.Function, 'Looks',    'clearEffects()');
    // Sound
    push('play()',                 CIK.Function, 'Sound',    'play("$0")');
    push('playUntilDone()',        CIK.Function, 'Sound',    'playUntilDone("$0")');
    push('stopSounds()',           CIK.Function, 'Sound',    'stopSounds()');
    // Events
    push('broadcast()',            CIK.Function, 'Events',   'broadcast("$0")');
    push('broadcastAndWait()',     CIK.Function, 'Events',   'broadcastAndWait("$0")');
    // Control
    push('wait()',                 CIK.Function, 'Control',  'wait($0)');
    push('stopAll()',              CIK.Function, 'Control',  'stopAll()');
    push('stopThis()',             CIK.Function, 'Control',  'stopThis()');
    push('stopOtherScripts()',     CIK.Function, 'Control',  'stopOtherScripts()');
    push('createClone()',          CIK.Function, 'Control',  'createClone()');
    push('createClone("sprite")',  CIK.Function, 'Control',  'createClone("$0")');
    push('deleteClone()',          CIK.Function, 'Control',  'deleteClone()');
    // Data — show/hide
    push('showVariable()',         CIK.Function, 'Variables', 'showVariable([$0])');
    push('hideVariable()',         CIK.Function, 'Variables', 'hideVariable([$0])');
    push('showList()',             CIK.Function, 'Variables', 'showList([$0])');
    push('hideList()',             CIK.Function, 'Variables', 'hideList([$0])');
    // Lists
    push('listAdd()',              CIK.Function, 'Lists',    'listAdd($1, [$0])');
    push('listDelete()',           CIK.Function, 'Lists',    'listDelete($1, [$0])');
    push('listInsert()',           CIK.Function, 'Lists',    'listInsert($1, $2, [$0])');
    push('listReplace()',          CIK.Function, 'Lists',    'listReplace($1, [$2], $0)');
    push('listDeleteAll()',        CIK.Function, 'Lists',    'listDeleteAll([$0])');
    push('populateList()',         CIK.Function, 'Lists',    'populateList([$1], $2, $3, ${4|true,false|})');
    push('populateArray()',        CIK.Function, 'Lists',    'populateArray([$1], $2, $3, ${4|true,false|})');
    // Motion extras
    push('setRotationStyle()',     CIK.Function, 'Motion',   'setRotationStyle("${1|all around,left-right,don\'t rotate|}")');
    push('glide(secs, "sprite")', CIK.Function, 'Motion',   'glide($1, "$0")');
    // Looks extras
    push('switchBackdropAndWait()',CIK.Function, 'Looks',    'switchBackdropAndWait("$0")');
    // Sound effects
    push('setSoundEffect()',       CIK.Function, 'Sound',    'setSoundEffect("${1|PITCH,PAN LEFT/RIGHT|}", $0)');
    push('changeSoundEffect()',    CIK.Function, 'Sound',    'changeSoundEffect("${1|PITCH,PAN LEFT/RIGHT|}", $0)');
    push('clearSoundEffects()',    CIK.Function, 'Sound',    'clearSoundEffects()');
    // Sensing extras
    push('setDragMode()',          CIK.Function, 'Sensing',  'setDragMode("${1|draggable,not draggable|}")');
    // Hat blocks for greaterThan
    pushHat('on timer > n {}',    'on timer > ${1:10} {\n\t$0\n}');
    pushHat('on loudness > n {}', 'on loudness > ${1:10} {\n\t$0\n}');
    // Operators
    push('not',                    CIK.Keyword, 'Operators', 'not ');
    // Math / trig
    push('abs()',      CIK.Function, 'Math', 'abs($0)');
    push('round()',    CIK.Function, 'Math', 'round($0)');
    push('sqrt()',     CIK.Function, 'Math', 'sqrt($0)');
    push('floor()',    CIK.Function, 'Math', 'floor($0)');
    push('ceiling()',  CIK.Function, 'Math', 'ceiling($0)');
    push('sin()',      CIK.Function, 'Math', 'sin($0)');
    push('cos()',      CIK.Function, 'Math', 'cos($0)');
    push('tan()',      CIK.Function, 'Math', 'tan($0)');
    push('asin()',     CIK.Function, 'Math', 'asin($0)');
    push('acos()',     CIK.Function, 'Math', 'acos($0)');
    push('atan()',     CIK.Function, 'Math', 'atan($0)');
    push('ln()',       CIK.Function, 'Math', 'ln($0)');
    push('log()',      CIK.Function, 'Math', 'log($0)');
    push('exp()',      CIK.Function, 'Math', 'exp($0)');
    push('pow10()',    CIK.Function, 'Math', 'pow10($0)');
    // Comparison operators (shown as snippets so users discover them)
    push('[a] < [b]',  CIK.Operator, 'Comparison', '$1 < $0');
    push('[a] > [b]',  CIK.Operator, 'Comparison', '$1 > $0');
    push('[a] = [b]',  CIK.Operator, 'Comparison', '$1 = $0');
    // Sensing / reporters
    push('touching()',             CIK.Function, 'Sensing',  'touching("$0")');
    push('key()',                  CIK.Function, 'Sensing',  'key("$0")');
    push('mouseDown',              CIK.Variable, 'Sensing',  'mouseDown');
    push('mouseX',                 CIK.Variable, 'Sensing',  'mouseX');
    push('mouseY',                 CIK.Variable, 'Sensing',  'mouseY');
    push('xPos',                   CIK.Variable, 'Motion',   'xPos');
    push('yPos',                   CIK.Variable, 'Motion',   'yPos');
    push('direction',              CIK.Variable, 'Motion',   'direction');
    push('timer',                  CIK.Variable, 'Sensing',  'timer');
    push('answer',                 CIK.Variable, 'Sensing',  'answer');
    push('loudness',               CIK.Variable, 'Sensing',  'loudness');
    push('costumeNum',             CIK.Variable, 'Looks',    'costumeNum');
    push('costumeName',            CIK.Variable, 'Looks',    'costumeName');
    push('volume',                 CIK.Variable, 'Sound',    'volume');
    push('username',               CIK.Variable, 'Sensing',  'username');
    push('daysSince2000',          CIK.Variable, 'Sensing',  'daysSince2000');
    // Motion extras
    push('setDirection()',         CIK.Function, 'Motion',   'setDirection($0)');
    push('pointTowards()',         CIK.Function, 'Motion',   'pointTowards("$0")');
    push('goToFront()',            CIK.Function, 'Motion',   'goToFront()');
    push('goToBack()',             CIK.Function, 'Motion',   'goToBack()');
    push('moveForward()',          CIK.Function, 'Motion',   'moveForward($0)');
    push('moveBackward()',         CIK.Function, 'Motion',   'moveBackward($0)');
    // Looks effects
    push('setEffect()',            CIK.Function, 'Looks',    'setEffect("${1:color}", $0)');
    push('changeEffect()',         CIK.Function, 'Looks',    'changeEffect("${1:color}", $0)');
    // Sound extras
    push('setVolume()',            CIK.Function, 'Sound',    'setVolume($0)');
    push('changeVolume()',         CIK.Function, 'Sound',    'changeVolume($0)');
    // Sensing extras
    push('askAndWait()',           CIK.Function, 'Sensing',  'askAndWait("$0")');
    push('resetTimer()',           CIK.Function, 'Sensing',  'resetTimer()');
    push('currentTime()',          CIK.Function, 'Sensing',  'currentTime("$0")');
    push('distanceTo()',           CIK.Function, 'Sensing',  'distanceTo("$0")');
    push('xOf()',                  CIK.Function, 'Sensing',  'xOf("$0")');
    push('yOf()',                  CIK.Function, 'Sensing',  'yOf("$0")');
    push('directionOf()',          CIK.Function, 'Sensing',  'directionOf("$0")');
    push('costumeNumOf()',         CIK.Function, 'Sensing',  'costumeNumOf("$0")');
    push('costumeNameOf()',        CIK.Function, 'Sensing',  'costumeNameOf("$0")');
    push('sizeOf()',               CIK.Function, 'Sensing',  'sizeOf("$0")');
    push('volumeOf()',             CIK.Function, 'Sensing',  'volumeOf("$0")');
    // Operator sugar
    push('random()',               CIK.Function, 'Math',     'random($1, $0)');
    push('join()',                 CIK.Function, 'Operators', 'join($1, $0)');
    push('letterOf()',             CIK.Function, 'Operators', 'letterOf($1, $0)');
    push('contains()',             CIK.Function, 'Operators', 'contains($1, $0)');
    push('clamp()',                CIK.Function, 'Math',     'clamp($1, $2, $0)');
    push('yield()',                CIK.Function, 'Control',  'yield()');
    // Compound assignment
    push('[var] += n',             CIK.Snippet,  'Variables', '[$1] += $0');
    push('[var] -= n',             CIK.Snippet,  'Variables', '[$1] -= $0');
    push('[var] *= n',             CIK.Snippet,  'Variables', '[$1] *= $0');
    push('[var] /= n',             CIK.Snippet,  'Variables', '[$1] /= $0');

    // Ergonomic aliases — friendlier names for common operations
    push('print()',    CIK.Function, 'Aliases · say()',          'print($0)',
         'Alias for `say()` — print a value to the speech bubble');
    push('step()',     CIK.Function, 'Aliases · move()',         'step($0)',
         'Alias for `move()` — move forward N steps');
    push('forward()',  CIK.Function, 'Aliases · move()',         'forward($0)',
         'Alias for `move()` — move forward N steps');
    push('left()',     CIK.Function, 'Aliases · turnLeft()',     'left($0)',
         'Alias for `turnLeft(degrees)`');
    push('right()',    CIK.Function, 'Aliases · turnRight()',    'right($0)',
         'Alias for `turnRight(degrees)`');
    push('front()',    CIK.Function, 'Aliases · goToFront()',    'front()',
         'Bring sprite to the front layer — alias for `goToFront()`');
    push('back()',     CIK.Function, 'Aliases · goToBack()',     'back()',
         'Send sprite to the back layer — alias for `goToBack()`');
    push('clone()',    CIK.Function, 'Aliases · createClone()',  'clone()',
         'Create a clone of this sprite — alias for `createClone("_myself_")`');
    push('stopMe()',   CIK.Function, 'Aliases · stopThis()',     'stopMe()',
         'Stop this script — alias for `stopThis()`');
    push('ask()',      CIK.Function, 'Aliases · askAndWait()',   'ask("$0")',
         'Ask a question and wait — alias for `askAndWait()`');
    push('send()',     CIK.Function, 'Aliases · broadcast()',    'send("$0")',
         'Broadcast a message — alias for `broadcast()`');
    push('sendAndWait()',CIK.Function,'Aliases · broadcastAndWait()','sendAndWait("$0")',
         'Broadcast and wait — alias for `broadcastAndWait()`');
    push('append()',   CIK.Function, 'Aliases · listAdd()',      'append([$1], $0)',
         'Add item to end of list — alias for `listAdd(item, [list])`');
    push('push()',     CIK.Function, 'Aliases · listAdd()',      'push([$1], $0)',
         'Add item to end of list — alias for `listAdd(item, [list])`');
    push('remove()',   CIK.Function, 'Aliases · listDelete()',   'remove([$1], $0)',
         'Delete item at index — alias for `listDelete(index, [list])`');
    push('insert()',   CIK.Function, 'Aliases · listInsert()',   'insert([$1], $2, $0)',
         'Insert item at index — alias for `listInsert(item, index, [list])`');
    push('replace()',  CIK.Function, 'Aliases · listReplace()',  'replace([$1], $2, $0)',
         'Replace item at index — alias for `listReplace(index, [list], item)`');
    push('clear()',    CIK.Function, 'Aliases · listDeleteAll()','clear([$0])',
         'Delete all items from list — alias for `listDeleteAll([list])`');

    // Increment / decrement
    push('[var]++', CIK.Snippet, 'Variables', '[$1]++', 'Increment variable by 1 — sugar for `change [var] by 1`');
    push('[var]--', CIK.Snippet, 'Variables', '[$1]--', 'Decrement variable by 1 — sugar for `change [var] by -1`');

    // Scratchroutines
    push('enum {}',         CIK.Snippet,   'Enum · compile-time named constants',
        'enum {\n\t${1:NAME} = ${2:0},\n\t$0\n}',
        'Declare named constants — use them bare (no brackets) anywhere in expressions.\n\nExample:\n```\nenum {\n\tSTATE_IDLE = 0,\n\tSTATE_RUN  = 1,\n\tSTATE_DEAD = 2\n}\nset [state] to STATE_IDLE\nif [state] = STATE_DEAD { say("you died") }\n```\n\nValues must be number or string literals. Omit `= value` to default to 0. `enums` also works.');
    push('struct name {}',  CIK.Snippet,   'Struct · compile-time field group',
        'struct ${1:name} {\n\t${2:field1}, ${3:field2}\n}',
        'Declare a named field group — variables like `[name.field]` are auto-created on compile\n\nExample:\n```\nstruct player { x, y, hp }\n// Creates [player.x], [player.y], [player.hp] in Scratch\n```');
    push('breakpoint',      CIK.Keyword,   'Debug · pause execution', 'breakpoint',
        'Pause execution here and show the debug bar in scratchpiler — click Resume to continue');

    push('scratchroutine',  CIK.Keyword,   'Scratchroutines', 'scratchroutine ${1:name}($2) {\n    $0\n}',
         'Define a named concurrent task (compiles to broadcast-based pseudo-coroutine)');
    push('launch',          CIK.Keyword,   'Scratchroutines', 'launch ${1:name}($0)',
         'Fire and forget — broadcasts the scratchroutine without waiting');
    push('await',           CIK.Keyword,   'Scratchroutines', 'await ${1:name}($0)',
         'Fire and wait — broadcasts the scratchroutine and blocks until it finishes');
    push('cancel',          CIK.Keyword,   'Scratchroutines', 'cancel ${1:name}',
         'Set the cancel flag for a running scratchroutine — use checkCancel() inside the body to react');
    push('isRunning()',     CIK.Function,  'Scratchroutines', 'isRunning(${1:name})',
         'Boolean — true if the named scratchroutine is currently running');
    push('checkCancel()',   CIK.Function,  'Scratchroutines', 'checkCancel()',
         'Inside a scratchroutine body: stop this script if cancel has been requested');

    // List aggregates
    push('[list].sum()',   CIK.Function, 'Lists · Aggregates', '[$1].sum()',   'Sum all numeric items in the list');
    push('[list].min()',   CIK.Function, 'Lists · Aggregates', '[$1].min()',   'Find the minimum numeric item in the list');
    push('[list].max()',   CIK.Function, 'Lists · Aggregates', '[$1].max()',   'Find the maximum numeric item in the list');
    push('[list].count()', CIK.Function, 'Lists · Aggregates', '[$1].count($0)', 'Count how many items equal a given value');

    // Sprite names
    for (const s of scratchIndex.sprites)
        push(s.name, CIK.Class, 'Sprite', s.name);

    // Stage backdrops
    for (const b of scratchIndex.stage.backdrops)
        push(b, CIK.File, 'Backdrop', b);

    // Global variables/lists
    for (const v of scratchIndex.globalVariables)
        push(`[${v.name}]`, v.type === 'list' ? CIK.Enum : CIK.Variable, `Global ${v.type}`, `[${v.name}]`);

    // Active sprite/stage context
    const activeName = getActiveSpriteNameFromDropdown();
    if (activeName === '__stage__') {
        for (const s of scratchIndex.stage.sounds)
            push(s, CIK.Event, 'Sound', s);
    } else if (activeName) {
        const sprite = scratchIndex.sprites.find(s => s.name === activeName);
        if (sprite) {
            for (const c of sprite.costumes)
                push(c, CIK.Color, 'Costume', c);
            for (const s of sprite.sounds)
                push(s, CIK.Event, 'Sound', s);
        }
        for (const v of (scratchIndex.spriteVariables[activeName] ?? []))
            push(`[${v.name}]`, v.type === 'list' ? CIK.Enum : CIK.Variable, `${activeName} ${v.type}`, `[${v.name}]`);
        for (const p of (scratchIndex.customBlocks[activeName] ?? []))
            push(p, CIK.Function, 'Custom block', p);
    }

    return items;
}
