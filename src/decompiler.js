import { formatSource } from "./format.js";
// [L2] Decompiler (Import)

// Read a field value from either internal {name,value} or sb3 [value,id] format
function fieldVal(block, name) {
    const f = block.fields && block.fields[name];
    if (!f) return null;
    return Array.isArray(f) ? f[0] : f.value;
}

// Return the "active" block object for an input (reporter over shadow)
function inpBlock(block, name, B) {
    const input = block.inputs && block.inputs[name];
    if (!input) return null;
    if (Array.isArray(input)) {
        const ref = input[1];
        return Array.isArray(ref) ? null : (B[ref] || null);
    }
    const id = (input.block !== null && input.block !== undefined) ? input.block : input.shadow;
    return id ? (B[id] || null) : null;
}

// Return just the block id for SUBSTACK inputs
function inpBlockId(block, name) {
    const input = block.inputs && block.inputs[name];
    if (!input) return null;
    if (Array.isArray(input)) {
        const ref = input[1];
        return Array.isArray(ref) ? null : ref;
    }
    return input.block || null;
}

// Decompile one input to a source string
function decompInput(block, name, B, isNum) {
    const input = block.inputs && block.inputs[name];
    if (!input) return isNum ? '0' : '""';
    return decompInputRaw(input, B, isNum);
}

function decompInputRaw(input, B, isNum) {
    let blockId, shadowId;
    if (Array.isArray(input)) {
        const ref = input[1];
        if (Array.isArray(ref)) {
            // inline primitive: [4,"10"] = number, [10,"text"] = string, [12,"var",id] = variable
            const t = ref[0];
            if (t === 4 || t === 5 || t === 6 || t === 7 || t === 8) return String(ref[1] ?? '0');
            if (t === 10) return JSON.stringify(String(ref[1] ?? '')).replace(/{/g, '{{').replace(/}/g, '}}');
            if (t === 11) return JSON.stringify(String(ref[1] ?? ''));  // broadcast name
            if (t === 12) return `[${ref[1]}]`;  // variable
            if (t === 13) return `[${ref[1]}]`;  // list
            return isNum ? '0' : '""';
        }
        blockId  = ref;
        shadowId = input[2] || null;
    } else {
        blockId  = input.block  ?? null;
        shadowId = input.shadow ?? null;
    }

    // If no reporter or block is the shadow, read from shadow
    if (blockId === null || blockId === shadowId) {
        if (!shadowId) return isNum ? '0' : '""';
        const s = B[shadowId];
        return s ? decompExpr(s, B) : (isNum ? '0' : '""');
    }
    const b = B[blockId];
    return b ? decompExpr(b, B) : (isNum ? '0' : '""');
}

function decompBroadcast(block, inputName, B) {
    const input = block.inputs && block.inputs[inputName];
    if (!input) return '""';
    // Handle inline type-11 broadcast primitive
    if (Array.isArray(input)) {
        const ref = input[1];
        if (Array.isArray(ref) && ref[0] === 11) return JSON.stringify(String(ref[1] ?? ''));
    }
    const id = Array.isArray(input)
        ? (Array.isArray(input[1]) ? null : input[1])
        : (input.block ?? input.shadow ?? null);
    const b = id && B[id];
    if (!b) return '""';
    if (b.opcode === 'event_broadcast_menu') return JSON.stringify(fieldVal(b, 'BROADCAST_OPTION') ?? '');
    return decompExpr(b, B);
}

