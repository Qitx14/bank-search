# CLAUDE.md — 题库搜题 App 项目指引

## 项目简介

为 iPhone 用户构建的 PWA 搜题工具。用户批量拍摄考试题目 → 本地 OCR 识别 → 模糊匹配题库 → 显示答案。淡蓝色主题，简洁直观。

## 文档索引

| 文档 | 路径 | 内容 |
|------|------|------|
| 需求文档 | [docs/requirements.md](docs/requirements.md) | 用户需求、功能列表、约束条件 |
| 技术规范 | [docs/tech-spec.md](docs/tech-spec.md) | 技术栈、项目结构、数据模型、类型定义 |
| UI 设计规范 | [docs/design-spec.md](docs/design-spec.md) | 色彩/字体/间距系统、组件规范、iPhone 适配 |
| 开发执行步骤 | [docs/dev-plan.md](docs/dev-plan.md) | 每步详细任务、涉及文件、验收标准 |
| 开发日志 | [dev-logs/](dev-logs/) | 每日开发记录（按日期命名） |

## 开发约定

### 工作流程
1. **每步先说明再执行**：告诉用户「本步做什么、涉及文件、预期结果」，确认后再写代码
2. **一步一验收**：每步完成后对照 `docs/dev-plan.md` 中的验收标准检查
3. **完成后写日志**：更新当天的 `dev-logs/YYYY-MM-DD.md`，记录完成事项和待办
4. **遵循设计规范**：所有 UI 严格按 `docs/design-spec.md` 的色彩/间距/组件规范

### 代码规范
- TypeScript 严格模式，所有类型在 `src/types/index.ts` 中定义
- 组件命名：PascalCase，文件名与组件名一致
- 服务模块：`src/services/` 下每个文件只做一件事
- CSS：使用 CSS 变量（定义在 `src/index.css`），不写内联样式
- 错误处理：所有异步操作必须有 try/catch 和用户提示

### 禁止事项
- ❌ 不要跳过步骤或跨步骤并行开发有依赖关系的模块
- ❌ 不要在出现错误时继续叠加新代码（先排查、修复）
- ❌ 不要自行修改已确认的需求（先与用户沟通）
- ❌ 不要引入非必要的大型依赖
- ❌ 不要写英文 UI 文案（目标用户是中文用户）

### 技术关键点
- OCR 使用 Tesseract.js `chi_sim` 语言包，在 Web Worker 中运行
- 模糊搜索使用 Fuse.js，`threshold: 0.4`
- 题库存储在 IndexedDB（通过 Dexie.js 操作），离线下可读
- 图片以 base64 Data URL 存储在搜索记录中
- PWA Service Worker 缓存策略：应用 Shell 预缓存，运行时缓存图片

### 测试方式
- 开发时用 `npm run dev`，在浏览器中模拟 iPhone 视口测试
- 构建后用 `npm run preview` 在手机同 Wi-Fi 下测试
- 上线前在 iPhone Safari + 飞行模式下实测

## 当前状态

- **Phase 0**：项目规范化（进行中）
- **Phase 1**：基础骨架（待开始）
- **Phase 2**：核心功能（待开始）
- **Phase 3**：完善发布（待开始）
