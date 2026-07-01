// Schema table for `__asm__ volatile(...)` — maps a raw Scratch opcode string to the
// ordered list of positional arguments __asm__ callers must supply, and how each arg
// wires into a real Scratch block's `inputs`/`fields`.
//
// Every entry here is derived directly from an existing `addBlock(...)` call site in
// compiler.js (the friendly-alias codegen), so the input/field key names are guaranteed
// to match what scratch-vm actually reads for that opcode. Opcodes with no existing
// codegen call site in this compiler are intentionally left out rather than guessed —
// `__asm__ volatile unsafe(...)` is the escape hatch for those.
//
// Per-param shape:
//   name       — the real Scratch input/field key (e.g. 'STEPS', 'VARIABLE')
//   kind       — 'input' (wired via numInput/strInput/boolInput/menuBlock into block.inputs)
//                or 'field' (a plain {name, value} entry in block.fields)
//   valueType  — 'string' | 'number' | 'boolean' | 'menu' | 'variable' | 'list'
//                ('variable'/'list' args must be a bare register name, resolved via resolveVar())
//   menuValues — fixed dropdown options, only for valueType: 'menu' (informational/autocomplete only)
//   menuShadow — only for kind:'input', valueType:'menu' opcodes that wire the menu value
//                through a separate shadow block rather than a plain field, e.g.
//                { opcode: 'motion_pointtowards_menu', field: 'TOWARDS' }