function decompExpr(block, B) {
    if (!block) return 'false';
    switch (block.opcode) {
        case 'math_number':
        case 'math_integer':
        case 'math_angle':
        case 'math_whole_number':
        case 'math_positive_number': return String(fieldVal(block, 'NUM') ?? '0');
        // Literal braces must re-escape to {{ }} or the recompile would read them as interpolation
        case 'text':         return JSON.stringify(String(fieldVal(block, 'TEXT') ?? '')).replace(/{/g, '{{').replace(/}/g, '}}');
        case 'data_variable':return `[${fieldVal(block, 'VARIABLE') ?? ''}]`;
        case 'argument_reporter_string_number':
        case 'argument_reporter_boolean':
            return `[${fieldVal(block, 'VALUE') ?? ''}]`;
        case 'data_listcontents': return `[${fieldVal(block, 'LIST') ?? ''}]`;
        case 'colour_picker': return fieldVal(block, 'COLOUR') ?? '#000000';

        case 'motion_xposition':  return 'xPos';
        case 'motion_yposition':  return 'yPos';
        case 'motion_direction':  return 'direction';
        case 'looks_size':        return 'size';
        case 'looks_costumenumbername':
            return fieldVal(block, 'NUMBER_NAME') === 'name' ? 'costumeName' : 'costumeNum';
        case 'sensing_timer':     return 'timer';
        case 'sensing_answer':    return 'answer';
        case 'sensing_mousedown': return 'mouseDown';
        case 'sensing_mousex':    return 'mouseX';
        case 'sensing_mousey':    return 'mouseY';
        case 'sensing_loudness':      return 'loudness';
        case 'sound_volume':          return 'volume';
        case 'sensing_username':      return 'username';
        case 'sensing_dayssince2000': return 'daysSince2000';

        case 'operator_random':  return `random(${decompInput(block,'FROM',B,true)}, ${decompInput(block,'TO',B,true)})`;
        case 'operator_join': {
            // Interpolation re-sugar: flatten right-nested join chains. A chain of
            // ≥3 parts only arises from `"a {x} b"` interpolation (or equivalent
            // hand-nesting) — print it back as an interpolated string.
            const parts = [];
            let cur = block;
            while (cur && cur.opcode === 'operator_join') {
                parts.push([cur, 'STRING1']);
                const nxt = inpBlock(cur, 'STRING2', B);
                if (nxt && nxt.opcode === 'operator_join' && !nxt.shadow) cur = nxt;
                else { parts.push([cur, 'STRING2']); cur = null; }
            }
            if (parts.length >= 3) {
                let out = '"', ok = true;
                for (const [blk, slot] of parts) {
                    const inner = inpBlock(blk, slot, B);
                    const raw = decompInput(blk, slot, B, false);
                    const isLiteral = (!inner || inner.shadow) && raw.startsWith('"');
                    if (isLiteral) {
                        // raw is a JSON string with braces already {{ }}-escaped
                        let text;
                        try { text = JSON.parse(raw); } catch { ok = false; break; }
                        if (String(text).includes('"')) { ok = false; break; }
                        out += String(text);
                    } else {
                        out += `{${inner && !inner.shadow ? decompExpr(inner, B) : raw}}`;
                    }
                }
                if (ok) return out + '"';
            }
            return `join(${decompInput(block,'STRING1',B,false)}, ${decompInput(block,'STRING2',B,false)})`;
        }
        case 'operator_letter_of': return `letterOf(${decompInput(block,'LETTER',B,true)}, ${decompInput(block,'STRING',B,false)})`;
        case 'operator_contains':  return `contains(${decompInput(block,'STRING1',B,false)}, ${decompInput(block,'STRING2',B,false)})`;

        case 'motion_distanceto': {
            const menuId = inpBlockId(block, 'DISTANCETOMENU');
            const menu = menuId && B[menuId];
            return `distanceTo("${fieldVal(menu, 'DISTANCETOMENU') ?? '_mouse_'}")`;
        }
        case 'sensing_current': {
            const unit = (fieldVal(block, 'CURRENTMENU') ?? 'HOUR').toLowerCase();
            return `currentTime("${unit}")`;
        }
        case 'sensing_of': {
            const prop = fieldVal(block, 'PROPERTY') ?? '';
            const menuId = inpBlockId(block, 'OBJECT');
            const menu = menuId && B[menuId];
            const sprite = fieldVal(menu, 'OBJECT') ?? '';
            const REV_PROP = {
                'x position': 'xOf', 'y position': 'yOf', 'direction': 'directionOf',
                'costume #': 'costumeNumOf', 'costume name': 'costumeNameOf',
                'size': 'sizeOf', 'volume': 'volumeOf',
            };
            return `${REV_PROP[prop] ?? 'xOf'}("${sprite}")`;
        }

        case 'sensing_touchingobject': {
            const menuId = inpBlockId(block, 'TOUCHINGOBJECTMENU');
            const menu = menuId && B[menuId];
            return `touching("${fieldVal(menu, 'TOUCHINGOBJECTMENU') ?? '_edge_'}")`;
        }
        case 'sensing_keypressed': {
            const menuId = inpBlockId(block, 'KEY_OPTION');
            const menu = menuId && B[menuId];
            return `key("${fieldVal(menu, 'KEY_OPTION') ?? 'space'}")`;
        }

        case 'operator_add':      return `${decompInput(block,'NUM1',B,true)} + ${decompInput(block,'NUM2',B,true)}`;
        case 'operator_subtract': return `${decompInput(block,'NUM1',B,true)} - ${decompInput(block,'NUM2',B,true)}`;
        case 'operator_multiply': return `${decompInput(block,'NUM1',B,true)} * ${decompInput(block,'NUM2',B,true)}`;
        case 'operator_divide':   return `${decompInput(block,'NUM1',B,true)} / ${decompInput(block,'NUM2',B,true)}`;
        case 'operator_mod':      return `${decompInput(block,'NUM1',B,true)} mod ${decompInput(block,'NUM2',B,true)}`;
        case 'operator_lt':       return `${decompInput(block,'OPERAND1',B,true)} < ${decompInput(block,'OPERAND2',B,true)}`;
        case 'operator_gt':       return `${decompInput(block,'OPERAND1',B,true)} > ${decompInput(block,'OPERAND2',B,true)}`;
        case 'operator_equals': {
            const o1 = decompInput(block,'OPERAND1',B,false);
            const o2 = decompInput(block,'OPERAND2',B,false);
            // Boolean literals compile to `"1" = "1"` / `"1" = "0"`
            if (o1 === '"1"' && o2 === '"1"') return 'true';
            if (o1 === '"1"' && o2 === '"0"') return 'false';
            return `${o1} = ${o2}`;
        }
        case 'operator_and':      return `${decompExpr(inpBlock(block,'OPERAND1',B),B)} and ${decompExpr(inpBlock(block,'OPERAND2',B),B)}`;
        case 'operator_or':       return `${decompExpr(inpBlock(block,'OPERAND1',B),B)} or ${decompExpr(inpBlock(block,'OPERAND2',B),B)}`;
        case 'operator_not': {
            // Desugared comparisons: not(=) → !=, not(>) → <=, not(<) → >=
            const inner = inpBlock(block,'OPERAND',B);
            if (inner && inner.opcode === 'operator_equals') {
                const a = decompInput(inner,'OPERAND1',B,false), b = decompInput(inner,'OPERAND2',B,false);
                if (!(a === '"1"' && (b === '"1"' || b === '"0"'))) return `${a} != ${b}`;
            }
            if (inner && inner.opcode === 'operator_gt')
                return `${decompInput(inner,'OPERAND1',B,true)} <= ${decompInput(inner,'OPERAND2',B,true)}`;
            if (inner && inner.opcode === 'operator_lt')
                return `${decompInput(inner,'OPERAND1',B,true)} >= ${decompInput(inner,'OPERAND2',B,true)}`;
            return `not ${decompExpr(inner,B)}`;
        }
        case 'operator_length':   return `${decompInput(block,'STRING',B,false)}.length()`;
        case 'operator_round':    return `round(${decompInput(block,'NUM',B,true)})`;
        case 'operator_mathop': {
            const op  = fieldVal(block,'OPERATOR') ?? 'abs';
            const num = decompInput(block,'NUM',B,true);
            const REV = { 'abs':'abs','sqrt':'sqrt','floor':'floor','ceiling':'ceiling',
                          'sin':'sin','cos':'cos','tan':'tan',
                          'asin':'asin','acos':'acos','atan':'atan',
                          'ln':'ln','log':'log','e ^':'exp','10 ^':'pow10' };
            return `${REV[op] ?? `mathop_${op}`}(${num})`;
        }

        case 'data_lengthoflist':    return `[${fieldVal(block,'LIST') ?? ''}].length()`;
        case 'data_listcontainsitem': return `[${fieldVal(block,'LIST') ?? ''}].contains(${decompInput(block,'ITEM',B,false)})`;
        case 'data_itemoflist': {
            const listName = fieldVal(block,'LIST') ?? '';
            if (listName === '__heap') {
                // Heap read: literal slot → promoted variable; `p + i` between
                // two variable reads → `[p][i]`; anything else → `*(expr)`
                const idxBlk = inpBlock(block,'INDEX',B);
                if (!idxBlk || idxBlk.shadow) {
                    const n = Number(litVal(block,'INDEX',B));
                    if (Number.isInteger(n) && n >= 1 && n <= ptabNames.length) return `[${ptabNames[n-1]}]`;
                } else if (idxBlk.opcode === 'operator_add') {
                    const o1 = inpBlock(idxBlk,'NUM1',B);
                    const o2 = inpBlock(idxBlk,'NUM2',B);
                    const varish = (b) => b && (b.opcode === 'data_variable' || b.opcode === 'argument_reporter_string_number');
                    if (varish(o1) && varish(o2)) return `${decompExpr(o1,B)}${decompExpr(o2,B)}`;
                }
                return `*(${decompInput(block,'INDEX',B,true)})`;
            }
            return `[${listName}].item(${decompInput(block,'INDEX',B,true)})`;
        }
        case 'data_itemnumoflist': {
            const listName = fieldVal(block,'LIST') ?? '';
            if (listName === '__ptab') {
                const itemBlk = inpBlock(block,'ITEM',B);
                if (!itemBlk || itemBlk.shadow) {
                    try {
                        const name = JSON.parse(decompInput(block,'ITEM',B,false).replace(/{{/g,'{').replace(/}}/g,'}'));
                        return `&[${name}]`;
                    } catch (_) { /* fall through */ }
                }
            }
            return `[${listName}].indexOf(${decompInput(block,'ITEM',B,false)})`;
        }

        default: return `/* ${block.opcode} */`;
    }
}

