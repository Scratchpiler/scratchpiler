const SEND_WORDS = new Set(['broadcast', 'broadcastAndWait', 'send', 'sendAndWait']);
const isWord = (token, word) => token && token.type !== 'STR' && token.value === word;

export function broadcastHintSites(tokens, { lineCount, startLine = 1, endLine = lineCount }) {
    const sites = [];
    for (let i = 0; i + 2 < tokens.length; i++) {
        const [word, next, str] = [tokens[i], tokens[i + 1], tokens[i + 2]];
        if (str.type !== 'STR' || str.endLine !== str.line || str.line < startLine || str.line > Math.min(endLine, lineCount)) continue;
        if (word.type !== 'STR' && SEND_WORDS.has(word.value) && next.type === '(') {
            const close = tokens[i + 3]?.type === ')' && tokens[i + 3].line === str.line ? tokens[i + 3] : str;
            sites.push({ kind: 'send', msg: str.value, line: str.line, column: close.endCol });
        } else if (isWord(word, 'on') && isWord(next, 'receive')) {
            sites.push({ kind: 'receive', msg: str.value, line: str.line, column: str.endCol });
        }
    }
    return sites;
}
