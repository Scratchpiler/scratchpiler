import { MONACO_CDN } from "./constants.js";

export function loadMonaco(callback) {
    unsafeWindow.MonacoEnvironment = {
        getWorkerUrl() {
            const blob = new Blob(
                [`importScripts('${MONACO_CDN}/vs/base/worker/workerMain.js');`],
                { type: 'application/javascript' }
            );
            return URL.createObjectURL(blob);
        }
    };

    const _req = unsafeWindow.require;
    const _def = unsafeWindow.define;

    const script = document.createElement('script');
    script.src = `${MONACO_CDN}/vs/loader.js`;
    script.onload = () => {
        unsafeWindow.require.config({ paths: { vs: `${MONACO_CDN}/vs` } });
        unsafeWindow.require(['vs/editor/editor.main'], () => {
            unsafeWindow.require = _req;
            unsafeWindow.define  = _def;
            callback(unsafeWindow.monaco);
        });
    };
    document.head.appendChild(script);
}