function decompStmt(block, B, indent) {
    const I = indent, op = block.opcode;
    switch (op) {
        // Control
        case 'control_if': {
            const cond = decompExpr(inpBlock(block,'CONDITION',B), B);
            const body = decompChain(inpBlockId(block,'SUBSTACK'), B, I + '    ');
            return `${I}if ${cond} {\n${body}${I}}\n`;
        }
        case 'control_if_else': {
            const cond  = decompExpr(inpBlock(block,'CONDITION',B), B);
            const body  = decompChain(inpBlockId(block,'SUBSTACK'),  B, I + '    ');
            const body2 = decompChain(inpBlockId(block,'SUBSTACK2'), B, I + '    ');
            return `${I}if ${cond} {\n${body}${I}} else {\n${body2}${I}}\n`;
        }
        case 'control_repeat': {
            const times = decompInput(block,'TIMES',B,true);
            const body  = decompChain(inpBlockId(block,'SUBSTACK'), B, I + '    ');
            return `${I}repeat ${times} {\n${body}${I}}\n`;
        }
        case 'control_forever': {
            const body = decompChain(inpBlockId(block,'SUBSTACK'), B, I + '    ');
            return `${I}forever {\n${body}${I}}\n`;
        }
        case 'control_repeat_until': {
            const condBlock = inpBlock(block,'CONDITION',B);
            const lowered = decompLoweredLoop(block, condBlock, B, I);
            if (lowered !== null) return lowered;
            const body = decompChain(inpBlockId(block,'SUBSTACK'), B, I + '    ');
            if (condBlock && condBlock.opcode === 'operator_not') {
                const inner = decompExpr(inpBlock(condBlock,'OPERAND',B), B);
                return `${I}while (${inner}) {\n${body}${I}}\n`;
            }
            const cond = decompExpr(condBlock, B);
            return `${I}repeat until (${cond}) {\n${body}${I}}\n`;
        }
        case 'control_wait_until': {
            const cond = decompExpr(inpBlock(block,'CONDITION',B), B);
            return `${I}wait until ${cond}\n`;
        }
        case 'control_wait':
            return `${I}wait(${decompInput(block,'DURATION',B,true)})\n`;
        case 'control_stop': {
            const opt = fieldVal(block,'STOP_OPTION') ?? 'all';
            if (opt === 'all')    return `${I}stopAll()\n`;
            if (opt === 'this script') return `${I}stopThis()\n`;
            return `${I}stopOtherScripts()\n`;
        }
        case 'control_create_clone_of': {
            const menuId = inpBlockId(block, 'CLONE_OPTION');
            const menu   = menuId && B[menuId];
            const t      = menu ? fieldVal(menu, 'CLONE_OPTION') : '_myself_';
            return (!t || t === '_myself_') ? `${I}createClone()\n` : `${I}createClone("${t}")\n`;
        }
        case 'control_delete_this_clone': return `${I}deleteClone()\n`;

        // Motion
        case 'motion_movesteps':    return `${I}move(${decompInput(block,'STEPS',B,true)})\n`;
        case 'motion_turnright':    return `${I}turnRight(${decompInput(block,'DEGREES',B,true)})\n`;
        case 'motion_turnleft':     return `${I}turnLeft(${decompInput(block,'DEGREES',B,true)})\n`;
        case 'motion_gotoxy':       return `${I}goTo(${decompInput(block,'X',B,true)}, ${decompInput(block,'Y',B,true)})\n`;
        case 'motion_goto': {
            const menuId = inpBlockId(block,'TO');
            const menu   = menuId && B[menuId];
            return `${I}goTo("${fieldVal(menu,'TO') ?? '_mouse_'}")\n`;
        }
        case 'motion_glidesecstoxy':
            return `${I}glide(${decompInput(block,'SECS',B,true)}, ${decompInput(block,'X',B,true)}, ${decompInput(block,'Y',B,true)})\n`;
        case 'motion_setx':       return `${I}setX(${decompInput(block,'X',B,true)})\n`;
        case 'motion_sety':       return `${I}setY(${decompInput(block,'Y',B,true)})\n`;
        case 'motion_changexby':  return `${I}changeX(${decompInput(block,'DX',B,true)})\n`;
        case 'motion_changeyby':  return `${I}changeY(${decompInput(block,'DY',B,true)})\n`;
        case 'motion_ifonedgebounce':      return `${I}bounce()\n`;
        case 'motion_pointindirection':    return `${I}setDirection(${decompInput(block,'DIRECTION',B,true)})\n`;
        case 'motion_pointtowards': {
            const menuId = inpBlockId(block,'TOWARDS');
            const menu   = menuId && B[menuId];
            return `${I}pointTowards("${fieldVal(menu,'TOWARDS') ?? '_mouse_'}")\n`;
        }

        // Looks
        case 'looks_say':         return `${I}say(${decompInput(block,'MESSAGE',B,false)})\n`;
        case 'looks_sayforsecs':  return `${I}sayFor(${decompInput(block,'MESSAGE',B,false)}, ${decompInput(block,'SECS',B,true)})\n`;
        case 'looks_think':       return `${I}think(${decompInput(block,'MESSAGE',B,false)})\n`;
        case 'looks_thinkforsecs':return `${I}thinkFor(${decompInput(block,'MESSAGE',B,false)}, ${decompInput(block,'SECS',B,true)})\n`;
        case 'looks_switchcostumeto': {
            const menuId = inpBlockId(block,'COSTUME');
            const menu   = menuId && B[menuId];
            return `${I}switchCostume("${fieldVal(menu,'COSTUME') ?? ''}")\n`;
        }
        case 'looks_switchbackdropto': {
            const menuId = inpBlockId(block,'BACKDROP');
            const menu   = menuId && B[menuId];
            return `${I}switchBackdrop("${fieldVal(menu,'BACKDROP') ?? ''}")\n`;
        }
        case 'looks_nextcostume':  return `${I}nextCostume()\n`;
        case 'looks_nextbackdrop': return `${I}nextBackdrop()\n`;
        case 'looks_setsizeto':    return `${I}setSize(${decompInput(block,'SIZE',B,true)})\n`;
        case 'looks_changesizeby': return `${I}changeSize(${decompInput(block,'CHANGE',B,true)})\n`;
        case 'looks_show':         return `${I}show()\n`;
        case 'looks_hide':         return `${I}hide()\n`;
        case 'looks_cleargraphiceffects': return `${I}clearEffects()\n`;
        case 'looks_seteffectto':   return `${I}setEffect("${fieldVal(block,'EFFECT') ?? 'color'}", ${decompInput(block,'VALUE',B,true)})\n`;
        case 'looks_changeeffectby':return `${I}changeEffect("${fieldVal(block,'EFFECT') ?? 'color'}", ${decompInput(block,'CHANGE',B,true)})\n`;
        case 'looks_gotofrontback': {
            const fb = fieldVal(block,'FRONT_BACK') ?? 'front';
            return fb === 'back' ? `${I}goToBack()\n` : `${I}goToFront()\n`;
        }
        case 'looks_goforwardbackwardlayers': {
            const fb = fieldVal(block,'FORWARD_BACKWARD') ?? 'forward';
            return fb === 'backward'
                ? `${I}moveBackward(${decompInput(block,'NUM',B,true)})\n`
                : `${I}moveForward(${decompInput(block,'NUM',B,true)})\n`;
        }

        // Sound
        case 'sound_play': {
            const menuId = inpBlockId(block,'SOUND_MENU');
            const menu   = menuId && B[menuId];
            return `${I}play("${fieldVal(menu,'SOUND_MENU') ?? ''}")\n`;
        }
        case 'sound_playuntildone': {
            const menuId = inpBlockId(block,'SOUND_MENU');
            const menu   = menuId && B[menuId];
            return `${I}playUntilDone("${fieldVal(menu,'SOUND_MENU') ?? ''}")\n`;
        }
        case 'sound_stopallsounds':  return `${I}stopSounds()\n`;
        case 'sound_setvolumeto':    return `${I}setVolume(${decompInput(block,'VOLUME',B,true)})\n`;
        case 'sound_changevolumeby': return `${I}changeVolume(${decompInput(block,'VOLUME',B,true)})\n`;

        // Sensing
        case 'sensing_askandwait':  return `${I}askAndWait(${decompInput(block,'QUESTION',B,false)})\n`;
        case 'sensing_resettimer':  return `${I}resetTimer()\n`;
        case 'sensing_setdragmode': return `${I}setDragMode("${fieldVal(block,'DRAG_MODE') ?? 'draggable'}")\n`;

        // Pen
        case 'pen_penDown':  return `${I}penDown()\n`;
        case 'pen_penUp':    return `${I}penUp()\n`;
        case 'pen_clear':    return `${I}penClear()\n`;
        case 'pen_stamp':    return `${I}stamp()\n`;
        case 'pen_setPenColorToColor':
            return `${I}setPenColor(${decompInput(block,'COLOR',B,false)})\n`;
        case 'pen_setPenSizeTo':
            return `${I}setPenSize(${decompInput(block,'SIZE',B,true)})\n`;
        case 'pen_changePenSizeBy':
            return `${I}changePenSize(${decompInput(block,'SIZE',B,true)})\n`;
        case 'pen_setPenColorParamTo': {
            const menuId = inpBlockId(block,'COLOR_PARAM');
            const menu   = menuId && B[menuId];
            return `${I}setPenColorParam("${fieldVal(menu,'COLOR_PARAM') ?? 'color'}", ${decompInput(block,'VALUE',B,true)})\n`;
        }
        case 'pen_changePenColorParamBy': {
            const menuId = inpBlockId(block,'COLOR_PARAM');
            const menu   = menuId && B[menuId];
            return `${I}changePenColorParam("${fieldVal(menu,'COLOR_PARAM') ?? 'color'}", ${decompInput(block,'VALUE',B,true)})\n`;
        }

        // Data – list extras
        case 'data_deletealloflist': return `${I}listDeleteAll([${fieldVal(block,'LIST') ?? ''}])\n`;

        // Motion extras
        case 'motion_setrotationstyle': return `${I}setRotationStyle("${fieldVal(block,'STYLE') ?? 'all around'}")\n`;
        case 'motion_glidesecstosprite': {
            const menuId = inpBlockId(block,'TO');
            const menu   = menuId && B[menuId];
            return `${I}glide(${decompInput(block,'SECS',B,true)}, "${fieldVal(menu,'TO') ?? '_mouse_'}")\n`;
        }

        // Looks extras
        case 'looks_switchbackdroptoandwait': {
            const menuId = inpBlockId(block,'BACKDROP');
            const menu   = menuId && B[menuId];
            return `${I}switchBackdropAndWait("${fieldVal(menu,'BACKDROP') ?? ''}")\n`;
        }

        // Sound effects
        case 'sound_seteffectto':   return `${I}setSoundEffect("${fieldVal(block,'SOUND_EFFECT') ?? 'PITCH'}", ${decompInput(block,'VALUE',B,true)})\n`;
        case 'sound_changeeffectby':return `${I}changeSoundEffect("${fieldVal(block,'SOUND_EFFECT') ?? 'PITCH'}", ${decompInput(block,'VALUE',B,true)})\n`;
        case 'sound_cleareffects':  return `${I}clearSoundEffects()\n`;

        // Events
        case 'event_broadcast': {
            const bcastStr = decompBroadcast(block,'BROADCAST_INPUT',B);
            const srM = bcastStr.replace(/^"|"$/g,'').match(/^__sroutine_(.+)$/);
            if (srM) return `${I}launch ${srM[1]}()\n`;
            return `${I}broadcast(${bcastStr})\n`;
        }
        case 'event_broadcastandwait': {
            const bcastStr = decompBroadcast(block,'BROADCAST_INPUT',B);
            const srM = bcastStr.replace(/^"|"$/g,'').match(/^__sroutine_(.+)$/);
            if (srM) return `${I}await ${srM[1]}()\n`;
            return `${I}broadcastAndWait(${bcastStr})\n`;
        }

        // Data – variables
        case 'data_setvariableto': {
            const sv = fieldVal(block,'VARIABLE') ?? '';
            const cancelM = sv.match(/^__sroutine_(.+)_cancelled$/);
            if (cancelM) return `${I}cancel ${cancelM[1]}\n`;
            // Hide internal scratchroutine infrastructure vars from decompiled output
            if (sv.startsWith('__sroutine_') || /^_scratchpiler_internal_[a-z0-9]{4}_agg_/.test(sv)) {
                return '';
            }
            return `${I}set [${sv}] to ${decompInput(block,'VALUE',B,false)}\n`;
        }
        case 'data_changevariableby': {
            const cv = fieldVal(block,'VARIABLE') ?? '';
            if (cv.startsWith('__sroutine_') || /^_scratchpiler_internal_[a-z0-9]{4}_agg_/.test(cv)) {
                return '';
            }
            return `${I}change [${cv}] by ${decompInput(block,'VALUE',B,true)}\n`;
        }
        case 'data_showvariable': return `${I}showVariable([${fieldVal(block,'VARIABLE') ?? ''}])\n`;
        case 'data_hidevariable': return `${I}hideVariable([${fieldVal(block,'VARIABLE') ?? ''}])\n`;
        case 'data_showlist':     return `${I}showList([${fieldVal(block,'LIST') ?? ''}])\n`;
        case 'data_hidelist':     return `${I}hideList([${fieldVal(block,'LIST') ?? ''}])\n`;
        case 'data_addtolist':
            return `${I}listAdd(${decompInput(block,'ITEM',B,false)}, [${fieldVal(block,'LIST') ?? ''}])\n`;
        case 'data_deleteoflist':
            return `${I}listDelete(${decompInput(block,'INDEX',B,true)}, [${fieldVal(block,'LIST') ?? ''}])\n`;
        case 'data_insertatlist':
            return `${I}listInsert(${decompInput(block,'ITEM',B,false)}, ${decompInput(block,'INDEX',B,true)}, [${fieldVal(block,'LIST') ?? ''}])\n`;
        case 'data_replaceitemoflist': {
            const listName = fieldVal(block,'LIST') ?? '';
            if (listName === '__heap') {
                const idxBlk = inpBlock(block,'INDEX',B);
                const idxLit = (!idxBlk || idxBlk.shadow) ? Number(litVal(block,'INDEX',B)) : NaN;
                if (Number.isInteger(idxLit) && idxLit >= 1 && idxLit <= ptabNames.length) {
                    const name = ptabNames[idxLit-1];
                    // `change [x] by V` compiles to replace(slot, item(slot) + V)
                    const itemBlk = inpBlock(block,'ITEM',B);
                    if (itemBlk && itemBlk.opcode === 'operator_add') {
                        const a = inpBlock(itemBlk,'NUM1',B);
                        if (a && a.opcode === 'data_itemoflist' && (fieldVal(a,'LIST') ?? '') === '__heap') {
                            const aIdx = inpBlock(a,'INDEX',B);
                            if ((!aIdx || aIdx.shadow) && Number(litVal(a,'INDEX',B)) === idxLit) {
                                return `${I}change [${name}] by ${decompInput(itemBlk,'NUM2',B,true)}\n`;
                            }
                        }
                    }
                    return `${I}set [${name}] to ${decompInput(block,'ITEM',B,false)}\n`;
                }
                return `${I}set *(${decompInput(block,'INDEX',B,true)}) to ${decompInput(block,'ITEM',B,false)}\n`;
            }
            return `${I}listReplace(${decompInput(block,'INDEX',B,true)}, [${listName}], ${decompInput(block,'ITEM',B,false)})\n`;
        }

        // Custom block calls
        case 'procedures_call': {
            const proccode = (block.mutation && block.mutation.proccode) || '';
            const name     = proccode.split(' ')[0];
            const argIds   = JSON.parse((block.mutation && block.mutation.argumentids) || '[]');
            const argStrs  = argIds.map(aid => {
                const inputData = block.inputs && block.inputs[aid];
                return inputData ? decompInputRaw(inputData, B, false) : '""';
            });
            return `${I}${name}(${argStrs.join(', ')})\n`;
        }

        default:
            return `${I}// unsupported: ${op}\n`;
    }
}

