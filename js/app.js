// ==================== UI 渲染与事件处理 ====================
// Codex: 绝对不可触碰此文件
// 依赖: js/data.js, js/state.js, js/utils.js

// ── B 库对照表 ──
function syncRefChecked(){
    const mainSet = new Set(state.words.map(w=>w.en.toLowerCase()));
    let changed = false;
    for(const r of refWords){
        const inMain = mainSet.has(r.en.toLowerCase());
        if(r.inMain !== inMain){ r.inMain = inMain; changed = true; }
    }
    if(changed) saveRefWords();
}

function renderRefPage(){
    loadRefWords();
    syncRefChecked();
    const listEl = document.getElementById('ref-list');
    const emptyEl = document.getElementById('ref-empty');
    const coverageEl = document.getElementById('ref-coverage');

    if(refWords.length===0){
        listEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        coverageEl.textContent = '';
        return;
    }
    emptyEl.classList.add('hidden');

    // 构建 A 库词根集合
    const mainStems = new Set();
    for(const w of state.words){
        mainStems.add(getStem(w.en));
    }

    // 标记关联词：未收录但其词根已被 A 库覆盖
    for(const r of refWords){
        if(!r.inMain && mainStems.has(getStem(r.en))){
            r._related = true;
        } else {
            r._related = false;
        }
    }

    const checked = refWords.filter(r=>r.inMain).length;
    const related = refWords.filter(r=>r._related).length;
    coverageEl.textContent = `已覆盖 ${checked}/${refWords.length}` + (related>0 ? ` (+${related} 关联)` : '');

    // 按首字母分组
    const groups = {};
    for(const r of refWords){
        const letter = r.en[0].toUpperCase();
        if(!groups[letter]) groups[letter] = {checked:[],related:[],unchecked:[]};
        if(r.inMain) groups[letter].checked.push(r);
        else if(r._related) groups[letter].related.push(r);
        else groups[letter].unchecked.push(r);
    }
    const letters = Object.keys(groups).sort();

    let html = '';
    for(const letter of letters){
        const g = groups[letter];
        const total = g.checked.length + g.related.length + g.unchecked.length;
        html += `<div class="ref-group">
            <div class="ref-group-header"><span class="ref-letter">${letter}</span><span class="ref-count">${g.checked.length}/${total}</span></div>`;
        if(g.checked.length>0){
            html += `<div class="ref-subsection"><div class="ref-subtitle">已收录 (${g.checked.length})</div>`;
            for(const w of g.checked.sort((a,b)=>a.en.localeCompare(b.en))){
                html += `<div class="ref-word checked"><span class="ref-check">&#10003;</span><span class="ref-en">${esc(w.en)}</span><span class="ref-zh">${esc(w.zh)}</span></div>`;
            }
            html += `</div>`;
        }
        if(g.related.length>0){
            html += `<div class="ref-subsection"><div class="ref-subtitle" style="color:var(--purple)">关联词根 (${g.related.length})</div>`;
            for(const w of g.related.sort((a,b)=>a.en.localeCompare(b.en))){
                html += `<div class="ref-word related"><span class="ref-check">~</span><span class="ref-en">${esc(w.en)}</span><span class="ref-zh">${esc(w.zh)}</span></div>`;
            }
            html += `</div>`;
        }
        if(g.unchecked.length>0){
            html += `<div class="ref-subsection"><div class="ref-subtitle">未收录 (${g.unchecked.length})</div>`;
            for(const w of g.unchecked.sort((a,b)=>a.en.localeCompare(b.en))){
                html += `<div class="ref-word unchecked"><span class="ref-check"></span><span class="ref-en">${esc(w.en)}</span><span class="ref-zh">${esc(w.zh)}</span></div>`;
            }
            html += `</div>`;
        }
        html += `</div>`;
    }
    listEl.innerHTML = html;
}


// ── 页面路由与首页 ──
// ==================== 页面路由 ====================
let currentPage = 'home';

function navigate(page){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const el = document.getElementById('page-'+page);
    if(el) el.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b=>{
        b.classList.toggle('active', b.dataset.page===page);
    });
    currentPage = page;
    if(page==='home') renderHome();
    if(page==='study') renderStudy();
    if(page==='wrong') renderWrongList();
    if(page==='stats') renderStats();
    if(page==='import') renderImport();
    if(page==='ref') renderRefPage();
}

