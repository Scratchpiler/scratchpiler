import { formatSource } from "./injector.js";
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
            if (t === 10) return JSON.stringify(String(ref[1] ?? ''));
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
        case 'text':         return JSON.stringify(String(fieldVal(block, 'TEXT') ?? ''));
        case 'data_variable':return `[${fieldVal(block, 'VARIABLE') ?? ''}]`;
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
        case 'operator_join':    return `join(${decompInput(block,'STRING1',B,false)}, ${decompInput(block,'STRING2',B,false)})`;
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
        case 'operator_equals':   return `${decompInput(block,'OPERAND1',B,false)} = ${decompInput(block,'OPERAND2',B,false)}`;
        case 'operator_and':      return `${decompExpr(inpBlock(block,'OPERAND1',B),B)} and ${decompExpr(inpBlock(block,'OPERAND2',B),B)}`;
        case 'operator_or':       return `${decompExpr(inpBlock(block,'OPERAND1',B),B)} or ${decompExpr(inpBlock(block,'OPERAND2',B),B)}`;
        case 'operator_not':      return `not ${decompExpr(inpBlock(block,'OPERAND',B),B)}`;
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
        case 'data_itemoflist':      return `[${fieldVal(block,'LIST') ?? ''}].item(${decompInput(block,'INDEX',B,true)})`;
        case 'data_itemnumoflist':   return `[${fieldVal(block,'LIST') ?? ''}].indexOf(${decompInput(block,'ITEM',B,false)})`;

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
        case 'data_replaceitemoflist':
            return `${I}listReplace(${decompInput(block,'INDEX',B,true)}, [${fieldVal(block,'LIST') ?? ''}], ${decompInput(block,'ITEM',B,false)})\n`;

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

function decompChain(startId, B, indent) {
    const lines = [];
    let id = startId;
    while (id) {
        const block = B[id];
        if (!block) break;

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
                    lines.push(`${indent}[${listName}].sort${isDesc ? '("desc")' : '()'}\n`);
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
                                lines.push(`${indent}pyfor [${shortName}] in [${listName}] {\n${body}${indent}}\n`);
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
                        lines.push(`${indent}${kw} ${rname}${argsStr}\n`);
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
                            lines.push(`${indent}for [${shortName}] from ${startExpr} to ${endExpr} {\n${body}${indent}}\n`);
                            id = nextBlock.next || null;
                            continue;
                        }
                    }
                }
            }
        }

        lines.push(decompStmt(block, B, indent));
        id = block.next || null;
    }
    return lines.join('');
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
        const body     = decompChain(hat.next, B, '    ');
        return `define ${name}(${params.join(', ')}) {\n${body}}`;
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

    const B = target.blocks._blocks;
    const roots = Object.values(B)
        .filter(b => b.topLevel && !b.shadow)
        .sort((a, b) => (a.x ?? 0) - (b.x ?? 0));

    return roots.map(r => decompScript(r, B)).filter(Boolean).join('\n\n') + '\n';
}


