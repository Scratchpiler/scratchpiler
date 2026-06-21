import { currentSpriteContext, currentVM, monacoEditor } from "./editor.js";

// Constants

import { MONACO_CDN, LANG_ID, LS_KEY, LS_INJ_KEY } from './constants.js';

import { acquireVM, scratchIndex, reindex } from "./vm.js";

import { loadMonaco } from "./monaco.js";
import { registerLanguage } from "./language.js";

import { buildOverlayDOM, buildTriggerButton, snGetRealActions, buildSearchNowhereDOM, snSwitchTab, snUpdateFocus, openSearchNowhere, closeSearchNowhere, snEscHtml, snHighlight, snMakeResultEl, snRenderSection, snEmptyState, snGetSpriteResults, snGetBlockResults, snRenderResults, logToOutput, flashCompileBtn, openSpritePicker, closeSpritePicker, spPickerRender, spPickerMoveFocus, setupSpritePicker, showSpriteContextMenu, closeSpriteContextMenu, setupSidebarResize, setupOutputPanel } from "./ui-dom.js";


export { compileSource, tokenize, parse, lint, typeCheckDiagnostics, uid } from "./compiler.js";

export { decompile } from "./decompiler.js";

export { formatSource, injectBlocks } from "./injector.js";

import { bootstrap } from "./editor.js";
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
} else {
    bootstrap();
}