// Name of the define currently being decompiled (for `return` recognition).
// The decompiler is synchronous, so a module-level slot is safe.
let currentDefineName = null;

// Promoted-variable name table (stage list __ptab), refreshed per decompile()
let ptabNames = [];

// --- P3 control-flow sugar recognition ---------------------------------------
// Hidden flag/temp variables produced by the lowering pass (src/lower.js).
const HID      = '_scratchpiler_internal_[a-z0-9]{4}';
const RE_BRK   = new RegExp(`^${HID}_brk\\d+$`);
const RE_CONT  = new RegExp(`^${HID}_cont\\d+$`);
const RE_REP   = new RegExp(`^${HID}_rep\\d+$`);
const RE_DW    = new RegExp(`^${HID}_dowhile\\d+$`);
const RE_MATCH = new RegExp(`^${HID}_match\\d+$`);

// Strip surrounding quotes from a decompiled literal ("5" → 5) when the
// content is numeric — the compiler stores literals in text shadows, so they
// decompile quoted even when the source wrote a bare number.
function unquoteNum(s) {
    const m = /^"(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)"$/i.exec(s);
    return m ? m[1] : s;
}

function litVal(block, name, B) {
    return decompInput(block, name, B, true).replace(/^"|"$/g, '');
}

// operator_equals(data_variable matching `re`, literal `val`) → var name | null
function isFlagEq(b, B, re, val) {
    if (!b || b.opcode !== 'operator_equals') return null;
    const o1 = inpBlock(b, 'OPERAND1', B);
    if (!o1 || o1.opcode !== 'data_variable') return null;
    const name = fieldVal(o1, 'VARIABLE') ?? '';
    if (!re.test(name)) return null;
    return litVal(b, 'OPERAND2', B) === val ? name : null;
}

