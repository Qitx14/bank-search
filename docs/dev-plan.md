# 开发执行步骤

> 本文档是详细的执行手册。每步先向用户说明 "我要做什么、涉及哪些文件、预计结果"，确认后再执行。

---

## Phase 0：项目规范化

### 步骤 0.1 — 需求文档 ✅
- **产出**：`docs/requirements.md`
- **状态**：已完成

### 步骤 0.2 — 技术规范 ✅
- **产出**：`docs/tech-spec.md`
- **状态**：已完成

### 步骤 0.3 — UI 设计规范 ✅
- **产出**：`docs/design-spec.md`
- **状态**：已完成

### 步骤 0.4 — 本文件 ✅
- **产出**：`docs/dev-plan.md`
- **状态**：已完成

### 步骤 0.5 — CLAUDE.md
- **动作**：创建 `CLAUDE.md`，写入项目指引
- **内容**：项目简介、文档路径索引、开发约定、工作流程、禁止事项
- **验收**：AI 再次进入项目时能自动读取并遵循规范

### 步骤 0.6 — 首日开发日志
- **动作**：创建 `dev-logs/2026-08-03.md`
- **内容**：今日完成事项、待办、决策记录
- **验收**：日志格式可作为后续模板

**Phase 0 退出标准**：6 个文档文件全部就绪。

---

## Phase 1：基础骨架

### 步骤 1.1 — 初始化项目
- **做什么**：使用 Vite 创建 React + TypeScript 项目，安装所需依赖
- **涉及文件**：`package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- **安装依赖**：
  ```
  react-router-dom        # 路由
  dexie                   # IndexedDB
  fuse.js                 # 模糊搜索
  tesseract.js            # OCR
  xlsx                    # SheetJS 读取 Excel
  ```
- **验收**：`npm run dev` 启动，浏览器看到 Vite 默认页面

### 步骤 1.2 — 搭建 UI 框架
- **做什么**：创建路由结构、底部导航栏、全局 CSS 主题变量
- **涉及文件**：
  - `src/main.tsx` — 挂载 Router
  - `src/App.tsx` — 路由配置 + 布局
  - `src/index.css` — CSS 变量 + 全局重置
  - `src/components/BottomNav.tsx` — 底部导航
  - `src/pages/SearchPage.tsx` — 搜题页（占位）
  - `src/pages/LibraryPage.tsx` — 题库页（占位）
  - `src/pages/HistoryPage.tsx` — 历史页（占位）
- **验收**：页面显示淡蓝色底部导航栏，三个 tab 可切换

### 步骤 1.3 — 数据模型
- **做什么**：定义 TypeScript 类型、创建 Dexie 数据库 Schema、编写数据库 CRUD 操作
- **涉及文件**：
  - `src/types/index.ts` — 所有接口定义
  - `src/services/db.ts` — Dexie 数据库封装
- **验收**：TypeScript 编译无错误，可 import 类型和数据库实例

**Phase 1 退出标准**：项目可启动，有导航骨架，数据库 Schema 就绪。

---

## Phase 2：核心功能

### 步骤 2.1 — 题库导入
- **做什么**：用户选择 .xlsx 文件 → SheetJS 解析 → 逐行写入 IndexedDB → 显示统计
- **涉及文件**：
  - `src/services/xlsx-parser.ts` — 文件解析逻辑
  - `src/pages/LibraryPage.tsx` — 导入 UI + 统计展示
  - `src/components/ImportButton.tsx` — 文件选择按钮
  - `src/components/StatsPanel.tsx` — 统计面板
- **关键逻辑**：
  1. `<input type="file" accept=".xlsx,.xls">` 选取文件
  2. SheetJS `read()` + `sheet_to_json()` 逐 Sheet 解析
  3. 每一行映射为 `Question` 对象，写入 Dexie
  4. 批量写入使用 `db.questions.bulkPut()`
- **验收**：选择 .xlsx → 看到「已导入 XXX 题」统计

### 步骤 2.2 — 拍照/选图
- **做什么**：调起相机拍照 或 从相册多选 → 图片缩略图预览 → 可删除/重选
- **涉及文件**：
  - `src/pages/SearchPage.tsx` — 搜题页集成
  - `src/components/ImagePicker.tsx` — 拍照/选图触发
  - `src/components/ImagePreview.tsx` — 缩略图网格预览
- **关键逻辑**：
  1. `capture="environment"` 属性调起后置摄像头
  2. `multiple` 属性支持相册多选
  3. 图片转为 base64 Data URL 存在组件状态
  4. 超过 9 张提示上限
- **验收**：可拍照、可选图、可预览/删除，最多 9 张

### 步骤 2.3 — OCR 识别
- **做什么**：逐张图片调用 Tesseract.js → 显示进度条 → 返回识别文字
- **涉及文件**：
  - `src/services/ocr.ts` — Tesseract 封装
  - `src/components/OcrProgress.tsx` — 进度条组件
- **关键逻辑**：
  1. `Tesseract.recognize(image, 'chi_sim')` 识别中文
  2. 监听 `progress` 回调更新进度条
  3. 批量图片逐张处理（非并行，避免内存溢出）
  4. 错误处理：单张失败继续下一张，记录失败项
- **验收**：拍含中文的题目 → 进度条走完 → 返回识别文字

### 步骤 2.4 — 模糊搜索 + 结果展示
- **做什么**：OCR 文字 → Fuse.js 搜索题库 → 按得分排序 → 答案卡片展示
- **涉及文件**：
  - `src/services/search.ts` — Fuse.js 封装
  - `src/pages/ResultPage.tsx` — 结果详情页
  - `src/components/AnswerCard.tsx` — 答案卡片
  - `src/components/ResultList.tsx` — 批量结果列表
- **关键逻辑**：
  1. 从 IndexedDB 取出所有题目构建 Fuse 索引
  2. 用 OCR 提取的题干文本搜索
  3. Fuse.js 配置：`threshold: 0.4`, 支持中文
  4. 取 top-3 匹配，默认展示最高分
  5. 卡片显示：题干 + 得分百分比 + 正确答案 + 选项
- **验收**：OCR 结果能匹配到正确题目并展示答案

**Phase 2 退出标准**：完整主流程跑通。

---

## Phase 3：完善与发布

### 步骤 3.1 — 搜索历史
- **做什么**：保存每次搜索 → 历史页列表 → 点击可回顾 → 支持清除
- **涉及文件**：
  - `src/pages/HistoryPage.tsx`
  - `src/services/db.ts`（添加 searchRecords 表）
- **验收**：搜题后自动保存，历史页可查看和清除

### 步骤 3.2 — PWA 离线化
- **做什么**：配置 Service Worker → 添加 manifest.json → 首次使用引导提示「添加到主屏幕」
- **涉及文件**：
  - `vite.config.ts`（添加 vite-plugin-pwa）
  - `public/manifest.json`
  - `src/components/InstallGuide.tsx` — 安装引导浮层
- **验收**：飞行模式下 App 正常打开和使用

### 步骤 3.3 — 部署
- **做什么**：构建生产版本 → 推送到 GitHub Pages → 手机 Safari 实测
- **涉及操作**：
  - `npm run build`
  - 配置 GitHub Pages（gh-pages 分支或 Actions）
  - iPhone 打开链接 → 添加到主屏幕 → 测试完整流程
- **验收**：手机上可正常使用全部功能

**Phase 3 退出标准**：手机端全流程可用，离线正常。

---

> 版本：v1.0 | 日期：2026-08-03
