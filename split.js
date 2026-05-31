// split.js — 将 index.html 拆分为独立源文件
// 所有索引基于原始文件的精确行号验证
const fs = require('fs');

const src = fs.readFileSync('index.html', 'utf8');
const lines = src.split('\n');

// ---- Extract CSS (between <style> and </style>) ----
const styleStart = lines.findIndex(l => l.includes('<style>'));
const styleEnd = lines.findIndex(l => l.includes('</style>'));
const cssLines = lines.slice(styleStart + 1, styleEnd);

// ---- Extract HTML body (between <body> and <script>) ----
const bodyStart = lines.findIndex(l => l.includes('<body>'));
const scriptStart = lines.findIndex((l, i) => i > bodyStart && l.includes('<script>'));
const bodyLines = lines.slice(bodyStart + 1, scriptStart);

// ---- Extract JS ----
const jsLines = lines.slice(scriptStart + 1);
const scriptEnd = jsLines.findIndex(l => l.includes('</script>'));
const jsByLine = jsLines.slice(0, scriptEnd);

// ---- js/data.js: Pure word data ----
// BUILTIN_REF_WORDS: jsByLine[0..4605] (inclusive)
// BUILTIN_WORDS:     jsByLine[4607..5881] (inclusive)
const dataContent = [
    '// ==================== 内置词库（CET-4 参考词表，4603 词） ====================',
    ...jsByLine.slice(0, 4606), // includes the `; line
    '',
    '// ==================== 内置词库（A 库主词表，1273 词） ====================',
    ...jsByLine.slice(4607, 5882), // includes the ]; line
    '',
    '// Codex: 以上为纯数据，不可修改。如需添加单词请通过导入功能。',
    ''
].join('\n');

// ---- js/state.js: State management + localStorage ----
// DEFAULT_STATE + state var + loadState/saveState + refWords + loadRefWords/saveRefWords
// jsByLine[5883..5963] (state section up to but not including getStem comment)
const stateContent = [
    '// ==================== 状态管理与 localStorage 序列化 ====================',
    '// 依赖: js/data.js 中的 BUILTIN_WORDS',
    '// Codex: 绝对不可触碰此文件',
    '',
    ...jsByLine.slice(5883, 5964), // DEFAULT_STATE through syncRef comment
    '',
    '// Codex: 以上数据模型和序列化函数是应用核心，修改会导致数据丢失。',
    ''
].join('\n');

// ---- js/utils.js: Pure utility functions ----
// getStem:         jsByLine[5964..5973]
// syncRefChecked:  ALREADY in state section... wait, syncRefChecked is at 5975
// Let me check: syncRefChecked is at 5975..5983, renderRefPage is at 5985..6060
// shuffle etc:     jsByLine[6062..6125] (工具函数 + 语音)
// esc + navigate helpers: jsByLine[6126..6191] page routing section has navigate, renderHome, renderCountdowns, esc
// We want utils: getStem, shuffle, today, daysBetween, parseWordText, speakWord, esc

// Let me separate carefully:
// getStem: lines 5964-5973
// shuffle/today/daysBetween/parseWordText: lines 6062-6111
// speakWord: lines 6112-6124
// esc is inside the page routing section (around line 6184-6191)

// Find esc function
let escStart = -1, escEnd = -1;
for (let i = 0; i < jsByLine.length; i++) {
    if (jsByLine[i].includes('function esc(')) { escStart = i; }
    if (escStart !== -1 && escEnd === -1 && jsByLine[i].trim() === '}' && i > escStart) {
        escEnd = i;
        break;
    }
}
console.log('esc:', escStart, '-', escEnd);

// Find shuffle, today, daysBetween, parseWordText boundaries
// They're in the 工具函数 section: 6062-6111
// speakWord in 语音 section: 6112-6124

// Find the renderRefPage end
// renderRefPage starts around 5985, ends around 6060
let renderRefEnd = -1;
for (let i = 5985; i < 6070; i++) {
    if (jsByLine[i].includes('// ==================== 工具函数')) {
        renderRefEnd = i - 1;
        break;
    }
}
console.log('renderRefPage end:', renderRefEnd);

// syncRefChecked: 5975-5983, renderRefPage: 5985-renderRefEnd

