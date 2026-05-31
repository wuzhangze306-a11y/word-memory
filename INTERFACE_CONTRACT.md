# 接口契约与逻辑保护文档

> **目的**: 定义 CC（核心架构）与 Codex（前端装修）之间的清晰边界。Codex 只能修改标记为"允许"的区域，不可触碰"保护"区域。

---

## 一、文件所有权

| 文件 | 所有者 | 说明 |
|------|--------|------|
| `index.html` | **共享** | HTML 壳 — Codex 可改 CSS 类名和布局结构，但不可改元素 ID |
| `css/styles.css` | **Codex** | 所有视觉样式 — Codex 自由发挥 |
| `js/data.js` | **CC 独占** | 内置单词数据 — Codex 不可触碰 |
| `js/state.js` | **CC 独占** | 数据模型 + localStorage 序列化 |
| `js/utils.js` | **CC 独占** | 工具函数（词根提取、文本解析、随机化等） |
| `js/app.js` | **CC 独占** | UI 渲染 + 事件处理 + 学习算法 |
| `dist/index.html` | **构建产物** | 由 `build.js` 合并生成，双方都不直接编辑 |

---

## 二、数据层 — 绝对不可触碰

### 2.1 localStorage 键名

```js
'vm_state'    // 主应用状态（JSON 字符串）
'vm_ref_words' // 参考词库 B 库（JSON 字符串）
```

**规则**: 不允许改名、删除、或新增第三个 localStorage 键（需经 CC 同意）。

### 2.2 `vm_state` JSON Schema

```ts
{
  words:        Array<{en: string, zh: string}>,   // 主词库（A 库），默认 1273 条
  order:        number[],                           // 当前轮次的乱序索引
  index:        number,                             // 当前进度位置（0-based）
  wrong:        Record<string, {en: string, zh: string, count: number}>, // 错词映射
  stats:        Record<string, {tested: number, correct: number}>,       // 每日统计，key=YYYY-MM-DD
  countdowns:   Array<{name: string, date: string}>, // 倒数日列表
  lastDate:     string,                              // 上次活跃日期 YYYY-MM-DD
  streak:       number,                              // 连续学习天数
  roundResults: Array<'correct' | 'wrong'>           // 当前轮次每题结果
}
```

**规则**: 不允许增删字段、改字段名、改字段类型。Codex 读取状态时必须假设以上 schema 不变。

### 2.3 `vm_ref_words` JSON Schema

```ts
Array<{en: string, zh: string, inMain: boolean}>
```

### 2.4 序列化函数（CC 独占）

```js
loadState()          // localStorage.getItem('vm_state') → JSON.parse → 类型校验 → 合并默认值
saveState()          // state → JSON.stringify → localStorage.setItem('vm_state')
loadRefWords()       // localStorage.getItem('vm_ref_words') → 首次自动初始化 CET-4 词表
saveRefWords()       // refWords → JSON.stringify → localStorage.setItem('vm_ref_words')
syncRefChecked()     // 同步 refWords[].inMain 与 state.words 的一致性
```

---

## 三、核心算法 — 不可触碰

| 函数 | 用途 | 关键约束 |
|------|------|---------|
| `getStem(word)` | 词根提取，剥离 35 种后缀 | 后缀匹配顺序不可改（长后缀优先） |
| `parseWordText(text)` | 文本解析器，正则提取 "英文 中文" 词对 | 正则模式不可改；跳过表头行的规则不可改 |
| `shuffle(arr)` | Fisher-Yates 随机化 | 算法不可改 |
| `checkDayReset()` | 连胜天数计算 | 日期比较逻辑不可改 |
| `answerWord(correct)` | 答题核心：记录结果 → 更新 state.stats/state.wrong/state.roundResults → 翻页 → 保存 | **整个函数是禁区** |
| `showCompletion()` | 轮次完成弹窗 | 计算 roundResults 统计的逻辑不可改 |
| `getStudyList()` | 根据 studyMode 返回不同词源 | 逻辑不可改 |

---

## 四、DOM ID 清单 — 可移动位置，不可删除/重命名

### 4.1 学习卡片组（状态机核心 — 7 个 ID 不可分割）

```
#word-card        # 卡片容器（接收 .flash-green .shake 动画类）
#word-en          # 英文单词显示
#word-zh         # 中文释义（通过 visibility 控制显示/隐藏）
#btn-reveal      # "显示释义"按钮
#answer-btns     # 答对/答错按钮组容器
#btn-correct     # 答对按钮
#btn-wrong       # 答错按钮
#btn-speak       # 发音按钮
#progress-dots   # 进度圆点容器
#progress-text   # 进度文字 "(3/50)"
#study-mode-label # 学习模式标签
```

### 4.2 导航组

```
#page-home       # 主页
#page-study      # 学习页
#page-wrong      # 错词本页
#page-stats      # 统计页
#page-import     # 导入页
#page-ref        # B 库对照表页
#streak-badge    # 连胜徽章
```

