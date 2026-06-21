import { LS_INJ_KEY } from './constants.js';

export const injectedBlockIds = new Map(); // spriteName → Set<id>

export function persistInjectedIds(spriteName) {
    const ids = injectedBlockIds.get(spriteName);
    try {
        if (ids && ids.size > 0) {
            localStorage.setItem(`${LS_INJ_KEY}-${spriteName}`, JSON.stringify([...ids]));
        } else {
            localStorage.removeItem(`${LS_INJ_KEY}-${spriteName}`);
        }
    } catch (_) {}
}

export function restoreInjectedIds(spriteName) {
    if (injectedBlockIds.has(spriteName)) return;
    try {
        const raw = localStorage.getItem(`${LS_INJ_KEY}-${spriteName}`);
        if (raw) injectedBlockIds.set(spriteName, new Set(JSON.parse(raw)));
    } catch (_) {}
}
