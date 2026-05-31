// ==================== 状态管理与 localStorage 序列化 ====================
// 依赖: js/data.js 中的 BUILTIN_WORDS
// Codex: 绝对不可触碰此文件

// ==================== 状态 ====================
const DEFAULT_STATE = {
    words: BUILTIN_WORDS,
    order: [],
    index: 0,
    wrong: {},
    stats: {},
    countdowns: [],
    lastDate: '',
    streak: 0,
    roundResults: []
};

let state = {};

function loadState(){
    try{
        const raw = localStorage.getItem('vm_state');
        if(raw){
            const saved = JSON.parse(raw);
            // 合并默认值，避免旧版本缺少字段
            state = Object.assign({}, DEFAULT_STATE, saved);
            // 确保 words 至少是空数组
            if(!Array.isArray(state.words)) state.words = [];
            if(!Array.isArray(state.order)) state.order = [];
            if(typeof state.index !== 'number') state.index = 0;
            if(!state.wrong || typeof state.wrong !== 'object') state.wrong = {};
            if(!state.stats || typeof state.stats !== 'object') state.stats = {};
            if(!Array.isArray(state.countdowns)) state.countdowns = [];
            if(typeof state.lastDate !== 'string') state.lastDate = '';
            if(typeof state.streak !== 'number') state.streak = 0;
            if(!Array.isArray(state.roundResults)) state.roundResults = [];
        } else {
            state = JSON.parse(JSON.stringify(DEFAULT_STATE));
            // 首次使用：生成乱序
            state.order = shuffle(state.words.map((_,i)=>i));
            saveState();
        }
    }catch(e){
        state = JSON.parse(JSON.stringify(DEFAULT_STATE));
        state.order = shuffle(state.words.map((_,i)=>i));
    }
}

function saveState(){
    try{
        localStorage.setItem('vm_state', JSON.stringify(state));
    }catch(e){
        // localStorage 满，尝试清理旧数据
        alert('存储空间不足，请清理浏览器数据');
    }
}

// ==================== 参考词库 (B) ====================
let refWords = [];

function loadRefWords(){
    try{
        const raw = localStorage.getItem('vm_ref_words');
        if(raw){
            refWords = JSON.parse(raw);
            if(!Array.isArray(refWords)) refWords = [];
        }
    }catch(e){ refWords = []; }
    // 首次使用：加载内置 CET-4 词库到 B 库
    if(refWords.length===0 && typeof BUILTIN_REF_WORDS!=='undefined'){
        const lines = BUILTIN_REF_WORDS.trim().split('\n');
        for(const line of lines){
            const m = line.match(/^([a-zA-Z\-]+)\s+(.+)$/);
            if(m) refWords.push({en:m[1],zh:m[2],inMain:false});
        }
        saveRefWords();
    }
}

function saveRefWords(){
    try{ localStorage.setItem('vm_ref_words', JSON.stringify(refWords)); }
    catch(e){ alert('存储空间不足'); }
}

// 简单词根提取：去掉常见后缀

// Codex: 以上数据模型和序列化函数是应用核心，修改会导致数据丢失。
