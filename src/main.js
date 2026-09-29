export { compileSource, tokenize, parse, lint, typeCheckDiagnostics, uid } from "./compiler.js";

export { compileSourceWithHeaders, expand } from "./preprocess.js";
export { listHeaders, readHeader, writeHeader, deleteHeader, renameHeader, HEADER_NAME_RE } from "./headers.js";

export { decompile } from "./decompiler.js";

export { formatSource, injectBlocks } from "./injector.js";

import { bootstrap } from "./editor.js";
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
} else {
    bootstrap();
}