// Guard condition wrapped around loop-body remainders: <brk = 0>, <cont = 0>,
// or an and() of the two.
function isGuardCond(b, B) {
    if (!b) return false;
    if (b.opcode === 'operator_and') {
        return isGuardCond(inpBlock(b, 'OPERAND1', B), B) &&
               isGuardCond(inpBlock(b, 'OPERAND2', B), B);
    }
    return !!(isFlagEq(b, B, RE_BRK, '0') || isFlagEq(b, B, RE_CONT, '0'));
}

function chainIds(startId, B) {
    const ids = [];
    let id = startId;
    while (id && B[id]) { ids.push(id); id = B[id].next; }
    return ids;
}

// `set [_.._matchN] to subject` + if/elif equals-chain → match statement.
// Returns { text, nextId } or null (pattern mismatch — emit normally).
function tryDecompMatch(setBlock, tag, B, indent) {
    const first = setBlock.next && B[setBlock.next];
    if (!first || (first.opcode !== 'control_if' && first.opcode !== 'control_if_else')) return null;
    const flatten = (b) => {
        if (!b) return null;
        if (b.opcode === 'operator_or') {
            const l = flatten(inpBlock(b, 'OPERAND1', B));
            const r = flatten(inpBlock(b, 'OPERAND2', B));
            return l && r ? [...l, ...r] : null;
        }
        if (b.opcode === 'operator_equals') {
            const o1 = inpBlock(b, 'OPERAND1', B);
            if (o1 && o1.opcode === 'data_variable' && (fieldVal(o1, 'VARIABLE') ?? '') === tag) {
                return [unquoteNum(decompInput(b, 'OPERAND2', B, false))];
            }
        }
        return null;
    };
    const I2 = indent + '    ', I3 = I2 + '    ';
    const cases = [];
    let defaultText = null;
    let cur = first;
    for (;;) {
        const values = flatten(inpBlock(cur, 'CONDITION', B));
        if (!values) return null;
        cases.push({ values, body: decompChain(inpBlockId(cur, 'SUBSTACK'), B, I3) });
        if (cur.opcode === 'control_if') break;
        const elseId  = inpBlockId(cur, 'SUBSTACK2');
        const elseBlk = elseId && B[elseId];
        if (elseBlk && !elseBlk.next &&
            (elseBlk.opcode === 'control_if' || elseBlk.opcode === 'control_if_else') &&
            flatten(inpBlock(elseBlk, 'CONDITION', B))) {
            cur = elseBlk;
            continue;
        }
        defaultText = decompChain(elseId, B, I3);
        break;
    }
    const subject = unquoteNum(decompInput(setBlock, 'VALUE', B, false));
    let text = `${indent}match ${subject} {\n`;
    for (const c of cases) text += `${I2}case ${c.values.join(', ')} {\n${c.body}${I2}}\n`;
    if (defaultText !== null) text += `${I2}default {\n${defaultText}${I2}}\n`;
    text += `${indent}}\n`;
    return { text, nextId: first.next || null };
}

// do { body } while cond: repeat_until whose body ends with `set [_.._dwN] to cond`
function decompDoWhile(block, B, I) {
    const startId = inpBlockId(block, 'SUBSTACK');
    const ids  = chainIds(startId, B);
    const last = ids.length ? B[ids[ids.length - 1]] : null;
    if (!last || last.opcode !== 'data_setvariableto' ||
        !RE_DW.test(fieldVal(last, 'VARIABLE') ?? '')) return null;
    let cond = decompInput(last, 'VALUE', B, false);
    const body = decompChain(startId, B, I + '    ', ids[ids.length - 1]);
    // A hoisted temp feeding the condition would have been consumed inside the
    // body chain — pull it from the leftovers.
    for (const [name, repl] of (decompChain.leftover || new Map())) {
        if (cond.includes(`[${name}]`)) cond = cond.split(`[${name}]`).join(repl);
    }
    return `${I}do {\n${body}${I}} while ${cond}\n`;
}

// Recognize the repeat-until shapes emitted for loops containing break/continue
// (and do-while). Returns decompiled text or null.
function decompLoweredLoop(block, condBlock, B, I) {
    // forever + break:  repeat until <brk = 1>
    if (isFlagEq(condBlock, B, RE_BRK, '1')) {
        const body = decompChain(inpBlockId(block, 'SUBSTACK'), B, I + '    ');
        return `${I}forever {\n${body}${I}}\n`;
    }
    // plain do-while:  repeat until <dw = "false">
    if (isFlagEq(condBlock, B, RE_DW, 'false')) return decompDoWhile(block, B, I);

    if (condBlock && condBlock.opcode === 'operator_or') {
        const aBlk = inpBlock(condBlock, 'OPERAND1', B);
        const bBlk = inpBlock(condBlock, 'OPERAND2', B);
        if (!isFlagEq(bBlk, B, RE_BRK, '1')) return null;
        // do-while + break:  repeat until <<dw = "false"> or <brk = 1>>
        if (isFlagEq(aBlk, B, RE_DW, 'false')) return decompDoWhile(block, B, I);
        if (aBlk && aBlk.opcode === 'operator_not') {
            const inner = inpBlock(aBlk, 'OPERAND', B);
            // repeat n + break:  repeat until <<not <rep < n>> or <brk = 1>> with
            // a trailing `change [rep] by 1`
            if (inner && inner.opcode === 'operator_lt') {
                const o1 = inpBlock(inner, 'OPERAND1', B);
                const repName = o1 && o1.opcode === 'data_variable' ? (fieldVal(o1, 'VARIABLE') ?? '') : '';
                if (RE_REP.test(repName)) {
                    const ids  = chainIds(inpBlockId(block, 'SUBSTACK'), B);
                    const last = ids.length ? B[ids[ids.length - 1]] : null;
                    if (last && last.opcode === 'data_changevariableby' &&
                        (fieldVal(last, 'VARIABLE') ?? '') === repName) {
                        const n = unquoteNum(decompInput(inner, 'OPERAND2', B, false));
                        const body = decompChain(inpBlockId(block, 'SUBSTACK'), B, I + '    ', ids[ids.length - 1]);
                        return `${I}repeat ${n} {\n${body}${I}}\n`;
                    }
                }
            }
            // while c + break:  repeat until <<not c> or <brk = 1>>
            const innerTxt = decompExpr(inner, B);
            const body = decompChain(inpBlockId(block, 'SUBSTACK'), B, I + '    ');
            return `${I}while (${innerTxt}) {\n${body}${I}}\n`;
        }
        // repeat until c + break:  repeat until <c or <brk = 1>>
        const condTxt = decompExpr(aBlk, B);
        const body = decompChain(inpBlockId(block, 'SUBSTACK'), B, I + '    ');
        return `${I}repeat until (${condTxt}) {\n${body}${I}}\n`;
    }
    return null;
}

