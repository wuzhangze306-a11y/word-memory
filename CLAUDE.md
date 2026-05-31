# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

单词记忆 PWA，纯前端单文件应用。技术栈：HTML + CSS + JS，数据存 localStorage，无后端。

## 常用命令

```bash
# 本地开发服务器
npx http-server -p 8080 --cors -c-1

# 推送前验证 JS 语法
node -e "const h=require('fs').readFileSync('index.html','utf8'); const m=h.match(/<script>([\s\S]*)<\/script>/); if(m) new Function(m[1]); console.log('OK');"

# Git 推送（需要代理，端口从系统代理设置读取）
git push
```

Git 推送依赖系统代理（当前端口 17299），已配置在 `git config --global http.proxy` 中。

## 文件结构

```
E:\ENHLISHNOTEBOOK\
  index.html   # 全部代码（CSS + HTML + JS 嵌入单文件，约 230KB）
  .git/        # Git 仓库，remote → github.com/wuzhangze306-a11y/word-memory
```

部署在 GitHub Pages：`https://wuzhangze306-a11y.github.io/word-memory/`

## 代码架构

`index.html` 内分三段：`<style>` CSS → `<body>` HTML 布局 → `<script>` JS 逻辑。

### 页面（6 个 Tab）

| 页面 | ID | 功能 |
|------|-----|------|
| 主页 | `page-home` | 今日统计、连胜天数、倒数日、开始学习按钮 |
| 学习 | `page-study` | 单词卡片（显示英文→点击显示释义→打勾/打叉），进度圆点指示器 |
| 错词本 | `page-wrong` | 错词列表（按错误次数排序），专项复习入口 |
| 统计 | `page-stats` | 历史每日学习记录表格 |
| 导入 | `page-import` | 文本粘贴导入，解析预览，确认导入到 A 库 |
| 词库 | `page-ref` | B 库对照表：首字母分组，已收录/关联词根/未收录三栏 |

页面通过 `navigate(page)` 切换，底部 6 个 nav 按钮对应。

### localStorage 数据模型

| Key | 类型 | 说明 |
|-----|------|------|
| `vm_state` | JSON | 全部应用状态 |
| `vm_ref_words` | JSON | B 库参考词表 |

`vm_state` 结构：
```
words: [{en, zh}]        // A 库词表
order: [number]          // 当前轮次的乱序索引
index: number            // 当前进度位置
wrong: { en: {en,zh,count} }  // 错词库
stats: { "2026-05-26": {tested,correct} }  // 每日统计
countdowns: [{name,date}]  // 倒数日
lastDate: "2026-05-26"  // 上次活跃日期
streak: number           // 连续学习天数
roundResults: ["correct"|"wrong"]  // 当前轮次每题结果
```

`vm_ref_words` 结构：
```
[{en, zh, inMain: bool}]  // B 库词条，inMain 表示是否已被 A 库收录
```

### 关键函数

**初始化**: `init()` — 加载状态、绑定事件、注册路由。

**学习核心**: `answerWord(correct)` — 答对打勾/答错打叉后的逻辑：记录结果、更新圆点、动效反馈、自动翻页（答对 0.4s 延迟）、轮次完成弹窗。

**词根匹配**: `getStem(word)` — 去掉常见后缀（-tion, -ing, -ed 等 30+ 种）返回词根。`renderRefPage()` 中用此函数标记"关联词根"（紫色），即 B 库中某词未收录但其词根已被 A 库覆盖。

**文本解析**: `parseWordText(text)` — 正则提取"英文 中文"词条对，过滤表头行（姓名/日期/复习计划等）。

**连胜计算**: `checkDayReset()` — 跨天检测，连续天数 +1 或中断归零。

**PWA**: manifest 使用静态 `manifest.json` 文件（之前用 Blob URL 内联生成，iOS Safari 不支持）。SW (`sw.js`) 注册在 `init()` 中，缓存策略为 cache-first + 后台更新。

### 内置数据

- A 库 `BUILTIN_WORDS`（1273 词）：从 51 份 PDF 提取的去重单词
- B 库 `BUILTIN_REF_WORDS`（4603 词）：CET-4 大纲词汇，首次访问时自动加载到 localStorage

### 设计风格

暗色主题，参考 Linear/Vercel 审美。CSS 变量定义在 `:root`，配色：背景 `#0f0f0f`，卡片 `#1a1a1a`，绿色答对 `#4ade80`，红色答错 `#f87171`，紫色关联 `#a78bfa`。移动端优先，按钮至少 44px 高。

## 源文件结构（拆分后）

源码拆分为独立文件以便维护，通过 `build.js` 合并为单文件部署：