导航按钮使用 `.nav-btn[data-page="..."]` 属性选择器（不是 ID）。

### 4.3 主页组

```
#stat-tested     # 今日已测
#stat-rate       # 今日正确率
#stat-wrong      # 错词总数
#countdown-list  # 倒计时列表容器
#btn-add-countdown # 添加倒计时按钮
#btn-start-study # 开始学习按钮
#btn-wrong-review # 错词复习按钮（主页）
#word-count-info # 词库单词数信息
```

### 4.4 错词本组

```
#wrong-list      # 错词列表容器
#wrong-empty     # 空状态提示
#btn-wrong-review2 # 错词复习按钮（错词本页）
```

### 4.5 统计页组

```
#stats-body      # 统计表格 tbody
```

### 4.6 B 库对照表组

```
#ref-coverage    # 覆盖率显示
#ref-import-block # 导入区域（可折叠）
#ref-import-text # 导入文本输入框
#ref-list        # B 库单词列表容器
#ref-empty       # 空状态提示
#btn-ref-import-toggle # 导入区域折叠按钮
#btn-ref-load-cet4     # 加载 CET-4 按钮
#btn-ref-parse         # 解析并追加按钮
#btn-ref-replace       # 解析并替换按钮
#btn-ref-clear         # 清空按钮
```

### 4.7 导入页组

```
#import-text     # 导入文本输入框
#import-preview  # 预览区域容器
#import-count    # 预览词数显示
#import-words    # 预览词列表容器
#btn-import-confirm # 确认导入按钮
#btn-parse       # 解析文本按钮
#btn-load-demo   # 加载示例按钮
#btn-clear-preview # 清除预览按钮
```

### 4.8 弹窗组

```
#modal-start           # 开始学习确认弹窗
#btn-continue          # 继续上次进度
#btn-restart           # 重新开始
#modal-complete        # 轮次完成弹窗
#complete-title        # 完成标题
#complete-tested       # 本轮总数
#complete-rate         # 本轮正确率
#complete-detail       # 详情消息
#btn-complete-restart  # 再来一轮
#btn-complete-wrong    # 复习错词
#btn-complete-home     # 返回首页
#modal-countdown       # 倒计时编辑弹窗
#modal-countdown-title # 弹窗标题（"添加倒计时"/"编辑倒计时"）
#cd-name               # 名称输入框
#cd-date               # 日期输入框
#btn-cd-save           # 保存按钮
#btn-cd-cancel         # 取消按钮
#btn-cd-delete         # 删除按钮
```

---

## 五、CSS 类名契约 — 可改属性值，不可删除/重命名

### 5.1 JS 依赖的功能性类名

| 类名 | 用途 | 被哪个 JS 函数使用 |
|------|------|-------------------|
| `.page` | 页面容器 | `navigate()` — 通过 `.page.active` 控制页面显示 |
| `.page.active` | 激活的页面 `display: flex` | `navigate()` — 添加/移除 |
| `.nav-btn` | 导航按钮 | `navigate()` — 通过 `.nav-btn.active` 高亮当前按钮 |
| `.nav-btn.active` | 激活的导航按钮 | `navigate()` — 添加/移除 |
| `.flash-green` | 答对绿闪动画 | `answerWord()` — `classList.add`，`renderStudy()` — 移除 |
| `.shake` | 答错抖动动画 | `answerWord()` — `classList.add`，`animationend` 事件 — 移除 |
| `.dot` | 进度圆点 | `renderStudy()` — 清空并重建 |
| `.dot.correct` | ✅ 绿色已完成 | `renderStudy()`, `answerWord()` |
| `.dot.wrong` | ❌ 红色已完成 | `renderStudy()`, `answerWord()` |
| `.dot.active` | 当前高亮圆点 | `renderStudy()` |
| `.modal-overlay` | 弹窗背景 | 多个函数通过 `.modal-overlay.show` 控制 |
| `.modal-overlay.show` | 显示的弹窗 | `addCountdown()`, `editCountdown()`, `showCompletion()` 等添加 |
| `.hidden` | 隐藏元素（Phase 3 引入） | 替代 `element.style.display = 'none'` |
| `.invisible` | 不可见但占位（Phase 3 引入） | 替代 `element.style.visibility = 'hidden'` |

### 5.2 纯视觉类名（Codex 可自由修改）

所有其他 CSS 类都是纯视觉的，Codex 可以自由修改样式属性值、添加新类、删除未使用的类。主要纯视觉类：

```
.card, .card-sm, .stats-bar, .stat-item, .btn, .btn-primary, .btn-ghost,
.btn-danger, .btn-small, .header, .word-card, .word-en, .word-zh,
.word-speak, .reveal-area, .answer-btn, .progress-dots,
.streak-badge, .ref-group, .ref-word, .ref-check, .countdown-list,
.countdown-item, .wrong-item, .wrong-en, .wrong-count, .stat-table,
.import-area, .import-preview, .modal, .empty, .section-title,
.inline-link, .flex-between, .text-secondary, .text-tertiary,
.mt-sm, .mt-md, .mt-lg, .mb-sm, .mb-md, .gap-sm, .gap-md, .row-gap
```