function decompChain(startId, B, indent, stopId) {
    const lines = [];
    let id = startId;
    // Hoisted-expression reconstruction: ternary temps (`_.._ternN`) and
    // return-value captures (`_.._rvN`) are written directly before their
    // consumer; map temp name → inline source text and substitute into the
    // following statements instead of emitting the plumbing statements.
    const pendingTern = new Map();
    const substTern = (text) => {
        for (const [name, repl] of pendingTern) {
            if (text.includes(`[${name}]`)) {
                text = text.split(`[${name}]`).join(repl);
                pendingTern.delete(name);
            }
        }
        return text;
    };
    const pushLine = (text) => lines.push(substTern(text));
    while (id && id !== stopId) {
        const block = B[id];
        if (!block) break;

        // return <expr>: `set [__ret_<fn>] to E` + `stop this script`
        if (currentDefineName && block.opcode === 'data_setvariableto' &&
            (fieldVal(block, 'VARIABLE') ?? '') === `__ret_${currentDefineName}`) {
            const nxt = block.next && B[block.next];
            const val = decompInput(block, 'VALUE', B, false);
            if (nxt && nxt.opcode === 'control_stop' && (fieldVal(nxt, 'STOP_OPTION') ?? '') === 'this script') {
                pushLine(`${indent}return ${val}\n`);
                id = nxt.next || null;
                continue;
            }
            pushLine(`${indent}return ${val}\n`);
            id = block.next || null;
            continue;
        }

        // Hoisted returning call: `call f(args)` + `set [_.._rvN] to [__ret_f]`
        if (block.opcode === 'procedures_call' && block.next) {
            const nxt = B[block.next];
            const rvName = nxt && nxt.opcode === 'data_setvariableto' ? (fieldVal(nxt, 'VARIABLE') ?? '') : '';
            if (/^_scratchpiler_internal_[a-z0-9]{4}_rv\d+$/.test(rvName)) {
                const callName = ((block.mutation && block.mutation.proccode) || '').split(' ')[0];
                const valBlock = inpBlock(nxt, 'VALUE', B);
                if (valBlock && valBlock.opcode === 'data_variable' &&
                    (fieldVal(valBlock, 'VARIABLE') ?? '') === `__ret_${callName}`) {
                    const argIds  = JSON.parse((block.mutation && block.mutation.argumentids) || '[]');
                    const argStrs = argIds.map(aid => {
                        const inputData = block.inputs && block.inputs[aid];
                        return inputData ? decompInputRaw(inputData, B, false) : '""';
                    });
                    pendingTern.set(rvName, substTern(`${callName}(${argStrs.join(', ')})`));
                    id = nxt.next || null;
                    continue;
                }
            }
        }

        // Detect hoisted ternary: if/else whose branches each contain exactly
        // one `set [_.._ternN]` of the same temp variable.
        if (block.opcode === 'control_if_else') {
            const s1 = B[inpBlockId(block, 'SUBSTACK')];
            const s2 = B[inpBlockId(block, 'SUBSTACK2')];
            if (s1 && s2 && !s1.next && !s2.next &&
                s1.opcode === 'data_setvariableto' && s2.opcode === 'data_setvariableto') {
                const v1 = fieldVal(s1, 'VARIABLE') ?? '', v2 = fieldVal(s2, 'VARIABLE') ?? '';
                if (v1 === v2 && /^_scratchpiler_internal_[a-z0-9]{4}_tern\d+$/.test(v1)) {
                    const cond = decompExpr(inpBlock(block, 'CONDITION', B), B);
                    const a = decompInput(s1, 'VALUE', B, false);
                    const b = decompInput(s2, 'VALUE', B, false);
                    pendingTern.set(v1, `(${substTern(cond)} ? ${substTern(a)} : ${substTern(b)})`);
                    id = block.next || null;
                    continue;
                }
            }
        }

        // P3 control-flow plumbing: hidden flag inits vanish; flag sets become
        // break/continue; guard-ifs unwrap; `set [_.._matchN]` + if-chain → match.
        if (block.opcode === 'data_setvariableto') {
            const vn  = fieldVal(block, 'VARIABLE') ?? '';
            const val = litVal(block, 'VALUE', B);
            if ((RE_BRK.test(vn) || RE_CONT.test(vn) || RE_REP.test(vn)) && val === '0') { id = block.next || null; continue; }
            if (RE_DW.test(vn) && val === 'true')  { id = block.next || null; continue; }
            if (RE_BRK.test(vn) && val === '1')  { pushLine(`${indent}break\n`);    id = block.next || null; continue; }
            if (RE_CONT.test(vn) && val === '1') { pushLine(`${indent}continue\n`); id = block.next || null; continue; }
            if (RE_MATCH.test(vn)) {
                const res = tryDecompMatch(block, vn, B, indent);
                if (res) { pushLine(res.text); id = res.nextId; continue; }
            }
        }
        if (block.opcode === 'control_if' && isGuardCond(inpBlock(block, 'CONDITION', B), B)) {
            lines.push(decompChain(inpBlockId(block, 'SUBSTACK'), B, indent));
            id = block.next || null;
            continue;
        }

        // Detect compiled .sort(): set(gap,1) → repeat_until(phase1_knuth) → repeat_until(phase2_shell)
        if (block.opcode === 'data_setvariableto' &&
            /^_scratchpiler_internal_[a-z0-9]{4}_gap$/.test(fieldVal(block, 'VARIABLE') ?? '')) {
            const valStr  = decompInput(block, 'VALUE', B, true);
            const phase1  = block.next ? B[block.next] : null;
            const phase2  = phase1 && phase1.next ? B[phase1.next] : null;
            if (valStr === '1' &&
                phase1?.opcode === 'control_repeat_until' &&
                phase2?.opcode === 'control_repeat_until') {
                // Find sorted list name: BFS through phase2's substack for first replaceitemoflist
                const listName = (() => {
                    const q = [inpBlockId(phase2, 'SUBSTACK')];
                    const seen = new Set();
                    while (q.length) {
                        const bid = q.shift();
                        if (!bid || !B[bid] || seen.has(bid)) continue;
                        seen.add(bid);
                        const b = B[bid];
                        if (b.opcode === 'data_replaceitemoflist') return fieldVal(b, 'LIST');
                        if (b.next) q.push(b.next);
                        const sub = inpBlockId(b, 'SUBSTACK');
                        if (sub) q.push(sub);
                    }
                    return null;
                })();
                if (listName) {
                    // Detect descending: phase2 body → outer loop → shift loop → condition
                    // condition: OR(NOT(j>gap), NOT(item cmpOp tmp))
                    // ascending: inner cmp = operator_gt; descending: operator_lt
                    const isDesc = (() => {
                        let bid = inpBlockId(phase2, 'SUBSTACK');
                        while (bid && B[bid]) {
                            const b = B[bid];
                            if (b.opcode === 'control_repeat_until') {
                                let bid2 = inpBlockId(b, 'SUBSTACK');
                                while (bid2 && B[bid2]) {
                                    const b2 = B[bid2];
                                    if (b2.opcode === 'control_repeat_until') {
                                        const condId  = inpBlockId(b2, 'CONDITION');
                                        const condB   = condId && B[condId];
                                        if (condB?.opcode === 'operator_or') {
                                            const op2Id = inpBlockId(condB, 'OPERAND2');
                                            const op2B  = op2Id && B[op2Id];
                                            if (op2B?.opcode === 'operator_not') {
                                                const innerId = inpBlockId(op2B, 'OPERAND');
                                                const innerB  = innerId && B[innerId];
                                                return innerB?.opcode === 'operator_lt';
                                            }
                                        }
                                        return false;
                                    }
                                    bid2 = b2.next || null;
                                }
                                return false;
                            }
                            bid = b.next || null;
                        }
                        return false;
                    })();
                    pushLine(`${indent}[${listName}].sort${isDesc ? '("desc")' : '()'}\n`);
                    id = phase2.next || null;
                    continue;
                }
            }
        }

        // Detect compiled pyfor: set(internal_pyfor_ctr, 1) → repeat_until(ctr > list.length(), [set item, ...body, change ctr])
        if (block.opcode === 'data_setvariableto') {
            const ctrName = fieldVal(block, 'VARIABLE') ?? '';
            const mCtr = ctrName.match(/^_scratchpiler_internal_([a-z0-9]{4})_pyfor_ctr$/);
            if (mCtr && decompInput(block, 'VALUE', B, true) === '1') {
                const nextBlock = block.next && B[block.next];
                if (nextBlock && nextBlock.opcode === 'control_repeat_until') {
                    // Gather substack blocks
                    const substackIds = [];
                    let bid = inpBlockId(nextBlock, 'SUBSTACK');
                    while (bid && B[bid]) { substackIds.push(bid); bid = B[bid].next; }

                    // First substack block should be: set [item_var] to list.item(ctr)
                    const firstBid  = substackIds[0];
                    const firstBlk  = firstBid && B[firstBid];
                    const lastBid   = substackIds[substackIds.length - 1];
                    const lastBlk   = lastBid && B[lastBid];
                    const rand4     = mCtr[1];
                    if (firstBlk && firstBlk.opcode === 'data_setvariableto') {
                        const itemVarName = fieldVal(firstBlk, 'VARIABLE') ?? '';
                        const mItem = itemVarName.match(
                            new RegExp(`^_scratchpiler_internal_${rand4}_(.+)$`)
                        );
                        // Last block: change ctr by 1
                        const hasFinalIncr = lastBlk && lastBlk.opcode === 'data_changevariableby'
                                             && fieldVal(lastBlk, 'VARIABLE') === ctrName;
                        if (mItem) {
                            // Extract list name from condition: ctr > list.length()
                            const condBlock = B[inpBlockId(nextBlock, 'CONDITION')];
                            let listName = null;
                            if (condBlock && condBlock.opcode === 'operator_gt') {
                                const op2Block = B[inpBlockId(condBlock, 'OPERAND2')];
                                if (op2Block && op2Block.opcode === 'data_lengthoflist') {
                                    listName = fieldVal(op2Block, 'LIST');
                                }
                            }
                            if (listName) {
                                const shortName = mItem[1];
                                // body = substackIds minus first (set item) and last (change ctr)
                                const bodyIds = substackIds.slice(1, hasFinalIncr ? -1 : undefined);
                                let body = '';
                                for (const bid2 of bodyIds) body += decompStmt(B[bid2], B, indent + '    ');
                                pushLine(`${indent}pyfor [${shortName}] in [${listName}] {\n${body}${indent}}\n`);
                                id = nextBlock.next || null;
                                continue;
                            }
                        }
                    }
                }
            }
        }

        // Detect scratchroutine launch/await: one or more param-set blocks → broadcast("__sroutine_*")
        if (block.opcode === 'data_setvariableto') {
            const varName0 = fieldVal(block, 'VARIABLE') ?? '';
            const srParamMatch = varName0.match(/^__sroutine_(.+?)_(?!cancelled$|count$)(.+)$/);
            if (srParamMatch) {
                const rname = srParamMatch[1];
                // Collect all consecutive param-set blocks for this routine
                const paramArgs = [];
                let scanId = id;
                while (scanId && B[scanId]) {
                    const sb = B[scanId];
                    const sv = fieldVal(sb, 'VARIABLE') ?? '';
                    const pm = sv.match(new RegExp(`^__sroutine_${rname}_(?!cancelled$|count$)(.+)$`));
                    if (sb.opcode === 'data_setvariableto' && pm) {
                        paramArgs.push(decompInput(sb, 'VALUE', B, false));
                        scanId = sb.next || null;
                    } else break;
                }
                // Check if next is the broadcast for this routine
                const bcastBlock = scanId && B[scanId];
                const isBcast = bcastBlock &&
                    (bcastBlock.opcode === 'event_broadcast' || bcastBlock.opcode === 'event_broadcastandwait');
                if (isBcast) {
                    const inputBlock = inpBlock(bcastBlock, 'BROADCAST_INPUT', B);
                    const msgVal = inputBlock && inputBlock.opcode === 'event_broadcast_menu'
                        ? (fieldVal(inputBlock, 'BROADCAST_OPTION') ?? '')
                        : decompInput(bcastBlock, 'BROADCAST_INPUT', B, false).replace(/^"|"$/g, '');
                    if (msgVal === `__sroutine_${rname}`) {
                        const kw = bcastBlock.opcode === 'event_broadcastandwait' ? 'await' : 'launch';
                        const argsStr = paramArgs.length ? `(${paramArgs.join(', ')})` : '()';
                        pushLine(`${indent}${kw} ${rname}${argsStr}\n`);
                        id = bcastBlock.next || null;
                        continue;
                    }
                }
            }
        }

        // Detect compiled for-loop: set(internal_iter) → repeat_until(iter > end, [...body, change(iter, 1)])
        if (block.opcode === 'data_setvariableto') {
            const iterName = fieldVal(block, 'VARIABLE') ?? '';
            const m = iterName.match(/^_scratchpiler_internal_[a-z0-9]{4}_(.+)$/);
            if (m) {
                const nextBlock = block.next && B[block.next];
                if (nextBlock && nextBlock.opcode === 'control_repeat_until') {
                    const condBlock = B[inpBlockId(nextBlock, 'CONDITION')];
                    if (condBlock && condBlock.opcode === 'operator_gt') {
                        const op1Block = B[inpBlockId(condBlock, 'OPERAND1')];
                        if (op1Block && op1Block.opcode === 'data_variable' &&
                            fieldVal(op1Block, 'VARIABLE') === iterName) {
                            const shortName = m[1];
                            const startExpr = decompInput(block, 'VALUE', B, true);
                            const endExpr   = decompInput(condBlock, 'OPERAND2', B, true);

                            // Collect substack block ids
                            const substackIds = [];
                            let bid = inpBlockId(nextBlock, 'SUBSTACK');
                            while (bid && B[bid]) { substackIds.push(bid); bid = B[bid].next; }

                            // Strip trailing increment block for the same iterator
                            const lastBid  = substackIds[substackIds.length - 1];
                            const lastBlk  = lastBid && B[lastBid];
                            const hasIncr  = lastBlk && lastBlk.opcode === 'data_changevariableby'
                                             && fieldVal(lastBlk, 'VARIABLE') === iterName;
                            const bodyIds  = hasIncr ? substackIds.slice(0, -1) : substackIds;

                            let body = '';
                            for (const bid of bodyIds) body += decompStmt(B[bid], B, indent + '    ');
                            pushLine(`${indent}for [${shortName}] from ${startExpr} to ${endExpr} {\n${body}${indent}}\n`);
                            id = nextBlock.next || null;
                            continue;
                        }
                    }
                }
            }
        }

        pushLine(decompStmt(block, B, indent));
        id = block.next || null;
    }
    // Unconsumed pending substitutions (e.g. a hoisted temp feeding a stripped
    // do-while condition) are exposed for the caller.
    decompChain.leftover = pendingTern;
    return lines.join('');
}

