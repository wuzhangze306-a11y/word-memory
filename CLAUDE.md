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

**PWA**: manifest 通过 Blob URL 内联生成，SW 已移除（曾导致缓存更新问题）。`apple-touch-icon` 和 manifest icon 使用内联 SVG（紫色多边形图案）。

### 内置数据

- A 库 `BUILTIN_WORDS`（1273 词）：从 51 份 PDF 提取的去重单词
- B 库 `BUILTIN_REF_WORDS`（4603 词）：CET-4 大纲词汇，首次访问时自动加载到 localStorage

### 设计风格

暗色主题，参考 Linear/Vercel 审美。CSS 变量定义在 `:root`，配色：背景 `#0f0f0f`，卡片 `#1a1a1a`，绿色答对 `#4ade80`，红色答错 `#f87171`，紫色关联 `#a78bfa`。移动端优先，按钮至少 44px 高。
