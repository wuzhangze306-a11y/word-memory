// ==================== 工具函数 ====================
// Codex: 绝对不可触碰此文件

// 词根提取 — 去掉常见英文后缀，用于 B 库关联匹配
function getStem(word){
    const suffixes = ['tion','sion','ment','ness','ful','less','able','ible','ous','ive','ing','ed','er','est','ly','al','ic','ist','ism','ship','hood','ty','ity','ize','ise','en','es','s','ure','age','ance','ence','ant','ent','ory','ary','dom'];
    const w = word.toLowerCase();
    for(const s of suffixes){
        if(w.endsWith(s) && w.length - s.length >= 3){
            return w.slice(0, -s.length);
        }
    }
    return w;
}

// Fisher-Yates 随机化
// ==================== 工具函数 ====================
function shuffle(arr){
    const a = [...arr];
    for(let i=a.length-1;i>0;i--){
        const j = Math.floor(Math.random()*(i+1));
        [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
}

function today(){
    const d = new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function daysBetween(d1,d2){
    const a = new Date(d1); const b = new Date(d2);
    return Math.floor((b-a)/(1000*60*60*24));
}

// ==================== 解析文本 ====================
function parseWordText(text){
    // 移除 PDF 页面标记
    text = text.replace(/--\s*\d+\s*of\s*\d+\s*--/g, '');
    // 移除表头行
    const skip = /^(姓名|日期|第.*课|词数|第\d+天|复习|日期\s*\d|遗忘|词数)[：:\s]/;
    const lines = text.split(/[\n\r]+/);
    const cleaned = [];
    for(const line of lines){
        const t = line.trim();
        if(!t) continue;
        if(skip.test(t)) continue;
        if(/^(复习|遗忘|词数)$/.test(t)) continue;
        if(/^[\d\-]+\s+[\d\-]+/.test(t)) continue; // 日期行 05-25 05-26...
        cleaned.push(t);
    }
    const joined = cleaned.join(' ').replace(/\s+/g,' ').trim();
    // 提取 English-Chinese 对：字母单词 + 空格 + 直到下一个字母单词之前的内容
    const re = /([a-zA-Z]+)\s+(.+?)(?=\s+[a-zA-Z]+\s|$)/g;
    const entries = [];
    let m;
    while((m=re.exec(joined))!==null){
        const zh = m[2].trim();
        if(/[一-鿿]/.test(zh)){
            entries.push({en:m[1],zh});
        }
    }
    return entries;
}

// Web Speech API 朗读
// ==================== 语音 ====================
function speakWord(word){
    if(!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.85;
    // 尝试获取英语语音
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v=>v.lang.startsWith('en'));
    if(enVoice) u.voice = enVoice;
    window.speechSynthesis.speak(u);
}

// HTML 转义
function esc(s){
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// Codex: 以上工具函数被核心逻辑深度依赖，不可修改。
