// ==UserScript==
// @name         Scratchpiler
// @namespace    https://scratch.mit.edu/
// @version      1.0.0
// @author       Earth1283
// @description  Monaco-powered DSL compiler and editor overlay for Scratch
// @icon         data:image/png;base64,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
// @match        https://scratch.mit.edu/projects/editor/*
// @match        https://scratch.mit.edu/projects/*/editor*
// @run-at       document-idle
// @grant        unsafeWindow
// ==/UserScript==

(() => {
  // src/constants.js
  var MONACO_CDN = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.0/min";
  var LANG_ID = "scratchpiler";
  var LS_KEY = "scratchpiler-content";
  var LS_INJ_KEY = "scratchpiler-injected";

  // src/vm.js
  function getFiberRoot() {
    const candidates = [
      document.getElementById("app"),
      document.querySelector('[class*="gui_"]'),
      document.querySelector('[class*="scratch-gui"]'),
      document.body
    ];
    for (const el of candidates) {
      if (!el) continue;
      const key = Object.keys(el).find(
        (k) => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")
      );
      if (!key) continue;
      let fiber = el[key];
      while (fiber.return) fiber = fiber.return;
      return fiber;
    }
    return null;
  }
  function isValidVM(v) {
    return v != null && typeof v.runtime === "object" && v.runtime.targets !== void 0 && typeof v.on === "function";
  }
  function bfsFindVM(rootFiber) {
    const queue = [rootFiber];
    const depths = /* @__PURE__ */ new Map([[rootFiber, 0]]);
    const visited = /* @__PURE__ */ new Set();
    while (queue.length) {
      const node = queue.shift();
      if (!node || visited.has(node)) continue;
      visited.add(node);
      const depth = depths.get(node) ?? 0;
      if (depth > 200) continue;
      for (const k of ["memoizedProps", "pendingProps"]) {
        const p = node[k];
        if (p && p.vm && isValidVM(p.vm)) return p.vm;
      }
      const sn = node.stateNode;
      if (sn && sn.props && sn.props.vm && isValidVM(sn.props.vm)) return sn.props.vm;
      if (node.child) {
        depths.set(node.child, depth + 1);
        queue.push(node.child);
      }
      if (node.sibling) {
        depths.set(node.sibling, depth);
        queue.push(node.sibling);
      }
    }
    return null;
  }
  function acquireVM(onFound, onTimeout) {
    if (isValidVM(unsafeWindow.vm)) {
      onFound(unsafeWindow.vm);
      return;
    }
    let attempts = 0;
    const iv = setInterval(() => {
      if (++attempts > 30) {
        clearInterval(iv);
        const root2 = getFiberRoot();
        console.warn(
          "[scratchpiler] VM not found. getFiberRoot()=",
          root2,
          "unsafeWindow.vm=",
          unsafeWindow.vm,
          "app el=",
          document.getElementById("app"),
          "body keys with __react=",
          Object.keys(document.body).filter((k) => k.startsWith("__react"))
        );
        if (root2) {
          let n = root2;
          let i = 0;
          while (n && i++ < 5) {
            console.warn("[scratchpiler] fiber node", i, n.type, n.memoizedProps);
            n = n.child;
          }
        }
        onTimeout();
        return;
      }
      if (isValidVM(unsafeWindow.vm)) {
        clearInterval(iv);
        onFound(unsafeWindow.vm);
        return;
      }
      const root = getFiberRoot();
      if (!root) return;
      const vm = bfsFindVM(root);
      if (vm) {
        clearInterval(iv);
        onFound(vm);
      }
    }, 500);
  }
  var scratchIndex = {
    sprites: [],
    // [{ name, costumes: string[], sounds: string[] }]
    stage: { backdrops: [], sounds: [] },
    globalVariables: [],
    // [{ name, id, type }]
    spriteVariables: {},
    // { spriteName: [{ name, id, type }] }
    customBlocks: {}
    // { spriteName: string[] }
  };
  function reindex(vm) {
    const idx = {
      sprites: [],
      stage: { backdrops: [], sounds: [] },
      globalVariables: [],
      spriteVariables: {},
      customBlocks: {}
    };
    for (const target of vm.runtime.targets) {
      const costumes = target.sprite.costumes.map((c) => c.name);
      const sounds = target.sprite.sounds.map((s) => s.name);
      const vars = Object.values(target.variables).map((v) => ({
        name: v.name,
        id: v.id,
        type: v.type === "list" ? "list" : "variable"
      }));
      if (target.isStage) {
        idx.stage.backdrops = costumes;
        idx.stage.sounds = sounds;
        idx.globalVariables = vars;
      } else {
        const name = target.sprite.name;
        idx.sprites.push({ name, costumes, sounds });
        idx.spriteVariables[name] = vars;
        idx.customBlocks[name] = Object.values(target.blocks._blocks).filter((b) => b.opcode === "procedures_prototype").map((b) => b.mutation && b.mutation.proccode).filter(Boolean);
      }
    }
    scratchIndex = idx;
    updateStatus(`Index: ${idx.sprites.length} sprites, ${idx.globalVariables.length} globals`);
  }

  // src/monaco.js
  function loadMonaco(callback) {
    unsafeWindow.MonacoEnvironment = {
      getWorkerUrl() {
        const blob = new Blob(
          [`importScripts('${MONACO_CDN}/vs/base/worker/workerMain.js');`],
          { type: "application/javascript" }
        );
        return URL.createObjectURL(blob);
      }
    };
    const _req = unsafeWindow.require;
    const _def = unsafeWindow.define;
    const script = document.createElement("script");
    script.src = `${MONACO_CDN}/vs/loader.js`;
    script.onload = () => {
      unsafeWindow.require.config({ paths: { vs: `${MONACO_CDN}/vs` } });
      unsafeWindow.require(["vs/editor/editor.main"], () => {
        unsafeWindow.require = _req;
        unsafeWindow.define = _def;
        callback(unsafeWindow.monaco);
      });
    };
    document.head.appendChild(script);
  }

  // src/injector.js
  function formatSource(src) {
    try {
      const lines = src.split("\n");
      const result = [];
      let indent = 0;
      for (let raw of lines) {
        const trimmed = raw.trim();
        if (!trimmed) {
          result.push("");
          continue;
        }
        if (trimmed.startsWith("}")) indent = Math.max(0, indent - 1);
        result.push("    ".repeat(indent) + trimmed);
        if (trimmed.endsWith("{")) indent++;
      }
      return result.join("\n");
    } catch (_) {
      return null;
    }
  }
  function injectBlocks(blockMap, vm, spriteName) {
    const target = spriteName === "__stage__" ? vm.runtime.targets.find((t) => t.isStage) : vm.runtime.targets.find((t) => !t.isStage && t.sprite.name === spriteName) || vm.editingTarget;
    if (!target) {
      updateStatus("Error: sprite not found");
      return;
    }
    restoreInjectedIds(spriteName);
    function hatSig(block, blocks) {
      switch (block.opcode) {
        case "event_whenflagclicked":
        case "event_whenthisspriteclicked":
        case "event_whenstageclicked":
        case "control_start_as_clone":
          return block.opcode;
        case "event_whenkeypressed":
          return block.opcode + ":" + (block.fields?.KEY_OPTION?.value ?? "");
        case "event_whenbroadcastreceived":
          return block.opcode + ":" + (block.fields?.BROADCAST_OPTION?.value ?? "");
        case "event_whenbackdropswitchesto":
          return block.opcode + ":" + (block.fields?.BACKDROP?.value ?? "");
        case "event_whengreaterthan":
          return block.opcode + ":" + (block.fields?.WHICHINPUT?.value ?? "");
        case "procedures_definition": {
          const inp = block.inputs?.custom_block;
          const protoId = inp ? Array.isArray(inp) ? inp[1] : inp.block ?? inp.shadow : null;
          const proto = protoId && blocks[protoId];
          return block.opcode + ":" + (proto?.mutation?.proccode ?? "");
        }
        default:
          return block.opcode;
      }
    }
    const incomingSigs = /* @__PURE__ */ new Set();
    for (const b of Object.values(blockMap)) {
      if (b.topLevel && !b.shadow) incomingSigs.add(hatSig(b, blockMap));
    }
    const idsToDelete = new Set(injectedBlockIds.get(spriteName) ?? []);
    const existingBlocks = target.blocks._blocks ?? {};
    for (const [id, b] of Object.entries(existingBlocks)) {
      if (b.topLevel && !b.shadow && incomingSigs.has(hatSig(b, existingBlocks))) {
        idsToDelete.add(id);
      }
    }
    for (const id of idsToDelete) {
      try {
        target.blocks.deleteBlock(id);
      } catch (_) {
      }
    }
    const newTopLevelIds = new Set(
      Object.values(blockMap).filter((b) => b.topLevel && !b.shadow).map((b) => b.id)
    );
    let count = 0;
    for (const block of Object.values(blockMap)) {
      try {
        target.blocks.createBlock(block);
        count++;
      } catch (e) {
        console.warn("[scratchpiler] block create failed", block.id, e);
      }
    }
    injectedBlockIds.set(spriteName, newTopLevelIds);
    persistInjectedIds(spriteName);
    try {
      vm.setEditingTarget(target.id);
    } catch (_) {
      try {
        vm.emitWorkspaceUpdate();
      } catch (__) {
        console.warn("[scratchpiler] workspace refresh failed", __);
      }
    }
    updateStatus(`Injected ${count} blocks into "${spriteName}"`);
  }

  // src/language.js
  var KEYWORDS2 = [
    // Control flow
    "on",
    "if",
    "else",
    "forever",
    "repeat",
    "until",
    "while",
    "for",
    "from",
    "wait",
    "define",
    "pyfor",
    "in",
    // Operators
    "and",
    "or",
    "not",
    "mod",
    // Hat events
    "flag",
    "click",
    "clone",
    "receive",
    "backdrop",
    // Variable ops (keep space-form)
    "set",
    "change",
    "to",
    "by",
    // Motion
    "move",
    "turnRight",
    "turnLeft",
    "goTo",
    "glide",
    "bounce",
    "setX",
    "setY",
    "changeX",
    "changeY",
    "setRotationStyle",
    // Looks
    "say",
    "sayFor",
    "think",
    "thinkFor",
    "switchCostume",
    "switchBackdrop",
    "switchBackdropAndWait",
    "nextCostume",
    "nextBackdrop",
    "setSize",
    "changeSize",
    "show",
    "hide",
    "clearEffects",
    // Sound
    "play",
    "playUntilDone",
    "stopSounds",
    "setSoundEffect",
    "changeSoundEffect",
    "clearSoundEffects",
    // Events
    "broadcast",
    "broadcastAndWait",
    // Control statements
    "stopAll",
    "stopThis",
    "stopOtherScripts",
    "createClone",
    "deleteClone",
    // Data
    "showVariable",
    "hideVariable",
    "showList",
    "hideList",
    "listAdd",
    "listDelete",
    "listInsert",
    "listReplace",
    "listDeleteAll",
    // Sensing
    "setDragMode",
    // Reporters
    "xPos",
    "yPos",
    "direction",
    "costumeNum",
    "costumeName",
    "timer",
    "mouseDown",
    "mouseX",
    "mouseY",
    "loudness",
    "answer",
    "volume",
    "username",
    "daysSince2000",
    // Sensing (expression context)
    "touching",
    "key",
    // Motion extras (v1.0)
    "setDirection",
    "turnTo",
    "pointTowards",
    "goToFront",
    "goToBack",
    "moveForward",
    "moveBackward",
    // Looks extras (v1.0)
    "setEffect",
    "changeEffect",
    // Sound extras (v1.0)
    "setVolume",
    "changeVolume",
    // Sensing extras (v1.0)
    "askAndWait",
    "resetTimer",
    // Ergonomic aliases
    "print",
    "println",
    "step",
    "forward",
    "left",
    "right",
    "append",
    "push",
    "pop",
    "remove",
    "insert",
    "replace",
    "clear",
    "front",
    "back",
    "clone",
    "stopMe",
    "ask",
    "send",
    "sendAndWait",
    // else-if alias
    "elif",
    // Scratchroutines
    "scratchroutine",
    "launch",
    "await",
    "cancel",
    "isRunning",
    "checkCancel",
    // Struct declarations and debug
    "struct",
    "breakpoint"
  ];
  function registerLanguage(monaco2) {
    monaco2.languages.register({ id: LANG_ID });
    monaco2.editor.defineTheme("scratchpiler-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "mathfunc", foreground: "#4ec994" }
      ],
      colors: {
        "editor.background": "#002451",
        "editor.lineHighlightBackground": "#00346e80",
        "editorLineNumber.foreground": "#3d6090",
        "editorLineNumber.activeForeground": "#7285b7",
        "editor.selectionBackground": "#003f8e",
        "editorCursor.foreground": "#ff8c00",
        "editor.findMatchBackground": "#ff8c004d"
      }
    });
    monaco2.languages.setMonarchTokensProvider(LANG_ID, {
      keywords: KEYWORDS2,
      mathfuncs: [
        "abs",
        "sqrt",
        "floor",
        "ceiling",
        "ceil",
        "round",
        "sin",
        "cos",
        "tan",
        "asin",
        "acos",
        "atan",
        "ln",
        "log",
        "exp",
        "pow10",
        "random",
        "clamp",
        "join",
        "letterOf",
        "contains",
        "distanceTo",
        "xOf",
        "yOf",
        "directionOf",
        "costumeNumOf",
        "costumeNameOf",
        "sizeOf",
        "volumeOf"
      ],
      tokenizer: {
        root: [
          [/\/\/.*$/, "comment"],
          [/"[^"]*"/, "string"],
          [/\[[^\]]+\]/, "variable"],
          [/#[0-9a-fA-F]{6}/, "number"],
          [/[0-9]+(\.[0-9]+)?/, "number"],
          [/[a-zA-Z_][\w]*/, {
            cases: {
              "@keywords": "keyword",
              "@mathfuncs": "mathfunc",
              "@default": "identifier"
            }
          }],
          [/[{}()[\],:]/, "delimiter"],
          [/[+\-*\/<>=]/, "operator"]
        ]
      }
    });
    monaco2.languages.registerCompletionItemProvider(LANG_ID, {
      triggerCharacters: ['"', "(", "[", "."],
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        const linePrefix = model.getLineContent(position.lineNumber).substring(0, word.startColumn - 1);
        if (linePrefix.endsWith(".") && /\[([^\].]+)\.$/.test(linePrefix)) {
          const match = linePrefix.match(/\[([^\].]+)\.$/);
          const prefix = match ? match[1] : "";
          if (prefix) {
            const src = model.getValue();
            const structDefs = {};
            const structRe = /\bstruct\s+(\w+)\s*\{([^}]*)\}/g;
            let sm;
            while ((sm = structRe.exec(src)) !== null) {
              const fields2 = sm[2].split(/[\s,]+/).filter((f) => f.length > 0);
              structDefs[sm[1]] = fields2;
            }
            const fields = structDefs[prefix];
            if (fields && fields.length > 0) {
              const CIKf = monaco2.languages.CompletionItemKind;
              return {
                suggestions: fields.map((f) => ({
                  label: `${prefix}.${f}]`,
                  kind: CIKf.Field,
                  detail: `Struct field \xB7 ${prefix}`,
                  insertText: f + "]",
                  range
                }))
              };
            }
          }
        }
        if (linePrefix.endsWith("[")) {
          const src = model.getValue();
          const structDefs = {};
          const structRe = /\bstruct\s+(\w+)\s*\{([^}]*)\}/g;
          let sm2;
          while ((sm2 = structRe.exec(src)) !== null) {
            structDefs[sm2[1]] = sm2[2].split(/[\s,]+/).filter((f) => f.length > 0);
          }
          const entries = Object.entries(structDefs);
          if (entries.length > 0) {
            const CIKf = monaco2.languages.CompletionItemKind;
            const suggestions = [];
            for (const [sName, fields] of entries) {
              for (const field of fields) {
                suggestions.push({
                  label: `${sName}.${field}]`,
                  kind: CIKf.Field,
                  detail: `Struct field \xB7 ${sName}`,
                  insertText: `${sName}.${field}]`,
                  sortText: `0_${sName}_${field}`,
                  range
                });
              }
            }
            return { suggestions };
          }
        }
        if (linePrefix.endsWith(".") && /\[[^\]]+\]\.$/.test(linePrefix)) {
          const dotRange = { ...range, startColumn: word.startColumn };
          const CIKd = monaco2.languages.CompletionItemKind;
          const DOT_METHODS = [
            { label: "length()", insertText: "length()", detail: "String / list length" },
            { label: "len()", insertText: "len()", detail: "String / list length (alias)" },
            { label: "contains(item)", insertText: "contains(${1:item})", detail: "List \xB7 data_listcontainsitem" },
            { label: "item(index)", insertText: "item(${1:index})", detail: "List \xB7 data_itemoflist" },
            { label: "indexOf(item)", insertText: "indexOf(${1:item})", detail: "List \xB7 data_itemnumoflist" },
            { label: "sort()", insertText: "sort()", detail: "List \xB7 sort ascending (Shell sort)" },
            { label: 'sort("desc")', insertText: 'sort("desc")', detail: "List \xB7 sort descending (Shell sort)" }
          ];
          return {
            suggestions: DOT_METHODS.map((m) => ({
              label: m.label,
              kind: CIKd.Method,
              detail: m.detail,
              insertText: m.insertText,
              insertTextRules: monaco2.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: dotRange
            }))
          };
        }
        const fullPrefix = model.getLineContent(position.lineNumber).substring(0, position.column - 1);
        let inStr = false, quoteStart = -1;
        for (let i = 0; i < fullPrefix.length; i++) {
          if (fullPrefix[i] === '"') {
            inStr = !inStr;
            if (inStr) quoteStart = i;
          }
        }
        if (inStr && quoteStart !== -1) {
          let strItems = function(vals, kind, detail) {
            return vals.map((v) => ({
              label: v,
              kind: kind ?? CIKs.Value,
              detail: detail ?? "",
              insertText: v,
              range: strRange
            }));
          }, getBroadcasts = function() {
            if (!currentVM) return [];
            const stage = currentVM.runtime.targets.find((t) => t.isStage);
            if (!stage) return [];
            return Object.values(stage.variables).filter((v) => v.type === "broadcast_msg").map((v) => v.name);
          }, getActiveSounds = function() {
            if (!currentVM) return [];
            const sn = getActiveSpriteNameFromDropdown();
            const target = sn === "__stage__" ? currentVM.runtime.targets.find((t) => t.isStage) : currentVM.runtime.targets.find((t) => t.sprite?.name === sn);
            return target ? target.sprite.sounds.map((s) => s.name) : [];
          }, getActiveCostumes = function() {
            if (!currentVM) return [];
            const sn = getActiveSpriteNameFromDropdown();
            const target = sn === "__stage__" ? currentVM.runtime.targets.find((t) => t.isStage) : currentVM.runtime.targets.find((t) => t.sprite?.name === sn);
            return target ? target.sprite.costumes.map((c) => c.name) : [];
          };
          const beforeQuote = fullPrefix.substring(0, quoteStart).trimEnd();
          const CIKs = monaco2.languages.CompletionItemKind;
          const IS = monaco2.languages.CompletionItemInsertTextRule.InsertAsSnippet;
          const lineContent = model.getLineContent(position.lineNumber);
          const afterCursor = lineContent.substring(position.column - 1);
          const closingQ = afterCursor.indexOf('"');
          const strRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: quoteStart + 2,
            endColumn: closingQ >= 0 ? position.column + closingQ : position.column
          };
          const KEY_NAMES = [
            "space",
            "enter",
            "up arrow",
            "down arrow",
            "left arrow",
            "right arrow",
            "a",
            "b",
            "c",
            "d",
            "e",
            "f",
            "g",
            "h",
            "i",
            "j",
            "k",
            "l",
            "m",
            "n",
            "o",
            "p",
            "q",
            "r",
            "s",
            "t",
            "u",
            "v",
            "w",
            "x",
            "y",
            "z",
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9"
          ];
          const SPRITE_TARGETS = [
            "_mouse_",
            "_random_",
            ...scratchIndex.sprites.map((s) => s.name)
          ];
          const TOUCH_TARGETS = [
            "_edge_",
            "_mouse_",
            ...scratchIndex.sprites.map((s) => s.name)
          ];
          const BACKDROPS = scratchIndex.stage.backdrops || [];
          const EFFECTS = ["color", "fisheye", "whirl", "pixelate", "mosaic", "brightness", "ghost"];
          const ROT_STYLES = ["all around", "left-right", "don't rotate"];
          const TIME_UNITS = ["year", "month", "date", "day", "hour", "minute", "second"];
          if (/\bon\s+receive\s*$/.test(beforeQuote)) {
            return { suggestions: strItems(getBroadcasts(), CIKs.Event, "Broadcast message") };
          }
          if (/\bon\s+backdrop\s*$/.test(beforeQuote)) {
            return { suggestions: strItems(BACKDROPS, CIKs.File, "Backdrop") };
          }
          if (/\bon\s+key\s*$/.test(beforeQuote)) {
            return { suggestions: strItems(KEY_NAMES, CIKs.Enum, "Key name") };
          }
          if (/\bswitchCostume\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(getActiveCostumes(), CIKs.Color, "Costume") };
          }
          if (/\b(?:switchBackdrop|switchBackdropAndWait)\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(BACKDROPS, CIKs.File, "Backdrop") };
          }
          if (/\b(?:play|playUntilDone)\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(getActiveSounds(), CIKs.Event, "Sound") };
          }
          if (/\b(?:broadcast|broadcastAndWait|send|sendAndWait)\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(getBroadcasts(), CIKs.Event, "Broadcast message") };
          }
          if (/\b(?:goTo|pointTowards|glide\s*\([^)]*,\s*)\s*$/.test(beforeQuote) || /\bglide\s*\([^,]+,\s*$/.test(beforeQuote)) {
            return { suggestions: strItems(SPRITE_TARGETS, CIKs.Class, "Sprite / target") };
          }
          if (/\btouching\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(TOUCH_TARGETS, CIKs.Class, "Sprite / edge / mouse") };
          }
          if (/\b(?:distanceTo|xOf|yOf|directionOf|sizeOf|costumeNumOf|costumeNameOf|volumeOf|pointTowards)\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(SPRITE_TARGETS, CIKs.Class, "Sprite / target") };
          }
          if (/\bkey\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(KEY_NAMES, CIKs.Enum, "Key name") };
          }
          if (/\b(?:setEffect|changeEffect)\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(EFFECTS, CIKs.Enum, "Visual effect") };
          }
          if (/\b(?:setSoundEffect|changeSoundEffect)\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(["PITCH", "PAN LEFT/RIGHT"], CIKs.Enum, "Sound effect") };
          }
          if (/\bsetRotationStyle\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(ROT_STYLES, CIKs.Enum, "Rotation style") };
          }
          if (/\bsetDragMode\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(["draggable", "not draggable"], CIKs.Enum, "Drag mode") };
          }
          if (/\bcurrentTime\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(TIME_UNITS, CIKs.Enum, "Time unit") };
          }
          if (/\b(?:createClone)\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(["_myself_", ...scratchIndex.sprites.map((s) => s.name)], CIKs.Class, "Sprite / self") };
          }
          if (/\b(?:sort)\s*\($/.test(beforeQuote)) {
            return { suggestions: strItems(["desc"], CIKs.Enum, "Sort direction") };
          }
          return { suggestions: [] };
        }
        const onMatch = linePrefix.match(/\bon\s+$/);
        const hatRange = onMatch ? { ...range, startColumn: word.startColumn - onMatch[0].length } : range;
        return { suggestions: buildSuggestions(monaco2, range, hatRange) };
      }
    });
    const SIG_DB = {
      // keyword constructs (detected by looking behind cursor)
      "if": { label: "if <condition> { \u2026 }", params: [{ label: "<condition>", documentation: "A boolean expression" }] },
      "while": { label: "while (<condition>) { \u2026 }", params: [{ label: "<condition>", documentation: "Loop while true" }] },
      "repeat until": { label: "repeat until (<condition>) { \u2026 }", params: [{ label: "<condition>", documentation: "Loop until true" }] },
      "repeat": { label: "repeat <count> { \u2026 }", params: [{ label: "<count>", documentation: "Number of iterations" }] },
      "for": { label: "for [var] from <start> to <end> { \u2026 }", params: [{ label: "[var]" }, { label: "<start>" }, { label: "<end>" }] },
      "wait until": { label: "wait until <condition>", params: [{ label: "<condition>" }] },
      // function calls
      "move": { label: "move(steps)", params: [{ label: "steps" }] },
      "turnRight": { label: "turnRight(degrees)", params: [{ label: "degrees" }] },
      "turnLeft": { label: "turnLeft(degrees)", params: [{ label: "degrees" }] },
      "goTo": { label: 'goTo(x, y)  |  goTo("sprite")', params: [{ label: 'x  or  "sprite"' }, { label: "y" }] },
      "glide": { label: "glide(secs, x, y)", params: [{ label: "secs" }, { label: "x" }, { label: "y" }] },
      "setX": { label: "setX(x)", params: [{ label: "x" }] },
      "setY": { label: "setY(y)", params: [{ label: "y" }] },
      "changeX": { label: "changeX(dx)", params: [{ label: "dx" }] },
      "changeY": { label: "changeY(dy)", params: [{ label: "dy" }] },
      "say": { label: "say(message)", params: [{ label: "message" }] },
      "sayFor": { label: "sayFor(message, secs)", params: [{ label: "message" }, { label: "secs" }] },
      "think": { label: "think(message)", params: [{ label: "message" }] },
      "thinkFor": { label: "thinkFor(message, secs)", params: [{ label: "message" }, { label: "secs" }] },
      "switchCostume": { label: 'switchCostume("name")', params: [{ label: '"name"' }] },
      "switchBackdrop": { label: 'switchBackdrop("name")', params: [{ label: '"name"' }] },
      "setSize": { label: "setSize(percent)", params: [{ label: "percent" }] },
      "changeSize": { label: "changeSize(amount)", params: [{ label: "amount" }] },
      "play": { label: 'play("sound")', params: [{ label: '"sound"' }] },
      "playUntilDone": { label: 'playUntilDone("sound")', params: [{ label: '"sound"' }] },
      "broadcast": { label: 'broadcast("message")', params: [{ label: '"message"' }] },
      "broadcastAndWait": { label: 'broadcastAndWait("message")', params: [{ label: '"message"' }] },
      "wait": { label: "wait(seconds)", params: [{ label: "seconds" }] },
      "createClone": { label: 'createClone()  |  createClone("sprite")', params: [{ label: '"sprite"?  (optional)' }] },
      "deleteClone": { label: "deleteClone()", params: [] },
      "stopAll": { label: "stopAll()", params: [] },
      "stopThis": { label: "stopThis()", params: [] },
      "stopOtherScripts": { label: "stopOtherScripts()", params: [] },
      "touching": { label: 'touching("sprite" | "_edge_" | "_mouse_")', params: [{ label: '"target"' }] },
      "key": { label: 'key("key name")', params: [{ label: '"key name"' }] },
      "showVariable": { label: "showVariable([var])", params: [{ label: "[var]" }] },
      "hideVariable": { label: "hideVariable([var])", params: [{ label: "[var]" }] },
      "showList": { label: "showList([list])", params: [{ label: "[list]" }] },
      "hideList": { label: "hideList([list])", params: [{ label: "[list]" }] },
      "listAdd": { label: "listAdd(item, [list])", params: [{ label: "item" }, { label: "[list]" }] },
      "listDelete": { label: "listDelete(index, [list])", params: [{ label: "index" }, { label: "[list]" }] },
      "listInsert": { label: "listInsert(item, index, [list])", params: [{ label: "item" }, { label: "index" }, { label: "[list]" }] },
      "listReplace": { label: "listReplace(index, [list], item)", params: [{ label: "index" }, { label: "[list]" }, { label: "item" }] },
      // dot methods
      "length": { label: "[var].length()  \u2014  string length\n[list].length()  \u2014  list length", params: [] },
      "len": { label: "[var].len()  \u2014  string length (alias)\n[list].len()  \u2014  list length (alias)", params: [] },
      "contains": { label: "[list].contains(item)", params: [{ label: "item", documentation: "Value to search for" }] },
      "item": { label: "[list].item(index)", params: [{ label: "index", documentation: "1-based position" }] },
      "indexOf": { label: "[list].indexOf(item)", params: [{ label: "item", documentation: "Value to find" }] },
      "sort": { label: '[list].sort()  |  [list].sort("desc")', params: [] },
      // Math / trig
      "abs": { label: "abs(n)", params: [{ label: "n" }] },
      "round": { label: "round(n)", params: [{ label: "n" }] },
      "sqrt": { label: "sqrt(n)", params: [{ label: "n" }] },
      "floor": { label: "floor(n)", params: [{ label: "n" }] },
      "ceiling": { label: "ceiling(n)", params: [{ label: "n" }] },
      "ceil": { label: "ceil(n)  \u2014 alias for ceiling", params: [{ label: "n" }] },
      "sin": { label: "sin(degrees)  \u2014 Scratch uses degrees", params: [{ label: "degrees" }] },
      "cos": { label: "cos(degrees)  \u2014 Scratch uses degrees", params: [{ label: "degrees" }] },
      "tan": { label: "tan(degrees)  \u2014 Scratch uses degrees", params: [{ label: "degrees" }] },
      "asin": { label: "asin(n)  \u2192 degrees", params: [{ label: "n", documentation: "-1 to 1" }] },
      "acos": { label: "acos(n)  \u2192 degrees", params: [{ label: "n", documentation: "-1 to 1" }] },
      "atan": { label: "atan(n)  \u2192 degrees", params: [{ label: "n" }] },
      "ln": { label: "ln(n)  \u2014 natural log", params: [{ label: "n" }] },
      "log": { label: "log(n)  \u2014 base 10", params: [{ label: "n" }] },
      "exp": { label: "exp(n)  \u2014 e^n", params: [{ label: "n" }] },
      "pow10": { label: "pow10(n)  \u2014 10^n", params: [{ label: "n" }] },
      // Operators / string
      "random": { label: "random(min, max)  \u2014 pick a random number", params: [{ label: "min" }, { label: "max" }] },
      "join": { label: "join(str1, str2)  \u2014 concatenate strings", params: [{ label: "str1" }, { label: "str2" }] },
      "letterOf": { label: "letterOf(index, string)  \u2014 1-based", params: [{ label: "index", documentation: "1-based character position" }, { label: "string" }] },
      "clamp": { label: "clamp(value, min, max)  \u2014 constrain to range", params: [{ label: "value" }, { label: "min" }, { label: "max" }] },
      "yield": { label: "yield()  \u2014 pause one tick (wait 0s)", params: [] },
      // Motion extras
      "setDirection": { label: "setDirection(degrees)", params: [{ label: "degrees", documentation: "0=up, 90=right, 180=down, -90=left" }] },
      "pointTowards": { label: 'pointTowards("sprite" | "_mouse_")', params: [{ label: '"target"' }] },
      "distanceTo": { label: 'distanceTo("sprite" | "_mouse_")', params: [{ label: '"target"' }] },
      "moveForward": { label: "moveForward(layers)  \u2014 raise layer order", params: [{ label: "layers" }] },
      "moveBackward": { label: "moveBackward(layers)  \u2014 lower layer order", params: [{ label: "layers" }] },
      "goToFront": { label: "goToFront()  \u2014 bring to front layer", params: [] },
      "goToBack": { label: "goToBack()  \u2014 send to back layer", params: [] },
      // Looks effects
      "setEffect": { label: 'setEffect("effect", value)  \u2014 e.g. "color", "brightness", "ghost"', params: [{ label: '"effect"', documentation: "color, fisheye, whirl, pixelate, mosaic, brightness, ghost" }, { label: "value" }] },
      "changeEffect": { label: 'changeEffect("effect", amount)', params: [{ label: '"effect"' }, { label: "amount" }] },
      // Sound
      "setVolume": { label: "setVolume(percent)", params: [{ label: "percent", documentation: "0\u2013100" }] },
      "changeVolume": { label: "changeVolume(amount)", params: [{ label: "amount" }] },
      // Sensing
      "askAndWait": { label: "askAndWait(question)  \u2014 stores reply in answer", params: [{ label: "question" }] },
      "resetTimer": { label: "resetTimer()", params: [] },
      "currentTime": { label: 'currentTime("unit")  \u2014 "hour" | "minute" | "second" | "year" | "month" | "date" | "day"', params: [{ label: '"unit"', documentation: "hour, minute, second, year, month, date, day" }] },
      // Sensing of other sprites
      "xOf": { label: 'xOf("sprite")  \u2014 x position of another sprite', params: [{ label: '"sprite"' }] },
      "yOf": { label: 'yOf("sprite")', params: [{ label: '"sprite"' }] },
      "directionOf": { label: 'directionOf("sprite")', params: [{ label: '"sprite"' }] },
      "costumeNumOf": { label: 'costumeNumOf("sprite")', params: [{ label: '"sprite"' }] },
      "costumeNameOf": { label: 'costumeNameOf("sprite")', params: [{ label: '"sprite"' }] },
      "sizeOf": { label: 'sizeOf("sprite")', params: [{ label: '"sprite"' }] },
      "volumeOf": { label: 'volumeOf("sprite")', params: [{ label: '"sprite"' }] },
      // New v1.0
      "turnTo": { label: "turnTo(degrees)  \u2014 point in absolute direction (0=up, 90=right, 180/-180=down, -90=left)", params: [{ label: "degrees", documentation: "0=up, 90=right, 180=down, -90=left" }] },
      "pyfor": { label: "pyfor [iterator] in [list] { \u2026 }", params: [{ label: "[iterator]", documentation: "Variable to receive each item" }, { label: "[list]", documentation: "List to iterate over" }] },
      "not": { label: "not <condition>  \u2014 boolean NOT", params: [{ label: "<condition>" }] },
      "listDeleteAll": { label: "listDeleteAll([list])", params: [{ label: "[list]" }] },
      "setRotationStyle": { label: 'setRotationStyle("style")', params: [{ label: '"style"', documentation: `"all around" | "left-right" | "don't rotate"` }] },
      "switchBackdropAndWait": { label: 'switchBackdropAndWait("name")', params: [{ label: '"name"' }] },
      "setSoundEffect": { label: 'setSoundEffect("effect", value)', params: [{ label: '"effect"', documentation: '"PITCH" or "PAN LEFT/RIGHT"' }, { label: "value" }] },
      "changeSoundEffect": { label: 'changeSoundEffect("effect", amount)', params: [{ label: '"effect"', documentation: '"PITCH" or "PAN LEFT/RIGHT"' }, { label: "amount" }] },
      "clearSoundEffects": { label: "clearSoundEffects()", params: [] },
      "setDragMode": { label: 'setDragMode("mode")', params: [{ label: '"mode"', documentation: '"draggable" or "not draggable"' }] },
      // Ergonomic aliases
      "print": { label: "print(message)  \u2014 alias for say()", params: [{ label: "message" }] },
      "println": { label: "println(message)  \u2014 alias for say()", params: [{ label: "message" }] },
      "step": { label: "step(steps)  \u2014 alias for move()", params: [{ label: "steps" }] },
      "forward": { label: "forward(steps)  \u2014 alias for move()", params: [{ label: "steps" }] },
      "left": { label: "left(degrees)  \u2014 alias for turnLeft()", params: [{ label: "degrees" }] },
      "right": { label: "right(degrees)  \u2014 alias for turnRight()", params: [{ label: "degrees" }] },
      "front": { label: "front()  \u2014 bring to front layer (alias for goToFront)", params: [] },
      "back": { label: "back()  \u2014 send to back layer (alias for goToBack)", params: [] },
      "clone": { label: 'clone()  \u2014 create clone of self (alias for createClone("_myself_"))', params: [] },
      "stopMe": { label: "stopMe()  \u2014 stop this script (alias for stopThis)", params: [] },
      "ask": { label: 'ask("question")  \u2014 alias for askAndWait()', params: [{ label: '"question"' }] },
      "send": { label: 'send("message")  \u2014 alias for broadcast()', params: [{ label: '"message"' }] },
      "sendAndWait": { label: 'sendAndWait("message")  \u2014 alias for broadcastAndWait()', params: [{ label: '"message"' }] },
      "append": { label: "append([list], value)  \u2014 add item to end (alias for listAdd)", params: [{ label: "[list]", documentation: "The list to append to" }, { label: "value", documentation: "Item to add" }] },
      "push": { label: "push([list], value)  \u2014 alias for append()", params: [{ label: "[list]" }, { label: "value" }] },
      "remove": { label: "remove([list], index)  \u2014 delete item at index (alias for listDelete)", params: [{ label: "[list]" }, { label: "index", documentation: 'Position to delete, or "last"/"random"' }] },
      "insert": { label: "insert([list], index, value)  \u2014 insert at position (alias for listInsert)", params: [{ label: "[list]" }, { label: "index" }, { label: "value" }] },
      "replace": { label: "replace([list], index, value)  \u2014 replace item (alias for listReplace)", params: [{ label: "[list]" }, { label: "index" }, { label: "value" }] },
      "clear": { label: "clear([list])  \u2014 delete all items (alias for listDeleteAll)", params: [{ label: "[list]" }] },
      "pop": { label: "pop([list])  \u2014 delete all items (alias for clear/listDeleteAll)", params: [{ label: "[list]" }] },
      // Scratchroutines
      "scratchroutine": { label: "scratchroutine name(params) { \u2026 }", params: [{ label: "name", documentation: "Routine identifier" }, { label: "params", documentation: "Comma-separated parameter names (optional)" }] },
      "launch": { label: "launch name(args)  \u2014 fire and forget (broadcast)", params: [{ label: "name", documentation: "Scratchroutine name" }, { label: "args", documentation: "Arguments (optional)" }] },
      "await": { label: "await name(args)  \u2014 block until done (broadcastAndWait)", params: [{ label: "name", documentation: "Scratchroutine name" }, { label: "args", documentation: "Arguments (optional)" }] },
      "cancel": { label: "cancel name  \u2014 set the cancel flag (check with checkCancel)", params: [{ label: "name", documentation: "Scratchroutine name" }] },
      "isRunning": { label: "isRunning(name)  \u2014 boolean: is routine currently executing?", params: [{ label: "name", documentation: "Scratchroutine name" }] },
      "checkCancel": { label: "checkCancel()  \u2014 stop this script if cancelled (inside scratchroutine only)", params: [] },
      // List aggregates
      "sum": { label: "[list].sum()  \u2014 sum of all numeric items", params: [] },
      "min": { label: "[list].min()  \u2014 minimum numeric item", params: [] },
      "max": { label: "[list].max()  \u2014 maximum numeric item", params: [] },
      "count": { label: "[list].count(value)  \u2014 how many items equal value", params: [{ label: "value", documentation: "Value to count" }] }
    };
    const KEYWORD_RE = /\b(wait until|repeat until|if|while|repeat|for)\s*$/;
    monaco2.languages.registerSignatureHelpProvider(LANG_ID, {
      signatureHelpTriggerCharacters: ["(", " ", "["],
      signatureHelpRetriggerCharacters: [","],
      provideSignatureHelp(model, position) {
        const lineText = model.getLineContent(position.lineNumber);
        const before = lineText.substring(0, position.column - 1);
        const dotM = before.match(/\[([^\]]+)\]\.(\w+)\s*\([^)]*$/);
        if (dotM) {
          const sig = SIG_DB[dotM[2]];
          if (sig) {
            const commas = (before.slice(before.lastIndexOf("(") + 1).match(/,/g) || []).length;
            return mkSig(sig, commas);
          }
        }
        const fnM = before.match(/(\w+)\s*\([^)]*$/);
        if (fnM) {
          const sig = SIG_DB[fnM[1]];
          if (sig) {
            const commas = (before.slice(before.lastIndexOf("(") + 1).match(/,/g) || []).length;
            return mkSig(sig, commas);
          }
        }
        const kwM = before.match(KEYWORD_RE);
        if (kwM) {
          const sig = SIG_DB[kwM[1]];
          if (sig) return mkSig(sig, 0);
        }
        return null;
      }
    });
    function mkSig(sig, activeParam) {
      return {
        value: {
          signatures: [{
            label: sig.label,
            parameters: sig.params.map((p) => ({ label: p.label, documentation: p.documentation || "" }))
          }],
          activeSignature: 0,
          activeParameter: Math.min(activeParam, Math.max(0, sig.params.length - 1))
        },
        dispose: () => {
        }
      };
    }
    monaco2.languages.registerHoverProvider(LANG_ID, {
      provideHover(model, position) {
        const word = model.getWordAtPosition(position);
        if (!word) return null;
        const sig = SIG_DB[word.word];
        if (!sig) return null;
        return {
          range: new monaco2.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [
            { value: "```scratchpiler\n" + sig.label + "\n```" },
            ...sig.params.flatMap((p) => p.documentation ? [{ value: "**" + p.label + "** \u2014 " + p.documentation }] : [])
          ]
        };
      }
    });
    monaco2.languages.registerDocumentFormattingEditProvider(LANG_ID, {
      provideDocumentFormattingEdits(model) {
        const src = model.getValue();
        const formatted = formatSource(src);
        if (!formatted) return [];
        return [{ range: model.getFullModelRange(), text: formatted }];
      }
    });
    monaco2.languages.registerFoldingRangeProvider(LANG_ID, {
      provideFoldingRanges(model) {
        const ranges = [];
        const lines = model.getLinesContent();
        const stack = [];
        for (let i = 0; i < lines.length; i++) {
          const t = lines[i].trim();
          if (t.endsWith("{")) stack.push(i + 1);
          else if (t === "}" || t.startsWith("}")) {
            if (stack.length) {
              const start = stack.pop();
              if (i + 1 > start) {
                ranges.push({
                  start,
                  end: i + 1,
                  kind: monaco2.languages.FoldingRangeKind.Region
                });
              }
            }
          }
        }
        return ranges;
      }
    });
    monaco2.languages.setLanguageConfiguration(LANG_ID, {
      comments: { lineComment: "//" },
      brackets: [["{", "}"], ["(", ")"], ["[", "]"]],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "(", close: ")" },
        { open: '"', close: '"' }
      ],
      surroundingPairs: [
        { open: "{", close: "}" },
        { open: "(", close: ")" },
        { open: '"', close: '"' }
      ],
      indentationRules: {
        increaseIndentPattern: /^.*\{[^}]*$/,
        decreaseIndentPattern: /^\s*\}/
      }
    });
  }
  function getActiveSpriteNameFromDropdown() {
    return currentSpriteContext;
  }
  function buildSuggestions(monaco2, range, hatRange) {
    const CIK = monaco2.languages.CompletionItemKind;
    const IS = monaco2.languages.CompletionItemInsertTextRule.InsertAsSnippet;
    const HR = hatRange || range;
    const items = [];
    const push = (label, kind, detail, insertText, documentation) => {
      const item = { label, kind, detail, insertText: insertText ?? label, insertTextRules: IS, range };
      if (documentation) item.documentation = { value: documentation };
      items.push(item);
    };
    const pushHat = (label, insertText, documentation) => {
      const item = { label, kind: CIK.Snippet, detail: "Hat block \xB7 event trigger", insertText, insertTextRules: IS, range: HR };
      if (documentation) item.documentation = { value: documentation };
      items.push(item);
    };
    pushHat("on flag {}", "on flag {\n	$0\n}", "Runs when the green flag is clicked");
    pushHat("on click {}", "on click {\n	$0\n}", "Runs when this sprite is clicked");
    pushHat("on clone {}", "on clone {\n	$0\n}", "Runs when this clone starts");
    pushHat('on key "" {}', 'on key "$1" {\n	$0\n}', 'Runs when a key is pressed  e.g. `on key "space" {}`');
    pushHat('on receive "" {}', 'on receive "$1" {\n	$0\n}', "Runs when a broadcast message is received");
    pushHat('on backdrop "" {}', 'on backdrop "$1" {\n	$0\n}', "Runs when the backdrop switches to the named backdrop");
    push("if {}", CIK.Snippet, "Control \xB7 if <cond> {}", "if ${1:condition} {\n	$0\n}", "Executes the block if the condition is true");
    push("if {} else {}", CIK.Snippet, "Control \xB7 if/else", "if ${1:condition} {\n	$2\n} else {\n	$0\n}", "Executes the `if` branch when true, the `else` branch when false");
    push("repeat {}", CIK.Snippet, "Control \xB7 repeat <n> {}", "repeat ${1:count} {\n	$0\n}", "Repeats the block a fixed number of times");
    push("forever {}", CIK.Snippet, "Control \xB7 forever {}", "forever {\n	$0\n}", "Loops the block forever");
    push("repeat until () {}", CIK.Snippet, "Control \xB7 repeat until (cond) {}", "repeat until (${1:condition}) {\n	$0\n}", "Loops until the condition becomes true");
    push("while () {}", CIK.Snippet, "Control \xB7 while (cond) {}", "while (${1:condition}) {\n	$0\n}", "Loops while the condition is true");
    push("for [i] from 1 to 10 {}", CIK.Snippet, "Control \xB7 for [i] from n to n {}", "for [${1:i}] from ${2:1} to ${3:10} {\n	$0\n}", "Numeric for-loop \u2014 [i] counts from start to end");
    push("pyfor [item] in [list] {}", CIK.Snippet, "Control \xB7 pyfor [item] in [list] {}", "pyfor [${1:item}] in [${2:myList}] {\n	$0\n}", "Python-style list iteration \u2014 [item] receives each list element in order");
    push("wait until", CIK.Snippet, "Control \xB7 wait until <cond>", "wait until ${0:condition}", "Pauses until the condition becomes true");
    push("define name(params) {}", CIK.Snippet, "Custom block \xB7 define name(params) {}", "define ${1:name}(${2:params}) {\n	$0\n}", "Define a custom block (procedure)");
    push("set [] to", CIK.Keyword, "Variables \xB7 set [var] to value", "set [$1] to $0", "Set a variable to a value");
    push("change [] by", CIK.Keyword, "Variables \xB7 change [var] by n", "change [$1] by $0", "Add a number to a variable");
    push("move()", CIK.Function, "Motion \xB7 move(steps)", "move($0)", "Move forward by the given number of steps");
    push("turnRight()", CIK.Function, "Motion \xB7 turnRight(degrees)", "turnRight($0)", "Rotate clockwise by the given degrees");
    push("turnLeft()", CIK.Function, "Motion \xB7 turnLeft(degrees)", "turnLeft($0)", "Rotate counter-clockwise by the given degrees");
    push("turnTo()", CIK.Function, "Motion \xB7 turnTo(degrees)", "turnTo($0)", "Point in an absolute direction (0=up, 90=right, 180=down, -90=left)");
    push("goTo(x, y)", CIK.Function, "Motion \xB7 goTo(x, y)", "goTo($1, $0)", "Go to absolute x, y coordinates");
    push('goTo("sprite")', CIK.Function, 'Motion \xB7 goTo("sprite")', 'goTo("$0")', 'Go to another sprite or `"_mouse_"` / `"_random_"`');
    push("glide(secs, x, y)", CIK.Function, "Motion \xB7 glide(secs, x, y)", "glide($1, $2, $0)", "Glide smoothly to x, y over the given seconds");
    push("setX()", CIK.Function, "Motion \xB7 setX(x)", "setX($0)", "Set the sprite's x position");
    push("setY()", CIK.Function, "Motion \xB7 setY(y)", "setY($0)", "Set the sprite's y position");
    push("changeX()", CIK.Function, "Motion \xB7 changeX(dx)", "changeX($0)", "Move the sprite by dx on the x axis");
    push("changeY()", CIK.Function, "Motion \xB7 changeY(dy)", "changeY($0)", "Move the sprite by dy on the y axis");
    push("bounce()", CIK.Function, "Motion \xB7 bounce()", "bounce()", "Bounce if on the edge of the stage");
    push("say()", CIK.Function, "Looks", 'say("$0")');
    push("sayFor()", CIK.Function, "Looks", 'sayFor("$1", $0)');
    push("think()", CIK.Function, "Looks", 'think("$0")');
    push("thinkFor()", CIK.Function, "Looks", 'thinkFor("$1", $0)');
    push("switchCostume()", CIK.Function, "Looks", 'switchCostume("$0")');
    push("switchBackdrop()", CIK.Function, "Looks", 'switchBackdrop("$0")');
    push("nextCostume()", CIK.Function, "Looks", "nextCostume()");
    push("nextBackdrop()", CIK.Function, "Looks", "nextBackdrop()");
    push("setSize()", CIK.Function, "Looks", "setSize($0)");
    push("changeSize()", CIK.Function, "Looks", "changeSize($0)");
    push("show()", CIK.Function, "Looks", "show()");
    push("hide()", CIK.Function, "Looks", "hide()");
    push("clearEffects()", CIK.Function, "Looks", "clearEffects()");
    push("play()", CIK.Function, "Sound", 'play("$0")');
    push("playUntilDone()", CIK.Function, "Sound", 'playUntilDone("$0")');
    push("stopSounds()", CIK.Function, "Sound", "stopSounds()");
    push("broadcast()", CIK.Function, "Events", 'broadcast("$0")');
    push("broadcastAndWait()", CIK.Function, "Events", 'broadcastAndWait("$0")');
    push("wait()", CIK.Function, "Control", "wait($0)");
    push("stopAll()", CIK.Function, "Control", "stopAll()");
    push("stopThis()", CIK.Function, "Control", "stopThis()");
    push("stopOtherScripts()", CIK.Function, "Control", "stopOtherScripts()");
    push("createClone()", CIK.Function, "Control", "createClone()");
    push('createClone("sprite")', CIK.Function, "Control", 'createClone("$0")');
    push("deleteClone()", CIK.Function, "Control", "deleteClone()");
    push("showVariable()", CIK.Function, "Variables", "showVariable([$0])");
    push("hideVariable()", CIK.Function, "Variables", "hideVariable([$0])");
    push("showList()", CIK.Function, "Variables", "showList([$0])");
    push("hideList()", CIK.Function, "Variables", "hideList([$0])");
    push("listAdd()", CIK.Function, "Lists", "listAdd($1, [$0])");
    push("listDelete()", CIK.Function, "Lists", "listDelete($1, [$0])");
    push("listInsert()", CIK.Function, "Lists", "listInsert($1, $2, [$0])");
    push("listReplace()", CIK.Function, "Lists", "listReplace($1, [$2], $0)");
    push("listDeleteAll()", CIK.Function, "Lists", "listDeleteAll([$0])");
    push("setRotationStyle()", CIK.Function, "Motion", 'setRotationStyle("${1|all around,left-right,don\'t rotate|}")');
    push('glide(secs, "sprite")', CIK.Function, "Motion", 'glide($1, "$0")');
    push("switchBackdropAndWait()", CIK.Function, "Looks", 'switchBackdropAndWait("$0")');
    push("setSoundEffect()", CIK.Function, "Sound", 'setSoundEffect("${1|PITCH,PAN LEFT/RIGHT|}", $0)');
    push("changeSoundEffect()", CIK.Function, "Sound", 'changeSoundEffect("${1|PITCH,PAN LEFT/RIGHT|}", $0)');
    push("clearSoundEffects()", CIK.Function, "Sound", "clearSoundEffects()");
    push("setDragMode()", CIK.Function, "Sensing", 'setDragMode("${1|draggable,not draggable|}")');
    pushHat("on timer > n {}", "on timer > ${1:10} {\n	$0\n}");
    pushHat("on loudness > n {}", "on loudness > ${1:10} {\n	$0\n}");
    push("not", CIK.Keyword, "Operators", "not ");
    push("abs()", CIK.Function, "Math", "abs($0)");
    push("round()", CIK.Function, "Math", "round($0)");
    push("sqrt()", CIK.Function, "Math", "sqrt($0)");
    push("floor()", CIK.Function, "Math", "floor($0)");
    push("ceiling()", CIK.Function, "Math", "ceiling($0)");
    push("sin()", CIK.Function, "Math", "sin($0)");
    push("cos()", CIK.Function, "Math", "cos($0)");
    push("tan()", CIK.Function, "Math", "tan($0)");
    push("asin()", CIK.Function, "Math", "asin($0)");
    push("acos()", CIK.Function, "Math", "acos($0)");
    push("atan()", CIK.Function, "Math", "atan($0)");
    push("ln()", CIK.Function, "Math", "ln($0)");
    push("log()", CIK.Function, "Math", "log($0)");
    push("exp()", CIK.Function, "Math", "exp($0)");
    push("pow10()", CIK.Function, "Math", "pow10($0)");
    push("[a] < [b]", CIK.Operator, "Comparison", "$1 < $0");
    push("[a] > [b]", CIK.Operator, "Comparison", "$1 > $0");
    push("[a] = [b]", CIK.Operator, "Comparison", "$1 = $0");
    push("touching()", CIK.Function, "Sensing", 'touching("$0")');
    push("key()", CIK.Function, "Sensing", 'key("$0")');
    push("mouseDown", CIK.Variable, "Sensing", "mouseDown");
    push("mouseX", CIK.Variable, "Sensing", "mouseX");
    push("mouseY", CIK.Variable, "Sensing", "mouseY");
    push("xPos", CIK.Variable, "Motion", "xPos");
    push("yPos", CIK.Variable, "Motion", "yPos");
    push("direction", CIK.Variable, "Motion", "direction");
    push("timer", CIK.Variable, "Sensing", "timer");
    push("answer", CIK.Variable, "Sensing", "answer");
    push("loudness", CIK.Variable, "Sensing", "loudness");
    push("costumeNum", CIK.Variable, "Looks", "costumeNum");
    push("costumeName", CIK.Variable, "Looks", "costumeName");
    push("volume", CIK.Variable, "Sound", "volume");
    push("username", CIK.Variable, "Sensing", "username");
    push("daysSince2000", CIK.Variable, "Sensing", "daysSince2000");
    push("setDirection()", CIK.Function, "Motion", "setDirection($0)");
    push("pointTowards()", CIK.Function, "Motion", 'pointTowards("$0")');
    push("goToFront()", CIK.Function, "Motion", "goToFront()");
    push("goToBack()", CIK.Function, "Motion", "goToBack()");
    push("moveForward()", CIK.Function, "Motion", "moveForward($0)");
    push("moveBackward()", CIK.Function, "Motion", "moveBackward($0)");
    push("setEffect()", CIK.Function, "Looks", 'setEffect("${1:color}", $0)');
    push("changeEffect()", CIK.Function, "Looks", 'changeEffect("${1:color}", $0)');
    push("setVolume()", CIK.Function, "Sound", "setVolume($0)");
    push("changeVolume()", CIK.Function, "Sound", "changeVolume($0)");
    push("askAndWait()", CIK.Function, "Sensing", 'askAndWait("$0")');
    push("resetTimer()", CIK.Function, "Sensing", "resetTimer()");
    push("currentTime()", CIK.Function, "Sensing", 'currentTime("$0")');
    push("distanceTo()", CIK.Function, "Sensing", 'distanceTo("$0")');
    push("xOf()", CIK.Function, "Sensing", 'xOf("$0")');
    push("yOf()", CIK.Function, "Sensing", 'yOf("$0")');
    push("directionOf()", CIK.Function, "Sensing", 'directionOf("$0")');
    push("costumeNumOf()", CIK.Function, "Sensing", 'costumeNumOf("$0")');
    push("costumeNameOf()", CIK.Function, "Sensing", 'costumeNameOf("$0")');
    push("sizeOf()", CIK.Function, "Sensing", 'sizeOf("$0")');
    push("volumeOf()", CIK.Function, "Sensing", 'volumeOf("$0")');
    push("random()", CIK.Function, "Math", "random($1, $0)");
    push("join()", CIK.Function, "Operators", "join($1, $0)");
    push("letterOf()", CIK.Function, "Operators", "letterOf($1, $0)");
    push("contains()", CIK.Function, "Operators", "contains($1, $0)");
    push("clamp()", CIK.Function, "Math", "clamp($1, $2, $0)");
    push("yield()", CIK.Function, "Control", "yield()");
    push("[var] += n", CIK.Snippet, "Variables", "[$1] += $0");
    push("[var] -= n", CIK.Snippet, "Variables", "[$1] -= $0");
    push("[var] *= n", CIK.Snippet, "Variables", "[$1] *= $0");
    push("[var] /= n", CIK.Snippet, "Variables", "[$1] /= $0");
    push(
      "print()",
      CIK.Function,
      "Aliases \xB7 say()",
      "print($0)",
      "Alias for `say()` \u2014 print a value to the speech bubble"
    );
    push(
      "step()",
      CIK.Function,
      "Aliases \xB7 move()",
      "step($0)",
      "Alias for `move()` \u2014 move forward N steps"
    );
    push(
      "forward()",
      CIK.Function,
      "Aliases \xB7 move()",
      "forward($0)",
      "Alias for `move()` \u2014 move forward N steps"
    );
    push(
      "left()",
      CIK.Function,
      "Aliases \xB7 turnLeft()",
      "left($0)",
      "Alias for `turnLeft(degrees)`"
    );
    push(
      "right()",
      CIK.Function,
      "Aliases \xB7 turnRight()",
      "right($0)",
      "Alias for `turnRight(degrees)`"
    );
    push(
      "front()",
      CIK.Function,
      "Aliases \xB7 goToFront()",
      "front()",
      "Bring sprite to the front layer \u2014 alias for `goToFront()`"
    );
    push(
      "back()",
      CIK.Function,
      "Aliases \xB7 goToBack()",
      "back()",
      "Send sprite to the back layer \u2014 alias for `goToBack()`"
    );
    push(
      "clone()",
      CIK.Function,
      "Aliases \xB7 createClone()",
      "clone()",
      'Create a clone of this sprite \u2014 alias for `createClone("_myself_")`'
    );
    push(
      "stopMe()",
      CIK.Function,
      "Aliases \xB7 stopThis()",
      "stopMe()",
      "Stop this script \u2014 alias for `stopThis()`"
    );
    push(
      "ask()",
      CIK.Function,
      "Aliases \xB7 askAndWait()",
      'ask("$0")',
      "Ask a question and wait \u2014 alias for `askAndWait()`"
    );
    push(
      "send()",
      CIK.Function,
      "Aliases \xB7 broadcast()",
      'send("$0")',
      "Broadcast a message \u2014 alias for `broadcast()`"
    );
    push(
      "sendAndWait()",
      CIK.Function,
      "Aliases \xB7 broadcastAndWait()",
      'sendAndWait("$0")',
      "Broadcast and wait \u2014 alias for `broadcastAndWait()`"
    );
    push(
      "append()",
      CIK.Function,
      "Aliases \xB7 listAdd()",
      "append([$1], $0)",
      "Add item to end of list \u2014 alias for `listAdd(item, [list])`"
    );
    push(
      "push()",
      CIK.Function,
      "Aliases \xB7 listAdd()",
      "push([$1], $0)",
      "Add item to end of list \u2014 alias for `listAdd(item, [list])`"
    );
    push(
      "remove()",
      CIK.Function,
      "Aliases \xB7 listDelete()",
      "remove([$1], $0)",
      "Delete item at index \u2014 alias for `listDelete(index, [list])`"
    );
    push(
      "insert()",
      CIK.Function,
      "Aliases \xB7 listInsert()",
      "insert([$1], $2, $0)",
      "Insert item at index \u2014 alias for `listInsert(item, index, [list])`"
    );
    push(
      "replace()",
      CIK.Function,
      "Aliases \xB7 listReplace()",
      "replace([$1], $2, $0)",
      "Replace item at index \u2014 alias for `listReplace(index, [list], item)`"
    );
    push(
      "clear()",
      CIK.Function,
      "Aliases \xB7 listDeleteAll()",
      "clear([$0])",
      "Delete all items from list \u2014 alias for `listDeleteAll([list])`"
    );
    push("[var]++", CIK.Snippet, "Variables", "[$1]++", "Increment variable by 1 \u2014 sugar for `change [var] by 1`");
    push("[var]--", CIK.Snippet, "Variables", "[$1]--", "Decrement variable by 1 \u2014 sugar for `change [var] by -1`");
    push(
      "struct name {}",
      CIK.Snippet,
      "Struct \xB7 compile-time field group",
      "struct ${1:name} {\n	${2:field1}, ${3:field2}\n}",
      "Declare a named field group \u2014 variables like `[name.field]` are auto-created on compile\n\nExample:\n```\nstruct player { x, y, hp }\n// Creates [player.x], [player.y], [player.hp] in Scratch\n```"
    );
    push(
      "breakpoint",
      CIK.Keyword,
      "Debug \xB7 pause execution",
      "breakpoint",
      "Pause execution here and show the debug bar in scratchpiler \u2014 click Resume to continue"
    );
    push(
      "scratchroutine",
      CIK.Keyword,
      "Scratchroutines",
      "scratchroutine ${1:name}($2) {\n    $0\n}",
      "Define a named concurrent task (compiles to broadcast-based pseudo-coroutine)"
    );
    push(
      "launch",
      CIK.Keyword,
      "Scratchroutines",
      "launch ${1:name}($0)",
      "Fire and forget \u2014 broadcasts the scratchroutine without waiting"
    );
    push(
      "await",
      CIK.Keyword,
      "Scratchroutines",
      "await ${1:name}($0)",
      "Fire and wait \u2014 broadcasts the scratchroutine and blocks until it finishes"
    );
    push(
      "cancel",
      CIK.Keyword,
      "Scratchroutines",
      "cancel ${1:name}",
      "Set the cancel flag for a running scratchroutine \u2014 use checkCancel() inside the body to react"
    );
    push(
      "isRunning()",
      CIK.Function,
      "Scratchroutines",
      "isRunning(${1:name})",
      "Boolean \u2014 true if the named scratchroutine is currently running"
    );
    push(
      "checkCancel()",
      CIK.Function,
      "Scratchroutines",
      "checkCancel()",
      "Inside a scratchroutine body: stop this script if cancel has been requested"
    );
    push("[list].sum()", CIK.Function, "Lists \xB7 Aggregates", "[$1].sum()", "Sum all numeric items in the list");
    push("[list].min()", CIK.Function, "Lists \xB7 Aggregates", "[$1].min()", "Find the minimum numeric item in the list");
    push("[list].max()", CIK.Function, "Lists \xB7 Aggregates", "[$1].max()", "Find the maximum numeric item in the list");
    push("[list].count()", CIK.Function, "Lists \xB7 Aggregates", "[$1].count($0)", "Count how many items equal a given value");
    for (const s of scratchIndex.sprites)
      push(s.name, CIK.Class, "Sprite", s.name);
    for (const b of scratchIndex.stage.backdrops)
      push(b, CIK.File, "Backdrop", b);
    for (const v of scratchIndex.globalVariables)
      push(`[${v.name}]`, v.type === "list" ? CIK.Enum : CIK.Variable, `Global ${v.type}`, `[${v.name}]`);
    const activeName = getActiveSpriteNameFromDropdown();
    if (activeName === "__stage__") {
      for (const s of scratchIndex.stage.sounds)
        push(s, CIK.Event, "Sound", s);
    } else if (activeName) {
      const sprite = scratchIndex.sprites.find((s) => s.name === activeName);
      if (sprite) {
        for (const c of sprite.costumes)
          push(c, CIK.Color, "Costume", c);
        for (const s of sprite.sounds)
          push(s, CIK.Event, "Sound", s);
      }
      for (const v of scratchIndex.spriteVariables[activeName] ?? [])
        push(`[${v.name}]`, v.type === "list" ? CIK.Enum : CIK.Variable, `${activeName} ${v.type}`, `[${v.name}]`);
      for (const p of scratchIndex.customBlocks[activeName] ?? [])
        push(p, CIK.Function, "Custom block", p);
    }
    return items;
  }

  // src/overlay.css
  var overlay_default = `
        #scratchpiler-overlay {
            position: fixed; top: 0; left: 0;
            width: 100vw; height: 100vh;
            z-index: 99999; display: none; flex-direction: column;
            background: #00152b;
            font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        #scratchpiler-header {
            display: flex; align-items: center;
            background: #001d3d;
            border-top: 2px solid #ff8c00;
            border-bottom: 1px solid #002e5a;
            flex-shrink: 0; height: 42px; padding: 0 12px;
            box-sizing: border-box;
        }
        #scratchpiler-logo {
            width: 20px; height: 20px; object-fit: contain; flex-shrink: 0;
        }
        #scratchpiler-wordmark {
            display: flex; align-items: center; gap: 8px;
            padding-right: 14px; flex-shrink: 0;
            font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
            text-transform: uppercase; color: #e8f4ff;
            border-right: 1px solid #002e5a; height: 100%;
            user-select: none;
        }
        #scratchpiler-menubar {
            display: flex; align-items: center; gap: 2px;
            padding-left: 12px; height: 100%;
            position: relative;
        }
        .sp-menu-btn {
            background: transparent; border: none; color: #7285b7;
            font-family: inherit; font-size: 11px; letter-spacing: 0.03em;
            padding: 0 12px; height: 28px; cursor: pointer; border-radius: 3px;
            transition: color 0.1s, background 0.1s;
            white-space: nowrap;
        }
        .sp-menu-btn:hover, .sp-menu-btn.sp-menu-active { color: #e8f4ff; background: #002e5a; }

        #scratchpiler-header-center {
            flex: 1; display: flex; justify-content: center;
            overflow: hidden; text-overflow: ellipsis; padding: 0 12px;
        }
        #scratchpiler-status {
            color: #7285b7; font-size: 11px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            font-family: ui-monospace, 'SF Mono', Consolas, monospace;
        }

        #scratchpiler-header-actions {
            display: flex; align-items: center; gap: 8px; flex-shrink: 0;
        }
        #scratchpiler-compile-btn {
            height: 26px; background: #ff8c00; color: #001a38;
            border: 1px solid #ff8c00; border-radius: 3px;
            font-family: inherit; font-size: 11px; font-weight: 700;
            letter-spacing: 0.06em; padding: 0 14px; cursor: pointer;
            white-space: nowrap; transition: background 0.15s, box-shadow 0.15s;
        }
        #scratchpiler-compile-btn:hover {
            background: #ffaa33; border-color: #ffaa33;
            box-shadow: 0 0 16px rgba(255,140,0,0.4);
        }
        #scratchpiler-close-btn {
            width: 26px; height: 26px; display: flex;
            align-items: center; justify-content: center;
            background: transparent; border: none; border-radius: 3px;
            color: #7285b7; font-size: 14px; cursor: pointer;
            transition: color 0.15s, background 0.15s; flex-shrink: 0; padding: 0;
        }
        #scratchpiler-close-btn:hover { color: #e8f4ff; background: #002e5a; }

        #scratchpiler-workspace {
            display: flex; flex: 1; min-height: 0; width: 100%;
        }

        #scratchpiler-activitybar {
            width: 48px; background: #001326;
            display: flex; flex-direction: column; align-items: center;
            padding-top: 8px; gap: 12px; border-right: 1px solid #002e5a;
            flex-shrink: 0;
        }
        .sp-activity-btn {
            width: 36px; height: 36px; display: flex;
            align-items: center; justify-content: center;
            background: transparent; border: none; border-radius: 6px;
            color: #567399; cursor: pointer; transition: color 0.15s, background 0.15s;
            position: relative;
        }
        .sp-activity-btn:hover { color: #bbdaff; background: #001d3d; }
        .sp-activity-btn.sp-active { color: #ffffff; background: #002447; }
        .sp-activity-btn.sp-active::before {
            content: ''; position: absolute; left: 0; top: 8px; bottom: 8px;
            width: 2px; background: #ff8c00; border-radius: 0 2px 2px 0;
        }

        #scratchpiler-sidebar {
            width: 250px; background: #001a35;
            border-right: 1px solid #002e5a; display: flex; flex-direction: column;
            flex-shrink: 0; min-height: 0;
        }
        #scratchpiler-sidebar-title {
            padding: 10px 14px; font-size: 10px; font-weight: 700;
            letter-spacing: 0.08em; text-transform: uppercase;
            color: #567399; border-bottom: 1px solid #002e5a;
            user-select: none;
        }
        #scratchpiler-sidebar-content {
            flex: 1; overflow-y: auto; display: flex; flex-direction: column;
        }

        .sp-sidebar-panel { display: none !important; flex-direction: column; height: 100%; }
        .sp-sidebar-panel.active { display: flex !important; }

        /* Accordion */
        .sp-accordion {
            border-bottom: 1px solid #002e5a; display: flex; flex-direction: column;
        }
        .sp-accordion-header {
            padding: 8px 12px; font-size: 11px; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase;
            color: #bbdaff; background: #002247; cursor: pointer;
            user-select: none; display: flex; align-items: center; gap: 8px;
        }
        .sp-accordion-header:hover { background: #002c5c; }
        .sp-accordion-content { display: none; padding: 4px 0; }
        .sp-accordion-content.active { display: block; }
        .sp-chevron { font-size: 8px; color: #567399; transition: transform 0.15s; }

        /* Sub-accordion inside Explorer */
        .sp-sub-accordion {
            margin: 2px 0;
        }
        .sp-sub-accordion-header {
            padding: 6px 14px; font-size: 11px; font-weight: 600;
            color: #7285b7; cursor: pointer; user-select: none;
        }
        .sp-sub-accordion-header:hover { color: #bbdaff; }
        .sp-sub-accordion-content { display: none; padding: 2px 0; }
        .sp-sub-accordion-content.active { display: block; }

        /* Explorer lists */
        .sp-sidebar-list { display: flex; flex-direction: column; }
        .sp-list-item {
            display: flex; align-items: center; gap: 8px;
            padding: 6px 16px; color: #8ba3c7; font-size: 12px;
            cursor: pointer; user-select: none;
        }
        .sp-list-item:hover { background: #002852; color: #bbdaff; }
        .sp-list-item.active { background: #00366f; color: #ffffff; font-weight: 600; }
        .sp-item-icon { color: #567399; }
        .sp-list-item.active .sp-item-icon { color: #ff8c00; }

        /* Details list */
        .sp-detail-item {
            padding: 4px 26px; font-size: 11px; color: #bbdaff;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sp-detail-empty {
            padding: 4px 26px; font-size: 11px; color: #567399; font-style: italic;
        }

        /* Search Panel */
        .sp-search-container {
            padding: 12px; display: flex; flex-direction: column; gap: 8px;
            border-bottom: 1px solid #002e5a;
        }
        .sp-search-container input {
            background: #001021; border: 1px solid #002e5a; border-radius: 3px;
            color: #ffffff; font-family: inherit; font-size: 12px;
            padding: 6px 10px; width: 100%; box-sizing: border-box; outline: none;
        }
        .sp-search-container input:focus { border-color: #ff8c00; }
        .sp-search-actions { display: flex; gap: 6px; }
        .sp-search-actions button {
            flex: 1; background: #002e5a; color: #bbdaff; border: none;
            border-radius: 3px; padding: 6px; font-family: inherit; font-size: 11px;
            cursor: pointer; transition: background 0.15s, color 0.15s;
        }
        .sp-search-actions button:hover { background: #003e7a; color: #ffffff; }
        #scratchpiler-search-results { flex: 1; overflow-y: auto; padding: 8px 0; }

        .sp-search-no-results {
            padding: 12px; text-align: center; color: #567399; font-size: 12px;
        }
        .sp-search-group-header {
            padding: 6px 12px; background: #002247; font-size: 11px;
            font-weight: 700; color: #bbdaff; border-top: 1px solid #002e5a;
            border-bottom: 1px solid #002e5a;
        }
        .sp-search-result-item {
            padding: 6px 16px; font-size: 11px; color: #8ba3c7; cursor: pointer;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            font-family: ui-monospace, 'SF Mono', Consolas, monospace;
        }
        .sp-search-result-item:hover { background: #002852; color: #ffffff; }
        .sp-search-line-num { color: #ff8c00; font-weight: 700; margin-right: 4px; }

        /* Settings Panel */
        #sp-panel-settings { padding: 12px; display: flex; flex-direction: column; gap: 14px; }
        .sp-settings-group { display: flex; flex-direction: column; gap: 6px; }
        .sp-settings-group label { font-size: 11px; color: #bbdaff; font-weight: 600; }
        .sp-settings-group select {
            background: #001021; border: 1px solid #002e5a; border-radius: 3px;
            color: #ffffff; font-family: inherit; font-size: 12px;
            padding: 6px 10px; cursor: pointer; outline: none;
        }
        .sp-settings-group select:focus { border-color: #ff8c00; }
        .sp-settings-group.checkbox { flex-direction: row; align-items: center; gap: 8px; cursor: pointer; }
        .sp-settings-group.checkbox input { cursor: pointer; }
        .sp-settings-group.checkbox label { cursor: pointer; }

        /* Fixes Panel */
        #sp-panel-fixes { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .sp-fix-action {
            display: flex; align-items: center; gap: 10px;
            background: #001021; border: 1px solid #002e5a; border-radius: 6px;
            padding: 12px 14px; cursor: pointer; transition: all 0.15s ease;
            text-align: left; width: 100%; box-sizing: border-box;
        }
        .sp-fix-action:hover { background: #002852; border-color: #ff8c00; }
        .sp-fix-action-icon {
            flex-shrink: 0; width: 28px; height: 28px; border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            background: rgba(255,140,0,0.1); color: #ff8c00;
        }
        .sp-fix-action-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .sp-fix-action-title { font-size: 12px; font-weight: 600; color: #e8f4ff; }
        .sp-fix-action-desc { font-size: 10px; color: #6b8db5; line-height: 1.4; }
        .sp-fix-action.destructive .sp-fix-action-icon { background: rgba(255,60,60,0.1); color: #ff5555; }
        .sp-fix-action.destructive:hover { border-color: #ff5555; }

        #scratchpiler-editor-pane {
            flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0;
        }
        #scratchpiler-editor-container { flex: 1; min-height: 0; }

        .sp-dropdown {
            position: absolute; top: 100%; left: 0;
            background: #001d36; border: 1px solid #002e5a; border-radius: 4px;
            min-width: 220px; z-index: 100001;
            box-shadow: 0 6px 24px rgba(0,12,40,0.6); padding: 4px 0;
        }
        .sp-dropdown-item {
            display: block; width: 100%; background: none; border: none;
            color: #e8f4ff; font-family: inherit; font-size: 12px;
            padding: 7px 16px; cursor: pointer; text-align: left;
            transition: background 0.1s; box-sizing: border-box;
        }
        .sp-dropdown-item:hover { background: #002e5a; }
        .sp-dropdown-sep { height: 1px; background: #002e5a; margin: 3px 0; }

        #scratchpiler-dialog {
            position: absolute; inset: 0; z-index: 100002;
            display: flex; align-items: center; justify-content: center;
            background: rgba(0,10,25,0.75); backdrop-filter: blur(3px);
        }
        #scratchpiler-dialog-box {
            background: #001d3d; border: 1px solid #002e5a; border-radius: 6px;
            padding: 20px 22px; min-width: 280px;
            box-shadow: 0 8px 40px rgba(0,10,36,0.6);
        }
        #scratchpiler-dialog-title {
            color: #e8f4ff; font-size: 12px; font-weight: 700;
            letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px;
        }
        #scratchpiler-dialog-input {
            width: 100%; box-sizing: border-box;
            background: #001021; color: #e8f4ff;
            border: 1px solid #002e5a; border-radius: 3px;
            padding: 7px 10px; font-family: inherit; font-size: 12px;
            margin-bottom: 14px; outline: none;
        }
        #scratchpiler-dialog-input:focus { border-color: #ff8c00; }
        #scratchpiler-dialog-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .sp-dialog-btn {
            background: transparent; color: #7285b7; border: 1px solid #002e5a;
            border-radius: 3px; font-family: inherit; font-size: 11px;
            padding: 5px 14px; cursor: pointer;
            transition: color 0.1s, border-color 0.1s, background 0.1s;
        }
        .sp-dialog-btn:hover { color: #e8f4ff; border-color: #bbdaff; }
        .sp-dialog-btn.sp-primary {
            background: #ff8c00; color: #001a38; border-color: #ff8c00; font-weight: 700;
        }
        .sp-dialog-btn.sp-primary:hover { background: #ffaa33; border-color: #ffaa33; }

        #scratchpiler-trigger {
            position: fixed; bottom: 20px; left: 16px; z-index: 9998;
            display: flex; align-items: center; gap: 8px;
            background: #001d3d; color: #bbdaff;
            border: 1px solid #002e5a; border-radius: 6px;
            padding: 8px 14px; cursor: pointer;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            font-size: 12px; letter-spacing: 0.04em;
            transition: border-color 0.15s, box-shadow 0.15s, color 0.15s;
            user-select: none;
        }
        #scratchpiler-trigger:hover {
            border-color: #ff8c00; color: #e8f4ff;
            box-shadow: 0 0 12px rgba(255,140,0,0.25);
        }
        @media (prefers-reduced-motion: reduce) {
            #scratchpiler-close-btn, #scratchpiler-trigger,
            .sp-menu-btn, .sp-dialog-btn { transition: none; }
        }

        /* Search Nowhere */
        #sp-sn-backdrop {
            position: fixed; inset: 0; z-index: 999999;
            display: flex; align-items: flex-start; justify-content: center;
            padding-top: 72px;
            background: rgba(0,6,18,0.65); backdrop-filter: blur(3px);
        }
        #sp-sn-modal {
            width: min(680px, 90vw); background: #191e2d;
            border: 1px solid #2a3550; border-radius: 8px;
            box-shadow: 0 20px 70px rgba(0,0,0,0.75);
            display: flex; flex-direction: column; overflow: hidden;
            max-height: 72vh;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        #sp-sn-header {
            display: flex; align-items: center; gap: 10px;
            padding: 11px 16px; border-bottom: 1px solid #212a3f;
            background: #1c2236; flex-shrink: 0;
        }
        #sp-sn-icon { color: #ff8c00; flex-shrink: 0; }
        #sp-sn-input {
            flex: 1; background: transparent; border: none; outline: none;
            color: #e0eeff; font-family: inherit; font-size: 15px;
            caret-color: #ff8c00; min-width: 0;
        }
        #sp-sn-input::placeholder { color: #35486a; }
        #sp-sn-hint { font-size: 10px; color: #2d3f58; font-family: ui-monospace, monospace; flex-shrink: 0; white-space: nowrap; }
        #sp-sn-tabs {
            display: flex; border-bottom: 1px solid #212a3f;
            background: #191e2d; padding: 0 8px; gap: 2px; flex-shrink: 0;
        }
        .sp-sn-tab {
            background: transparent; border: none; color: #4d6588;
            font-family: inherit; font-size: 12px; padding: 8px 14px;
            cursor: pointer; border-bottom: 2px solid transparent;
            transition: color 0.1s, border-color 0.1s; margin-bottom: -1px;
            white-space: nowrap;
        }
        .sp-sn-tab:hover { color: #8fafd4; }
        .sp-sn-tab.sp-sn-active { color: #ddeeff; border-bottom-color: #ff8c00; }
        .sp-sn-tab-void { color: #7a4a8a !important; }
        .sp-sn-tab-void:hover { color: #b07ac0 !important; }
        .sp-sn-tab-void.sp-sn-active { color: #c898d8 !important; border-bottom-color: #9b59b6 !important; }
        #sp-sn-results { flex: 1; overflow-y: auto; min-height: 0; }
        .sp-sn-group-header {
            padding: 5px 16px; font-size: 10px; font-weight: 700;
            letter-spacing: 0.1em; text-transform: uppercase;
            color: #3d5270; background: #141824;
            border-top: 1px solid #1c2236; border-bottom: 1px solid #1c2236;
            user-select: none; position: sticky; top: 0;
        }
        .sp-sn-result {
            display: flex; align-items: center; gap: 10px;
            padding: 6px 16px; cursor: pointer; min-height: 34px;
            transition: background 0.07s;
        }
        .sp-sn-result:hover, .sp-sn-result.sp-sn-focused { background: #223050; }
        .sp-sn-result.sp-sn-void:hover, .sp-sn-result.sp-sn-void.sp-sn-focused { background: #1e1028; }
        .sp-sn-result-icon { flex-shrink: 0; font-size: 12px; width: 18px; text-align: center; color: #4d6588; }
        .sp-sn-result.sp-sn-void .sp-sn-result-icon { color: #7a4a8a; }
        .sp-sn-result-main { flex: 1; min-width: 0; }
        .sp-sn-result-label { font-size: 13px; color: #bdd4ee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
        .sp-sn-result-label em { color: #ff8c00; font-style: normal; font-weight: 600; }
        .sp-sn-result.sp-sn-void .sp-sn-result-label { color: #9070a8; }
        .sp-sn-result-sub { font-size: 11px; color: #3d5270; font-family: ui-monospace, 'SF Mono', Consolas, monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px; display: block; }
        .sp-sn-result.sp-sn-void .sp-sn-result-sub { color: #4a2d5a; }
        .sp-sn-result-badge { font-size: 10px; color: #3d5270; flex-shrink: 0; background: #141824; padding: 1px 5px; border-radius: 3px; font-family: ui-monospace, monospace; }
        .sp-sn-pro { font-size: 9px; background: linear-gradient(90deg,#b8860b,#daa520); color: #100800; padding: 1px 4px; border-radius: 2px; font-weight: 800; vertical-align: middle; margin-left: 4px; letter-spacing: 0.04em; }
        .sp-sn-empty { padding: 32px 16px; text-align: center; color: #35486a; font-size: 13px; line-height: 1.6; }
        .sp-sn-empty-icon { font-size: 26px; margin-bottom: 8px; }
        #sp-sn-footer {
            display: flex; align-items: center; justify-content: space-between;
            padding: 5px 16px; border-top: 1px solid #1c2236;
            background: #141824; flex-shrink: 0;
        }
        #sp-sn-status { font-size: 11px; color: #3d5270; }
        #sp-sn-tip { font-size: 10px; color: #263040; font-family: ui-monospace, monospace; }

        /* Compile button flash */
        @keyframes sp-flash-success {
            0%   { background: #ff8c00; border-color: #ff8c00; box-shadow: none; }
            35%  { background: #22c55e; border-color: #22c55e; box-shadow: 0 0 20px rgba(34,197,94,0.55); }
            100% { background: #ff8c00; border-color: #ff8c00; box-shadow: none; }
        }
        @keyframes sp-flash-error {
            0%   { background: #ff8c00; border-color: #ff8c00; box-shadow: none; }
            35%  { background: #ef4444; border-color: #ef4444; box-shadow: 0 0 20px rgba(239,68,68,0.55); }
            100% { background: #ff8c00; border-color: #ff8c00; box-shadow: none; }
        }
        #scratchpiler-compile-btn.sp-flash-ok  { animation: sp-flash-success 0.65s ease forwards; }
        #scratchpiler-compile-btn.sp-flash-err { animation: sp-flash-error  0.65s ease forwards; }

        /* Sidebar resize handle */
        #sp-sidebar-resize {
            width: 4px; cursor: col-resize; background: transparent;
            flex-shrink: 0; transition: background 0.15s; z-index: 1;
        }
        #sp-sidebar-resize:hover, #sp-sidebar-resize.sp-resizing { background: #ff8c0066; }

        /* Output panel */
        #sp-output-panel {
            border-top: 1px solid #002e5a; background: #001021;
            display: flex; flex-direction: column; flex-shrink: 0;
            overflow: hidden; height: 26px; transition: height 0.15s ease;
        }
        #sp-output-panel.sp-expanded { height: 160px; }
        #sp-output-header {
            display: flex; align-items: center; gap: 4px; flex-shrink: 0;
            padding: 0 8px; height: 26px; cursor: pointer;
            border-bottom: 1px solid #002e5a; user-select: none;
        }
        #sp-output-header:hover { background: #001d3d; }
        #sp-output-header-title {
            font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
            text-transform: uppercase; color: #567399; flex: 1;
        }
        .sp-out-hdr-btn {
            background: transparent; border: none; color: #567399;
            font-family: inherit; font-size: 10px; cursor: pointer; padding: 2px 6px;
            border-radius: 3px; line-height: 1;
            transition: color 0.1s, background 0.1s;
        }
        .sp-out-hdr-btn:hover { color: #bbdaff; background: #002247; }
        #sp-output-log {
            flex: 1; overflow-y: auto; padding: 2px 0; min-height: 0;
            font-family: ui-monospace, 'SF Mono', Consolas, monospace; font-size: 11px;
            display: none;
        }
        #sp-output-panel.sp-expanded #sp-output-log { display: block; }
        .sp-out-entry {
            padding: 1px 10px; line-height: 1.55;
            display: flex; gap: 8px; align-items: baseline;
        }
        .sp-out-entry.info  .sp-out-text { color: #8ba3c7; }
        .sp-out-entry.ok    .sp-out-text { color: #4ade80; }
        .sp-out-entry.error .sp-out-text { color: #f87171; }
        .sp-out-entry.warn  .sp-out-text { color: #fbbf24; }
        .sp-out-time { color: #2d3f58; flex-shrink: 0; }

        /* Sprite Picker (Ctrl+P) */
        #sp-picker-backdrop {
            position: absolute; inset: 0; z-index: 100003;
            display: flex; align-items: flex-start; justify-content: center;
            padding-top: 60px; background: rgba(0,6,18,0.55);
        }
        #sp-picker-modal {
            width: min(440px, 90%); background: #191e2d;
            border: 1px solid #2a3550; border-radius: 8px;
            box-shadow: 0 20px 70px rgba(0,0,0,0.75);
            display: flex; flex-direction: column; overflow: hidden;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        #sp-picker-input {
            width: 100%; background: transparent; border: none;
            border-bottom: 1px solid #212a3f; outline: none;
            color: #e0eeff; font-family: inherit; font-size: 14px;
            caret-color: #ff8c00; padding: 11px 16px; box-sizing: border-box;
        }
        #sp-picker-input::placeholder { color: #35486a; }
        #sp-picker-list { max-height: 280px; overflow-y: auto; padding: 4px 0; }
        .sp-picker-item {
            display: flex; align-items: center; gap: 10px;
            padding: 7px 16px; cursor: pointer; transition: background 0.07s;
        }
        .sp-picker-item:hover, .sp-picker-item.sp-picker-focused { background: #223050; }
        .sp-picker-item-icon { color: #567399; font-size: 11px; flex-shrink: 0; width: 16px; text-align: center; }
        .sp-picker-item-name { font-size: 13px; color: #bdd4ee; }
        .sp-picker-item-name em { color: #ff8c00; font-style: normal; font-weight: 600; }
        .sp-picker-item-sub { font-size: 11px; color: #3d5270; margin-left: auto; flex-shrink: 0; }
        #sp-picker-empty { padding: 18px 16px; text-align: center; color: #35486a; font-size: 13px; }
        #sp-picker-footer {
            padding: 5px 12px; border-top: 1px solid #1c2236;
            background: #141824; font-size: 10px; color: #263040;
            font-family: ui-monospace, monospace;
        }

        /* Sprite context menu */
        .sp-ctx-menu {
            position: fixed; z-index: 999998;
            background: #001d36; border: 1px solid #002e5a; border-radius: 4px;
            min-width: 195px; box-shadow: 0 6px 24px rgba(0,12,40,0.65); padding: 4px 0;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .sp-ctx-item {
            display: flex; align-items: center; justify-content: space-between;
            width: 100%; background: none; border: none;
            color: #e8f4ff; font-family: inherit; font-size: 12px;
            padding: 7px 16px; cursor: pointer; text-align: left;
            transition: background 0.1s; box-sizing: border-box;
        }
        .sp-ctx-item:hover { background: #002e5a; }
        .sp-ctx-shortcut { color: #567399; font-size: 10px; font-family: ui-monospace, monospace; }
        .sp-ctx-sep { height: 1px; background: #002e5a; margin: 3px 0; }

        /* Clickable detail items */
        .sp-detail-item { cursor: pointer; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sp-detail-item:hover { background: #002447; color: #e8f4ff; }

        /* Variable/list item row with action button */
        .sp-detail-item-row {
            display: flex; align-items: center;
            padding: 0; margin: 0;
        }
        .sp-detail-item-row .sp-detail-item { padding: 4px 4px 4px 26px; }
        .sp-detail-action-btn {
            flex-shrink: 0; width: 22px; height: 22px; margin-right: 4px;
            background: none; border: none; color: #3a5276; cursor: pointer;
            border-radius: 3px; font-size: 13px; line-height: 1;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.1s, background 0.1s, color 0.1s;
        }
        .sp-detail-item-row:hover .sp-detail-action-btn { opacity: 1; }
        .sp-detail-action-btn:hover { background: #002e5a; color: #e8f4ff; }

        /* Floating context menu (fixed-position) */
        .sp-context-menu {
            position: fixed !important;
            top: auto; left: auto;
        }

        /* Debug bar */
        #sp-debug-bar {
            background: #0d001a; border-top: 2px solid #9b59b6;
            padding: 7px 14px; display: flex; align-items: center; gap: 12px;
            flex-shrink: 0; font-size: 12px;
        }
        #sp-debug-label { color: #c39bd3; font-family: ui-monospace, 'SF Mono', Consolas, monospace; }
        #sp-debug-resume-btn {
            background: #6c3483; border: 1px solid #9b59b6; border-radius: 4px;
            color: #e8daef; font-family: inherit; font-size: 11px;
            padding: 4px 12px; cursor: pointer; transition: background 0.1s;
        }
        #sp-debug-resume-btn:hover { background: #8e44ad; }

        /* ===== Sprite Tab Bar ===== */
        #sp-tab-bar {
            display: flex; align-items: flex-end;
            height: 35px; background: #001020;
            border-bottom: 1px solid #001d35;
            overflow-x: auto; overflow-y: hidden; flex-shrink: 0;
            scrollbar-width: thin; scrollbar-color: #002e5a transparent;
        }
        #sp-tab-bar::-webkit-scrollbar { height: 3px; background: transparent; }
        #sp-tab-bar::-webkit-scrollbar-thumb { background: #002e5a; border-radius: 2px; }

        .sp-tab {
            display: flex; align-items: center; gap: 6px;
            padding: 0 12px 0 10px; height: 34px;
            background: #001326; color: #567399;
            font-size: 12px; cursor: pointer;
            border-right: 1px solid #001d35;
            border-top: 2px solid transparent;
            white-space: nowrap; flex-shrink: 0;
            transition: color 0.1s, background 0.1s;
            user-select: none;
        }
        .sp-tab:hover { color: #bbdaff; background: #001a35; }
        .sp-tab.sp-tab-active {
            background: #00152b; color: #e8f4ff;
            border-top-color: #ff8c00;
            border-bottom: 1px solid #00152b;
            margin-bottom: -1px;
        }
        .sp-tab-icon { font-size: 12px; color: #567399; flex-shrink: 0; }
        .sp-tab.sp-tab-active .sp-tab-icon { color: #ff8c00; }
        .sp-tab-name { font-size: 12px; }
        .sp-tab-close {
            width: 14px; height: 14px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 3px; color: transparent; font-size: 12px;
            flex-shrink: 0; background: transparent; border: none;
            cursor: pointer; padding: 0; line-height: 1; font-family: inherit;
            transition: background 0.1s, color 0.1s;
        }
        .sp-tab:hover .sp-tab-close,
        .sp-tab.sp-tab-active .sp-tab-close { color: #567399; }
        .sp-tab-close:hover { background: #003e7a !important; color: #e8f4ff !important; }
        .sp-tab.sp-tab-active .sp-tab-close:hover {
            background: rgba(255,140,0,0.12) !important; color: #ff8c00 !important;
        }

        /* ===== Bottom Status Bar ===== */
        #sp-status-bar {
            height: 22px; display: flex; align-items: stretch;
            background: #001020; border-top: 1px solid #001d35;
            font-size: 11px; flex-shrink: 0; color: #567399;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .sp-sb-group { display: flex; align-items: center; }
        .sp-sb-left  { flex: 1; overflow: hidden; }
        .sp-sb-right { flex-shrink: 0; }
        .sp-sb-item  {
            padding: 0 8px; display: flex; align-items: center;
            gap: 4px; height: 100%; white-space: nowrap;
        }
        .sp-sb-clickable { cursor: pointer; }
        .sp-sb-clickable:hover { background: #002247; color: #bbdaff; }
        .sp-sb-vsep { color: #001d35; font-size: 13px; line-height: 22px; flex-shrink: 0; }
        .sp-sb-dot  { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .sp-sb-dot-pending { background: #fbbf24; }
        .sp-sb-dot-ok      { background: #4ade80; }
        .sp-sb-dot-error   { background: #f87171; }
        #sp-sb-err-count  { color: #f87171; }
        #sp-sb-warn-count { color: #fbbf24; margin-left: 4px; }
        #sp-sb-err-count.sp-sb-zero, #sp-sb-warn-count.sp-sb-zero { color: #567399; }
        .sp-sb-mono { font-family: ui-monospace, 'SF Mono', Consolas, monospace; }
`;

  // src/overlay.html
  var overlay_default2 = '\n        <div id="scratchpiler-header">\n            <div id="scratchpiler-wordmark">\n                <img id="scratchpiler-logo" src="" alt="" />\n                Scratchpiler\n            </div>\n            <div id="scratchpiler-menubar">\n                <button class="sp-menu-btn" id="sp-menu-file">File</button>\n                <button class="sp-menu-btn" id="sp-menu-edit">Edit</button>\n                <button class="sp-menu-btn" id="sp-menu-variables">Variables</button>\n                <button class="sp-menu-btn" id="sp-menu-lists">Lists</button>\n                <button class="sp-menu-btn" id="sp-menu-help">Help</button>\n            </div>\n            <div id="scratchpiler-header-center">\n                <span id="scratchpiler-status">&mdash;</span>\n            </div>\n            <div id="scratchpiler-header-actions">\n                <button id="scratchpiler-compile-btn">Compile &amp; Inject</button>\n                <button id="scratchpiler-close-btn" title="Close (Escape)">\u2715</button>\n\n                <!-- Hidden compat buttons -->\n                <button id="scratchpiler-import-btn" style="display:none"></button>\n                <button id="scratchpiler-format-btn" style="display:none"></button>\n            </div>\n        </div>\n        <div id="scratchpiler-workspace">\n            <div id="scratchpiler-activitybar">\n                <button class="sp-activity-btn sp-active" id="sp-activity-explorer" title="Explorer">\n                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H4v16h16v-12l-4-4z"/><path d="M16 4v4h4"/></svg>\n                </button>\n                <button class="sp-activity-btn" id="sp-activity-search" title="Search">\n                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>\n                </button>\n                <button class="sp-activity-btn" id="sp-activity-settings" title="Settings">\n                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>\n                </button>\n                <button class="sp-activity-btn" id="sp-activity-fixes" title="Fixes">\n                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>\n                </button>\n            </div>\n            <div id="scratchpiler-sidebar">\n                <div id="scratchpiler-sidebar-title">Explorer</div>\n                <div id="scratchpiler-sidebar-content">\n                    <!-- Explorer Panel -->\n                    <div class="sp-sidebar-panel active" id="sp-panel-explorer">\n                        <!-- Sprites Accordion -->\n                        <div class="sp-accordion">\n                            <div class="sp-accordion-header active" id="sp-acc-sprites-header">\n                                <span class="sp-chevron">\u25BC</span> Sprites\n                            </div>\n                            <div class="sp-accordion-content active" id="sp-acc-sprites-content">\n                                <div class="sp-sidebar-list" id="scratchpiler-sprites-list"></div>\n                            </div>\n                        </div>\n                        <!-- Sprite Details Accordion -->\n                        <div class="sp-accordion">\n                            <div class="sp-accordion-header active" id="sp-acc-details-header">\n                                <span class="sp-chevron">\u25BC</span> Sprite Details: <span id="scratchpiler-detail-spritename">-</span>\n                            </div>\n                            <div class="sp-accordion-content active" id="sp-acc-details-content">\n                                <!-- Costumes sub-accordion -->\n                                <div class="sp-sub-accordion">\n                                    <div class="sp-sub-accordion-header active" id="sp-subacc-costumes-header">\u25BC Costumes</div>\n                                    <div class="sp-sub-accordion-content active" id="sp-subacc-costumes-content"></div>\n                                </div>\n                                <!-- Sounds sub-accordion -->\n                                <div class="sp-sub-accordion">\n                                    <div class="sp-sub-accordion-header active" id="sp-subacc-sounds-header">\u25BC Sounds</div>\n                                    <div class="sp-sub-accordion-content active" id="sp-subacc-sounds-content"></div>\n                                </div>\n                                <!-- Variables sub-accordion -->\n                                <div class="sp-sub-accordion">\n                                    <div class="sp-sub-accordion-header active" id="sp-subacc-variables-header">\u25BC Local Variables</div>\n                                    <div class="sp-sub-accordion-content active" id="sp-subacc-variables-content"></div>\n                                </div>\n                                <!-- Custom Blocks sub-accordion -->\n                                <div class="sp-sub-accordion">\n                                    <div class="sp-sub-accordion-header active" id="sp-subacc-customblocks-header">\u25BC Custom Blocks</div>\n                                    <div class="sp-sub-accordion-content active" id="sp-subacc-customblocks-content"></div>\n                                </div>\n                            </div>\n                        </div>\n                    </div>\n\n                    <!-- Search Panel -->\n                    <div class="sp-sidebar-panel" id="sp-panel-search">\n                        <div class="sp-search-container">\n                            <input type="text" id="scratchpiler-search-input" placeholder="Search..." autocomplete="off" />\n                            <input type="text" id="scratchpiler-replace-input" placeholder="Replace" autocomplete="off" />\n                            <div class="sp-search-actions">\n                                <button id="scratchpiler-search-btn" title="Search">Find</button>\n                                <button id="scratchpiler-replace-btn" title="Replace Current">Replace</button>\n                                <button id="scratchpiler-replace-all-btn" title="Replace All">All</button>\n                            </div>\n                        </div>\n                        <div id="scratchpiler-search-results"></div>\n                    </div>\n\n                    <!-- Settings Panel -->\n                    <div class="sp-sidebar-panel" id="sp-panel-settings">\n                        <div class="sp-settings-group">\n                            <label for="sp-setting-theme">Editor Theme</label>\n                            <select id="sp-setting-theme">\n                                <option value="scratchpiler-dark">Scratchpiler Dark</option>\n                                <option value="vs-dark">VS Code Dark</option>\n                                <option value="hc-black">High Contrast Black</option>\n                                <option value="vs">VS Code Light</option>\n                            </select>\n                        </div>\n                        <div class="sp-settings-group">\n                            <label for="sp-setting-fontsize">Font Size</label>\n                            <select id="sp-setting-fontsize">\n                                <option value="12">12px</option>\n                                <option value="13">13px</option>\n                                <option value="14">14px</option>\n                                <option value="15">15px</option>\n                                <option value="16">16px</option>\n                                <option value="18">18px</option>\n                                <option value="20">20px</option>\n                            </select>\n                        </div>\n                        <div class="sp-settings-group checkbox">\n                            <input type="checkbox" id="sp-setting-wrap" />\n                            <label for="sp-setting-wrap">Line Wrap</label>\n                        </div>\n                        <div class="sp-settings-group checkbox">\n                            <input type="checkbox" id="sp-setting-minimap" />\n                            <label for="sp-setting-minimap">Show Minimap</label>\n                        </div>\n                        <div class="sp-settings-group">\n                            <label for="sp-setting-tabsize">Tab Size</label>\n                            <select id="sp-setting-tabsize">\n                                <option value="2">2 spaces</option>\n                                <option value="4">4 spaces</option>\n                                <option value="8">8 spaces</option>\n                            </select>\n                        </div>\n                        <div class="sp-settings-group">\n                            <label for="sp-setting-autosave">Auto-save Delay</label>\n                            <select id="sp-setting-autosave">\n                                <option value="0">Instant</option>\n                                <option value="500">500 ms</option>\n                                <option value="1000">1 second</option>\n                                <option value="2000">2 seconds</option>\n                            </select>\n                        </div>\n                        <div style="font-size:11px; color:#6b8db5; margin-top:4px; margin-bottom:2px;">Lint Rules</div>\n                        <div class="sp-settings-group checkbox">\n                            <input type="checkbox" id="sp-setting-lint-typecheck" />\n                            <label for="sp-setting-lint-typecheck">Type checking (list vs variable)</label>\n                        </div>\n                        <div class="sp-settings-group checkbox">\n                            <input type="checkbox" id="sp-setting-lint-unreachable" />\n                            <label for="sp-setting-lint-unreachable">Unreachable code</label>\n                        </div>\n                        <div class="sp-settings-group checkbox">\n                            <input type="checkbox" id="sp-setting-lint-orphaned" />\n                            <label for="sp-setting-lint-orphaned">Orphaned blocks</label>\n                        </div>\n                    </div>\n\n                    <!-- Fixes Panel -->\n                    <div class="sp-sidebar-panel" id="sp-panel-fixes">\n                        <div style="font-size:11px; color:#6b8db5; margin-bottom:4px;">Maintenance & recovery actions</div>\n\n                        <button class="sp-fix-action" id="sp-fix-clear-cache">\n                            <div class="sp-fix-action-icon">\n                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>\n                            </div>\n                            <div class="sp-fix-action-text">\n                                <span class="sp-fix-action-title">Clear Local Code Cache</span>\n                                <span class="sp-fix-action-desc">Purge all cached SDSL code from localStorage. The editor will decompile fresh from the VM on next sprite switch.</span>\n                            </div>\n                        </button>\n\n                        <button class="sp-fix-action" id="sp-fix-reindex">\n                            <div class="sp-fix-action-icon">\n                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>\n                            </div>\n                            <div class="sp-fix-action-text">\n                                <span class="sp-fix-action-title">Invalidate &amp; Re-Index</span>\n                                <span class="sp-fix-action-desc">Re-scan all VM targets to rebuild the sprite index, variables, and custom blocks. Fixes stale sidebar data.</span>\n                            </div>\n                        </button>\n\n                        <button class="sp-fix-action destructive" id="sp-fix-reset-all">\n                            <div class="sp-fix-action-icon">\n                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>\n                            </div>\n                            <div class="sp-fix-action-text">\n                                <span class="sp-fix-action-title">Reset All Changes</span>\n                                <span class="sp-fix-action-desc">Remove all Scratchpiler-injected blocks and clear cached code. Restores sprites to their last-saved project state.</span>\n                            </div>\n                        </button>\n                    </div>\n                </div>\n            </div>\n            <div id="sp-sidebar-resize" title="Drag to resize"></div>\n            <div id="scratchpiler-editor-pane">\n                <div id="sp-tab-bar"></div>\n                <div id="scratchpiler-editor-container"></div>\n                <div id="sp-output-panel">\n                    <div id="sp-output-header" title="Toggle Output panel">\n                        <span id="sp-output-header-title">Output</span>\n                        <button class="sp-out-hdr-btn" id="sp-output-clear-btn" title="Clear output">Clear</button>\n                        <button class="sp-out-hdr-btn" id="sp-output-toggle-btn" title="Expand / Collapse">\u25B8</button>\n                    </div>\n                    <div id="sp-output-log"></div>\n                </div>\n            </div>\n        </div>\n        <div id="sp-debug-bar" style="display:none">\n            <span id="sp-debug-label">&#9646;&#9646; Paused at breakpoint</span>\n            <button id="sp-debug-resume-btn">Resume &#9654;</button>\n        </div>\n        <div id="sp-status-bar">\n            <div class="sp-sb-group sp-sb-left">\n                <span class="sp-sb-item" id="sp-sb-vm-status">\n                    <span class="sp-sb-dot sp-sb-dot-pending" id="sp-sb-vm-dot"></span>\n                    <span id="sp-sb-vm-text">Acquiring VM</span>\n                </span>\n                <span class="sp-sb-vsep">\u2502</span>\n                <span class="sp-sb-item" id="sp-sb-sprite-name">&mdash;</span>\n                <span class="sp-sb-vsep">\u2502</span>\n                <span class="sp-sb-item sp-sb-clickable" id="sp-sb-problems" title="Toggle Output panel">\n                    <span id="sp-sb-err-count" class="sp-sb-zero">0 errors</span>\n                    <span id="sp-sb-warn-count" class="sp-sb-zero">0 warnings</span>\n                </span>\n            </div>\n            <div class="sp-sb-group sp-sb-right">\n                <span class="sp-sb-item sp-sb-mono" id="sp-sb-cursor">Ln 1, Col 1</span>\n            </div>\n        </div>\n        <div id="sp-picker-backdrop" style="display:none">\n            <div id="sp-picker-modal" role="dialog" aria-label="Go to Sprite">\n                <input id="sp-picker-input" autocomplete="off" spellcheck="false" placeholder="Go to sprite\u2026" />\n                <div id="sp-picker-list"></div>\n                <div id="sp-picker-footer">\u2191\u2193 navigate \xB7 Enter select \xB7 Esc close</div>\n            </div>\n        </div>\n        <div id="scratchpiler-dialog" style="display:none">\n            <div id="scratchpiler-dialog-box">\n                <div id="scratchpiler-dialog-title"></div>\n                <input id="scratchpiler-dialog-input" type="text" autocomplete="off" spellcheck="false" />\n                <div id="scratchpiler-dialog-actions">\n                    <button class="sp-dialog-btn" id="scratchpiler-dialog-cancel">Cancel</button>\n                    <button class="sp-dialog-btn sp-primary" id="scratchpiler-dialog-ok">Create</button>\n                </div>\n            </div>\n        </div>\n    ';

  // src/decompiler.js
  function fieldVal(block, name) {
    const f = block.fields && block.fields[name];
    if (!f) return null;
    return Array.isArray(f) ? f[0] : f.value;
  }
  function inpBlock(block, name, B) {
    const input = block.inputs && block.inputs[name];
    if (!input) return null;
    if (Array.isArray(input)) {
      const ref = input[1];
      return Array.isArray(ref) ? null : B[ref] || null;
    }
    const id = input.block !== null && input.block !== void 0 ? input.block : input.shadow;
    return id ? B[id] || null : null;
  }
  function inpBlockId(block, name) {
    const input = block.inputs && block.inputs[name];
    if (!input) return null;
    if (Array.isArray(input)) {
      const ref = input[1];
      return Array.isArray(ref) ? null : ref;
    }
    return input.block || null;
  }
  function decompInput(block, name, B, isNum) {
    const input = block.inputs && block.inputs[name];
    if (!input) return isNum ? "0" : '""';
    return decompInputRaw(input, B, isNum);
  }
  function decompInputRaw(input, B, isNum) {
    let blockId, shadowId;
    if (Array.isArray(input)) {
      const ref = input[1];
      if (Array.isArray(ref)) {
        const t = ref[0];
        if (t === 4 || t === 5 || t === 6 || t === 7 || t === 8) return String(ref[1] ?? "0");
        if (t === 10) return JSON.stringify(String(ref[1] ?? ""));
        if (t === 11) return JSON.stringify(String(ref[1] ?? ""));
        if (t === 12) return `[${ref[1]}]`;
        if (t === 13) return `[${ref[1]}]`;
        return isNum ? "0" : '""';
      }
      blockId = ref;
      shadowId = input[2] || null;
    } else {
      blockId = input.block ?? null;
      shadowId = input.shadow ?? null;
    }
    if (blockId === null || blockId === shadowId) {
      if (!shadowId) return isNum ? "0" : '""';
      const s = B[shadowId];
      return s ? decompExpr(s, B) : isNum ? "0" : '""';
    }
    const b = B[blockId];
    return b ? decompExpr(b, B) : isNum ? "0" : '""';
  }
  function decompBroadcast(block, inputName, B) {
    const input = block.inputs && block.inputs[inputName];
    if (!input) return '""';
    if (Array.isArray(input)) {
      const ref = input[1];
      if (Array.isArray(ref) && ref[0] === 11) return JSON.stringify(String(ref[1] ?? ""));
    }
    const id = Array.isArray(input) ? Array.isArray(input[1]) ? null : input[1] : input.block ?? input.shadow ?? null;
    const b = id && B[id];
    if (!b) return '""';
    if (b.opcode === "event_broadcast_menu") return JSON.stringify(fieldVal(b, "BROADCAST_OPTION") ?? "");
    return decompExpr(b, B);
  }
  function decompExpr(block, B) {
    if (!block) return "false";
    switch (block.opcode) {
      case "math_number":
      case "math_integer":
      case "math_angle":
      case "math_whole_number":
      case "math_positive_number":
        return String(fieldVal(block, "NUM") ?? "0");
      case "text":
        return JSON.stringify(String(fieldVal(block, "TEXT") ?? ""));
      case "data_variable":
        return `[${fieldVal(block, "VARIABLE") ?? ""}]`;
      case "data_listcontents":
        return `[${fieldVal(block, "LIST") ?? ""}]`;
      case "motion_xposition":
        return "xPos";
      case "motion_yposition":
        return "yPos";
      case "motion_direction":
        return "direction";
      case "looks_size":
        return "size";
      case "looks_costumenumbername":
        return fieldVal(block, "NUMBER_NAME") === "name" ? "costumeName" : "costumeNum";
      case "sensing_timer":
        return "timer";
      case "sensing_answer":
        return "answer";
      case "sensing_mousedown":
        return "mouseDown";
      case "sensing_mousex":
        return "mouseX";
      case "sensing_mousey":
        return "mouseY";
      case "sensing_loudness":
        return "loudness";
      case "sound_volume":
        return "volume";
      case "sensing_username":
        return "username";
      case "sensing_dayssince2000":
        return "daysSince2000";
      case "operator_random":
        return `random(${decompInput(block, "FROM", B, true)}, ${decompInput(block, "TO", B, true)})`;
      case "operator_join":
        return `join(${decompInput(block, "STRING1", B, false)}, ${decompInput(block, "STRING2", B, false)})`;
      case "operator_letter_of":
        return `letterOf(${decompInput(block, "LETTER", B, true)}, ${decompInput(block, "STRING", B, false)})`;
      case "operator_contains":
        return `contains(${decompInput(block, "STRING1", B, false)}, ${decompInput(block, "STRING2", B, false)})`;
      case "motion_distanceto": {
        const menuId = inpBlockId(block, "DISTANCETOMENU");
        const menu = menuId && B[menuId];
        return `distanceTo("${fieldVal(menu, "DISTANCETOMENU") ?? "_mouse_"}")`;
      }
      case "sensing_current": {
        const unit = (fieldVal(block, "CURRENTMENU") ?? "HOUR").toLowerCase();
        return `currentTime("${unit}")`;
      }
      case "sensing_of": {
        const prop = fieldVal(block, "PROPERTY") ?? "";
        const menuId = inpBlockId(block, "OBJECT");
        const menu = menuId && B[menuId];
        const sprite = fieldVal(menu, "OBJECT") ?? "";
        const REV_PROP = {
          "x position": "xOf",
          "y position": "yOf",
          "direction": "directionOf",
          "costume #": "costumeNumOf",
          "costume name": "costumeNameOf",
          "size": "sizeOf",
          "volume": "volumeOf"
        };
        return `${REV_PROP[prop] ?? "xOf"}("${sprite}")`;
      }
      case "sensing_touchingobject": {
        const menuId = inpBlockId(block, "TOUCHINGOBJECTMENU");
        const menu = menuId && B[menuId];
        return `touching("${fieldVal(menu, "TOUCHINGOBJECTMENU") ?? "_edge_"}")`;
      }
      case "sensing_keypressed": {
        const menuId = inpBlockId(block, "KEY_OPTION");
        const menu = menuId && B[menuId];
        return `key("${fieldVal(menu, "KEY_OPTION") ?? "space"}")`;
      }
      case "operator_add":
        return `${decompInput(block, "NUM1", B, true)} + ${decompInput(block, "NUM2", B, true)}`;
      case "operator_subtract":
        return `${decompInput(block, "NUM1", B, true)} - ${decompInput(block, "NUM2", B, true)}`;
      case "operator_multiply":
        return `${decompInput(block, "NUM1", B, true)} * ${decompInput(block, "NUM2", B, true)}`;
      case "operator_divide":
        return `${decompInput(block, "NUM1", B, true)} / ${decompInput(block, "NUM2", B, true)}`;
      case "operator_mod":
        return `${decompInput(block, "NUM1", B, true)} mod ${decompInput(block, "NUM2", B, true)}`;
      case "operator_lt":
        return `${decompInput(block, "OPERAND1", B, true)} < ${decompInput(block, "OPERAND2", B, true)}`;
      case "operator_gt":
        return `${decompInput(block, "OPERAND1", B, true)} > ${decompInput(block, "OPERAND2", B, true)}`;
      case "operator_equals":
        return `${decompInput(block, "OPERAND1", B, false)} = ${decompInput(block, "OPERAND2", B, false)}`;
      case "operator_and":
        return `${decompExpr(inpBlock(block, "OPERAND1", B), B)} and ${decompExpr(inpBlock(block, "OPERAND2", B), B)}`;
      case "operator_or":
        return `${decompExpr(inpBlock(block, "OPERAND1", B), B)} or ${decompExpr(inpBlock(block, "OPERAND2", B), B)}`;
      case "operator_not":
        return `not ${decompExpr(inpBlock(block, "OPERAND", B), B)}`;
      case "operator_length":
        return `${decompInput(block, "STRING", B, false)}.length()`;
      case "operator_round":
        return `round(${decompInput(block, "NUM", B, true)})`;
      case "operator_mathop": {
        const op = fieldVal(block, "OPERATOR") ?? "abs";
        const num = decompInput(block, "NUM", B, true);
        const REV = {
          "abs": "abs",
          "sqrt": "sqrt",
          "floor": "floor",
          "ceiling": "ceiling",
          "sin": "sin",
          "cos": "cos",
          "tan": "tan",
          "asin": "asin",
          "acos": "acos",
          "atan": "atan",
          "ln": "ln",
          "log": "log",
          "e ^": "exp",
          "10 ^": "pow10"
        };
        return `${REV[op] ?? `mathop_${op}`}(${num})`;
      }
      case "data_lengthoflist":
        return `[${fieldVal(block, "LIST") ?? ""}].length()`;
      case "data_listcontainsitem":
        return `[${fieldVal(block, "LIST") ?? ""}].contains(${decompInput(block, "ITEM", B, false)})`;
      case "data_itemoflist":
        return `[${fieldVal(block, "LIST") ?? ""}].item(${decompInput(block, "INDEX", B, true)})`;
      case "data_itemnumoflist":
        return `[${fieldVal(block, "LIST") ?? ""}].indexOf(${decompInput(block, "ITEM", B, false)})`;
      default:
        return `/* ${block.opcode} */`;
    }
  }
  function decompStmt(block, B, indent) {
    const I = indent, op = block.opcode;
    switch (op) {
      // Control
      case "control_if": {
        const cond = decompExpr(inpBlock(block, "CONDITION", B), B);
        const body = decompChain(inpBlockId(block, "SUBSTACK"), B, I + "    ");
        return `${I}if ${cond} {
${body}${I}}
`;
      }
      case "control_if_else": {
        const cond = decompExpr(inpBlock(block, "CONDITION", B), B);
        const body = decompChain(inpBlockId(block, "SUBSTACK"), B, I + "    ");
        const body2 = decompChain(inpBlockId(block, "SUBSTACK2"), B, I + "    ");
        return `${I}if ${cond} {
${body}${I}} else {
${body2}${I}}
`;
      }
      case "control_repeat": {
        const times = decompInput(block, "TIMES", B, true);
        const body = decompChain(inpBlockId(block, "SUBSTACK"), B, I + "    ");
        return `${I}repeat ${times} {
${body}${I}}
`;
      }
      case "control_forever": {
        const body = decompChain(inpBlockId(block, "SUBSTACK"), B, I + "    ");
        return `${I}forever {
${body}${I}}
`;
      }
      case "control_repeat_until": {
        const condBlock = inpBlock(block, "CONDITION", B);
        const body = decompChain(inpBlockId(block, "SUBSTACK"), B, I + "    ");
        if (condBlock && condBlock.opcode === "operator_not") {
          const inner = decompExpr(inpBlock(condBlock, "OPERAND", B), B);
          return `${I}while (${inner}) {
${body}${I}}
`;
        }
        const cond = decompExpr(condBlock, B);
        return `${I}repeat until (${cond}) {
${body}${I}}
`;
      }
      case "control_wait_until": {
        const cond = decompExpr(inpBlock(block, "CONDITION", B), B);
        return `${I}wait until ${cond}
`;
      }
      case "control_wait":
        return `${I}wait(${decompInput(block, "DURATION", B, true)})
`;
      case "control_stop": {
        const opt = fieldVal(block, "STOP_OPTION") ?? "all";
        if (opt === "all") return `${I}stopAll()
`;
        if (opt === "this script") return `${I}stopThis()
`;
        return `${I}stopOtherScripts()
`;
      }
      case "control_create_clone_of": {
        const menuId = inpBlockId(block, "CLONE_OPTION");
        const menu = menuId && B[menuId];
        const t = menu ? fieldVal(menu, "CLONE_OPTION") : "_myself_";
        return !t || t === "_myself_" ? `${I}createClone()
` : `${I}createClone("${t}")
`;
      }
      case "control_delete_this_clone":
        return `${I}deleteClone()
`;
      // Motion
      case "motion_movesteps":
        return `${I}move(${decompInput(block, "STEPS", B, true)})
`;
      case "motion_turnright":
        return `${I}turnRight(${decompInput(block, "DEGREES", B, true)})
`;
      case "motion_turnleft":
        return `${I}turnLeft(${decompInput(block, "DEGREES", B, true)})
`;
      case "motion_gotoxy":
        return `${I}goTo(${decompInput(block, "X", B, true)}, ${decompInput(block, "Y", B, true)})
`;
      case "motion_goto": {
        const menuId = inpBlockId(block, "TO");
        const menu = menuId && B[menuId];
        return `${I}goTo("${fieldVal(menu, "TO") ?? "_mouse_"}")
`;
      }
      case "motion_glidesecstoxy":
        return `${I}glide(${decompInput(block, "SECS", B, true)}, ${decompInput(block, "X", B, true)}, ${decompInput(block, "Y", B, true)})
`;
      case "motion_setx":
        return `${I}setX(${decompInput(block, "X", B, true)})
`;
      case "motion_sety":
        return `${I}setY(${decompInput(block, "Y", B, true)})
`;
      case "motion_changexby":
        return `${I}changeX(${decompInput(block, "DX", B, true)})
`;
      case "motion_changeyby":
        return `${I}changeY(${decompInput(block, "DY", B, true)})
`;
      case "motion_ifonedgebounce":
        return `${I}bounce()
`;
      case "motion_pointindirection":
        return `${I}setDirection(${decompInput(block, "DIRECTION", B, true)})
`;
      case "motion_pointtowards": {
        const menuId = inpBlockId(block, "TOWARDS");
        const menu = menuId && B[menuId];
        return `${I}pointTowards("${fieldVal(menu, "TOWARDS") ?? "_mouse_"}")
`;
      }
      // Looks
      case "looks_say":
        return `${I}say(${decompInput(block, "MESSAGE", B, false)})
`;
      case "looks_sayforsecs":
        return `${I}sayFor(${decompInput(block, "MESSAGE", B, false)}, ${decompInput(block, "SECS", B, true)})
`;
      case "looks_think":
        return `${I}think(${decompInput(block, "MESSAGE", B, false)})
`;
      case "looks_thinkforsecs":
        return `${I}thinkFor(${decompInput(block, "MESSAGE", B, false)}, ${decompInput(block, "SECS", B, true)})
`;
      case "looks_switchcostumeto": {
        const menuId = inpBlockId(block, "COSTUME");
        const menu = menuId && B[menuId];
        return `${I}switchCostume("${fieldVal(menu, "COSTUME") ?? ""}")
`;
      }
      case "looks_switchbackdropto": {
        const menuId = inpBlockId(block, "BACKDROP");
        const menu = menuId && B[menuId];
        return `${I}switchBackdrop("${fieldVal(menu, "BACKDROP") ?? ""}")
`;
      }
      case "looks_nextcostume":
        return `${I}nextCostume()
`;
      case "looks_nextbackdrop":
        return `${I}nextBackdrop()
`;
      case "looks_setsizeto":
        return `${I}setSize(${decompInput(block, "SIZE", B, true)})
`;
      case "looks_changesizeby":
        return `${I}changeSize(${decompInput(block, "CHANGE", B, true)})
`;
      case "looks_show":
        return `${I}show()
`;
      case "looks_hide":
        return `${I}hide()
`;
      case "looks_cleargraphiceffects":
        return `${I}clearEffects()
`;
      case "looks_seteffectto":
        return `${I}setEffect("${fieldVal(block, "EFFECT") ?? "color"}", ${decompInput(block, "VALUE", B, true)})
`;
      case "looks_changeeffectby":
        return `${I}changeEffect("${fieldVal(block, "EFFECT") ?? "color"}", ${decompInput(block, "CHANGE", B, true)})
`;
      case "looks_gotofrontback": {
        const fb = fieldVal(block, "FRONT_BACK") ?? "front";
        return fb === "back" ? `${I}goToBack()
` : `${I}goToFront()
`;
      }
      case "looks_goforwardbackwardlayers": {
        const fb = fieldVal(block, "FORWARD_BACKWARD") ?? "forward";
        return fb === "backward" ? `${I}moveBackward(${decompInput(block, "NUM", B, true)})
` : `${I}moveForward(${decompInput(block, "NUM", B, true)})
`;
      }
      // Sound
      case "sound_play": {
        const menuId = inpBlockId(block, "SOUND_MENU");
        const menu = menuId && B[menuId];
        return `${I}play("${fieldVal(menu, "SOUND_MENU") ?? ""}")
`;
      }
      case "sound_playuntildone": {
        const menuId = inpBlockId(block, "SOUND_MENU");
        const menu = menuId && B[menuId];
        return `${I}playUntilDone("${fieldVal(menu, "SOUND_MENU") ?? ""}")
`;
      }
      case "sound_stopallsounds":
        return `${I}stopSounds()
`;
      case "sound_setvolumeto":
        return `${I}setVolume(${decompInput(block, "VOLUME", B, true)})
`;
      case "sound_changevolumeby":
        return `${I}changeVolume(${decompInput(block, "VOLUME", B, true)})
`;
      // Sensing
      case "sensing_askandwait":
        return `${I}askAndWait(${decompInput(block, "QUESTION", B, false)})
`;
      case "sensing_resettimer":
        return `${I}resetTimer()
`;
      case "sensing_setdragmode":
        return `${I}setDragMode("${fieldVal(block, "DRAG_MODE") ?? "draggable"}")
`;
      // Data – list extras
      case "data_deletealloflist":
        return `${I}listDeleteAll([${fieldVal(block, "LIST") ?? ""}])
`;
      // Motion extras
      case "motion_setrotationstyle":
        return `${I}setRotationStyle("${fieldVal(block, "STYLE") ?? "all around"}")
`;
      case "motion_glidesecstosprite": {
        const menuId = inpBlockId(block, "TO");
        const menu = menuId && B[menuId];
        return `${I}glide(${decompInput(block, "SECS", B, true)}, "${fieldVal(menu, "TO") ?? "_mouse_"}")
`;
      }
      // Looks extras
      case "looks_switchbackdroptoandwait": {
        const menuId = inpBlockId(block, "BACKDROP");
        const menu = menuId && B[menuId];
        return `${I}switchBackdropAndWait("${fieldVal(menu, "BACKDROP") ?? ""}")
`;
      }
      // Sound effects
      case "sound_seteffectto":
        return `${I}setSoundEffect("${fieldVal(block, "SOUND_EFFECT") ?? "PITCH"}", ${decompInput(block, "VALUE", B, true)})
`;
      case "sound_changeeffectby":
        return `${I}changeSoundEffect("${fieldVal(block, "SOUND_EFFECT") ?? "PITCH"}", ${decompInput(block, "VALUE", B, true)})
`;
      case "sound_cleareffects":
        return `${I}clearSoundEffects()
`;
      // Events
      case "event_broadcast": {
        const bcastStr = decompBroadcast(block, "BROADCAST_INPUT", B);
        const srM = bcastStr.replace(/^"|"$/g, "").match(/^__sroutine_(.+)$/);
        if (srM) return `${I}launch ${srM[1]}()
`;
        return `${I}broadcast(${bcastStr})
`;
      }
      case "event_broadcastandwait": {
        const bcastStr = decompBroadcast(block, "BROADCAST_INPUT", B);
        const srM = bcastStr.replace(/^"|"$/g, "").match(/^__sroutine_(.+)$/);
        if (srM) return `${I}await ${srM[1]}()
`;
        return `${I}broadcastAndWait(${bcastStr})
`;
      }
      // Data – variables
      case "data_setvariableto": {
        const sv = fieldVal(block, "VARIABLE") ?? "";
        const cancelM = sv.match(/^__sroutine_(.+)_cancelled$/);
        if (cancelM) return `${I}cancel ${cancelM[1]}
`;
        if (sv.startsWith("__sroutine_") || /^_scratchpiler_internal_[a-z0-9]{4}_agg_/.test(sv)) {
          return "";
        }
        return `${I}set [${sv}] to ${decompInput(block, "VALUE", B, false)}
`;
      }
      case "data_changevariableby": {
        const cv = fieldVal(block, "VARIABLE") ?? "";
        if (cv.startsWith("__sroutine_") || /^_scratchpiler_internal_[a-z0-9]{4}_agg_/.test(cv)) {
          return "";
        }
        return `${I}change [${cv}] by ${decompInput(block, "VALUE", B, true)}
`;
      }
      case "data_showvariable":
        return `${I}showVariable([${fieldVal(block, "VARIABLE") ?? ""}])
`;
      case "data_hidevariable":
        return `${I}hideVariable([${fieldVal(block, "VARIABLE") ?? ""}])
`;
      case "data_showlist":
        return `${I}showList([${fieldVal(block, "LIST") ?? ""}])
`;
      case "data_hidelist":
        return `${I}hideList([${fieldVal(block, "LIST") ?? ""}])
`;
      case "data_addtolist":
        return `${I}listAdd(${decompInput(block, "ITEM", B, false)}, [${fieldVal(block, "LIST") ?? ""}])
`;
      case "data_deleteoflist":
        return `${I}listDelete(${decompInput(block, "INDEX", B, true)}, [${fieldVal(block, "LIST") ?? ""}])
`;
      case "data_insertatlist":
        return `${I}listInsert(${decompInput(block, "ITEM", B, false)}, ${decompInput(block, "INDEX", B, true)}, [${fieldVal(block, "LIST") ?? ""}])
`;
      case "data_replaceitemoflist":
        return `${I}listReplace(${decompInput(block, "INDEX", B, true)}, [${fieldVal(block, "LIST") ?? ""}], ${decompInput(block, "ITEM", B, false)})
`;
      // Custom block calls
      case "procedures_call": {
        const proccode = block.mutation && block.mutation.proccode || "";
        const name = proccode.split(" ")[0];
        const argIds = JSON.parse(block.mutation && block.mutation.argumentids || "[]");
        const argStrs = argIds.map((aid) => {
          const inputData = block.inputs && block.inputs[aid];
          return inputData ? decompInputRaw(inputData, B, false) : '""';
        });
        return `${I}${name}(${argStrs.join(", ")})
`;
      }
      default:
        return `${I}// unsupported: ${op}
`;
    }
  }
  function decompChain(startId, B, indent) {
    const lines = [];
    let id = startId;
    while (id) {
      const block = B[id];
      if (!block) break;
      if (block.opcode === "data_setvariableto" && /^_scratchpiler_internal_[a-z0-9]{4}_gap$/.test(fieldVal(block, "VARIABLE") ?? "")) {
        const valStr = decompInput(block, "VALUE", B, true);
        const phase1 = block.next ? B[block.next] : null;
        const phase2 = phase1 && phase1.next ? B[phase1.next] : null;
        if (valStr === "1" && phase1?.opcode === "control_repeat_until" && phase2?.opcode === "control_repeat_until") {
          const listName = (() => {
            const q = [inpBlockId(phase2, "SUBSTACK")];
            const seen = /* @__PURE__ */ new Set();
            while (q.length) {
              const bid = q.shift();
              if (!bid || !B[bid] || seen.has(bid)) continue;
              seen.add(bid);
              const b = B[bid];
              if (b.opcode === "data_replaceitemoflist") return fieldVal(b, "LIST");
              if (b.next) q.push(b.next);
              const sub = inpBlockId(b, "SUBSTACK");
              if (sub) q.push(sub);
            }
            return null;
          })();
          if (listName) {
            const isDesc = (() => {
              let bid = inpBlockId(phase2, "SUBSTACK");
              while (bid && B[bid]) {
                const b = B[bid];
                if (b.opcode === "control_repeat_until") {
                  let bid2 = inpBlockId(b, "SUBSTACK");
                  while (bid2 && B[bid2]) {
                    const b2 = B[bid2];
                    if (b2.opcode === "control_repeat_until") {
                      const condId = inpBlockId(b2, "CONDITION");
                      const condB = condId && B[condId];
                      if (condB?.opcode === "operator_or") {
                        const op2Id = inpBlockId(condB, "OPERAND2");
                        const op2B = op2Id && B[op2Id];
                        if (op2B?.opcode === "operator_not") {
                          const innerId = inpBlockId(op2B, "OPERAND");
                          const innerB = innerId && B[innerId];
                          return innerB?.opcode === "operator_lt";
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
            lines.push(`${indent}[${listName}].sort${isDesc ? '("desc")' : "()"}
`);
            id = phase2.next || null;
            continue;
          }
        }
      }
      if (block.opcode === "data_setvariableto") {
        const ctrName = fieldVal(block, "VARIABLE") ?? "";
        const mCtr = ctrName.match(/^_scratchpiler_internal_([a-z0-9]{4})_pyfor_ctr$/);
        if (mCtr && decompInput(block, "VALUE", B, true) === "1") {
          const nextBlock = block.next && B[block.next];
          if (nextBlock && nextBlock.opcode === "control_repeat_until") {
            const substackIds = [];
            let bid = inpBlockId(nextBlock, "SUBSTACK");
            while (bid && B[bid]) {
              substackIds.push(bid);
              bid = B[bid].next;
            }
            const firstBid = substackIds[0];
            const firstBlk = firstBid && B[firstBid];
            const lastBid = substackIds[substackIds.length - 1];
            const lastBlk = lastBid && B[lastBid];
            const rand4 = mCtr[1];
            if (firstBlk && firstBlk.opcode === "data_setvariableto") {
              const itemVarName = fieldVal(firstBlk, "VARIABLE") ?? "";
              const mItem = itemVarName.match(
                new RegExp(`^_scratchpiler_internal_${rand4}_(.+)$`)
              );
              const hasFinalIncr = lastBlk && lastBlk.opcode === "data_changevariableby" && fieldVal(lastBlk, "VARIABLE") === ctrName;
              if (mItem) {
                const condBlock = B[inpBlockId(nextBlock, "CONDITION")];
                let listName = null;
                if (condBlock && condBlock.opcode === "operator_gt") {
                  const op2Block = B[inpBlockId(condBlock, "OPERAND2")];
                  if (op2Block && op2Block.opcode === "data_lengthoflist") {
                    listName = fieldVal(op2Block, "LIST");
                  }
                }
                if (listName) {
                  const shortName = mItem[1];
                  const bodyIds = substackIds.slice(1, hasFinalIncr ? -1 : void 0);
                  let body = "";
                  for (const bid2 of bodyIds) body += decompStmt(B[bid2], B, indent + "    ");
                  lines.push(`${indent}pyfor [${shortName}] in [${listName}] {
${body}${indent}}
`);
                  id = nextBlock.next || null;
                  continue;
                }
              }
            }
          }
        }
      }
      if (block.opcode === "data_setvariableto") {
        const varName0 = fieldVal(block, "VARIABLE") ?? "";
        const srParamMatch = varName0.match(/^__sroutine_(.+?)_(?!cancelled$|count$)(.+)$/);
        if (srParamMatch) {
          const rname = srParamMatch[1];
          const paramArgs = [];
          let scanId = id;
          while (scanId && B[scanId]) {
            const sb = B[scanId];
            const sv = fieldVal(sb, "VARIABLE") ?? "";
            const pm = sv.match(new RegExp(`^__sroutine_${rname}_(?!cancelled$|count$)(.+)$`));
            if (sb.opcode === "data_setvariableto" && pm) {
              paramArgs.push(decompInput(sb, "VALUE", B, false));
              scanId = sb.next || null;
            } else break;
          }
          const bcastBlock = scanId && B[scanId];
          const isBcast = bcastBlock && (bcastBlock.opcode === "event_broadcast" || bcastBlock.opcode === "event_broadcastandwait");
          if (isBcast) {
            const inputBlock = inpBlock(bcastBlock, "BROADCAST_INPUT", B);
            const msgVal = inputBlock && inputBlock.opcode === "event_broadcast_menu" ? fieldVal(inputBlock, "BROADCAST_OPTION") ?? "" : decompInput(bcastBlock, "BROADCAST_INPUT", B, false).replace(/^"|"$/g, "");
            if (msgVal === `__sroutine_${rname}`) {
              const kw = bcastBlock.opcode === "event_broadcastandwait" ? "await" : "launch";
              const argsStr = paramArgs.length ? `(${paramArgs.join(", ")})` : "()";
              lines.push(`${indent}${kw} ${rname}${argsStr}
`);
              id = bcastBlock.next || null;
              continue;
            }
          }
        }
      }
      if (block.opcode === "data_setvariableto") {
        const iterName = fieldVal(block, "VARIABLE") ?? "";
        const m = iterName.match(/^_scratchpiler_internal_[a-z0-9]{4}_(.+)$/);
        if (m) {
          const nextBlock = block.next && B[block.next];
          if (nextBlock && nextBlock.opcode === "control_repeat_until") {
            const condBlock = B[inpBlockId(nextBlock, "CONDITION")];
            if (condBlock && condBlock.opcode === "operator_gt") {
              const op1Block = B[inpBlockId(condBlock, "OPERAND1")];
              if (op1Block && op1Block.opcode === "data_variable" && fieldVal(op1Block, "VARIABLE") === iterName) {
                const shortName = m[1];
                const startExpr = decompInput(block, "VALUE", B, true);
                const endExpr = decompInput(condBlock, "OPERAND2", B, true);
                const substackIds = [];
                let bid = inpBlockId(nextBlock, "SUBSTACK");
                while (bid && B[bid]) {
                  substackIds.push(bid);
                  bid = B[bid].next;
                }
                const lastBid = substackIds[substackIds.length - 1];
                const lastBlk = lastBid && B[lastBid];
                const hasIncr = lastBlk && lastBlk.opcode === "data_changevariableby" && fieldVal(lastBlk, "VARIABLE") === iterName;
                const bodyIds = hasIncr ? substackIds.slice(0, -1) : substackIds;
                let body = "";
                for (const bid2 of bodyIds) body += decompStmt(B[bid2], B, indent + "    ");
                lines.push(`${indent}for [${shortName}] from ${startExpr} to ${endExpr} {
${body}${indent}}
`);
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
    return lines.join("");
  }
  function decompScript(hat, B) {
    if (hat.opcode === "procedures_definition") {
      const protoInput = hat.inputs && hat.inputs.custom_block;
      const protoId = protoInput ? Array.isArray(protoInput) ? protoInput[1] : protoInput.block : null;
      const proto = protoId && B[protoId];
      if (!proto || !proto.mutation) return null;
      const proccode = proto.mutation.proccode || "";
      const name = proccode.split(" ")[0];
      const params = JSON.parse(proto.mutation.argumentnames || "[]");
      const body2 = decompChain(hat.next, B, "    ");
      return `define ${name}(${params.join(", ")}) {
${body2}}`;
    }
    let header;
    switch (hat.opcode) {
      case "event_whenflagclicked":
        header = "on flag";
        break;
      case "event_whenthisspriteclicked":
        header = "on click";
        break;
      case "event_whenstageclicked":
        header = "on click";
        break;
      case "control_start_as_clone":
        header = "on clone";
        break;
      case "event_whenkeypressed":
        header = `on key "${fieldVal(hat, "KEY_OPTION") ?? "space"}"`;
        break;
      case "event_whenbroadcastreceived": {
        const bcastVal = fieldVal(hat, "BROADCAST_OPTION") ?? "";
        const srMatch = bcastVal.match(/^__sroutine_(.+)$/);
        if (srMatch) {
          const rname = srMatch[1];
          let bodyStr = decompChain(hat.next, B, "    ");
          const bodyLines = bodyStr.split("\n").filter((l) => l.trim());
          const firstLine = bodyLines[0] || "";
          const secondLine = bodyLines[1] || "";
          const lastLine = bodyLines[bodyLines.length - 1] || "";
          const isPreamble1 = firstLine.includes(`__sroutine_${rname}_cancelled`);
          const isPreamble2 = secondLine.includes(`__sroutine_${rname}_count`);
          const isPostamble = lastLine.includes(`__sroutine_${rname}_count`);
          const userLines = bodyLines.slice(
            (isPreamble1 ? 1 : 0) + (isPreamble2 ? 1 : 0),
            isPostamble ? bodyLines.length - 1 : bodyLines.length
          );
          return `scratchroutine ${rname} {
${userLines.map((l) => l + "\n").join("")}}`;
        }
        header = `on receive "${bcastVal}"`;
        break;
      }
      case "event_whenbackdropswitchesto":
        header = `on backdrop "${fieldVal(hat, "BACKDROP") ?? ""}"`;
        break;
      case "event_whengreaterthan": {
        const sense = (fieldVal(hat, "WHENGREATERTHANMENU") ?? "TIMER").toLowerCase();
        const valStr = decompInput(hat, "VALUE", B, true);
        header = `on ${sense} > ${valStr}`;
        break;
      }
      default:
        return `// unsupported hat: ${hat.opcode}`;
    }
    const body = decompChain(hat.next, B, "    ");
    return `${header} {
${body}}`;
  }
  function decompile(vm, spriteName) {
    const target = spriteName === "__stage__" ? vm.runtime.targets.find((t) => t.isStage) : vm.runtime.targets.find((t) => !t.isStage && t.sprite.name === spriteName) || vm.editingTarget;
    if (!target) return "// Error: sprite not found\n";
    const B = target.blocks._blocks;
    const roots = Object.values(B).filter((b) => b.topLevel && !b.shadow).sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
    return roots.map((r) => decompScript(r, B)).filter(Boolean).join("\n\n") + "\n";
  }

  // src/ui-dom.js
  var LOGO_B64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAomVYSWZNTQAqAAAACAAGAQYAAwAAAAEAAgAAAQ0AAgAAABEAAABWARoABQAAAAEAAABoARsABQAAAAEAAABwASgAAwAAAAEAAgAAh2kABAAAAAEAAAB4AAAAAFVudGl0bGVkIEFydHdvcmsAAAAAAIQAAAABAAAAhAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAQKADAAQAAAABAAAAQAAAAAB3gFJUAAAACXBIWXMAABRNAAAUTQGUyo0vAAAEymlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgICAgICAgICAgeG1sbnM6SXB0YzR4bXBFeHQ9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBFeHQvMjAwOC0wMi0yOS8iPgogICAgICAgICA8dGlmZjpEb2N1bWVudE5hbWU+VW50aXRsZWQgQXJ0d29yazwvdGlmZjpEb2N1bWVudE5hbWU+CiAgICAgICAgIDx0aWZmOkNvbXByZXNzaW9uPjU8L3RpZmY6Q29tcHJlc3Npb24+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjI8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjEzMjwvdGlmZjpYUmVzb2x1dGlvbj4KICAgICAgICAgPHRpZmY6WVJlc29sdXRpb24+MTMyPC90aWZmOllSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpQaG90b21ldHJpY0ludGVycHJldGF0aW9uPjI8L3RpZmY6UGhvdG9tZXRyaWNJbnRlcnByZXRhdGlvbj4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjIwNDg8L2V4aWY6UGl4ZWxYRGltZW5zaW9uPgogICAgICAgICA8ZXhpZjpDb2xvclNwYWNlPjE8L2V4aWY6Q29sb3JTcGFjZT4KICAgICAgICAgPGV4aWY6UGl4ZWxZRGltZW5zaW9uPjIwNDg8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICAgICA8ZGM6dGl0bGU+CiAgICAgICAgICAgIDxyZGY6QWx0PgogICAgICAgICAgICAgICA8cmRmOmxpIHhtbDpsYW5nPSJ4LWRlZmF1bHQiPlVudGl0bGVkIEFydHdvcms8L3JkZjpsaT4KICAgICAgICAgICAgPC9yZGY6QWx0PgogICAgICAgICA8L2RjOnRpdGxlPgogICAgICAgICA8SXB0YzR4bXBFeHQ6QXJ0d29ya1RpdGxlPlVudGl0bGVkIEFydHdvcms8L0lwdGM0eG1wRXh0OkFydHdvcmtUaXRsZT4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CtytysQAABIHSURBVHgB5Vt7kFTVnf71c96ExwyPGR5DjEBCCOCK4BBWEy1dfGCVRgOm1oopBWOtKa0ibrmuhlJrF/9YslrRBVMQY9QkYlyl1hhWDEpAeWV1hkeG4SXIADNMM9PTM9OP6b6933dun/vo7mlmWjBs7Zm6c889r3t+3+95zj3tSSPJ/+Pk/SJoj6WT8ofuw/Lj1vekKdp+Xl7ZHj8gvcmOzz2W50JKQGt/t2wIH5DfhZtlf6xDEkZaRvrK5R9qLpdl1bOlxOMrioBjfbtkZ+dLMn/UUqktnVHUGLqTX2fO1536tLvvhLzWtUc2Rg7L6f5eCXj8EuTl80g0nZCnTm+VP0aOyU/GfVNml40Z0qubI3+Uj8P/Kal0DBJwdkh98zU+bxIQTsXkvyMH5bcgfHf0pMSMfnDYLx6hlvHyqCud5t0r8XRKKr0l8sPqy+R+XGXewrxISxqEb5B93RvFB8kx0v3ytapr5bLh38F4xafCbx3EuC3xDnkjvFc2dDfL0XineDwexe0yb0D1Nk2sbWdZT7tL8Y/DNqxs2w5pOC4/GftNuaJibN43JiE12ztfk4O928TvCQAKweWRyF/LBiTAvT/1HpXfdDXJlp6j0gXuU8T9HqdNJafNZHLdlAAtDc6yOAApA2FLYRceqJkNyTDBY++Y0SsfhH4ln0UbJeANZuQIAAC8UcE6WTj6H8VbpC3h+ENSgVPJiPwXOP278B7ZF2uTZIaTHjUtNRz/ZZINAAtsgk11sJ9NlTDQJpoy5LLycbJi3JXSUFELDodkU+gX0h4/AjtiEu/1kPdMBtSmUm4e+09S6q1SJcX8GxQA/xNtlfUg+g+RFhi1iOJ0IIO6KeLOVzsJd+Y1CLn2QNsH3uPwFD5PmSyvmSAT0zulPXFSGVGOZF0KhDQsiVduHLNcRgbGOycwpPyANqDbiMumyCF5LdwkO/s+kyiMWhCGSuu2fgtUGtzVT7zzQRPuzOs2dmNtD3QN7x4A+2Vfl0SjTdLuS0G8A+A1RzQ5r0CAIfUi0w9D2ANPcF4BSKYNWX12B/S7UY4kzipSqN/ZhLsnnQ2Cs9YGwQPOZYPlBLA/7ZWZwS5ZWNouQQyRFj+I14Sb/sQEGAoAEFKYa/fnNIQ5EtCVisp/hLYL3VopCM+bCH9WAm2K93axs42dZ84EwS4TEGMA6iuDnfKtkpACHbzHHxPacXAkE0o1gnoWABYxQma+yP85FEYg+kQ24LLojtExCyMSIwschWbWzV2WOYh05QkC6/TllSsCYbnCCEtP1OzjEnm2VHqvfYjZk7HAyfhxCeOPqaqqSrxepydSxQX/5QDQCc7TP7snnxkDnDd6E3L67p9Lss18acHRB1VJ0U7LZk9K3ssCaaDuNqwwhLAZpd5VUllZKZs3b5ba2tqBuuUtzwHgbKoPxsWAXx8gTgebU+3d6so7YhGFKfTpLKKf3aVbysvLJZXiSENLOfLSkexVKlBwGF9Ot4LNv4hKv88HtbVlY7DvzKGEAORq92CH++u1Y/ywpy8+5AnkAHAm1TvkQS6GDgTgey2n5Ddn+4Y0nRwAOpJ9MCxDFyXnW/1+v4wYMUJqampk2LBhzqoLlueUIwilf3DojPzria5BS3GOEQzBCNqx/dDme80118idd94pl19+uSI+EAhILBaTY8eOyaZNm+Sll16SI0eO5AxK13XPPfdIdXU13GOuAjJiTCaT0tbWJp988ok0NjbmjMECP0Cgd/3nY11yOGbIv08eIZXYgyiUXGsBRoE3fvoidm/aYFDyeAG6wZ64tN68SpInbbtdUlIizzzzjCxdulQthwd6YSgUkscff1yef/55VxMC1dLSIvX19a7yfA/9/f0KzIcfflj27t1rNfGUV0jFr38vMm6SCJxBT9Ij1w4vl3WXjpAJJXloyfR0qUAUgUU34gDvIP2xfvvTTz8ty5YtK0g8244aNUqee+45uf/++3VX6x6NRq18oQzBWrhwoWzcuFGmTZs2YNMKeKr3uuJy/d5O2RlhXJM/uVQgkopLj5E4JyHOoWbNmuUi6PTp00oaPvroIyX+EydOlMWLF8utqt/8Xma+/Za0trZaZc4MwdiyZYvl16kCo0ePltmzZ1uRHgOeFStWqLGdfZ35MkjsgWhKbtwXltVfqZLbqrnCcCcXAGEjplZ9Q7EBZO/IFaZEIiFLliyR999/X53/246+sLKxbJixcvKysrK4Jv6fv374eUhpE+TW/Z7cfhWqKzXEblTY0OsDMDc6yOaAJNvwWlT7+UhVBELnJMJ0K3Q2oAc5BKj5cJFDdNWM1L2GBj98FmG7WQqkdCkXxK2IyDIpZAm/lSmAZT2p2O4TzDX87blT5LNv5m7IbAr8L53KqnxK1QlHFRFGkXZlz5NiJcMZzOJqZ5DPJqTbSZ5v4XcnXhGjHGBLT/2HRX4rH1IuvgDXifmJGXV0l7aViL+SFQOTqN6nVQAaLHJF1bwqSS0gvIQMsLuJ3OSWkPFCNLGNAqBZ+EVjcJ1UWFjkJn0Tgf7n4BVtB8SbZGJQASjF3JMlA+7J3AIOBlRgGTmM6wNSNm3D+4V1ILlIHyFlFQpzCy5mMgqiWfQ5J9DvQRRR2O0yI0d2MhkKC5x4z1N7wViqd6gGvqeloNXVl5l6VBILp2K8PQAAABPVX7jxK2Qj0nHfgVJA4tBRSfIPSSiB2MQvIANSI9l9ICdqO0R9VVkVoKn23Ik8oBXl7Hb0vKR3YPfqI8kJAAB9z37mBj3kn96vJXkMrNg0YXcjqNUBTwJL9kYBuO7b7s7KYvEJ3ORMF7AO3nxBpKrOBW9QPQBC6rn7jz0yxRr4sAqCrh5dJmb6k7CyuO7DWFaLvkfBk7gWqXq6W4Qv1+s2LNhSqjKL/yV/9Yt+vlKXWoIJqCUiXRLLxwH6HGAXi8mWM8JLiILhHwZ+TP3gbr66WAdwz9aXdJgk4G8w7xfVvb1jIqIHASFqXV39HQOzgQLJRJAg5yAyA2v8cHxELqdW0bT5vGqWYXSnqzTk5UMnR5E09vNZMnwWWAb8HEcE4/CGH0KF+Q4LKJBS1yMPIlIvx1v1yD6f5VVf2N0RqAqmFI+YYBxW/S9oJYOON7J65yiPMbv9BNAFf4C59LKrJHnY2r5hJBlFxS1r1dEY5M3J99G7j7gJxz6pKtgJnuSk2K2Y2hNTXhVBrLGWRcBLW9gQBUt5JuEBwb9D3P5JcajMWjSjumHZ+r/pR0bPlkuXYSzHb9fUBH8U45M+4aMh0bPxKh3nMf+W0hj8aTxZJEDv0oRqvj3SIcqOL72e8cgXvFMqLm7JxGz8iqilM/IcSKBKQSixJY9JJLIsSHfRV3q9y41vqWKJ5OLgHAfBnNrOGNHFV7P0XQIW3BrITRZZPzPVzQFBb5YOA68sDcnrAXolHJoUbmU4N6vJJrFrL6FqHYxLXcxpz9BGIH9j3PzWLfFPTfeDPEGlbpZSLaqHE1b5f35HpqK6Dg4B07SudnnpvBqRLnBUDpNECzq90pqGdajVstmVHAUz0WZxl6D9xZ5SnCJO/qF5gCMQVbPWWj4Kq3IgcKQR2P3hVE1vkbJZ1fJSVqFWVaJLdI8aeRxNyoRbv/LxLN/iK41Pr2JM1M3VT3GJOixD9L8dFy5qN4vX4wCqUy2+TNqF/IlGPgfzKxIZJhMRuKBkZ0CPiQ8w/FbSUbNAHqF7HFzCYiGwzlBNS5NfR2Ow0jFfTCqd9qbXKb5HcZNXkYpUqcBxVPIhVWxJHlS2xhMbT3I1rrZ2HZbblDt2Jcy2r8dJPJn/M0xhEqNXK3JKkuaWqKISh74sSNkYhWFiRgRRiBNAOdlgxzaEz5/1u1XrNp1wVdGTcf0xTCmAmLU7kWqKcIHD9f5O3KSvPiJWuPZAggr2MQiCrGzKqgzCL8oR0xMiFJDy6SoLVLAP/fjVFEE4E4pnGYkCOoS78yAmg0VbbdpHJQhsBQsqqNlxPdQe+XgBvfJMBRPQfTHSMb0KVJt9N4cTy4K/Hzgt8Jl3K2AZVf2JxJHbJR1vpDVqYUuQRMUjT7tQoD0KVS5PbDRfp4FkeMrAiJAqJ7m3fWbDRPjMCxwFMmTt7mCu9OuBrPXS60QJNZFqZjr0jvyXEXs5V4cF6SL0WEMy2Pn6xJj5f8Vl+uPNlqcIfbQHFxn6iGQHZ7M3CYQhYb6zZD9mgJJy4R1sF1JuiP7b6HWZZ43Yr0V8gxTp4P0xCTNjQ5FgzN5VJiJaWzS3IrxkyExH7A4AMH+a8YlJwN14GqEFJ+gYRsVXEZfNDKEkFIGJzJGBM8vGEFWUZ6MAB0OZ0fEE/IriXRpKpH+1OLdOTEQHtriF1N0SMkd0BBMZQB4TSYW+2qnI3g+DLvh9jkjcaRrj2dOVAMwrCRRJUYBxOGRwjVivCBV/hfVSAhvF7lzSSIsMp0tYkVYr1MCtEK/K4YL9YR50d9gNzVYBaOuvM3OUBgcPME8DXG55S2UNJ0v0X8v8qhpPWvqKMV4VeCJqFlKVY4EQMo7L+bN9eOsJWkiJ/Ck3FyF2Z2Qkjf3HA4VkHfXhAcnKLtNl9OXVY2a7kSWrD4N08I5RGGOuIXJtZz0pqe/oibUXtw5b28MPjIp3RyMRBwMKbLj2kCHJ6DBPF9XZRLIgKSdXwKJO3yHxMRp+lNMy7R1cHfY2Mc2VQoiK9KrgkqGHKYQOBY7DXX9NAAEqyCJb4d9GrO+AkEk5KS5qh7Z+t3k2hNE6JtHQW3a/Tl2q2IH+1lRtd7jzqwWdQ3kKqn5n2NxqeZbqgjXfbzYK8wYQiKgbmVi8YNRVNSSQg4iGMApCLN0v/vNV2S9JJpzYQJKUwpiFPEi5Q5UrOlakTYFQ8Rj8i0l+V41U9kRuPYs9WKomaBUuq7x9sP5HX1aEK8OHoO3yHvE5HoMWjj7gFuevl3j1PPYUR6IJV4A8JmAWjiqL5jvAREXpXb3i+2i9IHPlB8Pt0f/zPRCUCJPlXuSUQ3YLAEJc9+KCm0HLi0pCpkmxCXJXO9ybV6FJtZQLcWoBmfbSh1lJ1b+x94X3WxqdOWX2MIKKSxEy1MuV3v+UX7QZdSJagSqq8YANBiKRYBbkV4v4KDl/Kd/FY9XcbPrUaJp+8CfYIi9SLLPmFAaFOjBoAE1rEpf30QXWY5IUQsGrJRMtYYvyEz/ALEyD0T0JSLBZ+rXMGnMiMy+WPNlb3cxVCm1aMiXNlv7dAeGxjAmXMxkZRiGEaBHEDpbH7NZYV0V3gLxv9pTzAuMSLn0K7r6lkV5F0Z7Eo/Kb3IQzEb2QVGwF3TfqNmAhBXWaSmMDq+hwF9zSRG5MMSEJUOVDKGqEeB9U4MXGE3iAJWAHBL/RiAtSSmpJFOSKiB2A61bNPBfbx1lm1LsKSST5oBvlmtYhBH5Z+UoMQ4BRhvPm6FoOQMMO9SRq0Sl7Ky3aBfFGR7lQ0c8VVruyAuv3OZFOo+Q/c5Aaqd6Y1kFBLVFDjrAnuN2H/XDFxrB0A7D5MBpwHLJnr9MbRg5HpLKKH1c4KgAMbk+e0fBqlKz2SXWK5ECaVkMr/XTXR1l9FbOWGHo/VKbsOAq4hLrYtNFkQNd9YBsDmh7C79nIZhUBmHIUkqdOI1JrXl3AAH3XrJ0k7K/D/O0GRGnWwA0+ZQFD0V5ry9RLK0K2JkBFNXGygcn1fKkj2IwVOiM3YhGMuP1bFrK8CkxhVuQVEIHhVLIYw5HKIxiqxZALScRi2OMb1YuIW0+G2lZ7GvjnqP0fCqQHxLjR0OMB5CXagkFJAK/9MEWTxpzF9O2qhCQ7pf7n9X3OkuF6bHQ5Yb7B9n/zKXt0RHTxlGbkw3sMU2yz8E0vAHWMDr7lhCmcJkwc9YzBdEbDAFOAHFnk4qXjyiEcW5hRfAv7X+YiqTe8bVflwFP7AAAAAElFTkSuQmCC";
  function buildOverlayDOM() {
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(fontLink);
    const style = document.createElement("style");
    style.textContent = overlay_default;
    document.head.appendChild(style);
    const overlay = document.createElement("div");
    overlay.id = "scratchpiler-overlay";
    overlay.innerHTML = overlay_default2;
    document.body.appendChild(overlay);
    const logoImg = overlay.querySelector("#scratchpiler-logo");
    if (logoImg) {
      try {
        const raw = atob(LOGO_B64);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        logoImg.src = URL.createObjectURL(new Blob([arr], { type: "image/png" }));
      } catch (_) {
      }
    }
  }
  function buildTriggerButton() {
    const btn = document.createElement("button");
    btn.id = "scratchpiler-trigger";
    btn.title = "Open Scratchpiler (Alt+M)";
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4.5l5.5 5-5.5 5" stroke="#ff8c00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 14.5h3.5" stroke="#ff8c00" stroke-width="2" stroke-linecap="round"/></svg>Open Scratchpiler`;
    btn.addEventListener("click", openOverlay);
    document.body.appendChild(btn);
  }
  var searchNowhereOpen = false;
  var snActiveTab = "all";
  var snFocusIdx = -1;
  var SN_VOID_RESULTS = [
    { icon: "\u2205", label: "1 match found in /dev/null", sub: "/dev/null \u2014 read-only, as always", isVoid: true },
    { icon: "\u2205", label: "3 results evaporated during search", sub: "Cause: quantum measurement interference", isVoid: true },
    { icon: "\u2205", label: "Found in TODO.md", sub: "TODO.md \u2014 never written, never read, never will be", isVoid: true },
    { icon: "\u2205", label: "Located in Parallel Universe #7", sub: "Access requires inter-dimensional IDE license (yours expired)", isVoid: true },
    { icon: "\u2205", label: "Cached result from 1970-01-01", sub: "Cache TTL: \u221E  \xB7  Source: unknown  \xB7  Trust: none", isVoid: true },
    { icon: "\u2205", label: "Stored in $SCRATCH_HOME", sub: "$SCRATCH_HOME is undefined (always has been)", isVoid: true },
    { icon: "\u2205", label: "Exists in production only", sub: "Works on my machine\u2122  \xB7  target: not your machine", isVoid: true },
    { icon: "\u2205", label: "Hidden in a deleted comment", sub: '// \u2190 removed last week, reason: "makes no sense"', isVoid: true },
    { icon: "\u2205", label: "Result is loading\u2026", sub: "(has been loading since 2019)", isVoid: true }
  ];
  var SN_FAKE_ACTIONS = [
    { icon: "\u2601", label: "Upload to Scratch Cloud\u2122", sub: "Action  \xB7  Requires premium  \xB7  Not a real feature", isFake: true, pro: true },
    { icon: "\u21A9", label: "Undo All Mistakes (Career)", sub: "Action  \xB7  Lifetime Undo\u2122  \xB7  Requires full system reboot", isFake: true, pro: true },
    { icon: "\u25D1", label: "Enable Dark Dark Mode", sub: "Action  \xB7  Screen goes fully black  \xB7  May cause confusion", isFake: true },
    { icon: "\u2699", label: "Let AI Write This For You", sub: "Action  \xB7  Opens the void  \xB7  Results: unknowable", isFake: true, pro: true },
    { icon: "\u25B2", label: "Deploy to Production", sub: "Action  \xB7  Scratch has no production  \xB7  Good luck anyway", isFake: true },
    { icon: "\u2316", label: "Search Somewhere", sub: "Action  \xB7  Premium upgrade of Search Nowhere  \xB7  Finds things", isFake: true, pro: true }
  ];
  function snGetRealActions() {
    return [
      { icon: "\u25B6", label: "Compile & Inject", sub: "Action  \xB7  Ctrl+Enter", action: () => document.getElementById("scratchpiler-compile-btn")?.click() },
      { icon: "\u27F3", label: "Format Document", sub: "Action  \xB7  Edit menu", action: () => monacoEditor?.getAction("editor.action.formatDocument").run() },
      { icon: "\u21BA", label: "Invalidate & Re-Index", sub: "Action  \xB7  Fixes panel", action: () => document.getElementById("sp-fix-reindex")?.click() },
      { icon: "\u232B", label: "Clear Code Cache", sub: "Action  \xB7  Fixes panel", action: () => document.getElementById("sp-fix-clear-cache")?.click() },
      { icon: "\u2193", label: "Import from File", sub: "Action  \xB7  File menu", action: importFromLocalFile },
      { icon: "\u2191", label: "Export to File", sub: "Action  \xB7  File menu", action: exportToLocalFile },
      { icon: "\u2715", label: "Close Scratchpiler", sub: "Action  \xB7  Escape", action: () => {
        if (overlayVisible) closeOverlay();
      } }
    ];
  }
  function buildSearchNowhereDOM() {
    const backdrop = document.createElement("div");
    backdrop.id = "sp-sn-backdrop";
    backdrop.style.display = "none";
    backdrop.innerHTML = `
        <div id="sp-sn-modal" role="dialog" aria-modal="true" aria-label="Search Nowhere">
            <div id="sp-sn-header">
                <svg id="sp-sn-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input id="sp-sn-input" autocomplete="off" spellcheck="false" placeholder="Search Nowhere\u2026" />
                <span id="sp-sn-hint">\u21E7\u21E7 \xB7 Esc</span>
            </div>
            <div id="sp-sn-tabs">
                <button class="sp-sn-tab sp-sn-active" data-tab="all">All</button>
                <button class="sp-sn-tab" data-tab="sprites">Sprites</button>
                <button class="sp-sn-tab" data-tab="blocks">Blocks</button>
                <button class="sp-sn-tab" data-tab="actions">Actions</button>
                <button class="sp-sn-tab sp-sn-tab-void" data-tab="void">The Void</button>
            </div>
            <div id="sp-sn-results"></div>
            <div id="sp-sn-footer">
                <span id="sp-sn-status">Type to search nowhere</span>
                <span id="sp-sn-tip">\u2191\u2193 navigate  \xB7  Enter select  \xB7  Tab switch tab  \xB7  Esc close</span>
            </div>
        </div>
    `;
    backdrop.addEventListener("mousedown", (e) => {
      if (e.target === backdrop) closeSearchNowhere();
    });
    const input = backdrop.querySelector("#sp-sn-input");
    input.addEventListener("input", () => {
      snFocusIdx = -1;
      snRenderResults();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeSearchNowhere();
        return;
      }
      const items = document.querySelectorAll("#sp-sn-results .sp-sn-result");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        snFocusIdx = Math.min(snFocusIdx + 1, items.length - 1);
        snUpdateFocus(items);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        snFocusIdx = Math.max(snFocusIdx - 1, -1);
        snUpdateFocus(items);
      } else if (e.key === "Enter") {
        if (snFocusIdx >= 0 && items[snFocusIdx]) items[snFocusIdx].click();
      } else if (e.key === "Tab") {
        e.preventDefault();
        const tabs = ["all", "sprites", "blocks", "actions", "void"];
        snSwitchTab(tabs[(tabs.indexOf(snActiveTab) + 1) % tabs.length]);
      }
    });
    backdrop.querySelectorAll(".sp-sn-tab").forEach(
      (tab) => tab.addEventListener("click", () => {
        snSwitchTab(tab.dataset.tab);
        input.focus();
      })
    );
    document.body.appendChild(backdrop);
  }
  function snSwitchTab(tabId) {
    snActiveTab = tabId;
    snFocusIdx = -1;
    document.querySelectorAll(".sp-sn-tab").forEach((t) => t.classList.toggle("sp-sn-active", t.dataset.tab === tabId));
    snRenderResults();
  }
  function snUpdateFocus(items) {
    items.forEach((r, i) => {
      r.classList.toggle("sp-sn-focused", i === snFocusIdx);
      if (i === snFocusIdx) r.scrollIntoView({ block: "nearest" });
    });
  }
  function openSearchNowhere() {
    if (searchNowhereOpen) return;
    const backdrop = document.getElementById("sp-sn-backdrop");
    if (!backdrop) return;
    backdrop.style.display = "flex";
    searchNowhereOpen = true;
    snActiveTab = "all";
    snFocusIdx = -1;
    document.querySelectorAll(".sp-sn-tab").forEach((t) => t.classList.toggle("sp-sn-active", t.dataset.tab === "all"));
    const input = document.getElementById("sp-sn-input");
    if (input) {
      input.value = "";
      input.focus();
    }
    snRenderResults();
  }
  function closeSearchNowhere() {
    const backdrop = document.getElementById("sp-sn-backdrop");
    if (backdrop) backdrop.style.display = "none";
    searchNowhereOpen = false;
  }
  function snEscHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function snHighlight(text, query) {
    const safe = snEscHtml(text);
    if (!query) return safe;
    const re = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    return safe.replace(re, "<em>$1</em>");
  }
  var SN_VOID_JOKES = [
    "Access denied by the void.",
    "Connection to /dev/null timed out.",
    "Result has already evaporated.",
    "This result does not exist in this dimension.",
    "Error 404: result not found anywhere.",
    "Your request has been noted. It will be ignored.",
    "Cannot open a portal to /dev/null at this time."
  ];
  function snMakeResultEl(item, query, forceVoid) {
    const isVoid = forceVoid || item.isVoid || item.isFake;
    const el = document.createElement("div");
    el.className = "sp-sn-result" + (isVoid ? " sp-sn-void" : "");
    const pro = item.pro ? '<span class="sp-sn-pro">PRO</span>' : "";
    const badge = item.isFake ? '<span class="sp-sn-result-badge">fake</span>' : item.action || item.jumpTo ? '<span class="sp-sn-result-badge">real</span>' : "";
    el.innerHTML = `
        <span class="sp-sn-result-icon">${snEscHtml(item.icon || "\xB7")}</span>
        <span class="sp-sn-result-main">
            <span class="sp-sn-result-label">${snHighlight(item.label, query)}${pro}</span>
            ${item.sub ? `<span class="sp-sn-result-sub">${snEscHtml(item.sub)}</span>` : ""}
        </span>
        ${badge}
    `;
    el.addEventListener("click", () => {
      if (item.action) {
        closeSearchNowhere();
        item.action();
      } else if (item.jumpTo) {
        closeSearchNowhere();
        item.jumpTo();
      } else {
        const st = document.getElementById("sp-sn-status");
        if (st) st.textContent = SN_VOID_JOKES[Math.floor(Math.random() * SN_VOID_JOKES.length)];
      }
    });
    return el;
  }
  function snRenderSection(container, header, items, query, isVoid) {
    if (!items.length) return;
    const hdr = document.createElement("div");
    hdr.className = "sp-sn-group-header";
    hdr.textContent = header;
    container.appendChild(hdr);
    for (const item of items)
      container.appendChild(snMakeResultEl(item, query, isVoid));
  }
  function snEmptyState(container, msg) {
    container.innerHTML = `<div class="sp-sn-empty"><div class="sp-sn-empty-icon">\u{1F573}</div>${snEscHtml(msg || "Nothing found here either.")}<br><span style="font-size:11px;color:#263040">This is Search Nowhere. What did you expect?</span></div>`;
  }
  function snGetSpriteResults(query) {
    const all = [
      { name: "__stage__", label: "Stage.sp", icon: "\u25A3", sub: `Stage  \xB7  ${scratchIndex.stage.backdrops.length} backdrop(s)  \xB7  ${scratchIndex.globalVariables.length} global var(s)` },
      ...scratchIndex.sprites.map((s) => ({
        name: s.name,
        label: `${s.name}.sp`,
        icon: "\u25FB",
        sub: `Sprite  \xB7  ${s.costumes.length} costume(s)  \xB7  ${(scratchIndex.spriteVariables[s.name] || []).length} var(s)`
      }))
    ];
    return all.filter((s) => !query || s.label.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase())).map((s) => ({
      ...s,
      jumpTo: () => {
        if (!overlayVisible) openOverlay();
        setTimeout(() => selectSidebarSprite(s.name), overlayVisible ? 0 : 150);
      }
    }));
  }
  function snGetBlockResults(query) {
    if (!query) return [];
    const raw = [];
    searchCode(localStorage.getItem("scratchpiler-content-__stage__") || "", "__stage__", query, raw);
    for (const s of scratchIndex.sprites)
      searchCode(localStorage.getItem(`scratchpiler-content-${s.name}`) || "", s.name, query, raw);
    return raw.slice(0, 50).map((m) => ({
      icon: "\u2261",
      label: m.text || "(empty line)",
      sub: `${m.spriteName === "__stage__" ? "Stage" : m.spriteName}.sp  \xB7  Line ${m.line}`,
      _sprite: m.spriteName,
      jumpTo: () => {
        const go = () => {
          selectSidebarSprite(m.spriteName);
          if (monacoEditor) {
            monacoEditor.setPosition({ lineNumber: m.line, column: 1 });
            monacoEditor.revealLineInCenter(m.line);
            monacoEditor.focus();
          }
        };
        if (!overlayVisible) {
          openOverlay();
          setTimeout(go, 150);
        } else go();
      }
    }));
  }
  function snRenderResults() {
    const query = (document.getElementById("sp-sn-input")?.value || "").trim();
    const resultsEl = document.getElementById("sp-sn-results");
    const statusEl = document.getElementById("sp-sn-status");
    if (!resultsEl) return;
    resultsEl.innerHTML = "";
    snFocusIdx = -1;
    if (snActiveTab === "void") {
      const items = [...SN_VOID_RESULTS];
      if (query) items.unshift({ icon: "\u2205", label: `"${query}" found in The Void`, sub: "Cannot access  \xB7  Forbidden by cosmic law  \xB7  Try again: never", isVoid: true });
      snRenderSection(resultsEl, "The Void", items, query, true);
      if (statusEl) statusEl.textContent = `${items.length} result${items.length !== 1 ? "s" : ""}  \xB7  none accessible  \xB7  this is fine`;
      return;
    }
    if (snActiveTab === "sprites") {
      const real = snGetSpriteResults(query);
      const ghosts = [
        { icon: "\u{1F47B}", label: "Sprite3.sp", sub: "Ghost  \xB7  Deleted 2 saves ago  \xB7  Still haunting the VM", isVoid: true },
        { icon: "\u{1F47B}", label: "Stage.sp (backup)", sub: "Ghost  \xB7  Exists in your heart only", isVoid: true }
      ];
      snRenderSection(resultsEl, "Sprites", real, query, false);
      snRenderSection(resultsEl, "Ghost Sprites", ghosts, query, true);
      if (!real.length && !ghosts.length) snEmptyState(resultsEl);
      if (statusEl) statusEl.textContent = `${real.length} sprite${real.length !== 1 ? "s" : ""}  \xB7  plus ${ghosts.length} haunted`;
      return;
    }
    if (snActiveTab === "blocks") {
      const items = snGetBlockResults(query);
      snRenderSection(resultsEl, "Code Matches", items, query, false);
      if (!items.length) snEmptyState(resultsEl, query ? "No matches found. (Searched: nowhere.)" : "Type to search code blocks");
      if (statusEl) {
        const spriteCount = new Set(items.map((i) => i._sprite)).size;
        statusEl.textContent = items.length === 0 ? query ? "No matches  \xB7  checked everywhere  \xB7  found nowhere" : "Type to search blocks" : `${items.length} match${items.length !== 1 ? "es" : ""}  \xB7  across ${spriteCount} sprite${spriteCount !== 1 ? "s" : ""}`;
      }
      return;
    }
    if (snActiveTab === "actions") {
      const real = snGetRealActions().filter((a) => !query || a.label.toLowerCase().includes(query.toLowerCase()));
      const fake = SN_FAKE_ACTIONS.filter((a) => !query || a.label.toLowerCase().includes(query.toLowerCase()));
      snRenderSection(resultsEl, "Actions", real, query, false);
      snRenderSection(resultsEl, "Definitely Real Actions\u2122", fake, query, true);
      if (!real.length && !fake.length) snEmptyState(resultsEl);
      if (statusEl) statusEl.textContent = `${real.length} action${real.length !== 1 ? "s" : ""}  \xB7  ${fake.length} "action${fake.length !== 1 ? "s" : ""}"`;
      return;
    }
    const sprites = snGetSpriteResults(query);
    const blocks = snGetBlockResults(query);
    const realActions = snGetRealActions().filter((a) => !query || a.label.toLowerCase().includes(query.toLowerCase()));
    const fakeActions = query ? SN_FAKE_ACTIONS.filter((a) => a.label.toLowerCase().includes(query.toLowerCase())) : SN_FAKE_ACTIONS.slice(0, 2);
    const voidPeek = query ? [{ icon: "\u2205", label: `"${query}" found in The Void`, sub: "Cannot access  \xB7  See The Void tab for more", isVoid: true }] : [SN_VOID_RESULTS[0], SN_VOID_RESULTS[1]];
    snRenderSection(resultsEl, "Sprites", sprites, query, false);
    snRenderSection(resultsEl, "Blocks", blocks, query, false);
    snRenderSection(resultsEl, "Actions", [...realActions, ...fakeActions], query, false);
    snRenderSection(resultsEl, "The Void", voidPeek, query, true);
    const totalReal = sprites.length + blocks.length + realActions.length;
    const totalFake = fakeActions.length + voidPeek.length;
    if (!totalReal && !totalFake) snEmptyState(resultsEl);
    if (statusEl) statusEl.textContent = !totalReal && !totalFake ? "No results found (as expected)" : `${totalReal} result${totalReal !== 1 ? "s" : ""}  \xB7  ${totalFake} fabricated`;
  }
  function logToOutput(message, level = "info") {
    const log = document.getElementById("sp-output-log");
    if (!log) return;
    const panel = document.getElementById("sp-output-panel");
    if (panel && !panel.classList.contains("sp-expanded")) {
      panel.classList.add("sp-expanded");
      const toggleBtn = document.getElementById("sp-output-toggle-btn");
      if (toggleBtn) toggleBtn.textContent = "\u25BE";
      if (monacoEditor) setTimeout(() => monacoEditor.layout(), 160);
    }
    const now = /* @__PURE__ */ new Date();
    const ts = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const entry = document.createElement("div");
    entry.className = `sp-out-entry ${level}`;
    const safeMsg = String(message).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    entry.innerHTML = `<span class="sp-out-time">[${ts}]</span><span class="sp-out-text">${safeMsg}</span>`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }
  function flashCompileBtn(ok) {
    const btn = document.getElementById("scratchpiler-compile-btn");
    if (!btn) return;
    btn.classList.remove("sp-flash-ok", "sp-flash-err");
    void btn.offsetWidth;
    btn.classList.add(ok ? "sp-flash-ok" : "sp-flash-err");
    btn.addEventListener("animationend", () => btn.classList.remove("sp-flash-ok", "sp-flash-err"), { once: true });
  }
  var spPickerOpen = false;
  var spPickerFocusIdx = -1;
  function openSpritePicker() {
    if (spPickerOpen) return;
    const backdrop = document.getElementById("sp-picker-backdrop");
    if (!backdrop) return;
    backdrop.style.display = "flex";
    spPickerOpen = true;
    spPickerFocusIdx = -1;
    const input = document.getElementById("sp-picker-input");
    if (input) {
      input.value = "";
      input.focus();
    }
    spPickerRender("");
  }
  function closeSpritePicker() {
    const backdrop = document.getElementById("sp-picker-backdrop");
    if (backdrop) backdrop.style.display = "none";
    spPickerOpen = false;
  }
  function spPickerRender(query) {
    const list = document.getElementById("sp-picker-list");
    if (!list) return;
    list.innerHTML = "";
    spPickerFocusIdx = -1;
    const all = [
      {
        name: "__stage__",
        label: "Stage.sp",
        icon: "\u25A3",
        sub: `${scratchIndex.stage.backdrops.length} bg \xB7 ${scratchIndex.globalVariables.length} var`
      },
      ...scratchIndex.sprites.map((s) => ({
        name: s.name,
        label: `${s.name}.sp`,
        icon: "\u25FB",
        sub: `${s.costumes.length} costume \xB7 ${(scratchIndex.spriteVariables[s.name] || []).length} var`
      }))
    ];
    const filtered = query ? all.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())) : all;
    if (!filtered.length) {
      list.innerHTML = '<div id="sp-picker-empty">No sprites match</div>';
      return;
    }
    filtered.forEach((s) => {
      const el = document.createElement("div");
      el.className = "sp-picker-item";
      const hl = query ? snHighlight(s.label, query) : snEscHtml(s.label);
      el.innerHTML = `<span class="sp-picker-item-icon">${s.icon}</span><span class="sp-picker-item-name">${hl}</span><span class="sp-picker-item-sub">${snEscHtml(s.sub)}</span>`;
      el.addEventListener("click", () => {
        closeSpritePicker();
        if (!overlayVisible) openOverlay();
        setTimeout(() => selectSidebarSprite(s.name), overlayVisible ? 0 : 150);
      });
      list.appendChild(el);
    });
  }
  function spPickerMoveFocus(delta) {
    const items = Array.from(document.querySelectorAll("#sp-picker-list .sp-picker-item"));
    spPickerFocusIdx = Math.max(-1, Math.min(items.length - 1, spPickerFocusIdx + delta));
    items.forEach((el, i) => {
      el.classList.toggle("sp-picker-focused", i === spPickerFocusIdx);
      if (i === spPickerFocusIdx) el.scrollIntoView({ block: "nearest" });
    });
  }
  function setupSpritePicker() {
    const backdrop = document.getElementById("sp-picker-backdrop");
    const input = document.getElementById("sp-picker-input");
    if (!backdrop || !input) return;
    backdrop.addEventListener("mousedown", (e) => {
      if (e.target === backdrop) closeSpritePicker();
    });
    input.addEventListener("input", () => spPickerRender(input.value.trim()));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeSpritePicker();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        spPickerMoveFocus(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        spPickerMoveFocus(-1);
        return;
      }
      if (e.key === "Enter") {
        const items = document.querySelectorAll("#sp-picker-list .sp-picker-item");
        const target = spPickerFocusIdx >= 0 ? items[spPickerFocusIdx] : items[0];
        if (target) target.click();
      }
    });
  }
  function showSpriteContextMenu(e, spriteName) {
    e.preventDefault();
    closeSpriteContextMenu();
    const menu = document.createElement("div");
    menu.className = "sp-ctx-menu";
    menu.id = "sp-active-ctx-menu";
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    const items = [
      {
        label: "Open",
        action: () => selectSidebarSprite(spriteName)
      },
      { sep: true },
      {
        label: "Decompile from VM",
        sub: "Overwrite editor from live blocks",
        action: () => {
          if (!currentVM) {
            logToOutput("VM not available", "error");
            return;
          }
          try {
            const code = decompile(currentVM, spriteName);
            selectSidebarSprite(spriteName);
            if (monacoEditor) monacoEditor.setValue(code);
            const key = `scratchpiler-content-${spriteName}`;
            if (code && code.trim()) localStorage.setItem(key, code);
            const label = spriteName === "__stage__" ? "Stage" : spriteName;
            logToOutput(`Decompiled "${label}" from VM`, "ok");
            updateStatus(`Decompiled "${label}"`);
          } catch (err) {
            logToOutput("Decompile error: " + err.message, "error");
            updateStatus("Decompile error: " + err.message);
          }
        }
      },
      {
        label: "Export as .sp\u2026",
        action: () => {
          selectSidebarSprite(spriteName);
          setTimeout(exportToLocalFile, 50);
        }
      }
    ];
    for (const item of items) {
      if (item.sep) {
        const sep = document.createElement("div");
        sep.className = "sp-ctx-sep";
        menu.appendChild(sep);
      } else {
        const btn = document.createElement("button");
        btn.className = "sp-ctx-item";
        const safe = String(item.label).replace(/&/g, "&amp;").replace(/</g, "&lt;");
        btn.innerHTML = safe;
        btn.title = item.sub || "";
        btn.addEventListener("click", () => {
          closeSpriteContextMenu();
          item.action();
        });
        menu.appendChild(btn);
      }
    }
    document.body.appendChild(menu);
    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      if (r.right > window.innerWidth) menu.style.left = e.clientX - r.width + "px";
      if (r.bottom > window.innerHeight) menu.style.top = e.clientY - r.height + "px";
    });
    setTimeout(() => {
      const onOutside = (ev) => {
        if (!menu.contains(ev.target)) {
          closeSpriteContextMenu();
          document.removeEventListener("mousedown", onOutside);
        }
      };
      document.addEventListener("mousedown", onOutside);
    }, 0);
  }
  function closeSpriteContextMenu() {
    const m = document.getElementById("sp-active-ctx-menu");
    if (m) m.remove();
  }
  function setupSidebarResize() {
    const handle = document.getElementById("sp-sidebar-resize");
    const sidebar = document.getElementById("scratchpiler-sidebar");
    if (!handle || !sidebar) return;
    let dragging = false, startX = 0, startW = 0;
    handle.addEventListener("mousedown", (e) => {
      if (!sidebarExpanded) return;
      dragging = true;
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      handle.classList.add("sp-resizing");
      document.body.style.cssText += ";cursor:col-resize!important;user-select:none!important";
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const w = Math.max(150, Math.min(520, startW + e.clientX - startX));
      sidebar.style.width = w + "px";
      if (monacoEditor) monacoEditor.layout();
    });
    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      handle.classList.remove("sp-resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  }
  function setupOutputPanel() {
    const toggleBtn = document.getElementById("sp-output-toggle-btn");
    const clearBtn = document.getElementById("sp-output-clear-btn");
    const header = document.getElementById("sp-output-header");
    const panel = document.getElementById("sp-output-panel");
    if (!panel) return;
    function toggle() {
      panel.classList.toggle("sp-expanded");
      if (toggleBtn) toggleBtn.textContent = panel.classList.contains("sp-expanded") ? "\u25BE" : "\u25B8";
      if (monacoEditor) setTimeout(() => monacoEditor.layout(), 160);
    }
    if (toggleBtn) toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    if (clearBtn) clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const log = document.getElementById("sp-output-log");
      if (log) log.innerHTML = "";
    });
    if (header) header.addEventListener("click", toggle);
  }

  // src/editor.js
  var monacoEditor = null;
  var overlayVisible = false;
  var currentVM = null;
  var applySettingsFn = null;
  var currentActiveTab = "explorer";
  var sidebarExpanded2 = true;
  var debugPollInterval = null;
  function renderSidebarSprites() {
    const listEl = document.getElementById("scratchpiler-sprites-list");
    if (!listEl) return;
    listEl.innerHTML = "";
    function makeSpriteItem(spriteName, labelText, iconSvg) {
      const el = document.createElement("div");
      el.className = "sp-list-item";
      el.dataset.sprite = spriteName;
      el.innerHTML = `${iconSvg}<span class="sp-item-name">${labelText}</span>`;
      el.addEventListener("click", () => selectSidebarSprite(spriteName));
      el.addEventListener("contextmenu", (e) => showSpriteContextMenu(e, spriteName));
      return el;
    }
    const stageEl = makeSpriteItem(
      "__stage__",
      "Stage.sp",
      `<svg class="sp-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`
    );
    listEl.appendChild(stageEl);
    for (const s of scratchIndex.sprites) {
      const el = makeSpriteItem(
        s.name,
        `${s.name}.sp`,
        `<svg class="sp-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
      );
      listEl.appendChild(el);
    }
    if (currentSpriteContext) {
      const activeItem = listEl.querySelector(`[data-sprite="${currentSpriteContext}"]`);
      if (activeItem) activeItem.classList.add("active");
    }
  }
  function selectSidebarSprite(spriteName) {
    if (!spriteName) return;
    const oldSprite = currentSpriteContext;
    if (oldSprite && oldSprite !== spriteName) {
      saveToLocalStorage(oldSprite);
    }
    currentSpriteContext = spriteName;
    if (currentVM) {
      const stage = currentVM.runtime.targets.find((t) => t.isStage);
      const target = spriteName === "__stage__" ? stage : currentVM.runtime.targets.find((t) => !t.isStage && t.sprite.name === spriteName);
      if (target) {
        try {
          currentVM.setEditingTarget(target.id);
        } catch (_) {
        }
      }
    }
    const listEl = document.getElementById("scratchpiler-sprites-list");
    if (listEl) {
      for (const item of listEl.children) {
        if (item.dataset.sprite === spriteName) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      }
    }
    loadFromLocalStorage(spriteName);
    updateSpriteDetails(spriteName);
    openSpriteTab(spriteName);
    updateStatusBarSprite(spriteName);
  }
  var openTabSprites = [];
  function renderTabs() {
    const bar = document.getElementById("sp-tab-bar");
    if (!bar) return;
    bar.innerHTML = "";
    for (const name of openTabSprites) {
      const isStage = name === "__stage__";
      const label = isStage ? "Stage.sp" : `${name}.sp`;
      const icon = isStage ? "\u25A3" : "\u25FB";
      const tab = document.createElement("div");
      tab.className = "sp-tab" + (name === currentSpriteContext ? " sp-tab-active" : "");
      tab.dataset.sprite = name;
      tab.innerHTML = `<span class="sp-tab-icon">${icon}</span><span class="sp-tab-name">${label}</span>`;
      const closeBtn = document.createElement("button");
      closeBtn.className = "sp-tab-close";
      closeBtn.textContent = "\xD7";
      closeBtn.title = "Close tab";
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeSpriteTab(name);
      });
      tab.appendChild(closeBtn);
      tab.addEventListener("click", () => selectSidebarSprite(name));
      bar.appendChild(tab);
    }
  }
  function openSpriteTab(name) {
    if (!openTabSprites.includes(name)) openTabSprites.push(name);
    renderTabs();
  }
  function closeSpriteTab(name) {
    const idx = openTabSprites.indexOf(name);
    if (idx < 0) return;
    openTabSprites.splice(idx, 1);
    if (currentSpriteContext === name) {
      const next = openTabSprites[idx] ?? openTabSprites[idx - 1] ?? null;
      if (next) {
        selectSidebarSprite(next);
      } else {
        currentSpriteContext = null;
        if (monacoEditor) monacoEditor.setValue("");
        renderTabs();
      }
    } else {
      renderTabs();
    }
  }
  function updateStatusBarVM(state) {
    const dot = document.getElementById("sp-sb-vm-dot");
    const text = document.getElementById("sp-sb-vm-text");
    if (!dot || !text) return;
    dot.className = `sp-sb-dot sp-sb-dot-${state}`;
    if (state === "ok") text.textContent = "VM Ready";
    if (state === "error") text.textContent = "VM Not Found";
  }
  function updateStatusBarSprite(name) {
    const el = document.getElementById("sp-sb-sprite-name");
    if (el) el.textContent = !name ? "\u2014" : name === "__stage__" ? "Stage" : name;
  }
  function updateStatusBarCursor(line, col) {
    const el = document.getElementById("sp-sb-cursor");
    if (el) el.textContent = `Ln ${line}, Col ${col}`;
  }
  function updateStatusBarProblems(errors, warnings) {
    const errEl = document.getElementById("sp-sb-err-count");
    const warnEl = document.getElementById("sp-sb-warn-count");
    if (errEl) {
      errEl.textContent = `${errors} error${errors !== 1 ? "s" : ""}`;
      errEl.classList.toggle("sp-sb-zero", errors === 0);
    }
    if (warnEl) {
      warnEl.textContent = `${warnings} warning${warnings !== 1 ? "s" : ""}`;
      warnEl.classList.toggle("sp-sb-zero", warnings === 0);
    }
  }
  function updateSpriteDetails(spriteName) {
    const detailTitle = document.getElementById("scratchpiler-detail-spritename");
    if (detailTitle) {
      detailTitle.textContent = spriteName === "__stage__" ? "Stage" : spriteName;
    }
    const costumesContent = document.getElementById("sp-subacc-costumes-content");
    const soundsContent = document.getElementById("sp-subacc-sounds-content");
    const varsContent = document.getElementById("sp-subacc-variables-content");
    const cbContent = document.getElementById("sp-subacc-customblocks-content");
    if (!costumesContent || !soundsContent || !varsContent) return;
    costumesContent.innerHTML = "";
    soundsContent.innerHTML = "";
    varsContent.innerHTML = "";
    if (cbContent) cbContent.innerHTML = "";
    let costumes = [], sounds = [], vars = [], customBlocks = [];
    if (spriteName === "__stage__") {
      costumes = scratchIndex.stage.backdrops || [];
      sounds = scratchIndex.stage.sounds || [];
      vars = scratchIndex.globalVariables || [];
    } else {
      const sprite = scratchIndex.sprites.find((s) => s.name === spriteName);
      if (sprite) {
        costumes = sprite.costumes || [];
        sounds = sprite.sounds || [];
      }
      vars = scratchIndex.spriteVariables[spriteName] || [];
      customBlocks = scratchIndex.customBlocks[spriteName] || [];
    }
    function makeDetailItem(label, snippet, title) {
      const div = document.createElement("div");
      div.className = "sp-detail-item";
      div.textContent = label;
      div.title = title;
      div.addEventListener("click", () => {
        if (monacoEditor) {
          monacoEditor.trigger("sidebar", "type", { text: snippet });
          monacoEditor.focus();
        }
      });
      return div;
    }
    if (costumes.length === 0) {
      costumesContent.innerHTML = '<div class="sp-detail-empty">None</div>';
    } else {
      for (const c of costumes) {
        const snippet = spriteName === "__stage__" ? `switchBackdrop("${c}")` : `switchCostume("${c}")`;
        costumesContent.appendChild(makeDetailItem(c, snippet, `Insert: ${snippet}`));
      }
    }
    if (sounds.length === 0) {
      soundsContent.innerHTML = '<div class="sp-detail-empty">None</div>';
    } else {
      for (const s of sounds) {
        soundsContent.appendChild(makeDetailItem(s, `play("${s}")`, `Insert: play("${s}")`));
      }
    }
    if (vars.length === 0) {
      varsContent.innerHTML = '<div class="sp-detail-empty">None</div>';
    } else {
      for (const v of vars) {
        const snippet = `[${v.name}]`;
        const row = document.createElement("div");
        row.className = "sp-detail-item-row";
        const lbl = document.createElement("div");
        lbl.className = "sp-detail-item";
        lbl.textContent = `${v.name} (${v.type})`;
        lbl.title = `Insert: ${snippet}`;
        lbl.addEventListener("click", () => {
          if (monacoEditor) {
            monacoEditor.trigger("sidebar", "type", { text: snippet });
            monacoEditor.focus();
          }
        });
        const actBtn = document.createElement("button");
        actBtn.className = "sp-detail-action-btn";
        actBtn.textContent = "\u22EE";
        actBtn.title = "Variable actions";
        actBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const rect = actBtn.getBoundingClientRect();
          const menuItems = [
            { label: "Rename\u2026", action: () => openRenameDialog(v) },
            { label: "Delete", danger: true, action: () => doDeleteVariable(v.id) }
          ];
          if (v.type === "list") {
            menuItems.splice(1, 0, { label: "Initialize from CSV\u2026", action: () => openInitListDialog(v) });
          }
          showContextMenu(menuItems, rect.left, rect.bottom + 2);
        });
        row.appendChild(lbl);
        row.appendChild(actBtn);
        varsContent.appendChild(row);
      }
    }
    if (cbContent) {
      if (customBlocks.length === 0) {
        cbContent.innerHTML = '<div class="sp-detail-empty">None</div>';
      } else {
        for (const proc of customBlocks) {
          cbContent.appendChild(makeDetailItem(proc, proc, `Insert call: ${proc}`));
        }
      }
    }
  }
  function setupActivityBar() {
    const sidebar = document.getElementById("scratchpiler-sidebar");
    const actExplorer = document.getElementById("sp-activity-explorer");
    const actSearch = document.getElementById("sp-activity-search");
    const actSettings = document.getElementById("sp-activity-settings");
    const actFixes = document.getElementById("sp-activity-fixes");
    const panels = {
      explorer: document.getElementById("sp-panel-explorer"),
      search: document.getElementById("sp-panel-search"),
      settings: document.getElementById("sp-panel-settings"),
      fixes: document.getElementById("sp-panel-fixes")
    };
    const buttons = {
      explorer: actExplorer,
      search: actSearch,
      settings: actSettings,
      fixes: actFixes
    };
    function switchTab(tabId) {
      const sidebarTitle = document.getElementById("scratchpiler-sidebar-title");
      if (sidebarTitle) {
        sidebarTitle.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
      }
      if (currentActiveTab === tabId && sidebarExpanded2) {
        sidebar.style.display = "none";
        sidebarExpanded2 = false;
        buttons[tabId].classList.remove("sp-active");
      } else {
        sidebar.style.display = "flex";
        sidebarExpanded2 = true;
        Object.keys(buttons).forEach((k) => {
          if (k === tabId) buttons[k].classList.add("sp-active");
          else buttons[k].classList.remove("sp-active");
        });
        Object.keys(panels).forEach((k) => {
          if (k === tabId) panels[k].classList.add("active");
          else panels[k].classList.remove("active");
        });
        currentActiveTab = tabId;
      }
      if (monacoEditor) {
        setTimeout(() => monacoEditor.layout(), 50);
      }
    }
    actExplorer.addEventListener("click", () => switchTab("explorer"));
    actSearch.addEventListener("click", () => switchTab("search"));
    actSettings.addEventListener("click", () => switchTab("settings"));
    actFixes.addEventListener("click", () => switchTab("fixes"));
    document.getElementById("sp-fix-clear-cache").addEventListener("click", () => {
      let cleared = 0;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("scratchpiler-content-") || key.startsWith(`${LS_INJ_KEY}-`))) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => {
        localStorage.removeItem(k);
        cleared++;
      });
      try {
        localStorage.removeItem("scratchpiler-editor-content");
        cleared++;
      } catch {
      }
      injectedBlockIds2.clear();
      updateStatus(`\u2713 Cleared ${cleared} cached entries`);
      if (currentSpriteContext) loadFromLocalStorage(currentSpriteContext);
    });
    document.getElementById("sp-fix-reindex").addEventListener("click", () => {
      if (!currentVM) {
        updateStatus("Error: VM not available");
        return;
      }
      reindex(currentVM);
      renderSidebarSprites();
      if (currentSpriteContext) {
        selectSidebarSprite(currentSpriteContext);
      }
      updateStatus("\u2713 Re-indexed all sprites & variables");
    });
    document.getElementById("sp-fix-reset-all").addEventListener("click", () => {
      if (!currentVM) {
        updateStatus("Error: VM not available");
        return;
      }
      if (!confirm("Reset all Scratchpiler changes?\n\nThis will:\n\u2022 Remove all injected blocks from every sprite\n\u2022 Clear all cached SDSL code\n\u2022 Re-index the project\n\nThe project will return to its last-saved state.")) return;
      let removedCount = 0;
      for (const [spriteName, ids] of injectedBlockIds2.entries()) {
        const target = spriteName === "__stage__" ? currentVM.runtime.targets.find((t) => t.isStage) : currentVM.runtime.targets.find((t) => !t.isStage && t.sprite.name === spriteName);
        if (target) {
          for (const id of ids) {
            try {
              target.blocks.deleteBlock(id);
              removedCount++;
            } catch {
            }
          }
        }
      }
      injectedBlockIds2.clear();
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("scratchpiler-content-") || key.startsWith(`${LS_INJ_KEY}-`))) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      try {
        localStorage.removeItem("scratchpiler-editor-content");
      } catch {
      }
      try {
        currentVM.setEditingTarget(currentVM.editingTarget.id);
      } catch {
      }
      reindex(currentVM);
      renderSidebarSprites();
      if (currentSpriteContext) {
        selectSidebarSprite(currentSpriteContext);
      } else {
        if (monacoEditor) monacoEditor.setValue("");
      }
      updateStatus(`\u2713 Reset complete \u2014 removed ${removedCount} injected blocks, cleared ${keysToRemove.length} cache entries`);
    });
    document.querySelectorAll(".sp-accordion-header").forEach((hdr) => {
      hdr.addEventListener("click", () => {
        const content = hdr.nextElementSibling;
        hdr.classList.toggle("active");
        content.classList.toggle("active");
        const chevron = hdr.querySelector(".sp-chevron");
        if (chevron) {
          chevron.textContent = hdr.classList.contains("active") ? "\u25BC" : "\u25B6";
        }
      });
    });
    document.querySelectorAll(".sp-sub-accordion-header").forEach((hdr) => {
      hdr.addEventListener("click", () => {
        const content = hdr.nextElementSibling;
        hdr.classList.toggle("active");
        content.classList.toggle("active");
        const isAct = hdr.classList.contains("active");
        hdr.textContent = (isAct ? "\u25BC " : "\u25B6 ") + hdr.textContent.substring(2);
      });
    });
    document.getElementById("scratchpiler-search-btn").addEventListener("click", runSearch);
    document.getElementById("scratchpiler-search-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") runSearch();
    });
    document.getElementById("scratchpiler-replace-btn").addEventListener("click", runReplace);
    document.getElementById("scratchpiler-replace-all-btn").addEventListener("click", runReplaceAll);
  }
  function runSearch() {
    const query = document.getElementById("scratchpiler-search-input").value.trim();
    const resultsEl = document.getElementById("scratchpiler-search-results");
    if (!resultsEl) return;
    resultsEl.innerHTML = "";
    if (!query) {
      resultsEl.innerHTML = '<div class="sp-search-no-results">Type a query to search</div>';
      return;
    }
    const matches = [];
    const stageCode = localStorage.getItem("scratchpiler-content-__stage__") || "";
    searchCode(stageCode, "__stage__", query, matches);
    for (const s of scratchIndex.sprites) {
      const code = localStorage.getItem(`scratchpiler-content-${s.name}`) || "";
      searchCode(code, s.name, query, matches);
    }
    if (matches.length === 0) {
      resultsEl.innerHTML = '<div class="sp-search-no-results">No results found</div>';
      return;
    }
    const groups = {};
    for (const m of matches) {
      if (!groups[m.spriteName]) groups[m.spriteName] = [];
      groups[m.spriteName].push(m);
    }
    for (const [spriteName, groupMatches] of Object.entries(groups)) {
      const groupHeader = document.createElement("div");
      groupHeader.className = "sp-search-group-header";
      groupHeader.textContent = spriteName === "__stage__" ? "Stage.sp" : `${spriteName}.sp`;
      resultsEl.appendChild(groupHeader);
      for (const m of groupMatches) {
        const item = document.createElement("div");
        item.className = "sp-search-result-item";
        item.innerHTML = `<span class="sp-search-line-num">${m.line}:</span> <span class="sp-search-line-text"></span>`;
        item.querySelector(".sp-search-line-text").textContent = m.text;
        item.addEventListener("click", () => {
          selectSidebarSprite(m.spriteName);
          if (monacoEditor) {
            monacoEditor.setPosition({ lineNumber: m.line, column: 1 });
            monacoEditor.revealLineInCenter(m.line);
            monacoEditor.focus();
          }
        });
        resultsEl.appendChild(item);
      }
    }
  }
  function searchCode(code, spriteName, query, matches) {
    const lines = code.split("\n");
    const lowerQuery = query.toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(lowerQuery)) {
        matches.push({
          spriteName,
          line: i + 1,
          text: lines[i].trim()
        });
      }
    }
  }
  function runReplace() {
    const searchVal = document.getElementById("scratchpiler-search-input").value;
    const replaceVal = document.getElementById("scratchpiler-replace-input").value;
    if (!searchVal) return;
    if (monacoEditor) {
      const selection = monacoEditor.getSelection();
      const selectedText = monacoEditor.getModel().getValueInRange(selection);
      if (selectedText.toLowerCase().includes(searchVal.toLowerCase())) {
        const range = new monaco.Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        );
        monacoEditor.executeEdits("search-replace", [{
          range,
          text: replaceVal,
          forceMoveMarkers: true
        }]);
        saveToLocalStorage(currentSpriteContext);
        runSearch();
      } else {
        const model = monacoEditor.getModel();
        const matches = model.findMatches(searchVal, true, false, false, null, true);
        if (matches.length > 0) {
          const match = matches[0];
          monacoEditor.setSelection(match.range);
          monacoEditor.revealRangeInCenter(match.range);
          monacoEditor.focus();
        }
      }
    }
  }
  function runReplaceAll() {
    const searchVal = document.getElementById("scratchpiler-search-input").value;
    const replaceVal = document.getElementById("scratchpiler-replace-input").value;
    if (!searchVal) return;
    if (!confirm(`Are you sure you want to replace all occurrences of "${searchVal}" with "${replaceVal}" in all sprites?`)) {
      return;
    }
    let replacedCount = 0;
    replacedCount += replaceInSprite("__stage__", searchVal, replaceVal);
    for (const s of scratchIndex.sprites) {
      replacedCount += replaceInSprite(s.name, searchVal, replaceVal);
    }
    loadFromLocalStorage(currentSpriteContext);
    updateStatus(`Replaced ${replacedCount} occurrence(s) across all sprites.`);
    runSearch();
  }
  function replaceInSprite(spriteName, searchVal, replaceVal) {
    const key = `scratchpiler-content-${spriteName}`;
    const code = localStorage.getItem(key) || "";
    if (!code) return 0;
    const escaped = searchVal.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(escaped, "gi");
    let count = 0;
    const newCode = code.replace(regex, () => {
      count++;
      return replaceVal;
    });
    if (count > 0) {
      localStorage.setItem(key, newCode);
    }
    return count;
  }
  function setupSettings() {
    const themeSelect = document.getElementById("sp-setting-theme");
    const fontSizeSelect = document.getElementById("sp-setting-fontsize");
    const wrapCheckbox = document.getElementById("sp-setting-wrap");
    const minimapCheckbox = document.getElementById("sp-setting-minimap");
    const tabSizeSelect = document.getElementById("sp-setting-tabsize");
    const autosaveSelect = document.getElementById("sp-setting-autosave");
    const lintTypecheckChk = document.getElementById("sp-setting-lint-typecheck");
    const lintUnreachChk = document.getElementById("sp-setting-lint-unreachable");
    const lintOrphanedChk = document.getElementById("sp-setting-lint-orphaned");
    let settings = {};
    try {
      settings = JSON.parse(localStorage.getItem("scratchpiler-settings")) || {};
    } catch (_) {
    }
    if (!settings.theme) settings.theme = "scratchpiler-dark";
    if (!settings.fontSize) settings.fontSize = "14";
    if (settings.wrap === void 0) settings.wrap = true;
    if (settings.minimap === void 0) settings.minimap = false;
    if (!settings.tabSize) settings.tabSize = "4";
    if (settings.autosave === void 0) settings.autosave = "1000";
    if (settings.lintTypecheck === void 0) settings.lintTypecheck = true;
    if (settings.lintUnreachable === void 0) settings.lintUnreachable = true;
    if (settings.lintOrphaned === void 0) settings.lintOrphaned = true;
    themeSelect.value = settings.theme;
    fontSizeSelect.value = settings.fontSize;
    wrapCheckbox.checked = settings.wrap;
    minimapCheckbox.checked = settings.minimap;
    tabSizeSelect.value = settings.tabSize;
    autosaveSelect.value = settings.autosave;
    lintTypecheckChk.checked = settings.lintTypecheck;
    lintUnreachChk.checked = settings.lintUnreachable;
    lintOrphanedChk.checked = settings.lintOrphaned;
    spSettings.tabSize = parseInt(settings.tabSize, 10) || 4;
    spSettings.autosave = parseInt(settings.autosave, 10);
    spSettings.lintTypecheck = settings.lintTypecheck;
    spSettings.lintUnreachable = settings.lintUnreachable;
    spSettings.lintOrphaned = settings.lintOrphaned;
    function applySettings() {
      if (!monacoEditor) return;
      const newTabSize = parseInt(tabSizeSelect.value, 10) || 4;
      const newAutosave = parseInt(autosaveSelect.value, 10);
      spSettings.tabSize = newTabSize;
      spSettings.autosave = newAutosave;
      spSettings.lintTypecheck = lintTypecheckChk.checked;
      spSettings.lintUnreachable = lintUnreachChk.checked;
      spSettings.lintOrphaned = lintOrphanedChk.checked;
      monaco.editor.setTheme(themeSelect.value);
      monacoEditor.updateOptions({
        fontSize: parseInt(fontSizeSelect.value, 10),
        wordWrap: wrapCheckbox.checked ? "on" : "off",
        minimap: { enabled: minimapCheckbox.checked },
        tabSize: newTabSize,
        insertSpaces: true
      });
      localStorage.setItem("scratchpiler-settings", JSON.stringify({
        theme: themeSelect.value,
        fontSize: fontSizeSelect.value,
        wrap: wrapCheckbox.checked,
        minimap: minimapCheckbox.checked,
        tabSize: tabSizeSelect.value,
        autosave: autosaveSelect.value,
        lintTypecheck: lintTypecheckChk.checked,
        lintUnreachable: lintUnreachChk.checked,
        lintOrphaned: lintOrphanedChk.checked
      }));
    }
    themeSelect.addEventListener("change", applySettings);
    fontSizeSelect.addEventListener("change", applySettings);
    wrapCheckbox.addEventListener("change", applySettings);
    minimapCheckbox.addEventListener("change", applySettings);
    tabSizeSelect.addEventListener("change", applySettings);
    autosaveSelect.addEventListener("change", applySettings);
    lintTypecheckChk.addEventListener("change", applySettings);
    lintUnreachChk.addEventListener("change", applySettings);
    lintOrphanedChk.addEventListener("change", applySettings);
    return applySettings;
  }
  function importFromLocalFile() {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".sp,.sdsl,.txt";
    inp.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const rdr = new FileReader();
      rdr.onload = (ev) => {
        if (monacoEditor) {
          monacoEditor.setValue(ev.target.result);
          updateStatus(`Loaded file: ${file.name}`);
        }
      };
      rdr.readAsText(file);
    };
    inp.click();
  }
  function exportToLocalFile() {
    if (!monacoEditor) return;
    const code = monacoEditor.getValue();
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const name = currentSpriteContext === "__stage__" ? "Stage" : currentSpriteContext || "project";
    a.download = `${name}.sp`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
    updateStatus(`Exported ${name}.sp`);
  }
  function loadExample(name) {
    if (!monacoEditor) return;
    let code = "";
    if (name === "hello-world") {
      code = `// Hello World
// A basic script: say hello when the flag is clicked.

on flag {
    say("Hello, World!")
    wait(2)
    say("I'm a Scratch sprite!")
    wait(2)
    say("")
}
`;
    } else if (name === "chase-mouse") {
      code = `// Chase Mouse
// Point towards mouse and move forever

on flag {
    forever {
        point_towards("_mouse_")
        move(5)
    }
}
`;
    } else if (name === "bounce-loop") {
      code = `// Bounce Loop
// Move and bounce off edges forever

on flag {
    forever {
        move(10)
        if_on_edge_bounce()
    }
}
`;
    }
    if (code) {
      monacoEditor.setValue(code);
      updateStatus(`Loaded example: ${name}`);
    }
  }
  function populateSpriteDropdown() {
    renderSidebarSprites();
  }
  function openOverlay() {
    const overlay = document.getElementById("scratchpiler-overlay");
    overlay.style.display = "flex";
    overlayVisible = true;
    renderSidebarSprites();
    if (!currentSpriteContext) {
      currentSpriteContext = "__stage__";
    }
    selectSidebarSprite(currentSpriteContext);
    const trigger = document.getElementById("scratchpiler-trigger");
    if (trigger) trigger.style.display = "none";
    if (monacoEditor) {
      monacoEditor.layout();
      monacoEditor.focus();
    }
  }
  function closeOverlay() {
    saveToLocalStorage(currentSpriteContext);
    document.getElementById("scratchpiler-overlay").style.display = "none";
    overlayVisible = false;
    const trigger = document.getElementById("scratchpiler-trigger");
    if (trigger) trigger.style.display = "";
  }
  function toggleOverlay() {
    if (overlayVisible) closeOverlay();
    else openOverlay();
  }
  function startDebugPoll(vm) {
    if (debugPollInterval) return;
    debugPollInterval = setInterval(() => {
      const bar = document.getElementById("sp-debug-bar");
      if (!bar) return;
      if (!overlayVisible) {
        bar.style.display = "none";
        return;
      }
      const stage = vm.runtime.targets.find((t) => t.isStage);
      if (!stage) return;
      const atV = Object.values(stage.variables).find((v) => v.name === "__dbg_at__");
      bar.style.display = atV && atV.value == 1 ? "flex" : "none";
    }, 100);
  }
  function resumeDebugger() {
    if (!currentVM) return;
    const stage = currentVM.runtime.targets.find((t) => t.isStage);
    if (!stage) return;
    const resumeV = Object.values(stage.variables).find((v) => v.name === "__dbg_resume__");
    if (resumeV) resumeV.value = 1;
  }
  function registerHotkeys() {
    document.addEventListener("keydown", (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyM") {
        e.preventDefault();
        e.stopPropagation();
        toggleOverlay();
      } else if (e.key === "Escape" && spPickerOpen) {
        e.preventDefault();
        e.stopPropagation();
        closeSpritePicker();
      } else if (e.key === "Escape" && searchNowhereOpen) {
        e.preventDefault();
        e.stopPropagation();
        closeSearchNowhere();
      } else if (e.key === "Escape" && overlayVisible) {
        e.preventDefault();
        e.stopPropagation();
        closeOverlay();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "Enter" || e.key === "s") && overlayVisible) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById("scratchpiler-compile-btn").click();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "p" && overlayVisible) {
        e.preventDefault();
        e.stopPropagation();
        if (spPickerOpen) closeSpritePicker();
        else openSpritePicker();
      }
    }, true);
    let _snLastShift = 0;
    document.addEventListener("keyup", (e) => {
      if (e.key === "Shift" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const now = Date.now();
        if (now - _snLastShift < 400) {
          _snLastShift = 0;
          if (searchNowhereOpen) closeSearchNowhere();
          else openSearchNowhere();
        } else {
          _snLastShift = now;
        }
      }
    }, true);
  }
  var spSettings = {
    tabSize: 4,
    autosave: 1e3,
    lintTypecheck: true,
    lintUnreachable: true,
    lintOrphaned: true
  };
  var saveTimer = null;
  var lintTimer = null;
  var injectedBlockIds2 = /* @__PURE__ */ new Map();
  var currentSpriteContext = null;
  function saveToLocalStorage(spriteName) {
    if (!monacoEditor) return;
    const key = spriteName ? `scratchpiler-content-${spriteName}` : LS_KEY;
    const val = monacoEditor.getValue();
    if (!val || !val.trim()) return;
    try {
      localStorage.setItem(key, val);
    } catch {
    }
  }
  function loadFromLocalStorage(spriteName) {
    if (!monacoEditor) return;
    const key = spriteName ? `scratchpiler-content-${spriteName}` : LS_KEY;
    try {
      const v = localStorage.getItem(key);
      if (v !== null && v.trim() !== "") {
        monacoEditor.setValue(v);
      } else {
        if (currentVM) {
          try {
            const code = decompile(currentVM, spriteName);
            monacoEditor.setValue(code);
            updateStatus(`Decompiled "${spriteName === "__stage__" ? "Stage" : spriteName}"`);
          } catch (e) {
            monacoEditor.setValue("");
            console.warn("[scratchpiler] decompile failed for", spriteName, e);
          }
        } else {
          monacoEditor.setValue("");
        }
      }
    } catch (e) {
      monacoEditor.setValue("");
    }
  }
  function updateStatus(text) {
    const el = document.getElementById("scratchpiler-status");
    if (!el) return;
    let prefix = "> ";
    if (/^(error|warning)/i.test(text)) prefix = "! ";
    else if (/^(injected|imported|index:|created)/i.test(text)) prefix = "\u2713 ";
    el.textContent = prefix + text;
  }
  var activeMenu = null;
  var activeContextMenu = null;
  var dialogCallback = null;
  function showContextMenu(items, x, y) {
    if (activeContextMenu && activeContextMenu.parentNode) activeContextMenu.remove();
    const overlay = document.getElementById("scratchpiler-overlay");
    if (!overlay) return;
    const dropdown = document.createElement("div");
    dropdown.className = "sp-dropdown sp-context-menu";
    dropdown.style.left = x + "px";
    dropdown.style.top = y + "px";
    for (const item of items) {
      if (item === "-") {
        const sep = document.createElement("div");
        sep.className = "sp-dropdown-sep";
        dropdown.appendChild(sep);
      } else {
        const el = document.createElement("button");
        el.className = "sp-dropdown-item";
        el.textContent = item.label;
        if (item.danger) el.style.color = "#ff7070";
        el.addEventListener("click", () => {
          closeContextMenu();
          item.action();
        });
        dropdown.appendChild(el);
      }
    }
    overlay.appendChild(dropdown);
    activeContextMenu = dropdown;
    setTimeout(() => {
      const onOutside = (e) => {
        if (!dropdown.contains(e.target)) {
          closeContextMenu();
          document.removeEventListener("mousedown", onOutside);
        }
      };
      document.addEventListener("mousedown", onOutside);
    }, 0);
  }
  function closeContextMenu() {
    if (activeContextMenu && activeContextMenu.parentNode) activeContextMenu.remove();
    activeContextMenu = null;
  }
  function doDeleteVariable(varId) {
    if (!currentVM) {
      updateStatus("Error: VM not available");
      return;
    }
    let target = null;
    for (const t of currentVM.runtime.targets) {
      if (t.variables[varId]) {
        target = t;
        break;
      }
    }
    if (!target || !target.variables[varId]) {
      updateStatus("Error: variable not found");
      return;
    }
    const varName = target.variables[varId].name;
    if (typeof target.deleteVariable === "function") {
      target.deleteVariable(varId);
    } else {
      delete target.variables[varId];
    }
    reindex(currentVM);
    updateSpriteDetails(currentSpriteContext);
    updateStatus(`Deleted "${varName}"`);
  }
  function openRenameDialog(v) {
    const dialog = document.getElementById("scratchpiler-dialog");
    if (!dialog) return;
    document.getElementById("scratchpiler-dialog-title").textContent = `Rename "${v.name}"`;
    const okBtn = document.getElementById("scratchpiler-dialog-ok");
    if (okBtn) okBtn.textContent = "Rename";
    const input = document.getElementById("scratchpiler-dialog-input");
    input.value = v.name;
    dialog.style.display = "flex";
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
    dialogCallback = (newName) => {
      dialog.style.display = "none";
      dialogCallback = null;
      if (okBtn) okBtn.textContent = "Create";
      if (!newName || !newName.trim()) return;
      newName = newName.trim();
      if (!currentVM) {
        updateStatus("Error: VM not available");
        return;
      }
      let target = null;
      for (const t of currentVM.runtime.targets) {
        if (t.variables[v.id]) {
          target = t;
          break;
        }
      }
      if (!target) {
        updateStatus("Error: variable not found");
        return;
      }
      const oldName = target.variables[v.id].name;
      target.variables[v.id].name = newName;
      for (const t of currentVM.runtime.targets) {
        for (const block of Object.values(t.blocks._blocks || {})) {
          for (const field of Object.values(block.fields || {})) {
            if (field.id === v.id) field.value = newName;
          }
        }
      }
      reindex(currentVM);
      updateSpriteDetails(currentSpriteContext);
      updateStatus(`Renamed "${oldName}" \u2192 "${newName}"`);
    };
  }
  function openInitListDialog(v) {
    const dialog = document.getElementById("scratchpiler-dialog");
    if (!dialog) return;
    document.getElementById("scratchpiler-dialog-title").textContent = `Initialize [${v.name}] (comma-separated)`;
    const okBtn = document.getElementById("scratchpiler-dialog-ok");
    if (okBtn) okBtn.textContent = "Set";
    const input = document.getElementById("scratchpiler-dialog-input");
    input.value = "";
    input.placeholder = "e.g. 1, 2, 3";
    dialog.style.display = "flex";
    setTimeout(() => input.focus(), 0);
    dialogCallback = (csv) => {
      dialog.style.display = "none";
      dialogCallback = null;
      if (okBtn) okBtn.textContent = "Create";
      input.placeholder = "";
      if (!currentVM) return;
      let target = null;
      for (const t of currentVM.runtime.targets) {
        if (t.variables[v.id]) {
          target = t;
          break;
        }
      }
      if (!target) return;
      const items = (csv || "").split(",").map((s) => s.trim()).filter((s) => s !== "");
      target.variables[v.id].value = items;
      updateStatus(`Initialized [${v.name}] with ${items.length} item(s)`);
    };
  }
  function openMenu(btnId, items) {
    closeMenu();
    const btn = document.getElementById(btnId);
    const bar = document.getElementById("scratchpiler-menubar");
    if (!btn || !bar) return;
    btn.classList.add("sp-menu-active");
    const dropdown = document.createElement("div");
    dropdown.className = "sp-dropdown";
    dropdown.style.left = btn.offsetLeft + "px";
    for (const item of items) {
      if (item === "-") {
        const sep = document.createElement("div");
        sep.className = "sp-dropdown-sep";
        dropdown.appendChild(sep);
      } else {
        const el = document.createElement("button");
        el.className = "sp-dropdown-item";
        el.textContent = item.label;
        el.addEventListener("click", () => {
          closeMenu();
          item.action();
        });
        dropdown.appendChild(el);
      }
    }
    bar.appendChild(dropdown);
    activeMenu = { btnId, dropdown };
    setTimeout(() => {
      const onOutside = (e) => {
        if (!dropdown.contains(e.target) && e.target.id !== btnId) {
          closeMenu();
          document.removeEventListener("mousedown", onOutside);
        }
      };
      document.addEventListener("mousedown", onOutside);
    }, 0);
  }
  function closeMenu() {
    if (!activeMenu) return;
    const btn = document.getElementById(activeMenu.btnId);
    if (btn) btn.classList.remove("sp-menu-active");
    if (activeMenu.dropdown.parentNode) activeMenu.dropdown.remove();
    activeMenu = null;
  }
  function showCreateDialog(title, onConfirm) {
    const dialog = document.getElementById("scratchpiler-dialog");
    if (!dialog) return;
    document.getElementById("scratchpiler-dialog-title").textContent = title;
    const input = document.getElementById("scratchpiler-dialog-input");
    input.value = "";
    dialog.style.display = "flex";
    setTimeout(() => input.focus(), 0);
    dialogCallback = (name) => {
      dialog.style.display = "none";
      dialogCallback = null;
      if (name && name.trim()) onConfirm(name.trim());
    };
  }
  function doCreateVariable(name, isGlobal, isList) {
    if (!currentVM) {
      updateStatus("Error: VM not available");
      return;
    }
    const spriteName = currentSpriteContext;
    const stage = currentVM.runtime.targets.find((t) => t.isStage);
    const target = isGlobal || spriteName === "__stage__" ? stage : currentVM.runtime.targets.find((t) => !t.isStage && t.sprite.name === spriteName);
    if (!target) {
      updateStatus("Error: target not found");
      return;
    }
    const varType = isList ? "list" : "";
    const existing = Object.values(target.variables).find((v) => v.name === name && v.type === varType);
    if (existing) {
      updateStatus(`Error: ${isList ? "list" : "variable"} "${name}" already exists`);
      return;
    }
    target.createVariable(uid(), name, varType);
    reindex(currentVM);
    const scope = isGlobal || spriteName === "__stage__" ? "global" : "local";
    updateStatus(`Created ${scope} ${isList ? "list" : "variable"} "${name}"`);
  }
  function bootstrap() {
    buildOverlayDOM();
    buildTriggerButton();
    buildSearchNowhereDOM();
    registerHotkeys();
    document.getElementById("scratchpiler-close-btn").addEventListener("click", closeOverlay);
    document.getElementById("sp-debug-resume-btn").addEventListener("click", resumeDebugger);
    document.getElementById("sp-menu-file").addEventListener("click", () => {
      openMenu("sp-menu-file", [
        { label: "Import from active sprite", action: () => document.getElementById("scratchpiler-import-btn").click() },
        { label: "Compile & Inject (Ctrl+Enter)", action: () => document.getElementById("scratchpiler-compile-btn").click() },
        "-",
        { label: "Open .sp file...", action: () => importFromLocalFile() },
        { label: "Save as .sp file...", action: () => exportToLocalFile() },
        "-",
        { label: "Clear Editor", action: () => {
          if (confirm("Clear all editor content?")) monacoEditor.setValue("");
        } }
      ]);
    });
    document.getElementById("sp-menu-edit").addEventListener("click", () => {
      openMenu("sp-menu-edit", [
        { label: "Format Document", action: () => monacoEditor.getAction("editor.action.formatDocument").run() },
        { label: "Find & Replace", action: () => {
          const searchBtn = document.getElementById("sp-activity-search");
          if (searchBtn) {
            const sidebar = document.getElementById("scratchpiler-sidebar");
            const panels = {
              explorer: document.getElementById("sp-panel-explorer"),
              search: document.getElementById("sp-panel-search"),
              settings: document.getElementById("sp-panel-settings"),
              fixes: document.getElementById("sp-panel-fixes")
            };
            const buttons = {
              explorer: document.getElementById("sp-activity-explorer"),
              search: searchBtn,
              settings: document.getElementById("sp-activity-settings"),
              fixes: document.getElementById("sp-activity-fixes")
            };
            sidebar.style.display = "flex";
            sidebarExpanded2 = true;
            document.getElementById("scratchpiler-sidebar-title").textContent = "Search";
            Object.keys(buttons).forEach((k) => {
              if (k === "search") buttons[k].classList.add("sp-active");
              else buttons[k].classList.remove("sp-active");
            });
            Object.keys(panels).forEach((k) => {
              if (k === "search") panels[k].classList.add("active");
              else panels[k].classList.remove("active");
            });
            currentActiveTab = "search";
            if (monacoEditor) monacoEditor.layout();
          }
          const searchInput = document.getElementById("scratchpiler-search-input");
          if (searchInput) searchInput.focus();
        } },
        "-",
        { label: "Toggle Line Wrap", action: () => {
          const wrapChk = document.getElementById("sp-setting-wrap");
          if (wrapChk) {
            wrapChk.checked = !wrapChk.checked;
            wrapChk.dispatchEvent(new Event("change"));
          }
        } },
        { label: "Toggle Minimap", action: () => {
          const miniChk = document.getElementById("sp-setting-minimap");
          if (miniChk) {
            miniChk.checked = !miniChk.checked;
            miniChk.dispatchEvent(new Event("change"));
          }
        } }
      ]);
    });
    document.getElementById("sp-menu-variables").addEventListener("click", () => {
      openMenu("sp-menu-variables", [
        { label: "New global variable\u2026", action: () => showCreateDialog("New Global Variable", (n) => doCreateVariable(n, true, false)) },
        { label: "New local variable\u2026", action: () => showCreateDialog("New Local Variable", (n) => doCreateVariable(n, false, false)) },
        "-",
        { label: "Rename / Delete\u2026", action: () => {
          const actExplorer = document.getElementById("sp-activity-explorer");
          if (actExplorer) actExplorer.click();
          updateStatus("Right-click a variable in the sidebar to rename or delete it");
        } }
      ]);
    });
    document.getElementById("sp-menu-lists").addEventListener("click", () => {
      openMenu("sp-menu-lists", [
        { label: "New global list\u2026", action: () => showCreateDialog("New Global List", (n) => doCreateVariable(n, true, true)) },
        { label: "New local list\u2026", action: () => showCreateDialog("New Local List", (n) => doCreateVariable(n, false, true)) },
        "-",
        { label: "Rename / Delete / Initialize\u2026", action: () => {
          const actExplorer = document.getElementById("sp-activity-explorer");
          if (actExplorer) actExplorer.click();
          updateStatus("Click \u22EE on a list in the sidebar to rename, delete, or initialize it");
        } }
      ]);
    });
    document.getElementById("sp-menu-help").addEventListener("click", () => {
      openMenu("sp-menu-help", [
        { label: "GitHub Repository", action: () => window.open("https://www.github.com/Earth1283/scratchpiler/", "_blank") },
        "-",
        { label: "Load Example: Hello World", action: () => loadExample("hello-world") },
        { label: "Load Example: Chase Mouse", action: () => loadExample("chase-mouse") },
        { label: "Load Example: Bounce Loop", action: () => loadExample("bounce-loop") }
      ]);
    });
    setupActivityBar();
    setupOutputPanel();
    setupSpritePicker();
    setupSidebarResize();
    const confirmDialog = () => {
      if (dialogCallback) dialogCallback(document.getElementById("scratchpiler-dialog-input").value);
    };
    document.getElementById("scratchpiler-dialog-cancel").addEventListener("click", () => {
      document.getElementById("scratchpiler-dialog").style.display = "none";
      dialogCallback = null;
    });
    document.getElementById("scratchpiler-dialog-ok").addEventListener("click", confirmDialog);
    document.getElementById("scratchpiler-dialog-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirmDialog();
      else if (e.key === "Escape") {
        document.getElementById("scratchpiler-dialog").style.display = "none";
        dialogCallback = null;
      }
    });
    document.getElementById("scratchpiler-import-btn").addEventListener("click", () => {
      if (!currentVM) {
        updateStatus("Error: VM not available");
        return;
      }
      const spriteName = currentSpriteContext;
      updateStatus("Importing...");
      try {
        const code = decompile(currentVM, spriteName);
        monacoEditor.setValue(code);
        monacoEditor.setScrollPosition({ scrollTop: 0 });
        updateStatus(`Imported from "${spriteName}"`);
      } catch (e) {
        updateStatus("Import error: " + e.message);
        console.error("[scratchpiler] import exception", e);
      }
    });
    loadMonaco(function(monaco2) {
      registerLanguage(monaco2);
      monacoEditor = monaco2.editor.create(
        document.getElementById("scratchpiler-editor-container"),
        {
          value: "",
          language: LANG_ID,
          theme: "scratchpiler-dark",
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: "on",
          wordWrap: "on",
          scrollBeyondLastLine: false,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          tabCompletion: "on",
          smoothScrolling: true,
          cursorSmoothCaretAnimation: "on",
          cursorBlinking: "smooth",
          stickyScroll: { enabled: true }
        }
      );
      monacoEditor.onDidChangeCursorPosition((e) => {
        updateStatusBarCursor(e.position.lineNumber, e.position.column);
      });
      applySettingsFn = setupSettings();
      if (applySettingsFn) applySettingsFn();
      monacoEditor.addCommand(monaco2.KeyMod.CtrlCmd | monaco2.KeyCode.Enter, () => {
        document.getElementById("scratchpiler-compile-btn").click();
      });
      document.getElementById("scratchpiler-format-btn").addEventListener("click", () => {
        monacoEditor.getAction("editor.action.formatDocument").run();
      });
      monacoEditor.onDidChangeModelContent(() => {
        clearTimeout(saveTimer);
        clearTimeout(lintTimer);
        const saveDelay = isFinite(spSettings.autosave) ? spSettings.autosave : 1e3;
        if (saveDelay === 0) {
          saveToLocalStorage(currentSpriteContext);
        } else {
          saveTimer = setTimeout(() => saveToLocalStorage(currentSpriteContext), saveDelay);
        }
        lintTimer = setTimeout(() => {
          const src = monacoEditor.getValue();
          try {
            const toks = tokenize(src);
            const { ast, errors } = parse(toks);
            const model = monacoEditor.getModel();
            const sn = currentSpriteContext;
            const rawLint = lint(ast);
            const lintWarnings = rawLint.filter((w) => {
              const msg = w.message || "";
              if (!spSettings.lintUnreachable && msg.startsWith("Unreachable")) return false;
              if (!spSettings.lintOrphaned && msg.startsWith("Orphaned")) return false;
              return true;
            });
            const typeWarnings = spSettings.lintTypecheck ? typeCheckDiagnostics(ast, sn) : [];
            monaco2.editor.setModelMarkers(model, LANG_ID, [
              ...errors.map((er) => ({
                startLineNumber: er.line,
                startColumn: er.col,
                endLineNumber: er.line,
                endColumn: er.col + (er.len || 1),
                message: er.message,
                severity: monaco2.MarkerSeverity.Error
              })),
              ...lintWarnings.map((w) => ({
                startLineNumber: w.line,
                startColumn: w.col,
                endLineNumber: w.line,
                endColumn: model.getLineMaxColumn(w.line),
                message: w.message,
                severity: monaco2.MarkerSeverity.Warning
              })),
              ...typeWarnings.map((w) => ({
                startLineNumber: w.line,
                startColumn: w.col,
                endLineNumber: w.line,
                endColumn: w.col + (w.len || 1),
                message: w.message,
                severity: monaco2.MarkerSeverity.Warning
              }))
            ]);
            updateStatusBarProblems(errors.length, lintWarnings.length + typeWarnings.length);
          } catch (_) {
          }
        }, 350);
      });
      document.getElementById("scratchpiler-compile-btn").addEventListener("click", () => {
        if (!currentVM) {
          updateStatus("Error: VM not available");
          return;
        }
        const spriteName = currentSpriteContext;
        const source = monacoEditor.getValue();
        updateStatus("Compiling...");
        let result;
        try {
          result = compileSource(source, currentVM, spriteName);
        } catch (e) {
          updateStatus("Compile error: " + e.message);
          logToOutput("Compile error: " + e.message, "error");
          flashCompileBtn(false);
          console.error("[scratchpiler] compile exception", e);
          return;
        }
        monaco2.editor.setModelMarkers(
          monacoEditor.getModel(),
          LANG_ID,
          result.errors.map((e) => ({
            startLineNumber: e.line,
            startColumn: e.col,
            endLineNumber: e.line,
            endColumn: e.col + (e.len || 1),
            message: e.message,
            severity: monaco2.MarkerSeverity.Error
          }))
        );
        if (result.errors.length > 0) {
          const msg = `${result.errors.length} error(s) \u2014 not injected`;
          updateStatus(msg);
          result.errors.forEach((er) => logToOutput(`Line ${er.line}:${er.col} \u2014 ${er.message}`, "error"));
          flashCompileBtn(false);
          return;
        }
        injectBlocks(result.blocks, currentVM, spriteName);
        flashCompileBtn(true);
        const blockCount = Object.keys(result.blocks).length;
        const label = spriteName === "__stage__" ? "Stage" : spriteName;
        logToOutput(`Compiled & injected ${blockCount} block(s) into "${label}"`, "ok");
      });
      document.getElementById("sp-sb-problems")?.addEventListener("click", () => {
        const panel = document.getElementById("sp-output-panel");
        const toggleBtn = document.getElementById("sp-output-toggle-btn");
        if (!panel) return;
        panel.classList.add("sp-expanded");
        if (toggleBtn) toggleBtn.textContent = "\u25BE";
        if (monacoEditor) setTimeout(() => monacoEditor.layout(), 160);
      });
      acquireVM(
        (vm) => {
          currentVM = vm;
          updateStatusBarVM("ok");
          reindex(vm);
          startDebugPoll(vm);
          vm.on("targetsUpdate", () => {
            reindex(vm);
            if (overlayVisible) populateSpriteDropdown();
          });
          vm.runtime.on("PROJECT_LOADED", () => {
            const injectedKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.startsWith(`${LS_INJ_KEY}-`)) injectedKeys.push(k);
            }
            injectedKeys.forEach((k) => localStorage.removeItem(k));
            injectedBlockIds2.clear();
            reindex(vm);
          });
          if (overlayVisible && currentSpriteContext) {
            renderSidebarSprites();
            selectSidebarSprite(currentSpriteContext);
          }
        },
        () => {
          updateStatus("Warning: VM not found after 15s");
          updateStatusBarVM("error");
        }
      );
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }

  // src/compiler.js
  var TT = {
    NUM: "NUM",
    STR: "STR",
    IDENT: "IDENT",
    VAR: "VAR",
    LBRACE: "{",
    RBRACE: "}",
    LPAREN: "(",
    RPAREN: ")",
    COMMA: ",",
    COLON: ":",
    HASH: "#",
    HEX: "HEX",
    DOT: ".",
    LT: "<",
    GT: ">",
    EQ: "=",
    PLUS: "+",
    MINUS: "-",
    STAR: "*",
    SLASH: "/",
    EOF: "EOF"
  };
  var KW_SET = new Set(KEYWORDS);
  function tokenize(src) {
    const tokens = [];
    let i = 0, line = 1, col = 1;
    function advance() {
      const c = src[i++];
      if (c === "\n") {
        line++;
        col = 1;
      } else col++;
      return c;
    }
    while (i < src.length) {
      if (/\s/.test(src[i])) {
        advance();
        continue;
      }
      if (src[i] === "/" && src[i + 1] === "/") {
        while (i < src.length && src[i] !== "\n") i++;
        continue;
      }
      const startLine = line, startCol = col;
      const c = src[i];
      if (c === '"') {
        advance();
        let s = "";
        while (i < src.length && src[i] !== '"') s += advance();
        if (src[i] === '"') advance();
        tokens.push({ type: TT.STR, value: s, line: startLine, col: startCol });
        continue;
      }
      if (c === "[") {
        advance();
        let s = "";
        while (i < src.length && src[i] !== "]") s += advance();
        if (src[i] === "]") advance();
        tokens.push({ type: TT.VAR, value: s.trim(), line: startLine, col: startCol });
        continue;
      }
      if (/[0-9]/.test(c) || c === "." && /[0-9]/.test(src[i + 1])) {
        let s = "";
        while (i < src.length && /[0-9.]/.test(src[i])) s += advance();
        tokens.push({ type: TT.NUM, value: parseFloat(s), line: startLine, col: startCol });
        continue;
      }
      if (/[a-zA-Z_]/.test(c)) {
        let s = "";
        while (i < src.length && /[\w]/.test(src[i])) s += advance();
        tokens.push({ type: KW_SET.has(s) ? s : TT.IDENT, value: s, line: startLine, col: startCol });
        continue;
      }
      if (c === "#") {
        const hex6 = src.slice(i + 1, i + 7);
        if (/^[0-9a-fA-F]{6}$/.test(hex6)) {
          advance();
          for (let h = 0; h < 6; h++) advance();
          tokens.push({ type: TT.HEX, value: "#" + hex6, line: startLine, col: startCol });
          continue;
        }
      }
      const SINGLE = {
        "{": TT.LBRACE,
        "}": TT.RBRACE,
        "(": TT.LPAREN,
        ")": TT.RPAREN,
        ",": TT.COMMA,
        ":": TT.COLON,
        "<": TT.LT,
        ">": TT.GT,
        "=": TT.EQ,
        "+": TT.PLUS,
        "-": TT.MINUS,
        "*": TT.STAR,
        "/": TT.SLASH,
        "#": TT.HASH,
        ".": TT.DOT
      };
      if (SINGLE[c]) {
        advance();
        tokens.push({ type: SINGLE[c], value: c, line: startLine, col: startCol });
        continue;
      }
      console.warn(`[scratchpiler] unexpected char: ${c} at ${line}:${col}`);
      advance();
    }
    tokens.push({ type: TT.EOF, value: "", line, col });
    return tokens;
  }
  var TOKEN_NAMES = {
    "(": "`(`",
    ")": "`)`",
    "{": "`{`",
    "}": "`}`",
    ",": "`,`",
    ":": "`:`",
    NUM: "a number",
    STR: 'a string (e.g. "hello")',
    VAR: "a variable (e.g. [score])",
    IDENT: "an identifier",
    EOF: "end of file"
  };
  var CALL_SIGS = {
    move: "move(steps)",
    turnRight: "turnRight(degrees)",
    turnLeft: "turnLeft(degrees)",
    goTo: 'goTo(x, y)  or  goTo("sprite")',
    glide: "glide(secs, x, y)",
    bounce: "bounce()",
    setX: "setX(x)",
    setY: "setY(y)",
    changeX: "changeX(dx)",
    changeY: "changeY(dy)",
    say: "say(message)",
    sayFor: "sayFor(message, secs)",
    think: "think(message)",
    thinkFor: "thinkFor(message, secs)",
    switchCostume: 'switchCostume("name")',
    switchBackdrop: 'switchBackdrop("name")',
    nextCostume: "nextCostume()",
    nextBackdrop: "nextBackdrop()",
    setSize: "setSize(percent)",
    changeSize: "changeSize(amount)",
    show: "show()",
    hide: "hide()",
    clearEffects: "clearEffects()",
    play: 'play("sound")',
    playUntilDone: 'playUntilDone("sound")',
    stopSounds: "stopSounds()",
    broadcast: 'broadcast("message")',
    broadcastAndWait: 'broadcastAndWait("message")',
    wait: "wait(secs)",
    stopAll: "stopAll()",
    stopThis: "stopThis()",
    stopOtherScripts: "stopOtherScripts()",
    createClone: 'createClone()  or  createClone("sprite")',
    deleteClone: "deleteClone()",
    showVariable: "showVariable([var])",
    hideVariable: "hideVariable([var])",
    showList: "showList([list])",
    hideList: "hideList([list])",
    listAdd: "listAdd(item, [list])",
    listDelete: "listDelete(index, [list])",
    listInsert: "listInsert(item, index, [list])",
    listReplace: "listReplace(index, [list], item)",
    // Operators / string
    random: "random(min, max)",
    join: "join(str1, str2)",
    letterOf: "letterOf(index, string)",
    contains: "contains(string, substring)",
    clamp: "clamp(value, min, max)",
    // Motion extras
    setDirection: "setDirection(degrees)",
    turnTo: "turnTo(degrees)  \u2014 point in absolute direction",
    pointTowards: 'pointTowards("sprite" | "_mouse_")',
    distanceTo: 'distanceTo("sprite" | "_mouse_")',
    // Looks effects
    setEffect: 'setEffect("color", value)',
    changeEffect: 'changeEffect("color", amount)',
    goToFront: "goToFront()",
    goToBack: "goToBack()",
    moveForward: "moveForward(layers)",
    moveBackward: "moveBackward(layers)",
    // Sound
    setVolume: "setVolume(percent)",
    changeVolume: "changeVolume(amount)",
    // Sensing
    askAndWait: "askAndWait(question)",
    resetTimer: "resetTimer()",
    currentTime: 'currentTime("hour" | "minute" | "second" | "year" | "month" | "date" | "day")',
    // Sensing of other sprites
    xOf: 'xOf("sprite")',
    yOf: 'yOf("sprite")',
    directionOf: 'directionOf("sprite")',
    costumeNumOf: 'costumeNumOf("sprite")',
    costumeNameOf: 'costumeNameOf("sprite")',
    sizeOf: 'sizeOf("sprite")',
    volumeOf: 'volumeOf("sprite")',
    // Sugar
    yield: "yield()",
    // New v1.0 blocks
    listDeleteAll: "listDeleteAll([list])",
    setRotationStyle: `setRotationStyle("all around" | "left-right" | "don't rotate")`,
    switchBackdropAndWait: 'switchBackdropAndWait("name")',
    setSoundEffect: 'setSoundEffect("PITCH" | "PAN LEFT/RIGHT", value)',
    changeSoundEffect: 'changeSoundEffect("PITCH" | "PAN LEFT/RIGHT", amount)',
    clearSoundEffects: "clearSoundEffects()",
    setDragMode: 'setDragMode("draggable" | "not draggable")',
    // pyfor
    pyfor: "pyfor [iterator] in [list] { \u2026 }",
    // Ergonomic aliases
    print: "print(message)  \u2014 alias for say()",
    println: "println(message)  \u2014 alias for say()",
    step: "step(steps)  \u2014 alias for move()",
    forward: "forward(steps)  \u2014 alias for move()",
    left: "left(degrees)  \u2014 alias for turnLeft()",
    right: "right(degrees)  \u2014 alias for turnRight()",
    front: "front()  \u2014 alias for goToFront()",
    back: "back()  \u2014 alias for goToBack()",
    clone: 'clone()  \u2014 alias for createClone("_myself_")',
    stopMe: "stopMe()  \u2014 alias for stopThis()",
    ask: 'ask("question")  \u2014 alias for askAndWait()',
    send: 'send("message")  \u2014 alias for broadcast()',
    sendAndWait: 'sendAndWait("message")  \u2014 alias for broadcastAndWait()',
    append: "append([list], value)  \u2014 alias for listAdd",
    push: "push([list], value)  \u2014 alias for listAdd",
    remove: "remove([list], index)  \u2014 alias for listDelete",
    insert: "insert([list], index, value)  \u2014 alias for listInsert",
    replace: "replace([list], index, value)  \u2014 alias for listReplace",
    clear: "clear([list])  \u2014 alias for listDeleteAll",
    pop: "pop([list])  \u2014 alias for listDeleteAll",
    // Math / trig
    abs: "abs(n)",
    round: "round(n)",
    sqrt: "sqrt(n)",
    floor: "floor(n)",
    ceiling: "ceiling(n)",
    ceil: "ceil(n)",
    sin: "sin(degrees)",
    cos: "cos(degrees)",
    tan: "tan(degrees)",
    asin: "asin(n)",
    acos: "acos(n)",
    atan: "atan(n)",
    ln: "ln(n)",
    log: "log(n)",
    exp: "exp(n)",
    pow10: "pow10(n)",
    // Scratchroutines
    scratchroutine: "scratchroutine name(params) { \u2026 }",
    launch: "launch name(args)  \u2014 fire and forget",
    await: "await name(args)   \u2014 block until done",
    cancel: "cancel name        \u2014 set cancel flag",
    isRunning: "isRunning(name)    \u2014 boolean: currently running?",
    checkCancel: "checkCancel()      \u2014 stop this script if cancelled"
  };
  function parse(tokens) {
    let pos = 0;
    let callCtx = "";
    const errors = [];
    function peek() {
      return tokens[pos];
    }
    function peekType() {
      return tokens[pos].type;
    }
    function tok(t) {
      if (t.type === TT.EOF) return "end of file";
      if (t.type === TT.STR) return `string "${t.value}"`;
      if (t.type === TT.NUM) return `number ${t.value}`;
      if (t.type === TT.VAR) return `[${t.value}]`;
      return `"${t.value}"`;
    }
    function eat(type, ctx) {
      if (tokens[pos].type === type) return tokens[pos++];
      const t = tokens[pos];
      const expected = TOKEN_NAMES[type] || `"${type}"`;
      const where = ctx || callCtx;
      const msg = where ? `${where} \u2014 expected ${expected}, got ${tok(t)}` : `Expected ${expected}, got ${tok(t)}`;
      errors.push({ line: t.line, col: t.col, len: Math.max(t.value.length, 1), message: msg });
      return t;
    }
    function check(type) {
      return tokens[pos].type === type;
    }
    function checkV(val) {
      return tokens[pos].value === val;
    }
    function tryEat(type) {
      if (check(type)) {
        pos++;
        return true;
      }
      return false;
    }
    function tryEatV(val) {
      if (checkV(val)) {
        pos++;
        return true;
      }
      return false;
    }
    function parseScript() {
      const blocks = [];
      while (!check(TT.EOF)) {
        if (checkV("on") || checkV("define")) {
          blocks.push(parseHatBlock());
        } else if (checkV("scratchroutine")) {
          blocks.push(parseScratchroutine());
        } else if (checkV("struct")) {
          blocks.push(parseStruct());
        } else if (check(TT.LBRACE)) {
          const t = peek();
          const body = parseBody();
          blocks.push({ type: "OrphanedBlock", body, line: t.line, col: t.col });
        } else {
          blocks.push(parseStatement());
        }
      }
      return { type: "Script", blocks };
    }
    function parseHatBlock() {
      if (checkV("define")) {
        pos++;
        const nameT = peek();
        pos++;
        eat(TT.LPAREN, "`define name(params)`: expected `(` after the block name");
        const params = [];
        while (!check(TT.RPAREN) && !check(TT.EOF)) {
          params.push(peek().value);
          pos++;
          if (!tryEat(TT.COMMA)) break;
        }
        eat(TT.RPAREN, "`define name(params)`: expected `)` to close the parameter list");
        const body2 = parseBody();
        return {
          type: "DefineBlock",
          name: nameT.value,
          params,
          body: body2,
          line: nameT.line,
          col: nameT.col
        };
      }
      pos++;
      const hat = parseHatArg();
      const body = parseBody();
      return { type: "OnBlock", hat, body, line: hat.line, col: hat.col };
    }
    function parseHatArg() {
      const t = peek();
      if (checkV("flag")) {
        pos++;
        return { event: "flag", line: t.line, col: t.col };
      }
      if (checkV("click")) {
        pos++;
        return { event: "click", line: t.line, col: t.col };
      }
      if (checkV("clone")) {
        pos++;
        return { event: "clone", line: t.line, col: t.col };
      }
      if (checkV("key")) {
        pos++;
        const key = eat(TT.STR, '`on key "..."`: expected a quoted key name, e.g. `on key "space"`').value;
        return { event: "key", key, line: t.line, col: t.col };
      }
      if (checkV("receive")) {
        pos++;
        const msg = eat(TT.STR, '`on receive "..."`: expected a quoted message name').value;
        return { event: "receive", msg, line: t.line, col: t.col };
      }
      if (checkV("backdrop")) {
        pos++;
        const bg = eat(TT.STR, '`on backdrop "..."`: expected a quoted backdrop name').value;
        return { event: "backdrop", backdrop: bg, line: t.line, col: t.col };
      }
      if (checkV("timer")) {
        pos++;
        eat(TT.GT, "`on timer > n`: expected `>` after `timer`");
        const threshold = parseExpr();
        return { event: "greaterThan", sense: "TIMER", threshold, line: t.line, col: t.col };
      }
      if (checkV("loudness")) {
        pos++;
        eat(TT.GT, "`on loudness > n`: expected `>` after `loudness`");
        const threshold = parseExpr();
        return { event: "greaterThan", sense: "LOUDNESS", threshold, line: t.line, col: t.col };
      }
      errors.push({
        line: t.line,
        col: t.col,
        len: Math.max(t.value.length, 1),
        message: `Unknown event "${t.value}" after \`on\`. Valid events: flag  click  clone  key "..."  receive "..."  backdrop "..."  timer > n  loudness > n`
      });
      pos++;
      return { event: "unknown", line: t.line, col: t.col };
    }
    function parseBody() {
      eat(TT.LBRACE, "expected `{` to open block body");
      const stmts = [];
      while (!check(TT.RBRACE) && !check(TT.EOF)) stmts.push(parseStatement());
      eat(TT.RBRACE, "expected `}` to close block body");
      return stmts;
    }
    function parseStatement() {
      const t = peek();
      const v = t.value;
      if (v === "if" || v === "elif") return parseIf();
      if (v === "repeat" && tokens[pos + 1] && tokens[pos + 1].value === "until") return parseRepeatUntil();
      if (v === "repeat") return parseRepeat();
      if (v === "forever") return parseForever();
      if (v === "wait" && tokens[pos + 1] && tokens[pos + 1].value === "until") return parseWaitUntil();
      if (v === "while") return parseWhile();
      if (v === "for") return parseFor();
      if (v === "pyfor") return parsePyFor();
      if (v === "scratchroutine") return parseScratchroutine();
      if (v === "launch") return parseLaunchAwait("launch");
      if (v === "await") return parseLaunchAwait("await");
      if (v === "cancel") return parseCancel();
      if (v === "breakpoint") return parseBreakpoint();
      return parseSimpleStatement();
    }
    function parseIf() {
      const t = peek();
      pos++;
      const cond = parseExpr();
      const then = parseBody();
      let alt = null;
      if (checkV("else")) {
        pos++;
        if (checkV("if") || checkV("elif")) {
          alt = [parseIf()];
        } else {
          alt = parseBody();
        }
      }
      return { type: "IfStmt", cond, then, alt, line: t.line, col: t.col };
    }
    function parseRepeat() {
      const t = peek();
      pos++;
      const count = parseExpr();
      const body = parseBody();
      return { type: "RepeatStmt", count, body, line: t.line, col: t.col };
    }
    function parseRepeatUntil() {
      const t = peek();
      pos++;
      pos++;
      eat(TT.LPAREN, "`repeat until (condition)`: expected `(` before the condition");
      const cond = parseExpr();
      eat(TT.RPAREN, "`repeat until (condition)`: expected `)` after the condition");
      const body = parseBody();
      return { type: "RepeatUntilStmt", cond, body, line: t.line, col: t.col };
    }
    function parseForever() {
      const t = peek();
      pos++;
      const body = parseBody();
      return { type: "ForeverStmt", body, line: t.line, col: t.col };
    }
    function parseWaitUntil() {
      const t = peek();
      pos++;
      pos++;
      const cond = parseExpr();
      return { type: "WaitUntilStmt", cond, line: t.line, col: t.col };
    }
    function parseWhile() {
      const t = peek();
      pos++;
      eat(TT.LPAREN, "`while (condition)`: expected `(` before the condition");
      const cond = parseExpr();
      eat(TT.RPAREN, "`while (condition)`: expected `)` after the condition");
      const body = parseBody();
      return { type: "WhileStmt", cond, body, line: t.line, col: t.col };
    }
    function parseFor() {
      const t = peek();
      pos++;
      if (!check(TT.VAR)) {
        errors.push({
          line: t.line,
          col: t.col,
          len: 3,
          message: "`for [var] from expr to expr {}`: expected `[variable]` after `for`"
        });
      }
      const varName = check(TT.VAR) ? eat(TT.VAR).value : "_err_";
      if (!checkV("from")) {
        errors.push({
          line: peek().line,
          col: peek().col,
          len: peek().value.length,
          message: "`for [var] from expr to expr {}`: expected `from` after variable"
        });
      } else {
        pos++;
      }
      const fromExpr = parseExpr();
      if (!checkV("to")) {
        errors.push({
          line: peek().line,
          col: peek().col,
          len: peek().value.length,
          message: "`for [var] from expr to expr {}`: expected `to` after start expression"
        });
      } else {
        pos++;
      }
      const toExpr = parseExpr();
      const body = parseBody();
      return { type: "ForStmt", varName, from: fromExpr, to: toExpr, body, line: t.line, col: t.col };
    }
    function parsePyFor() {
      const t = peek();
      pos++;
      if (!check(TT.VAR)) {
        errors.push({
          line: t.line,
          col: t.col,
          len: 5,
          message: "`pyfor [var] in [list] {}`: expected `[iterator variable]` after `pyfor`"
        });
      }
      const varTok = check(TT.VAR) ? eat(TT.VAR) : { value: "_err_", line: t.line, col: t.col };
      if (!checkV("in")) {
        errors.push({
          line: peek().line,
          col: peek().col,
          len: Math.max(peek().value.length, 1),
          message: "`pyfor [var] in [list] {}`: expected keyword `in` after the iterator variable"
        });
      } else {
        pos++;
      }
      if (!check(TT.VAR)) {
        errors.push({
          line: peek().line,
          col: peek().col,
          len: Math.max(peek().value.length, 1),
          message: "`pyfor [var] in [list] {}`: expected `[list variable]` after `in`"
        });
      }
      const listTok = check(TT.VAR) ? eat(TT.VAR) : { value: "_err_", line: t.line, col: t.col };
      const body = parseBody();
      return { type: "PyForStmt", varName: varTok.value, listName: listTok.value, body, line: t.line, col: t.col };
    }
    function parseScratchroutine() {
      const t = peek();
      pos++;
      const nameTok = peek();
      if (nameTok.type !== TT.IDENT) {
        errors.push({
          line: t.line,
          col: t.col,
          len: 13,
          message: "`scratchroutine name(params) {}`: expected a routine name after `scratchroutine`"
        });
      }
      const name = nameTok.type === TT.IDENT ? (pos++, nameTok.value) : "_err_";
      const params = [];
      if (check(TT.LPAREN)) {
        eat(TT.LPAREN);
        while (!check(TT.RPAREN) && !check(TT.EOF)) {
          params.push(peek().value);
          pos++;
          if (!tryEat(TT.COMMA)) break;
        }
        eat(TT.RPAREN);
      }
      const body = parseBody();
      return { type: "ScratchroutineStmt", name, params, body, line: t.line, col: t.col };
    }
    function parseLaunchAwait(mode) {
      const t = peek();
      pos++;
      const nameTok = peek();
      if (nameTok.type !== TT.IDENT) {
        errors.push({
          line: t.line,
          col: t.col,
          len: mode.length,
          message: `\`${mode} name(args)\`: expected a scratchroutine name`
        });
      }
      const name = nameTok.type === TT.IDENT ? (pos++, nameTok.value) : "_err_";
      const args = [];
      if (check(TT.LPAREN)) {
        eat(TT.LPAREN);
        while (!check(TT.RPAREN) && !check(TT.EOF)) {
          args.push(parseExpr());
          if (!tryEat(TT.COMMA)) break;
        }
        eat(TT.RPAREN);
      }
      return { type: mode === "launch" ? "LaunchStmt" : "AwaitStmt", name, args, line: t.line, col: t.col };
    }
    function parseCancel() {
      const t = peek();
      pos++;
      const nameTok = peek();
      if (nameTok.type !== TT.IDENT) {
        errors.push({
          line: t.line,
          col: t.col,
          len: 6,
          message: "`cancel name`: expected a scratchroutine name after `cancel`"
        });
      }
      const name = nameTok.type === TT.IDENT ? (pos++, nameTok.value) : "_err_";
      return { type: "CancelStmt", name, line: t.line, col: t.col };
    }
    function parseBreakpoint() {
      const t = peek();
      pos++;
      return { type: "BreakpointStmt", line: t.line, col: t.col };
    }
    function parseStruct() {
      const t = peek();
      pos++;
      const nameTok = peek();
      if (nameTok.type !== TT.IDENT) {
        errors.push({
          line: t.line,
          col: t.col,
          len: 6,
          message: "`struct name { fields }`: expected a name after `struct`"
        });
      }
      const name = nameTok.type === TT.IDENT ? (pos++, nameTok.value) : "_err_";
      const fields = [];
      eat(TT.LBRACE, "`struct` declaration \u2014 expected `{` after the struct name");
      while (!check(TT.RBRACE) && !check(TT.EOF)) {
        const fTok = peek();
        if (fTok.type === TT.IDENT) {
          fields.push(fTok.value);
          pos++;
        }
        tryEat(TT.COMMA);
      }
      eat(TT.RBRACE, "`struct` declaration \u2014 expected `}` to close field list");
      return { type: "StructDecl", name, fields, line: t.line, col: t.col };
    }
    function parseSimpleStatement() {
      const t = peek();
      const v = t.value;
      if (t.type === TT.VAR && tokens[pos + 1]?.type === TT.DOT) {
        pos++;
        pos++;
        const mTok = peek();
        const method = mTok.type === TT.IDENT ? mTok.value : "";
        if (mTok.type === TT.IDENT) pos++;
        eat(TT.LPAREN, `\`[${t.value}].${method}(...)\`: expected \`(\``);
        const args = [];
        while (!check(TT.RPAREN) && !check(TT.EOF)) {
          args.push(parseExpr());
          if (!tryEat(TT.COMMA)) break;
        }
        eat(TT.RPAREN, `\`[${t.value}].${method}(...)\`: expected \`)\``);
        return {
          type: "MemberCallStmt",
          object: { type: "Var", name: t.value, line: t.line, col: t.col },
          method,
          args,
          line: t.line,
          col: t.col
        };
      }
      if (t.type === TT.VAR) {
        const n1 = tokens[pos + 1], n2 = tokens[pos + 2];
        if (n1 && n2 && n1.type === TT.PLUS && n2.type === TT.PLUS) {
          pos += 3;
          return {
            type: "ChangeVarStmt",
            varName: t.value,
            value: { type: "Num", value: 1, line: t.line, col: t.col },
            line: t.line,
            col: t.col
          };
        }
        if (n1 && n2 && n1.type === TT.MINUS && n2.type === TT.MINUS) {
          pos += 3;
          return {
            type: "ChangeVarStmt",
            varName: t.value,
            value: { type: "Num", value: -1, line: t.line, col: t.col },
            line: t.line,
            col: t.col
          };
        }
      }
      if (t.type === TT.VAR) {
        const next1 = tokens[pos + 1];
        const next2 = tokens[pos + 2];
        const isCompoundOp = next1 && (next1.type === TT.PLUS || next1.type === TT.MINUS || next1.type === TT.STAR || next1.type === TT.SLASH);
        if (isCompoundOp && next2 && next2.type === TT.EQ) {
          const op = next1.value;
          if (op === "+" || op === "-" || op === "*" || op === "/") {
            pos += 3;
            const rhs = parseExpr();
            const varName = t.value;
            if (op === "+") return { type: "ChangeVarStmt", varName, value: rhs, line: t.line, col: t.col };
            const varRef = { type: "Var", name: varName, line: t.line, col: t.col };
            const binop = { type: "BinOp", op, left: varRef, right: rhs };
            return { type: "SetVarStmt", varName, value: binop, line: t.line, col: t.col };
          }
        }
      }
      if (t.type === TT.IDENT) {
        pos++;
        if (check(TT.LPAREN)) {
          eat(TT.LPAREN);
          const args = [];
          while (!check(TT.RPAREN) && !check(TT.EOF)) {
            args.push(parseExpr());
            if (!tryEat(TT.COMMA)) break;
          }
          eat(TT.RPAREN);
          return { type: "CallStmt", name: v, args, line: t.line, col: t.col };
        }
        return { type: "RawKeyword", value: v, line: t.line, col: t.col };
      }
      pos++;
      return parseKeywordStatement(v, t);
    }
    function eatOptionalStr() {
      return check(TT.STR) ? eat(TT.STR).value : null;
    }
    function eatOptionalNum() {
      return check(TT.NUM) ? eat(TT.NUM).value : null;
    }
    function eatOptionalVar() {
      return check(TT.VAR) ? eat(TT.VAR).value : null;
    }
    function args0(ln, cl) {
      eat(TT.LPAREN);
      eat(TT.RPAREN);
      return [ln, cl];
    }
    function args1(ln, cl) {
      eat(TT.LPAREN);
      const a = parseExpr();
      eat(TT.RPAREN);
      return [a, ln, cl];
    }
    function args2(ln, cl) {
      eat(TT.LPAREN);
      const a = parseExpr();
      eat(TT.COMMA);
      const b = parseExpr();
      eat(TT.RPAREN);
      return [a, b, ln, cl];
    }
    function args3(ln, cl) {
      eat(TT.LPAREN);
      const a = parseExpr();
      eat(TT.COMMA);
      const b = parseExpr();
      eat(TT.COMMA);
      const c = parseExpr();
      eat(TT.RPAREN);
      return [a, b, c, ln, cl];
    }
    function parseKeywordStatement(v, t) {
      const ln = t.line, cl = t.col;
      callCtx = CALL_SIGS[v] ? `\`${CALL_SIGS[v]}\`` : v ? `\`${v}(...)\`` : "";
      if (v === "move") {
        const [n] = args1(ln, cl);
        return { type: "MoveStmt", steps: n, line: ln, col: cl };
      }
      if (v === "turnRight") {
        const [n] = args1(ln, cl);
        return { type: "TurnStmt", dir: "right", degrees: n, line: ln, col: cl };
      }
      if (v === "turnLeft") {
        const [n] = args1(ln, cl);
        return { type: "TurnStmt", dir: "left", degrees: n, line: ln, col: cl };
      }
      if (v === "goTo") {
        eat(TT.LPAREN);
        const first = parseExpr();
        if (tryEat(TT.COMMA)) {
          const y = parseExpr();
          eat(TT.RPAREN);
          return { type: "GoToXYStmt", x: first, y, line: ln, col: cl };
        }
        eat(TT.RPAREN);
        const target = first.type === "Str" ? first.value : "_mouse_";
        return { type: "GoToStmt", target, line: ln, col: cl };
      }
      if (v === "glide") {
        eat(TT.LPAREN);
        const secs = parseExpr();
        eat(TT.COMMA);
        if (check(TT.STR)) {
          const target = eat(TT.STR).value;
          eat(TT.RPAREN);
          return { type: "GlideToStmt", secs, target, line: ln, col: cl };
        }
        const x = parseExpr();
        eat(TT.COMMA);
        const y = parseExpr();
        eat(TT.RPAREN);
        return { type: "GlideStmt", secs, x, y, line: ln, col: cl };
      }
      if (v === "bounce") {
        args0(ln, cl);
        return { type: "BounceStmt", line: ln, col: cl };
      }
      if (v === "setX") {
        const [n] = args1(ln, cl);
        return { type: "SetXStmt", value: n, line: ln, col: cl };
      }
      if (v === "setY") {
        const [n] = args1(ln, cl);
        return { type: "SetYStmt", value: n, line: ln, col: cl };
      }
      if (v === "changeX") {
        const [n] = args1(ln, cl);
        return { type: "ChangeXStmt", value: n, line: ln, col: cl };
      }
      if (v === "changeY") {
        const [n] = args1(ln, cl);
        return { type: "ChangeYStmt", value: n, line: ln, col: cl };
      }
      if (v === "say") {
        const [m] = args1(ln, cl);
        return { type: "SayStmt", msg: m, line: ln, col: cl };
      }
      if (v === "sayFor") {
        const [m, s] = args2(ln, cl);
        return { type: "SayForStmt", msg: m, secs: s, line: ln, col: cl };
      }
      if (v === "think") {
        const [m] = args1(ln, cl);
        return { type: "ThinkStmt", msg: m, line: ln, col: cl };
      }
      if (v === "thinkFor") {
        const [m, s] = args2(ln, cl);
        return { type: "ThinkForStmt", msg: m, secs: s, line: ln, col: cl };
      }
      if (v === "switchCostume") {
        const [n] = args1(ln, cl);
        return { type: "SwitchCostumeStmt", name: n, line: ln, col: cl };
      }
      if (v === "switchBackdrop") {
        const [n] = args1(ln, cl);
        return { type: "SwitchBackdropStmt", name: n, line: ln, col: cl };
      }
      if (v === "nextCostume") {
        args0(ln, cl);
        return { type: "NextCostumeStmt", line: ln, col: cl };
      }
      if (v === "nextBackdrop") {
        args0(ln, cl);
        return { type: "NextBackdropStmt", line: ln, col: cl };
      }
      if (v === "setSize") {
        const [n] = args1(ln, cl);
        return { type: "SetSizeStmt", value: n, line: ln, col: cl };
      }
      if (v === "changeSize") {
        const [n] = args1(ln, cl);
        return { type: "ChangeSizeStmt", value: n, line: ln, col: cl };
      }
      if (v === "show") {
        args0(ln, cl);
        return { type: "ShowStmt", line: ln, col: cl };
      }
      if (v === "hide") {
        args0(ln, cl);
        return { type: "HideStmt", line: ln, col: cl };
      }
      if (v === "clearEffects") {
        args0(ln, cl);
        return { type: "ClearEffectsStmt", line: ln, col: cl };
      }
      if (v === "play") {
        const [s] = args1(ln, cl);
        return { type: "PlayStmt", sound: s, line: ln, col: cl };
      }
      if (v === "playUntilDone") {
        const [s] = args1(ln, cl);
        return { type: "PlayUntilDoneStmt", sound: s, line: ln, col: cl };
      }
      if (v === "stopSounds") {
        args0(ln, cl);
        return { type: "StopSoundsStmt", line: ln, col: cl };
      }
      if (v === "broadcast") {
        const [m] = args1(ln, cl);
        return { type: "BroadcastStmt", msg: m, line: ln, col: cl };
      }
      if (v === "broadcastAndWait") {
        const [m] = args1(ln, cl);
        return { type: "BroadcastWaitStmt", msg: m, line: ln, col: cl };
      }
      if (v === "wait") {
        const [n] = args1(ln, cl);
        return { type: "WaitStmt", duration: n, line: ln, col: cl };
      }
      if (v === "stopAll") {
        args0(ln, cl);
        return { type: "StopStmt", option: "all", line: ln, col: cl };
      }
      if (v === "stopThis") {
        args0(ln, cl);
        return { type: "StopStmt", option: "this script", line: ln, col: cl };
      }
      if (v === "stopOtherScripts") {
        args0(ln, cl);
        return { type: "StopStmt", option: "other scripts in sprite", line: ln, col: cl };
      }
      if (v === "createClone") {
        eat(TT.LPAREN);
        if (check(TT.RPAREN)) {
          eat(TT.RPAREN);
          return { type: "CreateCloneStmt", target: "_myself_", line: ln, col: cl };
        }
        const s = parseExpr();
        eat(TT.RPAREN);
        return { type: "CreateCloneStmt", target: s.type === "Str" ? s.value : "_myself_", line: ln, col: cl };
      }
      if (v === "deleteClone") {
        args0(ln, cl);
        return { type: "DeleteCloneStmt", line: ln, col: cl };
      }
      if (v === "setDirection") {
        const [n] = args1(ln, cl);
        return { type: "SetDirectionStmt", degrees: n, line: ln, col: cl };
      }
      if (v === "turnTo") {
        const [n] = args1(ln, cl);
        return { type: "SetDirectionStmt", degrees: n, line: ln, col: cl };
      }
      if (v === "pointTowards") {
        const [s] = args1(ln, cl);
        return { type: "PointTowardsStmt", target: s, line: ln, col: cl };
      }
      if (v === "moveForward") {
        const [n] = args1(ln, cl);
        return { type: "MoveForwardLayersStmt", layers: n, line: ln, col: cl };
      }
      if (v === "moveBackward") {
        const [n] = args1(ln, cl);
        return { type: "MoveBackwardLayersStmt", layers: n, line: ln, col: cl };
      }
      if (v === "goToFront") {
        args0(ln, cl);
        return { type: "GoToFrontStmt", line: ln, col: cl };
      }
      if (v === "goToBack") {
        args0(ln, cl);
        return { type: "GoToBackStmt", line: ln, col: cl };
      }
      if (v === "setEffect") {
        const [e, n] = args2(ln, cl);
        return { type: "SetEffectStmt", effect: e, value: n, line: ln, col: cl };
      }
      if (v === "changeEffect") {
        const [e, n] = args2(ln, cl);
        return { type: "ChangeEffectStmt", effect: e, amount: n, line: ln, col: cl };
      }
      if (v === "setVolume") {
        const [n] = args1(ln, cl);
        return { type: "SetVolumeStmt", value: n, line: ln, col: cl };
      }
      if (v === "changeVolume") {
        const [n] = args1(ln, cl);
        return { type: "ChangeVolumeStmt", value: n, line: ln, col: cl };
      }
      if (v === "askAndWait") {
        const [q] = args1(ln, cl);
        return { type: "AskAndWaitStmt", question: q, line: ln, col: cl };
      }
      if (v === "resetTimer") {
        args0(ln, cl);
        return { type: "ResetTimerStmt", line: ln, col: cl };
      }
      if (v === "setDragMode") {
        const [m] = args1(ln, cl);
        return { type: "SetDragModeStmt", mode: m, line: ln, col: cl };
      }
      if (v === "listDeleteAll") {
        eat(TT.LPAREN);
        const listName = eat(TT.VAR).value;
        eat(TT.RPAREN);
        return { type: "ListDeleteAllStmt", listName, line: ln, col: cl };
      }
      if (v === "setRotationStyle") {
        const [s] = args1(ln, cl);
        return { type: "SetRotationStyleStmt", style: s, line: ln, col: cl };
      }
      if (v === "switchBackdropAndWait") {
        const [n] = args1(ln, cl);
        return { type: "SwitchBackdropWaitStmt", name: n, line: ln, col: cl };
      }
      if (v === "setSoundEffect") {
        const [e, val] = args2(ln, cl);
        return { type: "SetSoundEffectStmt", effect: e, value: val, line: ln, col: cl };
      }
      if (v === "changeSoundEffect") {
        const [e, val] = args2(ln, cl);
        return { type: "ChangeSoundEffectStmt", effect: e, value: val, line: ln, col: cl };
      }
      if (v === "clearSoundEffects") {
        args0(ln, cl);
        return { type: "ClearSoundEffectsStmt", line: ln, col: cl };
      }
      if (v === "set") {
        if (!check(TT.VAR)) {
          errors.push({
            line: ln,
            col: cl,
            len: v.length,
            message: `\`set\` must be followed by a [variable], e.g. \`set [score] to 0\` \u2014 got ${tok(peek())}`
          });
          return { type: "UnknownStmt", value: v, line: ln, col: cl };
        }
        const varName = eat(TT.VAR).value;
        tryEatV("to");
        return { type: "SetVarStmt", varName, value: parseExpr(), line: ln, col: cl };
      }
      if (v === "change") {
        if (!check(TT.VAR)) {
          errors.push({
            line: ln,
            col: cl,
            len: v.length,
            message: `\`change\` must be followed by a [variable], e.g. \`change [score] by 1\` \u2014 got ${tok(peek())}`
          });
          return { type: "UnknownStmt", value: v, line: ln, col: cl };
        }
        const varName = eat(TT.VAR).value;
        tryEatV("by");
        return { type: "ChangeVarStmt", varName, value: parseExpr(), line: ln, col: cl };
      }
      if (v === "showVariable") {
        eat(TT.LPAREN);
        const va = eat(TT.VAR).value;
        eat(TT.RPAREN);
        return { type: "ShowVarStmt", name: va, line: ln, col: cl };
      }
      if (v === "hideVariable") {
        eat(TT.LPAREN);
        const va = eat(TT.VAR).value;
        eat(TT.RPAREN);
        return { type: "HideVarStmt", name: va, line: ln, col: cl };
      }
      if (v === "showList") {
        eat(TT.LPAREN);
        const va = eat(TT.VAR).value;
        eat(TT.RPAREN);
        return { type: "ShowListStmt", name: va, line: ln, col: cl };
      }
      if (v === "hideList") {
        eat(TT.LPAREN);
        const va = eat(TT.VAR).value;
        eat(TT.RPAREN);
        return { type: "HideListStmt", name: va, line: ln, col: cl };
      }
      if (v === "listAdd") {
        eat(TT.LPAREN);
        const item = parseExpr();
        eat(TT.COMMA);
        const listName = eat(TT.VAR).value;
        eat(TT.RPAREN);
        return { type: "ListAddStmt", listName, item, line: ln, col: cl };
      }
      if (v === "listDelete") {
        eat(TT.LPAREN);
        const idx = parseExpr();
        eat(TT.COMMA);
        const listName = eat(TT.VAR).value;
        eat(TT.RPAREN);
        return { type: "ListDeleteStmt", listName, index: idx, line: ln, col: cl };
      }
      if (v === "listInsert") {
        eat(TT.LPAREN);
        const item = parseExpr();
        eat(TT.COMMA);
        const idx = parseExpr();
        eat(TT.COMMA);
        const listName = eat(TT.VAR).value;
        eat(TT.RPAREN);
        return { type: "ListInsertStmt", listName, item, index: idx, line: ln, col: cl };
      }
      if (v === "listReplace") {
        eat(TT.LPAREN);
        const idx = parseExpr();
        eat(TT.COMMA);
        const listName = eat(TT.VAR).value;
        eat(TT.COMMA);
        const item = parseExpr();
        eat(TT.RPAREN);
        return { type: "ListReplaceStmt", listName, index: idx, item, line: ln, col: cl };
      }
      if (v === "print" || v === "println") {
        const [m] = args1(ln, cl);
        return { type: "SayStmt", msg: m, line: ln, col: cl };
      }
      if (v === "step" || v === "forward") {
        const [n] = args1(ln, cl);
        return { type: "MoveStmt", steps: n, line: ln, col: cl };
      }
      if (v === "left") {
        const [n] = args1(ln, cl);
        return { type: "TurnStmt", dir: "left", degrees: n, line: ln, col: cl };
      }
      if (v === "right") {
        const [n] = args1(ln, cl);
        return { type: "TurnStmt", dir: "right", degrees: n, line: ln, col: cl };
      }
      if (v === "front") {
        args0(ln, cl);
        return { type: "GoToFrontStmt", line: ln, col: cl };
      }
      if (v === "back") {
        args0(ln, cl);
        return { type: "GoToBackStmt", line: ln, col: cl };
      }
      if (v === "clone") {
        args0(ln, cl);
        return { type: "CreateCloneStmt", target: { type: "Str", value: "_myself_", line: ln, col: cl }, line: ln, col: cl };
      }
      if (v === "stopMe") {
        args0(ln, cl);
        return { type: "StopStmt", option: "this script", line: ln, col: cl };
      }
      if (v === "ask") {
        const [q] = args1(ln, cl);
        return { type: "AskAndWaitStmt", question: q, line: ln, col: cl };
      }
      if (v === "send") {
        const [m] = args1(ln, cl);
        return { type: "BroadcastStmt", msg: m, line: ln, col: cl };
      }
      if (v === "sendAndWait") {
        const [m] = args1(ln, cl);
        return { type: "BroadcastWaitStmt", msg: m, line: ln, col: cl };
      }
      if (v === "append" || v === "push") {
        eat(TT.LPAREN);
        const listName = eat(TT.VAR).value;
        eat(TT.COMMA);
        const item = parseExpr();
        eat(TT.RPAREN);
        return { type: "ListAddStmt", listName, item, line: ln, col: cl };
      }
      if (v === "remove") {
        eat(TT.LPAREN);
        const listName = eat(TT.VAR).value;
        eat(TT.COMMA);
        const idx = parseExpr();
        eat(TT.RPAREN);
        return { type: "ListDeleteStmt", listName, index: idx, line: ln, col: cl };
      }
      if (v === "insert") {
        eat(TT.LPAREN);
        const listName = eat(TT.VAR).value;
        eat(TT.COMMA);
        const idx = parseExpr();
        eat(TT.COMMA);
        const item = parseExpr();
        eat(TT.RPAREN);
        return { type: "ListInsertStmt", listName, item, index: idx, line: ln, col: cl };
      }
      if (v === "replace") {
        eat(TT.LPAREN);
        const listName = eat(TT.VAR).value;
        eat(TT.COMMA);
        const idx = parseExpr();
        eat(TT.COMMA);
        const item = parseExpr();
        eat(TT.RPAREN);
        return { type: "ListReplaceStmt", listName, index: idx, item, line: ln, col: cl };
      }
      if (v === "clear" || v === "pop") {
        eat(TT.LPAREN);
        const listName = eat(TT.VAR).value;
        eat(TT.RPAREN);
        return { type: "ListDeleteAllStmt", listName, line: ln, col: cl };
      }
      if (v === "checkCancel") {
        args0(ln, cl);
        return { type: "CheckCancelStmt", line: ln, col: cl };
      }
      {
        const all = Object.keys(CALL_SIGS);
        const vl = v.toLowerCase();
        const similar = all.filter((k) => {
          const kl = k.toLowerCase();
          return kl.startsWith(vl) || vl.startsWith(kl.slice(0, 3)) || kl.includes(vl) || vl.includes(kl.slice(0, 4));
        }).slice(0, 3).map((k) => `\`${CALL_SIGS[k]}\``);
        const hint = similar.length ? `  Did you mean: ${similar.join("  or  ")}?` : '  Commands are camelCase function calls like `move(10)`, `say("hi")`, `forever { }`.';
        errors.push({
          line: ln,
          col: cl,
          len: v.length || 1,
          message: `Unknown statement \`${v}\`.${hint}`
        });
      }
      return { type: "UnknownStmt", value: v, line: ln, col: cl };
    }
    function parseExpr() {
      return parseOrExpr();
    }
    function parseOrExpr() {
      let left = parseAndExpr();
      while (checkV("or")) {
        pos++;
        const right = parseAndExpr();
        left = { type: "BinOp", op: "or", left, right };
      }
      return left;
    }
    function parseAndExpr() {
      let left = parseNotExpr();
      while (checkV("and")) {
        pos++;
        const right = parseNotExpr();
        left = { type: "BinOp", op: "and", left, right };
      }
      return left;
    }
    function parseNotExpr() {
      if (checkV("not")) {
        pos++;
        return { type: "UnaryOp", op: "not", operand: parseNotExpr() };
      }
      return parseCompareExpr();
    }
    function parseCompareExpr() {
      let left = parseAddExpr();
      if (check(TT.LT) || check(TT.GT) || check(TT.EQ)) {
        const op = peek().type;
        pos++;
        const right = parseAddExpr();
        left = { type: "BinOp", op, left, right };
      }
      return left;
    }
    function parseAddExpr() {
      let left = parseMulExpr();
      while (check(TT.PLUS) || check(TT.MINUS)) {
        const op = peek().type;
        pos++;
        const right = parseMulExpr();
        left = { type: "BinOp", op, left, right };
      }
      return left;
    }
    function parseMulExpr() {
      let left = parseUnaryExpr();
      while (check(TT.STAR) || check(TT.SLASH) || checkV("mod")) {
        const op = peek().type === TT.STAR ? "*" : peek().type === TT.SLASH ? "/" : "mod";
        pos++;
        const right = parseUnaryExpr();
        left = { type: "BinOp", op, left, right };
      }
      return left;
    }
    function parseUnaryExpr() {
      if (check(TT.MINUS)) {
        pos++;
        return { type: "UnaryOp", op: "-", operand: parseUnaryExpr() };
      }
      return parseCallExpr();
    }
    function parseCallExpr() {
      const t = peek();
      if (t.type === TT.IDENT || KW_SET.has(t.value) && ["touching", "key", "xPos", "yPos", "direction", "size", "timer", "answer", "mouseDown", "mouseX", "mouseY", "loudness", "costumeNum", "costumeName", "volume", "username", "daysSince2000", "isRunning"].includes(t.value)) {
        pos++;
        if (check(TT.LPAREN)) {
          eat(TT.LPAREN);
          const args = [];
          while (!check(TT.RPAREN) && !check(TT.EOF)) {
            args.push(parseExpr());
            if (!tryEat(TT.COMMA)) break;
          }
          eat(TT.RPAREN, `\`${t.value}(...)\`: expected \`)\` to close the argument list`);
          return { type: "CallExpr", name: t.value, args, line: t.line, col: t.col };
        }
        return { type: "Reporter", name: t.value, line: t.line, col: t.col };
      }
      return parsePrimaryExpr();
    }
    function parsePrimaryExpr() {
      const t = peek();
      if (check(TT.NUM)) {
        pos++;
        return { type: "Num", value: t.value, line: t.line, col: t.col };
      }
      if (check(TT.STR)) {
        pos++;
        return { type: "Str", value: t.value, line: t.line, col: t.col };
      }
      if (check(TT.HEX)) {
        pos++;
        return { type: "Hex", value: t.value, line: t.line, col: t.col };
      }
      if (check(TT.VAR)) {
        pos++;
        const varExpr = { type: "Var", name: t.value, line: t.line, col: t.col };
        if (check(TT.DOT)) {
          pos++;
          const mTok = peek();
          if (mTok.type === TT.IDENT) {
            pos++;
            const method = mTok.value;
            eat(TT.LPAREN, `\`[${t.value}].${method}(...)\`: expected \`(\``);
            const args = [];
            while (!check(TT.RPAREN) && !check(TT.EOF)) {
              args.push(parseExpr());
              if (!tryEat(TT.COMMA)) break;
            }
            eat(TT.RPAREN, `\`[${t.value}].${method}(...)\`: expected \`)\``);
            if (method === "sort") {
              errors.push({
                line: t.line,
                col: t.col,
                len: t.value.length,
                message: `\`[${t.value}].sort()\` is a statement \u2014 write it on its own line, not inside an expression`
              });
              return varExpr;
            }
            return { type: "MemberCall", object: varExpr, method, args, line: t.line, col: t.col };
          }
        }
        if (check(TT.VAR) && peek().line === t.line) {
          const idxTok = peek();
          pos++;
          return {
            type: "MemberCall",
            object: varExpr,
            method: "item",
            args: [{ type: "Var", name: idxTok.value, line: idxTok.line, col: idxTok.col }],
            line: t.line,
            col: t.col
          };
        }
        return varExpr;
      }
      if (check(TT.LPAREN)) {
        pos++;
        const e = parseExpr();
        eat(TT.RPAREN);
        return e;
      }
      {
        const where = callCtx ? ` in ${callCtx}` : "";
        errors.push({
          line: t.line,
          col: t.col,
          len: Math.max(t.value.length, 1),
          message: `Expected a value (number, string "...", [variable], or expression)${where} \u2014 got ${tok(t)}`
        });
      }
      pos++;
      return { type: "Num", value: 0 };
    }
    return { ast: parseScript(), errors };
  }
  function lint(ast) {
    const items = [];
    function isTerminator(stmt) {
      if (stmt.type === "ForeverStmt") return true;
      if (stmt.type === "DeleteCloneStmt") return true;
      if (stmt.type === "StopStmt")
        return stmt.option === "all" || stmt.option === "this script";
      return false;
    }
    function warn(stmt, msg) {
      items.push({ line: stmt.line || 1, col: stmt.col || 1, message: msg });
    }
    function lintBody(stmts) {
      if (!stmts || stmts.length === 0) return;
      let dead = false;
      for (const stmt of stmts) {
        if (dead) {
          warn(stmt, "Unreachable code \u2014 this statement can never execute after a terminator (stopAll, stopThis, forever, deleteClone)");
          lintChildren(stmt);
          continue;
        }
        lintChildren(stmt);
        if (isTerminator(stmt)) dead = true;
      }
    }
    function lintChildren(stmt) {
      if (!stmt) return;
      switch (stmt.type) {
        case "OnBlock":
        case "DefineBlock":
        case "OrphanedBlock":
          lintBody(stmt.body);
          break;
        case "IfStmt":
          lintBody(stmt.then);
          if (stmt.alt) lintBody(stmt.alt);
          break;
        case "ForeverStmt":
        case "RepeatStmt":
        case "RepeatUntilStmt":
        case "WhileStmt":
        case "ForStmt":
        case "PyForStmt":
        case "ScratchroutineStmt":
          lintBody(stmt.body);
          break;
      }
    }
    for (const block of ast.blocks || []) {
      if (block.type === "OrphanedBlock") {
        warn(block, "Orphaned block \u2014 no hat event to trigger it. Wrap with `on flag { }`, `on click { }`, etc.");
        lintChildren(block);
      } else if (block.type === "StructDecl") {
      } else if (block.type !== "OnBlock" && block.type !== "DefineBlock" && block.type !== "ScratchroutineStmt") {
        warn(block, "Orphaned statement \u2014 not inside an `on` or `define` block, will never run");
        lintChildren(block);
      } else {
        lintChildren(block);
      }
    }
    return items;
  }
  function typeCheckDiagnostics(ast, spriteName) {
    if (!ast || !ast.blocks) return [];
    const items = [];
    const listNames = /* @__PURE__ */ new Set();
    const varNames = /* @__PURE__ */ new Set();
    const allVars = [
      ...scratchIndex.globalVariables || [],
      ...scratchIndex.spriteVariables[spriteName] || []
    ];
    for (const v of allVars) {
      if (v.type === "list") listNames.add(v.name);
      else varNames.add(v.name);
    }
    function err(node, msg) {
      items.push({ line: node.line || 1, col: node.col || 1, len: 1, message: msg });
    }
    function checkExpr(node) {
      if (!node) return;
      switch (node.type) {
        case "MemberCall": {
          const obj = node.object;
          if (obj && obj.type === "Var") {
            if (varNames.has(obj.name)) {
              err(obj, `\`[${obj.name}]\` is a variable, not a list \u2014 \`.${node.method}()\` requires a list`);
            } else if (!listNames.has(obj.name)) {
              err(obj, `\`[${obj.name}]\` is not defined \u2014 create a list in Scratch first`);
            }
          }
          for (const a of node.args || []) checkExpr(a);
          break;
        }
        case "BinOp":
          checkExpr(node.left);
          checkExpr(node.right);
          break;
        case "UnOp":
          checkExpr(node.operand);
          break;
        case "Call":
          for (const a of node.args || []) checkExpr(a);
          break;
      }
    }
    const LIST_BUILTINS = /* @__PURE__ */ new Set([
      "listAdd",
      "listDelete",
      "listInsert",
      "listReplace",
      "listDeleteAll",
      "showList",
      "hideList"
    ]);
    const VAR_BUILTINS = /* @__PURE__ */ new Set(["showVariable", "hideVariable"]);
    function checkStmt(stmt) {
      if (!stmt) return;
      switch (stmt.type) {
        case "CallStmt": {
          const fn = stmt.name;
          const firstArg = stmt.args && stmt.args[0];
          if (LIST_BUILTINS.has(fn) && firstArg && firstArg.type === "Var") {
            if (varNames.has(firstArg.name)) {
              err(firstArg, `\`${fn}\` expects a list \u2014 [${firstArg.name}] is a variable`);
            } else if (!listNames.has(firstArg.name)) {
              err(firstArg, `\`${fn}\`: [${firstArg.name}] is not defined as a list`);
            }
          }
          if (VAR_BUILTINS.has(fn) && firstArg && firstArg.type === "Var") {
            if (listNames.has(firstArg.name)) {
              err(firstArg, `\`${fn}\` expects a variable \u2014 [${firstArg.name}] is a list (use showList / hideList instead)`);
            }
          }
          for (const a of stmt.args || []) checkExpr(a);
          break;
        }
        case "SetVarStmt":
        case "ChangeVarStmt": {
          if (listNames.has(stmt.varName)) {
            err(stmt, `\`[${stmt.varName}]\` is a list \u2014 use list functions (listAdd, listReplace\u2026) instead of set/change`);
          }
          checkExpr(stmt.value);
          break;
        }
        case "PyForStmt": {
          if (stmt.listName && varNames.has(stmt.listName)) {
            err(stmt, `\`pyfor \u2026 in [${stmt.listName}]\`: [${stmt.listName}] is a variable, not a list`);
          } else if (stmt.listName && !listNames.has(stmt.listName)) {
            err(stmt, `\`pyfor \u2026 in [${stmt.listName}]\`: [${stmt.listName}] is not defined \u2014 create a list in Scratch first`);
          }
          for (const s of stmt.body || []) checkStmt(s);
          break;
        }
        case "IfStmt":
          checkExpr(stmt.cond);
          for (const s of stmt.then || []) checkStmt(s);
          for (const s of stmt.alt || []) checkStmt(s);
          break;
        case "ForeverStmt":
        case "RepeatStmt":
        case "RepeatUntilStmt":
        case "WhileStmt":
        case "ForStmt":
          checkExpr(stmt.cond);
          checkExpr(stmt.from);
          checkExpr(stmt.to);
          for (const s of stmt.body || []) checkStmt(s);
          break;
        default:
          for (const k of ["value", "msg", "secs", "x", "y", "degrees", "duration", "steps", "volume", "effect", "value2"]) {
            if (stmt[k]) checkExpr(stmt[k]);
          }
          for (const s of stmt.body || []) checkStmt(s);
      }
    }
    for (const block of ast.blocks) {
      for (const s of block.body || []) checkStmt(s);
    }
    return items;
  }
  function uid() {
    return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
  }
  function compile(ast, vm, spriteName) {
    const blocks = {};
    const errors = [];
    let scriptIndex = 0;
    const forScope = {};
    const routineScope = {};
    let currentRoutineName = null;
    function resolveVar(name) {
      if (forScope[name]) return forScope[name];
      if (routineScope[name]) return routineScope[name];
      const target = spriteName === "__stage__" ? vm.runtime.targets.find((t) => t.isStage) : vm.runtime.targets.find((t) => t.sprite.name === spriteName);
      const stage = vm.runtime.targets.find((t) => t.isStage);
      if (target) {
        const v = Object.values(target.variables).find((v2) => v2.name === name);
        if (v) return { id: v.id, name: v.name, type: v.type };
      }
      if (stage) {
        const v = Object.values(stage.variables).find((v2) => v2.name === name);
        if (v) return { id: v.id, name: v.name, type: v.type };
      }
      return null;
    }
    function resolveBroadcast(name) {
      const stage = vm.runtime.targets.find((t) => t.isStage);
      if (stage) {
        const v = Object.values(stage.variables).find((v2) => v2.name === name && v2.type === "broadcast_msg");
        if (v) return v.id;
      }
      return uid();
    }
    function addBlock(b) {
      blocks[b.id] = b;
      return b.id;
    }
    function inp(blockId, shadowId) {
      return { name: "", block: blockId, shadow: shadowId !== void 0 ? shadowId : null };
    }
    function numInput(expr, parentId) {
      const shadowId = uid();
      const val = expr.type === "Num" ? String(expr.value) : expr.type === "Str" ? expr.value : "0";
      addBlock({
        id: shadowId,
        opcode: "math_number",
        next: null,
        parent: parentId,
        inputs: {},
        fields: { NUM: { name: "NUM", value: val } },
        shadow: true,
        topLevel: false
      });
      if (expr.type === "Num" || expr.type === "Str") return inp(shadowId, shadowId);
      const exprId = genExpr(expr, parentId);
      return inp(exprId !== null ? exprId : shadowId, shadowId);
    }
    function strInput(expr, parentId) {
      if (expr.type === "Hex") {
        const hexId = uid();
        addBlock({
          id: hexId,
          opcode: "colour_picker",
          next: null,
          parent: parentId,
          inputs: {},
          fields: { COLOUR: { name: "COLOUR", value: expr.value } },
          shadow: true,
          topLevel: false
        });
        return inp(hexId, hexId);
      }
      const shadowId = uid();
      const val = expr.type === "Str" ? expr.value : expr.type === "Num" ? String(expr.value) : "";
      addBlock({
        id: shadowId,
        opcode: "text",
        next: null,
        parent: parentId,
        inputs: {},
        fields: { TEXT: { name: "TEXT", value: val } },
        shadow: true,
        topLevel: false
      });
      if (expr.type === "Str" || expr.type === "Num") return inp(shadowId, shadowId);
      const exprId = genExpr(expr, parentId);
      return inp(exprId !== null ? exprId : shadowId, shadowId);
    }
    function boolInput(expr, parentId) {
      const exprId = genExpr(expr, parentId);
      return inp(exprId, null);
    }
    function genExpr(expr, parentId) {
      if (expr.type === "Num" || expr.type === "Str") return null;
      if (expr.type === "Hex") {
        const id = uid();
        addBlock({
          id,
          opcode: "colour_picker",
          next: null,
          parent: parentId,
          inputs: {},
          fields: { COLOUR: { name: "COLOUR", value: expr.value } },
          shadow: true,
          topLevel: false
        });
        return id;
      }
      if (expr.type === "Var") {
        const v = resolveVar(expr.name);
        if (!v) {
          errors.push({
            line: expr.line || 1,
            col: expr.col || 1,
            len: expr.name.length,
            message: `Variable not found: ${expr.name}`
          });
          return null;
        }
        const id = uid();
        addBlock({
          id,
          opcode: "data_variable",
          next: null,
          parent: parentId,
          inputs: {},
          fields: { VARIABLE: { name: "VARIABLE", value: v.name, id: v.id } },
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (expr.type === "UnaryOp" && expr.op === "-") {
        const id = uid();
        const zeroId = uid();
        addBlock({
          id: zeroId,
          opcode: "math_number",
          next: null,
          parent: id,
          inputs: {},
          fields: { NUM: { name: "NUM", value: "0" } },
          shadow: true,
          topLevel: false
        });
        const innerInput = numInput(expr.operand, id);
        addBlock({
          id,
          opcode: "operator_subtract",
          next: null,
          parent: parentId,
          inputs: { NUM1: inp(zeroId, zeroId), NUM2: innerInput },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (expr.type === "UnaryOp" && expr.op === "not") {
        const id = uid();
        const inner = boolInput(expr.operand, id);
        addBlock({
          id,
          opcode: "operator_not",
          next: null,
          parent: parentId,
          inputs: { OPERAND: inner },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (expr.type === "BinOp") {
        return genBinOp(expr, parentId);
      }
      if (expr.type === "Reporter") {
        return genReporter(expr, parentId);
      }
      if (expr.type === "CallExpr") {
        return genCallExpr(expr, parentId);
      }
      if (expr.type === "MemberCall") {
        return genMemberCall(expr, parentId);
      }
      return null;
    }
    function genMemberCall(expr, parentId) {
      const id = uid();
      const obj = expr.object;
      const m = expr.method;
      const v = resolveVar(obj.name);
      if (m === "length" || m === "len") {
        if (v && v.type === "list") {
          if (!v) {
            errors.push({ line: obj.line || 1, col: obj.col || 1, len: obj.name.length, message: `List not found: ${obj.name}` });
            return null;
          }
          addBlock({
            id,
            opcode: "data_lengthoflist",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
        } else {
          addBlock({
            id,
            opcode: "operator_length",
            next: null,
            parent: parentId,
            inputs: { STRING: strInput(obj, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
        }
        return id;
      }
      if (!v) {
        errors.push({ line: obj.line || 1, col: obj.col || 1, len: obj.name.length, message: `Variable/list not found: ${obj.name}` });
        return null;
      }
      if (m === "contains") {
        const item = expr.args[0] || { type: "Str", value: "" };
        addBlock({
          id,
          opcode: "data_listcontainsitem",
          next: null,
          parent: parentId,
          inputs: { ITEM: strInput(item, id) },
          fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (m === "item") {
        const idx = expr.args[0] || { type: "Num", value: 1 };
        addBlock({
          id,
          opcode: "data_itemoflist",
          next: null,
          parent: parentId,
          inputs: { INDEX: numInput(idx, id) },
          fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (m === "indexOf" || m === "itemNumber") {
        const item = expr.args[0] || { type: "Str", value: "" };
        addBlock({
          id,
          opcode: "data_itemnumoflist",
          next: null,
          parent: parentId,
          inputs: { ITEM: strInput(item, id) },
          fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
          shadow: false,
          topLevel: false
        });
        return id;
      }
      errors.push({
        line: expr.line || 1,
        col: expr.col || 1,
        len: m.length,
        message: `Unknown method .${m}() \u2014 expression methods: .length(), .contains(item), .item(index), .indexOf(item) | statement method: .sort() / .sort("desc")`
      });
      return null;
    }
    function genBinOp(expr, parentId) {
      const op = expr.op;
      const id = uid();
      if (op === "or") {
        addBlock({
          id,
          opcode: "operator_or",
          next: null,
          parent: parentId,
          inputs: { OPERAND1: boolInput(expr.left, id), OPERAND2: boolInput(expr.right, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
      } else if (op === "and") {
        addBlock({
          id,
          opcode: "operator_and",
          next: null,
          parent: parentId,
          inputs: { OPERAND1: boolInput(expr.left, id), OPERAND2: boolInput(expr.right, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
      } else if (op === "+") {
        addBlock({
          id,
          opcode: "operator_add",
          next: null,
          parent: parentId,
          inputs: { NUM1: numInput(expr.left, id), NUM2: numInput(expr.right, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
      } else if (op === "-") {
        addBlock({
          id,
          opcode: "operator_subtract",
          next: null,
          parent: parentId,
          inputs: { NUM1: numInput(expr.left, id), NUM2: numInput(expr.right, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
      } else if (op === "*") {
        addBlock({
          id,
          opcode: "operator_multiply",
          next: null,
          parent: parentId,
          inputs: { NUM1: numInput(expr.left, id), NUM2: numInput(expr.right, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
      } else if (op === "/") {
        addBlock({
          id,
          opcode: "operator_divide",
          next: null,
          parent: parentId,
          inputs: { NUM1: numInput(expr.left, id), NUM2: numInput(expr.right, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
      } else if (op === "mod") {
        addBlock({
          id,
          opcode: "operator_mod",
          next: null,
          parent: parentId,
          inputs: { NUM1: numInput(expr.left, id), NUM2: numInput(expr.right, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
      } else if (op === TT.LT || op === "<") {
        addBlock({
          id,
          opcode: "operator_lt",
          next: null,
          parent: parentId,
          inputs: { OPERAND1: numInput(expr.left, id), OPERAND2: numInput(expr.right, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
      } else if (op === TT.GT || op === ">") {
        addBlock({
          id,
          opcode: "operator_gt",
          next: null,
          parent: parentId,
          inputs: { OPERAND1: numInput(expr.left, id), OPERAND2: numInput(expr.right, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
      } else if (op === TT.EQ || op === "=") {
        addBlock({
          id,
          opcode: "operator_equals",
          next: null,
          parent: parentId,
          inputs: { OPERAND1: strInput(expr.left, id), OPERAND2: strInput(expr.right, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
      }
      return id;
    }
    function genReporter(expr, parentId) {
      const id = uid();
      const name = expr.name;
      const reporterMap = {
        "xPos": "motion_xposition",
        "yPos": "motion_yposition",
        "direction": "motion_direction",
        "size": "looks_size",
        "timer": "sensing_timer",
        "answer": "sensing_answer",
        "mouseDown": "sensing_mousedown",
        "mouseX": "sensing_mousex",
        "mouseY": "sensing_mousey",
        "loudness": "sensing_loudness",
        "costumeNum": "looks_costumenumbername",
        "costumeName": "looks_costumenumbername",
        "volume": "sound_volume",
        "username": "sensing_username",
        "daysSince2000": "sensing_dayssince2000"
      };
      const opcode = reporterMap[name];
      if (!opcode) return null;
      const fields = {};
      if (name === "costumeNum") fields.NUMBER_NAME = { name: "NUMBER_NAME", value: "number" };
      if (name === "costumeName") fields.NUMBER_NAME = { name: "NUMBER_NAME", value: "name" };
      addBlock({ id, opcode, next: null, parent: parentId, inputs: {}, fields, shadow: false, topLevel: false });
      return id;
    }
    function genCallExpr(expr, parentId) {
      const name = expr.name;
      const args = expr.args;
      const id = uid();
      if (name === "touching") {
        const arg = args[0] && (args[0].type === "Str" ? args[0].value : null);
        const targetName = arg === "edge" ? "_edge_" : arg === "mouse" ? "_mouse_" : arg || "_edge_";
        const menuId = uid();
        addBlock({
          id: menuId,
          opcode: "sensing_touchingobjectmenu",
          next: null,
          parent: id,
          inputs: {},
          fields: { TOUCHINGOBJECTMENU: { name: "TOUCHINGOBJECTMENU", value: targetName } },
          shadow: true,
          topLevel: false
        });
        addBlock({
          id,
          opcode: "sensing_touchingobject",
          next: null,
          parent: parentId,
          inputs: { TOUCHINGOBJECTMENU: inp(menuId, menuId) },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (name === "key") {
        const keyName = args[0] && args[0].type === "Str" ? args[0].value : "space";
        const menuId = uid();
        addBlock({
          id: menuId,
          opcode: "sensing_keyoptions",
          next: null,
          parent: id,
          inputs: {},
          fields: { KEY_OPTION: { name: "KEY_OPTION", value: keyName } },
          shadow: true,
          topLevel: false
        });
        addBlock({
          id,
          opcode: "sensing_keypressed",
          next: null,
          parent: parentId,
          inputs: { KEY_OPTION: inp(menuId, menuId) },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      const MATHOP_MAP = {
        abs: "abs",
        sqrt: "sqrt",
        floor: "floor",
        ceiling: "ceiling",
        ceil: "ceiling",
        sin: "sin",
        cos: "cos",
        tan: "tan",
        asin: "asin",
        acos: "acos",
        atan: "atan",
        ln: "ln",
        log: "log",
        exp: "e ^",
        pow10: "10 ^"
      };
      if (name in MATHOP_MAP) {
        const arg = args[0] || { type: "Num", value: 0 };
        addBlock({
          id,
          opcode: "operator_mathop",
          next: null,
          parent: parentId,
          inputs: { NUM: numInput(arg, id) },
          fields: { OPERATOR: { name: "OPERATOR", value: MATHOP_MAP[name] } },
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (name === "round") {
        const arg = args[0] || { type: "Num", value: 0 };
        addBlock({
          id,
          opcode: "operator_round",
          next: null,
          parent: parentId,
          inputs: { NUM: numInput(arg, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (name === "random") {
        const from = args[0] || { type: "Num", value: 1 };
        const to = args[1] || { type: "Num", value: 10 };
        addBlock({
          id,
          opcode: "operator_random",
          next: null,
          parent: parentId,
          inputs: { FROM: numInput(from, id), TO: numInput(to, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (name === "join") {
        const s1 = args[0] || { type: "Str", value: "" };
        const s2 = args[1] || { type: "Str", value: "" };
        addBlock({
          id,
          opcode: "operator_join",
          next: null,
          parent: parentId,
          inputs: { STRING1: strInput(s1, id), STRING2: strInput(s2, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (name === "letterOf") {
        const idx = args[0] || { type: "Num", value: 1 };
        const str = args[1] || { type: "Str", value: "" };
        addBlock({
          id,
          opcode: "operator_letter_of",
          next: null,
          parent: parentId,
          inputs: { LETTER: numInput(idx, id), STRING: strInput(str, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (name === "contains") {
        const str = args[0] || { type: "Str", value: "" };
        const sub = args[1] || { type: "Str", value: "" };
        addBlock({
          id,
          opcode: "operator_contains",
          next: null,
          parent: parentId,
          inputs: { STRING1: strInput(str, id), STRING2: strInput(sub, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (name === "distanceTo") {
        const tgt = args[0] && args[0].type === "Str" ? args[0].value : "_mouse_";
        const menuId = menuBlock("motion_distancetomenu", "DISTANCETOMENU", tgt, id);
        addBlock({
          id,
          opcode: "motion_distanceto",
          next: null,
          parent: parentId,
          inputs: { DISTANCETOMENU: inp(menuId, menuId) },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (name === "currentTime") {
        const unit = (args[0] && args[0].type === "Str" ? args[0].value : "hour").toUpperCase();
        addBlock({
          id,
          opcode: "sensing_current",
          next: null,
          parent: parentId,
          inputs: {},
          fields: { CURRENTMENU: { name: "CURRENTMENU", value: unit } },
          shadow: false,
          topLevel: false
        });
        return id;
      }
      const SENSING_OF_MAP = {
        xOf: "x position",
        yOf: "y position",
        directionOf: "direction",
        costumeNumOf: "costume #",
        costumeNameOf: "costume name",
        sizeOf: "size",
        volumeOf: "volume"
      };
      if (name in SENSING_OF_MAP) {
        const spriteTgt = args[0] && args[0].type === "Str" ? args[0].value : "";
        const menuId = uid();
        addBlock({
          id: menuId,
          opcode: "sensing_of_object_menu",
          next: null,
          parent: id,
          inputs: {},
          fields: { OBJECT: { name: "OBJECT", value: spriteTgt } },
          shadow: true,
          topLevel: false
        });
        addBlock({
          id,
          opcode: "sensing_of",
          next: null,
          parent: parentId,
          inputs: { OBJECT: inp(menuId, menuId) },
          fields: { PROPERTY: { name: "PROPERTY", value: SENSING_OF_MAP[name] } },
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (name === "clamp") {
        let mkN = function(v) {
          return { type: "Num", value: v };
        }, mkAdd = function(a, b) {
          return { type: "BinOp", op: "+", left: a, right: b };
        }, mkSub = function(a, b) {
          return { type: "BinOp", op: "-", left: a, right: b };
        }, mkDiv = function(a, b) {
          return { type: "BinOp", op: "/", left: a, right: b };
        }, mkAbs = function(a) {
          return { type: "Call", name: "abs", args: [a] };
        };
        const val = args[0] || { type: "Num", value: 0 };
        const lo = args[1] || { type: "Num", value: 0 };
        const hi = args[2] || { type: "Num", value: 100 };
        const minExpr = mkDiv(mkSub(mkAdd(val, hi), mkAbs(mkSub(val, hi))), mkN(2));
        const maxExpr = mkDiv(mkAdd(mkAdd(lo, minExpr), mkAbs(mkSub(lo, minExpr))), mkN(2));
        return genExpr(maxExpr, parentId);
      }
      if (name === "yield") {
        addBlock({
          id,
          opcode: "control_wait",
          next: null,
          parent: parentId,
          inputs: { DURATION: numInput({ type: "Num", value: 0 }, id) },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      if (name === "isRunning") {
        const rname = args[0] && (args[0].type === "Reporter" || args[0].type === "CallExpr") ? args[0].name : args[0] && args[0].type === "Str" ? args[0].value : "";
        if (!rname) {
          errors.push({
            line: expr.line || 1,
            col: expr.col || 1,
            len: 9,
            message: "`isRunning(name)`: expected a scratchroutine name as argument"
          });
          return null;
        }
        const countVarName = `__sroutine_${rname}_count`;
        const countV = resolveVar(countVarName);
        if (!countV) {
          errors.push({
            line: expr.line || 1,
            col: expr.col || 1,
            len: 9,
            message: `\`isRunning(${rname})\`: scratchroutine \`${rname}\` has not been defined`
          });
          return null;
        }
        const zeroId = uid();
        const varId = uid();
        addBlock({
          id: zeroId,
          opcode: "math_number",
          next: null,
          parent: id,
          inputs: {},
          fields: { NUM: { name: "NUM", value: "0" } },
          shadow: true,
          topLevel: false
        });
        addBlock({
          id: varId,
          opcode: "data_variable",
          next: null,
          parent: id,
          inputs: {},
          fields: { VARIABLE: { name: "VARIABLE", value: countV.name, id: countV.id } },
          shadow: false,
          topLevel: false
        });
        addBlock({
          id,
          opcode: "operator_gt",
          next: null,
          parent: parentId,
          inputs: { OPERAND1: inp(varId, zeroId), OPERAND2: inp(zeroId, zeroId) },
          fields: {},
          shadow: false,
          topLevel: false
        });
        return id;
      }
      return null;
    }
    function menuBlock(opcode, fieldName, fieldValue, parentId) {
      const id = uid();
      addBlock({
        id,
        opcode,
        next: null,
        parent: parentId,
        inputs: {},
        fields: { [fieldName]: { name: fieldName, value: fieldValue } },
        shadow: true,
        topLevel: false
      });
      return id;
    }
    function genStmts(stmts, parentId) {
      if (!stmts || stmts.length === 0) return [null, null];
      let ids = [];
      for (const stmt of stmts) {
        if (stmt.type === "ForStmt") {
          const [setId, loopId] = genForStmt(stmt);
          if (setId) ids.push(setId);
          if (loopId) ids.push(loopId);
        } else if (stmt.type === "PyForStmt") {
          const [setCtrId, loopId] = genPyForStmt(stmt);
          if (setCtrId) ids.push(setCtrId);
          if (loopId) ids.push(loopId);
        } else if (stmt.type === "MemberCallStmt") {
          const sortIds = genMemberCallStmt(stmt);
          sortIds.forEach((id) => {
            if (id) ids.push(id);
          });
        } else if (stmt.type === "SetVarStmt" && stmt.value?.type === "MemberCall" && ["sum", "min", "max", "count"].includes(stmt.value.method)) {
          const aggIds = genAggregateSetVar(stmt);
          aggIds.forEach((id) => {
            if (id) ids.push(id);
          });
        } else if (stmt.type === "LaunchStmt" || stmt.type === "AwaitStmt") {
          const launchIds = genLaunchOrAwaitStmt(stmt);
          launchIds.forEach((id) => {
            if (id) ids.push(id);
          });
        } else if (stmt.type === "BreakpointStmt") {
          const bpIds = genBreakpointStmt(stmt);
          bpIds.forEach((id) => {
            if (id) ids.push(id);
          });
        } else {
          const id = genStmt(stmt, null);
          if (id) ids.push(id);
        }
      }
      for (let i = 0; i < ids.length - 1; i++) {
        blocks[ids[i]].next = ids[i + 1];
        blocks[ids[i + 1]].parent = ids[i];
      }
      if (ids[0] && parentId) blocks[ids[0]].parent = parentId;
      return [ids[0] || null, ids[ids.length - 1] || null];
    }
    function genMemberCallStmt(node) {
      if (node.method !== "sort") {
        errors.push({
          line: node.line || 1,
          col: node.col || 1,
          len: node.method.length,
          message: `Unknown statement-level method .${node.method}() \u2014 only .sort() / .sort("desc") are supported`
        });
        return [];
      }
      const listVarName = node.object.name;
      const listV = resolveVar(listVarName);
      if (!listV || listV.type !== "list") {
        errors.push({
          line: node.line || 1,
          col: node.col || 1,
          len: listVarName.length,
          message: `.sort() requires a list variable \u2014 [${listVarName}] is not a list or was not found. Create it in Scratch first.`
        });
        return [];
      }
      const desc = node.args.length > 0 && node.args[0].type === "Str" && node.args[0].value === "desc";
      const rand4 = Math.random().toString(36).slice(2, 6);
      const pfx = `_scratchpiler_internal_${rand4}_`;
      const activeTarget = spriteName === "__stage__" ? vm.runtime.targets.find((t) => t.isStage) : vm.runtime.targets.find((t) => t.sprite.name === spriteName);
      if (!activeTarget) {
        errors.push({
          line: node.line || 1,
          col: node.col || 1,
          len: 4,
          message: `sort: could not resolve target "${spriteName}"`
        });
        return [];
      }
      const names = { gap: pfx + "gap", i: pfx + "i", j: pfx + "j", tmp: pfx + "tmp" };
      for (const nm of Object.values(names)) {
        if (!Object.values(activeTarget.variables).find((v) => v.name === nm))
          activeTarget.createVariable(uid(), nm, "");
      }
      const ln = node.line, cl = node.col;
      const Lnode = { type: "Var", name: listVarName, line: ln, col: cl };
      const V = (nm) => ({ type: "Var", name: nm, line: ln, col: cl });
      const N = (v) => ({ type: "Num", value: v, line: ln, col: cl });
      const bop = (op, l, r) => ({ type: "BinOp", op, left: l, right: r, line: ln, col: cl });
      const not_ = (e) => ({ type: "UnaryOp", op: "not", operand: e, line: ln, col: cl });
      const itm = (idx) => ({ type: "MemberCall", object: Lnode, method: "item", args: [idx], line: ln, col: cl });
      const len = () => ({ type: "MemberCall", object: Lnode, method: "length", args: [], line: ln, col: cl });
      const flr = (e) => ({ type: "CallExpr", name: "floor", args: [e], line: ln, col: cl });
      const SET = (nm, val) => ({ type: "SetVarStmt", varName: nm, value: val, line: ln, col: cl });
      const CHG = (nm, val) => ({ type: "ChangeVarStmt", varName: nm, value: val, line: ln, col: cl });
      const REP = (idx, val) => ({ type: "ListReplaceStmt", listName: listVarName, index: idx, item: val, line: ln, col: cl });
      const RU = (cond, body) => ({ type: "RepeatUntilStmt", cond, body, line: ln, col: cl });
      const { gap, i, j, tmp } = names;
      const cmpOp = desc ? "<" : ">";
      const shiftBody = [
        REP(V(j), itm(bop("-", V(j), V(gap)))),
        SET(j, bop("-", V(j), V(gap)))
      ];
      const shiftStop = bop(
        "or",
        not_(bop(">", V(j), V(gap))),
        not_(bop(cmpOp, itm(bop("-", V(j), V(gap))), V(tmp)))
      );
      const insertBody = [
        SET(tmp, itm(V(i))),
        SET(j, V(i)),
        RU(shiftStop, shiftBody),
        REP(V(j), V(tmp)),
        CHG(i, N(1))
      ];
      const passBody = [
        SET(i, bop("+", V(gap), N(1))),
        RU(bop(">", V(i), len()), insertBody),
        SET(gap, flr(bop("/", V(gap), N(3))))
      ];
      const p1Stop = not_(bop("<", bop("+", bop("*", V(gap), N(3)), N(1)), len()));
      const p1Body = [SET(gap, bop("+", bop("*", V(gap), N(3)), N(1)))];
      const stmts = [
        SET(gap, N(1)),
        RU(p1Stop, p1Body),
        RU(bop("<", V(gap), N(1)), passBody)
      ];
      return stmts.map((s) => genStmt(s, null)).filter(Boolean);
    }
    function genForStmt(node) {
      const rand4 = Math.random().toString(36).slice(2, 6);
      const internalName = `_scratchpiler_internal_${rand4}_${node.varName}`;
      const activeTarget = spriteName === "__stage__" ? vm.runtime.targets.find((t) => t.isStage) : vm.runtime.targets.find((t) => t.sprite.name === spriteName);
      if (!activeTarget) {
        errors.push({
          line: node.line,
          col: node.col,
          len: 3,
          message: `for: could not resolve target "${spriteName}"`
        });
        return [null, null];
      }
      let iterVarId;
      const existing = Object.values(activeTarget.variables).find((v) => v.name === internalName);
      if (existing) {
        iterVarId = existing.id;
      } else {
        iterVarId = uid();
        activeTarget.createVariable(iterVarId, internalName, "");
      }
      forScope[node.varName] = { id: iterVarId, name: internalName, type: "" };
      const setId = uid();
      addBlock({
        id: setId,
        opcode: "data_setvariableto",
        next: null,
        parent: null,
        inputs: { VALUE: strInput(node.from, setId) },
        fields: { VARIABLE: { name: "VARIABLE", value: internalName, id: iterVarId } },
        shadow: false,
        topLevel: false
      });
      const loopId = uid();
      const gtId = uid();
      const iterVarExpr = { type: "Var", name: node.varName, line: node.line, col: node.col };
      addBlock({
        id: gtId,
        opcode: "operator_gt",
        next: null,
        parent: loopId,
        inputs: {
          OPERAND1: numInput(iterVarExpr, gtId),
          OPERAND2: numInput(node.to, gtId)
        },
        fields: {},
        shadow: false,
        topLevel: false
      });
      const incrId = uid();
      const oneShadId = uid();
      addBlock({
        id: oneShadId,
        opcode: "math_number",
        next: null,
        parent: incrId,
        inputs: {},
        fields: { NUM: { name: "NUM", value: "1" } },
        shadow: true,
        topLevel: false
      });
      addBlock({
        id: incrId,
        opcode: "data_changevariableby",
        next: null,
        parent: null,
        inputs: { VALUE: inp(oneShadId, oneShadId) },
        fields: { VARIABLE: { name: "VARIABLE", value: internalName, id: iterVarId } },
        shadow: false,
        topLevel: false
      });
      const bodyFirst = genBody(node.body, loopId);
      if (bodyFirst) {
        let lastId = bodyFirst;
        while (blocks[lastId].next) lastId = blocks[lastId].next;
        blocks[lastId].next = incrId;
        blocks[incrId].parent = lastId;
      } else {
        blocks[incrId].parent = loopId;
      }
      addBlock({
        id: loopId,
        opcode: "control_repeat_until",
        next: null,
        parent: null,
        inputs: {
          CONDITION: inp(gtId, null),
          SUBSTACK: inp(bodyFirst || incrId, null)
        },
        fields: {},
        shadow: false,
        topLevel: false
      });
      blocks[setId].next = loopId;
      blocks[loopId].parent = setId;
      delete forScope[node.varName];
      return [setId, loopId];
    }
    function genPyForStmt(node) {
      const rand4 = Math.random().toString(36).slice(2, 6);
      const ctrInternalName = `_scratchpiler_internal_${rand4}_pyfor_ctr`;
      const itemInternalName = `_scratchpiler_internal_${rand4}_${node.varName}`;
      const activeTarget = spriteName === "__stage__" ? vm.runtime.targets.find((t) => t.isStage) : vm.runtime.targets.find((t) => t.sprite.name === spriteName);
      if (!activeTarget) {
        errors.push({
          line: node.line,
          col: node.col,
          len: 5,
          message: `pyfor: could not resolve target "${spriteName}"`
        });
        return [null, null];
      }
      const listV = resolveVar(node.listName);
      if (!listV || listV.type !== "list") {
        errors.push({
          line: node.line,
          col: node.col,
          len: node.listName.length,
          message: `\`pyfor\` requires a list \u2014 [${node.listName}] is ${!listV ? "not found" : "not a list (it's a variable)"}. Create a list in Scratch first.`
        });
        return [null, null];
      }
      let ctrVarId;
      const existingCtr = Object.values(activeTarget.variables).find((v) => v.name === ctrInternalName);
      if (existingCtr) {
        ctrVarId = existingCtr.id;
      } else {
        ctrVarId = uid();
        activeTarget.createVariable(ctrVarId, ctrInternalName, "");
      }
      let itemVarId;
      const existingItem = Object.values(activeTarget.variables).find((v) => v.name === itemInternalName);
      if (existingItem) {
        itemVarId = existingItem.id;
      } else {
        itemVarId = uid();
        activeTarget.createVariable(itemVarId, itemInternalName, "");
      }
      const CTR_KEY = ctrInternalName;
      forScope[CTR_KEY] = { id: ctrVarId, name: ctrInternalName, type: "" };
      forScope[node.varName] = { id: itemVarId, name: itemInternalName, type: "" };
      const ln = node.line, cl = node.col;
      const LN = { type: "Var", name: node.listName, line: ln, col: cl };
      const CTR_V = { type: "Var", name: CTR_KEY, line: ln, col: cl };
      const N = (v) => ({ type: "Num", value: v, line: ln, col: cl });
      const bop = (op, l, r) => ({ type: "BinOp", op, left: l, right: r });
      const itemOf = (idx) => ({ type: "MemberCall", object: LN, method: "item", args: [idx] });
      const lenOf = () => ({ type: "MemberCall", object: LN, method: "length", args: [] });
      const setItemStmt = { type: "SetVarStmt", varName: node.varName, value: itemOf(CTR_V), line: ln, col: cl };
      const incrCtrStmt = { type: "ChangeVarStmt", varName: CTR_KEY, value: N(1), line: ln, col: cl };
      const fullBody = [setItemStmt, ...node.body, incrCtrStmt];
      const loopStmt = { type: "RepeatUntilStmt", cond: bop(">", CTR_V, lenOf()), body: fullBody, line: ln, col: cl };
      const setCtrId = genStmt({ type: "SetVarStmt", varName: CTR_KEY, value: N(1), line: ln, col: cl }, null);
      const loopId = genStmt(loopStmt, null);
      delete forScope[CTR_KEY];
      delete forScope[node.varName];
      if (setCtrId && loopId) {
        blocks[setCtrId].next = loopId;
        blocks[loopId].parent = setCtrId;
      }
      return [setCtrId, loopId];
    }
    function ensureVar(activeTarget, name) {
      const existing = Object.values(activeTarget.variables).find((v) => v.name === name);
      if (existing) return { id: existing.id, name: existing.name, type: "" };
      const id = uid();
      activeTarget.createVariable(id, name, "");
      return { id, name, type: "" };
    }
    function genAggregateSetVar(stmt) {
      const mc = stmt.value;
      const method = mc.method;
      const listObj = mc.object;
      const outName = stmt.varName;
      const ln = stmt.line, cl = stmt.col;
      const listV = resolveVar(listObj.name);
      if (!listV || listV.type !== "list") {
        errors.push({
          line: ln,
          col: cl,
          len: listObj.name.length,
          message: `\`[${listObj.name}].${method}()\` requires a list \u2014 [${listObj.name}] is ${!listV ? "not found" : "not a list"}`
        });
        return [];
      }
      const activeTarget = spriteName === "__stage__" ? vm.runtime.targets.find((t) => t.isStage) : vm.runtime.targets.find((t) => t.sprite.name === spriteName);
      if (!activeTarget) return [];
      const rand4 = Math.random().toString(36).slice(2, 6);
      const tmpName = `_scratchpiler_internal_${rand4}_agg_tmp`;
      const ctrName = `_scratchpiler_internal_${rand4}_agg_ctr`;
      const itemName = `_scratchpiler_internal_${rand4}_agg_item`;
      const tmpV = ensureVar(activeTarget, tmpName);
      const ctrV = ensureVar(activeTarget, ctrName);
      const itemV = ensureVar(activeTarget, itemName);
      const N = (v) => ({ type: "Num", value: v, line: ln, col: cl });
      const LN = { type: "Var", name: listObj.name, line: ln, col: cl };
      const CTR = { type: "Var", name: ctrName, line: ln, col: cl };
      const ITEM = { type: "Var", name: itemName, line: ln, col: cl };
      const TMP = { type: "Var", name: tmpName, line: ln, col: cl };
      const lenOf = () => ({ type: "MemberCall", object: LN, method: "length", args: [] });
      const itemOf = (i) => ({ type: "MemberCall", object: LN, method: "item", args: [i] });
      const bop = (op, l, r) => ({ type: "BinOp", op, left: l, right: r });
      forScope[ctrName] = ctrV;
      forScope[itemName] = itemV;
      forScope[tmpName] = tmpV;
      let initTmpStmt, updateTmpStmt;
      if (method === "sum") {
        initTmpStmt = { type: "SetVarStmt", varName: tmpName, value: N(0), line: ln, col: cl };
        updateTmpStmt = { type: "ChangeVarStmt", varName: tmpName, value: ITEM, line: ln, col: cl };
      } else if (method === "min") {
        initTmpStmt = { type: "SetVarStmt", varName: tmpName, value: itemOf(N(1)), line: ln, col: cl };
        updateTmpStmt = {
          type: "IfStmt",
          cond: bop("<", ITEM, TMP),
          then: [{ type: "SetVarStmt", varName: tmpName, value: ITEM, line: ln, col: cl }],
          alt: null,
          line: ln,
          col: cl
        };
      } else if (method === "max") {
        initTmpStmt = { type: "SetVarStmt", varName: tmpName, value: itemOf(N(1)), line: ln, col: cl };
        updateTmpStmt = {
          type: "IfStmt",
          cond: bop(">", ITEM, TMP),
          then: [{ type: "SetVarStmt", varName: tmpName, value: ITEM, line: ln, col: cl }],
          alt: null,
          line: ln,
          col: cl
        };
      } else {
        const countVal = mc.args[0] || { type: "Num", value: 0 };
        initTmpStmt = { type: "SetVarStmt", varName: tmpName, value: N(0), line: ln, col: cl };
        updateTmpStmt = {
          type: "IfStmt",
          cond: bop("=", ITEM, countVal),
          then: [{ type: "ChangeVarStmt", varName: tmpName, value: N(1), line: ln, col: cl }],
          alt: null,
          line: ln,
          col: cl
        };
      }
      const setItemStmt = { type: "SetVarStmt", varName: itemName, value: itemOf(CTR), line: ln, col: cl };
      const incrCtrStmt = { type: "ChangeVarStmt", varName: ctrName, value: N(1), line: ln, col: cl };
      const loopBody = [setItemStmt, updateTmpStmt, incrCtrStmt];
      const loopStmt = { type: "RepeatUntilStmt", cond: bop(">", CTR, lenOf()), body: loopBody, line: ln, col: cl };
      const finalSetStmt = {
        type: "SetVarStmt",
        varName: outName,
        value: { type: "Var", name: tmpName, line: ln, col: cl },
        line: ln,
        col: cl
      };
      const setCtrId = genStmt({ type: "SetVarStmt", varName: ctrName, value: N(1), line: ln, col: cl }, null);
      const initTmpId = genStmt(initTmpStmt, null);
      const loopId = genStmt(loopStmt, null);
      const setOutId = genStmt(finalSetStmt, null);
      delete forScope[ctrName];
      delete forScope[itemName];
      delete forScope[tmpName];
      const ids = [setCtrId, initTmpId, loopId, setOutId].filter(Boolean);
      for (let i = 0; i < ids.length - 1; i++) {
        blocks[ids[i]].next = ids[i + 1];
        blocks[ids[i + 1]].parent = ids[i];
      }
      return ids;
    }
    function srInternalName(rname) {
      return `__sroutine_${rname}`;
    }
    function ensureGlobalVar(name) {
      const stage = vm.runtime.targets.find((t) => t.isStage);
      if (!stage) return null;
      const existing = Object.values(stage.variables).find((v) => v.name === name && v.type === "");
      if (existing) return { id: existing.id, name: existing.name, type: "" };
      const id = uid();
      stage.createVariable(id, name, "");
      return { id, name, type: "" };
    }
    function ensureBroadcast(name) {
      const stage = vm.runtime.targets.find((t) => t.isStage);
      if (!stage) return uid();
      const existing = Object.values(stage.variables).find((v) => v.name === name && v.type === "broadcast_msg");
      if (existing) return existing.id;
      const id = uid();
      stage.createVariable(id, name, "broadcast_msg");
      return id;
    }
    function genScratchroutineStmt(node, scriptX2) {
      const rname = node.name;
      const bcastName = srInternalName(rname);
      const cancelName = `__sroutine_${rname}_cancelled`;
      const countName = `__sroutine_${rname}_count`;
      ensureBroadcast(bcastName);
      const cancelV = ensureGlobalVar(cancelName);
      const countV = ensureGlobalVar(countName);
      if (!cancelV || !countV) {
        errors.push({
          line: node.line,
          col: node.col,
          len: 13,
          message: `scratchroutine ${rname}: could not create global variables`
        });
        return;
      }
      const paramVars = [];
      for (const p of node.params) {
        const pVarName = `__sroutine_${rname}_${p}`;
        const pV = ensureGlobalVar(pVarName);
        if (pV) {
          routineScope[p] = pV;
          paramVars.push({ param: p, v: pV });
        }
      }
      currentRoutineName = rname;
      const bcastId = ensureBroadcast(bcastName);
      const hatId = uid();
      addBlock({
        id: hatId,
        opcode: "event_whenbroadcastreceived",
        next: null,
        parent: null,
        inputs: {},
        fields: { BROADCAST_OPTION: { name: "BROADCAST_OPTION", value: bcastName, id: bcastId } },
        shadow: false,
        topLevel: true,
        x: scriptX2,
        y: 50
      });
      const ln = node.line, cl = node.col;
      const setCancelStmt = { type: "SetVarStmt", varName: cancelName, value: { type: "Num", value: 0 }, line: ln, col: cl };
      const incrCountStmt = { type: "ChangeVarStmt", varName: countName, value: { type: "Num", value: 1 }, line: ln, col: cl };
      const decrCountStmt = { type: "ChangeVarStmt", varName: countName, value: { type: "Num", value: -1 }, line: ln, col: cl };
      const fullBody = [setCancelStmt, incrCountStmt, ...node.body, decrCountStmt];
      routineScope[cancelName] = cancelV;
      routineScope[countName] = countV;
      const bodyFirst = genBody(fullBody, hatId);
      if (bodyFirst) {
        blocks[hatId].next = bodyFirst;
        blocks[bodyFirst].parent = hatId;
      }
      currentRoutineName = null;
      for (const { param } of paramVars) delete routineScope[param];
      delete routineScope[cancelName];
      delete routineScope[countName];
    }
    function genLaunchOrAwaitStmt(node) {
      const rname = node.name;
      const bcastName = srInternalName(rname);
      const ln = node.line, cl = node.col;
      const ids = [];
      for (let i = 0; i < node.args.length; i++) {
        const pVarName = `__sroutine_${rname}_param${i}`;
        const stage = vm.runtime.targets.find((t) => t.isStage);
        if (!stage) break;
        const stageVars = Object.values(stage.variables).filter((v) => v.name.startsWith(`__sroutine_${rname}_`) && v.type === "" && v.name !== `__sroutine_${rname}_cancelled` && v.name !== `__sroutine_${rname}_count`);
        stageVars.sort((a, b) => a.name < b.name ? -1 : 1);
        const pV = stageVars[i];
        if (!pV) continue;
        const setId = genStmt({
          type: "SetVarStmt",
          varName: pV.name,
          value: node.args[i],
          line: ln,
          col: cl
        }, null);
        if (setId) ids.push(setId);
      }
      const bcastId = ensureBroadcast(bcastName);
      const isAwait = node.type === "AwaitStmt";
      const bcastStmt = isAwait ? { type: "BroadcastWaitStmt", msg: { type: "Str", value: bcastName, line: ln, col: cl }, line: ln, col: cl } : { type: "BroadcastStmt", msg: { type: "Str", value: bcastName, line: ln, col: cl }, line: ln, col: cl };
      const bcastBlockId = genStmt(bcastStmt, null);
      if (bcastBlockId) ids.push(bcastBlockId);
      return ids;
    }
    function genBreakpointStmt(node) {
      const stage = vm.runtime.targets.find((t) => t.isStage);
      if (!stage) {
        errors.push({
          line: node.line || 1,
          col: node.col || 1,
          len: 10,
          message: "`breakpoint`: VM stage not available"
        });
        return [];
      }
      function ensureDbgVar(varName) {
        let v = Object.values(stage.variables).find((v2) => v2.name === varName && v2.type === "");
        if (!v) {
          const vid = uid();
          stage.createVariable(vid, varName, "");
          v = stage.variables[vid];
        }
        return { id: v.id, name: v.name };
      }
      const atV = ensureDbgVar("__dbg_at__");
      const resumeV = ensureDbgVar("__dbg_resume__");
      const setAtId = uid();
      addBlock({
        id: setAtId,
        opcode: "data_setvariableto",
        next: null,
        parent: null,
        inputs: { VALUE: strInput({ type: "Num", value: 1 }, setAtId) },
        fields: { VARIABLE: { name: "VARIABLE", value: atV.name, id: atV.id } },
        shadow: false,
        topLevel: false
      });
      const setResId = uid();
      addBlock({
        id: setResId,
        opcode: "data_setvariableto",
        next: null,
        parent: null,
        inputs: { VALUE: strInput({ type: "Num", value: 0 }, setResId) },
        fields: { VARIABLE: { name: "VARIABLE", value: resumeV.name, id: resumeV.id } },
        shadow: false,
        topLevel: false
      });
      const waitId = uid();
      const resVarId = uid();
      addBlock({
        id: resVarId,
        opcode: "data_variable",
        next: null,
        parent: waitId,
        inputs: {},
        fields: { VARIABLE: { name: "VARIABLE", value: resumeV.name, id: resumeV.id } },
        shadow: false,
        topLevel: false
      });
      const oneId = uid();
      addBlock({
        id: oneId,
        opcode: "math_number",
        next: null,
        parent: waitId,
        inputs: {},
        fields: { NUM: { name: "NUM", value: "1" } },
        shadow: true,
        topLevel: false
      });
      const eqId = uid();
      addBlock({
        id: eqId,
        opcode: "operator_equals",
        next: null,
        parent: waitId,
        inputs: { OPERAND1: inp(resVarId, oneId), OPERAND2: inp(oneId, oneId) },
        fields: {},
        shadow: false,
        topLevel: false
      });
      addBlock({
        id: waitId,
        opcode: "control_wait_until",
        next: null,
        parent: null,
        inputs: { CONDITION: inp(eqId, null) },
        fields: {},
        shadow: false,
        topLevel: false
      });
      const clearAtId = uid();
      addBlock({
        id: clearAtId,
        opcode: "data_setvariableto",
        next: null,
        parent: null,
        inputs: { VALUE: strInput({ type: "Num", value: 0 }, clearAtId) },
        fields: { VARIABLE: { name: "VARIABLE", value: atV.name, id: atV.id } },
        shadow: false,
        topLevel: false
      });
      return [setAtId, setResId, waitId, clearAtId];
    }
    function genBody(stmts, parentId) {
      const [first] = genStmts(stmts, parentId);
      return first;
    }
    function genStmt(node, parentId) {
      if (!node) return null;
      const id = uid();
      switch (node.type) {
        // Control
        case "IfStmt": {
          const condInput = boolInput(node.cond, id);
          const substackFirst = genBody(node.then, id);
          if (node.alt) {
            const substack2First = genBody(node.alt, id);
            addBlock({
              id,
              opcode: "control_if_else",
              next: null,
              parent: parentId,
              inputs: {
                CONDITION: condInput,
                SUBSTACK: inp(substackFirst || null, null),
                SUBSTACK2: inp(substack2First || null, null)
              },
              fields: {},
              shadow: false,
              topLevel: false
            });
          } else {
            addBlock({
              id,
              opcode: "control_if",
              next: null,
              parent: parentId,
              inputs: {
                CONDITION: condInput,
                SUBSTACK: inp(substackFirst || null, null)
              },
              fields: {},
              shadow: false,
              topLevel: false
            });
          }
          return id;
        }
        case "RepeatStmt": {
          const timesInput = numInput(node.count, id);
          const substackFirst = genBody(node.body, id);
          addBlock({
            id,
            opcode: "control_repeat",
            next: null,
            parent: parentId,
            inputs: {
              TIMES: timesInput,
              SUBSTACK: inp(substackFirst || null, null)
            },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ForeverStmt": {
          const substackFirst = genBody(node.body, id);
          addBlock({
            id,
            opcode: "control_forever",
            next: null,
            parent: parentId,
            inputs: { SUBSTACK: inp(substackFirst || null, null) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "RepeatUntilStmt": {
          const condInput = boolInput(node.cond, id);
          const substackFirst = genBody(node.body, id);
          addBlock({
            id,
            opcode: "control_repeat_until",
            next: null,
            parent: parentId,
            inputs: {
              CONDITION: condInput,
              SUBSTACK: inp(substackFirst || null, null)
            },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "WhileStmt": {
          const negCond = { type: "UnaryOp", op: "not", operand: node.cond };
          const condInput = boolInput(negCond, id);
          const substackFirst = genBody(node.body, id);
          addBlock({
            id,
            opcode: "control_repeat_until",
            next: null,
            parent: parentId,
            inputs: {
              CONDITION: condInput,
              SUBSTACK: inp(substackFirst || null, null)
            },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "WaitUntilStmt": {
          addBlock({
            id,
            opcode: "control_wait_until",
            next: null,
            parent: parentId,
            inputs: { CONDITION: boolInput(node.cond, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "WaitStmt": {
          addBlock({
            id,
            opcode: "control_wait",
            next: null,
            parent: parentId,
            inputs: { DURATION: numInput(node.duration, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "StopStmt": {
          addBlock({
            id,
            opcode: "control_stop",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { STOP_OPTION: { name: "STOP_OPTION", value: node.option } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "CancelStmt": {
          const flagName = `__sroutine_${node.name}_cancelled`;
          const flagV = resolveVar(flagName);
          if (!flagV) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: 6,
              message: `\`cancel ${node.name}\`: scratchroutine \`${node.name}\` has not been defined`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_setvariableto",
            next: null,
            parent: parentId,
            inputs: { VALUE: strInput({ type: "Num", value: 1 }, id) },
            fields: { VARIABLE: { name: "VARIABLE", value: flagV.name, id: flagV.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "CheckCancelStmt": {
          if (!currentRoutineName) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: 11,
              message: "`checkCancel()` must be used inside a `scratchroutine` body"
            });
            return null;
          }
          const flagName2 = `__sroutine_${currentRoutineName}_cancelled`;
          const flagV2 = resolveVar(flagName2);
          if (!flagV2) {
            errors.push({ line: node.line || 1, col: node.col || 1, len: 11, message: `checkCancel: cancel flag not found` });
            return null;
          }
          const flagVarId = uid();
          addBlock({
            id: flagVarId,
            opcode: "data_variable",
            next: null,
            parent: id,
            inputs: {},
            fields: { VARIABLE: { name: "VARIABLE", value: flagV2.name, id: flagV2.id } },
            shadow: false,
            topLevel: false
          });
          const oneId = uid();
          addBlock({
            id: oneId,
            opcode: "math_number",
            next: null,
            parent: id,
            inputs: {},
            fields: { NUM: { name: "NUM", value: "1" } },
            shadow: true,
            topLevel: false
          });
          const eqId = uid();
          addBlock({
            id: eqId,
            opcode: "operator_equals",
            next: null,
            parent: id,
            inputs: { OPERAND1: inp(flagVarId, oneId), OPERAND2: inp(oneId, oneId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          const stopId = uid();
          addBlock({
            id: stopId,
            opcode: "control_stop",
            next: null,
            parent: id,
            inputs: {},
            fields: { STOP_OPTION: { name: "STOP_OPTION", value: "this script" } },
            shadow: false,
            topLevel: false
          });
          addBlock({
            id,
            opcode: "control_if",
            next: null,
            parent: parentId,
            inputs: { CONDITION: inp(eqId, null), SUBSTACK: inp(stopId, null) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "CreateCloneStmt": {
          const menuId = menuBlock("control_create_clone_of_menu", "CLONE_OPTION", node.target, id);
          addBlock({
            id,
            opcode: "control_create_clone_of",
            next: null,
            parent: parentId,
            inputs: { CLONE_OPTION: inp(menuId, menuId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "DeleteCloneStmt": {
          addBlock({
            id,
            opcode: "control_delete_this_clone",
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Motion
        case "MoveStmt": {
          addBlock({
            id,
            opcode: "motion_movesteps",
            next: null,
            parent: parentId,
            inputs: { STEPS: numInput(node.steps, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "TurnStmt": {
          const opcode = node.dir === "left" ? "motion_turnleft" : "motion_turnright";
          addBlock({
            id,
            opcode,
            next: null,
            parent: parentId,
            inputs: { DEGREES: numInput(node.degrees, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "GoToXYStmt": {
          addBlock({
            id,
            opcode: "motion_gotoxy",
            next: null,
            parent: parentId,
            inputs: { X: numInput(node.x, id), Y: numInput(node.y, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "GoToStmt": {
          const menuId = menuBlock("motion_goto_menu", "TO", node.target, id);
          addBlock({
            id,
            opcode: "motion_goto",
            next: null,
            parent: parentId,
            inputs: { TO: inp(menuId, menuId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "GlideStmt": {
          addBlock({
            id,
            opcode: "motion_glidesecstoxy",
            next: null,
            parent: parentId,
            inputs: { SECS: numInput(node.secs, id), X: numInput(node.x, id), Y: numInput(node.y, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "SetXStmt": {
          addBlock({
            id,
            opcode: "motion_setx",
            next: null,
            parent: parentId,
            inputs: { X: numInput(node.value, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "SetYStmt": {
          addBlock({
            id,
            opcode: "motion_sety",
            next: null,
            parent: parentId,
            inputs: { Y: numInput(node.value, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ChangeXStmt": {
          addBlock({
            id,
            opcode: "motion_changexby",
            next: null,
            parent: parentId,
            inputs: { DX: numInput(node.value, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ChangeYStmt": {
          addBlock({
            id,
            opcode: "motion_changeyby",
            next: null,
            parent: parentId,
            inputs: { DY: numInput(node.value, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "BounceStmt": {
          addBlock({
            id,
            opcode: "motion_ifonedgebounce",
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Looks
        case "SayStmt": {
          addBlock({
            id,
            opcode: "looks_say",
            next: null,
            parent: parentId,
            inputs: { MESSAGE: strInput(node.msg, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "SayForStmt": {
          addBlock({
            id,
            opcode: "looks_sayforsecs",
            next: null,
            parent: parentId,
            inputs: { MESSAGE: strInput(node.msg, id), SECS: numInput(node.secs, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ThinkStmt": {
          addBlock({
            id,
            opcode: "looks_think",
            next: null,
            parent: parentId,
            inputs: { MESSAGE: strInput(node.msg, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ThinkForStmt": {
          addBlock({
            id,
            opcode: "looks_thinkforsecs",
            next: null,
            parent: parentId,
            inputs: { MESSAGE: strInput(node.msg, id), SECS: numInput(node.secs, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "SwitchCostumeStmt": {
          const menuId = menuBlock("looks_costume", "COSTUME", node.name.type === "Str" ? node.name.value : "", id);
          addBlock({
            id,
            opcode: "looks_switchcostumeto",
            next: null,
            parent: parentId,
            inputs: { COSTUME: inp(menuId, menuId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "SwitchBackdropStmt": {
          const menuId = menuBlock("looks_backdrops", "BACKDROP", node.name.type === "Str" ? node.name.value : "", id);
          addBlock({
            id,
            opcode: "looks_switchbackdropto",
            next: null,
            parent: parentId,
            inputs: { BACKDROP: inp(menuId, menuId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "NextCostumeStmt": {
          addBlock({
            id,
            opcode: "looks_nextcostume",
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "NextBackdropStmt": {
          addBlock({
            id,
            opcode: "looks_nextbackdrop",
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "SetSizeStmt": {
          addBlock({
            id,
            opcode: "looks_setsizeto",
            next: null,
            parent: parentId,
            inputs: { SIZE: numInput(node.value, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ChangeSizeStmt": {
          addBlock({
            id,
            opcode: "looks_changesizeby",
            next: null,
            parent: parentId,
            inputs: { CHANGE: numInput(node.value, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ShowStmt": {
          addBlock({
            id,
            opcode: "looks_show",
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "HideStmt": {
          addBlock({
            id,
            opcode: "looks_hide",
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ClearEffectsStmt": {
          addBlock({
            id,
            opcode: "looks_cleargraphiceffects",
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ShowVarStmt": {
          const v = resolveVar(node.name);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.name.length,
              message: `Variable not found: ${node.name}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_showvariable",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { VARIABLE: { name: "VARIABLE", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "HideVarStmt": {
          const v = resolveVar(node.name);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.name.length,
              message: `Variable not found: ${node.name}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_hidevariable",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { VARIABLE: { name: "VARIABLE", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ShowListStmt": {
          const v = resolveVar(node.name);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.name.length,
              message: `List not found: ${node.name}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_showlist",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "HideListStmt": {
          const v = resolveVar(node.name);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.name.length,
              message: `List not found: ${node.name}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_hidelist",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Sound
        case "PlayStmt": {
          const sndName = node.sound.type === "Str" ? node.sound.value : "";
          const menuId = menuBlock("sound_sounds_menu", "SOUND_MENU", sndName, id);
          addBlock({
            id,
            opcode: "sound_play",
            next: null,
            parent: parentId,
            inputs: { SOUND_MENU: inp(menuId, menuId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "PlayUntilDoneStmt": {
          const sndName = node.sound.type === "Str" ? node.sound.value : "";
          const menuId = menuBlock("sound_sounds_menu", "SOUND_MENU", sndName, id);
          addBlock({
            id,
            opcode: "sound_playuntildone",
            next: null,
            parent: parentId,
            inputs: { SOUND_MENU: inp(menuId, menuId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "StopSoundsStmt": {
          addBlock({
            id,
            opcode: "sound_stopallsounds",
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Events
        case "BroadcastStmt": {
          const msgName = node.msg.type === "Str" ? node.msg.value : "";
          const msgId = resolveBroadcast(msgName);
          const shadowId = uid();
          addBlock({
            id: shadowId,
            opcode: "event_broadcast_menu",
            next: null,
            parent: id,
            inputs: {},
            fields: { BROADCAST_OPTION: { name: "BROADCAST_OPTION", value: msgName, id: msgId } },
            shadow: true,
            topLevel: false
          });
          addBlock({
            id,
            opcode: "event_broadcast",
            next: null,
            parent: parentId,
            inputs: { BROADCAST_INPUT: inp(shadowId, shadowId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "BroadcastWaitStmt": {
          const msgName = node.msg.type === "Str" ? node.msg.value : "";
          const msgId = resolveBroadcast(msgName);
          const shadowId = uid();
          addBlock({
            id: shadowId,
            opcode: "event_broadcast_menu",
            next: null,
            parent: id,
            inputs: {},
            fields: { BROADCAST_OPTION: { name: "BROADCAST_OPTION", value: msgName, id: msgId } },
            shadow: true,
            topLevel: false
          });
          addBlock({
            id,
            opcode: "event_broadcastandwait",
            next: null,
            parent: parentId,
            inputs: { BROADCAST_INPUT: inp(shadowId, shadowId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Variables
        case "SetVarStmt": {
          let v = resolveVar(node.varName);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.varName.length,
              message: `Variable not found: ${node.varName}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_setvariableto",
            next: null,
            parent: parentId,
            inputs: { VALUE: strInput(node.value, id) },
            fields: { VARIABLE: { name: "VARIABLE", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ChangeVarStmt": {
          const v = resolveVar(node.varName);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.varName.length,
              message: `Variable not found: ${node.varName}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_changevariableby",
            next: null,
            parent: parentId,
            inputs: { VALUE: numInput(node.value, id) },
            fields: { VARIABLE: { name: "VARIABLE", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ListAddStmt": {
          const v = resolveVar(node.listName);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.listName.length,
              message: `List not found: ${node.listName}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_addtolist",
            next: null,
            parent: parentId,
            inputs: { ITEM: strInput(node.item, id) },
            fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ListDeleteStmt": {
          const v = resolveVar(node.listName);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.listName.length,
              message: `List not found: ${node.listName}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_deleteoflist",
            next: null,
            parent: parentId,
            inputs: { INDEX: numInput(node.index, id) },
            fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ListInsertStmt": {
          const v = resolveVar(node.listName);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.listName.length,
              message: `List not found: ${node.listName}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_insertatlist",
            next: null,
            parent: parentId,
            inputs: { ITEM: strInput(node.item, id), INDEX: numInput(node.index, id) },
            fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ListReplaceStmt": {
          const v = resolveVar(node.listName);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.listName.length,
              message: `List not found: ${node.listName}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_replaceitemoflist",
            next: null,
            parent: parentId,
            inputs: { INDEX: numInput(node.index, id), ITEM: strInput(node.item, id) },
            fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Motion extras
        case "SetDirectionStmt": {
          addBlock({
            id,
            opcode: "motion_pointindirection",
            next: null,
            parent: parentId,
            inputs: { DIRECTION: numInput(node.degrees, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "PointTowardsStmt": {
          const tgtVal = node.target.type === "Str" ? node.target.value : "_mouse_";
          const menuId = menuBlock("motion_pointtowards_menu", "TOWARDS", tgtVal, id);
          addBlock({
            id,
            opcode: "motion_pointtowards",
            next: null,
            parent: parentId,
            inputs: { TOWARDS: inp(menuId, menuId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "GoToFrontStmt": {
          addBlock({
            id,
            opcode: "looks_gotofrontback",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { FRONT_BACK: { name: "FRONT_BACK", value: "front" } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "GoToBackStmt": {
          addBlock({
            id,
            opcode: "looks_gotofrontback",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { FRONT_BACK: { name: "FRONT_BACK", value: "back" } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "MoveForwardLayersStmt": {
          addBlock({
            id,
            opcode: "looks_goforwardbackwardlayers",
            next: null,
            parent: parentId,
            inputs: { NUM: numInput(node.layers, id) },
            fields: { FORWARD_BACKWARD: { name: "FORWARD_BACKWARD", value: "forward" } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "MoveBackwardLayersStmt": {
          addBlock({
            id,
            opcode: "looks_goforwardbackwardlayers",
            next: null,
            parent: parentId,
            inputs: { NUM: numInput(node.layers, id) },
            fields: { FORWARD_BACKWARD: { name: "FORWARD_BACKWARD", value: "backward" } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Looks effects
        case "SetEffectStmt": {
          const eff = node.effect.type === "Str" ? node.effect.value : "color";
          addBlock({
            id,
            opcode: "looks_seteffectto",
            next: null,
            parent: parentId,
            inputs: { VALUE: numInput(node.value, id) },
            fields: { EFFECT: { name: "EFFECT", value: eff } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ChangeEffectStmt": {
          const eff = node.effect.type === "Str" ? node.effect.value : "color";
          addBlock({
            id,
            opcode: "looks_changeeffectby",
            next: null,
            parent: parentId,
            inputs: { CHANGE: numInput(node.amount, id) },
            fields: { EFFECT: { name: "EFFECT", value: eff } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Sound extras
        case "SetVolumeStmt": {
          addBlock({
            id,
            opcode: "sound_setvolumeto",
            next: null,
            parent: parentId,
            inputs: { VOLUME: numInput(node.value, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ChangeVolumeStmt": {
          addBlock({
            id,
            opcode: "sound_changevolumeby",
            next: null,
            parent: parentId,
            inputs: { VOLUME: numInput(node.value, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Sensing extras
        case "AskAndWaitStmt": {
          addBlock({
            id,
            opcode: "sensing_askandwait",
            next: null,
            parent: parentId,
            inputs: { QUESTION: strInput(node.question, id) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ResetTimerStmt": {
          addBlock({
            id,
            opcode: "sensing_resettimer",
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "SetDragModeStmt": {
          const modeVal = node.mode.type === "Str" ? node.mode.value : "draggable";
          addBlock({
            id,
            opcode: "sensing_setdragmode",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { DRAG_MODE: { name: "DRAG_MODE", value: modeVal } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // List delete all
        case "ListDeleteAllStmt": {
          const v = resolveVar(node.listName);
          if (!v) {
            errors.push({
              line: node.line || 1,
              col: node.col || 1,
              len: node.listName.length,
              message: `List not found: ${node.listName}. Create it in Scratch first.`
            });
            return null;
          }
          addBlock({
            id,
            opcode: "data_deletealloflist",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { LIST: { name: "LIST", value: v.name, id: v.id } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Motion rotation style
        case "SetRotationStyleStmt": {
          const styleVal = node.style.type === "Str" ? node.style.value : "all around";
          addBlock({
            id,
            opcode: "motion_setrotationstyle",
            next: null,
            parent: parentId,
            inputs: {},
            fields: { STYLE: { name: "STYLE", value: styleVal } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // GlideTo (sprite)
        case "GlideToStmt": {
          const menuId = menuBlock("motion_glidesecstosprite_menu", "TO", node.target, id);
          addBlock({
            id,
            opcode: "motion_glidesecstosprite",
            next: null,
            parent: parentId,
            inputs: { SECS: numInput(node.secs, id), TO: inp(menuId, menuId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Switch backdrop and wait
        case "SwitchBackdropWaitStmt": {
          const menuId = menuBlock("looks_backdrops", "BACKDROP", node.name.type === "Str" ? node.name.value : "", id);
          addBlock({
            id,
            opcode: "looks_switchbackdroptoandwait",
            next: null,
            parent: parentId,
            inputs: { BACKDROP: inp(menuId, menuId) },
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Sound effects
        case "SetSoundEffectStmt": {
          const effVal = node.effect.type === "Str" ? node.effect.value.toUpperCase() : "PITCH";
          addBlock({
            id,
            opcode: "sound_seteffectto",
            next: null,
            parent: parentId,
            inputs: { VALUE: numInput(node.value, id) },
            fields: { SOUND_EFFECT: { name: "SOUND_EFFECT", value: effVal } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ChangeSoundEffectStmt": {
          const effVal = node.effect.type === "Str" ? node.effect.value.toUpperCase() : "PITCH";
          addBlock({
            id,
            opcode: "sound_changeeffectby",
            next: null,
            parent: parentId,
            inputs: { VALUE: numInput(node.value, id) },
            fields: { SOUND_EFFECT: { name: "SOUND_EFFECT", value: effVal } },
            shadow: false,
            topLevel: false
          });
          return id;
        }
        case "ClearSoundEffectsStmt": {
          addBlock({
            id,
            opcode: "sound_cleareffects",
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: false,
            topLevel: false
          });
          return id;
        }
        // Custom block call
        case "CallStmt": {
          if (node.name === "yield") {
            addBlock({
              id,
              opcode: "control_wait",
              next: null,
              parent: parentId,
              inputs: { DURATION: numInput({ type: "Num", value: 0 }, id) },
              fields: {},
              shadow: false,
              topLevel: false
            });
            return id;
          }
          const target = spriteName === "__stage__" ? vm.runtime.targets.find((t) => t.isStage) : vm.runtime.targets.find((t) => !t.isStage && t.sprite.name === spriteName);
          if (target) {
            const protoBlock = Object.values(target.blocks._blocks).find(
              (b) => b.opcode === "procedures_prototype" && b.mutation && b.mutation.proccode && b.mutation.proccode.split(" %")[0].trim() === node.name
            );
            if (protoBlock) {
              const argIds = JSON.parse(protoBlock.mutation.argumentids || "[]");
              const inputs = {};
              argIds.forEach((argId, i) => {
                if (node.args[i]) {
                  inputs[argId] = strInput(node.args[i], id);
                } else {
                  const emptyId = uid();
                  addBlock({
                    id: emptyId,
                    opcode: "text",
                    next: null,
                    parent: id,
                    inputs: {},
                    fields: { TEXT: { name: "TEXT", value: "" } },
                    shadow: true,
                    topLevel: false
                  });
                  inputs[argId] = inp(emptyId, emptyId);
                }
              });
              addBlock({
                id,
                opcode: "procedures_call",
                next: null,
                parent: parentId,
                inputs,
                fields: {},
                mutation: {
                  tagName: "mutation",
                  children: [],
                  proccode: protoBlock.mutation.proccode,
                  argumentids: protoBlock.mutation.argumentids,
                  warp: protoBlock.mutation.warp
                },
                shadow: false,
                topLevel: false
              });
              return id;
            }
          }
          errors.push({
            line: node.line || 1,
            col: node.col || 1,
            len: node.name.length,
            message: `Custom block not found: ${node.name}`
          });
          return null;
        }
        default:
          return null;
      }
    }
    for (const block of ast.blocks) {
      if (block.type !== "StructDecl") continue;
      const stage = vm.runtime.targets.find((t) => t.isStage);
      if (!stage) continue;
      for (const field of block.fields) {
        const varName = `${block.name}.${field}`;
        const exists = Object.values(stage.variables).some((v) => v.name === varName);
        if (!exists) stage.createVariable(uid(), varName, "");
      }
    }
    let scriptX = 50;
    for (const block of ast.blocks) {
      if (block.type === "StructDecl") {
      } else if (block.type === "OnBlock") {
        const hatId = uid();
        const hatBlock = genHat(block.hat, hatId, scriptX, spriteName === "__stage__");
        if (!hatBlock) {
          scriptX += 400;
          continue;
        }
        hatBlock.topLevel = true;
        hatBlock.x = scriptX;
        hatBlock.y = 50;
        const pendingThreshold = hatBlock._hatThreshold;
        delete hatBlock._hatThreshold;
        addBlock(hatBlock);
        if (pendingThreshold !== void 0) {
          blocks[hatId].inputs = { VALUE: numInput(pendingThreshold, hatId) };
        }
        const bodyFirst = genBody(block.body, hatId);
        if (bodyFirst) {
          blocks[hatId].next = bodyFirst;
          blocks[bodyFirst].parent = hatId;
        }
        scriptX += 400;
      } else if (block.type === "DefineBlock") {
        genDefineBlock(block, scriptX);
        scriptX += 400;
      } else if (block.type === "ScratchroutineStmt") {
        genScratchroutineStmt(block, scriptX);
        scriptX += 400;
      }
    }
    function genDefineBlock(node, scriptX2) {
      const defId = uid();
      const protoId = uid();
      const argNames = node.params;
      const argIds = argNames.map(() => uid());
      const proccode = node.name + (argNames.length > 0 ? " " + argNames.map(() => "%s").join(" ") : "");
      const argInputs = {};
      argIds.forEach((argId, i) => {
        const reporterId = uid();
        blocks[reporterId] = {
          id: reporterId,
          opcode: "argument_reporter_string_number",
          next: null,
          parent: protoId,
          inputs: {},
          fields: { VALUE: [argNames[i], null] },
          shadow: true,
          topLevel: false
        };
        argInputs[argId] = [1, reporterId];
      });
      blocks[protoId] = {
        id: protoId,
        opcode: "procedures_prototype",
        next: null,
        parent: defId,
        inputs: argInputs,
        fields: {},
        shadow: true,
        topLevel: false,
        mutation: {
          tagName: "mutation",
          children: [],
          proccode,
          argumentids: JSON.stringify(argIds),
          argumentnames: JSON.stringify(argNames),
          argumentdefaults: JSON.stringify(argNames.map(() => "")),
          warp: "false"
        }
      };
      blocks[defId] = {
        id: defId,
        opcode: "procedures_definition",
        next: null,
        parent: null,
        inputs: { custom_block: inp(protoId, protoId) },
        fields: {},
        shadow: false,
        topLevel: true,
        x: scriptX2,
        y: 50
      };
      const bodyFirst = genBody(node.body, defId);
      if (bodyFirst) {
        blocks[defId].next = bodyFirst;
        blocks[bodyFirst].parent = defId;
      }
    }
    return { blocks, errors };
  }
  function genHat(hat, id, scriptX, isStage) {
    const base = { id, next: null, parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: scriptX, y: 50 };
    switch (hat.event) {
      case "flag":
        return { ...base, opcode: "event_whenflagclicked" };
      case "click":
        return { ...base, opcode: isStage ? "event_whenstageclicked" : "event_whenthisspriteclicked" };
      case "clone":
        return { ...base, opcode: "control_start_as_clone" };
      case "key":
        return { ...base, opcode: "event_whenkeypressed", fields: { KEY_OPTION: { name: "KEY_OPTION", value: hat.key || "space" } } };
      case "receive":
        return { ...base, opcode: "event_whenbroadcastreceived", fields: { BROADCAST_OPTION: { name: "BROADCAST_OPTION", value: hat.msg || "" } } };
      case "backdrop":
        return { ...base, opcode: "event_whenbackdropswitchesto", fields: { BACKDROP: { name: "BACKDROP", value: hat.backdrop || "" } } };
      case "greaterThan": {
        const blocks_local = {};
        const shadowId = uid();
        blocks_local[shadowId] = {
          id: shadowId,
          opcode: "math_number",
          next: null,
          parent: id,
          inputs: {},
          fields: { NUM: { name: "NUM", value: "10" } },
          shadow: true,
          topLevel: false
        };
        return {
          ...base,
          opcode: "event_whengreaterthan",
          fields: { WHENGREATERTHANMENU: { name: "WHENGREATERTHANMENU", value: hat.sense } },
          _hatThreshold: hat.threshold
        };
      }
      default:
        return null;
    }
  }
  function compileSource(source, vm, spriteName) {
    const tokens = tokenize(source);
    const { ast, errors: parseErrors } = parse(tokens);
    if (parseErrors.length > 0) return { blocks: {}, errors: parseErrors };
    const { blocks, errors: codeErrors } = compile(ast, vm, spriteName);
    return { blocks, errors: codeErrors };
  }

  // src/main.js
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