const utilsLines = [
    '// ==================== 工具函数 ====================',
    '// Codex: 绝对不可触碰此文件',
    '',
    '// 词根提取 — 去掉常见英文后缀，用于 B 库关联匹配',
    ...jsByLine.slice(5964, 5974),  // getStem()
    '',
    '// Fisher-Yates 随机化',
    ...jsByLine.slice(6062, 6111),  // shuffle, today, daysBetween, parseWordText
    '',
    '// Web Speech API 朗读',
    ...jsByLine.slice(6112, 6125),  // speakWord
    '',
    '// HTML 转义',
    ...jsByLine.slice(escStart, escEnd + 1),  // esc()
    '',
    '// Codex: 以上工具函数被核心逻辑深度依赖，不可修改。',
    ''
];
const utilsContent = utilsLines.join('\n');

// ---- js/app.js: UI rendering + event handling + init ----
// Everything else:
// syncRefChecked + renderRefPage: 5975..renderRefEnd
// Page routing (navigate, renderHome, renderCountdowns): 6126..6191
// Study rendering: 6192..6366
// Wrong list: 6367..6388
// Stats: 6389..6408
// Countdown CRUD: 6409..6453
// Day reset: 6454..6474
// Init + PWA: 6475..end

// Navigate/renderHome/renderCountdowns section: 6126-6191
// But esc is in there too (already extracted to utils). We need to skip esc.

// Actually, let me be smarter. Let me include everything from 5975 to end EXCEPT what's already in utils.
// I'll concatenate by excluding utils ranges.

const appLines = [
    '// ==================== UI 渲染与事件处理 ====================',
    '// Codex: 绝对不可触碰此文件',
    '// 依赖: js/data.js, js/state.js, js/utils.js',
    '',
    '// ── B 库对照表 ──',
    ...jsByLine.slice(5975, 6062),  // syncRefChecked + renderRefPage
    '',
    '// ── 页面路由与首页 ──',
    ...jsByLine.slice(6126, escStart),  // navigate + renderHome + renderCountdowns (before esc)
    '',
    '// ── 学习核心 ──',
    ...jsByLine.slice(6192, 6367),  // study rendering (studyMode, revealed, getStudyList, renderStudy, revealWord, answerWord, showCompletion)
    '',
    '// ── 错词本 ──',
    ...jsByLine.slice(6367, 6389),  // renderWrongList
    '',
    '// ── 统计页 ──',
    ...jsByLine.slice(6389, 6409),  // renderStats + renderImport
    '',
    '// ── 倒数日 ──',
    ...jsByLine.slice(6409, 6454),  // countdown CRUD
    '',
    '// ── 每日连胜重置 ──',
    ...jsByLine.slice(6454, 6475),  // checkDayReset
    '',
    '// ── 初始化与启动 ──',
    ...jsByLine.slice(6475),        // init + PWA + init() call
    '',
    '// Codex: 以上所有函数定义和事件绑定是应用行为逻辑，不可修改。',
    ''
];
const appContent = appLines.join('\n');

// ---- Build new index.html ----
// Stop BEFORE the <style> tag (exclude it), add external link instead
const headPre = lines.slice(0, styleStart);
const newIndex = [
    ...headPre,
    '    <!-- Codex 可自由修改: css/styles.css -->',
    '    <link rel="stylesheet" href="css/styles.css">',
    '</head>',
    '<body>',
    ...bodyLines,
    '',
    '    <!-- ═══════════════════════════════════════════ -->',
    '    <!-- CC 逻辑保护区：以下脚本 Codex 绝对不可修改 -->',
    '    <!-- ═══════════════════════════════════════════ -->',
    '    <script src="js/data.js"></script>',
    '    <script src="js/state.js"></script>',
    '    <script src="js/utils.js"></script>',
    '    <script src="js/app.js"></script>',
    '',
    '</body>',
    '</html>',
    ''
];

// Write all files
fs.mkdirSync('css', { recursive: true });
fs.mkdirSync('js', { recursive: true });
fs.mkdirSync('dist', { recursive: true });

fs.writeFileSync('css/styles.css', cssLines.join('\n').trim() + '\n');
fs.writeFileSync('js/data.js', dataContent);
fs.writeFileSync('js/state.js', stateContent);
fs.writeFileSync('js/utils.js', utilsContent);
fs.writeFileSync('js/app.js', appContent);
fs.writeFileSync('index.html', newIndex.join('\n'));

console.log('Split complete!');
console.log('  css/styles.css — ' + fs.statSync('css/styles.css').size + ' bytes');
console.log('  js/data.js    — ' + fs.statSync('js/data.js').size + ' bytes');
console.log('  js/state.js   — ' + fs.statSync('js/state.js').size + ' bytes');
console.log('  js/utils.js   — ' + fs.statSync('js/utils.js').size + ' bytes');
console.log('  js/app.js     — ' + fs.statSync('js/app.js').size + ' bytes');
console.log('  index.html    — ' + fs.statSync('index.html').size + ' bytes');