---

## 六、CSS 变量 — Codex 可自由修改值但不可改名

```css
--bg, --surface, --surface2, --border,
--text, --text2, --text3,
--green, --green-bg, --red, --red-bg,
--blue, --blue-bg, --purple, --purple-bg,
--radius, --radius-sm,
--font, --font-en,
--safe-bottom
```

Codex 可以：改颜色值、改圆角值、改字体栈、改间距
Codex 不可以：删除某个变量（可能被 JS 生成的 inline style 引用）、改名

---

## 七、HTML 结构约束

### 7.1 页面容器必须保持

```html
<div id="app" class="app">
  <div id="page-home" class="page">...</div>    <!-- 必须存在，必须是 class="page" -->
  <div id="page-study" class="page">...</div>   <!-- 必须存在，必须是 class="page" -->
  <div id="page-wrong" class="page">...</div>   <!-- 必须存在，必须是 class="page" -->
  <div id="page-stats" class="page">...</div>   <!-- 必须存在，必须是 class="page" -->
  <div id="page-import" class="page">...</div>  <!-- 必须存在，必须是 class="page" -->
  <div id="page-ref" class="page">...</div>     <!-- 必须存在，必须是 class="page" -->
</div>
<!-- 导航栏 — nav 元素必须存在，包含 6 个 .nav-btn[data-page] -->
<nav class="nav">
  <div class="nav-btn" data-page="home">...</div>
  <div class="nav-btn" data-page="study">...</div>
  <div class="nav-btn" data-page="wrong">...</div>
  <div class="nav-btn" data-page="stats">...</div>
  <div class="nav-btn" data-page="import">...</div>
  <div class="nav-btn" data-page="ref">...</div>
</nav>
```

### 7.2 HTML 内的 inline style

HTML 中现有的 `style="..."` 属性（如 `style="display:none"`、`style="visibility:hidden"` 等）是初始状态标记，Phase 3 后将替换为 CSS class。Phase 3 完成前，Codex 不应修改这些 inline style。

---

## 八、学习状态机（不可破坏的逻辑流）

```
首页点击 "开始学习"
  ↓
startNormalStudy(reshuffle) 或 startWrongReview()
  ↓
renderStudy() — 显示单词卡片（word-zh 隐藏，btn-reveal 显示，answer-btns 隐藏）
  ↓ 用户点击 "显示释义"
revealWord() — 显示 word-zh 和 answer-btns，隐藏 btn-reveal
  ↓ 用户点击 ✓ 或 ✗
answerWord(correct) — 记录结果 → 动画 → 保存 → 翻页
  ↓                ↓
  还有词 → renderStudy()    轮次结束 → showCompletion()
                                          ↓
                               "再来一轮" → 回到 startNormalStudy
                               "复习错词" → startWrongReview
                               "返回首页" → navigate('home')
```

**规则**: Codex 可以美化任何步骤的视觉效果，但不能改变任何步骤的数据流或 DOM 元素 ID。

---

## 九、PWA 相关

### 当前状态
- **Manifest**: 运行时通过 Blob URL 动态生成（JS 中 IIFE 实现）
- **Service Worker**: 主动注销（`getRegistrations().then(regs => regs.forEach(r => r.unregister()))`）
- **apple-touch-icon**: 内联 SVG data URI

### Codex 允许的改动
- 将 manifest 改为静态 `manifest.json` 文件
- 添加 Service Worker 以实现离线缓存
- 替换所有图标（icon SVG）
- 添加离线/在线状态 UI 反馈

### Codex 需要和 CC 协调的
- Service Worker 的缓存策略（哪些资源预缓存、缓存版本管理、更新策略）
- Manifest 中的 `start_url`、`scope`、`display` 等 PWA 关键字段

---

## 十、Codex 自由发挥区域（鼓励创新）

1. **所有颜色和视觉风格** — 通过 CSS 变量值
2. **字体和排版** — `--font`、`--font-en`，以及所有 font-size、line-height
3. **间距和布局** — padding、margin、gap、grid/flex 布局调整
4. **动画和过渡** — 添加/修改 CSS animation、transition（但保留 `.flash-green` `.shake` `.fadeIn` `.slideUp` 类名）
5. **卡片和按钮的视觉样式** — 阴影、边框、圆角、渐变、毛玻璃效果等
6. **空状态插画/图标** — 可以用更好的 SVG 替换占位符
7. **导航栏图标** — 6 个 SVG 图标可完全替换（保持 `stroke="currentColor"` 即可）
8. **弹窗设计** — 可重新设计 modal 外观
9. **响应式布局** — 添加 @media 查询，适配平板/桌面
10. **PWA 离线上报** — 添加在线/离线状态指示器
