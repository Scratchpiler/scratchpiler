import * as esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function build() {
    const isWatch = process.argv.includes('--watch');
    const isProd  = process.argv.includes('--prod');

    const [metaContent, pkgRaw] = await Promise.all([
        fs.readFile(path.join(__dirname, 'src', 'meta.js'), 'utf-8'),
        fs.readFile(path.join(__dirname, 'package.json'), 'utf-8'),
    ]);

    const { version } = JSON.parse(pkgRaw);
    const banner = metaContent.replace(/(@version\s+)\S+/, `$1${version}`);

    const ctx = await esbuild.context({
        entryPoints: ['src/main.js'],
        bundle: true,
        outfile: 'scratchpiler.user.js',
        format: 'iife',
        banner: { js: banner },
        loader: { '.css': 'text', '.html': 'text' },
        sourcemap: isWatch ? 'inline' : false,
        minifyWhitespace: isProd,
        minifySyntax: isProd,
    });

    if (isWatch) {
        await ctx.watch();
        console.log(`Watching for changes… [v${version}]`);
    } else {
        await ctx.rebuild();
        console.log(`Build complete. [v${version}${isProd ? ', prod/minified' : ''}]`);
        await ctx.dispose();
    }
}

build().catch((e) => {
    console.error(e);
    process.exit(1);
});
