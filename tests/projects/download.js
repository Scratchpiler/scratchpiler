import fs from 'node:fs/promises';
import path from 'node:path';

const directory = process.argv[2] ?? '/tmp/scratchpiler-projects';
const ids = process.argv.length > 3 ? process.argv.slice(3).map(Number) : [10128407, 60917032, 612229554];
await fs.mkdir(directory, { recursive: true });
const manifest = [];
for (const id of ids) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Invalid project ID: ${id}`);
    const metadataResponse = await fetch(`https://api.scratch.mit.edu/projects/${id}`);
    if (!metadataResponse.ok) throw new Error(`Project ${id}: metadata HTTP ${metadataResponse.status}`);
    const metadata = await metadataResponse.json();
    const response = await fetch(`https://projects.scratch.mit.edu/${id}?token=${encodeURIComponent(metadata.project_token)}`);
    if (!response.ok) throw new Error(`Project ${id}: data HTTP ${response.status}`);
    const text = await response.text();
    const project = JSON.parse(text);
    await fs.writeFile(path.join(directory, `${id}.json`), text);
    const entry = { id, title: metadata.title, author: metadata.author.username, url: `https://scratch.mit.edu/projects/${id}/`,
        targets: project.targets.length, blocks: project.targets.reduce((sum, target) => sum + Object.keys(target.blocks).length, 0), bytes: Buffer.byteLength(text) };
    manifest.push(entry);
    console.log(JSON.stringify(entry));
}
await fs.writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