export const ASM_OPCODES = {
    // --- Motion ---
    'motion_movesteps': {
        params: [
            { name: 'STEPS', kind: 'input', valueType: 'number' },
        ],
    },
    'motion_setrotationstyle': {
        params: [
            { name: 'STYLE', kind: 'field', valueType: 'menu',
              menuValues: ['all around', 'left-right', "don't rotate"] },
        ],
    },
    'motion_pointtowards': {
        params: [
            { name: 'TOWARDS', kind: 'input', valueType: 'menu',
              menuValues: ['_mouse_', '_random_'],
              menuShadow: { opcode: 'motion_pointtowards_menu', field: 'TOWARDS' } },
        ],
    },

    // --- Looks ---
    'looks_say': {
        params: [
            { name: 'MESSAGE', kind: 'input', valueType: 'string' },
        ],
    },

    // --- Data ---
    'data_setvariableto': {
        params: [
            { name: 'VARIABLE', kind: 'field', valueType: 'variable' },
            { name: 'VALUE', kind: 'input', valueType: 'string' },
        ],
    },
    'data_changevariableby': {
        params: [
            { name: 'VARIABLE', kind: 'field', valueType: 'variable' },
            { name: 'VALUE', kind: 'input', valueType: 'number' },
        ],
    },

    // --- Control ---
    'control_if': {
        params: [
            { name: 'CONDITION', kind: 'input', valueType: 'boolean' },
        ],
    },
    'control_if_else': {
        params: [
            { name: 'CONDITION', kind: 'input', valueType: 'boolean' },
        ],
    },
    'control_repeat': {
        params: [
            { name: 'TIMES', kind: 'input', valueType: 'number' },
        ],
    },
    'control_forever': {
        params: [],
    },
    'control_repeat_until': {
        params: [
            { name: 'CONDITION', kind: 'input', valueType: 'boolean' },
        ],
    },
    'control_wait_until': {
        params: [
            { name: 'CONDITION', kind: 'input', valueType: 'boolean' },
        ],
    },
    'control_wait': {
        params: [
            { name: 'DURATION', kind: 'input', valueType: 'number' },
        ],
    },
    'control_stop': {
        params: [
            { name: 'STOP_OPTION', kind: 'field', valueType: 'menu',
              menuValues: ['all', 'this script', 'other scripts in sprite'] },
        ],
    },
    'control_create_clone_of': {
        params: [
            { name: 'CLONE_OPTION', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'control_create_clone_of_menu', field: 'CLONE_OPTION' } },
        ],
    },
    'control_delete_this_clone': {
        params: [],
    },
    // control_start_as_clone excluded — hat block, always topLevel with no parent.

    // --- Motion ---
    'motion_gotoxy': {
        params: [
            { name: 'X', kind: 'input', valueType: 'number' },
            { name: 'Y', kind: 'input', valueType: 'number' },
        ],
    },
    'motion_goto': {
        params: [
            { name: 'TO', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'motion_goto_menu', field: 'TO' } },
        ],
    },
    'motion_glidesecstoxy': {
        params: [
            { name: 'SECS', kind: 'input', valueType: 'number' },
            { name: 'X', kind: 'input', valueType: 'number' },
            { name: 'Y', kind: 'input', valueType: 'number' },
        ],
    },
    'motion_setx': {
        params: [
            { name: 'X', kind: 'input', valueType: 'number' },
        ],
    },
    'motion_sety': {
        params: [
            { name: 'Y', kind: 'input', valueType: 'number' },
        ],
    },
    'motion_changexby': {
        params: [
            { name: 'DX', kind: 'input', valueType: 'number' },
        ],
    },
    'motion_changeyby': {
        params: [
            { name: 'DY', kind: 'input', valueType: 'number' },
        ],
    },
    'motion_ifonedgebounce': {
        params: [],
    },
    'motion_pointindirection': {
        params: [
            { name: 'DIRECTION', kind: 'input', valueType: 'number' },
        ],
    },
    'motion_distanceto': {
        params: [
            { name: 'DISTANCETOMENU', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'motion_distancetomenu', field: 'DISTANCETOMENU' } },
        ],
    },
    'motion_glidesecstosprite': {
        params: [
            { name: 'SECS', kind: 'input', valueType: 'number' },
            { name: 'TO', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'motion_glidesecstosprite_menu', field: 'TO' } },
        ],
    },

    // --- Looks ---
    'looks_sayforsecs': {
        params: [
            { name: 'MESSAGE', kind: 'input', valueType: 'string' },
            { name: 'SECS', kind: 'input', valueType: 'number' },
        ],
    },
    'looks_think': {
        params: [
            { name: 'MESSAGE', kind: 'input', valueType: 'string' },
        ],
    },
    'looks_thinkforsecs': {
        params: [
            { name: 'MESSAGE', kind: 'input', valueType: 'string' },
            { name: 'SECS', kind: 'input', valueType: 'number' },
        ],
    },
    'looks_switchcostumeto': {
        params: [
            { name: 'COSTUME', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'looks_costume', field: 'COSTUME' } },
        ],
    },
    'looks_switchbackdropto': {
        params: [
            { name: 'BACKDROP', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'looks_backdrops', field: 'BACKDROP' } },
        ],
    },
    'looks_nextcostume': {
        params: [],
    },
    'looks_nextbackdrop': {
        params: [],
    },
    'looks_setsizeto': {
        params: [
            { name: 'SIZE', kind: 'input', valueType: 'number' },
        ],
    },
    'looks_changesizeby': {
        params: [
            { name: 'CHANGE', kind: 'input', valueType: 'number' },
        ],
    },
    'looks_show': {
        params: [],
    },
    'looks_hide': {
        params: [],
    },
    'looks_cleargraphiceffects': {
        params: [],
    },
    'looks_seteffectto': {
        params: [
            { name: 'EFFECT', kind: 'field', valueType: 'menu',
              menuValues: ['color', 'fisheye', 'whirl', 'pixelate', 'mosaic', 'brightness', 'ghost'] },
            { name: 'VALUE', kind: 'input', valueType: 'number' },
        ],
    },
    'looks_changeeffectby': {
        params: [
            { name: 'EFFECT', kind: 'field', valueType: 'menu',
              menuValues: ['color', 'fisheye', 'whirl', 'pixelate', 'mosaic', 'brightness', 'ghost'] },
            { name: 'CHANGE', kind: 'input', valueType: 'number' },
        ],
    },
    'looks_gotofrontback': {
        params: [
            { name: 'FRONT_BACK', kind: 'field', valueType: 'menu',
              menuValues: ['front', 'back'] },
        ],
    },
    'looks_goforwardbackwardlayers': {
        params: [
            { name: 'FORWARD_BACKWARD', kind: 'field', valueType: 'menu',
              menuValues: ['forward', 'backward'] },
            { name: 'NUM', kind: 'input', valueType: 'number' },
        ],
    },
    'looks_switchbackdroptoandwait': {
        params: [
            { name: 'BACKDROP', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'looks_backdrops', field: 'BACKDROP' } },
        ],
    },

    // --- Data ---
    'data_showvariable': {
        params: [
            { name: 'VARIABLE', kind: 'field', valueType: 'variable' },
        ],
    },
    'data_hidevariable': {
        params: [
            { name: 'VARIABLE', kind: 'field', valueType: 'variable' },
        ],
    },
    'data_showlist': {
        params: [
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },
    'data_hidelist': {
        params: [
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },
    'data_deletealloflist': {
        params: [
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },
    'data_addtolist': {
        params: [
            { name: 'ITEM', kind: 'input', valueType: 'string' },
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },
    'data_deleteoflist': {
        params: [
            { name: 'INDEX', kind: 'input', valueType: 'number' },
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },
    'data_insertatlist': {
        params: [
            { name: 'ITEM', kind: 'input', valueType: 'string' },
            { name: 'INDEX', kind: 'input', valueType: 'number' },
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },
    'data_replaceitemoflist': {
        params: [
            { name: 'INDEX', kind: 'input', valueType: 'number' },
            { name: 'ITEM', kind: 'input', valueType: 'string' },
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },
    'data_lengthoflist': {
        params: [
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },
    'data_listcontainsitem': {
        params: [
            { name: 'ITEM', kind: 'input', valueType: 'string' },
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },
    'data_itemoflist': {
        params: [
            { name: 'INDEX', kind: 'input', valueType: 'number' },
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },
    'data_itemnumoflist': {
        params: [
            { name: 'ITEM', kind: 'input', valueType: 'string' },
            { name: 'LIST', kind: 'field', valueType: 'list' },
        ],
    },

    // --- Sound ---
    'sound_play': {
        params: [
            { name: 'SOUND_MENU', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'sound_sounds_menu', field: 'SOUND_MENU' } },
        ],
    },
    'sound_playuntildone': {
        params: [
            { name: 'SOUND_MENU', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'sound_sounds_menu', field: 'SOUND_MENU' } },
        ],
    },
    'sound_stopallsounds': {
        params: [],
    },
    'sound_setvolumeto': {
        params: [
            { name: 'VOLUME', kind: 'input', valueType: 'number' },
        ],
    },
    'sound_changevolumeby': {
        params: [
            { name: 'VOLUME', kind: 'input', valueType: 'number' },
        ],
    },
    'sound_seteffectto': {
        params: [
            { name: 'SOUND_EFFECT', kind: 'field', valueType: 'menu',
              menuValues: ['PITCH', 'PAN'] },
            { name: 'VALUE', kind: 'input', valueType: 'number' },
        ],
    },
    'sound_changeeffectby': {
        params: [
            { name: 'SOUND_EFFECT', kind: 'field', valueType: 'menu',
              menuValues: ['PITCH', 'PAN'] },
            { name: 'VALUE', kind: 'input', valueType: 'number' },
        ],
    },
    'sound_cleareffects': {
        params: [],
    },

    // --- Event ---
    'event_broadcast': {
        params: [
            { name: 'BROADCAST_INPUT', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'event_broadcast_menu', field: 'BROADCAST_OPTION' } },
        ],
    },
    'event_broadcastandwait': {
        params: [
            { name: 'BROADCAST_INPUT', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'event_broadcast_menu', field: 'BROADCAST_OPTION' } },
        ],
    },
    // Note: hat/event blocks (event_whenflagclicked, event_whenkeypressed,
    // event_whenbackdropswitchesto, event_whengreaterthan, event_whenbroadcastreceived,
    // control_start_as_clone) are deliberately excluded — they're always topLevel with no
    // parent, so they can't function as a mid-script asm statement.

    // --- Sensing ---
    'sensing_touchingobject': {
        params: [
            { name: 'TOUCHINGOBJECTMENU', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'sensing_touchingobjectmenu', field: 'TOUCHINGOBJECTMENU' } },
        ],
    },
    'sensing_keypressed': {
        params: [
            { name: 'KEY_OPTION', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'sensing_keyoptions', field: 'KEY_OPTION' } },
        ],
    },
    'sensing_current': {
        params: [
            { name: 'CURRENTMENU', kind: 'field', valueType: 'menu',
              menuValues: ['YEAR', 'MONTH', 'DATE', 'DAYOFWEEK', 'HOUR', 'MINUTE', 'SECOND'] },
        ],
    },
    'sensing_of': {
        params: [
            { name: 'PROPERTY', kind: 'field', valueType: 'menu',
              menuValues: ['x position', 'y position', 'direction', 'costume #', 'costume name', 'size', 'volume'] },
            { name: 'OBJECT', kind: 'input', valueType: 'menu',
              menuShadow: { opcode: 'sensing_of_object_menu', field: 'OBJECT' } },
        ],
    },
    'sensing_askandwait': {
        params: [
            { name: 'QUESTION', kind: 'input', valueType: 'string' },
        ],
    },
    'sensing_resettimer': {
        params: [],
    },
    'sensing_setdragmode': {
        params: [
            { name: 'DRAG_MODE', kind: 'field', valueType: 'menu',
              menuValues: ['draggable', 'not draggable'] },
        ],
    },

    // --- Operators ---
    'operator_or': {
        params: [
            { name: 'OPERAND1', kind: 'input', valueType: 'boolean' },
            { name: 'OPERAND2', kind: 'input', valueType: 'boolean' },
        ],
    },
    'operator_and': {
        params: [
            { name: 'OPERAND1', kind: 'input', valueType: 'boolean' },
            { name: 'OPERAND2', kind: 'input', valueType: 'boolean' },
        ],
    },
    'operator_not': {
        params: [
            { name: 'OPERAND', kind: 'input', valueType: 'boolean' },
        ],
    },
    'operator_add': {
        params: [
            { name: 'NUM1', kind: 'input', valueType: 'number' },
            { name: 'NUM2', kind: 'input', valueType: 'number' },
        ],
    },
    'operator_subtract': {
        params: [
            { name: 'NUM1', kind: 'input', valueType: 'number' },
            { name: 'NUM2', kind: 'input', valueType: 'number' },
        ],
    },
    'operator_multiply': {
        params: [
            { name: 'NUM1', kind: 'input', valueType: 'number' },
            { name: 'NUM2', kind: 'input', valueType: 'number' },
        ],
    },
    'operator_divide': {
        params: [
            { name: 'NUM1', kind: 'input', valueType: 'number' },
            { name: 'NUM2', kind: 'input', valueType: 'number' },
        ],
    },
    'operator_mod': {
        params: [
            { name: 'NUM1', kind: 'input', valueType: 'number' },
            { name: 'NUM2', kind: 'input', valueType: 'number' },
        ],
    },
    'operator_lt': {
        params: [
            { name: 'OPERAND1', kind: 'input', valueType: 'number' },
            { name: 'OPERAND2', kind: 'input', valueType: 'number' },
        ],
    },
    'operator_gt': {
        params: [
            { name: 'OPERAND1', kind: 'input', valueType: 'number' },
            { name: 'OPERAND2', kind: 'input', valueType: 'number' },
        ],
    },
    'operator_equals': {
        params: [
            { name: 'OPERAND1', kind: 'input', valueType: 'string' },
            { name: 'OPERAND2', kind: 'input', valueType: 'string' },
        ],
    },
    'operator_mathop': {
        params: [
            { name: 'OPERATOR', kind: 'field', valueType: 'menu',
              menuValues: ['abs', 'floor', 'ceiling', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'ln', 'log', 'e ^', '10 ^'] },
            { name: 'NUM', kind: 'input', valueType: 'number' },
        ],
    },
    'operator_round': {
        params: [
            { name: 'NUM', kind: 'input', valueType: 'number' },
        ],
    },
    'operator_random': {
        params: [
            { name: 'FROM', kind: 'input', valueType: 'number' },
            { name: 'TO', kind: 'input', valueType: 'number' },
        ],
    },
    'operator_join': {
        params: [
            { name: 'STRING1', kind: 'input', valueType: 'string' },
            { name: 'STRING2', kind: 'input', valueType: 'string' },
        ],
    },
    'operator_letter_of': {
        params: [
            { name: 'LETTER', kind: 'input', valueType: 'number' },
            { name: 'STRING', kind: 'input', valueType: 'string' },
        ],
    },
    'operator_contains': {
        params: [
            { name: 'STRING1', kind: 'input', valueType: 'string' },
            { name: 'STRING2', kind: 'input', valueType: 'string' },
        ],
    },
    'operator_length': {
        params: [
            { name: 'STRING', kind: 'input', valueType: 'string' },
        ],
    },

    // --- Pen ---
    'pen_clear': {
        params: [],
    },
    'pen_stamp': {
        params: [],
    },
    'pen_penDown': {
        params: [],
    },
    'pen_penUp': {
        params: [],
    },
    'pen_setPenColorToColor': {
        params: [
            { name: 'COLOR', kind: 'input', valueType: 'string' },
        ],
    },
    'pen_setPenSizeTo': {
        params: [
            { name: 'SIZE', kind: 'input', valueType: 'number' },
        ],
    },
    'pen_changePenSizeBy': {
        params: [
            { name: 'SIZE', kind: 'input', valueType: 'number' },
        ],
    },
    'pen_setPenColorParamTo': {
        params: [
            { name: 'COLOR_PARAM', kind: 'input', valueType: 'menu',
              menuValues: ['color', 'saturation', 'brightness', 'transparency'],
              menuShadow: { opcode: 'pen_menu_colorParam', field: 'COLOR_PARAM' } },
            { name: 'VALUE', kind: 'input', valueType: 'number' },
        ],
    },
    'pen_changePenColorParamBy': {
        params: [
            { name: 'COLOR_PARAM', kind: 'input', valueType: 'menu',
              menuValues: ['color', 'saturation', 'brightness', 'transparency'],
              menuShadow: { opcode: 'pen_menu_colorParam', field: 'COLOR_PARAM' } },
            { name: 'VALUE', kind: 'input', valueType: 'number' },
        ],
    },

    // procedures_call excluded — needs a `mutation` object (proccode/argumentids) naming
    // which custom block to invoke, which this flat positional-arg model can't express.
    // Use the language's normal custom-block call syntax instead.
};