// Does this statement chain (including nested substacks) set the given variable?
function chainHasSet(startId, B, varName) {
    const q = [startId];
    const seen = new Set();
    while (q.length) {
        const bid = q.shift();
        if (!bid || !B[bid] || seen.has(bid)) continue;
        seen.add(bid);
        const b = B[bid];
        if (b.opcode === 'data_setvariableto' && (fieldVal(b, 'VARIABLE') ?? '') === varName) return true;
        if (b.next) q.push(b.next);
        for (const slot of ['SUBSTACK', 'SUBSTACK2']) {
            const sub = inpBlockId(b, slot);
            if (sub) q.push(sub);
        }
    }
    return false;
}

function decompScript(hat, B) {
    // Custom define block
    if (hat.opcode === 'procedures_definition') {
        const protoInput = hat.inputs && hat.inputs.custom_block;
        const protoId = protoInput
            ? (Array.isArray(protoInput) ? protoInput[1] : protoInput.block)
            : null;
        const proto = protoId && B[protoId];
        if (!proto || !proto.mutation) return null;
        const proccode = proto.mutation.proccode || '';
        const name     = proccode.split(' ')[0];
        const params   = JSON.parse(proto.mutation.argumentnames || '[]');
        // The hidden heap allocator defines are compiler-generated: suppress
        // them (they are re-spliced on every compile that uses alloc/free).
        if ((name === 'alloc' || name === 'free') && chainHasSet(hat.next, B, '__heap_free')) return null;
        currentDefineName = name;
        const body     = decompChain(hat.next, B, '    ');
        const isReturns = chainHasSet(hat.next, B, `__ret_${name}`);
        currentDefineName = null;
        return `define ${name}(${params.join(', ')})${isReturns ? ' returns' : ''} {\n${body}}`;
    }

    // Hat block
    let header;
    switch (hat.opcode) {
        case 'event_whenflagclicked':       header = 'on flag'; break;
        case 'event_whenthisspriteclicked': header = 'on click'; break;
        case 'event_whenstageclicked':      header = 'on click'; break;
        case 'control_start_as_clone':      header = 'on clone'; break;
        case 'event_whenkeypressed':
            header = `on key "${fieldVal(hat,'KEY_OPTION') ?? 'space'}"`;
            break;
        case 'event_whenbroadcastreceived': {
            const bcastVal = fieldVal(hat,'BROADCAST_OPTION') ?? '';
            const srMatch  = bcastVal.match(/^__sroutine_(.+)$/);
            if (srMatch) {
                const rname = srMatch[1];
                // Strip the scratchroutine preamble (set cancelled=0 + change count by 1)
                // and postamble (change count by -1) from the body
                let bodyStr = decompChain(hat.next, B, '    ');
                // The first two lines are preamble, the last is postamble
                const bodyLines = bodyStr.split('\n').filter(l => l.trim());
                const firstLine = bodyLines[0] || '';
                const secondLine = bodyLines[1] || '';
                const lastLine  = bodyLines[bodyLines.length - 1] || '';
                const isPreamble1 = firstLine.includes(`__sroutine_${rname}_cancelled`);
                const isPreamble2 = secondLine.includes(`__sroutine_${rname}_count`);
                const isPostamble = lastLine.includes(`__sroutine_${rname}_count`);
                const userLines = bodyLines.slice(
                    (isPreamble1 ? 1 : 0) + (isPreamble2 ? 1 : 0),
                    isPostamble ? bodyLines.length - 1 : bodyLines.length
                );
                return `scratchroutine ${rname} {\n${userLines.map(l => l + '\n').join('')}}`;
            }
            header = `on receive "${bcastVal}"`;
            break;
        }
        case 'event_whenbackdropswitchesto':
            header = `on backdrop "${fieldVal(hat,'BACKDROP') ?? ''}"`;
            break;
        case 'event_whengreaterthan': {
            const sense = (fieldVal(hat,'WHENGREATERTHANMENU') ?? 'TIMER').toLowerCase();
            const valStr = decompInput(hat,'VALUE',B,true);
            header = `on ${sense} > ${valStr}`;
            break;
        }
        default:
            return `// unsupported hat: ${hat.opcode}`;
    }
    const body = decompChain(hat.next, B, '    ');
    return `${header} {\n${body}}`;
}

