const esbuild = require('esbuild');
const manifestPlugin = require('esbuild-plugin-manifest')

esbuild.build({
    entryPoints: [
        'scripts/control_bar.js',
        'scripts/file_resume.js',
        'tools/page_browser.js',
        'tools/project_manager/show_all_good_word_suggestions.js',
        'tools/project_manager/show_word_context.js',
        'tools/proofers/proof_image.js',
        'tools/proofers/previewControl.js',
    ],
    bundle: true,
    splitting: true,
    format: 'esm',
    outdir: 'dist/',
    plugins: [manifestPlugin()],
    target: [
        'es6',
        'chrome61',
        'firefox60',
        'safari11',
    ],
}).catch((e) => console.error(e.message))