// ==================== 主页渲染 ====================
function renderHome(){
    checkDayReset();
    const td = today();
    const ds = state.stats[td] || {tested:0,correct:0};
    document.getElementById('stat-tested').textContent = ds.tested;
    document.getElementById('stat-rate').textContent = ds.tested>0 ? Math.round(ds.correct/ds.tested*100)+'%' : '--%';
    document.getElementById('stat-wrong').textContent = Object.keys(state.wrong).length;
    // streak badge
    const badge = document.getElementById('streak-badge');
    if(state.streak > 1){
        badge.innerHTML = '<span class="streak-fire">&#9650;</span> 连续 '+state.streak+' 天';
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
    renderCountdowns();
    const total = state.words.length;
    document.getElementById('word-count-info').textContent = total>0 ? `词库共 ${total} 个单词` : '尚未导入单词';
}

function renderCountdowns(){
    const list = document.getElementById('countdown-list');
    const td = today();
    list.innerHTML = state.countdowns.map((cd,i)=>{
        const days = daysBetween(td, cd.date);
        let dsText, dsColor;
        if(days>0){dsText=days+'天';dsColor='var(--blue)';}
        else if(days===0){dsText='今天';dsColor='var(--green)';}
        else{dsText='已过'+(Math.abs(days))+'天';dsColor='var(--text3)';}
        return `<div class="countdown-item" data-cd="${i}">
            <div><div class="countdown-name">${esc(cd.name)}</div><div class="countdown-date">${cd.date}</div></div>
            <div class="countdown-days" style="color:${dsColor}">${dsText}</div>
        </div>`;
    }).join('');
    // 点击编辑
    list.querySelectorAll('.countdown-item').forEach(el=>{
        el.addEventListener('click',()=>editCountdown(parseInt(el.dataset.cd)));
    });
}


// ── 学习核心 ──
// ==================== 学习渲染 ====================
let studyMode = 'normal'; // 'normal' | 'wrong-review'
let revealed = false;

function getStudyList(){
    if(studyMode==='wrong-review'){
        return Object.values(state.wrong);
    }
    return state.order.map(i=>state.words[i]);
}

function renderStudy(){
    document.querySelector('.card-flip-inner').classList.remove('flipped');
    const list = getStudyList();
    const total = list.length;
    const idx = state.index;
    const dotsEl = document.getElementById('progress-dots');
    const card = document.getElementById('word-card');
    card.classList.remove('flash-green','shake');

    if(total===0){
        document.getElementById('word-en').textContent = '没有单词';
        document.getElementById('word-zh').classList.add('invisible');
        document.getElementById('word-zh').textContent = '';
        document.getElementById('btn-reveal').classList.add('hidden');
        document.getElementById('answer-btns').classList.add('hidden');
        document.getElementById('btn-speak').classList.add('hidden');
        dotsEl.innerHTML = '';
        document.getElementById('progress-text').textContent = '';
        document.getElementById('study-mode-label').textContent = studyMode==='wrong-review' ? '错词复习' : '学习';
        return;
    }
    if(idx >= total){
        showCompletion();
        return;
    }
    document.getElementById('btn-speak').classList.remove('hidden');
    const word = list[idx];
    revealed = false;
    document.getElementById('word-en').textContent = word.en;
    document.getElementById('word-zh').classList.add('invisible');
    document.getElementById('word-zh').textContent = word.zh;
    document.getElementById('btn-reveal').classList.remove('hidden');
    document.getElementById('answer-btns').classList.add('hidden');
    document.getElementById('progress-text').textContent = (idx+1)+' / '+total;
    document.getElementById('study-mode-label').textContent = studyMode==='wrong-review' ? '错词复习' : '学习';
    // 渲染圆点指示器
    dotsEl.innerHTML = '';
    for(let i=0;i<total;i++){
        const dot = document.createElement('span');
        dot.className = 'dot';
        if(i<idx){
            dot.classList.add(state.roundResults[i]==='correct'?'correct':'wrong');
        } else if(i===idx){
            dot.classList.add('active');
        }
        dotsEl.appendChild(dot);
    }
}

// ==================== 学习操作 ====================
function revealWord(){
    revealed = true;
    document.getElementById('word-zh').classList.remove('invisible');
    document.getElementById('btn-reveal').classList.add('hidden');
    document.getElementById('answer-btns').classList.remove('hidden');
    document.querySelector('.card-flip-inner').classList.add('flipped');
}

function answerWord(correct){
    if(!revealed) return;
    revealed = false; // 防止重复点击
    checkDayReset();
    const td = today();
    if(!state.stats[td]) state.stats[td] = {tested:0,correct:0};
    state.stats[td].tested++;

    // 记录本轮结果
    state.roundResults[state.index] = correct?'correct':'wrong';

    let removed = false;
    if(correct){
        state.stats[td].correct++;
        if(studyMode==='wrong-review'){
            const list = Object.values(state.wrong);
            const word = list[state.index];
            if(word && state.wrong[word.en]){
                state.wrong[word.en].count--;
                if(state.wrong[word.en].count <= 0){
                    delete state.wrong[word.en];
                    removed = true;
                }
            }
        }
    } else {
        const list = getStudyList();
        const word = list[state.index];
        if(word){
            if(!state.wrong[word.en]){
                state.wrong[word.en] = {en:word.en,zh:word.zh,count:0};
            }
            state.wrong[word.en].count++;
        }
    }

    // 动效反馈
    const card = document.getElementById('word-card');
    if(correct){
        card.classList.add('flash-green');
    } else {
        card.classList.add('shake');
        card.addEventListener('animationend', ()=>card.classList.remove('shake'), {once:true});
    }

    // 更新圆点
    const dotsEl = document.getElementById('progress-dots');
    const dots = dotsEl.children;
    if(dots[state.index]){
        dots[state.index].classList.remove('active');
        dots[state.index].classList.add(correct?'correct':'wrong');
    }

    if(!removed) state.index++;
    const updatedList = getStudyList();
    if(state.index >= updatedList.length && studyMode==='wrong-review'){
        if(Object.keys(state.wrong).length > 0){
            state.index = 0;
        }
    }
    saveState();

    if(correct && state.index < updatedList.length){
        // 答对：短暂动画后自动翻下一词
        setTimeout(()=>{
            card.classList.remove('flash-green');
            renderStudy();
            renderHome();
        }, 400);
    } else {
        // 答错 或 已完成：立即切换
        setTimeout(()=>{
            card.classList.remove('flash-green');
            renderStudy();
            renderHome();
        }, 300);
    }
}

// ==================== 完成弹窗 ====================
function showCompletion(){
    const td = today();
    const ds = state.stats[td] || {tested:0,correct:0};
    const roundTotal = state.roundResults.length;
    const roundCorrect = state.roundResults.filter(r=>r==='correct').length;
    const roundRate = roundTotal>0 ? Math.round(roundCorrect/roundTotal*100) : 0;

    document.getElementById('complete-tested').textContent = roundTotal;
    document.getElementById('complete-rate').textContent = roundRate+'%';

    let title,detail;
    if(roundRate>=90){title='太强了';detail='正确率 '+roundRate+'%，保持这个状态！';}
    else if(roundRate>=70){title='表现不错';detail='正确率 '+roundRate+'%，再复习一轮巩固一下？';}
    else{title='继续加油';detail='正确率 '+roundRate+'%，多练练错词会有进步';}
    document.getElementById('complete-title').textContent = title;
    document.getElementById('complete-detail').textContent = detail;

    // 禁用学习页按钮避免误触
    document.getElementById('word-en').textContent = '完成';
    document.getElementById('word-zh').classList.add('invisible');
    document.getElementById('btn-reveal').classList.add('hidden');
    document.getElementById('answer-btns').classList.add('hidden');
    document.getElementById('btn-speak').classList.add('hidden');
    document.getElementById('progress-text').textContent = '';

    document.getElementById('modal-complete').classList.add('show');
}


// ── 错词本 ──
// ==================== 错词本渲染 ====================
function renderWrongList(){
    const wrongs = Object.values(state.wrong).sort((a,b)=>b.count-a.count);
    const listEl = document.getElementById('wrong-list');
    const emptyEl = document.getElementById('wrong-empty');
    const btnEl = document.getElementById('btn-wrong-review2');
    if(wrongs.length===0){
        listEl.innerHTML = '';
        emptyEl.classList.remove('hidden');
        btnEl.classList.add('hidden');
    } else {
        emptyEl.classList.add('hidden');
        btnEl.classList.remove('hidden');
        listEl.innerHTML = wrongs.map(w=>`
            <div class="wrong-item">
                <div><div class="wrong-en">${esc(w.en)}</div><div class="wrong-zh">${esc(w.zh)}</div></div>
                <span class="wrong-count">错${w.count}次</span>
            </div>
        `).join('');
    }
}


// ── 统计页 ──
// ==================== 统计页渲染 ====================
function renderStats(){
    const tbody = document.getElementById('stats-body');
    const dates = Object.keys(state.stats).sort().reverse();
    if(dates.length===0){
        tbody.innerHTML = '<tr><td colspan="4" class="text-tertiary">暂无记录</td></tr>';
        return;
    }
    tbody.innerHTML = dates.map(d=>{
        const s = state.stats[d];
        const rate = s.tested>0 ? Math.round(s.correct/s.tested*100)+'%' : '--';
        return `<tr><td>${d}</td><td>${s.tested}</td><td>${s.correct}</td><td>${rate}</td></tr>`;
    }).join('');
}

// ==================== 导入页渲染 ====================
function renderImport(){
    // no-op; preview state managed separately
}


// ── 倒数日 ──
// ==================== 倒数日 ====================
let editingCdIndex = -1;

function addCountdown(){
    editingCdIndex = -1;
    document.getElementById('modal-countdown-title').textContent = '添加倒数日';
    document.getElementById('cd-name').value = '';
    document.getElementById('cd-date').value = '';
    document.getElementById('btn-cd-delete').classList.add('hidden');
    document.getElementById('modal-countdown').classList.add('show');
}

function editCountdown(index){
    editingCdIndex = index;
    const cd = state.countdowns[index];
    document.getElementById('modal-countdown-title').textContent = '编辑倒数日';
    document.getElementById('cd-name').value = cd.name;
    document.getElementById('cd-date').value = cd.date;
    document.getElementById('btn-cd-delete').classList.remove('hidden');
    document.getElementById('modal-countdown').classList.add('show');
}

function saveCountdown(){
    const name = document.getElementById('cd-name').value.trim();
    const date = document.getElementById('cd-date').value;
    if(!name || !date) return;
    if(editingCdIndex >= 0){
        state.countdowns[editingCdIndex] = {name,date};
    } else {
        state.countdowns.push({name,date});
    }
    saveState();
    document.getElementById('modal-countdown').classList.remove('show');
    renderCountdowns();
}

function deleteCountdown(){
    if(editingCdIndex >= 0){
        state.countdowns.splice(editingCdIndex,1);
        saveState();
        document.getElementById('modal-countdown').classList.remove('show');
        renderCountdowns();
    }
}


// ── 每日连胜重置 ──
// ==================== 每日重置 ====================
function checkDayReset(){
    const td = today();
    if(state.lastDate && state.lastDate !== td){
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
        const yd = yesterday.getFullYear()+'-'+String(yesterday.getMonth()+1).padStart(2,'0')+'-'+String(yesterday.getDate()).padStart(2,'0');
        if(state.lastDate === yd){
            state.streak++; // 连续
        } else {
            state.streak = 1; // 中断
        }
        state.lastDate = td;
        saveState();
    }
    if(!state.lastDate){
        state.lastDate = td;
        state.streak = 1;
        saveState();
    }
}


// ── 初始化与启动 ──
// ==================== 初始化 ====================
function init(){
    loadState();
    checkDayReset();

    // 底部导航
    document.querySelectorAll('.nav-btn').forEach(btn=>{
        btn.addEventListener('click',()=>navigate(btn.dataset.page));
    });

    // 主页按钮
    document.getElementById('btn-start-study').addEventListener('click',()=>{
        if(state.words.length===0){
            alert('请先导入单词');
            navigate('import');
            return;
        }
        if(state.index > 0 && state.index < state.order.length){
            document.getElementById('modal-start').classList.add('show');
        } else {
            startNormalStudy(false);
        }
    });

    document.getElementById('btn-continue').addEventListener('click',()=>{
        document.getElementById('modal-start').classList.remove('show');
        startNormalStudy(false);
    });

    document.getElementById('btn-restart').addEventListener('click',()=>{
        document.getElementById('modal-start').classList.remove('show');
        startNormalStudy(true);
    });

    document.getElementById('btn-wrong-review').addEventListener('click',()=>{
        const wrongs = Object.values(state.wrong);
        if(wrongs.length===0){
            alert('暂无错词');
            return;
        }
        startWrongReview();
    });

    // 学习页按钮
    document.getElementById('btn-study-back').addEventListener('click',()=>{
        navigate('home');
    });
    document.getElementById('btn-reveal').addEventListener('click',revealWord);
    document.getElementById('btn-correct').addEventListener('click',()=>answerWord(true));
    document.getElementById('btn-wrong').addEventListener('click',()=>answerWord(false));
    document.getElementById('btn-speak').addEventListener('click',()=>{
        const en = document.getElementById('word-en').textContent;
        if(en && en!=='完成！' && en!=='没有单词') speakWord(en);
    });

    // 错词本按钮
    document.getElementById('btn-wrong-review2').addEventListener('click',startWrongReview);

    // 倒数日
    document.getElementById('btn-add-countdown').addEventListener('click',addCountdown);
    document.getElementById('btn-cd-save').addEventListener('click',saveCountdown);
    document.getElementById('btn-cd-cancel').addEventListener('click',()=>{
        document.getElementById('modal-countdown').classList.remove('show');
    });
    document.getElementById('btn-cd-delete').addEventListener('click',deleteCountdown);

    // 导入
    let parsedWords = [];
    document.getElementById('btn-parse').addEventListener('click',()=>{
        const text = document.getElementById('import-text').value.trim();
        if(!text){alert('请粘贴文本');return;}
        parsedWords = parseWordText(text);
        if(parsedWords.length===0){
            alert('未识别到单词，请检查格式：每行"英文 中文"（空格分隔）');
            return;
        }
        document.getElementById('import-count').textContent = `识别到 ${parsedWords.length} 个单词`;
        document.getElementById('import-words').innerHTML = parsedWords.slice(0,50).map(w=>
            `<div class="word-row"><span class="w-en">${esc(w.en)}</span><span class="w-zh">${esc(w.zh)}</span></div>`
        ).join('') + (parsedWords.length>50 ? `<p class="text-tertiary mt-sm">……还有 ${parsedWords.length-50} 个</p>` : '');
        document.getElementById('import-preview').classList.remove('hidden');
        document.getElementById('btn-import-confirm').classList.remove('hidden');
    });

    document.getElementById('btn-load-demo').addEventListener('click',()=>{
        document.getElementById('import-text').value = BUILTIN_WORDS.map(w=>w.en+' '+w.zh).join('\n');
    });

    document.getElementById('btn-clear-preview').addEventListener('click',()=>{
        parsedWords = [];
        document.getElementById('import-preview').classList.add('hidden');
        document.getElementById('btn-import-confirm').classList.add('hidden');
    });

    document.getElementById('btn-import-confirm').addEventListener('click',()=>{
        if(parsedWords.length===0) return;
        state.words = parsedWords;
        state.order = shuffle(parsedWords.map((_,i)=>i));
        state.index = 0;
        saveState();
        syncRefChecked(); // 同步参考词库勾选
        document.getElementById('import-preview').classList.add('hidden');
        document.getElementById('btn-import-confirm').classList.add('hidden');
        document.getElementById('import-text').value = '';
        alert(`已导入 ${parsedWords.length} 个单词`);
        navigate('home');
    });

    // 点击弹窗遮罩关闭
    document.querySelectorAll('.modal-overlay').forEach(overlay=>{
        overlay.addEventListener('click',function(e){
            if(e.target===this) this.classList.remove('show');
        });
    });

    // 完成弹窗按钮
    document.getElementById('btn-complete-restart').addEventListener('click',()=>{
        document.getElementById('modal-complete').classList.remove('show');
        studyMode==='wrong-review' ? startWrongReview() : startNormalStudy(true);
    });
    document.getElementById('btn-complete-wrong').addEventListener('click',()=>{
        document.getElementById('modal-complete').classList.remove('show');
        if(Object.keys(state.wrong).length>0) startWrongReview();
        else navigate('home');
    });
    document.getElementById('btn-complete-home').addEventListener('click',()=>{
        document.getElementById('modal-complete').classList.remove('show');
        navigate('home');
    });

    // 参考词库
    loadRefWords();

    document.getElementById('btn-ref-import-toggle').addEventListener('click',()=>{
        const block = document.getElementById('ref-import-block');
        block.classList.toggle('hidden');
    });

    document.getElementById('btn-ref-load-cet4').addEventListener('click',()=>{
        if(!confirm('将用 CET-4 词库（4603 词）替换当前参考词库，确定？')) return;
        refWords = [];
        if(typeof BUILTIN_REF_WORDS!=='undefined'){
            const lines = BUILTIN_REF_WORDS.trim().split('\n');
            for(const line of lines){
                const m = line.match(/^([a-zA-Z\-]+)\s+(.+)$/);
                if(m) refWords.push({en:m[1],zh:m[2],inMain:false});
            }
        }
        saveRefWords();
        syncRefChecked();
        renderRefPage();
    });

    let refParsedWords = [];
    document.getElementById('btn-ref-parse').addEventListener('click',()=>{
        const text = document.getElementById('ref-import-text').value.trim();
        if(!text){alert('请粘贴文本');return;}
        refParsedWords = parseWordText(text);
        if(refParsedWords.length===0){alert('未识别到单词');return;}
        // 追加到参考词库
        const existing = new Set(refWords.map(w=>w.en.toLowerCase()));
        let added = 0;
        for(const w of refParsedWords){
            if(!existing.has(w.en.toLowerCase())){
                refWords.push({en:w.en,zh:w.zh,inMain:false});
                existing.add(w.en.toLowerCase());
                added++;
            }
        }
        saveRefWords();
        syncRefChecked();
        renderRefPage();
        document.getElementById('ref-import-text').value = '';
        alert(`新增 ${added} 个，参考词库共 ${refWords.length} 个`);
    });

    document.getElementById('btn-ref-replace').addEventListener('click',()=>{
        const text = document.getElementById('ref-import-text').value.trim();
        if(!text){alert('请粘贴文本');return;}
        refParsedWords = parseWordText(text);
        if(refParsedWords.length===0){alert('未识别到单词');return;}
        if(!confirm('替换将清空现有参考词库，用新列表覆盖。确定？')) return;
        refWords = refParsedWords.map(w=>({en:w.en,zh:w.zh,inMain:false}));
        saveRefWords();
        syncRefChecked();
        renderRefPage();
        document.getElementById('ref-import-text').value = '';
        alert(`已替换，共 ${refWords.length} 个`);
    });

    document.getElementById('btn-ref-clear').addEventListener('click',()=>{
        if(!confirm('确定清空参考词库？')) return;
        refWords = [];
        saveRefWords();
        renderRefPage();
        document.getElementById('ref-import-text').value = '';
    });

    // 预加载语音
    if('speechSynthesis' in window){
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = ()=>window.speechSynthesis.getVoices();
    }

    // 注册 Service Worker 实现离线缓存
    if('serviceWorker' in navigator){
        navigator.serviceWorker.register('sw.js').catch(()=>{});
    }

    // 初始渲染
    renderHome();
}

function startNormalStudy(reshuffle){
    studyMode = 'normal';
    if(reshuffle || state.order.length === 0){
        state.order = shuffle(state.words.map((_,i)=>i));
    }
    state.index = 0;
    state.roundResults = [];
    saveState();
    navigate('study');
}

function startWrongReview(){
    studyMode = 'wrong-review';
    state.index = 0;
    state.roundResults = [];
    saveState();
    navigate('study');
}

init();

// Codex: 以上所有函数定义和事件绑定是应用行为逻辑，不可修改。