export function decompile(vm, spriteName) {
    const target = spriteName === '__stage__'
        ? vm.runtime.targets.find(t => t.isStage)
        : (vm.runtime.targets.find(t => !t.isStage && t.sprite.name === spriteName) || vm.editingTarget);
    if (!target) return '// Error: sprite not found\n';

    // Pointer support: __ptab (on the stage) names the promoted-variable heap
    // slots — needed to print heap reads/writes as plain variable accesses.
    ptabNames = [];
    const stageT = vm.runtime.targets.find(t => t.isStage);
    if (stageT) {
        const pt = Object.values(stageT.variables).find(v => v.name === '__ptab' && v.type === 'list');
        if (pt && Array.isArray(pt.value)) ptabNames = pt.value.map(String);
    }

    const B = target.blocks._blocks;
    const roots = Object.values(B)
        .filter(b => b.topLevel && !b.shadow)
        .sort((a, b) => (a.x ?? 0) - (b.x ?? 0));

    // Header-origin scripts (marked with a `scratchpiler:include=name.h`
    // workspace comment at inject time) collapse back to their #include line.
    // Without the marker they degrade gracefully to the expanded form.
    const headerOf = {};
    for (const c of Object.values(target.comments || {})) {
        const m = typeof c?.text === 'string' && c.text.match(/^scratchpiler:include=([\w-]+\.h)$/);
        if (m && c.blockId) headerOf[c.blockId] = m[1];
    }
    const includes = new Set();
    const scripts = [];
    for (const r of roots) {
        if (headerOf[r.id]) { includes.add(headerOf[r.id]); continue; }
        const s = decompScript(r, B);
        if (s) scripts.push(s);
    }
    const includeLines = [...includes].sort().map(h => `#include <${h}>`).join('\n');
    const body = scripts.join('\n\n');
    return (includeLines ? includeLines + '\n\n' : '') + body + '\n';
}