```
index.html          # HTML 壳（含外部引用），由 split.js 生成
css/styles.css      # Codex 域 — 所有视觉样式
js/data.js          # CC 域 — 内置单词数据（BUILTIN_WORDS + BUILTIN_REF_WORDS）
js/state.js         # CC 域 — 数据模型 + localStorage 序列化
js/utils.js         # CC 域 — 工具函数（getStem, shuffle, parseWordText 等）
js/app.js           # CC 域 — UI 渲染 + 事件处理 + init()
dist/index.html     # 构建产物 — 单文件，由 build.js 合并生成
manifest.json       # PWA 清单（静态文件，iOS 兼容）
sw.js               # Service Worker（离线缓存）
build.js            # 构建脚本：读取源文件 → 合并为 dist/index.html + 复制到根目录
split.js            # 拆分脚本：从单文件 index.html 拆出 css/js 源文件
```

详细的所有权边界见 `INTERFACE_CONTRACT.md`。

## 构建流程

```bash
# 拆分（仅当从旧单文件开始时需要，一般只需要一次）
node split.js

# 构建（每次修改源文件后）
node build.js
```

`build.js` 做了三件事：
1. 读取 `css/styles.css` 并内联到 `<style>` 标签
2. 读取 `js/*.js` 按依赖顺序合并到 `<script>` 标签
3. 将 Blob URL manifest 脚本替换为 `<link rel="manifest" href="manifest.json">`（iOS 兼容）
4. 输出到 `dist/index.html`，并复制到根目录 `index.html`（GitHub Pages 从这里提供服务）

## 踩过的坑（错误记录）

### ❌ Blob URL Manifest → iOS Safari 不支持

**现象**：手机端（特别是 iPhone）PWA 无法安装，manifest 不生效。

**原因**：manifest 通过 JavaScript `URL.createObjectURL(blob)` 动态注入，iOS Safari 不支持 Blob URL 的 manifest 链接。manifest 必须是服务端返回的真实文件。

**修复**：改为静态 `<link rel="manifest" href="manifest.json">`，`manifest.json` 部署在根目录。

### ❌ 无 Service Worker → 完全无离线能力

**现象**：用户在网络不稳定时打不开应用。之前 SW 因"缓存更新问题"被移除，但移除后 PWA 退化为普通网页。

**原因**：代码中没有任何 `navigator.serviceWorker.register()` 调用，`sw.js` 文件写了但是死代码。`build.js` 还显式检查禁止 SW 注册（`['serviceWorker', false]`）。

**修复**：
- `js/app.js` 的 `init()` 中添加 `navigator.serviceWorker.register('sw.js')`
- `build.js` 中移除 serviceWorker 禁止检查
- SW 缓存策略：cache-first + 后台更新，缓存 `index.html` + `manifest.json`

### ❌ SW 预缓存列表与实际部署文件不匹配

**现象**：SW install 时所有预缓存请求静默失败。

**原因**：`sw.js` 中的 `ASSETS` 列表写的是源文件路径（`css/styles.css`, `js/data.js` 等），但这些文件在部署时不存在（部署的是合并后的单文件 `index.html`）。

**修复**：`ASSETS` 改为 `['.', 'index.html', 'manifest.json']`，即部署时的实际文件。

### ❌ `background-attachment: fixed` → iOS Safari 滚动卡顿

**现象**：iOS 上滚动页面时卡顿、不跟手。

**原因**：`body` 上设置了 `background-attachment: fixed`，这在 iOS Safari 上是已知的性能问题，会触发昂贵的重绘。

**修复**：移除 `background-attachment: fixed`，改为 `overscroll-behavior-y: contain`。

### ❌ 输入框字号 < 16px → iOS Safari 自动缩放

**现象**：在 iPhone 上点击输入框时页面会自动放大。

**原因**：iOS Safari 对 `font-size < 16px` 的表单元素会触发自动缩放（accessibility 行为）。`textarea` 和 `input` 默认字号 13-14px。

**修复**：`input, textarea` 统一设置 `font-size: 16px`。

### ⚠️ `user-select: none` 阻止了单词复制

**现象**：学习单词时无法长按选中英文单词进行复制/翻译。

**原因**：`body` 上全局设置了 `user-select: none`（防止误触），但 `.word-en` 展示区也被覆盖。

**修复**：`.word-en` 添加 `-webkit-user-select: text; user-select: text`。

### ⚠️ Git 推送依赖代理

**现象**：`git push` 报 `Failed to connect to github.com port 443`。

**原因**：git 配置了 `http.proxy = http://127.0.0.1:17299`，但代理软件（Clash/V2Ray）未运行。

**处理**：临时 `git config --global --unset http.proxy` 后推送成功，然后恢复代理配置。或启动代理软件。
