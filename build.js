// build.js — 将拆分后的源文件合并为单文件 dist/index.html
// 用于 GitHub Pages 部署，保持单文件部署方式不变
const fs = require('fs');
const path = require('path');

// Read component files — normalize line endings to \n
function read(f) { return fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'); }
const css = read('css/styles.css');
const dataJs = read('js/data.js');
const stateJs = read('js/state.js');
const utilsJs = read('js/utils.js');
const appJs = read('js/app.js');
const shellHtml = read('index.html');

// Combine JS in dependency order
const combinedJs = [
    '// ==================== CC 逻辑保护区 ====================',
    '// 此文件由 build.js 自动合并生成',
    '// 源文件: js/data.js, js/state.js, js/utils.js, js/app.js',
    '',
    dataJs,
    stateJs,
    utilsJs,
    appJs,
    '',
    '// ==================== END ====================',
    ''
].join('\n');

// Inline CSS: replace external link with <style> block
let output = shellHtml.replace(
    /<link rel="stylesheet" href="css\/styles\.css">/,
    '<style>\n' + css + '\n</style>'
);

// Inline JS: replace the 4 source script tags with a single combined <script>
output = output.replace(
    /<script src="js\/data\.js"><\/script>\s*<script src="js\/state\.js"><\/script>\s*<script src="js\/utils\.js"><\/script>\s*<script src="js\/app\.js"><\/script>/,
    '<script>\n' + combinedJs + '\n</script>'
);

// Replace Blob URL manifest injection with static file reference (iOS compatible)
output = output.replace(
    /<script>\s*\(function\(\)\{\s*var m='[\s\S]*?}\)\(\);\s*<\/script>/,
    '<link rel="manifest" href="manifest.json">'
);

// Ensure dist directory exists
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', output);

// Copy built file to root for GitHub Pages deployment
fs.copyFileSync('dist/index.html', 'index.html');
console.log('  index.html — deployed to root for GitHub Pages');

// Copy manifest and service worker to root for GitHub Pages
if (fs.existsSync('manifest.json')) {
    fs.copyFileSync('manifest.json', 'dist/manifest.json');
    console.log('  manifest.json — synced');
}
if (fs.existsSync('sw.js')) {
    fs.copyFileSync('sw.js', 'dist/sw.js');
    fs.copyFileSync('sw.js', 'sw.js');  // ensure root has latest
    console.log('  sw.js — synced');
}

// Verify
const size = fs.statSync('dist/index.html').size;
console.log('Build complete!');
console.log('  dist/index.html — ' + size + ' bytes (' + (size / 1024).toFixed(0) + ' KB)');

// Quick sanity: check key patterns are present
const checks = [
    ['<link rel="stylesheet"', false],  // should NOT exist (inlined)
    ['<style>', true],                   // should exist (inlined CSS)
    ['<script src="', false],            // should NOT exist (all inlined)
    ['<script>', true],                  // should exist (combined JS)
    ['BUILTIN_REF_WORDS', true],
    ['BUILTIN_WORDS', true],
    ['DEFAULT_STATE', true],
    ['function loadState', true],
    ['function getStem', true],
    ['function shuffle', true],
    ['function parseWordText', true],
    ['function answerWord', true],
    ['function init', true],
    ['init();', true],
    ['navigator.serviceWorker.register', true],  // Service Worker registered for offline PWA
    ['<!DOCTYPE html>', true],
    ['</html>', true],
];

let allPass = true;
for (const [pattern, shouldExist] of checks) {
    const found = output.includes(pattern);
    const pass = found === shouldExist;
    if (!pass) {
        console.log('  FAIL: "' + pattern.substring(0, 50) + '" ' + (shouldExist ? 'MISSING' : 'FOUND (should not exist)'));
        allPass = false;
    }
}

if (allPass) console.log('  All integrity checks passed!');
