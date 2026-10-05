import test from 'node:test';
import assert from 'node:assert/strict';

import { tokenize } from '../src/compiler.js';
import { broadcastHintSites } from '../src/broadcast-hints.js';

const SOURCE = 'on receive "go" {\n    broadcast("next")\n    broadcastAndWait("done"\n    say("broadcast")\n}\non flag {\n    send("go")\n}';

test('hint sites sit after the closing parenthesis, or after the string when it is missing', () => {
    const sites = broadcastHintSites(tokenize(SOURCE), { lineCount: 8 });
    assert.deepEqual(sites.map(s => `${s.kind} ${s.msg} ${s.line}:${s.column}`), [
        'receive go 1:16',
        'send next 2:22',
        'send done 3:28',
        'send go 7:15',
    ]);
});

test('only sites inside the requested lines are returned, so repeated range requests never duplicate hints', () => {
    const tokens = tokenize(SOURCE);
    const visible = broadcastHintSites(tokens, { lineCount: 8, startLine: 2, endLine: 3 });
    assert.deepEqual(visible.map(s => s.msg), ['next', 'done']);
    const halves = [...broadcastHintSites(tokens, { lineCount: 8, startLine: 1, endLine: 4 }), ...broadcastHintSites(tokens, { lineCount: 8, startLine: 5, endLine: 8 })];
    assert.deepEqual(halves, broadcastHintSites(tokens, { lineCount: 8 }));
});

test('sites past the end of the document (appended header code) are skipped', () => {
    assert.deepEqual(broadcastHintSites(tokenize(SOURCE), { lineCount: 3 }).map(s => s.msg), ['go', 'next', 'done']);
});
